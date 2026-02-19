import { Router } from 'express';
import { supabase, normalizePhone } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { nowEST, todayEST } from '../../utils/timezone.js';
import { formatTime12Hour } from './utils.js';

const router = Router();

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
      'abs sensor': 'ABS',
      'brakes': 'Brake',
      'brake': 'Brake',
      'brake pads': 'Brake Pad',
      'brake pads and rotors': 'Brake Pads & Rotors',
      'pads and rotors': 'Brake Pads & Rotors',
      'brake job': 'Complete Brake Service',
      'complete brake': 'Complete Brake Service',
      'full brake': 'Complete Brake Service',
      'all brakes': 'Complete Brake Service',
      'four wheel brake': 'Complete Brake Service',
      'detail': 'Detail',
      'detailing': 'Detail',
      'car wash': 'Car Wash',
      'wash': 'Car Wash',
      'interior clean': 'Interior',
      'oil change': 'Oil Change',
      'oil': 'Oil Change',
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

    // Fallback: if no results with full phrase, try splitting into individual words
    if ((!services || services.length === 0) && normalizedSearch && normalizedSearch.includes(' ')) {
      const words = normalizedSearch.split(/\s+/).filter(w => w.length > 2);
      if (words.length > 1) {
        const wordFilters = words.map(w => `name.ilike.%${w}%`).join(',');
        const { data: wordServices } = await supabase
          .from('services')
          .select('id, name, description, duration_minutes, price_min, price_display, is_popular, mileage_interval, category:service_categories(name)')
          .eq('is_active', true)
          .or(wordFilters)
          .order('is_popular', { ascending: false })
          .limit(15);
        if (wordServices?.length) services = wordServices;
      }
    }

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
    logger.error('get_services error:', { error });
    res.json({
      success: false,
      services: [],
      message: 'Sorry, I had trouble retrieving our services. Let me try that again.'
    });
  }
});

/**
 * POST /api/voice/get_estimate
 * Provide a price estimate for services
 */
router.post('/get_estimate', async (req, res, next) => {
  try {
    logger.info('get_estimate received:', { data: JSON.stringify(req.body) });

    const body = req.body.args || req.body;
    const service_search = body.service_search || body.search;
    const vehicle_year = body.vehicle_year;
    const vehicle_make = body.vehicle_make;
    const vehicle_model = body.vehicle_model;
    const customer_phone = body.customer_phone;
    const issue_description = body.issue_description;

    // If they described an issue rather than a specific service
    if (issue_description && !service_search) {
      // Log this for follow-up
      if (customer_phone) {
        const normalizedPhone = normalizePhone(customer_phone);
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('phone_normalized', normalizedPhone)
          .single();

        // Create a callback/quote request
        await supabase
          .from('call_logs')
          .insert({
            phone_number: customer_phone,
            phone_normalized: normalizedPhone,
            customer_id: customer?.id,
            direction: 'inbound',
            outcome: 'inquiry',
            transcript_summary: `Quote request: ${issue_description}${vehicle_year ? ` | Vehicle: ${vehicle_year} ${vehicle_make} ${vehicle_model}` : ''}`,
            started_at: new Date().toISOString(),
            ended_at: new Date().toISOString()
          });
      }

      return res.json({
        success: true,
        needs_diagnosis: true,
        message: `That sounds like something we'd need to take a look at to give you an accurate quote. We can do a diagnostic for $125, and if you decide to do the repair with us, we'll apply that toward the cost. Would you like to schedule a diagnostic appointment?`
      });
    }

    if (!service_search) {
      return res.json({
        success: false,
        message: 'What service did you want an estimate for?'
      });
    }

    // Search for the service
    const { data: services } = await supabase
      .from('services')
      .select('id, name, price_min, price_max, price_display, duration_minutes, description, requires_diagnosis')
      .eq('is_active', true)
      .or(`name.ilike.%${service_search}%,description.ilike.%${service_search}%`)
      .order('is_popular', { ascending: false })
      .limit(3);

    if (!services || services.length === 0) {
      return res.json({
        success: true,
        service_found: false,
        message: `I don't have a standard price for "${service_search}". We'd need to take a look at the vehicle to give you an accurate quote. Would you like to schedule a diagnostic appointment? That's $125, and we apply it to the repair if you go ahead.`
      });
    }

    const service = services[0];

    // Check if this service requires diagnosis first
    if (service.requires_diagnosis) {
      return res.json({
        success: true,
        service_found: true,
        requires_diagnosis: true,
        service_name: service.name,
        message: `${service.name} pricing depends on what we find during the inspection. We'd need to do a diagnostic first - that's $125, and we'll apply it toward the repair if you decide to go ahead. Would you like to schedule that?`
      });
    }

    // Build price message
    let priceMessage = '';
    if (service.price_min && service.price_max && service.price_min !== service.price_max) {
      priceMessage = `runs between $${service.price_min} and $${service.price_max}`;
    } else if (service.price_min) {
      priceMessage = `is $${service.price_min}`;
    } else if (service.price_display) {
      priceMessage = `is ${service.price_display}`;
    }

    // Duration
    const durationMessage = service.duration_minutes
      ? `takes about ${service.duration_minutes} minutes`
      : '';

    // Build full response
    let message = `${service.name} ${priceMessage}`;
    if (durationMessage) {
      message += ` and ${durationMessage}`;
    }
    message += '. Would you like to schedule an appointment?';

    // If multiple matching services, mention alternatives
    if (services.length > 1) {
      const alternatives = services.slice(1).map(s => s.name).join(' or ');
      message += ` I also have ${alternatives} if that's what you were looking for.`;
    }

    return res.json({
      success: true,
      service_found: true,
      estimate: {
        service_id: service.id,
        service_name: service.name,
        price_min: service.price_min,
        price_max: service.price_max,
        price_display: service.price_display,
        duration_minutes: service.duration_minutes,
        description: service.description
      },
      alternatives: services.slice(1).map(s => ({
        service_id: s.id,
        service_name: s.name,
        price_display: s.price_display
      })),
      message
    });

  } catch (error) {
    logger.error('get_estimate error:', { error });
    res.json({
      success: false,
      message: 'I had trouble looking that up. Let me get you to a service advisor who can help with pricing.'
    });
  }
});

/**
 * POST /api/voice/get_repair_status
 * Check status of a vehicle currently at the shop
 * Auto-estimates based on scheduled appointment time (assumes on-time arrival)
 */
router.post('/get_repair_status', async (req, res, next) => {
  try {
    logger.info('get_repair_status received:', { data: JSON.stringify(req.body) });

    const body = req.body.args || req.body;
    const customer_phone = body.customer_phone;

    if (!customer_phone) {
      return res.json({
        success: false,
        message: 'I need your phone number to look up your repair status. Is this the number on your account?'
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
        has_vehicle_in_shop: false,
        message: 'I don\'t see any vehicles checked in under that phone number. Is it possible the account is under a different number?'
      });
    }

    const today = todayEST();
    const now = nowEST();
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

    // Look for today's appointments (scheduled, checked_in, or in_progress)
    // We'll auto-treat "scheduled" appointments as in-progress if appointment time has passed
    const { data: todayAppointments } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_date,
        scheduled_time,
        status,
        checked_in_at,
        started_at,
        estimated_duration_minutes,
        internal_notes,
        vehicle:vehicles (year, make, model),
        appointment_services (service_name)
      `)
      .eq('customer_id', customer.id)
      .eq('scheduled_date', today)
      .not('status', 'in', '("cancelled","completed","no_show")')
      .order('scheduled_time')
      .limit(3);

    if (!todayAppointments || todayAppointments.length === 0) {
      return res.json({
        success: true,
        has_vehicle_in_shop: false,
        message: `${customer.first_name ? customer.first_name + ', I' : 'I'} don't see any appointments for you today. Did you drop off recently, or were you checking on a past repair?`
      });
    }

    // Find the most relevant appointment
    // Priority: in_progress > checked_in > scheduled (if time has passed)
    let apt = todayAppointments.find(a => a.status === 'in_progress')
           || todayAppointments.find(a => a.status === 'checked_in');

    // If no explicitly checked-in appointment, check if a scheduled one should be "in progress"
    if (!apt) {
      for (const a of todayAppointments) {
        if (a.status === 'scheduled') {
          const [aptH, aptM] = a.scheduled_time.split(':').map(Number);
          const aptTimeMinutes = aptH * 60 + aptM;

          // If appointment time has passed, assume they're here and work is underway
          if (currentTimeMinutes >= aptTimeMinutes) {
            apt = a;
            break;
          }
        }
      }
    }

    // If still no match, they have an appointment but it hasn't started yet
    if (!apt) {
      const nextApt = todayAppointments[0];
      const services = nextApt.appointment_services.map(s => s.service_name).join(', ');
      return res.json({
        success: true,
        has_vehicle_in_shop: false,
        has_appointment_today: true,
        appointment: {
          time: formatTime12Hour(nextApt.scheduled_time),
          services,
          vehicle: nextApt.vehicle ? `${nextApt.vehicle.year} ${nextApt.vehicle.make} ${nextApt.vehicle.model}` : null
        },
        message: `${customer.first_name ? customer.first_name + ', your' : 'Your'} appointment is at ${formatTime12Hour(nextApt.scheduled_time)} for ${services}. Are you on your way?`
      });
    }

    // We have an active/in-progress appointment
    const services = apt.appointment_services.map(s => s.service_name).join(', ');
    const vehicle = apt.vehicle ? `${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}` : 'your vehicle';
    const duration = apt.estimated_duration_minutes || 60;

    // Calculate estimated completion based on scheduled time (assume on-time arrival)
    const [aptH, aptM] = apt.scheduled_time.split(':').map(Number);
    const scheduledStartMinutes = aptH * 60 + aptM;
    const estimatedEndMinutes = scheduledStartMinutes + duration;
    const minutesRemaining = Math.max(0, estimatedEndMinutes - currentTimeMinutes);

    // Format estimated ready time
    const endHour = Math.floor(estimatedEndMinutes / 60);
    const endMin = estimatedEndMinutes % 60;
    const estimatedReadyTime = formatTime12Hour(`${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`);

    // Build status message
    let statusMessage = '';
    let estimatedReady = '';

    if (minutesRemaining <= 0) {
      statusMessage = `${vehicle} should be just about done`;
      estimatedReady = 'It should be ready any minute now - we\'ll text you as soon as it\'s finished';
    } else if (minutesRemaining <= 10) {
      statusMessage = `The team is finishing up on ${vehicle}`;
      estimatedReady = 'Should be ready in just a few minutes';
    } else if (minutesRemaining <= 20) {
      statusMessage = `${vehicle} is being worked on now`;
      estimatedReady = `Should be ready in about 15-20 minutes, around ${estimatedReadyTime}`;
    } else if (minutesRemaining <= 45) {
      statusMessage = `${vehicle} is in the bay being worked on`;
      estimatedReady = `Should be ready around ${estimatedReadyTime}, about ${Math.round(minutesRemaining / 5) * 5} minutes from now`;
    } else {
      statusMessage = `${vehicle} is being worked on`;
      estimatedReady = `Estimated ready time is around ${estimatedReadyTime}`;
    }

    // Include any tech notes if available
    let techNotes = '';
    if (apt.internal_notes && apt.internal_notes.includes('Update:')) {
      techNotes = ' ' + apt.internal_notes.split('Update:').pop().trim();
    }

    return res.json({
      success: true,
      has_vehicle_in_shop: true,
      status: apt.status === 'scheduled' ? 'in_progress_assumed' : apt.status,
      vehicle,
      services,
      scheduled_time: apt.scheduled_time,
      estimated_duration_minutes: duration,
      minutes_remaining: minutesRemaining,
      estimated_ready_time: estimatedReadyTime,
      status_message: statusMessage,
      estimated_ready: estimatedReady,
      message: `${customer.first_name ? customer.first_name + ', ' : ''}${statusMessage} for ${services}. ${estimatedReady}.${techNotes} We'll text you when it's ready. Anything else I can help with?`
    });

  } catch (error) {
    logger.error('get_repair_status error:', { error });
    res.json({
      success: false,
      message: 'I had trouble looking that up. Let me transfer you to the service desk - they can give you a live update.'
    });
  }
});

/**
 * POST /api/voice/get_vehicle_info
 * Get detailed vehicle information, maintenance schedule, and recalls by VIN
 * Uses Vehicle Databases API
 */
router.post('/get_vehicle_info', async (req, res, next) => {
  try {
    logger.info('get_vehicle_info received:', { data: JSON.stringify(req.body) });

    const body = req.body.args || req.body;
    const vin = body.vin;
    const customer_phone = body.customer_phone;
    const current_mileage = body.current_mileage ? parseInt(body.current_mileage, 10) : null;
    const check_service = body.check_service; // Optional: specific service to check

    // If no VIN provided, try to look up from customer's vehicle
    let vehicleVin = vin;
    let vehicleMileage = current_mileage;

    if (!vehicleVin && customer_phone) {
      const normalizedPhone = normalizePhone(customer_phone);
      const { data: customer } = await supabase
        .from('customers')
        .select(`
          id,
          vehicles (id, vin, year, make, model, mileage)
        `)
        .eq('phone_normalized', normalizedPhone)
        .single();

      if (customer?.vehicles?.length > 0) {
        const primaryVehicle = customer.vehicles.find(v => v.vin) || customer.vehicles[0];
        vehicleVin = primaryVehicle.vin;
        vehicleMileage = vehicleMileage || primaryVehicle.mileage;
      }
    }

    if (!vehicleVin) {
      return res.json({
        success: false,
        message: 'I need the VIN to look up detailed vehicle information. Do you have the VIN handy? It\'s usually on the driver\'s side dashboard or door jamb.'
      });
    }

    // Import the vehicle databases service
    const vehicleDB = await import('../../services/vehicle-databases.js');

    // If checking a specific service
    if (check_service && vehicleMileage) {
      const serviceResult = await vehicleDB.isServiceDue(vehicleVin, vehicleMileage, check_service);

      if (serviceResult.success && serviceResult.found) {
        let message = '';
        if (serviceResult.is_overdue) {
          message = `Based on your ${serviceResult.vehicle.year} ${serviceResult.vehicle.make} ${serviceResult.vehicle.model}'s maintenance schedule, ${serviceResult.service} is actually overdue by about ${Math.abs(serviceResult.miles_until_due).toLocaleString()} miles. It's definitely a good idea to get that done.`;
        } else if (serviceResult.is_due) {
          message = `Your ${serviceResult.vehicle.year} ${serviceResult.vehicle.make} ${serviceResult.vehicle.model} is due for ${serviceResult.service} within the next ${serviceResult.miles_until_due.toLocaleString()} miles. Good timing to schedule it.`;
        } else {
          message = `According to the maintenance schedule for your ${serviceResult.vehicle.year} ${serviceResult.vehicle.make} ${serviceResult.vehicle.model}, ${serviceResult.service} isn't due until ${serviceResult.next_due_at.toLocaleString()} miles - you've got about ${serviceResult.miles_until_due.toLocaleString()} miles to go. Is there something specific going on with the car?`;
        }

        return res.json({
          success: true,
          service_check: serviceResult,
          message
        });
      }
    }

    // Get full vehicle intelligence
    const intelligence = await vehicleDB.getVehicleIntelligence(vehicleVin, vehicleMileage);

    if (!intelligence.success) {
      // Even if API fails, try VIN year decode as fallback
      const fallbackYear = vehicleDB.decodeVINYear(vehicleVin);
      if (fallbackYear) {
        return res.json({
          success: true,
          partial: true,
          vehicle: { vin: vehicleVin, year: fallbackYear },
          message: `I can tell from the VIN this is a ${fallbackYear} model. I wasn't able to pull the full details right now, but I can still help you book. What service do you need?`
        });
      }
      return res.json({
        success: false,
        message: 'I had trouble looking up that VIN. No worries though, I can still help you get booked in. What service do you need?'
      });
    }

    // Build response message
    let messageParts = [];

    if (intelligence.vehicle && intelligence.vehicle.make) {
      let vehicleDesc = `${intelligence.vehicle.year} ${intelligence.vehicle.make} ${intelligence.vehicle.model}`;
      if (intelligence.vehicle.trim) vehicleDesc += ` ${intelligence.vehicle.trim}`;
      messageParts.push(`I found your ${vehicleDesc}`);
    } else if (intelligence.vehicle?.year) {
      // Partial decode — we at least have the year from VIN
      messageParts.push(`I can see this is a ${intelligence.vehicle.year} model`);
    }

    // Check for recalls - this is important!
    if (intelligence.recalls?.has_open_recalls) {
      const recallCount = intelligence.recalls.count;
      messageParts.push(`I see there ${recallCount === 1 ? 'is' : 'are'} ${recallCount} open recall${recallCount > 1 ? 's' : ''} on this vehicle`);

      // Mention the most critical one
      if (intelligence.recalls.items?.length > 0) {
        const topRecall = intelligence.recalls.items[0];
        messageParts.push(`The most recent one is for ${topRecall.component}`);
      }
      messageParts.push('These are covered free of charge - would you like me to schedule that?');
    }

    // Warranty info
    if (intelligence.warranty && Array.isArray(intelligence.warranty)) {
      const basicWarranty = intelligence.warranty.find(w =>
        w.type?.toLowerCase().includes('basic') || w.type?.toLowerCase().includes('bumper')
      );
      if (basicWarranty) {
        messageParts.push(`Your basic warranty covers ${basicWarranty.miles?.toLocaleString() || 'N/A'} miles or ${basicWarranty.months ? Math.floor(basicWarranty.months / 12) : 'N/A'} years`);
      }
    }

    // Mention upcoming maintenance if we have mileage
    if (intelligence.maintenance?.upcoming_services?.length > 0) {
      const nextService = intelligence.maintenance.upcoming_services[0];
      if (nextService.miles_until <= 2000) {
        messageParts.push(`You're also coming up on ${nextService.services.join(' and ')} in about ${nextService.miles_until.toLocaleString()} miles`);
      }
    }

    // Check for overdue services
    if (intelligence.maintenance?.recently_due?.length > 0) {
      const overdue = intelligence.maintenance.recently_due.find(s => s.miles_overdue > 1000);
      if (overdue) {
        messageParts.push(`Based on the schedule, you might be due for ${overdue.services.join(' or ')}`);
      }
    }

    // If we got the vehicle but NO maintenance/recalls/warranty, be upfront
    if (messageParts.length <= 1 && !intelligence.recalls?.has_open_recalls && !intelligence.maintenance?.upcoming_services?.length) {
      messageParts.push('I don\'t have a detailed maintenance schedule on file for this one, but I can still help you book any service you need');
    }

    const message = messageParts.join('. ') + '.';

    return res.json({
      success: true,
      vehicle: intelligence.vehicle,
      recalls: intelligence.recalls,
      maintenance: intelligence.maintenance,
      warranty: intelligence.warranty,
      summary: intelligence.summary,
      message
    });

  } catch (error) {
    logger.error('get_vehicle_info error:', { error });
    res.json({
      success: false,
      message: 'I had trouble looking up the vehicle details. Let me help you with what I have on file.'
    });
  }
});

export default router;
