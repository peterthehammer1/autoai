import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import ErrorBoundary from '@/components/ErrorBoundary'
import Layout from '@/components/Layout'
import Landing from '@/pages/Landing'

// Lazy-load dashboard pages — splits the 1MB+ bundle into smaller chunks
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Appointments = lazy(() => import('@/pages/Appointments'))
const AppointmentDetail = lazy(() => import('@/pages/AppointmentDetail'))
const Customers = lazy(() => import('@/pages/Customers'))
const CustomerDetail = lazy(() => import('@/pages/CustomerDetail'))
const CallLogs = lazy(() => import('@/pages/CallLogs'))
const SmsLogs = lazy(() => import('@/pages/SmsLogs'))
const Analytics = lazy(() => import('@/pages/Analytics'))
const Reports = lazy(() => import('@/pages/Reports'))
const Services = lazy(() => import('@/pages/Services'))
const Settings = lazy(() => import('@/pages/Settings'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-white focus:text-blue-600 focus:underline">
        Skip to content
      </a>
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
      <Toaster />
    </ErrorBoundary>
  )
}

export default App
