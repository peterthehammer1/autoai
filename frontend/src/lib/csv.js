/**
 * Mask phone number for demo (e.g., +1 (647) 371-1990 -> +1 (647) ***-**90)
 */
export function maskPhone(phone) {
  if (!phone) return ''
  // Remove all non-digits to normalize
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return phone
  
  // Keep first 4 and last 2 digits visible
  const visible = digits.slice(0, 4) + '***' + digits.slice(-2)
  
  // Format nicely
  if (digits.length === 10) {
    return `(${visible.slice(0, 3)}) ${visible.slice(3, 6)}-${visible.slice(6)}`
  } else if (digits.length === 11) {
    return `+${visible.slice(0, 1)} (${visible.slice(1, 4)}) ${visible.slice(4, 7)}-${visible.slice(7)}`
  }
  return visible
}

/**
 * Mask email for demo (e.g., john.doe@email.com -> jo***@***.com)
 */
export function maskEmail(email) {
  if (!email || !email.includes('@')) return ''
  
  const [local, domain] = email.split('@')
  const domainParts = domain.split('.')
  const tld = domainParts.pop()
  
  // Show first 2 chars of local, mask rest
  const maskedLocal = local.slice(0, 2) + '***'
  
  // Mask domain but show TLD
  const maskedDomain = '***.' + tld
  
  return `${maskedLocal}@${maskedDomain}`
}

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV(data, columns, options = {}) {
  if (!data || data.length === 0) return ''
  
  const { maskSensitive = true } = options
  
  // Get headers from columns config or from first object keys
  const headers = columns ? columns.map(c => c.label) : Object.keys(data[0])
  const keys = columns ? columns.map(c => c.key) : Object.keys(data[0])
  
  // Build CSV rows
  const rows = data.map(row => {
    return keys.map((key, idx) => {
      let value = key.includes('.') 
        ? key.split('.').reduce((obj, k) => obj?.[k], row)
        : row[key]
      
      // Handle null/undefined
      if (value === null || value === undefined) value = ''
      
      // Convert to string
      value = String(value)
      
      // Mask sensitive fields for demo
      if (maskSensitive) {
        const label = columns?.[idx]?.label?.toLowerCase() || key.toLowerCase()
        if (label.includes('phone') || label.includes('tel')) {
          value = maskPhone(value)
        } else if (label.includes('email')) {
          value = maskEmail(value)
        }
      }
      
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value.replace(/"/g, '""')}"`
      }
      
      return value
    }).join(',')
  })
  
  return [headers.join(','), ...rows].join('\n')
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * Format date for filename
 */
export function formatDateForFilename(date = new Date()) {
  return date.toISOString().split('T')[0]
}
