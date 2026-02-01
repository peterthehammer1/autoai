import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// E.164 normalized (used for customer lookup and call_logs.phone_normalized)
const phonesE164 = [
  '+15550100100',
  '+15550100101',
  '+15199918959',
  '+15198040969',
  '+15197818959',
];
// All formats for call_logs (may be stored in different ways)
const callLogPhones = [
  ...phonesE164,
  '15550100100',
  '15550100101',
  '15199918959',
  '15198040969',
  '15197818959',
  '5550100100',
  '5550100101',
  '5199918959',
  '5198040969',
  '5197818959',
];

async function clearTestData() {
  console.log('Clearing test data for:');
  console.log('  555 numbers: +15550100100, +15550100101');
  console.log('  Your numbers: +15199918959, +15198040969, +15197818959\n');

  // 1. Find customer IDs by phone_normalized (E.164)
  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .select('id, first_name, last_name, phone, phone_normalized')
    .in('phone_normalized', phonesE164);

  if (custErr) {
    console.error('Error finding customers:', custErr);
    return;
  }

  if (!customers || customers.length === 0) {
    console.log('No customers found for these numbers.');
  } else {
    console.log('Found customers:', customers.length);
    customers.forEach((c) => console.log('  -', c.phone_normalized, c.first_name, c.last_name));
  }

  const customerIds = customers?.map((c) => c.id) || [];
  if (customerIds.length === 0) {
    // Still try to delete call_logs for these phones
    const { error: callErr } = await supabase
      .from('call_logs')
      .delete()
      .in('phone_normalized', callLogPhones);
    console.log('\nDeleted call_logs:', callErr ? callErr.message : 'OK');
    console.log('\n✅ Cleanup complete (no customers to delete).');
    return;
  }

  // 2. Find vehicle IDs
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, year, make, model')
    .in('customer_id', customerIds);
  const vehicleIds = vehicles?.map((v) => v.id) || [];
  console.log('\nFound vehicles:', vehicleIds.length);

  // 3. Find appointments
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, scheduled_date, scheduled_time, status')
    .in('customer_id', customerIds);
  const appointmentIds = appointments?.map((a) => a.id) || [];
  console.log('Found appointments:', appointmentIds.length);

  // 4. Delete in order (respecting foreign keys)

  // sms_logs (by appointment_id and by customer_id for any without appointment)
  if (appointmentIds.length > 0) {
    const { error: smsErr } = await supabase.from('sms_logs').delete().in('appointment_id', appointmentIds);
    console.log('Deleted sms_logs (by appointment_id):', smsErr ? smsErr.message : 'OK');
  }
  const { error: smsCustErr } = await supabase.from('sms_logs').delete().in('customer_id', customerIds);
  console.log('Deleted sms_logs (by customer_id):', smsCustErr ? smsCustErr.message : 'OK');

  // email_logs
  const { error: emailErr } = await supabase.from('email_logs').delete().in('customer_id', customerIds);
  console.log('Deleted email_logs:', emailErr ? emailErr.message : 'OK');

  // appointment_services
  if (appointmentIds.length > 0) {
    const { error: asErr } = await supabase.from('appointment_services').delete().in('appointment_id', appointmentIds);
    console.log('Deleted appointment_services:', asErr ? asErr.message : 'OK');
  }

  // tow_requests (references customer_id)
  const { error: towErr } = await supabase.from('tow_requests').delete().in('customer_id', customerIds);
  console.log('Deleted tow_requests:', towErr ? towErr.message : 'OK');

  // call_logs must be deleted before appointments (call_logs.appointment_id -> appointments)
  if (appointmentIds.length > 0) {
    const { error: callApptErr } = await supabase.from('call_logs').delete().in('appointment_id', appointmentIds);
    console.log('Deleted call_logs (by appointment_id):', callApptErr ? callApptErr.message : 'OK');
  }
  const { error: callErr } = await supabase.from('call_logs').delete().in('phone_normalized', callLogPhones);
  console.log('Deleted call_logs (by phone):', callErr ? callErr.message : 'OK');

  // appointments
  if (appointmentIds.length > 0) {
    const { error: apptErr } = await supabase.from('appointments').delete().in('id', appointmentIds);
    console.log('Deleted appointments:', apptErr ? apptErr.message : 'OK');
  }

  // vehicles
  if (vehicleIds.length > 0) {
    const { error: vehErr } = await supabase.from('vehicles').delete().in('id', vehicleIds);
    console.log('Deleted vehicles:', vehErr ? vehErr.message : 'OK');
  }

  // customers
  const { error: custDelErr } = await supabase.from('customers').delete().in('id', customerIds);
  console.log('Deleted customers:', custDelErr ? custDelErr.message : 'OK');

  console.log('\n✅ Cleanup complete!');
}

clearTestData().catch(console.error);
