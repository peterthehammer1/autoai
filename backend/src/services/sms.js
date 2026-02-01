import twilio from 'twilio';
import { format, parseISO } from 'date-fns';
import { supabase } from '../config/database.js';

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
async function logSMS({ toPhone, body, messageType, twilioSid, status, errorMessage, customerId, appointmentId }) {
  try {
    await supabase.from('sms_logs').insert({
      to_phone: toPhone,
      from_phone: fromNumber,
      message_body: body,
      message_type: messageType,
      twilio_sid: twilioSid,
      status: status || 'queued',
      error_message: errorMessage,
      customer_id: customerId,
      appointment_id: appointmentId
    });
  } catch (err) {
    console.error('[SMS] Failed to log SMS:', err.message);
  }
}

/**
 * Format time to 12-hour format
 */
function formatTime12Hour(timeStr) {
  const [hours, mins] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(mins).padStart(2, '0')} ${period}`;
}

/**
 * Send SMS message
 */
export async function sendSMS(to, body, options = {}) {
  const { messageType = 'custom', customerId, appointmentId } = options;
  
  // Format phone number for Twilio (needs +1 prefix for US/Canada)
  let formattedTo = to.replace(/\D/g, '');
  if (formattedTo.length === 10) {
    formattedTo = '+1' + formattedTo;
  } else if (!formattedTo.startsWith('+')) {
    formattedTo = '+' + formattedTo;
  }

  if (!twilioClient) {
    console.log('[SMS] Twilio not configured. Would have sent to', to, ':', body);
    // Still log the attempt
    await logSMS({ 
      toPhone: formattedTo, 
      body, 
      messageType, 
      status: 'failed', 
      errorMessage: 'Twilio not configured',
      customerId,
      appointmentId
    });
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    const message = await twilioClient.messages.create({
      body,
      from: fromNumber,
      to: formattedTo
    });

    console.log('[SMS] Sent successfully:', message.sid);
    
    // Log successful SMS
    await logSMS({ 
      toPhone: formattedTo, 
      body, 
      messageType, 
      twilioSid: message.sid,
      status: 'sent',
      customerId,
      appointmentId
    });
    
    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('[SMS] Error sending:', error.message);
    
    // Log failed SMS
    await logSMS({ 
      toPhone: formattedTo, 
      body, 
      messageType, 
      status: 'failed', 
      errorMessage: error.message,
      customerId,
      appointmentId
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
  appointmentId
}) {
  const date = typeof appointmentDate === 'string' ? parseISO(appointmentDate) : appointmentDate;
  const formattedDate = format(date, 'EEEE, MMMM do');
  const formattedTime = formatTime12Hour(appointmentTime);

  // Format services naturally (lowercase "a/an" prefix)
  const serviceText = services.toLowerCase().startsWith('a') || services.toLowerCase().startsWith('e') || 
                      services.toLowerCase().startsWith('i') || services.toLowerCase().startsWith('o') || 
                      services.toLowerCase().startsWith('u') 
    ? `an ${services}` 
    : `a ${services}`;

  const vehiclePart = vehicleDescription ? ` for your ${vehicleDescription}` : '';
  
  const message = `Hi ${customerName || 'there'},

Your appointment for ${serviceText}${vehiclePart} is on ${formattedDate} at ${formattedTime} at our location on 1250 Industrial Boulevard in Automotive City. If you need to reschedule or cancel, just give us a call at (519) 804-0969. Thanks for choosing Premier Auto Service!

- Amber`;

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

  const vehiclePart = vehicleDescription ? ` on your ${vehicleDescription}` : '';
  
  const message = `Hey ${customerName || 'there'}! Just a quick reminder - you have your ${services}${vehiclePart} tomorrow (${formattedDate}) at ${formattedTime}. We're at 1250 Industrial Boulevard in Automotive City. If something came up and you need to reschedule, just call us at (519) 804-0969. See you soon!

- Amber`;

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
  customerId,
  appointmentId
}) {
  const date = typeof appointmentDate === 'string' ? parseISO(appointmentDate) : appointmentDate;
  const formattedDate = format(date, 'EEEE, MMMM do');
  const formattedTime = formatTime12Hour(appointmentTime);

  const message = `Hi ${customerName || 'there'},

Your appointment for ${services} on ${formattedDate} at ${formattedTime} has been cancelled. If you'd like to reschedule, just give us a call at (519) 804-0969 - we're happy to find a time that works for you.

- Amber`;

  return sendSMS(customerPhone, message, { 
    messageType: 'cancellation', 
    customerId, 
    appointmentId 
  });
}

export default {
  sendSMS,
  sendConfirmationSMS,
  sendReminderSMS,
  sendCancellationSMS
};
