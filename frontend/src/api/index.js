const API_BASE = '/api'

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
  lookup: (phone) => fetchAPI(`/customers/lookup?phone=${encodeURIComponent(phone)}`),
  
  get: (id) => fetchAPI(`/customers/${id}`),
  
  create: (data) => fetchAPI('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  getAppointments: (id, status = 'all') => 
    fetchAPI(`/customers/${id}/appointments?status=${status}`),
  
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
}

// Call Logs (we'll need to add this endpoint to the backend)
export const callLogs = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    // This endpoint doesn't exist yet - we'll add it
    return fetchAPI(`/call-logs${query ? `?${query}` : ''}`)
  },
  
  get: (id) => fetchAPI(`/call-logs/${id}`),
}

export default {
  appointments,
  customers,
  services,
  availability,
  analytics,
  callLogs,
}
