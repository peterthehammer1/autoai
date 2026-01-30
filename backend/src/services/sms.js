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
  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');
  const formattedTime = formatTime12Hour(appointmentTime);

  const message = `${customerName ? `Hi ${customerName},\n\n` : ''}Your appointment has been scheduled.

Date: ${formattedDate}
Time: ${formattedTime}
Service: ${services}${vehicleDescription ? `\nVehicle: ${vehicleDescription}` : ''}

Location:
1250 Industrial Boulevard
Automotive City

To reschedule or cancel, please call (716) 412-2499

Thank you for choosing Premier Auto Service.`;

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
  const formattedDate = format(date, 'EEEE, MMMM d');
  const formattedTime = formatTime12Hour(appointmentTime);

  const message = `${customerName ? `Hi ${customerName},\n\n` : ''}This is a reminder about your appointment tomorrow.

Date: ${formattedDate}
Time: ${formattedTime}
Service: ${services}${vehicleDescription ? `\nVehicle: ${vehicleDescription}` : ''}

Location:
1250 Industrial Boulevard
Automotive City

Unable to make it? Please call (716) 412-2499 to reschedule.

We look forward to seeing you.`;

  return sendSMS(customerPhone, message, { 
    messageType: 'reminder', 
    customerId, 
    appointmentId 
  });
}

export default {
  sendSMS,
  sendConfirmationSMS,
  sendReminderSMS
};
