import { supabase, normalizePhone, formatPhone } from '../../../config/database.js';
import { parseISO } from 'date-fns';
import { sendConfirmationSMS } from '../../../services/sms.js';
import { logger } from '../../../utils/logger.js';
import {
  getBestBayType, addMinutesToTime, formatDateSpoken, formatTime12Hour,
  parseTireCount, isPerUnitService,
} from '../utils.js';

/**
 * POST /api/voice/modify_appointment
 * Cancel, reschedule (optionally swapping services), or add services.
 */
export default async function modifyAppointment(req, res) {
  try {
    logger.info('modify_appointment received:', { data: JSON.stringify(req.body) });

    const appointment_id = req.body.appointment_id || req.body.args?.appointment_id;
    const action = req.body.action || req.body.args?.action;
    const new_date = req.body.new_date || req.body.args?.new_date;
    const new_time = req.body.new_time || req.body.args?.new_time;
    const reason = req.body.reason || req.body.args?.reason;

    if (!appointment_id || !action) {
      return res.json({
        success: false,
        message: 'I need to know which appointment and what you\'d like to do with it.'
      });
    }

    const { data: appointment } = await supabase
      .from('appointments')
      .select(`*, customer:customers (first_name), appointment_services (service_name)`)
      .eq('id', appointment_id)
      .single();

    if (!appointment) {
      return res.json({
        success: false,
        message: 'I couldn\'t find that appointment. Could you verify the details?'
      });
    }

    if (action === 'cancel') {
      await supabase.rpc('free_appointment_slots', { p_appointment_id: appointment_id });

      await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          internal_notes: `Cancelled via AI: ${reason || 'No reason provided'}`
        })
        .eq('id', appointment_id);

      try {
        const { sendCancellationSMS } = await import('../../../services/sms.js');
        const { data: fullAppointment } = await supabase
          .from('appointments')
          .select(`scheduled_date, scheduled_time, customer:customers (id, first_name, phone), appointment_services (service_name)`)
          .eq('id', appointment_id)
          .single();

        if (fullAppointment?.customer) {
          const services = fullAppointment.appointment_services.map(s => s.service_name).join(', ');
          await sendCancellationSMS({
            customerPhone: fullAppointment.customer.phone,
            customerName: fullAppointment.customer.first_name,
            appointmentDate: fullAppointment.scheduled_date,
            appointmentTime: fullAppointment.scheduled_time,
            services,
            customerId: fullAppointment.customer.id,
            appointmentId: appointment_id
          });
        }
      } catch (smsError) {
        logger.error('Failed to send cancellation SMS:', { error: smsError });
      }

      return res.json({
        success: true,
        action: 'cancelled',
        message: `I've cancelled your appointment. Would you like to reschedule for another time?`
      });
    }

    if (action === 'reschedule') {
      if (!new_date || !new_time) {
        return res.json({
          success: false,
          message: 'What date and time would you like to reschedule to?'
        });
      }

      // Weekend / after-hours validation
      const newDay = new Date(new_date + 'T12:00:00').getDay();
      if (newDay === 0 || newDay === 6) {
        return res.json({
          success: false,
          message: 'Our service department is closed on weekends. We\'re open Monday through Friday, 7 AM to 4 PM. Would you like a weekday instead?'
        });
      }
      const [newH, newM] = new_time.split(':').map(Number);
      const newStartMins = newH * 60 + newM;
      if (newStartMins >= 16 * 60) {
        return res.json({
          success: false,
          message: 'We close at 4 PM, so we can\'t reschedule to that time. Our last appointments start at 3:30. Would you like an earlier time?'
        });
      }
      let apptDuration = appointment.estimated_duration_minutes || 60;
      if (newStartMins + apptDuration > 16 * 60) {
        const latestMins = 16 * 60 - apptDuration;
        const lH = Math.floor(latestMins / 60);
        const lM = latestMins % 60;
        const latestStr = lM === 0
          ? `${lH > 12 ? lH - 12 : lH} ${lH >= 12 ? 'PM' : 'AM'}`
          : `${lH > 12 ? lH - 12 : lH}:${String(lM).padStart(2, '0')} ${lH >= 12 ? 'PM' : 'AM'}`;
        return res.json({
          success: false,
          message: `Your service takes about ${apptDuration} minutes, which would run past our 4 PM close. The latest start time is ${latestStr}. Would that work?`
        });
      }

      const { data: appointmentServices } = await supabase
        .from('appointment_services').select('service_id').eq('appointment_id', appointment_id);

      if (!appointmentServices || appointmentServices.length === 0) {
        return res.json({
          success: false,
          message: 'I couldn\'t find the service details. Let me help you book a new appointment instead.'
        });
      }

      // If service_ids provided with reschedule, REPLACE the list (not append).
      // "reschedule" with a new service list = swap (e.g. Winter → Summer changeover).
      // Callers who want to ADD a service should use the separate action: "add_services".
      const service_ids = req.body.service_ids || req.body.args?.service_ids;
      const replaceServiceIds = Array.isArray(service_ids) ? service_ids.filter(Boolean) : [];
      const isReplacingServices = replaceServiceIds.length > 0;

      const existingServiceIds = appointmentServices.map(s => s.service_id);
      const effectiveServiceIds = isReplacingServices ? replaceServiceIds : existingServiceIds;

      const { data: services } = await supabase
        .from('services')
        .select('id, name, required_bay_type, duration_minutes, price_min')
        .in('id', effectiveServiceIds);

      const bayType = getBestBayType(services || []);

      if (isReplacingServices) {
        apptDuration = (services || []).reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
        logger.info('Reschedule replacing services:', { data: { replaceServiceIds, newDuration: apptDuration } });
      }

      const { data: bays } = await supabase
        .from('service_bays').select('id').eq('is_active', true).eq('bay_type', bayType);
      const bayIds = bays?.map(b => b.id) || [];

      // Check ALL required slots for the full duration
      const slotsNeeded = Math.ceil(apptDuration / 30);
      const [rH, rM] = new_time.split(':').map(Number);
      let rMins = rH * 60 + rM;
      const requiredSlotTimes = [];
      for (let i = 0; i < slotsNeeded; i++) {
        requiredSlotTimes.push(`${String(Math.floor(rMins / 60)).padStart(2, '0')}:${String(rMins % 60).padStart(2, '0')}:00`);
        rMins += 30;
      }

      let slot = null;
      for (const bayId of bayIds) {
        const { data: baySlots } = await supabase
          .from('time_slots')
          .select('start_time')
          .eq('slot_date', new_date)
          .eq('bay_id', bayId)
          .eq('is_available', true)
          .in('start_time', requiredSlotTimes);
        if (baySlots && baySlots.length === slotsNeeded) { slot = { bay_id: bayId }; break; }
      }

      if (!slot) {
        return res.json({
          success: false,
          message: 'That time isn\'t available. Would you like me to check for other options?'
        });
      }

      // Free old slots, book new
      await supabase.rpc('free_appointment_slots', { p_appointment_id: appointment_id });
      const { data: bookingResult, error: rpcError } = await supabase.rpc('book_appointment_slots', {
        p_bay_id: slot.bay_id,
        p_date: new_date,
        p_start_time: new_time,
        p_duration_minutes: apptDuration,
        p_appointment_id: appointment_id
      });

      if (rpcError || !bookingResult?.success) {
        // Re-book old slots since reschedule failed
        await supabase.rpc('book_appointment_slots', {
          p_bay_id: appointment.bay_id,
          p_date: appointment.scheduled_date,
          p_start_time: appointment.scheduled_time,
          p_duration_minutes: appointment.estimated_duration_minutes,
          p_appointment_id: appointment_id
        });
        return res.json({
          success: false,
          message: 'That time just got taken. Would you like me to check for other options?'
        });
      }

      // If replacing services, delete old rows and insert new. Pure time-only
      // reschedule (no service_ids) leaves appointment_services untouched.
      const replacedServiceNames = [];
      if (isReplacingServices) {
        await supabase.from('appointment_services').delete().eq('appointment_id', appointment_id);
        const newServices = (services || []).filter(s => replaceServiceIds.includes(s.id));
        const newServiceRows = newServices.map(svc => ({
          appointment_id,
          service_id: svc.id,
          service_name: svc.name,
          quoted_price: svc.price_min,
          duration_minutes: svc.duration_minutes
        }));
        if (newServiceRows.length > 0) {
          await supabase.from('appointment_services').insert(newServiceRows);
        }
        replacedServiceNames.push(...newServices.map(s => s.name));
      }

      const updateFields = {
        scheduled_date: new_date,
        scheduled_time: new_time,
        bay_id: slot.bay_id
      };
      if (isReplacingServices) {
        updateFields.estimated_duration_minutes = apptDuration;
        updateFields.quoted_total = (services || [])
          .filter(s => replaceServiceIds.includes(s.id))
          .reduce((sum, s) => sum + (s.price_min || 0), 0);
      }
      await supabase.from('appointments').update(updateFields).eq('id', appointment_id);

      // Send updated confirmation SMS (awaited — see Vercel serverless note)
      const { data: aptForSms } = await supabase
        .from('appointments')
        .select(`scheduled_date, scheduled_time, customer:customers (id, first_name, phone), appointment_services (service_name), vehicle:vehicles (year, make, model)`)
        .eq('id', appointment_id)
        .single();
      const send_to_phone = req.body.send_to_phone || req.body.args?.send_to_phone;

      if (aptForSms?.customer) {
        const svcList = aptForSms.appointment_services?.map(s => s.service_name).join(', ') || '';
        const vehicleDesc = aptForSms.vehicle
          ? `${aptForSms.vehicle.year} ${aptForSms.vehicle.make} ${aptForSms.vehicle.model}`
          : null;
        const targetPhone = send_to_phone ? normalizePhone(send_to_phone) : aptForSms.customer.phone;
        try {
          const smsResult = await sendConfirmationSMS({
            customerPhone: targetPhone,
            customerName: aptForSms.customer.first_name,
            appointmentDate: aptForSms.scheduled_date,
            appointmentTime: aptForSms.scheduled_time,
            services: svcList,
            vehicleDescription: vehicleDesc,
            customerId: aptForSms.customer.id,
            appointmentId: appointment_id
          });
          if (smsResult.success) {
            await supabase.from('appointments').update({ confirmation_sent_at: new Date().toISOString() }).eq('id', appointment_id);
          }
        } catch (err) {
          logger.error('Reschedule confirmation SMS error:', { error: err });
        }
      }

      const date = parseISO(new_date);
      const smsNote = send_to_phone ? ` I'm sending the confirmation to ${formatPhone(send_to_phone)}.` : '';
      const swapNote = replacedServiceNames.length > 0 ? ` Service updated to ${replacedServiceNames.join(' and ')}.` : '';

      return res.json({
        success: true,
        action: 'rescheduled',
        new_date,
        new_time,
        replaced_services: replacedServiceNames.length > 0 ? replacedServiceNames : undefined,
        message: `I've rescheduled your appointment to ${formatDateSpoken(date)} at ${formatTime12Hour(new_time)}.${swapNote}${smsNote} You'll get a text with the updated details.`
      });
    }

    if (action === 'add_services') {
      const service_ids = req.body.service_ids || req.body.args?.service_ids;
      const tire_count = req.body.tire_count || req.body.args?.tire_count || null;

      logger.info('[add_services] Received service_ids:', { data: JSON.stringify(service_ids) });

      if (!service_ids || !Array.isArray(service_ids) || service_ids.length === 0) {
        return res.json({ success: false, message: 'Which service would you like to add?' });
      }

      logger.info('[add_services] Looking up services:', { data: service_ids });
      const { data: services, error: servicesError } = await supabase
        .from('services').select('*').in('id', service_ids);

      if (servicesError) {
        logger.error('[add_services] Supabase error:', { error: servicesError });
        return res.json({
          success: false,
          message: 'I had trouble looking up that service. Let me transfer you to a service advisor.'
        });
      }
      if (!services || services.length === 0) {
        return res.json({
          success: false,
          message: 'I couldn\'t find that service. Could you tell me what you\'d like to add?'
        });
      }

      // Per-unit services (TPMS, tire mounting, flat tire) use tire_count × price
      const qtyForAdded = (svc) => {
        if (!isPerUnitService(svc.name)) return 1;
        return parseTireCount(tire_count) || 1;
      };
      const newServices = services.map(svc => {
        const qty = qtyForAdded(svc);
        return {
          appointment_id,
          service_id: svc.id,
          service_name: svc.name,
          quoted_price: (svc.price_min || 0) * qty,
          duration_minutes: svc.duration_minutes,
          notes: qty > 1 ? `quantity: ${qty}` : null,
        };
      });

      const { error: insertError } = await supabase.from('appointment_services').insert(newServices);
      if (insertError) {
        logger.error('Error adding services:', { error: insertError });
        return res.json({
          success: false,
          message: 'I had trouble adding that service. Let me transfer you to a service advisor.'
        });
      }

      const additionalDuration = services.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
      const additionalPrice = services.reduce((sum, s) => sum + (s.price_min || 0) * qtyForAdded(s), 0);

      await supabase.from('appointments').update({
        estimated_duration_minutes: (appointment.estimated_duration_minutes || 0) + additionalDuration,
        quoted_total: (appointment.quoted_total || 0) + additionalPrice
      }).eq('id', appointment_id);

      // Book additional time slots atomically if needed
      if (additionalDuration > 0) {
        const currentEndTime = addMinutesToTime(appointment.scheduled_time, appointment.estimated_duration_minutes || 30);

        const { data: bookingResult, error: rpcError } = await supabase.rpc('book_appointment_slots', {
          p_bay_id: appointment.bay_id,
          p_date: appointment.scheduled_date,
          p_start_time: currentEndTime,
          p_duration_minutes: additionalDuration,
          p_appointment_id: appointment_id
        });

        if (rpcError || !bookingResult?.success) {
          logger.error('[add_services] Atomic slot booking failed:', { error: rpcError || bookingResult });
          // Revert
          await supabase.from('appointment_services').delete()
            .eq('appointment_id', appointment_id).in('service_id', service_ids);
          await supabase.from('appointments').update({
            estimated_duration_minutes: appointment.estimated_duration_minutes || 0,
            quoted_total: appointment.quoted_total || 0
          }).eq('id', appointment_id);
          return res.json({
            success: false,
            message: 'I\'m sorry, there isn\'t enough time in the schedule to add that service. Would you like to reschedule to a longer window?'
          });
        }
      }

      // Send updated confirmation SMS (awaited)
      const { data: aptForSms } = await supabase
        .from('appointments')
        .select(`scheduled_date, scheduled_time, customer:customers (id, first_name, phone), appointment_services (service_name), vehicle:vehicles (year, make, model)`)
        .eq('id', appointment_id)
        .single();
      if (aptForSms?.customer) {
        const servicesList = aptForSms.appointment_services?.map(s => s.service_name).join(', ') || '';
        const vehicleDesc = aptForSms.vehicle
          ? `${aptForSms.vehicle.year} ${aptForSms.vehicle.make} ${aptForSms.vehicle.model}`
          : null;
        try {
          const smsResult = await sendConfirmationSMS({
            customerPhone: aptForSms.customer.phone,
            customerName: aptForSms.customer.first_name,
            appointmentDate: aptForSms.scheduled_date,
            appointmentTime: aptForSms.scheduled_time,
            services: servicesList,
            vehicleDescription: vehicleDesc,
            customerId: aptForSms.customer.id,
            appointmentId: appointment_id
          });
          if (smsResult.success) {
            await supabase.from('appointments').update({ confirmation_sent_at: new Date().toISOString() }).eq('id', appointment_id);
          }
        } catch (err) {
          logger.error('Add-services confirmation SMS error:', { error: err });
        }
      }

      const serviceNames = services.map(s => s.name).join(' and ');
      return res.json({
        success: true,
        action: 'services_added',
        added_services: services.map(s => s.name),
        new_total: (appointment.quoted_total || 0) + additionalPrice,
        new_duration_minutes: (appointment.estimated_duration_minutes || 0) + additionalDuration,
        message: `I've added ${serviceNames} to your appointment. You'll get a text with the updated details. Your new total will be around $${((appointment.quoted_total || 0) + additionalPrice).toFixed(0)} before tax.`
      });
    }

    res.json({
      success: false,
      message: 'I can cancel, reschedule, or add services to your appointment. What would you like to do?'
    });

  } catch (error) {
    logger.error('modify_appointment error:', { error });
    res.json({
      success: false,
      message: 'Sorry, I had trouble with that request. Would you like me to transfer you to a service advisor?'
    });
  }
}
