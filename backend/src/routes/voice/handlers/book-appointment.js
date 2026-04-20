import { supabase, normalizePhone } from '../../../config/database.js';
import { format, parseISO } from 'date-fns';
import { sendConfirmationSMS } from '../../../services/sms.js';
import { sendConfirmationEmail } from '../../../services/email.js';
import { logger } from '../../../utils/logger.js';
import {
  assignTechnician, getBestBayType, getRequiredSkillLevel,
  getOrdinalSuffix, formatTime12Hour, getShopClosures,
  parseTireCount, isPerUnitService,
} from '../utils.js';

/**
 * POST /api/voice/book_appointment
 * Creates the appointment, atomically locks slots, sends confirmation SMS.
 */
export default async function bookAppointment(req, res) {
  try {
    logger.info('book_appointment received:', { data: JSON.stringify(req.body) });

    const cleanNull = (val) => (val === 'null' || val === null || val === undefined || val === '') ? null : val;
    const isTemplateVar = (val) => typeof val === 'string' && (val.includes('{{') || val.includes('}}'));

    const body = req.body.args || req.body;

    let customer_phone = cleanNull(body.customer_phone);
    if (isTemplateVar(customer_phone)) {
      logger.info('book_appointment: customer_phone is template variable (inbound webhook may have failed)');
      customer_phone = null;
    }
    const vehicle_id = isTemplateVar(body.vehicle_id) ? null : cleanNull(body.vehicle_id);
    const customer_first_name = cleanNull(body.customer_first_name);
    const customer_last_name = cleanNull(body.customer_last_name);
    const customer_email = cleanNull(body.customer_email);
    const vehicle_year = cleanNull(body.vehicle_year);
    const vehicle_make = cleanNull(body.vehicle_make);
    const vehicle_model = cleanNull(body.vehicle_model);
    const vehicle_mileage = cleanNull(body.vehicle_mileage);
    const service_ids = body.service_ids;
    const appointment_date = cleanNull(body.appointment_date);
    const appointment_time = cleanNull(body.appointment_time);
    const loaner_requested = body.loaner_requested;
    const shuttle_requested = body.shuttle_requested;
    const notes = cleanNull(body.notes);
    const tire_count = cleanNull(body.tire_count);
    // Retell sends call_id at req.body top level, not inside args
    let call_id = cleanNull(req.body.call_id) || cleanNull(body.call_id);
    if (isTemplateVar(call_id)) call_id = null;

    // Fallback: recover customer_phone from call_logs if template var wasn't substituted
    if (!customer_phone && call_id) {
      logger.info('book_appointment: recovering phone from call_id', { data: call_id });
      const { data: callLog } = await supabase
        .from('call_logs')
        .select('phone_number')
        .eq('retell_call_id', call_id)
        .single();
      if (callLog?.phone_number) {
        customer_phone = callLog.phone_number;
        logger.info('book_appointment: recovered phone from call_logs', { data: customer_phone });
      }
    }

    // Fallback 2: if still no phone, try to find the most recent active call (within last 5 min)
    if (!customer_phone) {
      logger.info('book_appointment: attempting to recover phone from recent call_logs');
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentCall } = await supabase
        .from('call_logs')
        .select('phone_number, retell_call_id')
        .gte('started_at', fiveMinAgo)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();
      if (recentCall?.phone_number) {
        customer_phone = recentCall.phone_number;
        if (!call_id) call_id = recentCall.retell_call_id;
        logger.info('book_appointment: recovered phone from recent active call', { data: customer_phone });
      }
    }

    // Fallback 3: if still no phone but have call_id, ask Retell API directly
    if (!customer_phone && call_id && process.env.RETELL_API_KEY) {
      try {
        logger.info('book_appointment: recovering phone from Retell API', { data: call_id });
        const resp = await fetch(`https://api.retellai.com/v2/get-call/${call_id}`, {
          headers: { 'Authorization': `Bearer ${process.env.RETELL_API_KEY}` }
        });
        if (resp.ok) {
          const callData = await resp.json();
          if (callData?.from_number) {
            customer_phone = callData.from_number;
            logger.info('book_appointment: recovered phone from Retell API', { data: customer_phone });
          }
        }
      } catch (e) {
        logger.info('book_appointment: Retell API fallback failed', { data: e.message });
      }
    }

    // Fallback 4: recover call_id from active call if we have phone but no call_id
    if (!call_id && customer_phone) {
      const normalizedLookup = normalizePhone(customer_phone);
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: activeCall } = await supabase
        .from('call_logs')
        .select('retell_call_id')
        .eq('phone_normalized', normalizedLookup)
        .gte('started_at', tenMinAgo)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();
      if (activeCall?.retell_call_id) {
        call_id = activeCall.retell_call_id;
        logger.info('book_appointment: recovered call_id from active call by phone', { data: call_id });
      }
    }

    logger.info('Parsed values:', { data: { customer_phone, service_ids, appointment_date, appointment_time, vehicle_year, vehicle_make, vehicle_model } });

    // Validate required fields
    if (!service_ids || !appointment_date || !appointment_time) {
      return res.json({
        success: false,
        booked: false,
        message: 'I\'m missing some information to complete the booking. I need the service, date, and time.'
      });
    }

    if (!customer_phone) {
      logger.info('book_appointment: phone still missing after all fallbacks');
      return res.json({
        success: false,
        booked: false,
        message: 'I wasn\'t able to pull up your phone number. Could you tell me the best number for your account?'
      });
    }

    const normalizedPhone = normalizePhone(customer_phone);
    const serviceIdList = Array.isArray(service_ids) ? service_ids : [service_ids];

    // 1. Find or create customer
    let { data: customer } = await supabase
      .from('customers')
      .select(`id, first_name, email, vehicles (id)`)
      .eq('phone_normalized', normalizedPhone)
      .single();

    const hasExistingVehicle = customer?.vehicles?.length > 0;
    let customerEmail = customer_email;

    if (!customer) {
      const missingFields = [];
      if (!customer_first_name) missingFields.push('name');
      if (!vehicle_year || !vehicle_make || !vehicle_model) missingFields.push('vehicle');

      if (missingFields.length > 0) {
        logger.info('New customer missing info:', { data: missingFields });
        let message;
        if (missingFields.length === 2) {
          message = 'I just need your name and the vehicle you\'re bringing in — year, make, and model — and I\'ll get you booked.';
        } else if (missingFields[0] === 'name') {
          message = 'I just need your name to get you booked. What\'s your first and last name?';
        } else {
          message = 'What vehicle will you be bringing in? I\'ll need the year, make, and model.';
        }
        return res.json({ success: false, booked: false, missing_info: missingFields.join(','), message });
      }

      logger.info('Creating new customer:', { data: { customer_first_name, customer_last_name, customer_phone, customer_email } });
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
          phone: customer_phone,
          first_name: customer_first_name,
          last_name: customer_last_name,
          email: customer_email
        })
        .select('id, first_name, email')
        .single();
      if (error) { logger.error('Error creating customer:', { error }); throw error; }
      customer = newCustomer;
    } else {
      const missingFields = [];
      if (!customer.first_name && !customer_first_name) missingFields.push('name');
      if (!hasExistingVehicle && !vehicle_id && (!vehicle_year || !vehicle_make || !vehicle_model)) missingFields.push('vehicle');

      if (missingFields.length > 0) {
        logger.info('Existing customer missing info:', { data: missingFields });
        let message;
        if (missingFields.length === 2) {
          message = 'I have your number on file. I just need your name and the vehicle you\'re bringing in — year, make, and model.';
        } else if (missingFields[0] === 'name') {
          message = 'I have your number on file but need to get your name. What\'s your first and last name?';
        } else {
          message = 'What vehicle will you be bringing in? I\'ll need the year, make, and model.';
        }
        return res.json({ success: false, booked: false, missing_info: missingFields.join(','), message });
      }

      if (customer_first_name && !customer.first_name) {
        logger.info('Updating existing customer with name:', { data: { customer_first_name, customer_last_name } });
        await supabase.from('customers').update({
          first_name: customer_first_name,
          last_name: customer_last_name
        }).eq('id', customer.id);
        customer.first_name = customer_first_name;
      }
      if (customer_email && !customer.email) {
        logger.info('Updating existing customer with email:', { data: customer_email });
        await supabase.from('customers').update({ email: customer_email }).eq('id', customer.id);
        customer.email = customer_email;
      }
      customerEmail = customer_email || customer.email;
    }

    // 2. Handle vehicle
    let vehicleId = vehicle_id;
    let vehicleDescription = '';
    const validYear = vehicle_year && parseInt(vehicle_year) > 1900;

    if (!vehicleId && validYear && vehicle_make && vehicle_model) {
      logger.info('Creating new vehicle:', { data: { vehicle_year, vehicle_make, vehicle_model } });
      const { data: newVehicle, error } = await supabase
        .from('vehicles')
        .insert({
          customer_id: customer.id,
          year: parseInt(vehicle_year),
          make: vehicle_make,
          model: vehicle_model,
          mileage: vehicle_mileage,
          mileage_updated_at: vehicle_mileage ? new Date().toISOString() : null,
          is_primary: true
        })
        .select('id, year, make, model')
        .single();
      if (!error && newVehicle) {
        vehicleId = newVehicle.id;
        vehicleDescription = `${newVehicle.year} ${newVehicle.make} ${newVehicle.model}`;
        logger.info('Vehicle created:', { data: vehicleDescription });
      } else {
        logger.info('Vehicle creation failed:', { data: error });
      }
    } else if (vehicleId) {
      const { data: vehicle } = await supabase
        .from('vehicles').select('year, make, model').eq('id', vehicleId).single();
      if (vehicle) vehicleDescription = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    }

    // 3. Get services
    const { data: services, error: serviceError } = await supabase
      .from('services')
      .select('id, name, duration_minutes, price_min, required_bay_type, required_skill_level')
      .in('id', serviceIdList);
    if (serviceError || !services?.length) {
      return res.json({
        success: false,
        booked: false,
        message: 'I couldn\'t find those services. Could you tell me again what service you need?'
      });
    }

    const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);

    // Per-unit qty (TPMS / tire mounting / flat tire). Falls back to 1 when
    // tire_count is omitted to avoid overcharging a single-unit job.
    const qtyForService = (svc) => {
      if (!isPerUnitService(svc.name)) return 1;
      return parseTireCount(tire_count) || 1;
    };

    // 3b. Reject weekend dates
    const appointmentDay = new Date(appointment_date + 'T12:00:00').getDay();
    if (appointmentDay === 0 || appointmentDay === 6) {
      return res.json({
        success: false,
        booked: false,
        message: 'Our service department is closed on weekends. We\'re open Monday through Friday, 7 AM to 4 PM. Would you like a different day?'
      });
    }
    // 3c. Reject shop-closure dates
    const bookingClosures = await getShopClosures([appointment_date]);
    if (bookingClosures.has(appointment_date)) {
      const closure = bookingClosures.get(appointment_date);
      return res.json({
        success: false,
        booked: false,
        closed_reason: 'shop_closure',
        closure_reason: closure.reason,
        message: `We're closed on ${format(parseISO(appointment_date), 'EEEE, MMMM do')} — ${closure.spoken_reason || closure.reason}. Would you like a different day?`
      });
    }
    // 3d. Reject after-hours
    const [aptH, aptM] = appointment_time.split(':').map(Number);
    const aptStartMinutes = aptH * 60 + aptM;
    if (aptStartMinutes >= 16 * 60) {
      return res.json({
        success: false,
        booked: false,
        message: 'We close at 4 PM, so we can\'t book appointments at or after 4. Our last appointments start at 3:30. Would you like an earlier time?'
      });
    }
    const aptEndMinutes = aptStartMinutes + totalDuration;
    if (aptEndMinutes > 16 * 60) {
      const latestStartMins = 16 * 60 - totalDuration;
      const latestH = Math.floor(latestStartMins / 60);
      const latestM = latestStartMins % 60;
      const latestFormatted = latestM === 0
        ? `${latestH > 12 ? latestH - 12 : latestH} ${latestH >= 12 ? 'PM' : 'AM'}`
        : `${latestH > 12 ? latestH - 12 : latestH}:${String(latestM).padStart(2, '0')} ${latestH >= 12 ? 'PM' : 'AM'}`;
      return res.json({
        success: false,
        booked: false,
        message: `That service takes about ${totalDuration} minutes, which would run past our 4 PM close. The latest we could start it is ${latestFormatted}. Would you like that time instead?`
      });
    }

    // 4. Find bay with consecutive slots
    const bookingBayType = getBestBayType(services);
    const { data: compatibleBays } = await supabase
      .from('service_bays').select('id').eq('is_active', true).eq('bay_type', bookingBayType);
    const compatibleBayIds = compatibleBays?.map(b => b.id) || [];
    const slotsNeeded = Math.ceil(totalDuration / 30);

    const [bookH, bookM] = appointment_time.split(':').map(Number);
    let bookMins = bookH * 60 + bookM;
    const requiredSlotTimes = [];
    for (let i = 0; i < slotsNeeded; i++) {
      requiredSlotTimes.push(`${String(Math.floor(bookMins / 60)).padStart(2, '0')}:${String(bookMins % 60).padStart(2, '0')}:00`);
      bookMins += 30;
    }

    let availableSlot = null;
    if (compatibleBayIds.length > 0) {
      for (const bayId of compatibleBayIds) {
        const { data: baySlots } = await supabase
          .from('time_slots')
          .select('start_time')
          .eq('slot_date', appointment_date)
          .eq('bay_id', bayId)
          .eq('is_available', true)
          .in('start_time', requiredSlotTimes);
        if (baySlots && baySlots.length === slotsNeeded) {
          availableSlot = { bay_id: bayId };
          break;
        }
      }
    }

    if (!availableSlot) {
      return res.json({
        success: false,
        booked: false,
        message: 'I\'m sorry, that time isn\'t available. Let me find another option for you.'
      });
    }

    // 5. Auto-assign technician
    const requiredSkill = getRequiredSkillLevel(services);
    const technicianId = await assignTechnician({
      bay_id: availableSlot.bay_id,
      appointment_date,
      appointment_time,
      duration_minutes: totalDuration,
      required_skill_level: requiredSkill,
    });

    // 6. Create appointment
    const appointmentPayload = {
      customer_id: customer.id,
      vehicle_id: vehicleId,
      scheduled_date: appointment_date,
      scheduled_time: appointment_time,
      estimated_duration_minutes: totalDuration,
      bay_id: availableSlot.bay_id,
      loaner_requested: loaner_requested || false,
      shuttle_requested: shuttle_requested || false,
      customer_notes: notes,
      quoted_total: services.reduce((sum, s) => sum + (s.price_min || 0) * qtyForService(s), 0),
      created_by: 'ai_agent',
      call_id,
      status: 'scheduled'
    };
    if (technicianId) appointmentPayload.technician_id = technicianId;

    const { data: appointment, error: aptError } = await supabase
      .from('appointments').insert(appointmentPayload).select('id').single();
    if (aptError) throw aptError;

    // 6b. Add services (per-unit pricing applied; quantity>1 noted in `notes`)
    await supabase.from('appointment_services').insert(services.map(s => {
      const qty = qtyForService(s);
      return {
        appointment_id: appointment.id,
        service_id: s.id,
        service_name: s.name,
        quoted_price: (s.price_min || 0) * qty,
        duration_minutes: s.duration_minutes,
        notes: qty > 1 ? `quantity: ${qty}` : null,
      };
    }));

    // 6c. Link customer to call log
    if (call_id) {
      await supabase.from('call_logs').update({
        customer_id: customer.id,
        appointment_id: appointment.id,
        outcome: 'booked'
      }).eq('retell_call_id', call_id);
    }

    // 7. Atomically book slots (prevents double-booking race)
    const { data: bookingResult, error: rpcError } = await supabase.rpc('book_appointment_slots', {
      p_bay_id: availableSlot.bay_id,
      p_date: appointment_date,
      p_start_time: appointment_time,
      p_duration_minutes: totalDuration,
      p_appointment_id: appointment.id
    });

    if (rpcError || !bookingResult?.success) {
      logger.error('Atomic booking failed:', { error: rpcError || bookingResult });
      await supabase.from('appointments')
        .update({ deleted_at: new Date().toISOString(), status: 'booking_failed' })
        .eq('id', appointment.id);
      return res.json({
        success: false,
        booked: false,
        message: 'That time just got taken. Let me check what else is available for you.'
      });
    }

    // 8. Format response
    const date = parseISO(appointment_date);
    const dayName = format(date, 'EEEE');
    const dayOfMonthNum = parseInt(format(date, 'd'));
    const monthDay = `${format(date, 'MMMM')} ${dayOfMonthNum}${getOrdinalSuffix(dayOfMonthNum)}`;
    const timeFormatted = formatTime12Hour(appointment_time);
    const serviceNames = services.map(s => s.name).join(' and ');
    const customerName = customer.first_name || customer_first_name || 'there';

    // 9. Portal token + confirmation SMS BEFORE res.json (see
    // reference_vercel_serverless_quirks — fire-and-forget after response
    // gets killed by Vercel spinning the instance down). Portal generation
    // is separately try/caught so a portal failure doesn't block SMS.
    try {
      let customerPortalUrl = null;
      try {
        const { ensurePortalToken, portalUrl: buildPortalUrl } = await import('../../portal.js');
        const portalToken = await ensurePortalToken(customer.id);
        customerPortalUrl = await buildPortalUrl(portalToken);
      } catch (err) {
        logger.warn('Portal URL generation failed, sending SMS without link', { error: err.message });
      }

      const result = await sendConfirmationSMS({
        customerPhone: customer_phone,
        customerName,
        appointmentDate: appointment_date,
        appointmentTime: appointment_time,
        services: serviceNames,
        vehicleDescription,
        customerId: customer.id,
        appointmentId: appointment.id,
        portalUrl: customerPortalUrl,
      });
      if (result.success) {
        await supabase.from('appointments')
          .update({ confirmation_sent_at: new Date().toISOString() })
          .eq('id', appointment.id);
        logger.info('[SMS] Confirmation sent for appointment', { data: appointment.id });
      }
    } catch (err) {
      logger.error('SMS confirmation error:', { error: err });
    }

    // 10. Email confirmation (fire-and-forget is OK here — email isn't critical)
    if (customerEmail) {
      const fullName = [customer_first_name || customer.first_name, customer_last_name].filter(Boolean).join(' ');
      sendConfirmationEmail({
        to: customerEmail,
        customerName: fullName || customerName,
        appointmentDate: appointment_date,
        appointmentTime: appointment_time,
        services: serviceNames,
        vehicle: vehicleDescription,
        customerId: customer.id,
        appointmentId: appointment.id
      }).then(result => {
        if (result.success) logger.info('[Email] Confirmation sent for appointment', { data: appointment.id });
      }).catch(err => logger.error('Email confirmation error:', { error: err }));
    }

    res.json({
      success: true,
      booked: true,
      appointment_id: appointment.id,
      confirmation: {
        date: appointment_date,
        time: appointment_time,
        date_formatted: `${dayName}, ${monthDay}`,
        time_formatted: timeFormatted,
        services: serviceNames,
        vehicle: vehicleDescription,
        duration_minutes: totalDuration
      },
      message: `Perfect, ${customerName}! You're all set for ${dayName}. We'll text you the details shortly. Is there anything else I can help with?`
    });

  } catch (error) {
    logger.error('book_appointment error:', { error });
    res.json({
      success: false,
      booked: false,
      message: 'I\'m sorry, I encountered an error while booking. Let me try that again, or I can transfer you to a service advisor.'
    });
  }
}
