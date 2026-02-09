import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatPhone(phone) {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

// Format dollar amounts (for service prices stored as dollars)
export function formatCurrency(dollars) {
  if (dollars === null || dollars === undefined) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars)
}

// Format price amounts (stored as dollars in DB)
export function formatCents(amount) {
  if (amount === null || amount === undefined) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDuration(minutes) {
  if (!minutes) return '-'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours} hr`
  return `${hours} hr ${mins} min`
}

export function formatTime12Hour(timeStr) {
  if (!timeStr) return ''
  const [hours, mins] = timeStr.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `${hour12}:${String(mins).padStart(2, '0')} ${period}`
}

export function getStatusColor(status) {
  const colors = {
    scheduled: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    checked_in: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-amber-100 text-amber-800',
    checking_out: 'bg-purple-100 text-purple-800',
    completed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-orange-100 text-orange-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function getOutcomeColor(outcome) {
  const colors = {
    booked: 'bg-green-100 text-green-800',
    rescheduled: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    inquiry: 'bg-gray-100 text-gray-800',
    transferred: 'bg-yellow-100 text-yellow-800',
    abandoned: 'bg-orange-100 text-orange-800',
  }
  return colors[outcome] || 'bg-gray-100 text-gray-800'
}
