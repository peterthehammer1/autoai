import { createClient } from '@supabase/supabase-js';
import { format, subDays, addDays, subHours } from 'date-fns';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Names for new customers
const firstNames = [
  'Marcus', 'Elena', 'Trevor', 'Sophia', 'Brandon', 'Olivia', 'Derek', 'Isabella', 'Tyler', 'Ava',
  'Connor', 'Mia', 'Justin', 'Charlotte', 'Ryan', 'Amelia', 'Nathan', 'Harper', 'Zachary', 'Evelyn',
  'Aaron', 'Abigail', 'Ethan', 'Emma', 'Lucas'
];

const lastNames = [
  'Patterson', 'Chen', 'O\'Brien', 'Kim', 'Patel', 'Murphy', 'Singh', 'Wong', 'Campbell', 'Brooks',
  'Howard', 'Foster', 'Barnes', 'Russell', 'Griffin', 'Hayes', 'Coleman', 'Jenkins', 'Perry', 'Powell',
  'Long', 'Butler', 'Sanders', 'Price', 'Bennett'
];

const vehicles = [
  { make: 'Toyota', model: 'Camry', years: [2020, 2021, 2022, 2023] },
  { make: 'Honda', model: 'Accord', years: [2019, 2020, 2021, 2022] },
  { make: 'Ford', model: 'F-150', years: [2020, 2021, 2022] },
  { make: 'Chevrolet', model: 'Silverado', years: [2019, 2020, 2021] },
  { make: 'BMW', model: '5 Series', years: [2020, 2021, 2022] },
  { make: 'Mercedes-Benz', model: 'E-Class', years: [2020, 2021, 2022] },
  { make: 'Audi', model: 'A6', years: [2020, 2021, 2022] },
  { make: 'Lexus', model: 'ES 350', years: [2019, 2020, 2021] },
  { make: 'Tesla', model: 'Model 3', years: [2021, 2022, 2023] },
  { make: 'Subaru', model: 'Outback', years: [2020, 2021, 2022] },
];

const services = [
  { id: '5d73eb51-574b-4f0d-9511-842888621a7a', name: 'Conventional Oil Change', price: 3999 },
  { id: 'eb613e52-f566-414a-9be0-d6d2f2f20cd9', name: 'Full Synthetic Oil Change', price: 7999 },
  { id: '284146f6-573e-4161-bbc9-4efd420083ce', name: 'Tire Rotation', price: 2999 },
  { id: 'ef5ca1d8-73ae-4a64-ae45-4d06987ac397', name: 'Tire Rotation & Balance', price: 5999 },
  { id: '15ecaeca-f7fc-4bd5-b312-13e467c065e0', name: 'Wheel Alignment - 4 Wheel', price: 9999 },
  { id: '3aada59b-dfaf-430e-a36d-508c3415887d', name: 'Front Brake Pads', price: 14999 },
  { id: '84187bb0-3158-4d68-a5fe-5bfeaae8921d', name: 'Complete Brake Service', price: 59999 },
];

const areaCodes = ['416', '647', '905', '289', '519', '613', '705', '226', '343', '437'];
const colors = ['Black', 'White', 'Silver', 'Gray', 'Blue', 'Red', 'Pearl White', 'Midnight Blue'];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function generatePhone() {
  return `+1${randomItem(areaCodes)}${randomInt(200, 999)}${randomInt(1000, 9999)}`;
}
function generateEmail(first, last) {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
  return `${first.toLowerCase()}.${last.toLowerCase().replace("'", "")}@${randomItem(domains)}`;
}

// Full transcript templates for different call scenarios
const transcriptTemplates = {
  booking_oil_change: (name, vehicle, time, day) => `Agent: Good afternoon! Thanks for calling Premier Auto Service, this is Amber. How can I help you today?

Customer: Hi, I need to get an oil change for my car.

Agent: Absolutely, I can help with that! What vehicle will you be bringing in?

Customer: It's a ${vehicle}.

Agent: Great choice! And is this for conventional, synthetic blend, or full synthetic oil?

Customer: Full synthetic, please.

Agent: Perfect. When works best for you?

Customer: Do you have anything ${day}?

Agent: Let me check... I have ${time} available ${day}. Would that work?

Customer: That's perfect.

Agent: Wonderful! And can I get your name for the appointment?

Customer: ${name}.

Agent: Great, ${name.split(' ')[0]}! You're all set for ${day} at ${time} for a full synthetic oil change on your ${vehicle}. We'll send you a confirmation text with all the details. Is there anything else I can help with?

Customer: No, that's everything. Thank you!

Agent: Thanks for calling Premier Auto Service! See you ${day}!`,

  booking_brakes: (name, vehicle, time, day) => `Agent: Good morning! Thanks for calling Premier Auto Service, this is Amber. How can I help you today?

Customer: Hi, my brakes have been making a squeaking noise. I think I need them looked at.

Agent: Oh, I'm sorry to hear that! Squeaky brakes can definitely be concerning. We should get that checked out. What vehicle are you driving?

Customer: I have a ${vehicle}.

Agent: Got it. We can do a brake inspection to see what's going on - it might just need new pads, or it could be the rotors too. Would you like to schedule that?

Customer: Yes, please. What do you have available?

Agent: I have an opening ${day} at ${time}. Does that work for your schedule?

Customer: ${day} works. Let's do it.

Agent: Perfect! And your name?

Customer: ${name}.

Agent: Alright ${name.split(' ')[0]}, you're booked for ${day} at ${time} for a brake inspection on your ${vehicle}. Our technicians will take a look and let you know exactly what's needed. You'll get a text confirmation shortly. Anything else?

Customer: That's all. Thanks so much!

Agent: You're welcome! Drive safe and we'll see you ${day}!`,

  booking_tires: (name, vehicle, time, day) => `Agent: Good afternoon! Thanks for calling Premier Auto Service, this is Amber. How can I help you?

Customer: Yeah, I need to get my tires rotated. It's been a while.

Agent: No problem! Regular rotation is important for even wear. What are you driving?

Customer: ${vehicle}.

Agent: Nice! We can get you in for a tire rotation. Would you also like us to balance them while we're at it? It's often recommended to do both together.

Customer: Sure, might as well do both.

Agent: Great call. That'll help with a smoother ride too. When would you like to come in?

Customer: What's available ${day}?

Agent: I have ${time} open ${day}. Would that work?

Customer: Perfect timing. Book it.

Agent: Done! And your name?

Customer: ${name}.

Agent: Excellent, ${name.split(' ')[0]}! You're confirmed for ${day} at ${time} for tire rotation and balance on your ${vehicle}. We'll text you the details. Anything else I can help with?

Customer: Nope, I'm good. Thanks!

Agent: Thanks for calling! See you ${day}!`,

  inquiry_pricing: (name, vehicle) => `Agent: Good morning! Thanks for calling Premier Auto Service, this is Amber. How can I help you today?

Customer: Hi, I'm just calling to get some pricing information.

Agent: Of course! What services are you interested in?

Customer: How much is an oil change? And do you do alignments?

Agent: Great questions! For oil changes, we have conventional starting at $39.99, synthetic blend at $59.99, and full synthetic at $79.99. For wheel alignment, a 4-wheel alignment is $99.99.

Customer: Okay, that's reasonable. What about brake work?

Agent: For brakes, a basic inspection is free with any service. Front or rear brake pads are $149.99 each, and if you need pads plus rotors, that's $349.99 per axle.

Customer: Got it. I drive a ${vehicle} - does that change anything?

Agent: For a ${vehicle}, those prices should be accurate. Some European vehicles have slightly higher parts costs, but we'll always give you an exact quote before any work.

Customer: Good to know. I might call back to schedule something.

Agent: Sounds good! We're here Monday through Friday 7 to 6, Saturday 8 to 4. Is there anything else I can help with?

Customer: No, that's helpful. Thanks!

Agent: You're welcome! Thanks for calling Premier Auto Service. Have a great day!`,

  rescheduling: (name, vehicle, time, day) => `Agent: Good afternoon! Thanks for calling Premier Auto Service, this is Amber. How can I help you?

Customer: Hi, I have an appointment scheduled but I need to change it.

Agent: No problem at all! Let me pull that up. Can I get your name or phone number?

Customer: ${name}.

Agent: Got it, ${name.split(' ')[0]}. I see your appointment here. When would you like to reschedule to?

Customer: Do you have anything ${day}?

Agent: Let me check ${day}... I have ${time} available. Would that work better?

Customer: Yes, that's much better for me.

Agent: Perfect! I've moved your appointment to ${day} at ${time}. Everything else stays the same - we'll see you then with your ${vehicle}. I'll send you an updated confirmation text.

Customer: Thank you so much for being flexible!

Agent: Of course! Life happens. We'll see you ${day}. Anything else I can help with?

Customer: That's all. Thanks again!

Agent: You're welcome! Take care!`,
};

async function seedMoreData() {
  console.log('Adding more demo data...\n');
  
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd');

  // 1. Create 25 new customers
  console.log('Creating 25 new customers...');
  const newCustomers = [];
  for (let i = 0; i < 25; i++) {
    const firstName = firstNames[i];
    const lastName = lastNames[i];
    const phone = generatePhone();
    
    newCustomers.push({
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      phone_normalized: phone,
      email: generateEmail(firstName, lastName),
      total_visits: randomInt(2, 15),
      created_at: subDays(today, randomInt(30, 365)).toISOString(),
    });
  }

  const { data: insertedCustomers, error: custError } = await supabase
    .from('customers')
    .insert(newCustomers)
    .select('id, first_name, last_name, phone');

  if (custError) {
    console.error('Error:', custError);
    return;
  }
  console.log(`✓ Created ${insertedCustomers.length} customers\n`);

  // 2. Create vehicles for new customers
  console.log('Creating vehicles...');
  const vehicleData = [];
  for (const customer of insertedCustomers) {
    const vehicle = randomItem(vehicles);
    const year = randomItem(vehicle.years);
    vehicleData.push({
      customer_id: customer.id,
      year: year,
      make: vehicle.make,
      model: vehicle.model,
      color: randomItem(colors),
      mileage: randomInt(15000, 85000),
      is_primary: true,
    });
  }

  const { data: insertedVehicles, error: vehError } = await supabase
    .from('vehicles')
    .insert(vehicleData)
    .select('id, customer_id, year, make, model');

  if (vehError) {
    console.error('Error:', vehError);
    return;
  }
  console.log(`✓ Created ${insertedVehicles.length} vehicles\n`);

  // Create customer-vehicle map
  const customerVehicleMap = {};
  for (const v of insertedVehicles) {
    customerVehicleMap[v.customer_id] = v;
  }

  // 3. Create appointments for TODAY
  console.log('Creating appointments for today...');
  const todayTimes = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];
  const todayAppts = [];
  
  for (let i = 0; i < 12; i++) {
    const customer = insertedCustomers[i];
    const vehicle = customerVehicleMap[customer.id];
    const service = randomItem(services);
    
    todayAppts.push({
      customer_id: customer.id,
      vehicle_id: vehicle.id,
      scheduled_date: todayStr,
      scheduled_time: todayTimes[i],
      estimated_duration_minutes: randomInt(30, 90),
      status: i < 4 ? 'completed' : i < 8 ? 'in_progress' : 'confirmed',
      created_by: 'ai_agent',
      quoted_total: service.price,
    });
  }

  // 4. Create appointments for TOMORROW
  console.log('Creating appointments for tomorrow...');
  const tomorrowAppts = [];
  
  for (let i = 12; i < 22; i++) {
    const customer = insertedCustomers[i];
    const vehicle = customerVehicleMap[customer.id];
    const service = randomItem(services);
    
    tomorrowAppts.push({
      customer_id: customer.id,
      vehicle_id: vehicle.id,
      scheduled_date: tomorrowStr,
      scheduled_time: todayTimes[i - 12],
      estimated_duration_minutes: randomInt(30, 90),
      status: Math.random() > 0.3 ? 'confirmed' : 'scheduled',
      created_by: 'ai_agent',
      quoted_total: service.price,
    });
  }

  const allAppts = [...todayAppts, ...tomorrowAppts];
  const { data: insertedAppts, error: apptError } = await supabase
    .from('appointments')
    .insert(allAppts)
    .select('id, customer_id');

  if (apptError) {
    console.error('Error:', apptError);
    return;
  }
  console.log(`✓ Created ${insertedAppts.length} appointments (${todayAppts.length} today, ${tomorrowAppts.length} tomorrow)\n`);

  // 5. Create appointment services
  const apptServices = [];
  for (const appt of insertedAppts) {
    const service = randomItem(services);
    apptServices.push({
      appointment_id: appt.id,
      service_id: service.id,
      service_name: service.name,
      quoted_price: service.price,
    });
  }

  await supabase.from('appointment_services').insert(apptServices);
  console.log(`✓ Created ${apptServices.length} appointment services\n`);

  // 6. Create 200+ call logs for a thriving clinic
  console.log('Creating 200+ call logs...');
  const callLogs = [];
  const outcomes = ['booked', 'booked', 'booked', 'booked', 'booked', 'inquiry', 'inquiry', 'rescheduled', 'cancelled', 'abandoned'];
  const sentiments = ['positive', 'positive', 'positive', 'positive', 'neutral', 'neutral', 'negative'];

  // Get all customers for call logs
  const { data: allCustomers } = await supabase
    .from('customers')
    .select('id, first_name, last_name, phone')
    .limit(75);

  for (let i = 0; i < 200; i++) {
    const customer = randomItem(allCustomers);
    const daysAgo = randomInt(0, 45);
    const callDate = subDays(today, daysAgo);
    const hour = randomInt(8, 17);
    const minute = randomInt(0, 59);
    const duration = randomInt(30, 240);
    const outcome = randomItem(outcomes);

    callLogs.push({
      phone_number: customer.phone,
      phone_normalized: customer.phone,
      customer_id: customer.id,
      direction: 'inbound',
      started_at: new Date(callDate.getFullYear(), callDate.getMonth(), callDate.getDate(), hour, minute, 0).toISOString(),
      ended_at: new Date(callDate.getFullYear(), callDate.getMonth(), callDate.getDate(), hour, minute + Math.floor(duration / 60), duration % 60).toISOString(),
      duration_seconds: duration,
      outcome: outcome,
      sentiment: randomItem(sentiments),
      intent_detected: outcome === 'booked' ? 'book_appointment' : outcome === 'inquiry' ? 'general_inquiry' : 'other',
      agent_id: 'agent_98c68bf49ac79b86c517c5c2ba',
      retell_call_id: `call_demo_${Date.now()}_${i}`,
    });
  }

  const { error: callError } = await supabase.from('call_logs').insert(callLogs);
  if (callError) console.error('Call logs error:', callError);
  console.log(`✓ Created ${callLogs.length} call logs\n`);

  // 7. Create 25 call logs with FULL transcripts
  console.log('Creating 25 detailed call logs with full transcripts...');
  const detailedCalls = [];
  const days = ['today', 'tomorrow', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const times = ['9 AM', '10 AM', '10:30 AM', '11 AM', '1 PM', '2 PM', '2:30 PM', '3 PM', '4 PM'];

  for (let i = 0; i < 25; i++) {
    const customer = insertedCustomers[i % insertedCustomers.length];
    const vehicle = customerVehicleMap[customer.id];
    const vehicleStr = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    const customerName = `${customer.first_name} ${customer.last_name}`;
    const callTime = randomItem(times);
    const callDay = randomItem(days);
    
    let transcript, outcome, intent, summary;
    const transcriptType = randomInt(1, 5);
    
    switch (transcriptType) {
      case 1:
        transcript = transcriptTemplates.booking_oil_change(customerName, vehicleStr, callTime, callDay);
        outcome = 'booked';
        intent = 'book_appointment';
        summary = `Customer ${customer.first_name} called to book a full synthetic oil change for their ${vehicleStr}. Appointment scheduled for ${callDay} at ${callTime}.`;
        break;
      case 2:
        transcript = transcriptTemplates.booking_brakes(customerName, vehicleStr, callTime, callDay);
        outcome = 'booked';
        intent = 'book_appointment';
        summary = `Customer ${customer.first_name} reported squeaky brakes on their ${vehicleStr}. Scheduled brake inspection for ${callDay} at ${callTime}.`;
        break;
      case 3:
        transcript = transcriptTemplates.booking_tires(customerName, vehicleStr, callTime, callDay);
        outcome = 'booked';
        intent = 'book_appointment';
        summary = `Customer ${customer.first_name} booked tire rotation and balance for their ${vehicleStr}. Appointment set for ${callDay} at ${callTime}.`;
        break;
      case 4:
        transcript = transcriptTemplates.inquiry_pricing(customerName, vehicleStr);
        outcome = 'inquiry';
        intent = 'general_inquiry';
        summary = `Customer ${customer.first_name} called to inquire about pricing for oil changes, alignments, and brake work. No appointment booked but may call back.`;
        break;
      case 5:
        transcript = transcriptTemplates.rescheduling(customerName, vehicleStr, callTime, callDay);
        outcome = 'rescheduled';
        intent = 'modify_appointment';
        summary = `Customer ${customer.first_name} called to reschedule their existing appointment. New appointment set for ${callDay} at ${callTime}.`;
        break;
    }

    const hoursAgo = randomInt(1, 72);
    const callDate = subHours(today, hoursAgo);
    const duration = randomInt(90, 180);

    detailedCalls.push({
      phone_number: customer.phone,
      phone_normalized: customer.phone,
      customer_id: customer.id,
      direction: 'inbound',
      started_at: callDate.toISOString(),
      ended_at: new Date(callDate.getTime() + duration * 1000).toISOString(),
      duration_seconds: duration,
      outcome: outcome,
      sentiment: 'positive',
      intent_detected: intent,
      transcript: transcript,
      transcript_summary: summary,
      services_discussed: transcriptType <= 3 ? ['Oil Change', 'Brake Service', 'Tire Rotation'][transcriptType - 1] : 'Pricing inquiry',
      agent_id: 'agent_98c68bf49ac79b86c517c5c2ba',
      retell_call_id: `call_detailed_${Date.now()}_${i}`,
    });
  }

  const { error: detailedError } = await supabase.from('call_logs').insert(detailedCalls);
  if (detailedError) console.error('Detailed calls error:', detailedError);
  console.log(`✓ Created ${detailedCalls.length} calls with full transcripts\n`);

  // Summary
  console.log('═'.repeat(50));
  console.log('ADDITIONAL DATA COMPLETE!');
  console.log('═'.repeat(50));
  console.log(`New Customers:         25`);
  console.log(`New Vehicles:          25`);
  console.log(`Today's Appointments:  12`);
  console.log(`Tomorrow's Appointments: 10`);
  console.log(`Call Logs Added:       225 (200 basic + 25 with transcripts)`);
  console.log('═'.repeat(50));
}

seedMoreData().catch(console.error);
