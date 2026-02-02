/**
 * End-to-end platform test: voice API, bookings, tow, reschedule, cancel.
 * Uses realistic test customers and exercises the full backend.
 *
 * Run: node backend/scripts/test-platform-e2e.js
 * Or:  BASE_URL=https://www.alignedai.dev node backend/scripts/test-platform-e2e.js
 *
 * Test data: unique test phones (+15550100100, +15550100101) so you can
 * identify/delete test customers in the dashboard if needed.
 * Override: TEST_PHONE=15199918959 node backend/scripts/test-platform-e2e.js
 */

const BASE_URL = process.env.BASE_URL || 'https://www.alignedai.dev';

function toE164(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return phone.startsWith('+') ? phone : '+' + digits;
}
const TEST_PHONE_BOOKING = process.env.TEST_PHONE ? toE164(process.env.TEST_PHONE) : '+15550100100';
const TEST_PHONE_TOW = '+15550100101';

const c = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', c: '\x1b[36m', off: '\x1b[0m' };
function ok(msg) { console.log(c.g + '✓ ' + msg + c.off); }
function fail(msg) { console.log(c.r + '✗ ' + msg + c.off); }
function step(msg) { console.log(c.c + '\n--- ' + msg + ' ---' + c.off); }

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

async function run() {
  console.log('\n' + '='.repeat(60));
  console.log(c.c + 'PLATFORM E2E TEST' + c.off);
  console.log('Base URL:', BASE_URL);
  console.log('='.repeat(60));

  let serviceId;
  let appointmentId;
  let bookedDate, bookedTime;
  const errors = [];

  try {
    // 1. Health
    step('1. Health check');
    const health = await get('/health');
    assert(health.data?.status === 'ok', 'Health check');
    ok('Health OK');

    // 2. Get services (oil change)
    step('2. get_services (oil change)');
    const svc = await post('/api/voice/get_services', { search: 'oil change' });
    assert(svc.data?.success !== false && Array.isArray(svc.data?.services), 'get_services');
    assert(svc.data.services.length > 0, 'At least one service');
    serviceId = svc.data.services[0].id;
    ok(`Services: ${svc.data.services.length}, using ${svc.data.services[0].name} (${serviceId})`);

    // 3. Check availability (next weekday)
    step('3. check_availability');
    const d = new Date();
    let days = 0;
    while (days < 14) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() >= 1 && d.getDay() <= 5) break;
      days++;
    }
    const preferredDate = d.toISOString().slice(0, 10);
    const avail = await post('/api/voice/check_availability', {
      service_ids: [serviceId],
      preferred_date: preferredDate,
      preferred_time: 'morning',
    });
    assert(avail.data?.success === true && avail.data?.available === true, 'check_availability');
    assert(avail.data.slots?.length > 0, 'At least one slot');
    const slot = avail.data.slots[0];
    bookedDate = slot.date;
    // Keep HH:MM (e.g. 07:00, 10:30) for book_appointment
    bookedTime = slot.time && slot.time.length >= 5 ? slot.time.slice(0, 5) : slot.time || '10:00';
    ok(`Slots: ${avail.data.slots.length}, first: ${bookedDate} ${bookedTime}`);

    // 4. Book appointment (new customer)
    step('4. book_appointment (new customer)');
    const book = await post('/api/voice/book_appointment', {
      customer_phone: TEST_PHONE_BOOKING,
      customer_first_name: 'Platform',
      customer_last_name: 'Test',
      vehicle_year: 2024,
      vehicle_make: 'Honda',
      vehicle_model: 'Civic',
      service_ids: [serviceId],
      appointment_date: bookedDate,
      appointment_time: bookedTime,
    });
    if (book.data?.success !== true || book.data?.booked !== true) {
      console.log(c.y + '  book_appointment response: ' + JSON.stringify(book.data) + c.off);
    }
    assert(book.data?.success === true && book.data?.booked === true, 'book_appointment');
    appointmentId = book.data?.appointment_id;
    assert(appointmentId, 'appointment_id returned');
    ok(`Booked appointment ${appointmentId}`);

    // 5. Get customer appointments
    step('5. get_customer_appointments');
    const list = await post('/api/voice/get_customer_appointments', {
      customer_phone: TEST_PHONE_BOOKING,
      status: 'upcoming',
    });
    assert(list.data?.success === true && Array.isArray(list.data?.appointments), 'get_customer_appointments');
    assert(list.data.appointments.length >= 1, 'At least one appointment');
    ok(`Appointments: ${list.data.appointments.length}`);

    // 6. Reschedule (modify_appointment reschedule)
    step('6. modify_appointment (reschedule)');
    const secondSlot = avail.data.slots[1];
    const newDate = secondSlot?.date || bookedDate;
    const newTime = secondSlot?.time?.slice(0, 5) || (bookedTime === '10:30' ? '11:00' : '10:30');
    const reschedule = await post('/api/voice/modify_appointment', {
      appointment_id: appointmentId,
      action: 'reschedule',
      new_date: newDate,
      new_time: newTime,
    });
    assert(reschedule.data?.success === true && reschedule.data?.action === 'rescheduled', 'reschedule');
    ok(`Rescheduled to ${newDate} ${newTime}`);

    // 7. Send confirmation SMS (Twilio must be configured on backend)
    step('7. send_confirmation');
    const conf = await post('/api/voice/send_confirmation', {
      appointment_id: appointmentId,
    });
    if (conf.data?.success === true) {
      ok('Confirmation SMS sent');
    } else {
      const msg = conf.data?.message || conf.data?.error || JSON.stringify(conf.data || {});
      fail(`send_confirmation failed: ${msg}`);
      if (conf.data?.error_detail) {
        console.log(c.y + '  Reason: ' + conf.data.error_detail + c.off);
      } else if (Object.keys(conf.data || {}).length > 1) {
        console.log(c.y + '  Response: ' + JSON.stringify(conf.data) + c.off);
      }
      errors.push('send_confirmation');
    }

    // 8. Tow request (separate test customer)
    step('8. submit_tow_request');
    const tow = await post('/api/voice/submit_tow_request', {
      customer_phone: TEST_PHONE_TOW,
      customer_first_name: 'Tow',
      customer_last_name: 'Test',
      vehicle_year: 2020,
      vehicle_make: 'Toyota',
      vehicle_model: 'Corolla',
      pickup_address_line1: '123 Test Street',
      pickup_city: 'Springfield',
      pickup_state: 'ON',
      pickup_zip: 'N1A 2B3',
      pickup_notes: 'E2E test – safe to ignore',
    });
    assert(tow.data?.success === true, 'submit_tow_request');
    ok(`Tow request created (id: ${tow.data?.tow_request_id ?? 'N/A'})`);

    // 9. Cancel appointment
    step('9. modify_appointment (cancel)');
    const cancel = await post('/api/voice/modify_appointment', {
      appointment_id: appointmentId,
      action: 'cancel',
    });
    assert(cancel.data?.success === true && cancel.data?.action === 'cancelled', 'cancel');
    ok('Appointment cancelled');

    // 10. get_customer_appointments after cancel (should be empty or not include cancelled)
    step('10. get_customer_appointments (after cancel)');
    const listAfter = await post('/api/voice/get_customer_appointments', {
      customer_phone: TEST_PHONE_BOOKING,
      status: 'upcoming',
    });
    assert(listAfter.data?.success === true, 'get_customer_appointments after cancel');
    const stillUpcoming = (listAfter.data.appointments || []).filter(
      (a) => a.id === appointmentId && a.status !== 'cancelled'
    );
    assert(stillUpcoming.length === 0, 'Cancelled appointment not in upcoming');
    ok('Upcoming list no longer includes cancelled appointment');

    console.log('\n' + '='.repeat(60));
    ok('All platform E2E tests passed.');
    console.log('='.repeat(60));
    console.log('\nTest data:');
    console.log('  Booking customer:', TEST_PHONE_BOOKING, '(Platform Test, 2024 Honda Civic)');
    console.log('  Tow customer:', TEST_PHONE_TOW, '(Tow Test, 2020 Toyota Corolla)');
    console.log('  You can delete these customers in the dashboard if desired.\n');
  } catch (err) {
    fail(err.message || String(err));
    if (err.stack) console.log(err.stack);
    errors.push(err);
  }

  // Optional: dashboard endpoints sanity check
  step('Dashboard APIs (sanity)');
  try {
    const appts = await get('/api/appointments?limit=5');
    if (appts.ok && Array.isArray(appts.data)) ok('GET /api/appointments OK');
    else console.log(c.y + '  GET /api/appointments: ' + (appts.data?.error?.message || appts.status) + c.off);

    const custs = await get('/api/customers?limit=5');
    if (custs.ok && (Array.isArray(custs.data) || custs.data?.data)) ok('GET /api/customers OK');
    else console.log(c.y + '  GET /api/customers: ' + (custs.data?.error?.message || custs.status) + c.off);
  } catch (e) {
    console.log(c.y + '  Dashboard check: ' + e.message + c.off);
  }

  if (errors.length > 0) {
    console.log('\n' + c.r + `Failed: ${errors.length} assertion(s).` + c.off);
    process.exit(1);
  }
  process.exit(0);
}

run();
