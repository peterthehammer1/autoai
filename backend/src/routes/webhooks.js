import { Router } from 'express';
import { Retell } from 'retell-sdk';
import { supabase, normalizePhone } from '../config/database.js';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { format, addDays, parseISO } from 'date-fns';
import { todayEST, daysAgoEST } from '../utils/timezone.js';
import { logger } from '../utils/logger.js';

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
    
    console.log('Nucleus inbound webhook received, event:', req.body?.event);
    
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
    console.log('Looking up customer by phone');
    
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
    
    console.log('Found customer:', customer.id);
    
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
      console.log('Customer record incomplete:', customer.id, '- missing:', !hasName ? 'name' : '', !hasVehicle ? 'vehicle' : '');
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
  try {
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
  } catch (error) {
    console.error('handleCallStarted error:', error);
  }
}

async function handleCallEnded(call) {
  try {
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
  } catch (error) {
    console.error('handleCallEnded error:', error);
  }
}

async function handleCallAnalyzed(call) {
  try {
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
  } catch (error) {
    console.error('handleCallAnalyzed error:', error);
  }
}

/**
 * POST /api/webhooks/twilio/sms
 * Handle inbound SMS (STOP opt-out only — conversational replies handled by Amber chat agent)
 */
router.post('/twilio/sms', async (req, res, next) => {
  try {
    const { From, Body } = req.body;

    console.log('Inbound SMS received');

    // Handle STOP opt-out
    const message = (Body || '').toLowerCase().trim();

    if (message === 'stop') {
      const normalizedPhone = normalizePhone(From);
      await supabase
        .from('customers')
        .update({ marketing_opt_in: false })
        .eq('phone_normalized', normalizedPhone);
    }

    // Return empty TwiML — Amber chat agent handles conversational replies
    res.type('text/xml').send(`
      <?xml version="1.0" encoding="UTF-8"?>
      <Response></Response>
    `);

  } catch (error) {
    console.error('SMS webhook error:', error);
    res.type('text/xml').send(`
      <?xml version="1.0" encoding="UTF-8"?>
      <Response></Response>
    `);
  }
});

export default router;
