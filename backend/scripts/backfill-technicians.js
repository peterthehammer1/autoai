/**
 * Backfill technician assignments for existing appointments that don't have one.
 * Uses the same logic as the live assignTechnician() function.
 *
 * Run: node backend/scripts/backfill-technicians.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SKILL_RANK = { junior: 1, intermediate: 2, senior: 3, master: 4 };

async function run() {
  console.log('Backfilling technician assignments for existing appointments...\n');

  // Get all appointments without a technician
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id, scheduled_date, scheduled_time, estimated_duration_minutes,
      bay_id, technician_id, status,
      appointment_services (service_id, service_name)
    `)
    .is('technician_id', null)
    .not('status', 'in', '("cancelled","no_show")')
    .order('scheduled_date', { ascending: true });

  if (error) {
    console.error('Error fetching appointments:', error.message);
    return;
  }

  console.log(`Found ${appointments.length} appointments without technician assignment\n`);

  if (appointments.length === 0) {
    console.log('Nothing to backfill!');
    return;
  }

  // Load all reference data
  const { data: bayAssignments } = await supabase
    .from('technician_bay_assignments')
    .select('technician_id, bay_id, is_primary');

  const { data: technicians } = await supabase
    .from('technicians')
    .select('id, first_name, last_name, skill_level, is_active')
    .eq('is_active', true);

  const { data: schedules } = await supabase
    .from('technician_schedules')
    .select('technician_id, day_of_week, start_time, end_time')
    .eq('is_active', true);

  const { data: services } = await supabase
    .from('services')
    .select('id, required_skill_level');

  // Build lookup maps
  const serviceSkillMap = {};
  services?.forEach(s => { serviceSkillMap[s.id] = s.required_skill_level || 'junior'; });

  let assigned = 0;
  let skipped = 0;

  for (const apt of appointments) {
    if (!apt.bay_id) {
      skipped++;
      continue;
    }

    // Find required skill level from services
    let requiredRank = 1;
    for (const as of (apt.appointment_services || [])) {
      const skill = serviceSkillMap[as.service_id] || 'junior';
      const rank = SKILL_RANK[skill] || 1;
      if (rank > requiredRank) requiredRank = rank;
    }

    // Find technicians assigned to this bay
    const bayTechs = bayAssignments?.filter(ba => ba.bay_id === apt.bay_id) || [];
    if (bayTechs.length === 0) {
      skipped++;
      continue;
    }

    // Filter by skill level
    const qualified = bayTechs.filter(ba => {
      const tech = technicians?.find(t => t.id === ba.technician_id);
      return tech && (SKILL_RANK[tech.skill_level] || 1) >= requiredRank;
    });

    if (qualified.length === 0) {
      skipped++;
      continue;
    }

    // Check schedule
    const aptDate = new Date(apt.scheduled_date + 'T12:00:00');
    const dayOfWeek = aptDate.getDay();
    const [aptH, aptM] = (apt.scheduled_time || '08:00').split(':').map(Number);
    const aptStartTime = `${String(aptH).padStart(2, '0')}:${String(aptM).padStart(2, '0')}:00`;
    const endMins = aptH * 60 + aptM + (apt.estimated_duration_minutes || 60);
    const aptEndTime = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}:00`;

    const workingIds = schedules
      ?.filter(s =>
        qualified.some(q => q.technician_id === s.technician_id) &&
        s.day_of_week === dayOfWeek &&
        s.start_time <= aptStartTime &&
        s.end_time >= aptEndTime
      )
      .map(s => s.technician_id) || [];

    if (workingIds.length === 0) {
      skipped++;
      continue;
    }

    // Check conflicts with other appointments at the same time
    const aptStartMins = aptH * 60 + aptM;
    const aptEndMins = aptStartMins + (apt.estimated_duration_minutes || 60);

    const { data: conflicts } = await supabase
      .from('appointments')
      .select('technician_id, scheduled_time, estimated_duration_minutes')
      .in('technician_id', workingIds)
      .eq('scheduled_date', apt.scheduled_date)
      .not('status', 'in', '("cancelled","no_show")')
      .not('id', 'eq', apt.id);

    const busyIds = new Set();
    if (conflicts) {
      for (const conf of conflicts) {
        if (!conf.technician_id) continue;
        const [cH, cM] = conf.scheduled_time.split(':').map(Number);
        const confStart = cH * 60 + cM;
        const confEnd = confStart + (conf.estimated_duration_minutes || 60);
        if (aptStartMins < confEnd && aptEndMins > confStart) {
          busyIds.add(conf.technician_id);
        }
      }
    }

    const available = workingIds.filter(id => !busyIds.has(id));
    if (available.length === 0) {
      skipped++;
      continue;
    }

    // Pick best: primary bay, then least over-qualified
    const candidates = available.map(id => ({
      id,
      tech: technicians?.find(t => t.id === id),
      isPrimary: bayTechs.find(ba => ba.technician_id === id)?.is_primary || false,
    }));

    candidates.sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return (SKILL_RANK[a.tech?.skill_level] || 1) - (SKILL_RANK[b.tech?.skill_level] || 1);
    });

    const chosen = candidates[0];

    // Update appointment
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ technician_id: chosen.id })
      .eq('id', apt.id);

    if (updateError) {
      console.log(`  ✗ ${apt.id.substring(0, 8)} - Error: ${updateError.message}`);
      skipped++;
    } else {
      const svcName = apt.appointment_services?.[0]?.service_name || 'Service';
      console.log(`  ✓ ${apt.scheduled_date} ${apt.scheduled_time} - ${svcName} → ${chosen.tech?.first_name} ${chosen.tech?.last_name} (${chosen.tech?.skill_level})`);
      assigned++;
    }
  }

  console.log(`\nDone! Assigned: ${assigned}, Skipped: ${skipped} (no matching tech available)`);
}

run().catch(console.error);
