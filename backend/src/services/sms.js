import twilio from 'twilio';
import { format, parseISO } from 'date-fns';

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
export async function sendSMS(to, body) {
  if (!twilioClient) {
    console.log('[SMS] Twilio not configured. Would have sent to', to, ':', body);
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    // Format phone number for Twilio (needs +1 prefix for US/Canada)
    let formattedTo = to.replace(/\D/g, '');
    if (formattedTo.length === 10) {
      formattedTo = '+1' + formattedTo;
    } else if (!formattedTo.startsWith('+')) {
      formattedTo = '+' + formattedTo;
    }

    const message = await twilioClient.messages.create({
      body,
      from: fromNumber,
      to: formattedTo
    });

    console.log('[SMS] Sent successfully:', message.sid);
    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('[SMS] Error sending:', error.message);
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
  vehicleDescription 
}) {
  const date = typeof appointmentDate === 'string' ? parseISO(appointmentDate) : appointmentDate;
  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');
  const formattedTime = formatTime12Hour(appointmentTime);

  const message = `PREMIER AUTO SERVICE
Appointment Confirmed

${customerName ? `Hi ${customerName},\n\n` : ''}Your appointment has been scheduled.

Date: ${formattedDate}
Time: ${formattedTime}
Service: ${services}${vehicleDescription ? `\nVehicle: ${vehicleDescription}` : ''}

Location:
1250 Industrial Boulevard
Automotive City

To reschedule or cancel, please call (716) 412-2499

Thank you for choosing Premier Auto Service.`;

  return sendSMS(customerPhone, message);
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
  vehicleDescription 
}) {
  const date = typeof appointmentDate === 'string' ? parseISO(appointmentDate) : appointmentDate;
  const formattedDate = format(date, 'EEEE, MMMM d');
  const formattedTime = formatTime12Hour(appointmentTime);

  const message = `PREMIER AUTO SERVICE
Appointment Reminder

${customerName ? `Hi ${customerName},\n\n` : ''}This is a reminder about your appointment tomorrow.

Date: ${formattedDate}
Time: ${formattedTime}
Service: ${services}${vehicleDescription ? `\nVehicle: ${vehicleDescription}` : ''}

Location:
1250 Industrial Boulevard
Automotive City

Unable to make it? Please call (716) 412-2499 to reschedule.

We look forward to seeing you.`;

  return sendSMS(customerPhone, message);
}

export default {
  sendSMS,
  sendConfirmationSMS,
  sendReminderSMS
};
