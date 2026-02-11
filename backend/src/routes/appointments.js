import { Router } from 'express';
import { supabase, normalizePhone } from '../config/database.js';
import { format, parseISO } from 'date-fns';
import { assignTechnician, getRequiredSkillLevel, getBestBayType } from './retell-functions.js';
import { isValidDate, isValidTime, isValidPhone, isValidUUID, isValidUUIDArray, isWeekday, isWithinBusinessHours, isFutureDate, isWithinBookingWindow, clampPagination, validationError } from '../middleware/validate.js';
import { nowEST, todayEST } from '../utils/timezone.js';

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
      return validationError(res, 'Missing required fields: customer_phone, service_ids, appointment_date, appointment_time');
    }
    if (!isValidPhone(customer_phone)) {
      return validationError(res, 'Invalid phone number format');
    }
    if (!isValidDate(appointment_date)) {
      return validationError(res, 'Invalid date format. Use YYYY-MM-DD');
    }
    if (!isValidTime(appointment_time)) {
      return validationError(res, 'Invalid time format. Use HH:MM');
    }
    if (!isWeekday(appointment_date)) {
      return validationError(res, 'Appointments are only available Monday-Friday');
    }
    if (!isWithinBusinessHours(appointment_time)) {
      return validationError(res, 'Appointments are only available 7:00 AM - 4:00 PM');
    }
    if (!isFutureDate(appointment_date)) {
      return validationError(res, 'Appointment date cannot be in the past');
    }
    if (!isWithinBookingWindow(appointment_date)) {
      return validationError(res, 'Appointments can only be booked up to 60 days in advance');
    }
    const serviceIdList = Array.isArray(service_ids) ? service_ids : [service_ids];
    if (!isValidUUIDArray(serviceIdList)) {
      return validationError(res, 'service_ids must be valid UUIDs');
    }
    if (bay_id && !isValidUUID(bay_id)) {
      return validationError(res, 'Invalid bay_id format');
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
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, duration_minutes, price_min, price_max, required_bay_type, required_skill_level')
      .in('id', serviceIdList);

    if (servicesError) throw servicesError;

    const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
    const quotedTotal = services.reduce((sum, s) => sum + (s.price_min || 0), 0);

    // 4. Find available bay if not specified (using most specialized bay type)
    let assignedBayId = bay_id;
    
    if (!assignedBayId) {
      const requiredBayType = getBestBayType(services);

      // Find compatible bays
      const { data: compatibleBays } = await supabase
        .from('service_bays')
        .select('id')
        .eq('is_active', true)
        .eq('bay_type', requiredBayType);

      const compatibleBayIds = compatibleBays?.map(b => b.id) || [];

      // Find available slot in compatible bays
      const { data: availableSlot } = compatibleBayIds.length > 0
        ? await supabase
          .from('time_slots')
          .select('bay_id')
          .eq('slot_date', appointment_date)
          .eq('start_time', appointment_time + ':00')
          .eq('is_available', true)
          .in('bay_id', compatibleBayIds)
          .limit(1)
          .single()
        : { data: null };

      if (!availableSlot) {
        return res.status(409).json({
          error: { 
            message: 'No available bay at the requested time. Please choose a different time.' 
          }
        });
      }

      assignedBayId = availableSlot.bay_id;
    }

    // 4b. Auto-assign technician
    const requiredSkill = getRequiredSkillLevel(services);
    const technicianId = await assignTechnician({
      bay_id: assignedBayId,
      appointment_date,
      appointment_time,
      duration_minutes: totalDuration,
      required_skill_level: requiredSkill,
    });

    // 5. Create appointment
    const appointmentPayload = {
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
    };
    if (technicianId) appointmentPayload.technician_id = technicianId;

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert(appointmentPayload)
      .select(`
        *,
        customer:customers (first_name, last_name, phone, email),
        vehicle:vehicles (year, make, model, color),
        bay:service_bays (name, bay_type),
        technician:technicians (id, first_name, last_name, skill_level)
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

    // 7. Atomically book time slots (prevents double-booking race condition)
    const { data: bookingResult, error: rpcError } = await supabase
      .rpc('book_appointment_slots', {
        p_bay_id: assignedBayId,
        p_date: appointment_date,
        p_start_time: appointment_time,
        p_duration_minutes: totalDuration,
        p_appointment_id: appointment.id
      });

    if (rpcError || !bookingResult?.success) {
      // Slot was taken between check and book — soft-delete the appointment for audit trail
      console.error('Atomic booking failed:', rpcError || bookingResult);
      await supabase.from('appointments')
        .update({ deleted_at: new Date().toISOString(), status: 'booking_failed' })
        .eq('id', appointment.id);
      return res.status(409).json({
        error: { message: 'That time slot was just taken. Please choose a different time.' }
      });
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
    } = req.query;
    const { limit, offset } = clampPagination(req.query.limit, req.query.offset);

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
      .is('deleted_at', null)
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

    // Enrich appointments with dynamic status
    const now = nowEST();
    const enrichedAppointments = appointments.map(apt => enrichAppointmentWithDynamicStatus(apt, now));

    res.json({
      appointments: enrichedAppointments,
      pagination: {
        total: count,
        limit,
        offset,
        has_more: (offset + appointments.length) < count
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
    const today = todayEST();

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
      .is('deleted_at', null)
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
 * Get today's appointments with dynamic status calculation
 */
router.get('/today', async (req, res, next) => {
  try {
    const now = nowEST();
    const today = todayEST();

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
      .is('deleted_at', null)
      .order('scheduled_time');

    if (error) throw error;

    // Enrich appointments with dynamic status
    const enrichedAppointments = appointments.map(apt => enrichAppointmentWithDynamicStatus(apt, now));

    // Group by dynamic display status
    const byStatus = {
      scheduled: [],
      confirmed: [],
      checked_in: [],
      in_progress: [],
      checking_out: [],
      completed: [],
      cancelled: [],
      no_show: []
    };

    for (const apt of enrichedAppointments) {
      const statusKey = apt.display_status;
      if (byStatus[statusKey]) {
        byStatus[statusKey].push(apt);
      }
    }

    res.json({
      date: today,
      current_time: format(now, 'HH:mm'),
      appointments: enrichedAppointments,
      by_status: byStatus,
      summary: {
        total: enrichedAppointments.length,
        active: enrichedAppointments.filter(a => 
          ['scheduled', 'confirmed', 'checked_in', 'in_progress'].includes(a.display_status)
        ).length,
        in_progress: byStatus.in_progress.length,
        checking_out: byStatus.checking_out.length,
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
    if (!isValidUUID(id)) return validationError(res, 'Invalid appointment ID');

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
      .is('deleted_at', null)
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
const VALID_STATUSES = ['scheduled', 'confirmed', 'checked_in', 'in_progress', 'checking_out', 'completed', 'cancelled', 'no_show', 'invoiced', 'paid'];

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid appointment ID');
    const updates = req.body;

    if (updates.status && !VALID_STATUSES.includes(updates.status)) {
      return validationError(res, `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    // If rescheduling, atomically free old + book new slots
    if (updates.scheduled_date || updates.scheduled_time) {
      const { data: current } = await supabase
        .from('appointments')
        .select('scheduled_date, scheduled_time, bay_id, estimated_duration_minutes')
        .eq('id', id)
        .single();

      if (current) {
        const newDate = updates.scheduled_date || current.scheduled_date;
        const newTime = updates.scheduled_time || current.scheduled_time;
        const bayId = updates.bay_id || current.bay_id;
        const duration = current.estimated_duration_minutes;

        // Free old slots
        await supabase.rpc('free_appointment_slots', { p_appointment_id: id });

        // Atomically book new slots
        const { data: bookingResult, error: rpcError } = await supabase
          .rpc('book_appointment_slots', {
            p_bay_id: bayId,
            p_date: newDate,
            p_start_time: newTime,
            p_duration_minutes: duration,
            p_appointment_id: id
          });

        if (rpcError || !bookingResult?.success) {
          // Re-book old slots since reschedule failed
          await supabase.rpc('book_appointment_slots', {
            p_bay_id: current.bay_id,
            p_date: current.scheduled_date,
            p_start_time: current.scheduled_time,
            p_duration_minutes: duration,
            p_appointment_id: id
          });
          return res.status(409).json({
            error: { message: 'That time slot is not available. Please choose a different time.' }
          });
        }
      }
    }

    // If cancelling, free up slots
    if (updates.status === 'cancelled' || updates.status === 'no_show') {
      await supabase.rpc('free_appointment_slots', { p_appointment_id: id });
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
    if (!isValidUUID(id)) return validationError(res, 'Invalid appointment ID');

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

/**
 * Calculate dynamic status based on scheduled time, duration, and current time
 * Only applies to appointments scheduled for today
 */
function calculateDynamicStatus(appointment, now = nowEST()) {
  const today = format(now, 'yyyy-MM-dd');
  
  // Only calculate dynamic status for today's appointments
  if (appointment.scheduled_date !== today) {
    return appointment.status;
  }
  
  // Don't override terminal statuses
  const terminalStatuses = ['completed', 'cancelled', 'no_show', 'invoiced', 'paid'];
  if (terminalStatuses.includes(appointment.status)) {
    return appointment.status;
  }
  
  // Parse scheduled time
  const [hours, mins] = appointment.scheduled_time.split(':').map(Number);
  const scheduledStart = new Date(now);
  scheduledStart.setHours(hours, mins, 0, 0);
  
  // Calculate end time based on estimated duration (default 60 min if not set)
  const durationMinutes = appointment.estimated_duration_minutes || 60;
  const scheduledEnd = new Date(scheduledStart.getTime() + durationMinutes * 60 * 1000);
  
  // Add a 15-minute "checking out" buffer after completion
  const checkoutEnd = new Date(scheduledEnd.getTime() + 15 * 60 * 1000);
  
  const currentTime = now.getTime();
  const startTime = scheduledStart.getTime();
  const endTime = scheduledEnd.getTime();
  const checkoutEndTime = checkoutEnd.getTime();
  
  // Determine dynamic status
  if (currentTime < startTime) {
    // Before appointment - keep original status
    return appointment.status;
  } else if (currentTime >= startTime && currentTime < endTime) {
    // During appointment
    return 'in_progress';
  } else if (currentTime >= endTime && currentTime < checkoutEndTime) {
    // Just finished - checking out period
    return 'checking_out';
  } else {
    // Past checkout window - completed
    return 'completed';
  }
}

/**
 * Add dynamic status and estimated end time to appointments
 */
function enrichAppointmentWithDynamicStatus(appointment, now = nowEST()) {
  const dynamicStatus = calculateDynamicStatus(appointment, now);
  
  // Calculate estimated end time
  let estimatedEndTime = null;
  if (appointment.scheduled_time && appointment.estimated_duration_minutes) {
    const [hours, mins] = appointment.scheduled_time.split(':').map(Number);
    const startMinutes = hours * 60 + mins;
    const endMinutes = startMinutes + appointment.estimated_duration_minutes;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    estimatedEndTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
  }
  
  return {
    ...appointment,
    display_status: dynamicStatus,
    original_status: appointment.status,
    estimated_end_time: estimatedEndTime,
    estimated_end_time_formatted: estimatedEndTime ? formatTime12Hour(estimatedEndTime) : null
  };
}

/**
 * GET /api/appointments/debug/tech-assignments
 * Diagnostic endpoint to verify technician-bay assignment data
 */
router.get('/debug/tech-assignments', async (req, res) => {
  try {
    const { data: assignments } = await supabase
      .from('technician_bay_assignments')
      .select('technician_id, bay_id, is_primary');

    const { data: techs } = await supabase
      .from('technicians')
      .select('id, first_name, last_name, skill_level, is_active');

    const { data: schedules } = await supabase
      .from('technician_schedules')
      .select('technician_id, day_of_week, start_time, end_time, is_active');

    const { data: bays } = await supabase
      .from('service_bays')
      .select('id, name, bay_type, is_active');

    res.json({
      assignments_count: assignments?.length || 0,
      technicians_count: techs?.length || 0,
      schedules_count: schedules?.length || 0,
      bays_count: bays?.length || 0,
      assignments: assignments?.slice(0, 5),
      technicians: techs,
      bays: bays,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
