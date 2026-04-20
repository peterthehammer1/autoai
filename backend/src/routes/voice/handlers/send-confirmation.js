import { supabase, normalizePhone } from '../../../config/database.js';
import { logger } from '../../../utils/logger.js';

/**
 * POST /api/voice/send_confirmation
 * Resend the confirmation SMS for an appointment — either by appointment_id
 * or by looking up the customer's next scheduled appointment by phone.
 */
export default async function sendConfirmation(req, res) {
  try {
    logger.info('send_confirmation received:', { data: JSON.stringify(req.body) });

    const appointment_id = req.body.appointment_id || req.body.args?.appointment_id;
    const customer_phone = req.body.customer_phone || req.body.args?.customer_phone;
    const send_to_phone = req.body.send_to_phone || req.body.args?.send_to_phone;

    if (!appointment_id && !customer_phone) {
      return res.json({
        success: false,
        message: 'I need an appointment to send a confirmation for.'
      });
    }

    let appointment;
    let error;

    if (appointment_id) {
      const result = await supabase
        .from('appointments')
        .select(`
          id, scheduled_date, scheduled_time, quoted_total,
          customer:customers (id, first_name, last_name, phone, email),
          appointment_services (service_name),
          vehicle:vehicles (year, make, model)
        `)
        .eq('id', appointment_id)
        .single();
      appointment = result.data;
      error = result.error;
    } else {
      const normalizedPhone = normalizePhone(customer_phone);
      const { data: customer } = await supabase
        .from('customers').select('id').eq('phone_normalized', normalizedPhone).single();

      if (!customer) {
        return res.json({
          success: false,
          message: 'I couldn\'t find your account to send the confirmation.'
        });
      }

      const result = await supabase
        .from('appointments')
        .select(`
          id, scheduled_date, scheduled_time, quoted_total,
          customer:customers (id, first_name, last_name, phone, email),
          appointment_services (service_name),
          vehicle:vehicles (year, make, model)
        `)
        .eq('customer_id', customer.id)
        .eq('status', 'scheduled')
        .order('scheduled_date', { ascending: true })
        .limit(1)
        .single();
      appointment = result.data;
      error = result.error;
    }

    if (error || !appointment) {
      return res.json({
        success: false,
        message: 'I couldn\'t find that appointment to send a confirmation.'
      });
    }

    const { sendConfirmationSMS } = await import('../../../services/sms.js');
    const { ensurePortalToken, portalUrl: buildPortalUrl } = await import('../../portal.js');

    const services = appointment.appointment_services.map(s => s.service_name).join(', ');
    const vehicleDesc = appointment.vehicle
      ? `${appointment.vehicle.year} ${appointment.vehicle.make} ${appointment.vehicle.model}`
      : null;
    const targetPhone = send_to_phone ? normalizePhone(send_to_phone) : appointment.customer.phone;

    let customerPortalUrl;
    try {
      const portalToken = await ensurePortalToken(appointment.customer.id);
      customerPortalUrl = await buildPortalUrl(portalToken);
    } catch (err) {
      logger.error('Portal token generation error in send_confirmation:', { error: err });
    }

    const result = await sendConfirmationSMS({
      customerPhone: targetPhone,
      customerName: appointment.customer.first_name,
      appointmentDate: appointment.scheduled_date,
      appointmentTime: appointment.scheduled_time,
      services,
      vehicleDescription: vehicleDesc,
      customerId: appointment.customer.id,
      appointmentId: appointment.id,
      portalUrl: customerPortalUrl,
    });

    if (result.success) {
      return res.json({
        success: true,
        message: 'The confirmation text is on its way — you should see it within a minute.'
      });
    } else if (result.blocked) {
      return res.json({
        success: false,
        message: 'I wasn\'t able to send the text right now — this number isn\'t set up to receive our messages in the current mode. Your appointment is still confirmed.',
        error_detail: result.error
      });
    } else {
      const payload = {
        success: false,
        message: 'I wasn\'t able to send the text right now, but your appointment is confirmed. You can write down the details if you\'d like.'
      };
      if (result.error) payload.error_detail = result.error;
      return res.json(payload);
    }

  } catch (error) {
    logger.error('send_confirmation error:', { error });
    res.json({
      success: false,
      message: 'I had trouble sending the confirmation text, but your appointment is all set.'
    });
  }
}
