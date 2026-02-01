import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Test phone numbers to clear
const testPhones = [
  '5198040969',
  '15198040969',
  '+15198040969',
  '5199918959',
  '15199918959',
  '+15199918959',
  '5197818959',
  '15197818959',
  '+15197818959'
];

async function clearTestData() {
  console.log('Starting cleanup for test numbers:', testPhones.slice(0, 2));
  
  // 1. Find customer IDs
  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .select('id, first_name, last_name, phone')
    .in('phone_normalized', testPhones);
  
  if (custErr) {
    console.error('Error finding customers:', custErr);
    return;
  }
  
  console.log('\nFound customers:', customers);
  
  if (!customers || customers.length === 0) {
    console.log('No customers found to delete.');
    return;
  }
  
  const customerIds = customers.map(c => c.id);
  console.log('Customer IDs to delete:', customerIds);
  
  // 2. Find vehicle IDs
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, year, make, model')
    .in('customer_id', customerIds);
  
  console.log('\nFound vehicles:', vehicles);
  const vehicleIds = vehicles?.map(v => v.id) || [];
  
  // 3. Find appointments
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, scheduled_date, scheduled_time')
    .in('customer_id', customerIds);
  
  console.log('\nFound appointments:', appointments);
  const appointmentIds = appointments?.map(a => a.id) || [];
  
  // 4. Delete in order (respecting foreign keys)
  
  // Delete sms_logs first (references appointments)
  if (appointmentIds.length > 0) {
    const { error: smsErr } = await supabase
      .from('sms_logs')
      .delete()
      .in('appointment_id', appointmentIds);
    console.log('\nDeleted sms_logs:', smsErr ? smsErr : 'OK');
  }
  
  // Delete appointment_services
  if (appointmentIds.length > 0) {
    const { error: asErr } = await supabase
      .from('appointment_services')
      .delete()
      .in('appointment_id', appointmentIds);
    console.log('Deleted appointment_services:', asErr ? asErr : 'OK');
  }
  
  // Delete appointments
  if (appointmentIds.length > 0) {
    const { error: apptErr } = await supabase
      .from('appointments')
      .delete()
      .in('id', appointmentIds);
    console.log('Deleted appointments:', apptErr ? apptErr : 'OK');
  }
  
  // Delete vehicles
  if (vehicleIds.length > 0) {
    const { error: vehErr } = await supabase
      .from('vehicles')
      .delete()
      .in('id', vehicleIds);
    console.log('Deleted vehicles:', vehErr ? vehErr : 'OK');
  }
  
  // Delete call_logs
  const { error: callErr } = await supabase
    .from('call_logs')
    .delete()
    .in('phone_normalized', testPhones);
  console.log('Deleted call_logs:', callErr ? callErr : 'OK');
  
  // Delete customers
  const { error: custDelErr } = await supabase
    .from('customers')
    .delete()
    .in('id', customerIds);
  console.log('Deleted customers:', custDelErr ? custDelErr : 'OK');
  
  console.log('\n✅ Cleanup complete!');
}

clearTestData().catch(console.error);
