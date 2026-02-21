import twilio from 'twilio';
import { format, parseISO } from 'date-fns';
import { supabase } from '../config/database.js';
import { formatTime12Hour } from '../utils/timezone.js';
import { BUSINESS } from '../config/business.js';
import { logger } from '../utils/logger.js';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient = null;

// Only initialize if credentials are provided
if (accountSid && authToken && accountSid !== 'your-account-sid') {
  twilioClient = twilio(accountSid, authToken);
}

/**
 * Log SMS to database
 */
async function logSMS({ toPhone, body, messageType, twilioSid, status, errorMessage, customerId, appointmentId, workOrderId, direction }) {
  try {
    const row = {
      to_phone: toPhone,
      from_phone: fromNumber,
      message_body: body,
      message_type: messageType,
      twilio_sid: twilioSid,
      status: status || 'queued',
      error_message: errorMessage,
      customer_id: customerId,
      appointment_id: appointmentId,
      direction: direction || 'outbound'
    };
    if (workOrderId) row.work_order_id = workOrderId;
    await supabase.from('sms_logs').insert(row);
  } catch (err) {
    logger.error('[SMS] Failed to log SMS', { error: err });
  }
}

/**
 * Send SMS message
 */
export async function sendSMS(to, body, options = {}) {
  const { messageType = 'custom', customerId, appointmentId, workOrderId } = options;

  // Format phone number for Twilio (needs +1 prefix for US/Canada)
  let formattedTo = to.replace(/\D/g, '');
  if (formattedTo.length < 10) {
    logger.error('[SMS] Invalid phone number: too few digits');
    return { success: false, error: 'Invalid phone number' };
  }
  if (formattedTo.length === 10) {
    formattedTo = '+1' + formattedTo;
  } else if (!formattedTo.startsWith('+')) {
    formattedTo = '+' + formattedTo;
  }

  if (!twilioClient) {
    logger.info('[SMS] Twilio not configured, skipping send', { to, body });
    // Still log the attempt
    await logSMS({
      toPhone: formattedTo,
      body,
      messageType,
      status: 'failed',
      errorMessage: 'Twilio not configured',
      customerId,
      appointmentId,
      workOrderId
    });
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    const message = await twilioClient.messages.create({
      body,
      from: fromNumber,
      to: formattedTo
    });

    logger.info('[SMS] Sent successfully', { sid: message.sid });

    // Log successful SMS
    await logSMS({
      toPhone: formattedTo,
      body,
      messageType,
      twilioSid: message.sid,
      status: 'sent',
      customerId,
      appointmentId,
      workOrderId
    });

    return { success: true, messageId: message.sid };
  } catch (error) {
    logger.error('[SMS] Error sending', { error });

    // Log failed SMS
    await logSMS({
      toPhone: formattedTo,
      body,
      messageType,
      status: 'failed',
      errorMessage: error.message,
      customerId,
      appointmentId,
      workOrderId
    });

    return { success: false, error: error.message };
  }
}

/**
 * Send appointment confirmation SMS
 */
export async function sendConfirmationSMS({
  customerPhone,
  customerName,
  appointmentDate,
  appointmentTime,
  services,
  vehicleDescription,
  customerId,
  appointmentId,
  portalUrl,
}) {
  const date = typeof appointmentDate === 'string' ? parseISO(appointmentDate) : appointmentDate;
  const formattedDate = format(date, 'EEEE, MMMM do');
  const formattedTime = formatTime12Hour(appointmentTime);
  const firstName = customerName?.split(' ')[0] || 'there';

  const vehicleLine = vehicleDescription ? `${vehicleDescription}\n` : '';
  const portalLine = portalUrl ? `\nTrack your appointment status online:\n${portalUrl}\n` : '';

  const message = `Hi ${firstName},

Here is a quick confirmation for your records:

${services}
${vehicleLine}${formattedDate} at ${formattedTime}
${BUSINESS.address}
${portalLine}
Thanks for choosing ${BUSINESS.name}!

- ${BUSINESS.agentName}`;

  return sendSMS(customerPhone, message, {
    messageType: 'confirmation',
    customerId,
    appointmentId
  });
}

/**
 * Send appointment reminder SMS (24 hours before)
 */
export async function sendReminderSMS({
  customerPhone,
  customerName,
  appointmentDate,
  appointmentTime,
  services,
  vehicleDescription,
  customerId,
  appointmentId
}) {
  const date = typeof appointmentDate === 'string' ? parseISO(appointmentDate) : appointmentDate;
  const formattedDate = format(date, 'EEEE');
  const formattedTime = formatTime12Hour(appointmentTime);
  const firstName = customerName?.split(' ')[0] || 'there';

  const vehicleLine = vehicleDescription ? `${vehicleDescription}\n` : '';

  const message = `Hi ${firstName},

Just a friendly reminder about your appointment tomorrow:

${services}
${vehicleLine}${formattedDate} at ${formattedTime}
${BUSINESS.address}

See you soon!

- ${BUSINESS.agentName}`;

  return sendSMS(customerPhone, message, {
    messageType: 'reminder',
    customerId,
    appointmentId
  });
}

/**
 * Send appointment cancellation SMS
 */
export async function sendCancellationSMS({
  customerPhone,
  customerName,
  appointmentDate,
  appointmentTime,
  services,
  vehicleDescription,
  customerId,
  appointmentId
}) {
  const date = typeof appointmentDate === 'string' ? parseISO(appointmentDate) : appointmentDate;
  const formattedDate = format(date, 'EEEE, MMMM do');
  const formattedTime = formatTime12Hour(appointmentTime);
  const firstName = customerName?.split(' ')[0] || 'there';

  const vehicleLine = vehicleDescription ? `${vehicleDescription}\n` : '';

  const message = `Hi ${firstName},

Your appointment has been cancelled:

${services}
${vehicleLine}${formattedDate} at ${formattedTime}

If you'd like to rebook, call us at ${BUSINESS.phone}.

- ${BUSINESS.agentName}`;

  return sendSMS(customerPhone, message, {
    messageType: 'cancellation',
    customerId,
    appointmentId
  });
}

/**
 * Send status update SMS (in_progress or cancelled)
 */
export async function sendStatusUpdateSMS({
  customerPhone,
  customerName,
  appointmentDate,
  appointmentTime,
  status,
  vehicleDescription,
  customerId,
  appointmentId
}) {
  const firstName = customerName?.split(' ')[0] || 'there';
  const date = typeof appointmentDate === 'string' ? parseISO(appointmentDate) : appointmentDate;
  const formattedDate = format(date, 'EEEE, MMMM do');
  const formattedTime = formatTime12Hour(appointmentTime);
  const vehicleLine = vehicleDescription ? ` on your ${vehicleDescription}` : '';

  let message;
  if (status === 'in_progress') {
    message = `Hi ${firstName},

Work has started${vehicleLine}! Our technician is on it.

We'll let you know as soon as it's ready for pickup.

- ${BUSINESS.agentName}, ${BUSINESS.name}`;
  } else {
    // Generic status update fallback
    const statusLabel = status.replace(/_/g, ' ');
    message = `Hi ${firstName},

Quick update — your appointment on ${formattedDate} at ${formattedTime} is now: ${statusLabel}.

Questions? Call us at ${BUSINESS.phone}.

- ${BUSINESS.agentName}, ${BUSINESS.name}`;
  }

  return sendSMS(customerPhone, message, {
    messageType: 'status_update',
    customerId,
    appointmentId
  });
}

/**
 * Send completed SMS with pickup prompt
 */
export async function sendCompletedSMS({
  customerPhone,
  customerName,
  vehicleDescription,
  customerId,
  appointmentId
}) {
  const firstName = customerName?.split(' ')[0] || 'there';
  const vehicleLine = vehicleDescription ? `Your ${vehicleDescription} is` : 'Your vehicle is';

  const message = `Hi ${firstName},

Great news — ${vehicleLine} all done and ready for pickup!

We're open until 5:00 PM today. See you soon!

- ${BUSINESS.agentName}, ${BUSINESS.name}`;

  return sendSMS(customerPhone, message, {
    messageType: 'completed',
    customerId,
    appointmentId
  });
}

/**
 * Send proactive service reminder SMS
 */
export async function sendServiceReminderSMS({
  customerPhone,
  customerName,
  serviceName,
  vehicleDescription,
  lastDate,
  customerId
}) {
  const firstName = customerName?.split(' ')[0] || 'there';
  const vehicleLine = vehicleDescription ? ` for your ${vehicleDescription}` : '';
  const lastDateLine = lastDate
    ? ` Your last ${serviceName.toLowerCase()} was on ${format(typeof lastDate === 'string' ? parseISO(lastDate) : lastDate, 'MMMM do')}.`
    : '';

  const message = `Hi ${firstName},

Friendly reminder — it looks like your ${serviceName.toLowerCase()}${vehicleLine} may be due.${lastDateLine}

Want to book an appointment? Reply YES or call us at ${BUSINESS.phone}.

- ${BUSINESS.agentName}, ${BUSINESS.name}`;

  return sendSMS(customerPhone, message, {
    messageType: 'service_reminder',
    customerId
  });
}

/**
 * Send review request SMS (Google review or internal feedback)
 */
export async function sendReviewRequestSMS({
  customerPhone,
  customerName,
  vehicleDescription,
  reviewType,
  trackingUrl,
  customerId,
  appointmentId
}) {
  const firstName = customerName?.split(' ')[0] || 'there';
  const vehicleLine = vehicleDescription ? ` on your ${vehicleDescription}` : '';

  let message;
  if (reviewType === 'internal_feedback') {
    message = `Hi ${firstName},

Thank you for visiting ${BUSINESS.name}${vehicleLine}. We'd love to hear your feedback so we can improve.

Please take a moment to share your thoughts: ${trackingUrl}

- ${BUSINESS.agentName}, ${BUSINESS.name}`;
  } else {
    message = `Hi ${firstName},

Thank you for choosing ${BUSINESS.name}${vehicleLine}! We hope you had a great experience.

If you have a moment, we'd really appreciate a Google review: ${trackingUrl}

Your feedback helps us serve you better!

- ${BUSINESS.agentName}, ${BUSINESS.name}`;
  }

  return sendSMS(customerPhone, message, {
    messageType: 'review_request',
    customerId,
    appointmentId
  });
}

/**
 * Send portal link SMS (estimate ready, vehicle completed, or general)
 */
export async function sendPortalLinkSMS({
  customerPhone,
  customerName,
  portalUrl,
  messageContext = 'general',
  vehicleDescription,
  customerId,
  appointmentId,
  workOrderId,
}) {
  const firstName = customerName?.split(' ')[0] || 'there';
  const vehicleLine = vehicleDescription ? ` for your ${vehicleDescription}` : '';
  const vehicleSubject = vehicleDescription ? `your ${vehicleDescription}` : 'your vehicle';

  let message;
  if (messageContext === 'estimate') {
    message = `Hi ${firstName},

Your estimate${vehicleLine} is ready for review. You can view the details and approve online:

${portalUrl}

Questions? Call us at ${BUSINESS.phone}.

- ${BUSINESS.agentName}, ${BUSINESS.name}`;
  } else if (messageContext === 'in_progress') {
    message = `Hi ${firstName},

Work has started on ${vehicleSubject}! Track live progress here:

${portalUrl}

We'll keep you updated at every step.

- ${BUSINESS.agentName}, ${BUSINESS.name}`;
  } else if (messageContext === 'completed') {
    message = `Hi ${firstName},

Great news — ${vehicleSubject} is all done and ready for pickup! View your service details:

${portalUrl}

We're open until 5:00 PM today.

- ${BUSINESS.agentName}, ${BUSINESS.name}`;
  } else if (messageContext === 'invoiced') {
    message = `Hi ${firstName},

Your invoice${vehicleLine} is ready to view:

${portalUrl}

Questions? Call us at ${BUSINESS.phone}.

- ${BUSINESS.agentName}, ${BUSINESS.name}`;
  } else {
    message = `Hi ${firstName},

View your service details and vehicle history online:

${portalUrl}

- ${BUSINESS.agentName}, ${BUSINESS.name}`;
  }

  return sendSMS(customerPhone, message, {
    messageType: 'portal_link',
    customerId,
    appointmentId,
    workOrderId,
  });
}

/**
 * Send inspection report SMS with portal link
 */
export async function sendInspectionSMS({
  customerPhone,
  customerName,
  portalUrl,
  vehicleDescription,
  summary,
  customerId,
  workOrderId,
}) {
  const firstName = customerName?.split(' ')[0] || 'there';
  const vehicleLine = vehicleDescription ? ` for your ${vehicleDescription}` : '';
  const attentionCount = (summary?.needs_attention || 0) + (summary?.urgent || 0);
  const attentionLine = attentionCount > 0
    ? `\n${attentionCount} item${attentionCount > 1 ? 's' : ''} need${attentionCount === 1 ? 's' : ''} your attention.`
    : '\nEverything looks great!';

  const message = `Hi ${firstName},

Your vehicle inspection${vehicleLine} is complete.${attentionLine}

View your full report with photos: ${portalUrl}

- ${BUSINESS.agentName}, ${BUSINESS.name}`;

  return sendSMS(customerPhone, message, {
    messageType: 'inspection_report',
    customerId,
    workOrderId,
  });
}

/**
 * Send campaign SMS with template variable substitution
 */
export async function sendCampaignSMS({
  customerPhone,
  customerName,
  vehicleDescription,
  portalUrl,
  campaignType,
  messageTemplate,
  customerId,
}) {
  const firstName = customerName?.split(' ')[0] || 'there';
  const vehicle = vehicleDescription || 'vehicle';

  const body = messageTemplate
    .replace(/\{first_name\}/g, firstName)
    .replace(/\{vehicle\}/g, vehicle)
    .replace(/\{portal_link\}/g, portalUrl || '')
    .replace(/\{business_name\}/g, BUSINESS.name)
    .replace(/\{business_phone\}/g, BUSINESS.phone)
    .replace(/\{agent_name\}/g, BUSINESS.agentName);

  return sendSMS(customerPhone, body, {
    messageType: `campaign_${campaignType}`,
    customerId,
  });
}

/**
 * Send payment link SMS with portal URL
 */
export async function sendPaymentLinkSMS({
  customerPhone,
  customerName,
  vehicleDescription,
  portalUrl,
  balanceCents,
  customerId,
  workOrderId,
}) {
  const firstName = customerName?.split(' ')[0] || 'there';
  const vehicleLine = vehicleDescription ? ` for your ${vehicleDescription}` : '';
  const balanceFormatted = `$${(balanceCents / 100).toFixed(2)}`;

  const message = `Hi ${firstName},

Your invoice${vehicleLine} is ready. Pay securely online:

${portalUrl}

Balance due: ${balanceFormatted}

Questions? Call us at ${BUSINESS.phone}.

- ${BUSINESS.agentName}, ${BUSINESS.name}`;

  return sendSMS(customerPhone, message, {
    messageType: 'payment_link',
    customerId,
    workOrderId,
  });
}

export { logSMS };

export default {
  sendSMS,
  sendConfirmationSMS,
  sendReminderSMS,
  sendCancellationSMS,
  sendStatusUpdateSMS,
  sendCompletedSMS,
  sendServiceReminderSMS,
  sendReviewRequestSMS,
  sendPortalLinkSMS,
  sendInspectionSMS,
  sendCampaignSMS,
  sendPaymentLinkSMS,
  logSMS
};
