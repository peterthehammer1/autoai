import { supabase } from '../src/config/database.js';

const normalized = (process.env.CLEAN_PHONES || '+15199918959,+15198040969').split(',');

// Also find customers by name
const { data: namedCustomers } = await supabase
  .from('customers')
  .select('id, first_name, last_name, phone_normalized')
  .or('and(first_name.ilike.ben,last_name.is.null),and(first_name.ilike.ben,last_name.ilike.null),and(first_name.ilike.naz,last_name.ilike.meatrat)');

const { data: phoneCustomers } = await supabase
  .from('customers')
  .select('id, first_name, last_name, phone_normalized')
  .in('phone_normalized', normalized);

const allCustomers = [...(phoneCustomers || []), ...(namedCustomers || [])];
const uniqueCustomers = [...new Map(allCustomers.map(c => [c.id, c])).values()];

if (uniqueCustomers.length === 0) { console.log('No customers found — already clean.'); process.exit(0); }

const ids = uniqueCustomers.map(c => c.id);
const allPhones = [...new Set([...normalized, ...uniqueCustomers.map(c => c.phone_normalized).filter(Boolean)])];
console.log('Cleaning:', uniqueCustomers.map(c => `${c.first_name} ${c.last_name} (${c.phone_normalized})`).join(', '));

const { data: appts } = await supabase.from('appointments').select('id').in('customer_id', ids);
const apptIds = (appts || []).map(a => a.id);

if (apptIds.length) await supabase.from('appointment_services').delete().in('appointment_id', apptIds);
await supabase.from('call_logs').delete().in('customer_id', ids);
await supabase.from('call_logs').delete().in('phone_normalized', allPhones);
await supabase.from('sms_logs').delete().in('customer_id', ids);
await supabase.from('sms_conversations').delete().in('customer_id', ids);
await supabase.from('email_logs').delete().in('customer_id', ids);
await supabase.from('review_requests').delete().in('customer_id', ids);
await supabase.from('tow_requests').delete().in('customer_id', ids);
await supabase.from('appointments').delete().in('customer_id', ids);
await supabase.from('vehicles').delete().in('customer_id', ids);
await supabase.from('customers').delete().in('id', ids);
await supabase.from('leads').delete().in('phone', allPhones);

const { data: check } = await supabase.from('customers').select('id').in('phone_normalized', allPhones);
console.log(check.length === 0 ? 'All clean!' : 'Warning: some records remain');
