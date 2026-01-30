/**
 * PhoneNumber component with privacy masking
 * Always shows masked phone number (last 4 digits only)
 */

// Mask a phone number showing only last 4 digits
export const maskPhone = (phone) => {
  if (!phone) return ''
  // Extract just digits
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '****'
  const last4 = digits.slice(-4)
  return `•••-•••-${last4}`
}

export default function PhoneNumber({ 
  phone, 
  className = '',
  showRevealButton = false // Kept for backwards compatibility, but ignored
}) {
  if (!phone) return <span className={className}>-</span>

  return (
    <span className={`font-mono text-slate-500 ${className}`}>
      {maskPhone(phone)}
    </span>
  )
}

// Legacy export for backwards compatibility
export const useAdminMode = () => ({
  isAdmin: false,
  enableAdminMode: () => {},
  disableAdminMode: () => {}
})
