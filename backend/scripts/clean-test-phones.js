import { supabase } from '../src/config/database.js';

const normalized = ['+15199918959', '+15198040969'];

const { data: customers } = await supabase.from('customers').select('id, first_name, last_name').in('phone_normalized', normalized);
if (!customers || customers.length === 0) { console.log('No customers found — already clean.'); process.exit(0); }

const ids = customers.map(c => c.id);
console.log('Cleaning:', customers.map(c => c.first_name + ' ' + c.last_name).join(', '));

const { data: appts } = await supabase.from('appointments').select('id').in('customer_id', ids);
const apptIds = (appts || []).map(a => a.id);

if (apptIds.length) await supabase.from('appointment_services').delete().in('appointment_id', apptIds);
await supabase.from('call_logs').delete().in('customer_id', ids);
await supabase.from('call_logs').delete().in('phone_normalized', normalized);
await supabase.from('sms_logs').delete().in('customer_id', ids);
await supabase.from('sms_conversations').delete().in('customer_id', ids);
await supabase.from('email_logs').delete().in('customer_id', ids);
await supabase.from('review_requests').delete().in('customer_id', ids);
await supabase.from('tow_requests').delete().in('customer_id', ids);
await supabase.from('appointments').delete().in('customer_id', ids);
await supabase.from('vehicles').delete().in('customer_id', ids);
await supabase.from('customers').delete().in('id', ids);
await supabase.from('leads').delete().in('phone', normalized);

const { data: check } = await supabase.from('customers').select('id').in('phone_normalized', normalized);
console.log(check.length === 0 ? 'All clean!' : 'Warning: some records remain');
