/**
 * Seed technician-bay assignments and schedules into the database.
 * These were part of 002_seed_data.sql but may not have been run.
 *
 * Run: node backend/scripts/seed-tech-assignments.js
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

async function run() {
  console.log('Seeding technician bay assignments and schedules...\n');

  // Get all technicians
  const { data: techs } = await supabase
    .from('technicians')
    .select('id, employee_id, first_name, last_name, skill_level');

  if (!techs?.length) {
    console.log('No technicians found. Run the full seed first.');
    return;
  }

  // Get all bays
  const { data: bays } = await supabase
    .from('service_bays')
    .select('id, name, bay_type');

  if (!bays?.length) {
    console.log('No bays found. Run the full seed first.');
    return;
  }

  console.log(`Found ${techs.length} technicians and ${bays.length} bays\n`);

  const techMap = {};
  techs.forEach(t => { techMap[t.employee_id] = t; });

  const baysByType = {};
  bays.forEach(b => {
    if (!baysByType[b.bay_type]) baysByType[b.bay_type] = [];
    baysByType[b.bay_type].push(b);
  });

  // Clear existing assignments and schedules
  await supabase.from('technician_bay_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('technician_schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleared existing assignments and schedules\n');

  // ===== BAY ASSIGNMENTS =====
  const assignments = [];

  // Quick service + express lane techs
  for (const empId of ['TECH004', 'TECH005', 'TECH009', 'TECH010']) {
    const tech = techMap[empId];
    if (!tech) continue;
    for (const bayType of ['quick_service', 'express_lane']) {
      for (const bay of (baysByType[bayType] || [])) {
        assignments.push({ technician_id: tech.id, bay_id: bay.id, is_primary: true });
      }
    }
  }

  // General service techs
  for (const empId of ['TECH002', 'TECH005', 'TECH008']) {
    const tech = techMap[empId];
    if (!tech) continue;
    for (const bay of (baysByType['general_service'] || [])) {
      assignments.push({ technician_id: tech.id, bay_id: bay.id, is_primary: true });
    }
  }

  // Alignment specialist
  const alignTech = techMap['TECH003'];
  if (alignTech) {
    for (const bay of (baysByType['alignment'] || [])) {
      assignments.push({ technician_id: alignTech.id, bay_id: bay.id, is_primary: true });
    }
  }

  // Diagnostic specialist
  const diagTech = techMap['TECH006'];
  if (diagTech) {
    for (const bay of (baysByType['diagnostic'] || [])) {
      assignments.push({ technician_id: diagTech.id, bay_id: bay.id, is_primary: true });
    }
  }

  // Heavy repair (masters)
  for (const empId of ['TECH001', 'TECH007']) {
    const tech = techMap[empId];
    if (!tech) continue;
    for (const bay of (baysByType['heavy_repair'] || [])) {
      assignments.push({ technician_id: tech.id, bay_id: bay.id, is_primary: true });
    }
  }

  if (assignments.length > 0) {
    const { error } = await supabase.from('technician_bay_assignments').insert(assignments);
    if (error) console.log('Assignment insert error:', error.message);
    else console.log(`✓ Created ${assignments.length} bay assignments`);
  }

  // ===== SCHEDULES =====
  const schedules = [];

  // Mon-Fri 7am-6pm for senior techs (TECH001-TECH008)
  for (const empId of ['TECH001', 'TECH002', 'TECH003', 'TECH004', 'TECH005', 'TECH006', 'TECH007', 'TECH008']) {
    const tech = techMap[empId];
    if (!tech) continue;
    for (let day = 1; day <= 5; day++) {
      schedules.push({
        technician_id: tech.id,
        day_of_week: day,
        start_time: '07:00',
        end_time: '18:00',
        is_active: true,
      });
    }
  }

  // Saturday for select techs
  for (const empId of ['TECH001', 'TECH004', 'TECH006', 'TECH009']) {
    const tech = techMap[empId];
    if (!tech) continue;
    schedules.push({
      technician_id: tech.id,
      day_of_week: 6,
      start_time: '08:00',
      end_time: '16:00',
      is_active: true,
    });
  }

  // Junior techs: Mon-Fri 8am-5pm
  for (const empId of ['TECH009', 'TECH010']) {
    const tech = techMap[empId];
    if (!tech) continue;
    for (let day = 1; day <= 5; day++) {
      schedules.push({
        technician_id: tech.id,
        day_of_week: day,
        start_time: '08:00',
        end_time: '17:00',
        is_active: true,
      });
    }
  }

  if (schedules.length > 0) {
    const { error } = await supabase.from('technician_schedules').insert(schedules);
    if (error) console.log('Schedule insert error:', error.message);
    else console.log(`✓ Created ${schedules.length} schedule entries`);
  }

  // Verify
  const { data: verifyAssignments } = await supabase.from('technician_bay_assignments').select('id');
  const { data: verifySchedules } = await supabase.from('technician_schedules').select('id');
  console.log(`\nVerification: ${verifyAssignments?.length} assignments, ${verifySchedules?.length} schedules`);

  // Show summary
  console.log('\nBay assignment summary:');
  for (const [type, typeBays] of Object.entries(baysByType)) {
    const techsForType = assignments.filter(a => typeBays.some(b => b.id === a.bay_id));
    const uniqueTechs = [...new Set(techsForType.map(a => a.technician_id))];
    const techNames = uniqueTechs.map(id => {
      const t = techs.find(t => t.id === id);
      return `${t?.first_name} ${t?.last_name} (${t?.skill_level})`;
    });
    console.log(`  ${type}: ${techNames.join(', ')}`);
  }
}

run().catch(console.error);
