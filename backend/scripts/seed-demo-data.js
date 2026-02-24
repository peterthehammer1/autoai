import { createClient } from '@supabase/supabase-js';
import { format, subDays, addDays, subMonths } from 'date-fns';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Realistic first names
const firstNames = [
  'James', 'Michael', 'Robert', 'David', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher', 'Daniel',
  'Matthew', 'Anthony', 'Mark', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian',
  'Jennifer', 'Elizabeth', 'Maria', 'Susan', 'Margaret', 'Dorothy', 'Lisa', 'Nancy', 'Karen', 'Betty',
  'Sarah', 'Jessica', 'Ashley', 'Emily', 'Amanda', 'Melissa', 'Stephanie', 'Nicole', 'Michelle', 'Angela',
  'Carlos', 'Juan', 'Miguel', 'Antonio', 'Francisco', 'Dmitri', 'Raj', 'Wei', 'Hiroshi', 'Ahmed'
];

// Realistic last names
const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
];

// Real vehicles by popularity
const vehicles = [
  { make: 'Toyota', model: 'Camry', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Toyota', model: 'RAV4', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Toyota', model: 'Corolla', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Toyota', model: 'Highlander', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Honda', model: 'Civic', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Honda', model: 'Accord', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Honda', model: 'CR-V', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Honda', model: 'Pilot', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Ford', model: 'F-150', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Ford', model: 'Explorer', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Ford', model: 'Escape', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Ford', model: 'Mustang', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Chevrolet', model: 'Silverado', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Chevrolet', model: 'Equinox', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Chevrolet', model: 'Malibu', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'BMW', model: '3 Series', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'BMW', model: 'X5', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Mercedes-Benz', model: 'C-Class', years: [2019, 2020, 2021, 2022] },
  { make: 'Mercedes-Benz', model: 'GLE', years: [2019, 2020, 2021, 2022] },
  { make: 'Audi', model: 'A4', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Audi', model: 'Q5', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Lexus', model: 'RX 350', years: [2019, 2020, 2021, 2022] },
  { make: 'Lexus', model: 'ES 350', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Nissan', model: 'Altima', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Nissan', model: 'Rogue', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Hyundai', model: 'Sonata', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Hyundai', model: 'Tucson', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Kia', model: 'Sorento', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Kia', model: 'Sportage', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Subaru', model: 'Outback', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Subaru', model: 'Forester', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Mazda', model: 'CX-5', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Mazda', model: 'Mazda3', years: [2019, 2020, 2021, 2022] },
  { make: 'Jeep', model: 'Grand Cherokee', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Jeep', model: 'Wrangler', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Ram', model: '1500', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'GMC', model: 'Sierra', years: [2019, 2020, 2021, 2022] },
  { make: 'Volkswagen', model: 'Jetta', years: [2019, 2020, 2021, 2022, 2023] },
  { make: 'Volkswagen', model: 'Tiguan', years: [2018, 2019, 2020, 2021, 2022] },
  { make: 'Acura', model: 'TLX', years: [2019, 2020, 2021, 2022] },
];

const colors = ['Black', 'White', 'Silver', 'Gray', 'Blue', 'Red', 'Green', 'Charcoal', 'Pearl White', 'Metallic Blue'];

// Service IDs (from your database)
const services = [
  { id: '5d73eb51-574b-4f0d-9511-842888621a7a', name: 'Conventional Oil Change', price: 3999 },
  { id: 'a478846c-8a32-4e6b-a2a0-65e862d8f8c4', name: 'Synthetic Blend Oil Change', price: 5999 },
  { id: 'eb613e52-f566-414a-9be0-d6d2f2f20cd9', name: 'Full Synthetic Oil Change', price: 7999 },
  { id: 'c600c82a-c0ff-481f-a350-e89f6792c412', name: 'Transmission Fluid Exchange', price: 19999 },
  { id: '3d600200-6934-4872-87bf-bcc3710588bd', name: 'Brake Fluid Flush', price: 12999 },
  { id: '284146f6-573e-4161-bbc9-4efd420083ce', name: 'Tire Rotation', price: 2999 },
  { id: 'ef5ca1d8-73ae-4a64-ae45-4d06987ac397', name: 'Tire Rotation & Balance', price: 5999 },
  { id: '15ecaeca-f7fc-4bd5-b312-13e467c065e0', name: 'Wheel Alignment - 4 Wheel', price: 9999 },
  { id: 'ade53b10-c8a0-4a5c-826d-1f4ae2ac27fc', name: 'Brake Inspection', price: 0 },
  { id: '3aada59b-dfaf-430e-a36d-508c3415887d', name: 'Front Brake Pads', price: 14999 },
  { id: '50af77db-c688-4905-ba75-3d33aa9dd0ff', name: 'Rear Brake Pads', price: 14999 },
  { id: 'a89dbd8d-227c-4b62-9ee7-cb2f19a3dce3', name: 'Front Brake Pads & Rotors', price: 34999 },
  { id: '84187bb0-3158-4d68-a5fe-5bfeaae8921d', name: 'Complete Brake Service', price: 59999 },
];

// Area codes for realistic phone numbers (various US/Canada regions)
const areaCodes = ['416', '647', '905', '289', '519', '613', '705', '807', '226', '343', '365', '437', '548', '579', '581', '587', '604', '778', '780', '825'];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone() {
  const areaCode = randomItem(areaCodes);
  const prefix = randomInt(200, 999);
  const line = randomInt(1000, 9999);
  return `+1${areaCode}${prefix}${line}`;
}

function generateEmail(firstName, lastName) {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
  const variations = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${randomInt(1, 99)}`,
    `${firstName[0].toLowerCase()}${lastName.toLowerCase()}`,
  ];
  return `${randomItem(variations)}@${randomItem(domains)}`;
}

function generateMileage(year) {
  const currentYear = 2026;
  const age = currentYear - year;
  const baseMileage = age * 12000; // ~12k miles per year
  return Math.round(baseMileage * (0.7 + Math.random() * 0.6)); // ±30% variation
}

async function seedData() {
  console.log('Starting demo data seed...\n');
  
  const today = new Date();
  const customerData = [];
  const vehicleData = [];
  const appointmentData = [];
  const appointmentServicesData = [];
  const callLogData = [];

  // Generate 50 customers
  for (let i = 0; i < 50; i++) {
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const phone = generatePhone();
    const email = Math.random() > 0.3 ? generateEmail(firstName, lastName) : null;
    const createdAt = subMonths(today, randomInt(1, 24)); // Customer for 1-24 months
    const totalVisits = randomInt(1, 12);

    const customer = {
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      phone_normalized: phone,
      email: email,
      total_visits: totalVisits,
      created_at: createdAt.toISOString(),
    };

    customerData.push(customer);
  }

  // Insert customers
  console.log('Creating 50 customers...');
  const { data: insertedCustomers, error: custError } = await supabase
    .from('customers')
    .insert(customerData)
    .select('id, first_name, last_name, created_at, total_visits');

  if (custError) {
    console.error('Error inserting customers:', custError);
    return;
  }
  console.log(`✓ Created ${insertedCustomers.length} customers\n`);

  // Generate vehicles for each customer (1-3 vehicles each)
  console.log('Creating vehicles...');
  for (const customer of insertedCustomers) {
    const numVehicles = randomInt(1, 3);
    
    for (let v = 0; v < numVehicles; v++) {
      const vehicle = randomItem(vehicles);
      const year = randomItem(vehicle.years);
      
      vehicleData.push({
        customer_id: customer.id,
        year: year,
        make: vehicle.make,
        model: vehicle.model,
        color: randomItem(colors),
        mileage: generateMileage(year),
        is_primary: v === 0, // First vehicle is primary
      });
    }
  }

  const { data: insertedVehicles, error: vehError } = await supabase
    .from('vehicles')
    .insert(vehicleData)
    .select('id, customer_id, year, make, model');

  if (vehError) {
    console.error('Error inserting vehicles:', vehError);
    return;
  }
  console.log(`✓ Created ${insertedVehicles.length} vehicles\n`);

  // Create a map of customer_id to their vehicles
  const customerVehicles = {};
  for (const vehicle of insertedVehicles) {
    if (!customerVehicles[vehicle.customer_id]) {
      customerVehicles[vehicle.customer_id] = [];
    }
    customerVehicles[vehicle.customer_id].push(vehicle);
  }

  // Generate appointments for each customer
  console.log('Creating appointments (past and future)...');
  const appointmentStatuses = ['completed', 'completed', 'completed', 'completed', 'scheduled', 'confirmed'];
  const times = ['08:00', '09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '14:00', '14:30', '15:00', '15:30', '16:00'];

  for (const customer of insertedCustomers) {
    const vehicles = customerVehicles[customer.id] || [];
    if (vehicles.length === 0) continue;

    // Create past appointments based on total_visits
    const numPastAppts = Math.max(1, customer.total_visits - randomInt(0, 2));
    
    for (let a = 0; a < numPastAppts; a++) {
      const daysAgo = randomInt(7, 365);
      const apptDate = subDays(today, daysAgo);
      const vehicle = randomItem(vehicles);
      const service = randomItem(services);
      const status = a < numPastAppts - 1 ? 'completed' : randomItem(['completed', 'completed', 'no_show']);

      appointmentData.push({
        customer_id: customer.id,
        vehicle_id: vehicle.id,
        scheduled_date: format(apptDate, 'yyyy-MM-dd'),
        scheduled_time: randomItem(times),
        estimated_duration_minutes: randomInt(30, 120),
        status: status,
        created_by: Math.random() > 0.4 ? 'ai_agent' : 'dashboard',
        quoted_total: service.price,
        created_at: subDays(apptDate, randomInt(1, 7)).toISOString(),
      });
    }

    // 40% chance of having a future appointment
    if (Math.random() > 0.6) {
      const daysAhead = randomInt(1, 30);
      const apptDate = addDays(today, daysAhead);
      const vehicle = randomItem(vehicles);
      const service = randomItem(services);

      appointmentData.push({
        customer_id: customer.id,
        vehicle_id: vehicle.id,
        scheduled_date: format(apptDate, 'yyyy-MM-dd'),
        scheduled_time: randomItem(times),
        estimated_duration_minutes: randomInt(30, 120),
        status: Math.random() > 0.5 ? 'confirmed' : 'scheduled',
        created_by: Math.random() > 0.3 ? 'ai_agent' : 'dashboard',
        quoted_total: service.price,
        created_at: subDays(today, randomInt(0, 5)).toISOString(),
      });
    }
  }

  // Insert appointments
  const { data: insertedAppointments, error: apptError } = await supabase
    .from('appointments')
    .insert(appointmentData)
    .select('id, customer_id, scheduled_date, quoted_total');

  if (apptError) {
    console.error('Error inserting appointments:', apptError);
    return;
  }
  console.log(`✓ Created ${insertedAppointments.length} appointments\n`);

  // Create appointment_services for each appointment
  console.log('Creating appointment services...');
  for (const appt of insertedAppointments) {
    const numServices = randomInt(1, 3);
    const selectedServices = [];
    
    for (let s = 0; s < numServices; s++) {
      let service;
      do {
        service = randomItem(services);
      } while (selectedServices.includes(service.id));
      selectedServices.push(service.id);

      appointmentServicesData.push({
        appointment_id: appt.id,
        service_id: service.id,
        service_name: service.name,
        quoted_price: service.price,
      });
    }
  }

  const { error: apptSvcError } = await supabase
    .from('appointment_services')
    .insert(appointmentServicesData);

  if (apptSvcError) {
    console.error('Error inserting appointment services:', apptSvcError);
    return;
  }
  console.log(`✓ Created ${appointmentServicesData.length} appointment services\n`);

  // Create call logs for AI agent bookings
  console.log('Creating call logs...');
  const outcomes = ['booked', 'booked', 'booked', 'inquiry', 'inquiry', 'rescheduled', 'cancelled', 'abandoned'];
  const sentiments = ['positive', 'positive', 'positive', 'neutral', 'neutral', 'negative'];

  for (let c = 0; c < 80; c++) {
    const customer = randomItem(insertedCustomers);
    const daysAgo = randomInt(0, 60);
    const callDate = subDays(today, daysAgo);
    const hour = randomInt(8, 18);
    const minute = randomInt(0, 59);
    const duration = randomInt(45, 300);
    const outcome = randomItem(outcomes);

    callLogData.push({
      phone_number: customer.phone || generatePhone(),
      phone_normalized: customer.phone || generatePhone(),
      customer_id: customer.id,
      direction: 'inbound',
      started_at: new Date(callDate.setHours(hour, minute, 0)).toISOString(),
      ended_at: new Date(callDate.setHours(hour, minute + Math.floor(duration / 60), duration % 60)).toISOString(),
      duration_seconds: duration,
      outcome: outcome,
      sentiment: randomItem(sentiments),
      intent_detected: outcome === 'booked' ? 'book_appointment' : outcome === 'inquiry' ? 'general_inquiry' : 'other',
      transcript_summary: outcome === 'booked' 
        ? `Customer called to book a service appointment. AI agent collected vehicle information and scheduled the appointment successfully.`
        : outcome === 'inquiry'
        ? `Customer called with questions about services and pricing. AI agent provided information and offered to book an appointment.`
        : `Customer interaction - ${outcome}`,
      agent_id: 'agent_98c68bf49ac79b86c517c5c2ba',
      retell_call_id: `call_${Date.now()}_${c}`,
    });
  }

  const { error: callError } = await supabase
    .from('call_logs')
    .insert(callLogData);

  if (callError) {
    console.error('Error inserting call logs:', callError);
    return;
  }
  console.log(`✓ Created ${callLogData.length} call logs\n`);

  // Summary
  console.log('═'.repeat(50));
  console.log('SEED COMPLETE!');
  console.log('═'.repeat(50));
  console.log(`Customers:           ${insertedCustomers.length}`);
  console.log(`Vehicles:            ${insertedVehicles.length}`);
  console.log(`Appointments:        ${insertedAppointments.length}`);
  console.log(`Appointment Services: ${appointmentServicesData.length}`);
  console.log(`Call Logs:           ${callLogData.length}`);
  console.log('═'.repeat(50));
}

seedData().catch(console.error);
