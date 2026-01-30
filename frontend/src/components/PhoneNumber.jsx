/**
 * Privacy masking components for phone numbers and emails
 */

// Mask a phone number showing only last 4 digits
export const maskPhone = (phone) => {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '****'
  const last4 = digits.slice(-4)
  return `•••-•••-${last4}`
}

// Mask an email showing first 2 chars + domain
export const maskEmail = (email) => {
  if (!email) return ''
  const [localPart, domain] = email.split('@')
  if (!domain) return '••••@••••'
  
  // Show first 2 characters of local part, mask the rest
  const visibleChars = Math.min(2, localPart.length)
  const masked = localPart.slice(0, visibleChars) + '•'.repeat(Math.max(0, localPart.length - visibleChars))
  
  return `${masked}@${domain}`
}

// PhoneNumber component - always masked
export default function PhoneNumber({ 
  phone, 
  className = '',
  showRevealButton = false
}) {
  if (!phone) return <span className={className}>-</span>

  return (
    <span className={`font-mono text-slate-500 ${className}`}>
      {maskPhone(phone)}
    </span>
  )
}

// Email component - always masked
export function Email({ 
  email, 
  className = '' 
}) {
  if (!email) return <span className={className}>-</span>

  return (
    <span className={`font-mono text-slate-500 ${className}`}>
      {maskEmail(email)}
    </span>
  )
}

// Legacy export for backwards compatibility
export const useAdminMode = () => ({
  isAdmin: false,
  enableAdminMode: () => {},
  disableAdminMode: () => {}
})
