import { Router } from 'express';
import { supabase, normalizePhone, formatPhone } from '../config/database.js';
import { format, parseISO, addDays } from 'date-fns';
import { sendConfirmationSMS } from '../services/sms.js';
import { sendConfirmationEmail } from '../services/email.js';

const router = Router();

/**
 * POST /api/voice/lookup_customer
 * Nucleus AI function: Look up customer by phone
 */
router.post('/lookup_customer', async (req, res, next) => {
  try {
    console.log('lookup_customer received:', JSON.stringify(req.body));
    
    // Handle both direct params and nested args from Nucleus AI
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
 * POST /api/voice/get_services
 * Nucleus AI function: Get available services
 */
router.post('/get_services', async (req, res, next) => {
  try {
    const { category, search, mileage } = req.body.args || req.body;

    // Normalize search terms - map common synonyms to service names
    const synonymMap = {
      'air conditioner': 'A/C',
      'air conditioning': 'A/C',
      'ac': 'A/C',
      'a.c.': 'A/C',
      'a.c': 'A/C',
      'cooling': 'A/C',
      'coolant': 'Coolant',
      'antifreeze': 'Coolant',
      'heater': 'Heating',
      'heat': 'Heating',
      'alignment': 'Wheel Alignment',
      'align': 'Wheel Alignment',
      'rotate': 'Tire Rotation',
      'rotation': 'Tire Rotation',
      'balance': 'Tire',
      'balancing': 'Tire',
      'battery': 'Battery',
      'dead battery': 'Battery',
      'check engine': 'Check Engine',
      'warning light': 'Check Engine',
      'engine light': 'Check Engine',
      'diagnostic': 'Check Engine',
      'transmission': 'Transmission',
      'trans fluid': 'Transmission',
      'wiper': 'Wiper',
      'wipers': 'Wiper',
      'windshield wipers': 'Wiper',
      'exhaust': 'Exhaust',
      'muffler': 'Muffler',
      'loud exhaust': 'Exhaust',
      'rumbling': 'Exhaust',
      'catalytic converter': 'Catalytic',
      'spark plug': 'Spark Plug',
      'spark plugs': 'Spark Plug',
      'tune up': 'Spark Plug',
      'tune-up': 'Spark Plug',
      'timing belt': 'Timing Belt',
      'water pump': 'Water Pump',
      'thermostat': 'Thermostat',
      'radiator': 'Radiator',
      'overheating': 'Radiator',
      'engine air filter': 'Engine Air Filter',
      'cabin filter': 'Cabin Air Filter',
      'cabin air filter': 'Cabin Air Filter',
      'emissions': 'Emissions',
      'emissions test': 'Emissions',
      'drive clean': 'Emissions',
      'safety inspection': 'Safety Inspection',
      'inspection': 'Safety Inspection',
      'pre-purchase': 'Pre-Purchase',
      'used car inspection': 'Pre-Purchase',
      'struts': 'Strut',
      'shocks': 'Shock',
      'suspension': 'Suspension',
      'wheel bearing': 'Wheel Bearing',
      'control arm': 'Control Arm',
      'sway bar': 'Sway Bar',
      'starter': 'Starter',
      'won\'t start': 'Starter',
      'alternator': 'Alternator',
      'brake caliper': 'Brake Caliper',
      'caliper': 'Brake Caliper',
      'abs': 'ABS',
      'abs sensor': 'ABS'
    };

    // Apply synonym mapping
    let normalizedSearch = search;
    if (search) {
      const searchLower = search.toLowerCase().trim();
      for (const [synonym, replacement] of Object.entries(synonymMap)) {
        if (searchLower.includes(synonym)) {
          normalizedSearch = replacement;
          break;
        }
      }
    }

    let query = supabase
      .from('services')
      .select(`
        id,
        name,
        description,
        duration_minutes,
        price_min,
        price_display,
        is_popular,
        mileage_interval,
        category:service_categories(name)
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

    if (normalizedSearch) {
      query = query.or(`name.ilike.%${normalizedSearch}%,description.ilike.%${normalizedSearch}%`);
    }

    let { data: services, error } = await query.order('is_popular', { ascending: false }).limit(15);

    if (error) throw error;

    // Fallback: "diagnostic" / "check engine" map to "Check Engine" but DB may have "Diagnosis" in name
    if (services.length === 0 && normalizedSearch === 'Check Engine') {
      const { data: fallbackServices } = await supabase
        .from('services')
        .select('id, name, description, duration_minutes, price_min, price_display, is_popular, mileage_interval, category:service_categories(name)')
        .eq('is_active', true)
        .ilike('name', '%Diagnosis%')
        .order('is_popular', { ascending: false })
        .limit(15);
      if (fallbackServices?.length) services = fallbackServices;
    }

    // Check if this is an oil change search
    const searchLower = (search || '').toLowerCase();
    const oilChangeTerms = ['oil change', 'oil', 'oil service'];
    const isOilChangeSearch = oilChangeTerms.some(term => searchLower.includes(term));
    
    // Check if user specified a type
    const specifiedTypes = ['conventional', 'synthetic blend', 'full synthetic', 'high mileage', 'diesel'];
    const typeAlreadySpecified = specifiedTypes.some(type => searchLower.includes(type));
    
    // For generic "oil change" requests, default to Synthetic Blend (don't ask for clarification)
    let oilChangeOptions = [];
    let needsClarification = false;
    
    // If they just said "oil change" without specifying type, return Synthetic Blend as the default
    if (isOilChangeSearch && !typeAlreadySpecified && services.length === 0) {
      // Search specifically for synthetic blend
      const { data: defaultOilChange } = await supabase
        .from('services')
        .select('id, name, category_id, description, duration_minutes, price_min, price_max, price_display')
        .eq('is_active', true)
        .ilike('name', '%Synthetic Blend Oil Change%')
        .single();
      
      if (defaultOilChange) {
        services = [defaultOilChange];
      }
    }

    // Format for voice agent - use voice-friendly price_display
    const serviceList = services.map(s => ({
      id: s.id,
      name: s.name,
      duration: `${s.duration_minutes} minutes`,
      price: s.price_display, // This is now voice-friendly like "forty dollars"
      price_numeric: s.price_min,
      description: s.description,
      category: s.category?.name
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

    // If no services found and we had a search term, get popular services as suggestions
    let suggestions = [];
    let notFoundMessage = null;
    
    if (services.length === 0 && search) {
      const { data: popularServices } = await supabase
        .from('services')
        .select(`
          id,
          name,
          description,
          duration_minutes,
          price_display,
          category:service_categories(name)
        `)
        .eq('is_active', true)
        .eq('is_popular', true)
        .limit(5);

      suggestions = (popularServices || []).map(s => ({
        id: s.id,
        name: s.name,
        duration: `${s.duration_minutes} minutes`,
        price: s.price_display,
        category: s.category?.name
      }));

      const { data: categories } = await supabase
        .from('service_categories')
        .select('name')
        .eq('is_active', true);

      const categoryNames = (categories || []).map(c => c.name).join(', ');
      
      notFoundMessage = `I'm sorry, we don't currently offer "${search}" as a service. Our service categories include: ${categoryNames}. Would any of these work for you, or would you like me to list our most popular services?`;
    }

    // Build message - simple and direct
    let message;
    if (services.length > 0) {
      message = `I found ${services.length} services. ${services.slice(0, 3).map(s => s.name).join(', ')}${services.length > 3 ? ', and more' : ''}.`;
    } else {
      message = notFoundMessage || 'Would you like me to list our available services?';
    }

    res.json({
      success: true,
      services: serviceList,
      recommendations,
      suggestions,
      needs_clarification: needsClarification,
      clarification_options: oilChangeOptions,
      service_not_found: services.length === 0 && search ? true : false,
      searched_for: search || null,
      message
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
 * POST /api/voice/check_availability
 * Nucleus AI function: Check appointment availability
 */
router.post('/check_availability', async (req, res, next) => {
  try {
    console.log('check_availability received:', JSON.stringify(req.body));
    
    // Handle both direct params and nested args from Nucleus AI
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
    
    // Use 14 days by default for wider search range
    const searchDays = parseInt(days_to_check, 10) || 14;
    const endDate = addDays(startDate, searchDays);
    console.log('Date range:', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));

    // Service department hours: Mon-Fri 7am-4pm only (no evenings, no weekends)
    let timeStart = '07:00';
    let timeEnd = '16:00';
    if (preferred_time === 'morning') {
      timeEnd = '12:00';
    } else if (preferred_time === 'afternoon') {
      timeStart = '12:00';
    }

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
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const todayStr = format(now, 'yyyy-MM-dd');
    
    for (const [key, baySlots] of Object.entries(slotsByDateBay)) {
      const [slotDate] = key.split('_');
      baySlots.sort((a, b) => a.start_time.localeCompare(b.start_time));

      for (let i = 0; i <= baySlots.length - slotsNeeded; i++) {
        const slotTime = baySlots[i].start_time;
        const [slotHour, slotMinute] = slotTime.split(':').map(Number);
        
        // Skip slots that have already passed today
        if (slotDate === todayStr) {
          // Add 30 min buffer - don't offer slots less than 30 mins from now
          const slotMinutes = slotHour * 60 + slotMinute;
          const currentMinutes = currentHour * 60 + currentMinute + 30; // 30 min buffer
          if (slotMinutes <= currentMinutes) {
            continue; // Skip this slot, it's in the past
          }
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

    if (uniqueSlots.length === 0) {
      // Weekend requested? We're closed Sat/Sun.
      const requestedDay = preferred_date ? new Date(preferred_date + 'T12:00:00').getDay() : null;
      const isWeekendRequest = requestedDay === 0 || requestedDay === 6;
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
 * POST /api/voice/book_appointment
 * Nucleus AI function: Book an appointment
 */
router.post('/book_appointment', async (req, res, next) => {
  try {
    console.log('book_appointment received:', JSON.stringify(req.body));
    
    // Helper to clean "null" strings from Nucleus AI
    const cleanNull = (val) => (val === 'null' || val === null || val === undefined || val === '') ? null : val;
    const isTemplateVar = (val) => typeof val === 'string' && (val.includes('{{') || val.includes('}}'));

    // Handle both direct params and nested args from Nucleus AI
    const body = req.body.args || req.body;

    let customer_phone = cleanNull(body.customer_phone);
    if (isTemplateVar(customer_phone)) {
      console.log('book_appointment: customer_phone is template variable (inbound webhook may have failed)');
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

    console.log('Parsed values:', { customer_phone, service_ids, appointment_date, appointment_time, vehicle_year, vehicle_make, vehicle_model });

    // Validate required fields (customer_phone can be missing if inbound webhook didn't set it)
    if (!customer_phone || !service_ids || !appointment_date || !appointment_time) {
      console.log('Validation failed:', { has_phone: !!customer_phone, has_services: !!service_ids, has_date: !!appointment_date, has_time: !!appointment_time });
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
        console.log('New customer missing name');
        return res.json({
          success: false,
          booked: false,
          missing_info: 'name',
          message: 'I just need to get your name before I book that. What\'s your first name?'
        });
      }
      
      if (!vehicle_year || !vehicle_make || !vehicle_model) {
        console.log('New customer missing vehicle info');
        return res.json({
          success: false,
          booked: false,
          missing_info: 'vehicle',
          message: 'And what kind of car will you be bringing in? I\'ll need the year, make, and model.'
        });
      }
      
      console.log('Creating new customer:', { customer_first_name, customer_last_name, customer_phone, customer_email });
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
        console.error('Error creating customer:', error);
        throw error;
      }
      customer = newCustomer;
    } else {
      // Existing customer - check if their record is complete
      if (!customer.first_name && !customer_first_name) {
        console.log('Existing customer missing name');
        return res.json({
          success: false,
          booked: false,
          missing_info: 'name',
          message: 'I have your number on file but need to get your name. What\'s your first name?'
        });
      }
      
      // Check if vehicle info is needed
      if (!hasExistingVehicle && !vehicle_id && (!vehicle_year || !vehicle_make || !vehicle_model)) {
        console.log('Existing customer missing vehicle info');
        return res.json({
          success: false,
          booked: false,
          missing_info: 'vehicle',
          message: 'And what kind of car will you be bringing in? I\'ll need the year, make, and model.'
        });
      }
      
      // Update name if we have a new one and they didn't have one
      if (customer_first_name && !customer.first_name) {
        console.log('Updating existing customer with name:', customer_first_name, customer_last_name);
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
        console.log('Updating existing customer with email:', customer_email);
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
          console.log('[Email] Confirmation sent for appointment', appointment.id);
        }
      }).catch(err => console.error('Email confirmation error:', err));
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
    console.error('book_appointment error:', error);
    res.json({
      success: false,
      booked: false,
      message: 'I\'m sorry, I encountered an error while booking. Let me try that again, or I can transfer you to a service advisor.'
    });
  }
});

/**
 * POST /api/voice/get_customer_appointments
 * Nucleus AI function: Get customer's appointments
 */
router.post('/get_customer_appointments', async (req, res, next) => {
  try {
    console.log('=== get_customer_appointments ===');
    console.log('Full req.body:', JSON.stringify(req.body, null, 2));
    console.log('Content-Type:', req.headers['content-type']);
    
    // Handle multiple possible formats from Nucleus AI
    // 1. Direct params: { customer_phone: "..." }
    // 2. Nested args: { args: { customer_phone: "..." } }
    // 3. Array format: [{ customer_phone: "..." }]
    let customer_phone = req.body.customer_phone || req.body.args?.customer_phone;
    let status = req.body.status || req.body.args?.status || 'upcoming';
    
    // Handle array format (some LLMs send args as array)
    if (Array.isArray(req.body) && req.body[0]) {
      customer_phone = customer_phone || req.body[0].customer_phone;
      status = status || req.body[0].status || 'upcoming';
    }
    
    // Handle case where body might be the args directly
    if (!customer_phone && typeof req.body === 'object') {
      const keys = Object.keys(req.body);
      console.log('Body keys:', keys);
    }

    console.log('Extracted customer_phone:', customer_phone);
    console.log('Extracted status:', status);

    const isTemplateVar = (val) => typeof val === 'string' && (val.includes('{{') || val.includes('}}'));
    if (!customer_phone || isTemplateVar(customer_phone)) {
      if (isTemplateVar(customer_phone)) console.log('get_customer_appointments: customer_phone is template variable (inbound webhook may have failed)');
      return res.json({
        success: false,
        message: 'I need the number you\'re calling from to look up your appointments. Is this the best number for your account?'
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

    // Get appointments with service IDs for rescheduling
    let query = supabase
      .from('appointments')
      .select(`
        id,
        scheduled_date,
        scheduled_time,
        status,
        vehicle:vehicles (year, make, model),
        appointment_services (service_id, service_name)
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

    // Format for voice - include service_ids for rescheduling
    const formatted = appointments.map(apt => {
      const date = parseISO(apt.scheduled_date);
      const services = apt.appointment_services.map(s => s.service_name).join(', ');
      const service_ids = apt.appointment_services.map(s => s.service_id);
      const vehicle = apt.vehicle ? `${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}` : '';

      return {
        id: apt.id,
        date: apt.scheduled_date,
        time: apt.scheduled_time,
        status: apt.status,
        formatted: `${format(date, 'EEEE, MMMM d')} at ${formatTime12Hour(apt.scheduled_time)}`,
        services,
        service_ids, // Include for rescheduling - use these with check_availability, not appointment id
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
 * POST /api/voice/modify_appointment
 * Nucleus AI function: Cancel or reschedule appointment
 */
router.post('/modify_appointment', async (req, res, next) => {
  try {
    console.log('modify_appointment received:', JSON.stringify(req.body));
    
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

      // Send cancellation SMS
      try {
        const { sendCancellationSMS } = await import('../services/sms.js');
        
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
        console.error('Failed to send cancellation SMS:', smsError);
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
      if (newH * 60 + newM >= 16 * 60) {
        return res.json({
          success: false,
          message: 'We close at 4 PM, so we can\'t reschedule to that time. Our last appointments start at 3:30. Would you like an earlier time?'
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
      
      console.log('Checking slot availability:', new_date, timeWithSeconds, 'Bay IDs:', bayIds);
      
      const { data: slot, error: slotError } = await supabase
        .from('time_slots')
        .select('bay_id')
        .eq('slot_date', new_date)
        .eq('start_time', timeWithSeconds)
        .eq('is_available', true)
        .in('bay_id', bayIds)
        .limit(1)
        .single();
      
      console.log('Slot check result:', slot, 'Error:', slotError);

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
        const services = aptForSms.appointment_services?.map(s => s.service_name).join(', ') || '';
        const vehicleDesc = aptForSms.vehicle
          ? `${aptForSms.vehicle.year} ${aptForSms.vehicle.make} ${aptForSms.vehicle.model}`
          : null;
        sendConfirmationSMS({
          customerPhone: aptForSms.customer.phone,
          customerName: aptForSms.customer.first_name,
          appointmentDate: aptForSms.scheduled_date,
          appointmentTime: aptForSms.scheduled_time,
          services,
          vehicleDescription: vehicleDesc,
          customerId: aptForSms.customer.id,
          appointmentId: appointment_id
        }).then(() => {
          supabase.from('appointments').update({ confirmation_sent_at: new Date().toISOString() }).eq('id', appointment_id).then(() => {});
        }).catch(err => console.error('Reschedule confirmation SMS error:', err));
      }

      const date = parseISO(new_date);

      return res.json({
        success: true,
        action: 'rescheduled',
        new_date,
        new_time,
        message: `I've rescheduled your appointment to ${format(date, 'EEEE, MMMM d')} at ${formatTime12Hour(new_time)}. You'll get a text with the updated details.`
      });
    }

    if (action === 'add_services') {
      const service_ids = req.body.service_ids || req.body.args?.service_ids;
      
      console.log('[add_services] Received service_ids:', JSON.stringify(service_ids));
      
      if (!service_ids || !Array.isArray(service_ids) || service_ids.length === 0) {
        console.log('[add_services] No service_ids provided');
        return res.json({
          success: false,
          message: 'Which service would you like to add?'
        });
      }

      // Get service details - use a simpler query approach
      console.log('[add_services] Looking up services:', service_ids);
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .in('id', service_ids);

      console.log('[add_services] Query result - services:', JSON.stringify(services), 'error:', servicesError);

      if (servicesError) {
        console.error('[add_services] Supabase error:', servicesError);
        return res.json({
          success: false,
          message: 'I had trouble looking up that service. Let me transfer you to a service advisor.'
        });
      }

      if (!services || services.length === 0) {
        console.log('[add_services] No services found for IDs:', service_ids);
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
        console.error('Error adding services:', insertError);
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
        }).catch(err => console.error('Add-services confirmation SMS error:', err));
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
    console.error('modify_appointment error:', error);
    res.json({
      success: false,
      message: 'Sorry, I had trouble with that request. Would you like me to transfer you to a service advisor?'
    });
  }
});

// Send confirmation SMS
router.post('/send_confirmation', async (req, res, next) => {
  try {
    console.log('send_confirmation received:', JSON.stringify(req.body));
    
    const appointment_id = req.body.appointment_id || req.body.args?.appointment_id;
    const customer_phone = req.body.customer_phone || req.body.args?.customer_phone;

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
    const { sendConfirmationSMS } = await import('../services/sms.js');

    const services = appointment.appointment_services.map(s => s.service_name).join(', ');
    const vehicleDesc = appointment.vehicle 
      ? `${appointment.vehicle.year} ${appointment.vehicle.make} ${appointment.vehicle.model}`
      : null;

    const result = await sendConfirmationSMS({
      customerPhone: appointment.customer.phone,
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
    console.error('send_confirmation error:', error);
    res.json({
      success: false,
      message: 'I had trouble sending the confirmation text, but your appointment is all set.'
    });
  }
});

/**
 * POST /api/voice/submit_tow_request
 * Nucleus AI function: Submit a tow-in request with pickup address for the tow truck
 */
router.post('/submit_tow_request', async (req, res, next) => {
  try {
    console.log('submit_tow_request received:', JSON.stringify(req.body));

    const body = req.body.args || req.body;
    const cleanNull = (val) => (val === 'null' || val === null || val === undefined || val === '') ? null : String(val).trim() || null;

    const customer_phone = cleanNull(body.customer_phone);
    const customer_first_name = cleanNull(body.customer_first_name);
    const customer_last_name = cleanNull(body.customer_last_name);
    const vehicle_id = cleanNull(body.vehicle_id);
    const vehicle_year = body.vehicle_year != null ? parseInt(body.vehicle_year, 10) : null;
    const vehicle_make = cleanNull(body.vehicle_make);
    const vehicle_model = cleanNull(body.vehicle_model);
    const pickup_address_line1 = cleanNull(body.pickup_address_line1) || cleanNull(body.pickup_address);
    const pickup_address_line2 = cleanNull(body.pickup_address_line2);
    const pickup_city = cleanNull(body.pickup_city);
    const pickup_state = cleanNull(body.pickup_state);
    const pickup_zip = cleanNull(body.pickup_zip);
    const pickup_notes = cleanNull(body.pickup_notes);
    const call_id = cleanNull(body.call_id);

    if (!customer_phone) {
      return res.json({
        success: false,
        message: 'I need your phone number to set up the tow. Can you confirm the best number to reach you?'
      });
    }

    if (!pickup_address_line1 || !pickup_city || !pickup_state || !pickup_zip) {
      return res.json({
        success: false,
        message: 'I need the full address where the car is so the tow truck knows where to pick it up. Can you give me the street address, city, state, and zip?'
      });
    }

    const normalizedPhone = normalizePhone(customer_phone);

    // Find or create customer
    let { data: customer } = await supabase
      .from('customers')
      .select('id, first_name, last_name')
      .eq('phone_normalized', normalizedPhone)
      .single();

    if (!customer) {
      const { data: newCustomer, error: createErr } = await supabase
        .from('customers')
        .insert({
          phone: customer_phone,
          phone_normalized: normalizedPhone,
          first_name: customer_first_name || null,
          last_name: customer_last_name || null
        })
        .select('id')
        .single();
      if (createErr) throw createErr;
      customer = newCustomer;
    } else if (customer_first_name || customer_last_name) {
      await supabase
        .from('customers')
        .update({
          first_name: customer_first_name || customer.first_name,
          last_name: customer_last_name || customer.last_name
        })
        .eq('id', customer.id);
    }

    // Find or create vehicle if we have year/make/model
    let vehicleId = vehicle_id ? vehicle_id : null;
    if (!vehicleId && vehicle_year && vehicle_make && vehicle_model) {
      const { data: existingVehicle } = await supabase
        .from('vehicles')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('year', vehicle_year)
        .eq('make', vehicle_make)
        .ilike('model', vehicle_model)
        .limit(1)
        .single();

      if (existingVehicle) {
        vehicleId = existingVehicle.id;
      } else {
        const { data: newVehicle, error: vErr } = await supabase
          .from('vehicles')
          .insert({
            customer_id: customer.id,
            year: vehicle_year,
            make: vehicle_make,
            model: vehicle_model,
            is_primary: true
          })
          .select('id')
          .single();
        if (!vErr && newVehicle) vehicleId = newVehicle.id;
      }
    } else if (!vehicleId) {
      const { data: primaryVehicle } = await supabase
        .from('vehicles')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('is_primary', true)
        .limit(1)
        .single();
      if (primaryVehicle) vehicleId = primaryVehicle.id;
    }

    const { data: towRequest, error: insertErr } = await supabase
      .from('tow_requests')
      .insert({
        customer_id: customer.id,
        vehicle_id: vehicleId || null,
        call_id: call_id || null,
        pickup_address_line1,
        pickup_address_line2: pickup_address_line2 || null,
        pickup_city,
        pickup_state,
        pickup_zip,
        pickup_notes: pickup_notes || null,
        status: 'requested'
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('tow_requests insert error:', insertErr);
      throw insertErr;
    }

    const addressShort = `${pickup_address_line1}, ${pickup_city}`;
    return res.json({
      success: true,
      tow_request_id: towRequest.id,
      message: `I've got your tow request. We'll send a truck to ${addressShort}. Our team will call you when they're on the way. Is there anything else I can help with?`
    });
  } catch (error) {
    console.error('submit_tow_request error:', error);
    res.json({
      success: false,
      message: 'I had trouble saving the tow request. Let me have someone call you back to get the details, or you can call back and we can try again.'
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
