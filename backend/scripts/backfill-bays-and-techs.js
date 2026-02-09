/**
 * Backfill bay AND technician assignments for ALL existing appointments.
 * For appointments missing a bay, assigns one based on service bay_type.
 * Then assigns a technician for each.
 *
 * Run: node backend/scripts/backfill-bays-and-techs.js
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
  console.log('Backfilling bays and technicians for ALL appointments...\n');

  // Load reference data
  const { data: bays } = await supabase.from('service_bays').select('id, name, bay_type').eq('is_active', true);
  const { data: bayAssignments } = await supabase.from('technician_bay_assignments').select('technician_id, bay_id, is_primary');
  const { data: technicians } = await supabase.from('technicians').select('id, first_name, last_name, skill_level, is_active').eq('is_active', true);
  const { data: schedules } = await supabase.from('technician_schedules').select('technician_id, day_of_week, start_time, end_time').eq('is_active', true);
  const { data: allServices } = await supabase.from('services').select('id, required_bay_type, required_skill_level');

  const serviceMap = {};
  allServices?.forEach(s => { serviceMap[s.id] = s; });

  const baysByType = {};
  bays?.forEach(b => {
    if (!baysByType[b.bay_type]) baysByType[b.bay_type] = [];
    baysByType[b.bay_type].push(b);
  });

  // Round-robin counters per bay type to spread bays evenly
  const bayCounters = {};

  function pickBay(bayType) {
    const typeBays = baysByType[bayType] || baysByType['general_service'] || [];
    if (typeBays.length === 0) return null;
    if (!bayCounters[bayType]) bayCounters[bayType] = 0;
    const bay = typeBays[bayCounters[bayType] % typeBays.length];
    bayCounters[bayType]++;
    return bay;
  }

  // Get ALL appointments
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, scheduled_date, scheduled_time, estimated_duration_minutes, bay_id, technician_id, status, appointment_services (service_id)')
    .not('status', 'in', '("cancelled","no_show")')
    .order('scheduled_date', { ascending: true });

  console.log(`Found ${appointments?.length || 0} active appointments\n`);

  let baysFilled = 0;
  let techsFilled = 0;
  let skipped = 0;

  for (const apt of (appointments || [])) {
    const updates = {};

    // 1. Assign bay if missing
    let bayId = apt.bay_id;
    if (!bayId) {
      // Determine bay type from services
      let bestBayType = 'general_service';
      const BAY_RANK = { express_lane: 1, quick_service: 2, general_service: 3, alignment: 4, diagnostic: 5, heavy_repair: 6 };
      let bestRank = 0;

      for (const as of (apt.appointment_services || [])) {
        const svc = serviceMap[as.service_id];
        if (svc?.required_bay_type) {
          const rank = BAY_RANK[svc.required_bay_type] || 3;
          if (rank > bestRank) {
            bestRank = rank;
            bestBayType = svc.required_bay_type;
          }
        }
      }

      const bay = pickBay(bestBayType);
      if (bay) {
        bayId = bay.id;
        updates.bay_id = bay.id;
        baysFilled++;
      }
    }

    // 2. Assign technician if missing
    if (!apt.technician_id && bayId) {
      // Find required skill
      let requiredRank = 1;
      for (const as of (apt.appointment_services || [])) {
        const svc = serviceMap[as.service_id];
        const rank = SKILL_RANK[svc?.required_skill_level] || 1;
        if (rank > requiredRank) requiredRank = rank;
      }

      // Find techs assigned to this bay
      const bayTechs = bayAssignments?.filter(ba => ba.bay_id === bayId) || [];

      // Filter by skill
      const qualified = bayTechs.filter(ba => {
        const tech = technicians?.find(t => t.id === ba.technician_id);
        return tech && (SKILL_RANK[tech.skill_level] || 1) >= requiredRank;
      });

      if (qualified.length > 0) {
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

        if (workingIds.length > 0) {
          // Check conflicts
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
          if (available.length > 0) {
            // Pick best
            const candidates = available.map(id => ({
              id,
              tech: technicians?.find(t => t.id === id),
              isPrimary: bayTechs.find(ba => ba.technician_id === id)?.is_primary || false,
            }));
            candidates.sort((a, b) => {
              if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
              return (SKILL_RANK[a.tech?.skill_level] || 1) - (SKILL_RANK[b.tech?.skill_level] || 1);
            });

            updates.technician_id = candidates[0].id;
            techsFilled++;
          }
        }
      }
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', apt.id);

      if (error) {
        console.log(`  ✗ ${apt.id.substring(0, 8)} error: ${error.message}`);
        skipped++;
      }
    } else if (!apt.bay_id || !apt.technician_id) {
      skipped++;
    }
  }

  console.log(`\nDone!`);
  console.log(`  Bays filled: ${baysFilled}`);
  console.log(`  Technicians filled: ${techsFilled}`);
  console.log(`  Skipped: ${skipped}`);

  // Verify
  const { data: noBay } = await supabase.from('appointments').select('id', { count: 'exact' }).is('bay_id', null).not('status', 'in', '("cancelled","no_show")');
  const { data: noTech } = await supabase.from('appointments').select('id', { count: 'exact' }).is('technician_id', null).not('status', 'in', '("cancelled","no_show")');
  console.log(`\nRemaining without bay: ${noBay?.length || 0}`);
  console.log(`Remaining without technician: ${noTech?.length || 0}`);
}

run().catch(console.error);
