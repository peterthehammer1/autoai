import { Router } from 'express';
import { supabase, normalizePhone, formatPhone } from '../config/database.js';
import { format, parseISO, addDays } from 'date-fns';
import { sendConfirmationSMS } from '../services/sms.js';

const router = Router();

/**
 * POST /api/retell/lookup_customer
 * Retell function: Look up customer by phone
 */
router.post('/lookup_customer', async (req, res, next) => {
  try {
    console.log('lookup_customer received:', JSON.stringify(req.body));
    
    // Handle both direct params and nested args from Retell
    const phone_number = req.body.phone_number || req.body.args?.phone_number;

    if (!phone_number) {
      console.log('No phone_number found in request');
      return res.json({
        success: false,
        found: false,
        message: 'No customer found with this phone number. This appears to be a new customer.'
      });
    }

    const normalizedPhone = normalizePhone(phone_number);
    console.log('Looking up normalized phone:', normalizedPhone);

    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        id,
        first_name,
        last_name,
        email,
        total_visits,
        vehicles (
          id,
          year,
          make,
          model,
          color,
          mileage,
          is_primary
        )
      `)
      .eq('phone_normalized', normalizedPhone)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!customer) {
      return res.json({
        success: true,
        found: false,
        message: 'No customer found with this phone number. This appears to be a new customer.'
      });
    }

    // Get primary vehicle
    const primaryVehicle = customer.vehicles?.find(v => v.is_primary) || customer.vehicles?.[0];

    // Build response for voice agent
    let vehicleDescription = '';
    if (primaryVehicle) {
      vehicleDescription = `${primaryVehicle.year} ${primaryVehicle.make} ${primaryVehicle.model}`;
      if (primaryVehicle.color) {
        vehicleDescription = `${primaryVehicle.color} ${vehicleDescription}`;
      }
    }

    res.json({
      success: true,
      found: true,
      customer: {
        id: customer.id,
        first_name: customer.first_name,
        last_name: customer.last_name,
        full_name: [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Customer',
        email: customer.email,
        total_visits: customer.total_visits,
        is_returning: customer.total_visits > 0
      },
      primary_vehicle: primaryVehicle ? {
        id: primaryVehicle.id,
        description: vehicleDescription,
        year: primaryVehicle.year,
        make: primaryVehicle.make,
        model: primaryVehicle.model,
        mileage: primaryVehicle.mileage
      } : null,
      other_vehicles: customer.vehicles?.filter(v => !v.is_primary).map(v => ({
        id: v.id,
        description: `${v.year} ${v.make} ${v.model}`,
        year: v.year,
        make: v.make,
        model: v.model
      })) || [],
      message: customer.first_name 
        ? (vehicleDescription 
            ? `Welcome back, ${customer.first_name}! I see you have a ${vehicleDescription} on file.`
            : `Welcome back, ${customer.first_name}!`)
        : (vehicleDescription 
            ? `I found your account. I see you have a ${vehicleDescription} on file.`
            : `I found your account.`)
    });

  } catch (error) {
    console.error('lookup_customer error:', error);
    res.json({
      success: false,
      found: false,
      message: 'Sorry, I had trouble looking up your information. Can you provide your details?'
    });
  }
});

/**
 * POST /api/retell/get_services
 * Retell function: Get available services
 */
router.post('/get_services', async (req, res, next) => {
  try {
    const { category, search, mileage } = req.body;

    let query = supabase
      .from('services')
      .select(`
        id,
        name,
        description,
        duration_minutes,
        price_display,
        is_popular,
        mileage_interval
      `)
      .eq('is_active', true);

    if (category) {
      const { data: categoryData } = await supabase
        .from('service_categories')
        .select('id')
        .ilike('name', `%${category}%`)
        .single();

      if (categoryData) {
        query = query.eq('category_id', categoryData.id);
      }
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: services, error } = await query.order('is_popular', { ascending: false }).limit(10);

    if (error) throw error;

    // Format for voice agent
    const serviceList = services.map(s => ({
      id: s.id,
      name: s.name,
      duration: `${s.duration_minutes} minutes`,
      price: s.price_display,
      description: s.description
    }));

    // Mileage-based recommendations
    let recommendations = [];
    if (mileage) {
      const mileageNum = parseInt(mileage, 10);
      recommendations = services
        .filter(s => s.mileage_interval && (mileageNum % s.mileage_interval) <= 5000)
        .map(s => ({
          id: s.id,
          name: s.name,
          reason: `Due based on your ${mileageNum.toLocaleString()} km mileage`
        }));
    }

    res.json({
      success: true,
      services: serviceList,
      recommendations,
      message: services.length > 0 
        ? `I found ${services.length} services. ${services.slice(0, 3).map(s => s.name).join(', ')}${services.length > 3 ? ', and more' : ''}.`
        : 'I couldn\'t find any services matching that. Would you like me to list our most popular services?'
    });

  } catch (error) {
    console.error('get_services error:', error);
    res.json({
      success: false,
      services: [],
      message: 'Sorry, I had trouble retrieving our services. Let me try that again.'
    });
  }
});

/**
 * POST /api/retell/check_availability
 * Retell function: Check appointment availability
 */
router.post('/check_availability', async (req, res, next) => {
  try {
    console.log('check_availability received:', JSON.stringify(req.body));
    
    // Handle both direct params and nested args from Retell
    const service_ids = req.body.service_ids || req.body.args?.service_ids;
    const preferred_date = req.body.preferred_date || req.body.args?.preferred_date;
    const preferred_time = req.body.preferred_time || req.body.args?.preferred_time;
    const days_to_check = req.body.days_to_check || req.body.args?.days_to_check || 7;

    // Validate service_ids
    if (!service_ids || (Array.isArray(service_ids) && service_ids.length === 0)) {
      console.log('No service_ids found');
      return res.json({
        success: false,
        available: false,
        message: 'Please let me know what service you need so I can check availability.'
      });
    }

    const serviceIdList = Array.isArray(service_ids) ? service_ids : [service_ids];
    console.log('Looking for services:', serviceIdList);

    // Get services
    const { data: services, error: serviceError } = await supabase
      .from('services')
      .select('id, name, duration_minutes, required_bay_type')
      .in('id', serviceIdList);

    console.log('Services found:', services?.length, 'Error:', serviceError);

    if (serviceError || !services || services.length === 0) {
      return res.json({
        success: false,
        available: false,
        message: 'I couldn\'t find those services. Could you tell me what service you need?'
      });
    }

    const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
    const primaryBayType = services[0].required_bay_type;
    console.log('Total duration:', totalDuration, 'Bay type:', primaryBayType);

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
    const today = new Date();
    let startDate = today;
    
    if (preferred_date) {
      const requestedDate = parseISO(preferred_date);
      // If requested date is in the past, use today instead
      startDate = requestedDate > today ? requestedDate : today;
    }
    
    const endDate = addDays(startDate, parseInt(days_to_check, 10));
    console.log('Date range:', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));

    // Time filter
    let timeStart = '07:00';
    let timeEnd = '18:00';
    if (preferred_time === 'morning') {
      timeEnd = '12:00';
    } else if (preferred_time === 'afternoon') {
      timeStart = '12:00';
    }

    // Get available slots
    const { data: slots, error: slotError } = await supabase
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

    // Find consecutive slots for appointment duration
    const slotsNeeded = Math.ceil(totalDuration / 30);
    const availableWindows = [];
    const slotsByDateBay = {};

    for (const slot of slots) {
      const key = `${slot.slot_date}_${slot.bay_id}`;
      if (!slotsByDateBay[key]) slotsByDateBay[key] = [];
      slotsByDateBay[key].push(slot);
    }

    for (const [key, baySlots] of Object.entries(slotsByDateBay)) {
      const [slotDate] = key.split('_');
      baySlots.sort((a, b) => a.start_time.localeCompare(b.start_time));

      for (let i = 0; i <= baySlots.length - slotsNeeded; i++) {
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

    // Remove duplicates and limit
    const uniqueSlots = [];
    const seen = new Set();
    for (const slot of availableWindows) {
      const key = `${slot.date}_${slot.time}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSlots.push(slot);
      }
      if (uniqueSlots.length >= 4) break; // Keep 4 for backup options
    }

    if (uniqueSlots.length === 0) {
      return res.json({
        success: true,
        available: false,
        slots: [],
        message: `I'm sorry, I don't have any openings in the next ${days_to_check} days for that time preference. Would you like me to check other times or dates?`
      });
    }

    // Format for voice
    const formattedSlots = uniqueSlots.map(s => {
      const date = parseISO(s.date);
      return {
        ...s,
        formatted: `${format(date, 'EEEE, MMMM d')} at ${formatTime12Hour(s.time)}`,
        day_name: format(date, 'EEEE'),
        date_formatted: format(date, 'MMMM d'),
        time_formatted: formatTime12Hour(s.time)
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
      slots: formattedSlots,
      services: services.map(s => s.name),
      total_duration_minutes: totalDuration,
      message
    });

  } catch (error) {
    console.error('check_availability error:', error);
    res.json({
      success: false,
      available: false,
      message: 'Sorry, I had trouble checking availability. Let me try again.'
    });
  }
});

/**
 * POST /api/retell/book_appointment
 * Retell function: Book an appointment
 */
router.post('/book_appointment', async (req, res, next) => {
  try {
    console.log('book_appointment received:', JSON.stringify(req.body));
    
    // Helper to clean "null" strings from Retell
    const cleanNull = (val) => (val === 'null' || val === null || val === undefined || val === '') ? null : val;
    
    // Handle both direct params and nested args from Retell
    const body = req.body.args || req.body;
    
    const customer_phone = cleanNull(body.customer_phone);
    const customer_first_name = cleanNull(body.customer_first_name);
    const customer_last_name = cleanNull(body.customer_last_name);
    const customer_email = cleanNull(body.customer_email);
    const vehicle_year = cleanNull(body.vehicle_year);
    const vehicle_make = cleanNull(body.vehicle_make);
    const vehicle_model = cleanNull(body.vehicle_model);
    const vehicle_mileage = cleanNull(body.vehicle_mileage);
    const vehicle_id = cleanNull(body.vehicle_id);
    const service_ids = body.service_ids;
    const appointment_date = cleanNull(body.appointment_date);
    const appointment_time = cleanNull(body.appointment_time);
    const loaner_requested = body.loaner_requested;
    const shuttle_requested = body.shuttle_requested;
    const notes = cleanNull(body.notes);
    const call_id = cleanNull(body.call_id);

    console.log('Parsed values:', { customer_phone, service_ids, appointment_date, appointment_time, vehicle_year, vehicle_make, vehicle_model });

    // Validate required fields
    if (!customer_phone || !service_ids || !appointment_date || !appointment_time) {
      console.log('Validation failed:', { 
        has_phone: !!customer_phone, 
        has_services: !!service_ids, 
        has_date: !!appointment_date, 
        has_time: !!appointment_time 
      });
      return res.json({
        success: false,
        booked: false,
        message: 'I\'m missing some information. I need your phone number, the service you want, and your preferred date and time.'
      });
    }

    const normalizedPhone = normalizePhone(customer_phone);
    const serviceIdList = Array.isArray(service_ids) ? service_ids : [service_ids];

    // 1. Find or create customer
    let { data: customer } = await supabase
      .from('customers')
      .select('id, first_name')
      .eq('phone_normalized', normalizedPhone)
      .single();

    if (!customer) {
      console.log('Creating new customer:', { customer_first_name, customer_last_name, customer_phone });
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
          phone: customer_phone,
          first_name: customer_first_name,
          last_name: customer_last_name,
          email: customer_email
        })
        .select('id, first_name')
        .single();

      if (error) {
        console.error('Error creating customer:', error);
        throw error;
      }
      customer = newCustomer;
    }

    // 2. Handle vehicle
    let vehicleId = vehicle_id;
    let vehicleDescription = '';

    // Only create vehicle if we have valid year (> 1900), make, and model
    const validYear = vehicle_year && parseInt(vehicle_year) > 1900;
    
    if (!vehicleId && validYear && vehicle_make && vehicle_model) {
      console.log('Creating new vehicle:', { vehicle_year, vehicle_make, vehicle_model });
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
        console.log('Vehicle created:', vehicleDescription);
      } else {
        console.log('Vehicle creation failed:', error);
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
      .select('id, name, duration_minutes, price_min, required_bay_type')
      .in('id', serviceIdList);

    if (serviceError || !services?.length) {
      return res.json({
        success: false,
        booked: false,
        message: 'I couldn\'t find those services. Could you tell me again what service you need?'
      });
    }

    const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);

    // 4. Find available bay
    const { data: availableSlot } = await supabase
      .from('time_slots')
      .select('bay_id')
      .eq('slot_date', appointment_date)
      .eq('start_time', `${appointment_time}:00`)
      .eq('is_available', true)
      .limit(1)
      .single();

    if (!availableSlot) {
      return res.json({
        success: false,
        booked: false,
        message: 'I\'m sorry, that time slot was just taken. Would you like me to find another available time?'
      });
    }

    // 5. Create appointment
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .insert({
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
      })
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

    // 7. Mark slots as booked
    const slotsNeeded = Math.ceil(totalDuration / 30);
    const slotTimes = [];
    const [h, m] = appointment_time.split(':').map(Number);
    let mins = h * 60 + m;

    for (let i = 0; i < slotsNeeded; i++) {
      slotTimes.push(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:00`);
      mins += 30;
    }

    await supabase
      .from('time_slots')
      .update({ is_available: false, appointment_id: appointment.id })
      .eq('slot_date', appointment_date)
      .eq('bay_id', availableSlot.bay_id)
      .in('start_time', slotTimes);

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
          .then(() => console.log('[SMS] Confirmation sent for appointment', appointment.id));
      }
    }).catch(err => console.error('SMS confirmation error:', err));

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
      message: `Perfect, ${customerName}! I've booked your ${serviceNames} appointment for ${dayName}, ${monthDay} at ${timeFormatted}${vehicleDescription ? ` for your ${vehicleDescription}` : ''}. We'll send you a confirmation text shortly. Is there anything else I can help you with?`
    });

  } catch (error) {
    console.error('book_appointment error:', error);
    res.json({
      success: false,
      booked: false,
      message: 'I\'m sorry, I encountered an error while booking. Let me try that again, or I can transfer you to a service advisor.'
    });
  }
});

/**
 * POST /api/retell/get_customer_appointments
 * Retell function: Get customer's appointments
 */
router.post('/get_customer_appointments', async (req, res, next) => {
  try {
    const { customer_phone, status = 'upcoming' } = req.body;

    if (!customer_phone) {
      return res.json({
        success: false,
        message: 'I need your phone number to look up your appointments.'
      });
    }

    const normalizedPhone = normalizePhone(customer_phone);

    // Get customer
    const { data: customer } = await supabase
      .from('customers')
      .select('id, first_name')
      .eq('phone_normalized', normalizedPhone)
      .single();

    if (!customer) {
      return res.json({
        success: true,
        appointments: [],
        message: 'I don\'t have any appointments on file for that phone number. Would you like to book a new appointment?'
      });
    }

    // Get appointments
    let query = supabase
      .from('appointments')
      .select(`
        id,
        scheduled_date,
        scheduled_time,
        status,
        vehicle:vehicles (year, make, model),
        appointment_services (service_name)
      `)
      .eq('customer_id', customer.id)
      .order('scheduled_date')
      .order('scheduled_time');

    const today = format(new Date(), 'yyyy-MM-dd');
    if (status === 'upcoming') {
      query = query.gte('scheduled_date', today).not('status', 'in', '("cancelled","completed","no_show")');
    }

    const { data: appointments } = await query.limit(5);

    if (!appointments || appointments.length === 0) {
      return res.json({
        success: true,
        appointments: [],
        message: `${customer.first_name ? customer.first_name + ', you' : 'You'} don't have any upcoming appointments. Would you like to schedule one?`
      });
    }

    // Format for voice
    const formatted = appointments.map(apt => {
      const date = parseISO(apt.scheduled_date);
      const services = apt.appointment_services.map(s => s.service_name).join(', ');
      const vehicle = apt.vehicle ? `${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}` : '';

      return {
        id: apt.id,
        date: apt.scheduled_date,
        time: apt.scheduled_time,
        status: apt.status,
        formatted: `${format(date, 'EEEE, MMMM d')} at ${formatTime12Hour(apt.scheduled_time)}`,
        services,
        vehicle
      };
    });

    const apt = formatted[0];
    let message = `${customer.first_name ? customer.first_name + ', your' : 'Your'} next appointment is on ${apt.formatted} for ${apt.services}.`;
    if (formatted.length > 1) {
      message += ` You also have ${formatted.length - 1} more appointment${formatted.length > 2 ? 's' : ''} scheduled.`;
    }

    res.json({
      success: true,
      appointments: formatted,
      message
    });

  } catch (error) {
    console.error('get_customer_appointments error:', error);
    res.json({
      success: false,
      message: 'Sorry, I had trouble looking up your appointments. Let me try again.'
    });
  }
});

/**
 * POST /api/retell/modify_appointment
 * Retell function: Cancel or reschedule appointment
 */
router.post('/modify_appointment', async (req, res, next) => {
  try {
    const { appointment_id, action, new_date, new_time, reason } = req.body;

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
      // Free up slots
      await supabase
        .from('time_slots')
        .update({ is_available: true, appointment_id: null })
        .eq('appointment_id', appointment_id);

      // Update status
      await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled', 
          internal_notes: `Cancelled via AI: ${reason || 'No reason provided'}`
        })
        .eq('id', appointment_id);

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

      // Check availability
      const { data: slot } = await supabase
        .from('time_slots')
        .select('bay_id')
        .eq('slot_date', new_date)
        .eq('start_time', `${new_time}:00`)
        .eq('is_available', true)
        .single();

      if (!slot) {
        return res.json({
          success: false,
          message: 'That time isn\'t available. Would you like me to check for other options?'
        });
      }

      // Free old slots
      await supabase
        .from('time_slots')
        .update({ is_available: true, appointment_id: null })
        .eq('appointment_id', appointment_id);

      // Update appointment
      await supabase
        .from('appointments')
        .update({
          scheduled_date: new_date,
          scheduled_time: new_time,
          bay_id: slot.bay_id
        })
        .eq('id', appointment_id);

      // Book new slots
      const slotsNeeded = Math.ceil(appointment.estimated_duration_minutes / 30);
      const slotTimes = [];
      const [h, m] = new_time.split(':').map(Number);
      let mins = h * 60 + m;

      for (let i = 0; i < slotsNeeded; i++) {
        slotTimes.push(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:00`);
        mins += 30;
      }

      await supabase
        .from('time_slots')
        .update({ is_available: false, appointment_id })
        .eq('slot_date', new_date)
        .eq('bay_id', slot.bay_id)
        .in('start_time', slotTimes);

      const date = parseISO(new_date);

      return res.json({
        success: true,
        action: 'rescheduled',
        new_date,
        new_time,
        message: `I've rescheduled your appointment to ${format(date, 'EEEE, MMMM d')} at ${formatTime12Hour(new_time)}. We'll send you an updated confirmation.`
      });
    }

    res.json({
      success: false,
      message: 'I can cancel or reschedule your appointment. Which would you like to do?'
    });

  } catch (error) {
    console.error('modify_appointment error:', error);
    res.json({
      success: false,
      message: 'Sorry, I had trouble with that request. Would you like me to transfer you to a service advisor?'
    });
  }
});

// Helper functions
function addMinutesToTime(timeStr, minutes) {
  const [hours, mins] = timeStr.split(':').map(Number);
  const totalMins = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMins / 60);
  const newMins = totalMins % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}:00`;
}

function formatTime12Hour(timeStr) {
  const [hours, mins] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(mins).padStart(2, '0')} ${period}`;
}

export default router;
