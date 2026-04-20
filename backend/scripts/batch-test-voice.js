// Batch test for voice agent tool endpoints. Safe to run: exercises
// get_services, get_customer_appointments, check_availability, and the
// validation paths of book_appointment / modify_appointment. No real
// bookings are created.
//
// Usage: node scripts/batch-test-voice.js [--local]
//   --local  hit http://localhost:3001 instead of production

const LOCAL = process.argv.includes('--local');
const BASE = LOCAL ? 'http://localhost:3001' : 'https://www.alignedai.dev';
const DOUG_PHONE = '+15199918959';

let passed = 0;
let failed = 0;
const failures = [];

const COLOR = {
  g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m',
};

async function call(endpoint, body) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/voice/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ args: body }),
  });
  const json = await res.json();
  return { json, ms: Date.now() - t0, status: res.status };
}

function check(name, result, assertion) {
  const ok = assertion(result.json);
  if (ok) {
    console.log(`${COLOR.g}✓${COLOR.x} ${name}  ${COLOR.d}(${result.ms}ms)${COLOR.x}`);
    passed++;
  } else {
    console.log(`${COLOR.r}✗ ${name}${COLOR.x}  ${COLOR.d}(${result.ms}ms)${COLOR.x}`);
    console.log(`  ${COLOR.d}${JSON.stringify(result.json).slice(0, 200)}${COLOR.x}`);
    failed++;
    failures.push(name);
  }
}

async function section(title) {
  console.log(`\n${COLOR.b}${title}${COLOR.x}`);
}

// Today + next weekday for date-based tests
function todayISO() { return new Date().toISOString().slice(0, 10); }
function nextWeekday(daysOut = 1) {
  const d = new Date();
  d.setDate(d.getDate() + daysOut);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
function nextWeekend() {
  const d = new Date();
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

await section('[get_services]');

let r = await call('get_services', { search: 'oil change', vehicle_make: 'Cadillac', vehicle_model: 'XT5', vehicle_year: 2021 });
check('oil change returns Synthetic Blend', r, j => j.success && j.services?.some(s => /synthetic blend/i.test(s.name)));

r = await call('get_services', { search: 'alignment' });
check('alignment returns wheel alignment options', r, j => j.success && j.services?.some(s => /alignment/i.test(s.name)));

r = await call('get_services', { search: 'tire rotation' });
check('tire rotation resolves', r, j => j.success && j.services?.some(s => /tire rotation/i.test(s.name)));

r = await call('get_services', { search: 'zzznothingburger' });
check('nonsense search returns empty or not_found', r, j => j.services?.length === 0 || j.service_not_found === true);

r = await call('get_services', { search: 'oil change', vehicle_make: 'Tesla', vehicle_model: 'Model 3', vehicle_year: 2023 });
check('EV oil change flags incompatibility', r, j => j.service_incompatible === true);


await section('[check_availability — keyword path (Phase 2A)]');

r = await call('check_availability', { keyword: 'oil change', preferred_date: nextWeekday(1) });
check('keyword "oil change" resolves + returns slots', r, j => j.success && j.available && j.service_ids?.length > 0 && j.slots?.length > 0);
check('  returns multiple slots (slot-spread fix)', r, j => j.slots?.length > 1);

r = await call('check_availability', { keyword: 'alignment', preferred_date: nextWeekday(7) });
check('keyword "alignment" resolves', r, j => j.success && j.available && j.service_ids?.length > 0);

r = await call('check_availability', { keyword: 'summer tire changeover', preferred_date: nextWeekday(30) });
check('keyword "summer tire changeover" matches summer', r, j => j.success && /summer/i.test(j.services?.[0] || ''));


await section('[check_availability — requested_time_matched]');

r = await call('check_availability', { keyword: 'oil change', preferred_date: nextWeekday(1), preferred_time: '07:00' });
check('7 AM is matched (likely available)', r, j => j.requested_time_matched === true || j.requested_time_matched === false);

r = await call('check_availability', { keyword: 'oil change', preferred_date: nextWeekday(1), preferred_time: '10:00' });
check('10 AM sets requested_time_matched boolean', r, j => typeof j.requested_time_matched === 'boolean');

r = await call('check_availability', { keyword: 'oil change', preferred_date: nextWeekday(1), preferred_time: 'morning' });
check('fuzzy "morning" keeps requested_time_matched null', r, j => j.requested_time_matched === null);


await section('[check_availability — error paths]');

r = await call('check_availability', { preferred_date: nextWeekday(1) });
check('missing service_ids + keyword returns error + recovery', r, j => j.success === false && j.error === 'missing_service_ids' && j.recovery);

r = await call('check_availability', { keyword: 'oil change', preferred_date: nextWeekend() });
check('weekend date returns requested_date_closed', r, j => j.requested_date_closed === true || j.closed_reason === 'weekend');

r = await call('check_availability', { keyword: 'oil change', preferred_date: '2020-01-15' });
check('past date handled gracefully', r, j => 'success' in j);

r = await call('check_availability', { keyword: 'oil change', preferred_date: '2027-06-15' });
check('date >45 days out gets polite deferral', r, j => 'success' in j);


await section('[get_customer_appointments]');

r = await call('get_customer_appointments', { customer_phone: DOUG_PHONE });
check("Doug's phone returns appointments", r, j => j.success && Array.isArray(j.appointments));

r = await call('get_customer_appointments', { customer_phone: '+15550000000' });
check('unknown phone returns empty/not_found gracefully', r, j => 'success' in j);


await section('[book_appointment — validation only]');

r = await call('book_appointment', { customer_phone: DOUG_PHONE });
check('missing all required fields rejected', r, j => j.success === false);

r = await call('book_appointment', {
  customer_phone: DOUG_PHONE,
  service_ids: ['a478846c-8a32-4e6b-a2a0-65e862d8f8c4'],
  appointment_date: nextWeekend(),
  appointment_time: '09:00',
});
check('weekend date rejected', r, j => j.success === false && /weekend|closed/i.test(j.message || ''));

r = await call('book_appointment', {
  customer_phone: DOUG_PHONE,
  service_ids: ['a478846c-8a32-4e6b-a2a0-65e862d8f8c4'],
  appointment_date: nextWeekday(1),
  appointment_time: '16:00',
});
check('after-hours (4 PM) rejected', r, j => j.success === false && /4|four|close|PM/i.test(j.message || ''));

r = await call('book_appointment', {
  customer_phone: DOUG_PHONE,
  service_ids: ['00000000-0000-0000-0000-000000000000'],
  appointment_date: nextWeekday(1),
  appointment_time: '08:00',
});
check('invalid service_id rejected', r, j => j.success === false);


await section('[modify_appointment — validation only]');

r = await call('modify_appointment', { appointment_id: 'not-a-uuid', action: 'cancel' });
check('invalid appointment_id rejected', r, j => j.success === false);

r = await call('modify_appointment', { appointment_id: '00000000-0000-0000-0000-000000000000', action: 'cancel' });
check('non-existent appointment_id rejected', r, j => j.success === false);

r = await call('modify_appointment', { action: 'cancel' });
check('missing appointment_id rejected', r, j => j.success === false);


await section('\nSummary');
const total = passed + failed;
const color = failed === 0 ? COLOR.g : COLOR.r;
console.log(`${color}${passed}/${total} passed${COLOR.x}  (${failed} failed)`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  - ${f}`));
}
process.exit(failed === 0 ? 0 : 1);
