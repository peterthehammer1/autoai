import { Router } from 'express';
import { supabase, normalizePhone, formatPhone } from '../../config/database.js';
import { format, parseISO, addDays } from 'date-fns';
import { sendConfirmationSMS } from '../../services/sms.js';
import { sendConfirmationEmail } from '../../services/email.js';
import { nowEST, todayEST } from '../../utils/timezone.js';
import { logger } from '../../utils/logger.js';
import { assignTechnician, getBestBayType, getRequiredSkillLevel, addMinutesToTime, getOrdinalSuffix, formatTime12Hour } from './utils.js';

const router = Router();

/**
 * POST /api/voice/check_availability
 * Nucleus AI function: Check appointment availability
 */
router.post('/check_availability', async (req, res, next) => {
  try {
    logger.info('check_availability received:', { data: JSON.stringify(req.body) });

    // Handle both direct params and nested args from Nucleus AI
    const service_ids = req.body.service_ids || req.body.args?.service_ids;
    const preferred_date = req.body.preferred_date || req.body.args?.preferred_date;
    const preferred_time = req.body.preferred_time || req.body.args?.preferred_time;
    const days_to_check = req.body.days_to_check || req.body.args?.days_to_check || 7;

    // Validate service_ids
    if (!service_ids || (Array.isArray(service_ids) && service_ids.length === 0)) {
      logger.info('No service_ids found');
      return res.json({
        success: false,
        available: false,
        message: 'Please let me know what service you need so I can check availability.'
      });
    }

    const serviceIdList = Array.isArray(service_ids) ? service_ids : [service_ids];
    logger.info('Looking for services:', { data: serviceIdList });

    // Get services
    const { data: services, error: serviceError } = await supabase
      .from('services')
      .select('id, name, duration_minutes, required_bay_type')
      .in('id', serviceIdList);

    logger.info('Services found:', { data: { count: services?.length, error: serviceError } });

    if (serviceError || !services || services.length === 0) {
      return res.json({
        success: false,
        available: false,
        message: 'I couldn\'t find those services. Could you tell me what service you need?'
      });
    }

    const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
    const primaryBayType = getBestBayType(services);
    logger.info('Total duration:', { data: { totalDuration, primaryBayType, bayTypes: services.map(s => s.required_bay_type).join(', ') } });

    // Get compatible bays
    const { data: bays } = await supabase
      .from('service_bays')
      .select('id')
      .eq('is_active', true)
      .eq('bay_type', primaryBayType);

    if (!bays || bays.length === 0) {
      return res.json({
        success: false,
        available: false,
        message: 'I\'m sorry, we don\'t have the right equipment available for that service currently.'
      });
    }

    const bayIds = bays.map(b => b.id);

    // Determine date range - ALWAYS start from today or future, never past
    const today = nowEST();
    let startDate = today;

    if (preferred_date) {
      const requestedDate = parseISO(preferred_date);
      // If requested date is in the past, use today instead
      startDate = requestedDate > today ? requestedDate : today;
    }

    // Use 14 days by default for wider search range
    const searchDays = parseInt(days_to_check, 10) || 14;
    const endDate = addDays(startDate, searchDays);
    logger.info('Date range:', { data: { start: format(startDate, 'yyyy-MM-dd'), end: format(endDate, 'yyyy-MM-dd') } });

    // Service department hours: Mon-Fri 7am-4pm only (no evenings, no weekends)
    let timeStart = '07:00';
    let timeEnd = '16:00';
    if (preferred_time) {
      const timeLower = preferred_time.toLowerCase().trim();
      if (timeLower === 'morning' || timeLower === 'am') {
        timeEnd = '12:00';
      } else if (timeLower === 'afternoon' || timeLower === 'pm') {
        timeStart = '12:00';
      } else if (timeLower === 'early morning') {
        timeEnd = '09:00';
      } else if (timeLower === 'late afternoon') {
        timeStart = '14:00';
      } else {
        // Handle specific times: "15:00", "3:00 PM", "after 3", etc.
        const timeMatch = timeLower.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
        if (timeMatch) {
          let hour = parseInt(timeMatch[1], 10);
          const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const ampm = timeMatch[3];
          if (ampm === 'pm' && hour < 12) hour += 12;
          if (ampm === 'am' && hour === 12) hour = 0;
          const specificTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
          // If it looks like a start time preference ("after 3pm"), use as start
          if (timeLower.includes('after') || timeLower.includes('from') || timeLower.includes('no earlier')) {
            timeStart = specificTime;
          } else if (timeLower.includes('before') || timeLower.includes('by') || timeLower.includes('no later')) {
            timeEnd = specificTime;
          } else {
            // Exact time or close to it - search in a window around it
            const startHour = Math.max(hour - 1, 7);
            timeStart = `${String(startHour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
            const endHour = Math.min(hour + 2, 16);
            timeEnd = `${String(endHour).padStart(2, '0')}:00`;
          }
        }
      }
      // Clamp to business hours
      if (timeStart < '07:00') timeStart = '07:00';
      if (timeEnd > '16:00') timeEnd = '16:00';
      if (timeStart >= timeEnd) timeStart = '07:00'; // fallback to full range
    }
    logger.info('Time filter:', { data: { timeStart, timeEnd, preferred_time } });

    // Get available slots
    const { data: rawSlots, error: slotError } = await supabase
      .from('time_slots')
      .select('slot_date, start_time, bay_id')
      .in('bay_id', bayIds)
      .eq('is_available', true)
      .gte('slot_date', format(startDate, 'yyyy-MM-dd'))
      .lte('slot_date', format(endDate, 'yyyy-MM-dd'))
      .gte('start_time', timeStart)
      .lt('start_time', timeEnd)
      .order('slot_date')
      .order('start_time');

    if (slotError) throw slotError;

    // Weekdays only (no Saturday or Sunday)
    const isWeekday = (dateStr) => {
      const d = new Date(dateStr + 'T12:00:00');
      const day = d.getDay();
      return day >= 1 && day <= 5;
    };
    const slots = (rawSlots || []).filter(s => isWeekday(s.slot_date));

    // Find consecutive slots for appointment duration
    const slotsNeeded = Math.ceil(totalDuration / 30);
    const availableWindows = [];
    const slotsByDateBay = {};

    for (const slot of slots) {
      const key = `${slot.slot_date}_${slot.bay_id}`;
      if (!slotsByDateBay[key]) slotsByDateBay[key] = [];
      slotsByDateBay[key].push(slot);
    }

    // Get current time for filtering out past slots on today's date
    const now = nowEST();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const todayStr = todayEST();

    for (const [key, baySlots] of Object.entries(slotsByDateBay)) {
      const [slotDate] = key.split('_');
      baySlots.sort((a, b) => a.start_time.localeCompare(b.start_time));

      for (let i = 0; i <= baySlots.length - slotsNeeded; i++) {
        const slotTime = baySlots[i].start_time;
        const [slotHour, slotMinute] = slotTime.split(':').map(Number);

        const slotMinutes = slotHour * 60 + slotMinute;

        // Skip slots that have already passed today
        if (slotDate === todayStr) {
          // Add 30 min buffer - don't offer slots less than 30 mins from now
          const currentMinutes = currentHour * 60 + currentMinute + 30; // 30 min buffer
          if (slotMinutes <= currentMinutes) {
            continue; // Skip this slot, it's in the past
          }
        }

        // Skip if appointment would end after 4 PM close
        if (slotMinutes + totalDuration > 16 * 60) {
          continue;
        }

        let consecutive = true;
        for (let j = 1; j < slotsNeeded; j++) {
          const expected = addMinutesToTime(baySlots[i + j - 1].start_time, 30);
          if (baySlots[i + j].start_time !== expected) {
            consecutive = false;
            break;
          }
        }

        if (consecutive) {
          availableWindows.push({
            date: slotDate,
            time: baySlots[i].start_time.slice(0, 5),
            bay_id: baySlots[i].bay_id
          });
        }
      }
    }

    // Remove duplicates and limit to 2 options only (to prevent AI from listing many)
    const uniqueSlots = [];
    const seen = new Set();
    for (const slot of availableWindows) {
      const key = `${slot.date}_${slot.time}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSlots.push(slot);
      }
      if (uniqueSlots.length >= 2) break; // Only return 2 options at a time
    }

    // Check if the requested date was a weekend (even if we found weekday slots)
    const requestedDay = preferred_date ? new Date(preferred_date + 'T12:00:00').getDay() : null;
    const isWeekendRequest = requestedDay === 0 || requestedDay === 6;

    if (uniqueSlots.length === 0) {
      const daysFromNow = preferred_date ? Math.ceil((startDate - today) / (1000 * 60 * 60 * 24)) : 0;
      let message;

      if (isWeekendRequest) {
        message = `We're closed on weekends. Our service department is open Monday through Friday, 7 AM to 4 PM. Would you like a weekday instead?`;
      } else if (daysFromNow > 45) {
        message = `Our schedule isn't open that far out yet. Would you like to try a date within the next month or so?`;
      } else if (preferred_time) {
        message = `I don't have any ${preferred_time} openings around that date. Would you like to try a different time of day or another date?`;
      } else {
        message = `I don't have any openings around that date. Would you like to try a different date?`;
      }

      return res.json({
        success: true,
        available: false,
        slots: [],
        message
      });
    }

    // Format for voice
    const formattedSlots = uniqueSlots.map(s => {
      const date = parseISO(s.date);
      const dayName = format(date, 'EEEE');
      const dayOfMonth = format(date, 'd');
      const monthName = format(date, 'MMMM');
      return {
        ...s,
        formatted: `${dayName}, ${monthName} ${dayOfMonth} at ${formatTime12Hour(s.time)}`,
        day_name: dayName,
        day_of_month: dayOfMonth,
        month_name: monthName,
        date_formatted: `${monthName} ${dayOfMonth}`,
        time_formatted: formatTime12Hour(s.time),
        // Explicit: "Monday the 9th" format for voice
        spoken_date: `${dayName} the ${dayOfMonth}${getOrdinalSuffix(parseInt(dayOfMonth))}`
      };
    });

    // Build voice-friendly message - only offer 2 options at a time
    const slotDescriptions = formattedSlots.slice(0, 2).map(s => s.formatted);
    let message = `I have ${slotDescriptions[0]}`;
    if (slotDescriptions.length > 1) {
      message += `, or ${slotDescriptions[1]}`;
    }
    message += '. Which works better for you?';
    if (formattedSlots.length > 2) {
      message += ' I have more options if neither works.';
    }

    res.json({
      success: true,
      available: true,
      requested_date_closed: isWeekendRequest || false,
      closed_reason: isWeekendRequest ? 'weekend' : null,
      slots: formattedSlots,
      services: services.map(s => s.name),
      total_duration_minutes: totalDuration,
      message: isWeekendRequest
        ? `We're closed on weekends. Our service department is open Monday through Friday. The closest I have is ${slotDescriptions[0]}${slotDescriptions.length > 1 ? `, or ${slotDescriptions[1]}` : ''}. Would either of those work?`
        : message
    });

  } catch (error) {
    logger.error('check_availability error:', { error });
    res.json({
      success: false,
      available: false,
      message: 'Sorry, I had trouble checking availability. Let me try again.'
    });
  }
});

/**
 * POST /api/voice/book_appointment
 * Nucleus AI function: Book an appointment
 */
router.post('/book_appointment', async (req, res, next) => {
  try {
    logger.info('book_appointment received:', { data: JSON.stringify(req.body) });

    // Helper to clean "null" strings from Nucleus AI
    const cleanNull = (val) => (val === 'null' || val === null || val === undefined || val === '') ? null : val;
    const isTemplateVar = (val) => typeof val === 'string' && (val.includes('{{') || val.includes('}}'));

    // Handle both direct params and nested args from Nucleus AI
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
    const call_id = cleanNull(body.call_id);

    logger.info('Parsed values:', { data: { customer_phone, service_ids, appointment_date, appointment_time, vehicle_year, vehicle_make, vehicle_model } });

    // Validate required fields (customer_phone can be missing if inbound webhook didn't set it)
    if (!customer_phone || !service_ids || !appointment_date || !appointment_time) {
      logger.info('Validation failed:', { data: { has_phone: !!customer_phone, has_services: !!service_ids, has_date: !!appointment_date, has_time: !!appointment_time } });
      const phoneMessage = !customer_phone
        ? 'I need the number you\'re calling from to complete the booking. Is this the best number for your account?'
        : 'I\'m missing some information. I need your phone number, the service you want, and your preferred date and time.';
      return res.json({
        success: false,
        booked: false,
        message: phoneMessage
      });
    }

    const normalizedPhone = normalizePhone(customer_phone);
    const serviceIdList = Array.isArray(service_ids) ? service_ids : [service_ids];

    // 1. Find or create customer
    let { data: customer } = await supabase
      .from('customers')
      .select(`
        id,
        first_name,
        email,
        vehicles (id)
      `)
      .eq('phone_normalized', normalizedPhone)
      .single();

    const hasExistingVehicle = customer?.vehicles?.length > 0;

    let customerEmail = customer_email;

    if (!customer) {
      // NEW CUSTOMER - require name and vehicle info!
      if (!customer_first_name) {
        logger.info('New customer missing name');
        return res.json({
          success: false,
          booked: false,
          missing_info: 'name',
          message: 'I just need to get your name before I book that. What\'s your first name?'
        });
      }

      if (!vehicle_year || !vehicle_make || !vehicle_model) {
        logger.info('New customer missing vehicle info');
        return res.json({
          success: false,
          booked: false,
          missing_info: 'vehicle',
          message: 'And what kind of car will you be bringing in? I\'ll need the year, make, and model.'
        });
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

      if (error) {
        logger.error('Error creating customer:', { error });
        throw error;
      }
      customer = newCustomer;
    } else {
      // Existing customer - check if their record is complete
      if (!customer.first_name && !customer_first_name) {
        logger.info('Existing customer missing name');
        return res.json({
          success: false,
          booked: false,
          missing_info: 'name',
          message: 'I have your number on file but need to get your name. What\'s your first name?'
        });
      }

      // Check if vehicle info is needed
      if (!hasExistingVehicle && !vehicle_id && (!vehicle_year || !vehicle_make || !vehicle_model)) {
        logger.info('Existing customer missing vehicle info');
        return res.json({
          success: false,
          booked: false,
          missing_info: 'vehicle',
          message: 'And what kind of car will you be bringing in? I\'ll need the year, make, and model.'
        });
      }

      // Update name if we have a new one and they didn't have one
      if (customer_first_name && !customer.first_name) {
        logger.info('Updating existing customer with name:', { data: { customer_first_name, customer_last_name } });
        await supabase
          .from('customers')
          .update({
            first_name: customer_first_name,
            last_name: customer_last_name
          })
          .eq('id', customer.id);
        customer.first_name = customer_first_name;
      }

      // Existing customer - update email if we have a new one and they didn't have one
      if (customer_email && !customer.email) {
        logger.info('Updating existing customer with email:', { data: customer_email });
        await supabase
          .from('customers')
          .update({ email: customer_email })
          .eq('id', customer.id);
        customer.email = customer_email;
      }
      // Use existing email if we don't have a new one
      customerEmail = customer_email || customer.email;
    }

    // 2. Handle vehicle
    let vehicleId = vehicle_id;
    let vehicleDescription = '';

    // Only create vehicle if we have valid year (> 1900), make, and model
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
        .from('vehicles')
        .select('year, make, model')
        .eq('id', vehicleId)
        .single();
      if (vehicle) {
        vehicleDescription = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
      }
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

    // 3b. Service department: Mon-Fri 7am-4pm only (no weekends, no after 4pm)
    const appointmentDay = new Date(appointment_date + 'T12:00:00').getDay();
    if (appointmentDay === 0 || appointmentDay === 6) {
      return res.json({
        success: false,
        booked: false,
        message: 'Our service department is closed on weekends. We\'re open Monday through Friday, 7 AM to 4 PM. Would you like a different day?'
      });
    }
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
      const latestFormatted = `${latestH > 12 ? latestH - 12 : latestH}:${String(latestM).padStart(2, '0')} ${latestH >= 12 ? 'PM' : 'AM'}`;
      return res.json({
        success: false,
        booked: false,
        message: `That service takes about ${totalDuration} minutes, which would run past our 4 PM close. The latest we could start it is ${latestFormatted}. Would you like that time instead?`
      });
    }

    // 4. Find available bay with enough consecutive slots for full appointment
    const bookingBayType = getBestBayType(services);
    const { data: compatibleBays } = await supabase
      .from('service_bays')
      .select('id')
      .eq('is_active', true)
      .eq('bay_type', bookingBayType);

    const compatibleBayIds = compatibleBays?.map(b => b.id) || [];
    const slotsNeeded = Math.ceil(totalDuration / 30);

    // Calculate all required slot times
    const [bookH, bookM] = appointment_time.split(':').map(Number);
    let bookMins = bookH * 60 + bookM;
    const requiredSlotTimes = [];
    for (let i = 0; i < slotsNeeded; i++) {
      requiredSlotTimes.push(`${String(Math.floor(bookMins / 60)).padStart(2, '0')}:${String(bookMins % 60).padStart(2, '0')}:00`);
      bookMins += 30;
    }

    // Find a bay that has ALL required consecutive slots available
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
      quoted_total: services.reduce((sum, s) => sum + (s.price_min || 0), 0),
      created_by: 'ai_agent',
      call_id,
      status: 'scheduled'
    };
    if (technicianId) appointmentPayload.technician_id = technicianId;

    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .insert(appointmentPayload)
      .select('id')
      .single();

    if (aptError) throw aptError;

    // 6. Add services to appointment
    await supabase
      .from('appointment_services')
      .insert(services.map(s => ({
        appointment_id: appointment.id,
        service_id: s.id,
        service_name: s.name,
        quoted_price: s.price_min,
        duration_minutes: s.duration_minutes
      })));

    // 6b. Link customer to call log if this came from a call
    if (call_id) {
      await supabase
        .from('call_logs')
        .update({
          customer_id: customer.id,
          appointment_id: appointment.id,
          outcome: 'booked'
        })
        .eq('retell_call_id', call_id);
    }

    // 7. Atomically book slots (prevents double-booking race condition)
    const { data: bookingResult, error: rpcError } = await supabase
      .rpc('book_appointment_slots', {
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
    const monthDay = format(date, 'MMMM d');
    const timeFormatted = formatTime12Hour(appointment_time);
    const serviceNames = services.map(s => s.name).join(' and ');

    const customerName = customer.first_name || customer_first_name || 'there';

    // 9. Send confirmation SMS (async, don't block response)
    sendConfirmationSMS({
      customerPhone: customer_phone,
      customerName,
      appointmentDate: appointment_date,
      appointmentTime: appointment_time,
      services: serviceNames,
      vehicleDescription,
      customerId: customer.id,
      appointmentId: appointment.id
    }).then(result => {
      if (result.success) {
        // Mark confirmation as sent
        supabase
          .from('appointments')
          .update({ confirmation_sent_at: new Date().toISOString() })
          .eq('id', appointment.id)
          .then(() => logger.info('[SMS] Confirmation sent for appointment', { data: appointment.id }));
      }
    }).catch(err => logger.error('SMS confirmation error:', { error: err }));

    // 10. Send confirmation email if we have an email address
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
        if (result.success) {
          logger.info('[Email] Confirmation sent for appointment', { data: appointment.id });
        }
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
});

/**
 * POST /api/voice/modify_appointment
 * Nucleus AI function: Cancel or reschedule appointment
 */
router.post('/modify_appointment', async (req, res, next) => {
  try {
    logger.info('modify_appointment received:', { data: JSON.stringify(req.body) });

    // Handle both direct params and nested args from Nucleus AI
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

    // Get current appointment
    const { data: appointment } = await supabase
      .from('appointments')
      .select(`
        *,
        customer:customers (first_name),
        appointment_services (service_name)
      `)
      .eq('id', appointment_id)
      .single();

    if (!appointment) {
      return res.json({
        success: false,
        message: 'I couldn\'t find that appointment. Could you verify the details?'
      });
    }

    if (action === 'cancel') {
      // Free up slots atomically
      await supabase.rpc('free_appointment_slots', { p_appointment_id: appointment_id });

      // Update status
      await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          internal_notes: `Cancelled via AI: ${reason || 'No reason provided'}`
        })
        .eq('id', appointment_id);

      // Send cancellation SMS
      try {
        const { sendCancellationSMS } = await import('../../services/sms.js');

        // Get customer info for SMS
        const { data: fullAppointment } = await supabase
          .from('appointments')
          .select(`
            scheduled_date,
            scheduled_time,
            customer:customers (id, first_name, phone),
            appointment_services (service_name)
          `)
          .eq('id', appointment_id)
          .single();

        if (fullAppointment && fullAppointment.customer) {
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
        // Don't fail the cancellation if SMS fails
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

      // Service department: Mon-Fri 7am-4pm only
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
      // Check if appointment would end past close
      const apptDuration = appointment.estimated_duration_minutes || 60;
      if (newStartMins + apptDuration > 16 * 60) {
        const latestMins = 16 * 60 - apptDuration;
        const lH = Math.floor(latestMins / 60);
        const lM = latestMins % 60;
        const latestStr = `${lH > 12 ? lH - 12 : lH}:${String(lM).padStart(2, '0')} ${lH >= 12 ? 'PM' : 'AM'}`;
        return res.json({
          success: false,
          message: `Your service takes about ${apptDuration} minutes, which would run past our 4 PM close. The latest start time is ${latestStr}. Would that work?`
        });
      }

      // Get service IDs from the appointment to find correct bay type
      const { data: appointmentServices } = await supabase
        .from('appointment_services')
        .select('service_id')
        .eq('appointment_id', appointment_id);

      if (!appointmentServices || appointmentServices.length === 0) {
        return res.json({
          success: false,
          message: 'I couldn\'t find the service details. Let me help you book a new appointment instead.'
        });
      }

      // Get the required bay type from the first service
      const { data: service } = await supabase
        .from('services')
        .select('required_bay_type')
        .eq('id', appointmentServices[0].service_id)
        .single();

      // Get compatible bays
      const { data: bays } = await supabase
        .from('service_bays')
        .select('id')
        .eq('is_active', true)
        .eq('bay_type', service?.required_bay_type || 'standard');

      const bayIds = bays?.map(b => b.id) || [];

      // Check availability - handle time format with or without seconds
      const timeWithSeconds = new_time.includes(':') && new_time.split(':').length === 2
        ? `${new_time}:00`
        : new_time;

      logger.info('Checking slot availability:', { data: { date: new_date, time: timeWithSeconds, bayIds } });

      const { data: slot, error: slotError } = await supabase
        .from('time_slots')
        .select('bay_id')
        .eq('slot_date', new_date)
        .eq('start_time', timeWithSeconds)
        .eq('is_available', true)
        .in('bay_id', bayIds)
        .limit(1)
        .single();

      logger.info('Slot check result:', { data: { slot, error: slotError } });

      if (!slot) {
        return res.json({
          success: false,
          message: 'That time isn\'t available. Would you like me to check for other options?'
        });
      }

      // Free old slots atomically
      await supabase.rpc('free_appointment_slots', { p_appointment_id: appointment_id });

      // Atomically book new slots (prevents double-booking race condition)
      const { data: bookingResult, error: rpcError } = await supabase
        .rpc('book_appointment_slots', {
          p_bay_id: slot.bay_id,
          p_date: new_date,
          p_start_time: new_time,
          p_duration_minutes: appointment.estimated_duration_minutes,
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

      // Update appointment record
      await supabase
        .from('appointments')
        .update({
          scheduled_date: new_date,
          scheduled_time: new_time,
          bay_id: slot.bay_id
        })
        .eq('id', appointment_id);

      // Send updated confirmation SMS (async, don't block response)
      const { data: aptForSms } = await supabase
        .from('appointments')
        .select(`
          scheduled_date,
          scheduled_time,
          customer:customers (id, first_name, phone),
          appointment_services (service_name),
          vehicle:vehicles (year, make, model)
        `)
        .eq('id', appointment_id)
        .single();
      // Check if caller wants SMS sent to a different number
      const send_to_phone = req.body.send_to_phone || req.body.args?.send_to_phone;

      if (aptForSms?.customer) {
        const services = aptForSms.appointment_services?.map(s => s.service_name).join(', ') || '';
        const vehicleDesc = aptForSms.vehicle
          ? `${aptForSms.vehicle.year} ${aptForSms.vehicle.make} ${aptForSms.vehicle.model}`
          : null;
        // Use send_to_phone if provided, otherwise use customer's phone on file
        const targetPhone = send_to_phone ? normalizePhone(send_to_phone) : aptForSms.customer.phone;
        sendConfirmationSMS({
          customerPhone: targetPhone,
          customerName: aptForSms.customer.first_name,
          appointmentDate: aptForSms.scheduled_date,
          appointmentTime: aptForSms.scheduled_time,
          services,
          vehicleDescription: vehicleDesc,
          customerId: aptForSms.customer.id,
          appointmentId: appointment_id
        }).then(() => {
          supabase.from('appointments').update({ confirmation_sent_at: new Date().toISOString() }).eq('id', appointment_id).then(() => {});
        }).catch(err => logger.error('Reschedule confirmation SMS error:', { error: err }));
      }

      const date = parseISO(new_date);
      const smsNote = send_to_phone ? ` I'm sending the confirmation to ${formatPhone(send_to_phone)}.` : '';

      return res.json({
        success: true,
        action: 'rescheduled',
        new_date,
        new_time,
        message: `I've rescheduled your appointment to ${format(date, 'EEEE, MMMM d')} at ${formatTime12Hour(new_time)}.${smsNote} You'll get a text with the updated details.`
      });
    }

    if (action === 'add_services') {
      const service_ids = req.body.service_ids || req.body.args?.service_ids;

      logger.info('[add_services] Received service_ids:', { data: JSON.stringify(service_ids) });

      if (!service_ids || !Array.isArray(service_ids) || service_ids.length === 0) {
        logger.info('[add_services] No service_ids provided');
        return res.json({
          success: false,
          message: 'Which service would you like to add?'
        });
      }

      // Get service details - use a simpler query approach
      logger.info('[add_services] Looking up services:', { data: service_ids });
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .in('id', service_ids);

      logger.info('[add_services] Query result:', { data: { services: JSON.stringify(services), error: servicesError } });

      if (servicesError) {
        logger.error('[add_services] Supabase error:', { error: servicesError });
        return res.json({
          success: false,
          message: 'I had trouble looking up that service. Let me transfer you to a service advisor.'
        });
      }

      if (!services || services.length === 0) {
        logger.info('[add_services] No services found for IDs:', { data: service_ids });
        return res.json({
          success: false,
          message: 'I couldn\'t find that service. Could you tell me what you\'d like to add?'
        });
      }

      // Add each service to appointment_services
      const newServices = services.map(svc => ({
        appointment_id,
        service_id: svc.id,
        service_name: svc.name,
        quoted_price: svc.price_min,
        duration_minutes: svc.duration_minutes
      }));

      const { error: insertError } = await supabase
        .from('appointment_services')
        .insert(newServices);

      if (insertError) {
        logger.error('Error adding services:', { error: insertError });
        return res.json({
          success: false,
          message: 'I had trouble adding that service. Let me transfer you to a service advisor.'
        });
      }

      // Calculate new totals
      const additionalDuration = services.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
      const additionalPrice = services.reduce((sum, s) => sum + (s.price_min || 0), 0);

      // Update appointment totals
      await supabase
        .from('appointments')
        .update({
          estimated_duration_minutes: (appointment.estimated_duration_minutes || 0) + additionalDuration,
          quoted_total: (appointment.quoted_total || 0) + additionalPrice
        })
        .eq('id', appointment_id);

      // Book additional time slots if needed
      const additionalSlots = Math.ceil(additionalDuration / 30);
      if (additionalSlots > 0) {
        const currentEndTime = addMinutesToTime(appointment.scheduled_time, appointment.estimated_duration_minutes || 30);
        const slotTimes = [];
        const [h, m] = currentEndTime.split(':').map(Number);
        let mins = h * 60 + m;

        for (let i = 0; i < additionalSlots; i++) {
          slotTimes.push(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:00`);
          mins += 30;
        }

        await supabase
          .from('time_slots')
          .update({ is_available: false, appointment_id })
          .eq('slot_date', appointment.scheduled_date)
          .eq('bay_id', appointment.bay_id)
          .in('start_time', slotTimes);
      }

      // Send updated confirmation SMS (async, don't block response)
      const { data: aptForSms } = await supabase
        .from('appointments')
        .select(`
          scheduled_date,
          scheduled_time,
          customer:customers (id, first_name, phone),
          appointment_services (service_name),
          vehicle:vehicles (year, make, model)
        `)
        .eq('id', appointment_id)
        .single();
      if (aptForSms?.customer) {
        const servicesList = aptForSms.appointment_services?.map(s => s.service_name).join(', ') || '';
        const vehicleDesc = aptForSms.vehicle
          ? `${aptForSms.vehicle.year} ${aptForSms.vehicle.make} ${aptForSms.vehicle.model}`
          : null;
        sendConfirmationSMS({
          customerPhone: aptForSms.customer.phone,
          customerName: aptForSms.customer.first_name,
          appointmentDate: aptForSms.scheduled_date,
          appointmentTime: aptForSms.scheduled_time,
          services: servicesList,
          vehicleDescription: vehicleDesc,
          customerId: aptForSms.customer.id,
          appointmentId: appointment_id
        }).then(() => {
          supabase.from('appointments').update({ confirmation_sent_at: new Date().toISOString() }).eq('id', appointment_id).then(() => {});
        }).catch(err => logger.error('Add-services confirmation SMS error:', { error: err }));
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
});

// Send confirmation SMS
router.post('/send_confirmation', async (req, res, next) => {
  try {
    logger.info('send_confirmation received:', { data: JSON.stringify(req.body) });

    const appointment_id = req.body.appointment_id || req.body.args?.appointment_id;
    const customer_phone = req.body.customer_phone || req.body.args?.customer_phone;
    // Optional: send to a different phone number than on file
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
      // Get appointment by ID
      const result = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          quoted_total,
          customer:customers (id, first_name, last_name, phone, email),
          appointment_services (service_name),
          vehicle:vehicles (year, make, model)
        `)
        .eq('id', appointment_id)
        .single();

      appointment = result.data;
      error = result.error;
    } else {
      // Find customer first, then get their next appointment
      const normalizedPhone = normalizePhone(customer_phone);
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone_normalized', normalizedPhone)
        .single();

      if (!customer) {
        return res.json({
          success: false,
          message: 'I couldn\'t find your account to send the confirmation.'
        });
      }

      const result = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          quoted_total,
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

    // Import SMS service dynamically
    const { sendConfirmationSMS } = await import('../../services/sms.js');

    const services = appointment.appointment_services.map(s => s.service_name).join(', ');
    const vehicleDesc = appointment.vehicle
      ? `${appointment.vehicle.year} ${appointment.vehicle.make} ${appointment.vehicle.model}`
      : null;

    // Use send_to_phone if provided, otherwise use customer's phone on file
    const targetPhone = send_to_phone ? normalizePhone(send_to_phone) : appointment.customer.phone;

    const result = await sendConfirmationSMS({
      customerPhone: targetPhone,
      customerName: appointment.customer.first_name,
      appointmentDate: appointment.scheduled_date,
      appointmentTime: appointment.scheduled_time,
      services,
      vehicleDescription: vehicleDesc,
      customerId: appointment.customer.id,
      appointmentId: appointment.id
    });

    if (result.success) {
      return res.json({
        success: true,
        message: 'I\'ve sent you a confirmation text with all the details.'
      });
    } else {
      const payload = {
        success: false,
        message: 'I wasn\'t able to send the text right now, but your appointment is confirmed. You can write down the details if you\'d like.'
      };
      // Expose underlying reason for tests/ops (e.g. "Twilio not configured" or Twilio API error)
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
});

export default router;
