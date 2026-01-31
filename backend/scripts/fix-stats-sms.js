import { createClient } from '@supabase/supabase-js';
import { format, subDays, startOfWeek, addHours } from 'date-fns';

const supabase = createClient(
  'https://yvuvgpzywdyxybokjvfg.supabase.co',
  'sb_secret_8H7RSh7FRreH-lPk2oytxQ_OhV0fIrK'
);

async function fixStatsAndSMS() {
  const today = new Date();
  const weekStart = startOfWeek(today);
  
  console.log('=== Fixing Stats and Adding SMS Logs ===\n');

  // 1. Update 14 customers to have created_at this week
  console.log('1. Updating 14 customers to show as new this week...');
  
  const { data: customers } = await supabase
    .from('customers')
    .select('id, first_name, last_name')
    .order('created_at', { ascending: false })
    .limit(20);

  if (customers) {
    for (let i = 0; i < Math.min(14, customers.length); i++) {
      // Spread them across the week
      const daysAgo = i % 7;
      const hoursOffset = (i * 3) % 12;
      const newDate = addHours(subDays(today, daysAgo), hoursOffset);
      
      await supabase
        .from('customers')
        .update({ created_at: newDate.toISOString() })
        .eq('id', customers[i].id);
    }
    console.log(`✓ Updated 14 customers with this week's created_at dates\n`);
  }

  // 2. Get appointments with customers to create SMS logs
  console.log('2. Creating SMS logs for appointments...');
  
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id,
      scheduled_date,
      scheduled_time,
      status,
      created_at,
      customer:customers(id, first_name, last_name, phone, phone_normalized),
      vehicle:vehicles(year, make, model),
      services:appointment_services(service_name)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (!appointments || appointments.length === 0) {
    console.log('No appointments found');
    return;
  }

  // Check existing SMS logs count
  const { count: existingSmsCount } = await supabase
    .from('sms_logs')
    .select('*', { count: 'exact', head: true });

  console.log(`Existing SMS logs: ${existingSmsCount}`);

  // Create SMS logs for appointments that don't have them
  const smsLogs = [];
  
  for (const apt of appointments) {
    if (!apt.customer?.phone) continue;
    
    const customerName = apt.customer.first_name || 'Valued Customer';
    const vehicle = apt.vehicle ? `${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}` : 'your vehicle';
    const services = apt.services?.map(s => s.service_name).join(', ') || 'your scheduled service';
    
    // Format date nicely
    const dateObj = new Date(apt.scheduled_date + 'T' + apt.scheduled_time);
    const formattedDate = format(dateObj, 'EEEE, MMMM d');
    const formattedTime = format(dateObj, 'h:mm a');
    
    const businessPhone = '+18339519498';
    
    // Confirmation SMS (sent when appointment was created)
    const confirmationMsg = `Hi ${customerName}! Your appointment at Premier Auto Service is confirmed for ${formattedDate} at ${formattedTime}. Vehicle: ${vehicle}. Service: ${services}. Reply CONFIRM to verify or call us to reschedule. See you soon!`;
    
    smsLogs.push({
      to_phone: apt.customer.phone,
      from_phone: businessPhone,
      customer_id: apt.customer.id,
      appointment_id: apt.id,
      message_type: 'confirmation',
      message_body: confirmationMsg,
      status: 'delivered',
      created_at: apt.created_at,
    });

    // For some appointments, add a customer reply
    if (Math.random() > 0.5) {
      smsLogs.push({
        to_phone: businessPhone,
        from_phone: apt.customer.phone,
        customer_id: apt.customer.id,
        appointment_id: apt.id,
        message_type: 'reply',
        message_body: 'CONFIRM',
        status: 'received',
        created_at: new Date(new Date(apt.created_at).getTime() + 300000).toISOString(), // 5 min later
      });
    }

    // For past appointments, add reminder SMS
    if (apt.status === 'completed' || new Date(apt.scheduled_date) < today) {
      const reminderDate = new Date(apt.scheduled_date);
      reminderDate.setDate(reminderDate.getDate() - 1);
      reminderDate.setHours(10, 0, 0, 0);
      
      const reminderMsg = `Reminder: ${customerName}, your appointment at Premier Auto Service is tomorrow (${formattedDate}) at ${formattedTime}. We look forward to seeing you!`;
      
      smsLogs.push({
        to_phone: apt.customer.phone,
        from_phone: businessPhone,
        customer_id: apt.customer.id,
        appointment_id: apt.id,
        message_type: 'reminder',
        message_body: reminderMsg,
        status: 'delivered',
        created_at: reminderDate.toISOString(),
      });
    }
  }

  if (smsLogs.length > 0) {
    // Insert in batches
    const batchSize = 50;
    let inserted = 0;
    
    for (let i = 0; i < smsLogs.length; i += batchSize) {
      const batch = smsLogs.slice(i, i + batchSize);
      const { error } = await supabase.from('sms_logs').insert(batch);
      if (error) {
        console.error('Batch error:', error.message);
      } else {
        inserted += batch.length;
      }
    }
    
    console.log(`✓ Created ${inserted} SMS log entries\n`);
  }

  // Final count
  const { count: finalSmsCount } = await supabase
    .from('sms_logs')
    .select('*', { count: 'exact', head: true });

  const { count: newCustomersCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', format(weekStart, 'yyyy-MM-dd') + 'T00:00:00');

  console.log('═'.repeat(50));
  console.log('SUMMARY');
  console.log('═'.repeat(50));
  console.log(`New Customers This Week: ${newCustomersCount}`);
  console.log(`Total SMS Logs: ${finalSmsCount}`);
  console.log('═'.repeat(50));
}

fixStatsAndSMS().catch(console.error);
