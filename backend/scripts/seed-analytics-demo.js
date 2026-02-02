import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { format, subDays, addHours, setHours, setMinutes } from 'date-fns';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Demo customer names
const firstNames = ['Michael', 'Jennifer', 'David', 'Sarah', 'James', 'Emily', 'Robert', 'Jessica', 'William', 'Ashley', 'Christopher', 'Amanda', 'Matthew', 'Stephanie', 'Daniel', 'Nicole', 'Andrew', 'Melissa', 'Joshua', 'Elizabeth', 'Brandon', 'Heather', 'Ryan', 'Michelle', 'Kevin', 'Kimberly', 'Brian', 'Laura', 'Jason', 'Rebecca'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'];

// Vehicle data
const vehicles = [
  { year: 2022, make: 'Toyota', model: 'Camry' },
  { year: 2021, make: 'Honda', model: 'Accord' },
  { year: 2023, make: 'Ford', model: 'F-150' },
  { year: 2020, make: 'Chevrolet', model: 'Silverado' },
  { year: 2022, make: 'Tesla', model: 'Model 3' },
  { year: 2021, make: 'BMW', model: '3 Series' },
  { year: 2019, make: 'Mercedes', model: 'C-Class' },
  { year: 2022, make: 'Hyundai', model: 'Sonata' },
  { year: 2020, make: 'Nissan', model: 'Altima' },
  { year: 2023, make: 'Mazda', model: 'CX-5' },
  { year: 2021, make: 'Subaru', model: 'Outback' },
  { year: 2022, make: 'Volkswagen', model: 'Jetta' },
  { year: 2020, make: 'Jeep', model: 'Grand Cherokee' },
  { year: 2019, make: 'Audi', model: 'A4' },
  { year: 2023, make: 'Kia', model: 'Sportage' },
];

// Call outcomes with weights
const callOutcomes = [
  { outcome: 'booked', weight: 45 },
  { outcome: 'inquiry', weight: 25 },
  { outcome: 'completed', weight: 10 },
  { outcome: 'rescheduled', weight: 8 },
  { outcome: 'cancelled', weight: 5 },
  { outcome: 'transferred', weight: 4 },
  { outcome: 'abandoned', weight: 3 },
];

// Sentiments with weights
const sentiments = [
  { sentiment: 'positive', weight: 55 },
  { sentiment: 'neutral', weight: 35 },
  { sentiment: 'negative', weight: 10 },
];

// Services with prices
const services = [
  { name: 'Full Synthetic Oil Change', price: 7999, duration: 30 },
  { name: 'Conventional Oil Change', price: 4999, duration: 25 },
  { name: 'Brake Inspection', price: 0, duration: 20 },
  { name: 'Brake Pad Replacement', price: 24999, duration: 90 },
  { name: 'Tire Rotation', price: 2999, duration: 30 },
  { name: 'Wheel Alignment', price: 8999, duration: 60 },
  { name: 'Battery Test & Replace', price: 15999, duration: 30 },
  { name: 'AC Service', price: 12999, duration: 60 },
  { name: 'Transmission Fluid Change', price: 17999, duration: 45 },
  { name: 'Coolant Flush', price: 9999, duration: 45 },
  { name: 'Spark Plug Replacement', price: 19999, duration: 60 },
  { name: 'Air Filter Replacement', price: 3999, duration: 15 },
  { name: 'Cabin Air Filter', price: 4999, duration: 15 },
  { name: 'Wiper Blade Replacement', price: 2999, duration: 10 },
  { name: 'Check Engine Light Diagnosis', price: 9999, duration: 45 },
];

// Transcript templates
const transcriptTemplates = {
  booked: (name, service, time) => `Agent: Thank you for calling Premier Auto Service. This is Amber, how can I help you today?
Customer: Hi, I need to schedule an appointment for ${service}.
Agent: Of course! I'd be happy to help you with that, ${name}. Let me check our availability.
Customer: Great, thank you.
Agent: I have an opening at ${time}. Would that work for you?
Customer: Yes, that's perfect.
Agent: Wonderful! I've got you scheduled. You'll receive a confirmation text shortly. Is there anything else I can help you with?
Customer: No, that's all. Thank you!
Agent: You're welcome! We'll see you soon. Have a great day!`,
  
  inquiry: (name, service) => `Agent: Thank you for calling Premier Auto Service. This is Amber, how can I help you today?
Customer: Hi, I'm just calling to get some pricing information.
Agent: Of course! I'd be happy to help. What service are you interested in?
Customer: I need ${service}. How much does that cost?
Agent: Great question! Our ${service} starts at a competitive price. Would you like me to schedule an appointment?
Customer: Not right now, I'm just comparing prices. I might call back.
Agent: No problem at all! Feel free to call us anytime. Have a great day!`,
};

function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[0];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPhone() {
  return `+1519${randomInt(100, 999)}${randomInt(1000, 9999)}`;
}

async function seedAnalyticsData() {
  console.log('🌱 Seeding analytics demo data...\n');

  const today = new Date();
  const daysToSeed = 45; // Seed 45 days of data

  // Get existing services from DB
  const { data: dbServices } = await supabase
    .from('services')
    .select('id, name, price_min, duration_minutes')
    .eq('is_active', true);

  const serviceMap = {};
  for (const s of dbServices || []) {
    serviceMap[s.name] = s;
  }

  // Get existing bays
  const { data: bays } = await supabase
    .from('service_bays')
    .select('id')
    .eq('is_active', true);
  const bayIds = bays?.map(b => b.id) || [];

  let customersCreated = 0;
  let vehiclesCreated = 0;
  let appointmentsCreated = 0;
  let callLogsCreated = 0;
  let smsLogsCreated = 0;

  // Create customers and their data
  const numCustomers = 50;
  console.log(`Creating ${numCustomers} demo customers with history...`);

  for (let i = 0; i < numCustomers; i++) {
    const firstName = firstNames[randomInt(0, firstNames.length - 1)];
    const lastName = lastNames[randomInt(0, lastNames.length - 1)];
    const phone = randomPhone();
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 99)}@example.com`;
    
    // Random customer age (when they became a customer)
    const customerAgeDays = randomInt(10, daysToSeed);
    const createdAt = subDays(today, customerAgeDays);

    // Create customer
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .insert({
        first_name: firstName,
        last_name: lastName,
        phone,
        email,
        created_at: createdAt.toISOString(),
        total_visits: 0,
        total_spent: 0,
      })
      .select()
      .single();

    if (custErr) {
      console.error('Error creating customer:', custErr.message);
      continue;
    }
    customersCreated++;

    // Create 1-3 vehicles for customer
    const numVehicles = randomInt(1, 2);
    const customerVehicles = [];
    
    for (let v = 0; v < numVehicles; v++) {
      const vehicleData = vehicles[randomInt(0, vehicles.length - 1)];
      const { data: vehicle, error: vehErr } = await supabase
        .from('vehicles')
        .insert({
          customer_id: customer.id,
          year: vehicleData.year,
          make: vehicleData.make,
          model: vehicleData.model,
          mileage: randomInt(15000, 120000),
          is_primary: v === 0,
        })
        .select()
        .single();

      if (!vehErr && vehicle) {
        customerVehicles.push(vehicle);
        vehiclesCreated++;
      }
    }

    // Create 0-5 appointments for this customer
    const numAppointments = randomInt(0, 5);
    let totalSpent = 0;
    let totalVisits = 0;
    let lastVisitDate = null;

    for (let a = 0; a < numAppointments; a++) {
      const daysAgo = randomInt(1, customerAgeDays);
      const appointmentDate = subDays(today, daysAgo);
      const dateStr = format(appointmentDate, 'yyyy-MM-dd');
      const hour = randomInt(8, 16);
      const minute = [0, 30][randomInt(0, 1)];
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

      // Random service
      const service = services[randomInt(0, services.length - 1)];
      const dbService = serviceMap[service.name];
      const price = dbService?.price_min || service.price;

      // Status based on date
      let status;
      if (daysAgo === 0) {
        status = ['scheduled', 'confirmed', 'checked_in', 'in_progress'][randomInt(0, 3)];
      } else if (daysAgo <= 1) {
        status = ['completed', 'scheduled', 'confirmed'][randomInt(0, 2)];
      } else {
        status = Math.random() > 0.1 ? 'completed' : 'cancelled';
      }

      const vehicle = customerVehicles[randomInt(0, customerVehicles.length - 1)];

      const estimatedDuration = dbService?.duration_minutes || service.duration;
      const { data: appointment, error: aptErr } = await supabase
        .from('appointments')
        .insert({
          customer_id: customer.id,
          vehicle_id: vehicle?.id,
          scheduled_date: dateStr,
          scheduled_time: timeStr,
          estimated_duration_minutes: estimatedDuration,
          status,
          quoted_total: price,
          final_total: status === 'completed' ? price : null,
          created_by: Math.random() > 0.3 ? 'ai_agent' : 'dashboard',
          bay_id: bayIds.length > 0 ? bayIds[randomInt(0, bayIds.length - 1)] : null,
          created_at: subDays(appointmentDate, randomInt(0, 3)).toISOString(),
        })
        .select()
        .single();

      if (aptErr) {
        continue;
      }
      appointmentsCreated++;

      // Add appointment service
      if (appointment) {
        await supabase
          .from('appointment_services')
          .insert({
            appointment_id: appointment.id,
            service_id: dbService?.id,
            service_name: service.name,
            quoted_price: price,
            final_price: status === 'completed' ? price : null,
            duration_minutes: dbService?.duration_minutes || service.duration,
          });

        if (status === 'completed') {
          totalSpent += price;
          totalVisits++;
          if (!lastVisitDate || appointmentDate > new Date(lastVisitDate)) {
            lastVisitDate = dateStr;
          }
        }

        // Create SMS confirmation
        if (Math.random() > 0.2) {
          await supabase
            .from('sms_logs')
            .insert({
              customer_id: customer.id,
              appointment_id: appointment.id,
              to_phone: phone,
              from_phone: '+15198040969',
              message_type: 'confirmation',
              message_body: `Hi ${firstName}! Your appointment at Premier Auto Service is confirmed for ${format(appointmentDate, 'MMM d')} at ${hour > 12 ? hour - 12 : hour}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}. Reply CONFIRM to verify.`,
              status: 'delivered',
              created_at: subDays(appointmentDate, 1).toISOString(),
            });
          smsLogsCreated++;
        }
      }
    }

    // Update customer totals
    await supabase
      .from('customers')
      .update({
        total_visits: totalVisits,
        total_spent: totalSpent,
        last_visit_date: lastVisitDate,
      })
      .eq('id', customer.id);

    // Create call logs for this customer
    const numCalls = randomInt(1, 4);
    for (let c = 0; c < numCalls; c++) {
      const daysAgo = randomInt(0, customerAgeDays);
      const callDate = subDays(today, daysAgo);
      const hour = randomInt(8, 18);
      const startedAt = setMinutes(setHours(callDate, hour), randomInt(0, 59));
      const duration = randomInt(30, 300);
      const endedAt = addHours(startedAt, 0);
      endedAt.setSeconds(endedAt.getSeconds() + duration);

      const outcomeData = weightedRandom(callOutcomes);
      const sentimentData = weightedRandom(sentiments);
      const service = services[randomInt(0, services.length - 1)];

      const transcript = outcomeData.outcome === 'booked' 
        ? transcriptTemplates.booked(firstName, service.name, `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`)
        : transcriptTemplates.inquiry(firstName, service.name);

      const summary = outcomeData.outcome === 'booked'
        ? `Customer ${firstName} called to schedule ${service.name}. Appointment successfully booked.`
        : `Customer ${firstName} called to inquire about ${service.name} pricing. No appointment booked.`;

      await supabase
        .from('call_logs')
        .insert({
          customer_id: customer.id,
          phone_number: phone,
          phone_normalized: phone,
          direction: 'inbound',
          started_at: startedAt.toISOString(),
          ended_at: endedAt.toISOString(),
          duration_seconds: duration,
          outcome: outcomeData.outcome,
          sentiment: sentimentData.sentiment,
          transcript,
          transcript_summary: summary,
          intent_detected: outcomeData.outcome === 'booked' ? 'booking' : 'inquiry',
          services_discussed: [service.name],
          created_at: startedAt.toISOString(),
        });
      callLogsCreated++;
    }

    // Progress indicator
    if ((i + 1) % 10 === 0) {
      console.log(`  Created ${i + 1}/${numCustomers} customers...`);
    }
  }

  // Add some additional call logs without customers (new callers)
  console.log('\nCreating additional call logs from new callers...');
  for (let i = 0; i < 30; i++) {
    const daysAgo = randomInt(0, 14);
    const callDate = subDays(today, daysAgo);
    const hour = randomInt(8, 18);
    const startedAt = setMinutes(setHours(callDate, hour), randomInt(0, 59));
    const duration = randomInt(45, 180);

    const outcomeData = weightedRandom(callOutcomes);
    const sentimentData = weightedRandom(sentiments);

    await supabase
      .from('call_logs')
      .insert({
        phone_number: randomPhone(),
        direction: 'inbound',
        started_at: startedAt.toISOString(),
        duration_seconds: duration,
        outcome: outcomeData.outcome,
        sentiment: sentimentData.sentiment,
        transcript_summary: `New caller inquiry - ${outcomeData.outcome}`,
        intent_detected: outcomeData.outcome === 'booked' ? 'booking' : 'inquiry',
        created_at: startedAt.toISOString(),
      });
    callLogsCreated++;
  }

  console.log('\n✅ Demo data seeding complete!');
  console.log(`   Customers created: ${customersCreated}`);
  console.log(`   Vehicles created: ${vehiclesCreated}`);
  console.log(`   Appointments created: ${appointmentsCreated}`);
  console.log(`   Call logs created: ${callLogsCreated}`);
  console.log(`   SMS logs created: ${smsLogsCreated}`);
}

seedAnalyticsData().catch(console.error);
