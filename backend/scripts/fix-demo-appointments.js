/**
 * Fix demo appointment data:
 * 1. Fix prices stored as cents → convert to dollars
 * 2. Fix durations to match actual service durations
 * 3. Fix appointment_services quoted_price values
 * 4. Assign bays and technicians to all appointments
 *
 * Run: node backend/scripts/fix-demo-appointments.js
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
const BAY_RANK = { express_lane: 1, quick_service: 2, general_service: 3, alignment: 4, diagnostic: 5, heavy_repair: 6 };

async function run() {
  console.log('Fixing demo appointment data...\n');

  // Load reference data
  const { data: allServices } = await supabase.from('services').select('id, name, duration_minutes, price_min, required_bay_type, required_skill_level');
  const { data: bays } = await supabase.from('service_bays').select('id, name, bay_type').eq('is_active', true);
  const { data: bayAssignments } = await supabase.from('technician_bay_assignments').select('technician_id, bay_id, is_primary');
  const { data: technicians } = await supabase.from('technicians').select('id, first_name, last_name, skill_level').eq('is_active', true);
  const { data: schedules } = await supabase.from('technician_schedules').select('technician_id, day_of_week, start_time, end_time').eq('is_active', true);

  const serviceMap = {};
  allServices?.forEach(s => { serviceMap[s.id] = s; });

  const baysByType = {};
  bays?.forEach(b => {
    if (!baysByType[b.bay_type]) baysByType[b.bay_type] = [];
    baysByType[b.bay_type].push(b);
  });

  const bayCounters = {};
  function pickBay(bayType) {
    const typeBays = baysByType[bayType] || baysByType['general_service'] || [];
    if (typeBays.length === 0) return null;
    if (!bayCounters[bayType]) bayCounters[bayType] = 0;
    const bay = typeBays[bayCounters[bayType] % typeBays.length];
    bayCounters[bayType]++;
    return bay;
  }

  // Get ALL appointments with their services
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, scheduled_date, scheduled_time, estimated_duration_minutes, quoted_total, bay_id, technician_id, status, appointment_services (id, service_id, service_name, quoted_price, duration_minutes)')
    .not('status', 'in', '("cancelled","no_show")')
    .order('scheduled_date');

  console.log(`Processing ${appointments?.length || 0} appointments...\n`);

  let pricesFixed = 0, durationsFixed = 0, baysFilled = 0, techsFilled = 0;

  for (const apt of (appointments || [])) {
    const aptUpdates = {};
    const svcUpdates = [];

    // 1. Fix service prices and durations
    let correctTotalPrice = 0;
    let correctTotalDuration = 0;

    for (const as of (apt.appointment_services || [])) {
      const svc = serviceMap[as.service_id];
      if (!svc) continue;

      const svcUpdate = {};

      // Fix price: if quoted_price > 1000, it's likely in cents
      const correctPrice = svc.price_min || 0;
      if (as.quoted_price > 1000 || (as.quoted_price && Math.abs(as.quoted_price - correctPrice) > correctPrice * 0.5)) {
        svcUpdate.quoted_price = correctPrice;
      }
      correctTotalPrice += correctPrice;

      // Fix duration
      if (as.duration_minutes !== svc.duration_minutes) {
        svcUpdate.duration_minutes = svc.duration_minutes;
      }
      correctTotalDuration += svc.duration_minutes;

      if (Object.keys(svcUpdate).length > 0) {
        svcUpdates.push({ id: as.id, ...svcUpdate });
      }
    }

    // Fix appointment total price
    if (apt.quoted_total > 1000 || (correctTotalPrice > 0 && Math.abs(apt.quoted_total - correctTotalPrice) > correctTotalPrice * 0.5)) {
      aptUpdates.quoted_total = correctTotalPrice;
      pricesFixed++;
    }

    // Fix appointment duration
    if (correctTotalDuration > 0 && apt.estimated_duration_minutes !== correctTotalDuration) {
      aptUpdates.estimated_duration_minutes = correctTotalDuration;
      durationsFixed++;
    }

    // 2. Assign bay if missing
    let bayId = apt.bay_id;
    if (!bayId) {
      let bestBayType = 'general_service';
      let bestRank = 0;
      for (const as of (apt.appointment_services || [])) {
        const svc = serviceMap[as.service_id];
        if (svc?.required_bay_type) {
          const rank = BAY_RANK[svc.required_bay_type] || 3;
          if (rank > bestRank) { bestRank = rank; bestBayType = svc.required_bay_type; }
        }
      }
      const bay = pickBay(bestBayType);
      if (bay) {
        bayId = bay.id;
        aptUpdates.bay_id = bay.id;
        baysFilled++;
      }
    }

    // 3. Assign technician if missing
    if (!apt.technician_id && bayId) {
      let requiredRank = 1;
      for (const as of (apt.appointment_services || [])) {
        const svc = serviceMap[as.service_id];
        const rank = SKILL_RANK[svc?.required_skill_level] || 1;
        if (rank > requiredRank) requiredRank = rank;
      }

      const bayTechs = bayAssignments?.filter(ba => ba.bay_id === bayId) || [];
      const qualified = bayTechs.filter(ba => {
        const tech = technicians?.find(t => t.id === ba.technician_id);
        return tech && (SKILL_RANK[tech.skill_level] || 1) >= requiredRank;
      });

      if (qualified.length > 0) {
        const aptDate = new Date(apt.scheduled_date + 'T12:00:00');
        const dayOfWeek = aptDate.getDay();
        const [aptH, aptM] = (apt.scheduled_time || '08:00').split(':').map(Number);
        const dur = correctTotalDuration || apt.estimated_duration_minutes || 60;
        const aptStartTime = `${String(aptH).padStart(2, '0')}:${String(aptM).padStart(2, '0')}:00`;
        const endMins = aptH * 60 + aptM + dur;
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
          const aptStartMins = aptH * 60 + aptM;
          const aptEndMins = aptStartMins + dur;

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
              if (aptStartMins < confEnd && aptEndMins > confStart) busyIds.add(conf.technician_id);
            }
          }

          const available = workingIds.filter(id => !busyIds.has(id));
          if (available.length > 0) {
            const candidates = available.map(id => ({
              id, tech: technicians?.find(t => t.id === id),
              isPrimary: bayTechs.find(ba => ba.technician_id === id)?.is_primary || false,
            }));
            candidates.sort((a, b) => {
              if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
              return (SKILL_RANK[a.tech?.skill_level] || 1) - (SKILL_RANK[b.tech?.skill_level] || 1);
            });
            aptUpdates.technician_id = candidates[0].id;
            techsFilled++;
          }
        }
      }
    }

    // Apply appointment updates
    if (Object.keys(aptUpdates).length > 0) {
      await supabase.from('appointments').update(aptUpdates).eq('id', apt.id);
    }

    // Apply service updates
    for (const su of svcUpdates) {
      const { id, ...fields } = su;
      await supabase.from('appointment_services').update(fields).eq('id', id);
    }
  }

  console.log(`Done!`);
  console.log(`  Prices fixed: ${pricesFixed}`);
  console.log(`  Durations fixed: ${durationsFixed}`);
  console.log(`  Bays assigned: ${baysFilled}`);
  console.log(`  Technicians assigned: ${techsFilled}`);

  // Verify
  const { data: noBay } = await supabase.from('appointments').select('id').is('bay_id', null).not('status', 'in', '("cancelled","no_show")');
  const { data: noTech } = await supabase.from('appointments').select('id').is('technician_id', null).not('status', 'in', '("cancelled","no_show")');
  console.log(`\nRemaining without bay: ${noBay?.length || 0}`);
  console.log(`Remaining without technician: ${noTech?.length || 0}`);
}

run().catch(console.error);
