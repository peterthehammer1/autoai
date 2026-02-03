import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function removeTestRecords() {
  console.log('🔍 Looking for test records...\n');

  // 1. Find and remove test services (by name pattern)
  const testServicePatterns = ['Test', 'test', 'TEST'];
  
  const { data: services, error: svcErr } = await supabase
    .from('services')
    .select('id, name, category')
    .or(testServicePatterns.map(p => `name.ilike.%${p}%`).join(','));

  if (svcErr) {
    console.error('Error finding services:', svcErr);
  } else if (services && services.length > 0) {
    console.log('Found test services:');
    services.forEach(s => console.log(`  - ${s.name} (${s.category})`));
    
    const serviceIds = services.map(s => s.id);
    
    // Delete appointment_services referencing these services first
    const { error: asErr } = await supabase
      .from('appointment_services')
      .delete()
      .in('service_id', serviceIds);
    console.log('Deleted appointment_services:', asErr ? asErr.message : 'OK');
    
    // Delete the services
    const { error: delErr } = await supabase
      .from('services')
      .delete()
      .in('id', serviceIds);
    console.log('Deleted services:', delErr ? delErr.message : 'OK');
  } else {
    console.log('No test services found.');
  }

  // 2. Find and remove test products
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, category')
    .or(testServicePatterns.map(p => `name.ilike.%${p}%`).join(','));

  if (prodErr) {
    console.error('Error finding products:', prodErr);
  } else if (products && products.length > 0) {
    console.log('\nFound test products:');
    products.forEach(p => console.log(`  - ${p.name} (${p.category})`));
    
    const { error: delErr } = await supabase
      .from('products')
      .delete()
      .in('id', products.map(p => p.id));
    console.log('Deleted products:', delErr ? delErr.message : 'OK');
  } else {
    console.log('\nNo test products found.');
  }

  // 3. Find test customers (by name pattern)
  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .select('id, first_name, last_name, phone')
    .or('first_name.ilike.%test%,last_name.ilike.%test%');

  if (custErr) {
    console.error('Error finding customers:', custErr);
  } else if (customers && customers.length > 0) {
    console.log('\nFound test customers:');
    customers.forEach(c => console.log(`  - ${c.first_name} ${c.last_name} (${c.phone})`));
    
    const customerIds = customers.map(c => c.id);
    
    // Get related data
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id')
      .in('customer_id', customerIds);
    const appointmentIds = appointments?.map(a => a.id) || [];
    
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id')
      .in('customer_id', customerIds);
    const vehicleIds = vehicles?.map(v => v.id) || [];

    // Delete in order (foreign key constraints)
    if (appointmentIds.length > 0) {
      await supabase.from('sms_logs').delete().in('appointment_id', appointmentIds);
      await supabase.from('appointment_services').delete().in('appointment_id', appointmentIds);
      await supabase.from('call_logs').delete().in('appointment_id', appointmentIds);
      await supabase.from('appointments').delete().in('id', appointmentIds);
      console.log(`Deleted ${appointmentIds.length} appointments and related records`);
    }
    
    await supabase.from('sms_logs').delete().in('customer_id', customerIds);
    await supabase.from('call_logs').delete().in('customer_id', customerIds);
    await supabase.from('tow_requests').delete().in('customer_id', customerIds);
    
    if (vehicleIds.length > 0) {
      await supabase.from('vehicles').delete().in('id', vehicleIds);
      console.log(`Deleted ${vehicleIds.length} vehicles`);
    }
    
    const { error: custDelErr } = await supabase
      .from('customers')
      .delete()
      .in('id', customerIds);
    console.log('Deleted customers:', custDelErr ? custDelErr.message : 'OK');
  } else {
    console.log('\nNo test customers found.');
  }

  // 4. Find tow requests with test in notes/pickup/dropoff
  const { data: towRequests, error: towErr } = await supabase
    .from('tow_requests')
    .select('id, pickup_address, dropoff_address, notes')
    .or('pickup_address.ilike.%test%,dropoff_address.ilike.%test%,notes.ilike.%test%');

  if (towErr) {
    console.error('Error finding tow requests:', towErr);
  } else if (towRequests && towRequests.length > 0) {
    console.log('\nFound test tow requests:');
    towRequests.forEach(t => console.log(`  - ${t.pickup_address} -> ${t.dropoff_address}`));
    
    const { error: delErr } = await supabase
      .from('tow_requests')
      .delete()
      .in('id', towRequests.map(t => t.id));
    console.log('Deleted tow requests:', delErr ? delErr.message : 'OK');
  } else {
    console.log('\nNo test tow requests found.');
  }

  console.log('\n✅ Test data cleanup complete!');
}

removeTestRecords().catch(console.error);
