import { Router } from 'express';
import { supabase, normalizePhone, formatPhone } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { BUSINESS } from '../../config/business.js';

const router = Router();

/**
 * POST /api/voice/transfer_to_human
 * Transfer call to a human service advisor
 * Logs the transfer request and provides context
 */
router.post('/transfer_to_human', async (req, res, next) => {
  try {
    logger.info('transfer_to_human received:', { data: JSON.stringify(req.body) });

    const body = req.body.args || req.body;
    const reason = body.reason || 'Customer requested transfer';
    const context = body.context || '';
    const call_id = body.call_id;

    // Log the transfer request
    if (call_id) {
      await supabase
        .from('call_logs')
        .update({
          outcome: 'transferred',
          internal_notes: `Transfer reason: ${reason}. Context: ${context}`
        })
        .eq('retell_call_id', call_id);
    }

    // In production, this would trigger an actual transfer via Retell's transfer API
    // For now, we provide the callback number
    return res.json({
      success: true,
      transfer_to: BUSINESS.advisorPhone,
      message: `I'll connect you with one of our service advisors right now. If we get disconnected, you can call us directly at ${BUSINESS.advisorPhone}. One moment please.`
    });
  } catch (error) {
    logger.error('transfer_to_human error:', { error });
    res.json({
      success: false,
      message: `I'm having trouble with the transfer. Our direct number is ${BUSINESS.phone} - you can call that to speak with a service advisor.`
    });
  }
});

/**
 * POST /api/voice/request_callback
 * Customer requests a callback from a service advisor
 */
router.post('/request_callback', async (req, res, next) => {
  try {
    logger.info('request_callback received:', { data: JSON.stringify(req.body) });

    const body = req.body.args || req.body;
    const customer_phone = body.customer_phone;
    const customer_name = body.customer_name || body.customer_first_name;
    const reason = body.reason || 'General inquiry';
    const preferred_time = body.preferred_time; // e.g., "this afternoon", "tomorrow morning"

    if (!customer_phone) {
      return res.json({
        success: false,
        message: 'What\'s the best number for us to call you back on?'
      });
    }

    const normalizedPhone = normalizePhone(customer_phone);

    // Find or create customer
    let { data: customer } = await supabase
      .from('customers')
      .select('id, first_name')
      .eq('phone_normalized', normalizedPhone)
      .single();

    if (!customer && customer_name) {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          phone: customer_phone,
          first_name: customer_name
        })
        .select('id, first_name')
        .single();
      customer = newCustomer;
    }

    // Create a callback request in call_logs with outcome 'callback_requested'
    const { error } = await supabase
      .from('call_logs')
      .insert({
        phone_number: customer_phone,
        phone_normalized: normalizedPhone,
        customer_id: customer?.id,
        direction: 'inbound',
        outcome: 'callback_requested',
        transcript_summary: `Callback requested: ${reason}${preferred_time ? ` | Preferred time: ${preferred_time}` : ''}`,
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        duration_seconds: 0
      });

    if (error) logger.error('Error logging callback request:', { error });

    // Send SMS notification to service team
    try {
      const twilioClient = (await import('twilio')).default;
      const client = twilioClient(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

      const message = `CALLBACK REQUEST\n\nName: ${customer_name || 'Customer'}\nPhone: ${formatPhone(customer_phone)}\nReason: ${reason}${preferred_time ? `\nPreferred time: ${preferred_time}` : ''}\n\nPlease call back soon.`;

      // Send to service advisor (Pete)
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: BUSINESS.advisorPhone
      });
    } catch (smsError) {
      logger.error('Failed to send callback notification SMS:', { error: smsError });
    }

    const timeNote = preferred_time ? ` We'll try to reach you ${preferred_time}.` : ' They\'ll call you as soon as possible.';

    return res.json({
      success: true,
      message: `I've put in a callback request for you.${timeNote} Is there anything else I can help with in the meantime?`
    });
  } catch (error) {
    logger.error('request_callback error:', { error });
    res.json({
      success: false,
      message: `I had trouble submitting that request. Our number is ${BUSINESS.phone} if you'd like to call back, or I can try again.`
    });
  }
});

/**
 * POST /api/voice/submit_tow_request
 * Nucleus AI function: Submit a tow-in request with pickup address for the tow truck
 */
router.post('/submit_tow_request', async (req, res, next) => {
  try {
    logger.info('submit_tow_request received:', { data: JSON.stringify(req.body) });

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
      logger.error('tow_requests insert error:', { error: insertErr });
      throw insertErr;
    }

    const addressShort = `${pickup_address_line1}, ${pickup_city}`;
    return res.json({
      success: true,
      tow_request_id: towRequest.id,
      message: `I've got your tow request. We'll send a truck to ${addressShort}. Our team will call you when they're on the way. Is there anything else I can help with?`
    });
  } catch (error) {
    logger.error('submit_tow_request error:', { error });
    res.json({
      success: false,
      message: 'I had trouble saving the tow request. Let me have someone call you back to get the details, or you can call back and we can try again.'
    });
  }
});

/**
 * POST /api/voice/submit_lead
 * Easter egg: Capture lead when someone asks about the AI platform
 * Sends SMS to Pete with the prospect's details
 */
router.post('/submit_lead', async (req, res, next) => {
  try {
    logger.info('submit_lead received:', { data: JSON.stringify(req.body) });

    const customer_name = req.body.customer_name || req.body.args?.customer_name || 'Unknown';
    const customer_phone = req.body.customer_phone || req.body.args?.customer_phone;
    const interest = req.body.interest || req.body.args?.interest || 'AI platform inquiry';
    const business_name = req.body.business_name || req.body.args?.business_name;

    const phoneDisplay = customer_phone ? formatPhone(customer_phone) : 'No phone';
    const businessInfo = business_name ? `\nBusiness: ${business_name}` : '';

    // Send SMS to Pete
    const twilioClient = (await import('twilio')).default;
    const client = twilioClient(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    const message = `NUCLEUS AI LEAD\n\nName: ${customer_name}\nPhone: ${phoneDisplay}${businessInfo}\nInterest: ${interest}\n\nFrom ${BUSINESS.name} demo call`;

    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: process.env.LEAD_NOTIFY_PHONE || BUSINESS.advisorPhone
    });

    // Also send email to pete@nucleus.com
    try {
      const sgMail = (await import('@sendgrid/mail')).default;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      await sgMail.send({
        to: 'pete@nucleus.com',
        from: process.env.FROM_EMAIL || 'notifications@alignedai.dev',
        subject: `New AI Platform Lead: ${customer_name}`,
        text: `New lead from ${BUSINESS.name} demo:\n\nName: ${customer_name}\nPhone: ${phoneDisplay}${businessInfo}\nInterest: ${interest}\n\nThis person called the ${BUSINESS.name} demo line and expressed interest in the AI platform.`,
        html: `
          <h2>New AI Platform Lead</h2>
          <p><strong>Name:</strong> ${customer_name}</p>
          <p><strong>Phone:</strong> ${phoneDisplay}</p>
          ${business_name ? `<p><strong>Business:</strong> ${business_name}</p>` : ''}
          <p><strong>Interest:</strong> ${interest}</p>
          <hr>
          <p><em>This person called the ${BUSINESS.name} demo line and expressed interest in the AI platform.</em></p>
        `
      });
    } catch (emailErr) {
      logger.info('Email send failed (non-critical):', { data: emailErr.message });
    }

    return res.json({
      success: true,
      message: `I've passed your information along to our team at Nucleus AI. Someone will reach out to you shortly to discuss how we can help your business. Is there anything else I can help you with today?`
    });
  } catch (error) {
    logger.error('submit_lead error:', { error });
    res.json({
      success: true, // Still return success so Amber doesn't retry
      message: `I'll make sure someone from our team reaches out to you. Is there anything else I can help you with?`
    });
  }
});

export default router;
