import { Router } from 'express';
import { supabase, normalizePhone } from '../config/database.js';

const router = Router();

/**
 * POST /api/webhooks/retell
 * Handle Retell AI webhook events
 * Events: call_started, call_ended, call_analyzed
 */
router.post('/retell', async (req, res, next) => {
  try {
    const { event, call } = req.body;

    console.log(`Retell webhook: ${event}`, call?.call_id);

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
  const { 
    call_id, 
    transcript, 
    recording_url,
    call_summary,
    sentiment
  } = call;

  // Update call log with analysis
  await supabase
    .from('call_logs')
    .update({
      transcript,
      recording_url,
      transcript_summary: call_summary,
      sentiment: sentiment || 'neutral'
    })
    .eq('retell_call_id', call_id);
}

/**
 * POST /api/webhooks/twilio/sms
 * Handle inbound SMS (for confirmations, reminders)
 */
router.post('/twilio/sms', async (req, res, next) => {
  try {
    const { From, Body, To } = req.body;

    console.log(`SMS from ${From}: ${Body}`);

    // Handle common responses
    const message = Body.toLowerCase().trim();

    if (message === 'stop') {
      // Handle opt-out
      const normalizedPhone = normalizePhone(From);
      await supabase
        .from('customers')
        .update({ marketing_opt_in: false })
        .eq('phone_normalized', normalizedPhone);
    }

    // Could add more SMS handling here (confirm, cancel, etc.)

    // Return TwiML response
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
