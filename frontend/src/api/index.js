// Use environment variable in production, proxy in development
// Default to production backend URL if not set
const API_BASE = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' ? '/api' : 'https://www.alignedai.dev/api')

async function fetchAPI(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `API error: ${response.status}`)
  }

  return response.json()
}

// Appointments
export const appointments = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return fetchAPI(`/appointments${query ? `?${query}` : ''}`)
  },
  
  today: () => fetchAPI('/appointments/today'),
  
  upcoming: (limit = 50) => fetchAPI(`/appointments/upcoming?limit=${limit}`),
  
  get: (id) => fetchAPI(`/appointments/${id}`),
  
  create: (data) => fetchAPI('/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id, data) => fetchAPI(`/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  
  confirm: (id) => fetchAPI(`/appointments/${id}/confirm`, {
    method: 'POST',
  }),
}

// Customers
export const customers = {
  list: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null && v !== '')
    )
    const query = new URLSearchParams(cleanParams).toString()
    return fetchAPI(`/customers${query ? `?${query}` : ''}`)
  },
  
  lookup: (phone) => fetchAPI(`/customers/lookup?phone=${encodeURIComponent(phone)}`),
  
  get: (id) => fetchAPI(`/customers/${id}`),
  
  create: (data) => fetchAPI('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id, data) => fetchAPI(`/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  
  getAppointments: (id, status = 'all') => 
    fetchAPI(`/customers/${id}/appointments?status=${status}`),
  
  getCalls: (id, limit = 50) => 
    fetchAPI(`/customers/${id}/calls?limit=${limit}`),
  
  getSms: (id, limit = 50) => 
    fetchAPI(`/customers/${id}/sms?limit=${limit}`),
  
  getInteractions: (id, limit = 50) => 
    fetchAPI(`/customers/${id}/interactions?limit=${limit}`),
  
  addVehicle: (customerId, data) => fetchAPI(`/customers/${customerId}/vehicles`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
}

// Services
export const services = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return fetchAPI(`/services${query ? `?${query}` : ''}`)
  },
  
  popular: () => fetchAPI('/services/popular'),
  
  categories: () => fetchAPI('/services/categories'),
  
  get: (id) => fetchAPI(`/services/${id}`),
  
  search: (term) => fetchAPI(`/services/search/${encodeURIComponent(term)}`),
}

// Availability
export const availability = {
  check: (params) => {
    const query = new URLSearchParams(params).toString()
    return fetchAPI(`/availability/check?${query}`)
  },
  
  day: (date) => fetchAPI(`/availability/day/${date}`),
  
  next: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return fetchAPI(`/availability/next${query ? `?${query}` : ''}`)
  },
}

// Analytics
export const analytics = {
  overview: () => fetchAPI('/analytics/overview'),
  
  appointments: (period = 'week') => 
    fetchAPI(`/analytics/appointments?period=${period}`),
  
  calls: (period = 'week') => 
    fetchAPI(`/analytics/calls?period=${period}`),
  
  services: (period = 'month') => 
    fetchAPI(`/analytics/services?period=${period}`),
  
  bayUtilization: (date) => {
    const query = date ? `?date=${date}` : ''
    return fetchAPI(`/analytics/bay-utilization${query}`)
  },
  
  insights: () => fetchAPI('/analytics/insights'),
  
  customerHealth: (customerId) => fetchAPI(`/analytics/customer-health/${customerId}`),
  
  callTrends: (period = 'week') => 
    fetchAPI(`/analytics/call-trends?period=${period}`),
}

// Call Logs
export const callLogs = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return fetchAPI(`/call-logs${query ? `?${query}` : ''}`)
  },
  
  get: (id) => fetchAPI(`/call-logs/${id}`),
  
  stats: (period = 'week') => fetchAPI(`/call-logs/stats/summary?period=${period}`),
}

// SMS Logs
export const smsLogs = {
  list: (params = {}) => {
    // Filter out undefined/null/empty values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null && v !== '')
    )
    const query = new URLSearchParams(cleanParams).toString()
    return fetchAPI(`/sms-logs${query ? `?${query}` : ''}`)
  },
  
  stats: (period = 'week') => fetchAPI(`/sms-logs/stats?period=${period}`),
}

export default {
  appointments,
  customers,
  services,
  availability,
  analytics,
  callLogs,
  smsLogs,
}
