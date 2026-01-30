import { Router } from 'express';
import { supabase, normalizePhone } from '../config/database.js';

const router = Router();

/**
 * POST /api/webhooks/retell/inbound
 * Handle Retell inbound call webhook - called BEFORE call connects
 * Used to look up caller by phone number and pass dynamic variables
 */
router.post('/retell/inbound', async (req, res) => {
  try {
    const { event, call_inbound } = req.body;
    
    console.log('Retell inbound webhook:', JSON.stringify(req.body));
    
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
    
    if (error || !customer) {
      console.log('Customer not found, new caller');
      // New customer - pass info so agent knows
      return res.json({
        call_inbound: {
          agent_override: {
            retell_llm: {
              start_speaker: "agent",
              begin_message: "Thanks for calling Premier Auto Service, this is Alex. How can I help you today?"
            }
          },
          dynamic_variables: {
            is_existing_customer: 'false',
            customer_name: '',
            customer_first_name: '',
            customer_phone: from_number,
            customer_id: '',
            vehicle_info: '',
            vehicle_id: ''
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
    
    // Return customer info as dynamic variables with personalized greeting
    return res.json({
      call_inbound: {
        agent_override: {
          retell_llm: {
            start_speaker: "agent",
            begin_message: `Hey ${customer.first_name}! Thanks for calling Premier Auto Service, this is Alex. How can I help you today?`
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
          vehicle_id: vehicleId
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
    sentiment,
    from_number
  } = call;

  // Get current call log to check if customer is linked
  const { data: callLog } = await supabase
    .from('call_logs')
    .select('customer_id, phone_normalized')
    .eq('retell_call_id', call_id)
    .single();

  // Build update object
  const updateData = {
    transcript,
    recording_url,
    transcript_summary: call_summary,
    sentiment: sentiment || 'neutral'
  };

  // If no customer linked yet, try to find one (may have been created during call)
  if (callLog && !callLog.customer_id) {
    const phoneToCheck = callLog.phone_normalized || normalizePhone(from_number);
    if (phoneToCheck) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone_normalized', phoneToCheck)
        .single();
      
      if (customer) {
        updateData.customer_id = customer.id;
      }
    }
  }

  // Update call log with analysis
  await supabase
    .from('call_logs')
    .update(updateData)
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
