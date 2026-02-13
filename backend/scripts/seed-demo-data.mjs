/**
 * Seed Production Database with Realistic Demo Data
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/seed-demo-data.mjs
 *
 * What it creates:
 *   - ~50 customers with vehicles
 *   - 15 appointments per business day for the next 30 calendar days
 *   - Time slots for each day (upserted)
 *   - Call logs (~1 per appointment)
 *   - SMS logs (confirmation + some reminders)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing env vars. Usage:\n  SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/seed-demo-data.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Helpers ──────────────────────────────────────────────────────────────────

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr, n) {
  const copy = [...arr];
  const result = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function pad(n) { return String(n).padStart(2, '0'); }
function formatDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function formatTime(h, m) { return `${pad(h)}:${pad(m)}`; }

function addMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + mins;
  return formatTime(Math.floor(total / 60), total % 60);
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function isWeekday(d) {
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

function getBusinessDays(startDate, calendarDays) {
  const days = [];
  const d = new Date(startDate);
  for (let i = 0; i < calendarDays; i++) {
    d.setDate(d.getDate() + 1);
    if (isWeekday(d)) days.push(new Date(d));
  }
  return days;
}

// ── Static Data ──────────────────────────────────────────────────────────────

const firstNames = [
  'James', 'Michael', 'Robert', 'David', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher', 'Daniel',
  'Matthew', 'Anthony', 'Mark', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian',
  'Jennifer', 'Elizabeth', 'Maria', 'Susan', 'Margaret', 'Lisa', 'Nancy', 'Karen', 'Betty', 'Sarah',
  'Jessica', 'Ashley', 'Emily', 'Amanda', 'Melissa', 'Stephanie', 'Nicole', 'Michelle', 'Angela', 'Donna',
  'Carlos', 'Juan', 'Miguel', 'Antonio', 'Francisco', 'Dmitri', 'Raj', 'Wei', 'Hiroshi', 'Ahmed'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
];

const vehiclePool = [
  { make: 'Toyota', model: 'Camry', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Toyota', model: 'RAV4', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Toyota', model: 'Corolla', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Honda', model: 'Civic', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Honda', model: 'Accord', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Honda', model: 'CR-V', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Ford', model: 'F-150', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Ford', model: 'Explorer', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Ford', model: 'Escape', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Chevrolet', model: 'Silverado', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Chevrolet', model: 'Equinox', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'BMW', model: '3 Series', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Mercedes-Benz', model: 'C-Class', years: [2019, 2020, 2021, 2022] },
  { make: 'Audi', model: 'A4', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Lexus', model: 'RX 350', years: [2019, 2020, 2021, 2022] },
  { make: 'Nissan', model: 'Altima', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Nissan', model: 'Rogue', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Hyundai', model: 'Tucson', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Kia', model: 'Sportage', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Subaru', model: 'Outback', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Mazda', model: 'CX-5', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Jeep', model: 'Grand Cherokee', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Volkswagen', model: 'Jetta', years: [2019, 2020, 2021, 2022, 2023] },
];

const colors = ['Black', 'White', 'Silver', 'Gray', 'Blue', 'Red', 'Charcoal', 'Pearl White', 'Metallic Blue', 'Dark Green'];

const emailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];

const transcriptSummaries = {
  booked: [
    'Customer called to book a service appointment. AI agent collected vehicle information and scheduled the appointment successfully.',
    'Customer requested an oil change and tire rotation. AI agent checked availability and booked the earliest slot.',
    'Customer called about brake concerns. AI agent recommended inspection and booked a service appointment.',
    'Customer needed scheduled maintenance. AI agent confirmed services and booked a convenient time slot.',
  ],
  inquiry: [
    'Customer called with questions about services and pricing. AI agent provided information and offered to book an appointment.',
    'Customer inquired about wait times and appointment availability. Information was provided.',
    'Customer asked about pricing for brake work. AI agent gave estimates and offered to schedule a diagnostic.',
  ],
  cancelled: [
    'Customer called to cancel their upcoming appointment due to a scheduling conflict.',
    'Customer requested cancellation. AI agent confirmed and offered to reschedule.',
  ],
  other: [
    'Customer called with a general question about their vehicle warranty.',
    'Customer followed up on a previous service. No new appointment needed.',
  ],
};

// ── Main Seed Function ───────────────────────────────────────────────────────

async function seed() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Auto Service Booking — Production Data Seed   ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // ── Step 1: Query existing reference data ──────────────────────────────────

  console.log('Step 1: Fetching existing services, bays, and technicians...');

  const { data: services, error: svcErr } = await supabase
    .from('services')
    .select('id, name, duration_minutes, price_min, price_max, required_bay_type, is_popular')
    .eq('is_active', true);
  if (svcErr) throw new Error(`Failed to fetch services: ${svcErr.message}`);

  const { data: bays, error: bayErr } = await supabase
    .from('service_bays')
    .select('id, name, bay_type')
    .eq('is_active', true);
  if (bayErr) throw new Error(`Failed to fetch bays: ${bayErr.message}`);

  const { data: techs, error: techErr } = await supabase
    .from('technicians')
    .select('id')
    .eq('is_active', true);
  if (techErr) throw new Error(`Failed to fetch technicians: ${techErr.message}`);

  console.log(`  Services: ${services.length}, Bays: ${bays.length}, Technicians: ${techs.length}`);

  // Group bays by type for matching
  const baysByType = {};
  for (const bay of bays) {
    if (!baysByType[bay.bay_type]) baysByType[bay.bay_type] = [];
    baysByType[bay.bay_type].push(bay);
  }

  // Prefer short services on bay types with high capacity (quick_service, general_service, express_lane)
  const highCapacityTypes = new Set(['quick_service', 'general_service', 'express_lane']);
  const preferredServices = services
    .filter(s => s.duration_minutes <= 60 && highCapacityTypes.has(s.required_bay_type))
    .sort((a, b) => a.duration_minutes - b.duration_minutes);

  // Also keep a few popular longer services for variety (10% of picks)
  const varietyServices = services.filter(
    s => s.is_popular && !highCapacityTypes.has(s.required_bay_type) && s.duration_minutes <= 90
  );

  if (preferredServices.length === 0) {
    console.error('No short or popular services found — cannot build schedule.');
    process.exit(1);
  }

  console.log(`  Preferred services (short/popular): ${preferredServices.length}\n`);

  // ── Step 2: Create ~50 customers + vehicles ────────────────────────────────

  console.log('Step 2: Creating 50 customers and vehicles...');

  const customerRows = [];
  for (let i = 0; i < 50; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const phoneNum = `555-${String(100 + i).padStart(4, '0')}`;
    const phone = `+1416${phoneNum.replace('-', '')}`;

    customerRows.push({
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      phone_normalized: phone,
      email: Math.random() > 0.2 ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${randomItem(emailDomains)}` : null,
      marketing_opt_in: Math.random() > 0.15,
      total_visits: randomInt(2, 15),
      total_spent: parseFloat((randomInt(200, 3000)).toFixed(2)),
    });
  }

  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .insert(customerRows)
    .select('id, first_name, last_name, phone, phone_normalized');

  if (custErr) throw new Error(`Failed to insert customers: ${custErr.message}`);
  console.log(`  ✓ ${customers.length} customers created`);

  // One vehicle per customer
  const vehicleRows = customers.map(c => {
    const v = randomItem(vehiclePool);
    const year = randomItem(v.years);
    const age = 2026 - year;
    return {
      customer_id: c.id,
      year,
      make: v.make,
      model: v.model,
      color: randomItem(colors),
      mileage: Math.round(age * 12000 * (0.7 + Math.random() * 0.6)),
      is_primary: true,
    };
  });

  const { data: vehiclesInserted, error: vehErr } = await supabase
    .from('vehicles')
    .insert(vehicleRows)
    .select('id, customer_id');

  if (vehErr) throw new Error(`Failed to insert vehicles: ${vehErr.message}`);
  console.log(`  ✓ ${vehiclesInserted.length} vehicles created\n`);

  // Map customer → vehicle
  const vehicleByCustomer = {};
  for (const v of vehiclesInserted) vehicleByCustomer[v.customer_id] = v.id;

  // ── Step 3 & 4: Create appointments for every business day ─────────────────

  const today = new Date();
  const todayStr = formatDate(today);
  const businessDays = getBusinessDays(today, 30);

  console.log(`Step 3: Creating 15 appointments per business day (${businessDays.length} days)...`);

  let totalAppointments = 0;
  let totalApptServices = 0;
  let totalSlots = 0;

  for (const date of businessDays) {
    const dateStr = formatDate(date);
    const isToday = dateStr === todayStr;

    // ── Ensure time slots exist for this date ──────────────────────────────
    const slotTimes = [];
    for (let h = 7; h <= 15; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === 15 && m > 30) continue;  // last slot: 15:30
        slotTimes.push(formatTime(h, m));
      }
    }

    const slotRows = [];
    for (const st of slotTimes) {
      for (const bay of bays) {
        slotRows.push({
          slot_date: dateStr,
          start_time: st,
          end_time: addMinutes(st, 30),
          bay_id: bay.id,
          is_available: true,
        });
      }
    }

    // Upsert — skip if slot already exists
    const { error: slotErr } = await supabase
      .from('time_slots')
      .upsert(slotRows, { onConflict: 'slot_date,start_time,bay_id', ignoreDuplicates: true });

    if (slotErr) {
      console.warn(`  ⚠ Slot upsert error for ${dateStr}: ${slotErr.message}`);
    }
    totalSlots += slotRows.length;

    // ── Schedule 15 appointments spread across the day ─────────────────────
    // Available start times: 7:00 to 15:00 (in 30-min steps) — we'll pick 15
    const startOptions = [];
    for (let h = 7; h <= 15; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === 15 && m > 0) continue;  // latest start: 15:00 for a 60-min service
        startOptions.push(formatTime(h, m));
      }
    }

    // Track bay usage per time slot to avoid double booking
    const baySlotUsage = new Map(); // "bay_id:HH:MM" → true

    const dayAppointments = [];
    const dayApptServices = [];

    for (let i = 0; i < 25 && dayAppointments.length < 15; i++) {
      const customer = customers[randomInt(0, customers.length - 1)];
      const vehicleId = vehicleByCustomer[customer.id];

      // Pick 1 service (90% high-capacity, 10% variety for realism)
      const useVariety = varietyServices.length > 0 && Math.random() < 0.1;
      const pool = useVariety ? varietyServices : preferredServices;
      const selectedServices = [randomItem(pool)];

      // Total duration
      const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
      const slotsNeeded = Math.ceil(totalDuration / 30);

      // Find bay type that works for the primary service
      const primaryService = selectedServices[0];
      const matchingBays = baysByType[primaryService.required_bay_type] || [];
      if (matchingBays.length === 0) continue;

      // Latest possible start: 16:00 minus duration (ensure service ends by 4 PM)
      const latestStartMin = 16 * 60 - totalDuration;
      const validStarts = startOptions.filter(t => timeToMinutes(t) <= latestStartMin);
      if (validStarts.length === 0) continue;

      // Try to find an available bay+time combo
      let booked = false;
      const shuffledStarts = [...validStarts].sort(() => Math.random() - 0.5);
      const shuffledBays = [...matchingBays].sort(() => Math.random() - 0.5);

      for (const startTime of shuffledStarts) {
        if (booked) break;
        for (const bay of shuffledBays) {
          // Check all needed slots are free
          let allFree = true;
          const slotKeys = [];
          for (let s = 0; s < slotsNeeded; s++) {
            const slotTime = addMinutes(startTime, s * 30);
            const key = `${bay.id}:${slotTime}`;
            if (baySlotUsage.has(key)) { allFree = false; break; }
            slotKeys.push(key);
          }
          if (!allFree) continue;

          // Reserve locally
          for (const key of slotKeys) baySlotUsage.set(key, true);

          // Status logic
          let status;
          if (isToday) {
            const r = Math.random();
            if (r < 0.3) status = 'checked_in';
            else if (r < 0.5) status = 'in_progress';
            else if (r < 0.7) status = 'completed';
            else status = 'scheduled';
          } else {
            status = Math.random() < 0.7 ? 'scheduled' : 'confirmed';
          }

          const quotedTotal = selectedServices.reduce((sum, s) => sum + (s.price_min || 0), 0);

          dayAppointments.push({
            customer_id: customer.id,
            vehicle_id: vehicleId,
            scheduled_date: dateStr,
            scheduled_time: startTime,
            estimated_duration_minutes: totalDuration,
            bay_id: bay.id,
            technician_id: randomItem(techs).id,
            status,
            created_by: Math.random() < 0.6 ? 'ai_agent' : 'dashboard',
            quoted_total: quotedTotal,
            loaner_requested: Math.random() < 0.05,
            shuttle_requested: Math.random() < 0.1,
            waiter: Math.random() < 0.3,
          });

          // Build appointment_services (will link after insert)
          dayApptServices.push(selectedServices.map(s => ({
            service_id: s.id,
            service_name: s.name,
            quoted_price: s.price_min || 0,
            duration_minutes: s.duration_minutes,
          })));

          booked = true;
          break;
        }
      }
    }

    // Insert day's appointments
    if (dayAppointments.length > 0) {
      const { data: inserted, error: apptErr } = await supabase
        .from('appointments')
        .insert(dayAppointments)
        .select('id, bay_id, scheduled_date, scheduled_time, estimated_duration_minutes');

      if (apptErr) {
        console.warn(`  ⚠ Appointment insert error for ${dateStr}: ${apptErr.message}`);
        continue;
      }

      // Insert appointment_services
      const svcRows = [];
      for (let j = 0; j < inserted.length; j++) {
        for (const svc of dayApptServices[j]) {
          svcRows.push({ ...svc, appointment_id: inserted[j].id });
        }
      }

      if (svcRows.length > 0) {
        const { error: svcInsertErr } = await supabase
          .from('appointment_services')
          .insert(svcRows);
        if (svcInsertErr) console.warn(`  ⚠ Appt services error for ${dateStr}: ${svcInsertErr.message}`);
        totalApptServices += svcRows.length;
      }

      // Book time slots via RPC for each appointment
      for (const appt of inserted) {
        const { error: bookErr } = await supabase.rpc('book_appointment_slots', {
          p_bay_id: appt.bay_id,
          p_date: appt.scheduled_date,
          p_start_time: appt.scheduled_time,
          p_duration_minutes: appt.estimated_duration_minutes,
          p_appointment_id: appt.id,
        });
        if (bookErr) {
          // Trigger may have already booked — that's fine
        }
      }

      totalAppointments += inserted.length;
    }

    process.stdout.write(`  ${dateStr}: ${dayAppointments.length} appointments\n`);
  }

  console.log(`  ✓ ${totalAppointments} appointments, ${totalApptServices} service line items\n`);

  // ── Step 5: Create call logs ───────────────────────────────────────────────

  console.log('Step 5: Creating call logs...');

  // Fetch all newly inserted appointments for linking
  const { data: allAppts } = await supabase
    .from('appointments')
    .select('id, customer_id, scheduled_date')
    .in('customer_id', customers.map(c => c.id))
    .order('scheduled_date', { ascending: true });

  const callRows = [];
  const outcomes = ['booked', 'booked', 'booked', 'booked', 'booked', 'booked',
                    'inquiry', 'inquiry', 'inquiry',
                    'cancelled', 'cancelled',
                    'abandoned', 'voicemail', 'callback_requested'];

  const sentiments = ['positive', 'positive', 'positive', 'positive',
                      'neutral', 'neutral',
                      'negative'];

  const apptsByCustomer = {};
  if (allAppts) {
    for (const a of allAppts) {
      if (!apptsByCustomer[a.customer_id]) apptsByCustomer[a.customer_id] = [];
      apptsByCustomer[a.customer_id].push(a);
    }
  }

  // ~1 call per appointment, randomized
  const callCount = Math.min(totalAppointments, 300);
  for (let i = 0; i < callCount; i++) {
    const customer = customers[i % customers.length];
    const outcome = randomItem(outcomes);
    const sentiment = randomItem(sentiments);
    const duration = randomInt(60, 300);

    // Link to appointment for booked calls
    let appointmentId = null;
    if (outcome === 'booked' && apptsByCustomer[customer.id]?.length) {
      const appt = apptsByCustomer[customer.id].shift();
      appointmentId = appt?.id || null;
    }

    const daysAgo = randomInt(0, 30);
    const callDate = new Date(today);
    callDate.setDate(callDate.getDate() - daysAgo);
    const hour = randomInt(8, 17);
    const minute = randomInt(0, 59);
    callDate.setHours(hour, minute, 0, 0);

    const endDate = new Date(callDate.getTime() + duration * 1000);

    const summaryKey = outcome === 'booked' ? 'booked'
      : outcome === 'inquiry' ? 'inquiry'
      : outcome === 'cancelled' ? 'cancelled'
      : 'other';

    callRows.push({
      retell_call_id: `seed_call_${Date.now()}_${i}`,
      phone_number: customer.phone,
      phone_normalized: customer.phone_normalized,
      customer_id: customer.id,
      direction: 'inbound',
      started_at: callDate.toISOString(),
      ended_at: endDate.toISOString(),
      duration_seconds: duration,
      outcome,
      appointment_id: appointmentId,
      sentiment,
      intent_detected: outcome === 'booked' ? 'book_appointment' : outcome === 'inquiry' ? 'general_inquiry' : outcome,
      transcript_summary: randomItem(transcriptSummaries[summaryKey]),
      agent_id: 'agent_98c68bf49ac79b86c517c5c2ba',
    });
  }

  // Insert in batches of 100
  for (let i = 0; i < callRows.length; i += 100) {
    const batch = callRows.slice(i, i + 100);
    const { error: callErr } = await supabase.from('call_logs').insert(batch);
    if (callErr) console.warn(`  ⚠ Call log batch error: ${callErr.message}`);
  }
  console.log(`  ✓ ${callRows.length} call logs\n`);

  // ── Step 6: Create SMS logs ────────────────────────────────────────────────

  console.log('Step 6: Creating SMS logs...');

  const smsRows = [];
  const allApptsForSms = allAppts || [];

  for (const appt of allApptsForSms) {
    const customer = customers.find(c => c.id === appt.customer_id);
    if (!customer) continue;

    // Confirmation SMS for every appointment
    smsRows.push({
      to_phone: customer.phone_normalized,
      from_phone: '+14169001234',
      message_body: `Hi ${customer.first_name}, your appointment at Premier Auto Service on ${appt.scheduled_date} is confirmed. Reply CHANGE to reschedule or CANCEL to cancel.`,
      message_type: 'confirmation',
      twilio_sid: `SM_seed_${Date.now()}_${smsRows.length}`,
      status: 'delivered',
      customer_id: customer.id,
      appointment_id: appt.id,
      direction: 'outbound',
    });

    // Reminder SMS for appointments within the next 7 days
    const apptDate = new Date(appt.scheduled_date + 'T00:00:00');
    const daysUntil = Math.floor((apptDate - today) / (1000 * 60 * 60 * 24));
    if (daysUntil >= 0 && daysUntil <= 7) {
      smsRows.push({
        to_phone: customer.phone_normalized,
        from_phone: '+14169001234',
        message_body: `Reminder: Your appointment at Premier Auto Service is tomorrow. Please arrive 5 minutes early. Reply CHANGE to reschedule.`,
        message_type: 'reminder',
        twilio_sid: `SM_seed_${Date.now()}_${smsRows.length}`,
        status: 'delivered',
        customer_id: customer.id,
        appointment_id: appt.id,
        direction: 'outbound',
      });
    }
  }

  // Insert in batches
  for (let i = 0; i < smsRows.length; i += 100) {
    const batch = smsRows.slice(i, i + 100);
    const { error: smsErr } = await supabase.from('sms_logs').insert(batch);
    if (smsErr) console.warn(`  ⚠ SMS log batch error: ${smsErr.message}`);
  }
  console.log(`  ✓ ${smsRows.length} SMS logs\n`);

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║                 SEED COMPLETE                   ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Customers:           ${String(customers.length).padStart(5)}                   ║`);
  console.log(`║  Vehicles:            ${String(vehiclesInserted.length).padStart(5)}                   ║`);
  console.log(`║  Appointments:        ${String(totalAppointments).padStart(5)}                   ║`);
  console.log(`║  Appointment Services:${String(totalApptServices).padStart(5)}                   ║`);
  console.log(`║  Time Slots Created:  ${String(totalSlots).padStart(5)}                   ║`);
  console.log(`║  Call Logs:           ${String(callRows.length).padStart(5)}                   ║`);
  console.log(`║  SMS Logs:            ${String(smsRows.length).padStart(5)}                   ║`);
  console.log('╚══════════════════════════════════════════════════╝');
}

seed().catch(err => {
  console.error('\n✗ Seed failed:', err.message);
  process.exit(1);
});
