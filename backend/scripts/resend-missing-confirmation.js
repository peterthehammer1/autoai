// One-off: resend the missing confirmation for appointment 7b54284f.
import 'dotenv/config';
import { sendConfirmationSMS } from '../src/services/sms.js';
import { ensurePortalToken, portalUrl as buildPortalUrl } from '../src/routes/portal.js';
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const APPT = '7b54284f-8c81-4148-a2dd-7e04ea26a054';

const { data: appt } = await s
  .from('appointments')
  .select(`scheduled_date, scheduled_time,
    customer:customers (id, first_name, phone),
    vehicle:vehicles (year, make, model),
    appointment_services (service_name)`)
  .eq('id', APPT)
  .single();

if (!appt) { console.error('Appt not found'); process.exit(1); }

let portal = null;
try {
  const token = await ensurePortalToken(appt.customer.id);
  portal = await buildPortalUrl(token);
} catch (e) {
  console.warn('Portal URL failed, sending without:', e.message);
}

const res = await sendConfirmationSMS({
  customerPhone: appt.customer.phone,
  customerName: appt.customer.first_name,
  appointmentDate: appt.scheduled_date,
  appointmentTime: appt.scheduled_time,
  services: appt.appointment_services.map(x => x.service_name).join(', '),
  vehicleDescription: `${appt.vehicle.year} ${appt.vehicle.make} ${appt.vehicle.model}`,
  customerId: appt.customer.id,
  appointmentId: APPT,
  portalUrl: portal,
});
console.log('Result:', res);
