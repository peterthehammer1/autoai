import { format, parseISO } from 'date-fns';
import { supabase } from '../config/database.js';

// SendGrid API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@premierauto.ai';
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

  const subject = `Appointment Confirmed - ${dateStr} at ${timeStr}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1e293b; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: -0.5px;">Premier Auto Service</h1>
            </td>
          </tr>
          
          <!-- Confirmation Badge -->
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center;">
              <div style="display: inline-block; background-color: #dcfce7; color: #166534; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                Confirmed
              </div>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 0 40px 24px; text-align: center;">
              <p style="margin: 0; color: #374151; font-size: 16px;">Hi ${firstName}, your appointment is scheduled.</p>
            </td>
          </tr>
          
          <!-- Appointment Details Card -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Date & Time</p>
                          <p style="margin: 0; color: #1e293b; font-size: 16px; font-weight: 600;">${dateStr}</p>
                          <p style="margin: 4px 0 0; color: #1e293b; font-size: 16px; font-weight: 600;">${timeStr}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: ${vehicle ? '16px' : '0'}; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                          <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Service</p>
                          <p style="margin: 0; color: #1e293b; font-size: 15px;">${services}</p>
                        </td>
                      </tr>
                      ${vehicle ? `
                      <tr>
                        <td style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
                          <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Vehicle</p>
                          <p style="margin: 0; color: #1e293b; font-size: 15px;">${vehicle}</p>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Help Text -->
          <tr>
            <td style="padding: 0 40px 32px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.5;">
                Need to reschedule? Call us at<br>
                <a href="tel:+16473711990" style="color: #1e293b; font-weight: 600; text-decoration: none;">(647) 371-1990</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                Premier Auto Service<br>
                <a href="https://premierauto.ai" style="color: #94a3b8; text-decoration: none;">premierauto.ai</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
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

  const subject = `Reminder: Tomorrow at ${timeStr}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1e293b; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: -0.5px;">Premier Auto Service</h1>
            </td>
          </tr>
          
          <!-- Reminder Badge -->
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center;">
              <div style="display: inline-block; background-color: #fef3c7; color: #92400e; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                Tomorrow
              </div>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 0 40px 24px; text-align: center;">
              <p style="margin: 0; color: #374151; font-size: 16px;">Hi ${firstName}, just a quick reminder about your appointment.</p>
            </td>
          </tr>
          
          <!-- Appointment Details -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <p style="margin: 0; color: #1e293b; font-size: 18px; font-weight: 600;">${dateStr}</p>
                    <p style="margin: 4px 0 0; color: #1e293b; font-size: 18px; font-weight: 600;">${timeStr}</p>
                    <p style="margin: 12px 0 0; color: #64748b; font-size: 14px;">${services}${vehicle ? ` · ${vehicle}` : ''}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Help Text -->
          <tr>
            <td style="padding: 0 40px 32px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                Need to reschedule? Call <a href="tel:+16473711990" style="color: #1e293b; font-weight: 600; text-decoration: none;">(647) 371-1990</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                Premier Auto Service · <a href="https://premierauto.ai" style="color: #94a3b8; text-decoration: none;">premierauto.ai</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail(to, subject, html, {
    emailType: 'reminder',
    customerId,
    appointmentId
  });
}
