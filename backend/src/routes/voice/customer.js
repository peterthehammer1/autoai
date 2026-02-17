import { Router } from 'express';
import { supabase, normalizePhone } from '../../config/database.js';
import { format, parseISO } from 'date-fns';
import { nowEST, todayEST, daysAgoEST } from '../../utils/timezone.js';
import { logger } from '../../utils/logger.js';
import { formatTime12Hour } from './utils.js';

const router = Router();

/**
 * POST /api/voice/lookup_customer
 * Nucleus AI function: Look up customer by phone
 * Returns: customer info, vehicles, upcoming appointments, and service history
 */
router.post('/lookup_customer', async (req, res, next) => {
  try {
    logger.info('lookup_customer received:', { data: JSON.stringify(req.body) });

    // Handle both direct params and nested args from Nucleus AI
    const isTemplateVar = (val) => typeof val === 'string' && (val.includes('{{') || val.includes('}}'));
    let phone_number = req.body.phone_number || req.body.args?.phone_number;
    if (isTemplateVar(phone_number)) {
      logger.info('lookup_customer: phone_number is template variable');
      phone_number = null;
    }
    let call_id = req.body.call_id || req.body.args?.call_id;
    if (isTemplateVar(call_id)) call_id = null;

    // Fallback: recover phone from call_logs using call_id
    if (!phone_number && call_id) {
      logger.info('lookup_customer: recovering phone from call_id', { data: call_id });
      const { data: callLog } = await supabase
        .from('call_logs')
        .select('phone_number')
        .eq('retell_call_id', call_id)
        .single();
      if (callLog?.phone_number) {
        phone_number = callLog.phone_number;
        logger.info('lookup_customer: recovered phone from call_logs', { data: phone_number });
      }
    }

    // Fallback 2: recent active call within last 5 min
    if (!phone_number) {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentCall } = await supabase
        .from('call_logs')
        .select('phone_number')
        .gte('started_at', fiveMinAgo)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();
      if (recentCall?.phone_number) {
        phone_number = recentCall.phone_number;
        logger.info('lookup_customer: recovered phone from recent active call', { data: phone_number });
      }
    }

    // Fallback 3: Retell API direct lookup
    if (!phone_number && call_id && process.env.RETELL_API_KEY) {
      try {
        logger.info('lookup_customer: recovering phone from Retell API', { data: call_id });
        const resp = await fetch(`https://api.retellai.com/v2/get-call/${call_id}`, {
          headers: { 'Authorization': `Bearer ${process.env.RETELL_API_KEY}` }
        });
        if (resp.ok) {
          const callData = await resp.json();
          if (callData?.from_number) {
            phone_number = callData.from_number;
            logger.info('lookup_customer: recovered phone from Retell API', { data: phone_number });
          }
        }
      } catch (e) {
        logger.info('lookup_customer: Retell API fallback failed', { data: e.message });
      }
    }

    if (!phone_number) {
      logger.info('lookup_customer: phone still missing after all fallbacks');
      return res.json({
        success: false,
        found: false,
        message: 'No customer found with this phone number. This appears to be a new customer.'
      });
    }

    const normalizedPhone = normalizePhone(phone_number);
    logger.info('Looking up normalized phone:', { data: normalizedPhone });

    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        id,
        first_name,
        last_name,
        email,
        total_visits,
        last_visit_date,
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

    // Get upcoming appointments
    const today = todayEST();
    const { data: upcomingAppointments } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_date,
        scheduled_time,
        status,
        appointment_services (service_id, service_name)
      `)
      .eq('customer_id', customer.id)
      .gte('scheduled_date', today)
      .not('status', 'in', '("cancelled","completed","no_show")')
      .order('scheduled_date')
      .order('scheduled_time')
      .limit(5);

    // Get recent completed appointments (service history) - last 6 months
    const sixMonthsAgo = daysAgoEST(180);
    const { data: recentAppointments } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_date,
        scheduled_time,
        status,
        appointment_services (service_id, service_name)
      `)
      .eq('customer_id', customer.id)
      .eq('status', 'completed')
      .gte('scheduled_date', sixMonthsAgo)
      .order('scheduled_date', { ascending: false })
      .limit(10);

    // Format upcoming appointments for voice agent
    const upcomingFormatted = (upcomingAppointments || []).map(apt => {
      const date = parseISO(apt.scheduled_date);
      const services = apt.appointment_services.map(s => s.service_name).join(', ');
      const serviceIds = apt.appointment_services.map(s => s.service_id);
      return {
        id: apt.id,
        date: apt.scheduled_date,
        time: apt.scheduled_time,
        formatted: `${format(date, 'EEEE, MMMM d')} at ${formatTime12Hour(apt.scheduled_time)}`,
        services,
        service_ids: serviceIds
      };
    });

    // Build service history summary - when was each service last done
    const serviceHistory = {};
    (recentAppointments || []).forEach(apt => {
      apt.appointment_services.forEach(svc => {
        if (!serviceHistory[svc.service_name]) {
          serviceHistory[svc.service_name] = {
            service_name: svc.service_name,
            service_id: svc.service_id,
            last_date: apt.scheduled_date,
            days_ago: Math.floor((nowEST() - parseISO(apt.scheduled_date)) / (1000 * 60 * 60 * 24))
          };
        }
      });
    });

    // Build intelligence summary for the agent
    let intelligenceSummary = [];

    // Check for upcoming appointments
    if (upcomingFormatted.length > 0) {
      const apt = upcomingFormatted[0];
      intelligenceSummary.push(`Has upcoming appointment: ${apt.services} on ${apt.formatted}`);
    }

    // Check recent service history for common services
    const oilChangeServices = Object.values(serviceHistory).filter(s =>
      s.service_name.toLowerCase().includes('oil change')
    );
    if (oilChangeServices.length > 0) {
      const lastOil = oilChangeServices[0];
      if (lastOil.days_ago < 60) {
        intelligenceSummary.push(`Had oil change ${lastOil.days_ago} days ago (${lastOil.last_date}) - may be too soon for another`);
      }
    }

    // Last visit info
    if (customer.last_visit_date) {
      const daysSinceVisit = Math.floor((nowEST() - new Date(customer.last_visit_date)) / (1000 * 60 * 60 * 24));
      if (daysSinceVisit > 180) {
        intelligenceSummary.push(`Last visit was ${daysSinceVisit} days ago - welcome them back!`);
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
        is_returning: customer.total_visits > 0,
        last_visit_date: customer.last_visit_date
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
      // NEW: Upcoming appointments
      upcoming_appointments: upcomingFormatted,
      // NEW: Service history (last time each service was done)
      service_history: Object.values(serviceHistory),
      // NEW: Intelligence summary for agent
      intelligence: intelligenceSummary,
      message: customer.first_name
        ? (vehicleDescription
            ? `Welcome back, ${customer.first_name}! I see you have a ${vehicleDescription} on file.`
            : `Welcome back, ${customer.first_name}!`)
        : (vehicleDescription
            ? `I found your account. I see you have a ${vehicleDescription} on file.`
            : `I found your account.`)
    });

  } catch (error) {
    logger.error('lookup_customer error:', { error });
    res.json({
      success: false,
      found: false,
      message: 'Sorry, I had trouble looking up your information. Can you provide your details?'
    });
  }
});

/**
 * POST /api/voice/get_customer_appointments
 * Nucleus AI function: Get customer's appointments
 */
router.post('/get_customer_appointments', async (req, res, next) => {
  try {
    logger.info('=== get_customer_appointments ===');
    logger.info('Full req.body:', { data: JSON.stringify(req.body, null, 2) });
    logger.info('Content-Type:', { data: req.headers['content-type'] });

    // Handle multiple possible formats from Nucleus AI
    // 1. Direct params: { customer_phone: "..." }
    // 2. Nested args: { args: { customer_phone: "..." } }
    // 3. Array format: [{ customer_phone: "..." }]
    const isTemplateVar = (val) => typeof val === 'string' && (val.includes('{{') || val.includes('}}'));

    let customer_phone = req.body.customer_phone || req.body.args?.customer_phone;
    let status = req.body.status || req.body.args?.status || 'upcoming';
    let call_id = req.body.call_id || req.body.args?.call_id;
    if (isTemplateVar(call_id)) call_id = null;

    // Handle array format (some LLMs send args as array)
    if (Array.isArray(req.body) && req.body[0]) {
      customer_phone = customer_phone || req.body[0].customer_phone;
      status = status || req.body[0].status || 'upcoming';
    }

    if (isTemplateVar(customer_phone)) {
      logger.info('get_customer_appointments: customer_phone is template variable');
      customer_phone = null;
    }

    // Fallback: recover phone from call_logs using call_id
    if (!customer_phone && call_id) {
      logger.info('get_customer_appointments: recovering phone from call_id', { data: call_id });
      const { data: callLog } = await supabase
        .from('call_logs')
        .select('phone_number')
        .eq('retell_call_id', call_id)
        .single();
      if (callLog?.phone_number) {
        customer_phone = callLog.phone_number;
        logger.info('get_customer_appointments: recovered phone from call_logs', { data: customer_phone });
      }
    }

    // Fallback 2: recent active call within last 5 min
    if (!customer_phone) {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentCall } = await supabase
        .from('call_logs')
        .select('phone_number')
        .gte('started_at', fiveMinAgo)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();
      if (recentCall?.phone_number) {
        customer_phone = recentCall.phone_number;
        logger.info('get_customer_appointments: recovered phone from recent active call', { data: customer_phone });
      }
    }

    // Fallback 3: Retell API direct lookup
    if (!customer_phone && call_id && process.env.RETELL_API_KEY) {
      try {
        logger.info('get_customer_appointments: recovering phone from Retell API', { data: call_id });
        const resp = await fetch(`https://api.retellai.com/v2/get-call/${call_id}`, {
          headers: { 'Authorization': `Bearer ${process.env.RETELL_API_KEY}` }
        });
        if (resp.ok) {
          const callData = await resp.json();
          if (callData?.from_number) {
            customer_phone = callData.from_number;
            logger.info('get_customer_appointments: recovered phone from Retell API', { data: customer_phone });
          }
        }
      } catch (e) {
        logger.info('get_customer_appointments: Retell API fallback failed', { data: e.message });
      }
    }

    logger.info('Extracted customer_phone:', { data: customer_phone });
    logger.info('Extracted status:', { data: status });

    if (!customer_phone) {
      logger.info('get_customer_appointments: phone still missing after all fallbacks');
      return res.json({
        success: false,
        message: 'I wasn\'t able to pull up your phone number. Could you tell me the best number for your account?'
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

    const today = todayEST();
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
    logger.error('get_customer_appointments error:', { error });
    res.json({
      success: false,
      message: 'Sorry, I had trouble looking up your appointments. Let me try again.'
    });
  }
});

export default router;
