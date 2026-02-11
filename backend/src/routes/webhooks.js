import { Router } from 'express';
import { Retell } from 'retell-sdk';
import { supabase, normalizePhone } from '../config/database.js';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { format, addDays, parseISO } from 'date-fns';
import { todayEST, nowEST, daysAgoEST } from '../utils/timezone.js';
import { logger } from '../utils/logger.js';
import { logSMS, formatTime12Hour } from '../services/sms.js';
import { sendConfirmationSMS } from '../services/sms.js';
import { getBestBayType } from './retell-functions.js';

const router = Router();

// API key for webhook verification (support white-label: NUCLEUS_API_KEY or RETELL_API_KEY)
const RETELL_API_KEY = process.env.NUCLEUS_API_KEY || process.env.RETELL_API_KEY;
const RETELL_SKIP_WEBHOOK_VERIFY = process.env.RETELL_SKIP_WEBHOOK_VERIFY === 'true' || process.env.RETELL_SKIP_WEBHOOK_VERIFY === '1';

/**
 * Verify Retell webhook signature for security
 * Returns true if valid, false if invalid.
 * Set RETELL_SKIP_WEBHOOK_VERIFY=true to skip (e.g. if Retell signing key differs from API key).
 */
function verifyRetellSignature(req) {
  if (RETELL_SKIP_WEBHOOK_VERIFY) {
    logger.warn('Webhook signature verification skipped', { reason: 'RETELL_SKIP_WEBHOOK_VERIFY' });
    return true;
  }
  if (!RETELL_API_KEY) {
    logger.error('Webhook rejected: API key not configured');
    return false;
  }

  const signature = req.headers['x-retell-signature'];
  if (!signature) {
    logger.warn('Webhook rejected: no x-retell-signature header');
    return false;
  }

  try {
    return Retell.verify(
      JSON.stringify(req.body),
      RETELL_API_KEY,
      signature
    );
  } catch (error) {
    logger.error('Webhook signature verification failed', { error });
    return false;
  }
}

/**
 * Get time-based greeting in EST timezone
 * Morning: 12:00 AM - 11:59 AM
 * Afternoon: 12:00 PM - 5:59 PM
 * Evening: 6:00 PM - 11:59 PM
 */
function getTimeGreeting() {
  const timezone = 'America/New_York';
  const now = toZonedTime(new Date(), timezone);
  const hour = now.getHours();
  
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Get current date info in EST timezone for AI context
 */
function getCurrentDateInfo() {
  const timezone = 'America/New_York';
  const now = toZonedTime(new Date(), timezone);
  const dayOfWeek = now.getDay(); // 0=Sunday, 6=Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  // Next open day: if Sunday -> Monday; if Saturday -> Monday
  const nextOpen = isWeekend
    ? (dayOfWeek === 0 ? addDays(now, 1) : addDays(now, 2)) // Sunday -> Monday, Saturday -> Monday
    : null;
  return {
    current_date: format(now, 'yyyy-MM-dd'),
    current_date_spoken: format(now, 'EEEE, MMMM d, yyyy'), // "Saturday, January 31, 2026"
    current_day: format(now, 'EEEE'), // "Saturday"
    current_time: format(now, 'h:mm a'), // "7:12 PM"
    current_year: format(now, 'yyyy'), // "2026"
    current_day_of_week: String(dayOfWeek), // "0" = Sunday, "6" = Saturday
    is_today_closed: isWeekend ? 'true' : 'false',
    next_open_day: nextOpen ? format(nextOpen, 'EEEE') : '', // "Monday"
    next_open_date: nextOpen ? format(nextOpen, 'yyyy-MM-dd') : ''
  };
}

/**
 * POST /api/webhooks/voice/inbound
 * Handle voice AI inbound call webhook - called BEFORE call connects
 * Used to look up caller by phone number and pass dynamic variables
 */
router.post('/voice/inbound', async (req, res) => {
  try {
    // Verify webhook signature for security
    if (!verifyRetellSignature(req)) {
      console.error('Invalid Retell webhook signature - rejecting request');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const { event, call_inbound } = req.body;
    
    console.log('Nucleus inbound webhook:', JSON.stringify(req.body));
    
    if (event !== 'call_inbound' || !call_inbound) {
      return res.json({ call_inbound: {} });
    }
    
    const { from_number, agent_id } = call_inbound;
    
    if (!from_number) {
      console.log('No from_number in inbound webhook');
      return res.json({ call_inbound: {} });
    }
    
    // Look up customer by phone number
    const normalizedPhone = normalizePhone(from_number);
    console.log('Looking up customer for:', normalizedPhone);
    
    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        id,
        first_name,
        last_name,
        phone,
        email,
        total_visits,
        vehicles (
          id,
          year,
          make,
          model,
          license_plate
        )
      `)
      .eq('phone_normalized', normalizedPhone)
      .single();
    
    // Get time-based greeting (EST timezone)
    const timeGreeting = getTimeGreeting();
    
    if (error || !customer) {
      console.log('Customer not found, new caller');
      const dateInfo = getCurrentDateInfo();
      // New customer - pass info so agent knows
      return res.json({
        call_inbound: {
          agent_override: {
            retell_llm: {
              start_speaker: "agent",
              begin_message: `${timeGreeting}! Thanks for calling Premier Auto Service, this is Amber. How can I help you today?`
            }
          },
          dynamic_variables: {
            is_existing_customer: 'false',
            customer_name: '',
            customer_first_name: '',
            customer_last_name: '',
            customer_phone: from_number,
            customer_id: '',
            vehicle_info: '',
            vehicle_id: '',
            ...dateInfo
          }
        }
      });
    }
    
    console.log('Found customer:', customer.first_name, customer.last_name);
    
    // Build vehicle info string
    let vehicleInfo = '';
    let vehicleId = '';
    if (customer.vehicles && customer.vehicles.length > 0) {
      const v = customer.vehicles[0]; // Primary vehicle
      vehicleInfo = `${v.year} ${v.make} ${v.model}`;
      vehicleId = v.id;
    }
    
    // Check if customer record is COMPLETE (has name AND vehicle)
    const hasName = customer.first_name && customer.first_name !== 'null';
    const hasVehicle = customer.vehicles && customer.vehicles.length > 0;
    const isComplete = hasName && hasVehicle;
    
    // If incomplete, treat as NEW customer so agent collects missing info
    if (!isComplete) {
      console.log('Customer record incomplete - missing:', !hasName ? 'name' : '', !hasVehicle ? 'vehicle' : '');
      const dateInfo = getCurrentDateInfo();
      return res.json({
        call_inbound: {
          agent_override: {
            retell_llm: {
              start_speaker: "agent",
              begin_message: `${timeGreeting}! Thanks for calling Premier Auto Service, this is Amber. How can I help you today?`
            }
          },
          dynamic_variables: {
            is_existing_customer: 'false',  // Treat as new so agent collects info!
            customer_needs_name: hasName ? 'false' : 'true',
            customer_needs_vehicle: hasVehicle ? 'false' : 'true',
            customer_name: hasName ? `${customer.first_name} ${customer.last_name}` : '',
            customer_first_name: customer.first_name || '',
            customer_last_name: customer.last_name || '',
            customer_phone: from_number,
            customer_id: customer.id,
            customer_email: customer.email || '',
            total_visits: String(customer.total_visits || 0),
            vehicle_info: vehicleInfo,
            vehicle_id: vehicleId,
            ...dateInfo
          }
        }
      });
    }
    
    // Build personalized greeting using first name (avoids gender assumptions)
    let nameGreeting;
    if (customer.first_name) {
      nameGreeting = customer.first_name;
    } else {
      nameGreeting = '';
    }
    
    // Build greeting message
    const greetingWithName = nameGreeting 
      ? `${timeGreeting}, ${nameGreeting}! Thanks for calling Premier Auto Service, this is Amber. How can I help you today?`
      : `${timeGreeting}! Thanks for calling Premier Auto Service, this is Amber. How can I help you today?`;
    
    // Get current date info for AI context
    const dateInfo = getCurrentDateInfo();
    
    // Get upcoming appointments for this customer
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
      .limit(3);
    
    // Get recent completed appointments (service history) - last 6 months
    const sixMonthsAgo = daysAgoEST(180);
    const { data: recentAppointments } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_date,
        appointment_services (service_id, service_name)
      `)
      .eq('customer_id', customer.id)
      .eq('status', 'completed')
      .gte('scheduled_date', sixMonthsAgo)
      .order('scheduled_date', { ascending: false })
      .limit(5);
    
    // Build upcoming appointments summary string for dynamic variable
    let upcomingApptsSummary = '';
    if (upcomingAppointments && upcomingAppointments.length > 0) {
      const apptStrings = upcomingAppointments.map(apt => {
        const date = parseISO(apt.scheduled_date);
        const services = apt.appointment_services.map(s => s.service_name).join(', ');
        const dayName = format(date, 'EEEE');
        const monthDay = format(date, 'MMMM d');
        const time = apt.scheduled_time.slice(0, 5);
        const [h, m] = time.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        const timeFormatted = `${hour12}:${String(m).padStart(2, '0')} ${period}`;
        return `${services} on ${dayName}, ${monthDay} at ${timeFormatted}`;
      });
      upcomingApptsSummary = apptStrings.join('; ');
    }
    
    // Build service history summary - when was each service last done
    let serviceHistorySummary = '';
    if (recentAppointments && recentAppointments.length > 0) {
      const serviceMap = {};
      recentAppointments.forEach(apt => {
        apt.appointment_services?.forEach(svc => {
          if (!serviceMap[svc.service_name]) {
            const daysAgo = Math.floor((new Date(todayEST() + 'T12:00:00') - parseISO(apt.scheduled_date)) / (1000 * 60 * 60 * 24));
            serviceMap[svc.service_name] = `${svc.service_name} ${daysAgo} days ago`;
          }
        });
      });
      serviceHistorySummary = Object.values(serviceMap).join('; ');
    }
    
    // Return customer info as dynamic variables with professional greeting
    return res.json({
      call_inbound: {
        agent_override: {
          retell_llm: {
            start_speaker: "agent",
            begin_message: greetingWithName
          }
        },
        dynamic_variables: {
          is_existing_customer: 'true',
          customer_name: `${customer.first_name} ${customer.last_name}`,
          customer_first_name: customer.first_name,
          customer_last_name: customer.last_name,
          customer_phone: from_number,
          customer_id: customer.id,
          customer_email: customer.email || '',
          total_visits: String(customer.total_visits || 0),
          vehicle_info: vehicleInfo,
          vehicle_id: vehicleId,
          // NEW: Upcoming appointments (e.g., "Oil Change on Friday, February 6 at 7:30 AM")
          upcoming_appointments: upcomingApptsSummary,
          // NEW: Service history (e.g., "Oil Change 25 days ago; Tire Rotation 90 days ago")
          service_history: serviceHistorySummary,
          ...dateInfo
        }
      }
    });
    
  } catch (error) {
    console.error('Inbound webhook error:', error);
    // Return empty response to allow call to proceed
    return res.json({ call_inbound: {} });
  }
});

/**
 * POST /api/webhooks/voice
 * Handle voice AI webhook events
 * Events: call_started, call_ended, call_analyzed
 */
router.post('/voice', async (req, res, next) => {
  try {
    // Verify webhook signature for security
    if (!verifyRetellSignature(req)) {
      console.error('Invalid Retell webhook signature - rejecting request');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const { event, call } = req.body;

    console.log(`Nucleus webhook: ${event}`, call?.call_id);

    switch (event) {
      case 'call_started':
        await handleCallStarted(call);
        break;
      
      case 'call_ended':
        await handleCallEnded(call);
        break;
      
      case 'call_analyzed':
        await handleCallAnalyzed(call);
        break;
      
      default:
        console.log(`Unknown webhook event: ${event}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 to prevent retries
    res.json({ received: true, error: error.message });
  }
});

async function handleCallStarted(call) {
  const { call_id, from_number, to_number, direction, start_timestamp } = call;

  // Create initial call log entry
  await supabase
    .from('call_logs')
    .insert({
      retell_call_id: call_id,
      phone_number: from_number,
      phone_normalized: normalizePhone(from_number),
      direction: direction || 'inbound',
      started_at: new Date(start_timestamp).toISOString(),
      agent_id: call.agent_id
    });

  // Try to link to customer
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('phone_normalized', normalizePhone(from_number))
    .single();

  if (customer) {
    await supabase
      .from('call_logs')
      .update({ customer_id: customer.id })
      .eq('retell_call_id', call_id);
  }
}

async function handleCallEnded(call) {
  const { 
    call_id, 
    end_timestamp, 
    duration_ms,
    disconnection_reason 
  } = call;

  console.log('Call ended:', call_id, 'duration_ms:', duration_ms, 'disconnection_reason:', disconnection_reason);

  // Determine outcome based on call data
  let outcome = 'inquiry';
  
  // Check if appointment was created during this call
  const { data: appointment } = await supabase
    .from('appointments')
    .select('id')
    .eq('call_id', call_id)
    .single();

  if (appointment) {
    outcome = 'booked';
  } else if (disconnection_reason === 'user_hangup' && (duration_ms || 0) < 30000) {
    outcome = 'abandoned';
  } else if (disconnection_reason === 'agent_transfer') {
    outcome = 'transferred';
  }

  await supabase
    .from('call_logs')
    .update({
      ended_at: new Date(end_timestamp).toISOString(),
      duration_seconds: Math.round((duration_ms || 0) / 1000),
      outcome,
      appointment_id: appointment?.id
    })
    .eq('retell_call_id', call_id);
}

async function handleCallAnalyzed(call) {
  // Capture full call record: duration, summary, transcript, sentiment, date/time (started_at/ended_at)
  const {
    call_id,
    from_number,
    start_timestamp,
    end_timestamp,
    duration_ms,
    transcript,
    recording_url,
    call_summary,
    call_analysis,
    agent_id,
    direction,
    disconnection_reason
  } = call;

  console.log('Call analyzed:', call_id, 'Capturing full call record');

  // Extract analysis data (payload may use call_analysis or top-level)
  const sentiment = (call_analysis?.user_sentiment || 'neutral').toString().toLowerCase();
  const summary = call_analysis?.call_summary || call_summary || '';
  const callSuccessful = call_analysis?.call_successful;

  // Determine intent from summary
  let intentDetected = 'inquiry';
  if (summary) {
    const lowerSummary = summary.toLowerCase();
    if (lowerSummary.includes('book') || lowerSummary.includes('schedule') || lowerSummary.includes('appointment')) {
      intentDetected = 'book';
    } else if (lowerSummary.includes('reschedule') || lowerSummary.includes('move') || lowerSummary.includes('change')) {
      intentDetected = 'reschedule';
    } else if (lowerSummary.includes('cancel')) {
      intentDetected = 'cancel';
    } else if (lowerSummary.includes('tow') || lowerSummary.includes('towing')) {
      intentDetected = 'tow';
    }
  }

  const phoneNorm = from_number ? normalizePhone(from_number) : null;

  // Get existing call log (if call_started was received)
  const { data: existingLog } = await supabase
    .from('call_logs')
    .select('id, customer_id, phone_normalized, outcome, appointment_id')
    .eq('retell_call_id', call_id)
    .single();

  const startedAt = start_timestamp ? new Date(start_timestamp).toISOString() : null;
  const endedAt = end_timestamp ? new Date(end_timestamp).toISOString() : null;
  const durationSeconds = duration_ms != null ? Math.round(Number(duration_ms) / 1000) : null;

  if (existingLog) {
    // Update existing call log with full analysis data
    const updateData = {
      transcript: transcript || existingLog.transcript,
      recording_url: recording_url || existingLog.recording_url,
      transcript_summary: summary,
      sentiment,
      intent_detected: intentDetected,
      started_at: startedAt || existingLog.started_at,
      ended_at: endedAt || existingLog.ended_at,
      duration_seconds: durationSeconds ?? existingLog.duration_seconds
    };

    if (callSuccessful === true) {
      if (existingLog.appointment_id) {
        updateData.outcome = 'booked';
      } else if (existingLog.outcome !== 'booked') {
        updateData.outcome = 'completed';
      }
    }

    if (!existingLog.customer_id && phoneNorm) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone_normalized', phoneNorm)
        .single();
      if (customer) updateData.customer_id = customer.id;
    }

    await supabase
      .from('call_logs')
      .update(updateData)
      .eq('retell_call_id', call_id);
  } else {
    // call_started was missed: create full call record from call_analyzed payload so we never lose a call
    const insertData = {
      retell_call_id: call_id,
      phone_number: from_number || null,
      phone_normalized: phoneNorm || null,
      direction: direction || 'inbound',
      started_at: startedAt,
      ended_at: endedAt,
      duration_seconds: durationSeconds,
      transcript: transcript || null,
      transcript_summary: summary || null,
      recording_url: recording_url || null,
      sentiment,
      intent_detected: intentDetected,
      outcome: callSuccessful === true ? 'completed' : 'inquiry',
      agent_id: agent_id || null
    };

    const { data: appointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('call_id', call_id)
      .single();
    if (appointment) {
      insertData.appointment_id = appointment.id;
      insertData.outcome = 'booked';
    }

    if (phoneNorm) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone_normalized', phoneNorm)
        .single();
      if (customer) insertData.customer_id = customer.id;
    }

    await supabase.from('call_logs').insert(insertData);
  }
}

// ── Two-Way SMS Helpers ──────────────────────────────────────────────

function replyTwiML(res, message) {
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  res.type('text/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`
  );
}

function emptyTwiML(res) {
  res.type('text/xml').send(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
  );
}

async function logInboundSMS({ phone, body, customerId }) {
  await logSMS({
    toPhone: process.env.TWILIO_PHONE_NUMBER || '',
    body,
    messageType: 'inbound',
    status: 'received',
    customerId,
    direction: 'inbound'
  });
}

async function findNextUpcomingAppointment(customerId) {
  const today = todayEST();
  const { data } = await supabase
    .from('appointments')
    .select(`
      id,
      scheduled_date,
      scheduled_time,
      status,
      bay_id,
      estimated_duration_minutes,
      customer:customers (id, first_name, phone),
      appointment_services (service_id, service_name),
      vehicle:vehicles (year, make, model)
    `)
    .eq('customer_id', customerId)
    .gte('scheduled_date', today)
    .is('deleted_at', null)
    .not('status', 'in', '("cancelled","completed","no_show")')
    .order('scheduled_date')
    .order('scheduled_time')
    .limit(1)
    .single();
  return data;
}

async function getActiveConversation(phone) {
  const { data } = await supabase
    .from('sms_conversations')
    .select('*')
    .eq('phone', phone)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data;
}

async function expireConversation(id) {
  await supabase.from('sms_conversations').delete().eq('id', id);
}

function addMinutesToTimeSMS(timeStr, minutes) {
  const [hours, mins] = timeStr.split(':').map(Number);
  const totalMins = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMins / 60);
  const newMins = totalMins % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

async function handleConfirm(customer, res) {
  const appointment = await findNextUpcomingAppointment(customer.id);
  if (!appointment) {
    return replyTwiML(res, "You don't have any upcoming appointments to confirm. If you'd like to book one, give us a call at (647) 371-1990.\n\n- Amber");
  }

  await supabase
    .from('appointments')
    .update({ status: 'confirmed' })
    .eq('id', appointment.id);

  const services = appointment.appointment_services?.map(s => s.service_name).join(', ') || '';
  const date = parseISO(appointment.scheduled_date);
  const formattedDate = format(date, 'EEEE, MMMM do');
  const formattedTime = formatTime12Hour(appointment.scheduled_time);

  return replyTwiML(res, `Your appointment is confirmed:\n\n${services}\n${formattedDate} at ${formattedTime}\n\nSee you then!\n\n- Amber`);
}

async function handleCancel(customer, res) {
  const appointment = await findNextUpcomingAppointment(customer.id);
  if (!appointment) {
    return replyTwiML(res, "You don't have any upcoming appointments to cancel. If you need help, call us at (647) 371-1990.\n\n- Amber");
  }

  // Free slots atomically
  await supabase.rpc('free_appointment_slots', { p_appointment_id: appointment.id });

  await supabase
    .from('appointments')
    .update({ status: 'cancelled', internal_notes: 'Cancelled via SMS' })
    .eq('id', appointment.id);

  const services = appointment.appointment_services?.map(s => s.service_name).join(', ') || '';
  const date = parseISO(appointment.scheduled_date);
  const formattedDate = format(date, 'EEEE, MMMM do');
  const formattedTime = formatTime12Hour(appointment.scheduled_time);

  return replyTwiML(res, `Your appointment has been cancelled:\n\n${services}\n${formattedDate} at ${formattedTime}\n\nIf you'd like to rebook, reply RESCHEDULE or call us at (647) 371-1990.\n\n- Amber`);
}

async function handleReschedule(customer, phone, res) {
  const appointment = await findNextUpcomingAppointment(customer.id);
  if (!appointment) {
    return replyTwiML(res, "You don't have any upcoming appointments to reschedule. If you'd like to book one, give us a call at (647) 371-1990.\n\n- Amber");
  }

  // Get service IDs for availability check
  const serviceIds = appointment.appointment_services?.map(s => s.service_id) || [];
  if (serviceIds.length === 0) {
    return replyTwiML(res, "I couldn't find the service details for your appointment. Please call us at (647) 371-1990 and we'll help you reschedule.\n\n- Amber");
  }

  // Get services for bay type + duration
  const { data: services } = await supabase
    .from('services')
    .select('id, name, duration_minutes, required_bay_type')
    .in('id', serviceIds);

  if (!services || services.length === 0) {
    return replyTwiML(res, "I had trouble looking up your services. Please call us at (647) 371-1990.\n\n- Amber");
  }

  const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
  const primaryBayType = getBestBayType(services);

  // Get compatible bays
  const { data: bays } = await supabase
    .from('service_bays')
    .select('id')
    .eq('is_active', true)
    .eq('bay_type', primaryBayType);

  if (!bays || bays.length === 0) {
    return replyTwiML(res, "I'm sorry, we don't have the right equipment available right now. Please call us at (647) 371-1990.\n\n- Amber");
  }

  const bayIds = bays.map(b => b.id);

  // Search for available slots over the next 14 days (weekdays only, 7am-4pm)
  const today = todayEST();
  const endDate = format(addDays(parseISO(today), 14), 'yyyy-MM-dd');

  const { data: rawSlots } = await supabase
    .from('time_slots')
    .select('slot_date, start_time, bay_id')
    .in('bay_id', bayIds)
    .eq('is_available', true)
    .gte('slot_date', today)
    .lte('slot_date', endDate)
    .gte('start_time', '07:00')
    .lt('start_time', '16:00')
    .order('slot_date')
    .order('start_time');

  // Filter to weekdays only
  const isWeekday = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    const day = d.getDay();
    return day >= 1 && day <= 5;
  };
  const slots = (rawSlots || []).filter(s => isWeekday(s.slot_date));

  // Find consecutive slot windows
  const slotsNeeded = Math.ceil(totalDuration / 30);
  const availableWindows = [];
  const slotsByDateBay = {};

  for (const slot of slots) {
    const key = `${slot.slot_date}_${slot.bay_id}`;
    if (!slotsByDateBay[key]) slotsByDateBay[key] = [];
    slotsByDateBay[key].push(slot);
  }

  // Filter out past slots for today
  const now = nowEST();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  for (const [key, baySlots] of Object.entries(slotsByDateBay)) {
    const [slotDate] = key.split('_');
    baySlots.sort((a, b) => a.start_time.localeCompare(b.start_time));

    for (let i = 0; i <= baySlots.length - slotsNeeded; i++) {
      const slotTime = baySlots[i].start_time;
      const [slotHour, slotMinute] = slotTime.split(':').map(Number);

      if (slotDate === today) {
        const slotMinutes = slotHour * 60 + slotMinute;
        const currentMinutes = currentHour * 60 + currentMinute + 30;
        if (slotMinutes <= currentMinutes) continue;
      }

      let consecutive = true;
      for (let j = 1; j < slotsNeeded; j++) {
        const expected = addMinutesToTimeSMS(baySlots[i + j - 1].start_time, 30);
        const nextTime = baySlots[i + j].start_time.slice(0, 5);
        if (nextTime !== expected) {
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

  // Deduplicate by date+time, limit to 4
  const uniqueSlots = [];
  const seen = new Set();
  for (const slot of availableWindows) {
    const key = `${slot.date}_${slot.time}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSlots.push(slot);
    }
    if (uniqueSlots.length >= 4) break;
  }

  if (uniqueSlots.length === 0) {
    return replyTwiML(res, "I'm sorry, I don't have any available times in the next two weeks. Please call us at (647) 371-1990 and we'll find something for you.\n\n- Amber");
  }

  // Format options for SMS
  const options = uniqueSlots.map((s, i) => {
    const date = parseISO(s.date);
    const dayName = format(date, 'EEEE');
    const monthDay = format(date, 'MMMM d');
    return `${i + 1}. ${dayName}, ${monthDay} at ${formatTime12Hour(s.time)}`;
  });

  // Create conversation state (expires in 30 minutes)
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await supabase.from('sms_conversations').insert({
    customer_id: customer.id,
    phone,
    state: 'awaiting_reschedule_choice',
    context: {
      appointment_id: appointment.id,
      service_ids: serviceIds,
      duration_minutes: totalDuration,
      old_bay_id: appointment.bay_id,
      old_date: appointment.scheduled_date,
      old_time: appointment.scheduled_time,
      slots: uniqueSlots
    },
    expires_at: expiresAt
  });

  const serviceNames = appointment.appointment_services?.map(s => s.service_name).join(', ') || '';
  return replyTwiML(res, `Here are the next available times for ${serviceNames}:\n\n${options.join('\n')}\n\nReply with the number of your choice (1-${uniqueSlots.length}).\n\n- Amber`);
}

async function handleConversationReply(conversation, message, customer, res) {
  const choice = parseInt(message, 10);
  const { slots, appointment_id, duration_minutes, old_bay_id, old_date, old_time } = conversation.context;

  if (isNaN(choice) || choice < 1 || choice > slots.length) {
    return replyTwiML(res, `Please reply with a number between 1 and ${slots.length}, or text CANCEL to cancel your appointment.\n\n- Amber`);
  }

  const chosen = slots[choice - 1];

  // Free old slots
  await supabase.rpc('free_appointment_slots', { p_appointment_id: appointment_id });

  // Atomically book new slots
  const { data: bookingResult, error: rpcError } = await supabase
    .rpc('book_appointment_slots', {
      p_bay_id: chosen.bay_id,
      p_date: chosen.date,
      p_start_time: chosen.time,
      p_duration_minutes: duration_minutes,
      p_appointment_id: appointment_id
    });

  if (rpcError || !bookingResult?.success) {
    // Rollback — re-book old slots
    await supabase.rpc('book_appointment_slots', {
      p_bay_id: old_bay_id,
      p_date: old_date,
      p_start_time: old_time,
      p_duration_minutes: duration_minutes,
      p_appointment_id: appointment_id
    });
    await expireConversation(conversation.id);
    return replyTwiML(res, "That time just got taken! Reply RESCHEDULE to see new options.\n\n- Amber");
  }

  // Update appointment record
  await supabase
    .from('appointments')
    .update({
      scheduled_date: chosen.date,
      scheduled_time: chosen.time,
      bay_id: chosen.bay_id,
      status: 'confirmed'
    })
    .eq('id', appointment_id);

  // Clean up conversation
  await expireConversation(conversation.id);

  const date = parseISO(chosen.date);
  const formattedDate = format(date, 'EEEE, MMMM do');
  const formattedTime = formatTime12Hour(chosen.time);

  // Send confirmation SMS async (separate from TwiML reply)
  const appointment = await findNextUpcomingAppointment(customer.id);
  if (appointment) {
    const services = appointment.appointment_services?.map(s => s.service_name).join(', ') || '';
    const vehicleDesc = appointment.vehicle
      ? `${appointment.vehicle.year} ${appointment.vehicle.make} ${appointment.vehicle.model}`
      : null;
    sendConfirmationSMS({
      customerPhone: customer.phone,
      customerName: customer.first_name,
      appointmentDate: chosen.date,
      appointmentTime: chosen.time,
      services,
      vehicleDescription: vehicleDesc,
      customerId: customer.id,
      appointmentId: appointment_id
    }).catch(err => console.error('[SMS] Reschedule confirmation SMS failed:', err.message));
  }

  return replyTwiML(res, `You're all set! Your appointment has been rescheduled to:\n\n${formattedDate} at ${formattedTime}\n\nSee you then!\n\n- Amber`);
}

// ── SMS Webhook ─────────────────────────────────────────────────────

/**
 * POST /api/webhooks/twilio/sms
 * Handle inbound SMS — two-way CONFIRM / CANCEL / RESCHEDULE
 */
router.post('/twilio/sms', async (req, res, next) => {
  try {
    const { From, Body } = req.body;
    if (!From || !Body) return emptyTwiML(res);

    const rawMessage = Body.trim();
    const message = rawMessage.toLowerCase();
    const normalizedPhone = normalizePhone(From);

    console.log(`[SMS Inbound] From ${From}: ${rawMessage}`);

    // Look up customer
    const { data: customer } = await supabase
      .from('customers')
      .select('id, first_name, phone')
      .eq('phone_normalized', normalizedPhone)
      .single();

    // Log inbound message
    await logInboundSMS({ phone: From, body: rawMessage, customerId: customer?.id });

    // Unknown phone number
    if (!customer) {
      return replyTwiML(res, "We couldn't find an account with this phone number. Please call us at (647) 371-1990 and we'll be happy to help.\n\n- Amber");
    }

    // Check for active conversation (reschedule flow)
    const conversation = await getActiveConversation(normalizedPhone);

    if (conversation && conversation.state === 'awaiting_reschedule_choice') {
      // If they type a keyword instead of a number, break out and handle
      if (['cancel'].includes(message)) {
        await expireConversation(conversation.id);
        return handleCancel(customer, res);
      }
      if (['confirm', 'yes', 'y'].includes(message)) {
        await expireConversation(conversation.id);
        return handleConfirm(customer, res);
      }
      if (['reschedule'].includes(message)) {
        await expireConversation(conversation.id);
        return handleReschedule(customer, normalizedPhone, res);
      }
      // Otherwise, treat as numeric choice
      return handleConversationReply(conversation, rawMessage, customer, res);
    }

    // Route by keyword
    if (['confirm', 'yes', 'y'].includes(message)) {
      return handleConfirm(customer, res);
    }

    if (message === 'cancel') {
      return handleCancel(customer, res);
    }

    if (message === 'reschedule') {
      return handleReschedule(customer, normalizedPhone, res);
    }

    if (message === 'stop') {
      await supabase
        .from('customers')
        .update({ marketing_opt_in: false })
        .eq('phone_normalized', normalizedPhone);
      return emptyTwiML(res);
    }

    // Anything else → help text
    return replyTwiML(res, "Hi! Here's what I can help with:\n\nReply CONFIRM to confirm your appointment\nReply CANCEL to cancel\nReply RESCHEDULE to pick a new time\n\nOr call us at (647) 371-1990.\n\n- Amber");

  } catch (error) {
    console.error('[SMS Webhook] Error:', error);
    emptyTwiML(res);
  }
});

export default router;
