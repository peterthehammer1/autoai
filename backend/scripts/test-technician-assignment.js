/**
 * Test script: 20 appointment bookings to verify automatic technician assignment.
 * Tests a range of services, dates, bay types, and time slots.
 *
 * Run: node backend/scripts/test-technician-assignment.js
 */

const BASE_URL = process.env.BASE_URL || 'https://www.alignedai.dev';

const c = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', dim: '\x1b[2m', off: '\x1b[0m', b: '\x1b[1m' };

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  return res.json().catch(() => ({}));
}

// Service IDs by bay type
const SERVICES = {
  quick_service: [
    { id: '5d73eb51-574b-4f0d-9511-842888621a7a', name: 'Conventional Oil Change' },
    { id: '284146f6-573e-4161-bbc9-4efd420083ce', name: 'Tire Rotation' },
    { id: 'a478846c-8a32-4e6b-a2a0-65e862d8f8c4', name: 'Synthetic Blend Oil Change' },
    { id: 'eb613e52-f566-414a-9be0-d6d2f2f20cd9', name: 'Full Synthetic Oil Change' },
  ],
  express_lane: [
    { id: 'a7226f7c-deb1-4992-8da7-63f984b191c6', name: 'Battery Test' },
    { id: '69fd28e2-cf0a-417b-9ea8-2db377b2da07', name: 'Wiper Blade Replacement' },
    { id: '5d248eb1-cf62-4cdf-a154-9c460eefb5aa', name: 'Battery Replacement' },
  ],
  general_service: [
    { id: 'a2f46955-ccd3-48c0-8c53-8c1b598b3828', name: 'Basic Car Wash' },
    { id: 'e254ee42-52f3-4f83-ad23-2063f0a3f6a5', name: 'Interior Cleaning' },
    { id: 'a1438e2e-00ef-4e7d-8f60-d01e6fcfff88', name: 'Exterior Detail' },
  ],
  diagnostic: [
    { id: '0648476d-9e9f-4f0a-ac3e-b69c080bc21d', name: 'Check Engine Light Diagnosis' },
    { id: '4ac06458-dbd2-4e9c-9137-2cb1a50cc16f', name: 'Pre-Purchase Inspection' },
  ],
  alignment: [
    { id: '15ecaeca-f7fc-4bd5-b312-13e467c065e0', name: 'Wheel Alignment - 4 Wheel' },
  ],
};

// Test customers (unique phone numbers for test data)
const CUSTOMERS = [
  { phone: '+15550200001', first: 'Test_Alex', last: 'Johnson', vehicle: { year: 2022, make: 'Toyota', model: 'Camry' } },
  { phone: '+15550200002', first: 'Test_Maria', last: 'Garcia', vehicle: { year: 2021, make: 'Honda', model: 'Civic' } },
  { phone: '+15550200003', first: 'Test_James', last: 'Wilson', vehicle: { year: 2023, make: 'Ford', model: 'F-150' } },
  { phone: '+15550200004', first: 'Test_Sarah', last: 'Chen', vehicle: { year: 2020, make: 'BMW', model: '330i' } },
  { phone: '+15550200005', first: 'Test_David', last: 'Brown', vehicle: { year: 2019, make: 'Chevy', model: 'Silverado' } },
  { phone: '+15550200006', first: 'Test_Emily', last: 'Davis', vehicle: { year: 2024, make: 'Tesla', model: 'Model 3' } },
  { phone: '+15550200007', first: 'Test_Robert', last: 'Martinez', vehicle: { year: 2022, make: 'Subaru', model: 'Outback' } },
  { phone: '+15550200008', first: 'Test_Lisa', last: 'Anderson', vehicle: { year: 2021, make: 'Mazda', model: 'CX-5' } },
  { phone: '+15550200009', first: 'Test_Mike', last: 'Taylor', vehicle: { year: 2023, make: 'Hyundai', model: 'Tucson' } },
  { phone: '+15550200010', first: 'Test_Amy', last: 'Thomas', vehicle: { year: 2020, make: 'Kia', model: 'Sorento' } },
];

// Test appointments: 20 varied scenarios
const TESTS = [
  // Quick service - different times on different days
  { customer: 0, services: ['quick_service', 0], date: '2026-02-16', time: '08:00', desc: 'Oil change - Mon morning' },
  { customer: 1, services: ['quick_service', 1], date: '2026-02-16', time: '09:30', desc: 'Tire rotation - Mon mid-morning' },
  { customer: 2, services: ['quick_service', 2], date: '2026-02-17', time: '07:30', desc: 'Synthetic blend oil - Tue early' },
  { customer: 3, services: ['quick_service', 3], date: '2026-02-17', time: '14:00', desc: 'Full synthetic oil - Tue afternoon' },

  // Express lane
  { customer: 4, services: ['express_lane', 0], date: '2026-02-18', time: '08:00', desc: 'Battery test - Wed morning' },
  { customer: 5, services: ['express_lane', 1], date: '2026-02-18', time: '10:00', desc: 'Wiper blades - Wed mid-morning' },
  { customer: 6, services: ['express_lane', 2], date: '2026-02-19', time: '09:00', desc: 'Battery replacement - Thu morning' },

  // General service
  { customer: 7, services: ['general_service', 0], date: '2026-02-16', time: '11:00', desc: 'Car wash - Mon late morning' },
  { customer: 8, services: ['general_service', 1], date: '2026-02-19', time: '13:00', desc: 'Interior clean - Thu afternoon' },
  { customer: 9, services: ['general_service', 2], date: '2026-02-20', time: '08:00', desc: 'Exterior detail - Fri morning' },

  // Diagnostic - specialist bay
  { customer: 0, services: ['diagnostic', 0], date: '2026-02-18', time: '11:00', desc: 'Check engine light - Wed' },
  { customer: 1, services: ['diagnostic', 1], date: '2026-02-20', time: '10:00', desc: 'Pre-purchase inspection - Fri' },

  // Alignment - specialist bay
  { customer: 2, services: ['alignment', 0], date: '2026-02-17', time: '10:00', desc: 'Wheel alignment - Tue' },
  { customer: 3, services: ['alignment', 0], date: '2026-02-19', time: '08:00', desc: 'Wheel alignment - Thu early' },

  // Multi-service combos (same bay type)
  { customer: 4, services: [['quick_service', 0], ['quick_service', 1]], date: '2026-02-20', time: '09:00', desc: 'Oil change + tire rotation combo - Fri' },
  { customer: 5, services: [['express_lane', 0], ['express_lane', 1]], date: '2026-02-16', time: '13:00', desc: 'Battery test + wipers combo - Mon' },

  // Same time slot different days (test tech availability spread)
  { customer: 6, services: ['quick_service', 0], date: '2026-02-20', time: '08:00', desc: 'Oil change - Fri 8am (parallel)' },
  { customer: 7, services: ['quick_service', 1], date: '2026-02-20', time: '08:00', desc: 'Tire rotation - Fri 8am (parallel)' },

  // Late afternoon slots
  { customer: 8, services: ['general_service', 0], date: '2026-02-17', time: '15:00', desc: 'Car wash - Tue 3pm' },
  { customer: 9, services: ['express_lane', 2], date: '2026-02-18', time: '15:30', desc: 'Battery replace - Wed 3:30pm' },
];

function resolveServices(spec) {
  if (Array.isArray(spec[0])) {
    // Multi-service
    return spec.map(([type, idx]) => SERVICES[type][idx].id);
  }
  const [type, idx] = spec;
  return [SERVICES[type][idx].id];
}

function resolveServiceNames(spec) {
  if (Array.isArray(spec[0])) {
    return spec.map(([type, idx]) => SERVICES[type][idx].name).join(' + ');
  }
  const [type, idx] = spec;
  return SERVICES[type][idx].name;
}

async function run() {
  console.log('\n' + '='.repeat(70));
  console.log(c.b + '  TECHNICIAN AUTO-ASSIGNMENT TEST — 20 Bookings' + c.off);
  console.log('  API: ' + BASE_URL);
  console.log('='.repeat(70));

  const results = [];
  let passed = 0, failed = 0, techAssigned = 0;

  for (let i = 0; i < TESTS.length; i++) {
    const test = TESTS[i];
    const cust = CUSTOMERS[test.customer];
    const serviceIds = resolveServices(test.services);
    const serviceNames = resolveServiceNames(test.services);

    console.log(`\n${c.dim}Test ${i + 1}/20:${c.off} ${test.desc}`);
    console.log(`  ${c.dim}Customer: ${cust.first} ${cust.last} | Services: ${serviceNames}${c.off}`);
    console.log(`  ${c.dim}Date: ${test.date} @ ${test.time}${c.off}`);

    try {
      const data = await post('/api/appointments', {
        customer_phone: cust.phone,
        customer_first_name: cust.first,
        customer_last_name: cust.last,
        vehicle_year: cust.vehicle.year,
        vehicle_make: cust.vehicle.make,
        vehicle_model: cust.vehicle.model,
        service_ids: serviceIds,
        appointment_date: test.date,
        appointment_time: test.time,
        created_by: 'test_script',
      });

      if (data.error) {
        console.log(`  ${c.r}✗ FAILED: ${data.error.message || JSON.stringify(data.error)}${c.off}`);
        failed++;
        results.push({ test: i + 1, desc: test.desc, status: 'FAILED', error: data.error.message });
        continue;
      }

      const apt = data.appointment || data;
      const techName = apt.technician
        ? `${apt.technician.first_name} ${apt.technician.last_name} (${apt.technician.skill_level || '?'})`
        : null;
      const bayName = apt.bay ? `${apt.bay.name} (${apt.bay.bay_type})` : apt.bay_id?.substring(0, 8);

      if (techName) {
        console.log(`  ${c.g}✓ BOOKED${c.off} — Bay: ${bayName} | ${c.g}Technician: ${techName}${c.off}`);
        techAssigned++;
      } else {
        console.log(`  ${c.y}✓ BOOKED${c.off} — Bay: ${bayName} | ${c.y}Technician: not assigned${c.off}`);
      }

      passed++;
      results.push({
        test: i + 1,
        desc: test.desc,
        status: 'OK',
        bay: bayName,
        technician: techName || 'none',
        aptId: apt.id?.substring(0, 8),
      });

    } catch (err) {
      console.log(`  ${c.r}✗ ERROR: ${err.message}${c.off}`);
      failed++;
      results.push({ test: i + 1, desc: test.desc, status: 'ERROR', error: err.message });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log(c.b + '  RESULTS SUMMARY' + c.off);
  console.log('='.repeat(70));
  console.log(`  Total: ${TESTS.length} | ${c.g}Passed: ${passed}${c.off} | ${c.r}Failed: ${failed}${c.off}`);
  console.log(`  ${c.g}Technician assigned: ${techAssigned}/${passed}${c.off} (${passed > 0 ? Math.round(techAssigned / passed * 100) : 0}%)`);

  console.log('\n' + c.b + '  Detail Table:' + c.off);
  console.log('  ' + '-'.repeat(66));
  console.log('  # | Status | Bay                      | Technician              | Desc');
  console.log('  ' + '-'.repeat(66));
  for (const r of results) {
    const status = r.status === 'OK' ? c.g + 'OK  ' + c.off : c.r + 'FAIL' + c.off;
    const bay = (r.bay || r.error || '').substring(0, 24).padEnd(24);
    const tech = (r.technician || '').substring(0, 23).padEnd(23);
    console.log(`  ${String(r.test).padStart(2)} | ${status} | ${bay} | ${tech} | ${r.desc.substring(0, 30)}`);
  }
  console.log('  ' + '-'.repeat(66));

  // Cleanup info
  console.log(`\n${c.dim}  Test customers use phones +15550200001 to +15550200010.`);
  console.log(`  Run: node backend/scripts/remove-test-records.js to clean up.${c.off}\n`);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
