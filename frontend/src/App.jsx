import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import ErrorBoundary from '@/components/ErrorBoundary'
import Layout from '@/components/Layout'
import Landing from '@/pages/Landing'
import Dashboard from '@/pages/Dashboard'
import Appointments from '@/pages/Appointments'
import AppointmentDetail from '@/pages/AppointmentDetail'
import Customers from '@/pages/Customers'
import CustomerDetail from '@/pages/CustomerDetail'
import CallLogs from '@/pages/CallLogs'
import SmsLogs from '@/pages/SmsLogs'
import Analytics from '@/pages/Analytics'
import Reports from '@/pages/Reports'
import Services from '@/pages/Services'
import Settings from '@/pages/Settings'

function App() {
  return (
    <ErrorBoundary>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-white focus:text-blue-600 focus:underline">
        Skip to content
      </a>
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<Landing />} />

        {/* Dashboard routes (with sidebar layout) */}
        <Route element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="appointments/:id" element={<AppointmentDetail />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="call-logs" element={<CallLogs />} />
          <Route path="sms-logs" element={<SmsLogs />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="reports" element={<Reports />} />
          <Route path="services" element={<Services />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toaster />
    </ErrorBoundary>
  )
}

export default App
