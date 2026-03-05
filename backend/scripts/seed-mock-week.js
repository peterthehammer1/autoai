import { supabase } from '../src/config/database.js';

// ── Realistic mock customers ──────────────────────────────────────────
const customers = [
  { first_name: 'Mike', last_name: 'Henderson', phone: '+14165559001', vehicle: { year: 2021, make: 'Toyota', model: 'RAV4', color: 'Blue', mileage: 48000 } },
  { first_name: 'Sarah', last_name: 'Mitchell', phone: '+14165559002', vehicle: { year: 2019, make: 'Honda', model: 'Civic', color: 'Silver', mileage: 72000 } },
  { first_name: 'Dave', last_name: 'Kowalski', phone: '+14165559003', vehicle: { year: 2022, make: 'Ford', model: 'F-150', color: 'Black', mileage: 35000 } },
  { first_name: 'Lisa', last_name: 'Tran', phone: '+14165559004', vehicle: { year: 2020, make: 'Hyundai', model: 'Tucson', color: 'White', mileage: 61000 } },
  { first_name: 'James', last_name: 'Robertson', phone: '+14165559005', vehicle: { year: 2023, make: 'Chevrolet', model: 'Silverado', color: 'Red', mileage: 22000 } },
  { first_name: 'Karen', last_name: 'Patel', phone: '+14165559006', vehicle: { year: 2018, make: 'Nissan', model: 'Rogue', color: 'Grey', mileage: 95000 } },
  { first_name: 'Tom', last_name: 'Nguyen', phone: '+14165559007', vehicle: { year: 2021, make: 'Mazda', model: 'CX-5', color: 'Red', mileage: 44000 } },
  { first_name: 'Rachel', last_name: 'Brooks', phone: '+14165559008', vehicle: { year: 2020, make: 'Subaru', model: 'Outback', color: 'Green', mileage: 58000 } },
  { first_name: 'Chris', last_name: 'Wagner', phone: '+14165559009', vehicle: { year: 2017, make: 'BMW', model: '328i', color: 'Black', mileage: 112000 } },
  { first_name: 'Emily', last_name: 'Chen', phone: '+14165559010', vehicle: { year: 2022, make: 'Kia', model: 'Sportage', color: 'White', mileage: 31000 } },
  { first_name: 'Rob', last_name: 'Ferris', phone: '+14165559011', vehicle: { year: 2019, make: 'Dodge', model: 'RAM 1500', color: 'Black', mileage: 84000 } },
  { first_name: 'Amanda', last_name: 'Lopez', phone: '+14165559012', vehicle: { year: 2023, make: 'Toyota', model: 'Camry', color: 'Silver', mileage: 18000 } },
  { first_name: 'Steve', last_name: 'Murphy', phone: '+14165559013', vehicle: { year: 2020, make: 'Jeep', model: 'Wrangler', color: 'White', mileage: 67000 } },
  { first_name: 'Jen', last_name: 'Davis', phone: '+14165559014', vehicle: { year: 2021, make: 'Volkswagen', model: 'Tiguan', color: 'Blue', mileage: 42000 } },
  { first_name: 'Mark', last_name: 'Sullivan', phone: '+14165559015', vehicle: { year: 2018, make: 'GMC', model: 'Sierra', color: 'Grey', mileage: 105000 } },
  { first_name: 'Diane', last_name: 'Park', phone: '+14165559016', vehicle: { year: 2022, make: 'Lexus', model: 'RX 350', color: 'Pearl White', mileage: 28000 } },
  { first_name: 'Greg', last_name: 'Thompson', phone: '+14165559017', vehicle: { year: 2019, make: 'Honda', model: 'CR-V', color: 'Blue', mileage: 78000 } },
  { first_name: 'Nicole', last_name: 'Adams', phone: '+14165559018', vehicle: { year: 2024, make: 'Hyundai', model: 'Santa Fe', color: 'Black', mileage: 12000 } },
];

// ── Services to use (by name → will look up IDs) ─────────────────────
const serviceNames = [
  'Synthetic Blend Oil Change',
  'Full Synthetic Oil Change',
  'Tire Rotation',
  'Brake Inspection',
  'Front Brake Pads',
  'Cabin Air Filter',
  'Coolant Flush',
  'Winter Tire Changeover',
  'Wheel Alignment - 4 Wheel',
  'Check Engine Light Diagnosis',
  'Battery Replacement',
  'Multi-Point Inspection',
  'Wiper Blade Replacement',
  'Safety Inspection',
];

// ── Appointments spread across March 2-5, 2026 ───────────────────────
// Mon Mar 2, Tue Mar 3, Wed Mar 4, Thu Mar 5
const appointments = [
  // Monday March 2 — 5 appointments
  { custIdx: 0, services: ['Synthetic Blend Oil Change', 'Tire Rotation'], date: '2026-03-02', time: '07:00', status: 'completed', created_by: 'ai_agent' },
  { custIdx: 1, services: ['Front Brake Pads'], date: '2026-03-02', time: '07:30', status: 'completed', created_by: 'ai_agent' },
  { custIdx: 2, services: ['Full Synthetic Oil Change'], date: '2026-03-02', time: '09:00', status: 'completed', created_by: 'phone' },
  { custIdx: 3, services: ['Check Engine Light Diagnosis'], date: '2026-03-02', time: '10:30', status: 'completed', created_by: 'ai_agent' },
  { custIdx: 4, services: ['Winter Tire Changeover'], date: '2026-03-02', time: '13:00', status: 'completed', created_by: 'ai_agent' },

  // Tuesday March 3 — 5 appointments
  { custIdx: 5, services: ['Synthetic Blend Oil Change', 'Cabin Air Filter'], date: '2026-03-03', time: '07:00', status: 'completed', created_by: 'ai_agent' },
  { custIdx: 6, services: ['Wheel Alignment - 4 Wheel'], date: '2026-03-03', time: '08:00', status: 'completed', created_by: 'dashboard' },
  { custIdx: 7, services: ['Multi-Point Inspection'], date: '2026-03-03', time: '09:30', status: 'completed', created_by: 'ai_agent' },
  { custIdx: 8, services: ['Coolant Flush', 'Wiper Blade Replacement'], date: '2026-03-03', time: '11:00', status: 'completed', created_by: 'phone' },
  { custIdx: 9, services: ['Battery Replacement'], date: '2026-03-03', time: '14:00', status: 'completed', created_by: 'ai_agent' },

  // Wednesday March 4 — 5 appointments
  { custIdx: 10, services: ['Full Synthetic Oil Change', 'Tire Rotation'], date: '2026-03-04', time: '07:00', status: 'completed', created_by: 'ai_agent' },
  { custIdx: 11, services: ['Safety Inspection'], date: '2026-03-04', time: '08:30', status: 'completed', created_by: 'ai_agent' },
  { custIdx: 12, services: ['Front Brake Pads', 'Brake Inspection'], date: '2026-03-04', time: '10:00', status: 'in_progress', created_by: 'phone' },
  { custIdx: 13, services: ['Synthetic Blend Oil Change'], date: '2026-03-04', time: '13:00', status: 'in_progress', created_by: 'ai_agent' },
  { custIdx: 14, services: ['Check Engine Light Diagnosis'], date: '2026-03-04', time: '14:30', status: 'checked_in', created_by: 'ai_agent' },

  // Thursday March 5 — 3 upcoming appointments
  { custIdx: 15, services: ['Full Synthetic Oil Change', 'Cabin Air Filter'], date: '2026-03-05', time: '07:30', status: 'confirmed', created_by: 'ai_agent' },
  { custIdx: 16, services: ['Tire Rotation'], date: '2026-03-05', time: '09:00', status: 'scheduled', created_by: 'ai_agent' },
  { custIdx: 17, services: ['Wheel Alignment - 4 Wheel', 'Winter Tire Changeover'], date: '2026-03-05', time: '10:30', status: 'scheduled', created_by: 'dashboard' },
];

// ── Call summaries for realistic call logs ─────────────────────────────
const callSummaries = [
  { summary: 'Customer called to book an oil change and tire rotation. Booked for Monday morning.', sentiment: 'positive', intent: 'book_appointment', outcome: 'booked', dur: 187 },
  { summary: 'Called about a grinding noise when braking. Booked brake pad replacement.', sentiment: 'neutral', intent: 'book_appointment', outcome: 'booked', dur: 243 },
  { summary: 'Customer requested an oil change. Mentioned the truck has been running rough.', sentiment: 'neutral', intent: 'book_appointment', outcome: 'booked', dur: 156 },
  { summary: 'Check engine light came on yesterday. Booked diagnostic appointment.', sentiment: 'negative', intent: 'book_appointment', outcome: 'booked', dur: 198 },
  { summary: 'Wants to swap winter tires. Booked for Monday afternoon.', sentiment: 'positive', intent: 'book_appointment', outcome: 'booked', dur: 134 },
  { summary: 'Oil change and cabin filter. Customer mentioned the air smells musty.', sentiment: 'neutral', intent: 'book_appointment', outcome: 'booked', dur: 212 },
  { summary: 'Called about alignment. Car pulling to the right. Booked Tuesday.', sentiment: 'neutral', intent: 'book_appointment', outcome: 'booked', dur: 167 },
  { summary: 'Wants a full inspection before a road trip next week.', sentiment: 'positive', intent: 'book_appointment', outcome: 'booked', dur: 145 },
  { summary: 'Coolant leak suspected. Also needs new wipers. Booked for Tuesday.', sentiment: 'neutral', intent: 'book_appointment', outcome: 'booked', dur: 278 },
  { summary: 'Car won\'t start — thinks it\'s the battery. Booked same-day replacement.', sentiment: 'negative', intent: 'book_appointment', outcome: 'booked', dur: 156 },
  { summary: 'Oil change and tire rotation for the RAM. Regular maintenance.', sentiment: 'positive', intent: 'book_appointment', outcome: 'booked', dur: 123 },
  { summary: 'Needs safety inspection for ownership transfer.', sentiment: 'neutral', intent: 'book_appointment', outcome: 'booked', dur: 98 },
  { summary: 'Brake noise and wants full brake job. Booked for Wednesday.', sentiment: 'neutral', intent: 'book_appointment', outcome: 'booked', dur: 234 },
  { summary: 'Quick oil change. In and out. Booked Wednesday afternoon.', sentiment: 'positive', intent: 'book_appointment', outcome: 'booked', dur: 89 },
  { summary: 'Check engine light on again. Customer frustrated — second time this month.', sentiment: 'negative', intent: 'book_appointment', outcome: 'booked', dur: 312 },
  { summary: 'Oil change and cabin filter for the Lexus. First visit.', sentiment: 'positive', intent: 'book_appointment', outcome: 'booked', dur: 178 },
  { summary: 'Tire rotation before a long drive this weekend.', sentiment: 'positive', intent: 'book_appointment', outcome: 'booked', dur: 112 },
  { summary: 'Alignment and winter tire swap. Booked for Thursday morning.', sentiment: 'positive', intent: 'book_appointment', outcome: 'booked', dur: 203 },
];

// ── Extra inquiry/non-booking calls ───────────────────────────────────
const extraCalls = [
  { phone: '+14165559020', name: 'Brian', date: '2026-03-02', time: '11:15', summary: 'Called to ask about pricing for a transmission flush. Said he\'d call back.', sentiment: 'neutral', intent: 'inquiry', outcome: 'inquiry', dur: 67 },
  { phone: '+14165559021', name: 'Laura', date: '2026-03-03', time: '08:45', summary: 'Asked if we do tire installations for tires purchased elsewhere. Confirmed yes. Will call to book.', sentiment: 'positive', intent: 'inquiry', outcome: 'inquiry', dur: 94 },
  { phone: '+14165559022', name: 'Unknown', date: '2026-03-03', time: '15:30', summary: 'Wrong number. Caller was looking for a body shop.', sentiment: 'neutral', intent: 'other', outcome: 'wrong_number', dur: 23 },
  { phone: '+14165559023', name: 'Phil', date: '2026-03-04', time: '12:00', summary: 'Called to check on repair status for his wife\'s car. Transferred to service advisor.', sentiment: 'neutral', intent: 'inquiry', outcome: 'transferred', dur: 145 },
  { phone: '+14165559024', name: 'Maria', date: '2026-03-05', time: '07:15', summary: 'Asked about the AI system. Very impressed. Wants to learn more for her own business. Lead captured.', sentiment: 'positive', intent: 'other', outcome: 'inquiry', dur: 189 },
];

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('Looking up services...');
  const { data: allServices } = await supabase
    .from('services')
    .select('id, name, price_min, duration_minutes, required_bay_type')
    .in('name', serviceNames);

  const svcMap = Object.fromEntries(allServices.map(s => [s.name, s]));

  // Look up bays
  const { data: bays } = await supabase.from('service_bays').select('id, bay_type');
  const baysByType = {};
  for (const b of bays) {
    if (!baysByType[b.bay_type]) baysByType[b.bay_type] = [];
    baysByType[b.bay_type].push(b.id);
  }

  console.log('Creating customers and vehicles...');
  const customerRecords = [];

  for (const c of customers) {
    const { data: cust } = await supabase
      .from('customers')
      .insert({ phone: c.phone, first_name: c.first_name, last_name: c.last_name, total_visits: Math.floor(Math.random() * 8) + 1 })
      .select('id')
      .single();

    const { data: veh } = await supabase
      .from('vehicles')
      .insert({ customer_id: cust.id, year: c.vehicle.year, make: c.vehicle.make, model: c.vehicle.model, color: c.vehicle.color, mileage: c.vehicle.mileage, is_primary: true })
      .select('id')
      .single();

    customerRecords.push({ ...c, customerId: cust.id, vehicleId: veh.id });
  }

  console.log(`Created ${customerRecords.length} customers with vehicles.`);

  console.log('Creating appointments, call logs, and SMS logs...');
  let apptCount = 0;
  let callCount = 0;

  for (let i = 0; i < appointments.length; i++) {
    const a = appointments[i];
    const cust = customerRecords[a.custIdx];
    const svcs = a.services.map(n => svcMap[n]);
    const totalDuration = svcs.reduce((sum, s) => sum + s.duration_minutes, 0);
    const totalPrice = svcs.reduce((sum, s) => sum + s.price_min, 0);

    // Pick a bay based on the first service's requirement
    const bayType = svcs[0].required_bay_type || 'general_service';
    const bayPool = baysByType[bayType] || baysByType['general_service'];
    const bayId = bayPool[apptCount % bayPool.length];

    const apptRow = {
      customer_id: cust.customerId,
      vehicle_id: cust.vehicleId,
      scheduled_date: a.date,
      scheduled_time: a.time,
      estimated_duration_minutes: totalDuration,
      bay_id: bayId,
      status: a.status,
      created_by: a.created_by,
      quoted_total: totalPrice,
      confirmation_sent_at: `${a.date}T${a.time}:00Z`,
    };

    if (['completed'].includes(a.status)) {
      apptRow.checked_in_at = `${a.date}T${a.time}:00Z`;
      const startH = parseInt(a.time.split(':')[0]);
      const startM = parseInt(a.time.split(':')[1]) + 5;
      apptRow.started_at = `${a.date}T${String(startH).padStart(2,'0')}:${String(startM).padStart(2,'0')}:00Z`;
      const endM = parseInt(a.time.split(':')[1]) + totalDuration;
      const endH = startH + Math.floor(endM / 60);
      apptRow.completed_at = `${a.date}T${String(endH).padStart(2,'0')}:${String(endM % 60).padStart(2,'0')}:00Z`;
      apptRow.final_total = totalPrice;
    }
    if (a.status === 'in_progress') {
      apptRow.checked_in_at = `${a.date}T${a.time}:00Z`;
      apptRow.started_at = `${a.date}T${a.time}:00Z`;
    }
    if (a.status === 'checked_in') {
      apptRow.checked_in_at = `${a.date}T${a.time}:00Z`;
    }

    const { data: appt } = await supabase.from('appointments').insert(apptRow).select('id').single();

    // Insert appointment_services
    for (const svc of svcs) {
      await supabase.from('appointment_services').insert({
        appointment_id: appt.id,
        service_id: svc.id,
        service_name: svc.name,
        quoted_price: svc.price_min,
        duration_minutes: svc.duration_minutes,
      });
    }

    // Create a call log for ai_agent bookings
    if (a.created_by === 'ai_agent') {
      const cs = callSummaries[i];
      const callStartH = parseInt(a.time.split(':')[0]);
      const callStartM = parseInt(a.time.split(':')[1]) - (Math.floor(Math.random() * 30) + 30); // call happened 30-60 min before appt time, roughly previous day
      const callDate = a.date; // simplify — call same day or day before
      const callStart = new Date(`${callDate}T${String(Math.max(7, callStartH - 1)).padStart(2,'0')}:${String(Math.abs(callStartM + 60) % 60).padStart(2,'0')}:00Z`);
      const callEnd = new Date(callStart.getTime() + cs.dur * 1000);

      await supabase.from('call_logs').insert({
        phone_number: cust.phone,
        phone_normalized: cust.phone,
        customer_id: cust.customerId,
        direction: 'inbound',
        started_at: callStart.toISOString(),
        ended_at: callEnd.toISOString(),
        duration_seconds: cs.dur,
        outcome: cs.outcome,
        appointment_id: appt.id,
        transcript_summary: cs.summary,
        sentiment: cs.sentiment,
        intent_detected: cs.intent,
        services_discussed: a.services,
      });
      callCount++;
    }

    // SMS confirmation log
    const vehicleDesc = `${cust.vehicle.year} ${cust.vehicle.make} ${cust.vehicle.model}`;
    await supabase.from('sms_logs').insert({
      to_phone: cust.phone,
      from_phone: '+16473711990',
      message_body: `Hi ${cust.first_name}, here is a quick confirmation for your records:\n\n${a.services.join(', ')}\n${vehicleDesc}\n${a.date} at ${a.time}\n1250 Industrial Boulevard, Springfield\n\nPowered by Nucleus AI | nucleus.com\n\n- Amber`,
      message_type: 'confirmation',
      status: 'delivered',
      customer_id: cust.customerId,
      appointment_id: appt.id,
      direction: 'outbound',
    });

    apptCount++;
  }

  // Extra non-booking calls
  for (const ec of extraCalls) {
    const callStart = new Date(`${ec.date}T${ec.time}:00Z`);
    const callEnd = new Date(callStart.getTime() + ec.dur * 1000);

    await supabase.from('call_logs').insert({
      phone_number: ec.phone,
      phone_normalized: ec.phone,
      direction: 'inbound',
      started_at: callStart.toISOString(),
      ended_at: callEnd.toISOString(),
      duration_seconds: ec.dur,
      outcome: ec.outcome,
      transcript_summary: ec.summary,
      sentiment: ec.sentiment,
      intent_detected: ec.intent,
    });
    callCount++;
  }

  console.log(`\nDone! Created:`);
  console.log(`  ${customerRecords.length} customers with vehicles`);
  console.log(`  ${apptCount} appointments`);
  console.log(`  ${callCount} call logs`);
  console.log(`  ${apptCount} SMS confirmation logs`);
}

main().catch(err => { console.error(err); process.exit(1); });
