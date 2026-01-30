import { format, parseISO } from 'date-fns';
import { supabase } from '../config/database.js';

// SendGrid API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@fixmycar.app';
const FROM_NAME = process.env.FROM_NAME || 'Premier Auto Service';

/**
 * Log email to database
 */
async function logEmail({ toEmail, subject, body, emailType, sendgridId, status, errorMessage, customerId, appointmentId }) {
  try {
    await supabase.from('email_logs').insert({
      to_email: toEmail,
      from_email: FROM_EMAIL,
      subject,
      body,
      email_type: emailType,
      sendgrid_id: sendgridId,
      status: status || 'queued',
      error_message: errorMessage,
      customer_id: customerId,
      appointment_id: appointmentId
    });
  } catch (err) {
    console.error('[Email] Failed to log email:', err.message);
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
 * Send email using SendGrid
 */
export async function sendEmail(to, subject, html, options = {}) {
  const { emailType = 'custom', customerId, appointmentId } = options;

  if (!SENDGRID_API_KEY) {
    console.log('[Email] No SENDGRID_API_KEY - skipping email send');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        content: [{ type: 'text/html', value: html }]
      })
    });

    // SendGrid returns 202 Accepted on success with no body
    if (response.status === 202) {
      const messageId = response.headers.get('x-message-id');
      console.log(`[Email] Sent ${emailType} email to ${to}, ID: ${messageId || 'accepted'}`);
      await logEmail({
        toEmail: to,
        subject,
        body: html,
        emailType,
        sendgridId: messageId,
        status: 'sent',
        customerId,
        appointmentId
      });
      return { success: true, id: messageId };
    } else {
      const data = await response.json().catch(() => ({}));
      console.error('[Email] Failed to send:', response.status, data);
      await logEmail({
        toEmail: to,
        subject,
        body: html,
        emailType,
        status: 'failed',
        errorMessage: data.errors?.[0]?.message || `HTTP ${response.status}`,
        customerId,
        appointmentId
      });
      return { success: false, error: data.errors?.[0]?.message || 'Unknown error' };
    }
  } catch (error) {
    console.error('[Email] Error:', error.message);
    await logEmail({
      toEmail: to,
      subject,
      body: html,
      emailType,
      status: 'failed',
      errorMessage: error.message,
      customerId,
      appointmentId
    });
    return { success: false, error: error.message };
  }
}

/**
 * Send appointment confirmation email
 */
export async function sendConfirmationEmail({ 
  to, 
  customerName, 
  appointmentDate, 
  appointmentTime, 
  services, 
  vehicle,
  customerId,
  appointmentId
}) {
  const dateStr = typeof appointmentDate === 'string' 
    ? format(parseISO(appointmentDate), 'EEEE, MMMM d, yyyy')
    : format(appointmentDate, 'EEEE, MMMM d, yyyy');
  
  const timeStr = formatTime12Hour(appointmentTime);
  const firstName = customerName?.split(' ')[0] || 'there';

  const subject = `Your Appointment at Premier Auto Service - ${dateStr}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Premier Auto Service</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Appointment Confirmed</p>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
    <p style="font-size: 16px; margin-top: 0;">Hi ${firstName},</p>
    
    <p>Your appointment has been confirmed. Here are the details:</p>
    
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
            <strong style="color: #64748b;">Date</strong>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">
            ${dateStr}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
            <strong style="color: #64748b;">Time</strong>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">
            ${timeStr}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
            <strong style="color: #64748b;">Service</strong>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">
            ${services}
          </td>
        </tr>
        ${vehicle ? `
        <tr>
          <td style="padding: 10px 0;">
            <strong style="color: #64748b;">Vehicle</strong>
          </td>
          <td style="padding: 10px 0; text-align: right;">
            ${vehicle}
          </td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <div style="background: #eff6ff; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb;">
      <p style="margin: 0; font-size: 14px;">
        <strong>Location:</strong><br>
        Premier Auto Service<br>
        1250 Industrial Boulevard<br>
        Automotive City
      </p>
    </div>
    
    <p style="color: #64748b; font-size: 14px;">
      Need to reschedule or cancel? Just give us a call at <strong>(716) 412-2499</strong>.
    </p>
    
    <p style="margin-bottom: 0;">See you soon!</p>
    <p style="margin-top: 5px; color: #64748b;">The Premier Auto Service Team</p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p style="margin: 0;">Premier Auto Service</p>
    <p style="margin: 5px 0 0 0;">(716) 412-2499 | fixmycar.app</p>
  </div>
  
</body>
</html>
  `;

  return sendEmail(to, subject, html, {
    emailType: 'confirmation',
    customerId,
    appointmentId
  });
}

/**
 * Send appointment reminder email (24 hours before)
 */
export async function sendReminderEmail({
  to,
  customerName,
  appointmentDate,
  appointmentTime,
  services,
  vehicle,
  customerId,
  appointmentId
}) {
  const dateStr = typeof appointmentDate === 'string'
    ? format(parseISO(appointmentDate), 'EEEE, MMMM d')
    : format(appointmentDate, 'EEEE, MMMM d');
  
  const timeStr = formatTime12Hour(appointmentTime);
  const firstName = customerName?.split(' ')[0] || 'there';

  const subject = `Reminder: Your Appointment Tomorrow at ${timeStr}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Premier Auto Service</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Appointment Reminder</p>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
    <p style="font-size: 16px; margin-top: 0;">Hi ${firstName},</p>
    
    <p>Just a friendly reminder about your appointment <strong>tomorrow</strong>:</p>
    
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 18px; text-align: center;">
        <strong>${dateStr}</strong> at <strong>${timeStr}</strong>
      </p>
      <p style="margin: 10px 0 0 0; text-align: center; color: #64748b;">
        ${services}${vehicle ? ` • ${vehicle}` : ''}
      </p>
    </div>
    
    <p style="color: #64748b; font-size: 14px;">
      Need to reschedule? Call us at <strong>(716) 412-2499</strong>.
    </p>
    
    <p style="margin-bottom: 0;">See you tomorrow!</p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p style="margin: 0;">Premier Auto Service | (716) 412-2499</p>
  </div>
  
</body>
</html>
  `;

  return sendEmail(to, subject, html, {
    emailType: 'reminder',
    customerId,
    appointmentId
  });
}
