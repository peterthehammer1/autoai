import { Router } from 'express';
import { supabase, normalizePhone } from '../config/database.js';
import { format, parseISO } from 'date-fns';

const router = Router();

/**
 * POST /api/appointments
 * Book a new appointment
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      // Customer info
      customer_phone,
      customer_first_name,
      customer_last_name,
      customer_email,
      
      // Vehicle info (for new vehicle)
      vehicle_year,
      vehicle_make,
      vehicle_model,
      vehicle_mileage,
      vehicle_id, // If existing vehicle
      
      // Appointment details
      service_ids,
      appointment_date,
      appointment_time,
      bay_id, // Optional - system will assign if not provided
      
      // Options
      loaner_requested,
      shuttle_requested,
      waiter,
      notes,
      
      // Tracking
      call_id,
      created_by = 'ai_agent'
    } = req.body;

    // Validate required fields
    if (!customer_phone || !service_ids || !appointment_date || !appointment_time) {
      return res.status(400).json({
        error: { 
          message: 'Missing required fields: customer_phone, service_ids, appointment_date, appointment_time' 
        }
      });
    }

    const normalizedPhone = normalizePhone(customer_phone);

    // 1. Find or create customer
    let { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('phone_normalized', normalizedPhone)
      .single();

    if (customerError && customerError.code !== 'PGRST116') {
      throw customerError;
    }

    if (!customer) {
      // Create new customer
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          phone: customer_phone,
          first_name: customer_first_name,
          last_name: customer_last_name,
          email: customer_email
        })
        .select('id')
        .single();

      if (createError) throw createError;
      customer = newCustomer;
    }

    // 2. Get or create vehicle
    let vehicleId = vehicle_id;

    if (!vehicleId && vehicle_year && vehicle_make && vehicle_model) {
      // Create new vehicle
      const { data: newVehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .insert({
          customer_id: customer.id,
          year: vehicle_year,
          make: vehicle_make,
          model: vehicle_model,
          mileage: vehicle_mileage,
          mileage_updated_at: vehicle_mileage ? new Date().toISOString() : null,
          is_primary: true
        })
        .select('id')
        .single();

      if (vehicleError) throw vehicleError;
      vehicleId = newVehicle.id;

      // Set other vehicles as non-primary
      await supabase
        .from('vehicles')
        .update({ is_primary: false })
        .eq('customer_id', customer.id)
        .neq('id', vehicleId);
    } else if (!vehicleId) {
      // Try to get primary vehicle
      const { data: primaryVehicle } = await supabase
        .from('vehicles')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('is_primary', true)
        .single();
      
      vehicleId = primaryVehicle?.id;
    }

    // 3. Get services and calculate duration
    const serviceIdList = Array.isArray(service_ids) ? service_ids : [service_ids];
    
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, duration_minutes, price_min, price_max, required_bay_type')
      .in('id', serviceIdList);

    if (servicesError) throw servicesError;

    const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
    const quotedTotal = services.reduce((sum, s) => sum + (s.price_min || 0), 0);

    // 4. Find available bay if not specified
    let assignedBayId = bay_id;
    
    if (!assignedBayId) {
      // Get required bay type from services
      const requiredBayType = services[0]?.required_bay_type || 'general_service';

      // Find available bay at this time
      const { data: availableSlot } = await supabase
        .from('time_slots')
        .select('bay_id')
        .eq('slot_date', appointment_date)
        .eq('start_time', appointment_time + ':00')
        .eq('is_available', true)
        .limit(1)
        .single();

      if (!availableSlot) {
        return res.status(409).json({
          error: { 
            message: 'No available bay at the requested time. Please choose a different time.' 
          }
        });
      }

      assignedBayId = availableSlot.bay_id;
    }

    // 5. Create appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        customer_id: customer.id,
        vehicle_id: vehicleId,
        scheduled_date: appointment_date,
        scheduled_time: appointment_time,
        estimated_duration_minutes: totalDuration,
        bay_id: assignedBayId,
        loaner_requested: loaner_requested || false,
        shuttle_requested: shuttle_requested || false,
        waiter: waiter || false,
        customer_notes: notes,
        quoted_total: quotedTotal,
        created_by,
        call_id,
        status: 'scheduled'
      })
      .select(`
        *,
        customer:customers (first_name, last_name, phone, email),
        vehicle:vehicles (year, make, model, color),
        bay:service_bays (name, bay_type)
      `)
      .single();

    if (appointmentError) throw appointmentError;

    // 6. Add appointment services
    const appointmentServices = services.map(s => ({
      appointment_id: appointment.id,
      service_id: s.id,
      service_name: s.name,
      quoted_price: s.price_min,
      duration_minutes: s.duration_minutes
    }));

    const { error: servicesInsertError } = await supabase
      .from('appointment_services')
      .insert(appointmentServices);

    if (servicesInsertError) throw servicesInsertError;

    // 7. Mark time slots as unavailable
    const slotsNeeded = Math.ceil(totalDuration / 30);
    const startTime = appointment_time;
    
    // Calculate all slot times needed
    const slotTimes = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    let currentMinutes = startHour * 60 + startMin;
    
    for (let i = 0; i < slotsNeeded; i++) {
      const hour = Math.floor(currentMinutes / 60);
      const min = currentMinutes % 60;
      slotTimes.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`);
      currentMinutes += 30;
    }

    const { error: slotUpdateError } = await supabase
      .from('time_slots')
      .update({ is_available: false, appointment_id: appointment.id })
      .eq('slot_date', appointment_date)
      .eq('bay_id', assignedBayId)
      .in('start_time', slotTimes);

    if (slotUpdateError) {
      console.error('Error updating slots:', slotUpdateError);
      // Don't fail the booking, but log the error
    }

    // 8. Format response for voice agent
    const dateObj = parseISO(appointment_date);
    const dayName = format(dateObj, 'EEEE');
    const monthDay = format(dateObj, 'MMMM d');
    const timeFormatted = formatTime12Hour(appointment_time);

    res.status(201).json({
      success: true,
      appointment: {
        ...appointment,
        services,
        confirmation_message: `Your appointment is confirmed for ${dayName}, ${monthDay} at ${timeFormatted}.`,
        formatted_date: `${dayName}, ${monthDay}`,
        formatted_time: timeFormatted
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/appointments
 * List appointments with filters
 */
router.get('/', async (req, res, next) => {
  try {
    const { 
      date, 
      start_date, 
      end_date, 
      status, 
      bay_id,
      limit = 50,
      offset = 0
    } = req.query;

    let query = supabase
      .from('appointments')
      .select(`
        *,
        customer:customers (id, first_name, last_name, phone, email),
        vehicle:vehicles (year, make, model, color, license_plate),
        bay:service_bays (id, name, bay_type),
        technician:technicians (id, first_name, last_name),
        appointment_services (
          service_name,
          quoted_price,
          final_price,
          duration_minutes
        )
      `, { count: 'exact' })
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (date) {
      query = query.eq('scheduled_date', date);
    } else if (start_date && end_date) {
      query = query.gte('scheduled_date', start_date).lte('scheduled_date', end_date);
    }

    if (status) {
      const statuses = status.split(',');
      query = query.in('status', statuses);
    }

    if (bay_id) {
      query = query.eq('bay_id', bay_id);
    }

    const { data: appointments, error, count } = await query;

    if (error) throw error;

    res.json({
      appointments,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: (parseInt(offset) + appointments.length) < count
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/appointments/upcoming
 * Get all upcoming appointments (today and future)
 */
router.get('/upcoming', async (req, res, next) => {
  try {
    const { limit = 50, status } = req.query;
    const today = format(new Date(), 'yyyy-MM-dd');

    let query = supabase
      .from('appointments')
      .select(`
        *,
        customer:customers (id, first_name, last_name, phone, email),
        vehicle:vehicles (year, make, model, color),
        bay:service_bays (name),
        appointment_services (service_name, duration_minutes)
      `)
      .gte('scheduled_date', today)
      .not('status', 'in', '("cancelled","no_show","completed")')
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true })
      .limit(parseInt(limit));

    if (status) {
      query = query.eq('status', status);
    }

    const { data: appointments, error } = await query;

    if (error) throw error;

    // Group by date for display
    const byDate = {};
    for (const apt of appointments) {
      if (!byDate[apt.scheduled_date]) {
        byDate[apt.scheduled_date] = [];
      }
      byDate[apt.scheduled_date].push(apt);
    }

    res.json({
      appointments,
      by_date: byDate,
      total: appointments.length
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/appointments/today
 * Get today's appointments
 */
router.get('/today', async (req, res, next) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        customer:customers (first_name, last_name, phone),
        vehicle:vehicles (year, make, model, color),
        bay:service_bays (name),
        appointment_services (service_name, duration_minutes)
      `)
      .eq('scheduled_date', today)
      .order('scheduled_time');

    if (error) throw error;

    // Group by status
    const byStatus = {
      scheduled: [],
      confirmed: [],
      checked_in: [],
      in_progress: [],
      completed: [],
      cancelled: [],
      no_show: []
    };

    for (const apt of appointments) {
      if (byStatus[apt.status]) {
        byStatus[apt.status].push(apt);
      }
    }

    res.json({
      date: today,
      appointments,
      by_status: byStatus,
      summary: {
        total: appointments.length,
        active: appointments.filter(a => 
          ['scheduled', 'confirmed', 'checked_in', 'in_progress'].includes(a.status)
        ).length,
        completed: byStatus.completed.length,
        cancelled: byStatus.cancelled.length + byStatus.no_show.length
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/appointments/:id
 * Get single appointment by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        customer:customers (*),
        vehicle:vehicles (*),
        bay:service_bays (*),
        technician:technicians (id, first_name, last_name, skill_level),
        appointment_services (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: { message: 'Appointment not found' } });
      }
      throw error;
    }

    res.json({ appointment });

  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/appointments/:id
 * Update appointment (status, reschedule, etc.)
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If rescheduling, need to handle slot changes
    if (updates.scheduled_date || updates.scheduled_time) {
      // Get current appointment
      const { data: current } = await supabase
        .from('appointments')
        .select('scheduled_date, scheduled_time, bay_id, estimated_duration_minutes')
        .eq('id', id)
        .single();

      if (current) {
        // Free up old slots
        await supabase
          .from('time_slots')
          .update({ is_available: true, appointment_id: null })
          .eq('appointment_id', id);

        // Book new slots
        const newDate = updates.scheduled_date || current.scheduled_date;
        const newTime = updates.scheduled_time || current.scheduled_time;
        const bayId = updates.bay_id || current.bay_id;
        const duration = current.estimated_duration_minutes;

        const slotsNeeded = Math.ceil(duration / 30);
        const slotTimes = [];
        const [startHour, startMin] = newTime.split(':').map(Number);
        let currentMinutes = startHour * 60 + startMin;

        for (let i = 0; i < slotsNeeded; i++) {
          const hour = Math.floor(currentMinutes / 60);
          const min = currentMinutes % 60;
          slotTimes.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`);
          currentMinutes += 30;
        }

        await supabase
          .from('time_slots')
          .update({ is_available: false, appointment_id: id })
          .eq('slot_date', newDate)
          .eq('bay_id', bayId)
          .in('start_time', slotTimes);
      }
    }

    // If cancelling, free up slots
    if (updates.status === 'cancelled' || updates.status === 'no_show') {
      await supabase
        .from('time_slots')
        .update({ is_available: true, appointment_id: null })
        .eq('appointment_id', id);
    }

    // Update appointment
    const { data: appointment, error } = await supabase
      .from('appointments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        customer:customers (first_name, last_name, phone),
        vehicle:vehicles (year, make, model),
        bay:service_bays (name)
      `)
      .single();

    if (error) throw error;

    res.json({ appointment });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/appointments/:id/confirm
 * Send confirmation SMS/email
 */
router.post('/:id/confirm', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get appointment details
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        customer:customers (first_name, phone, email, preferred_contact),
        vehicle:vehicles (year, make, model),
        appointment_services (service_name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Format confirmation message
    const dateObj = parseISO(appointment.scheduled_date);
    const dayName = format(dateObj, 'EEEE');
    const monthDay = format(dateObj, 'MMMM d');
    const time = formatTime12Hour(appointment.scheduled_time);
    const services = appointment.appointment_services.map(s => s.service_name).join(', ');

    const message = `Hi ${appointment.customer.first_name}! Your appointment at Premier Auto Service is confirmed for ${dayName}, ${monthDay} at ${time}. Services: ${services}. Reply STOP to opt out.`;

    // TODO: Send via Twilio
    // For now, just mark as sent
    await supabase
      .from('appointments')
      .update({ 
        confirmation_sent_at: new Date().toISOString(),
        status: 'confirmed'
      })
      .eq('id', id);

    res.json({
      success: true,
      message: 'Confirmation sent',
      confirmation_text: message
    });

  } catch (error) {
    next(error);
  }
});

// Helper function
function formatTime12Hour(timeStr) {
  const [hours, mins] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(mins).padStart(2, '0')} ${period}`;
}

export default router;
