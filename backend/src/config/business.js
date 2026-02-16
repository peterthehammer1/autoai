/**
 * Centralized business configuration.
 * All customer-facing text (SMS, email, voice) should reference these constants
 * instead of hardcoding business details.
 */

export const BUSINESS = {
  name: 'Premier Auto Service',
  phone: '(647) 371-1990',
  phoneRaw: '+16473711990',
  address: '1250 Industrial Boulevard, Springfield',
  hours: 'Monday through Friday, 7 AM to 4 PM',
  agentName: 'Amber',
  domain: 'premierauto.ai',
  url: 'https://premierauto.ai',
  fromEmail: process.env.FROM_EMAIL || 'noreply@premierauto.ai',
  fromName: process.env.FROM_NAME || 'Premier Auto Service',
  advisorPhone: process.env.SERVICE_ADVISOR_PHONE || '(647) 371-1990',
};
