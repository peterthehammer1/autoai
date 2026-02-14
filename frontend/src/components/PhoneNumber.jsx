/**
 * Phone number formatting and display components
 * 
 * Privacy rules:
 * - Mock/demo data (email ends in @example.com): Show full formatted number
 * - Real customer data: Mask for privacy, showing only last 4 digits
 */

import { formatPhone } from '@/lib/utils'

// Mask a phone number showing area code and last 4 digits: (519) •••-8959
export const maskPhone = (phone) => {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '(•••) •••-••••'
  
  // For 11-digit numbers starting with 1 (e.g., +15199918959)
  if (digits.length === 11 && digits.startsWith('1')) {
    const areaCode = digits.slice(1, 4)
    const last4 = digits.slice(-4)
    return `(${areaCode}) •••-${last4}`
  }
  
  // For 10-digit numbers
  if (digits.length === 10) {
    const areaCode = digits.slice(0, 3)
    const last4 = digits.slice(-4)
    return `(${areaCode}) •••-${last4}`
  }
  
  // Fallback for other formats
  const last4 = digits.slice(-4)
  return `(•••) •••-${last4}`
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

// Check if this is mock/demo data based on email pattern
const isMockData = (email) => {
  if (!email) return false
  return email.endsWith('@example.com')
}

// PhoneNumber component - automatically masks real customer data for privacy
// Mock data (email @example.com) shows full number: (519) 991-8959
// Real data shows masked: (519) •••-8959
export default function PhoneNumber({ 
  phone, 
  email,
  className = '',
  masked = null, // null = auto-detect, true = always mask, false = never mask
  showRevealButton = false
}) {
  if (!phone) return <span className={className}>-</span>

  // Determine if we should mask:
  // - If masked prop is explicitly set, use that
  // - Otherwise, mask real data (non-example.com emails or no email)
  const shouldMask = masked !== null ? masked : !isMockData(email)
  const displayValue = shouldMask ? maskPhone(phone) : formatPhone(phone)

  return (
    <span className={`text-slate-600 ${className}`}>
      {displayValue}
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
    <span className={`text-slate-500 ${className}`}>
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
