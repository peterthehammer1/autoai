import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Appointments from '@/pages/Appointments'
import AppointmentDetail from '@/pages/AppointmentDetail'
import Customers from '@/pages/Customers'
import CustomerDetail from '@/pages/CustomerDetail'
import CallLogs from '@/pages/CallLogs'
import Analytics from '@/pages/Analytics'
import Services from '@/pages/Services'
import Settings from '@/pages/Settings'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="appointments/:id" element={<AppointmentDetail />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="call-logs" element={<CallLogs />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="services" element={<Services />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App
