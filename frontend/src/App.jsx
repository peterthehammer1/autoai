import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import ErrorBoundary from '@/components/ErrorBoundary'
import Layout from '@/components/Layout'
import Landing from '@/pages/Landing'

// Auto-reload on stale chunks after deploy
function lazyWithRetry(importFn) {
  return lazy(() =>
    importFn().catch(() => {
      window.location.reload()
      return new Promise(() => {}) // never resolves — page is reloading
    })
  )
}

// Lazy-load dashboard pages — splits the 1MB+ bundle into smaller chunks
const Dashboard = lazyWithRetry(() => import('@/pages/Dashboard'))
const Appointments = lazyWithRetry(() => import('@/pages/Appointments'))
const AppointmentDetail = lazyWithRetry(() => import('@/pages/AppointmentDetail'))
const Customers = lazyWithRetry(() => import('@/pages/Customers'))
const CustomerDetail = lazyWithRetry(() => import('@/pages/CustomerDetail'))
const CallLogs = lazyWithRetry(() => import('@/pages/CallLogs'))
const SmsLogs = lazyWithRetry(() => import('@/pages/SmsLogs'))
const Analytics = lazyWithRetry(() => import('@/pages/Analytics'))
const Reports = lazyWithRetry(() => import('@/pages/Reports'))
const Services = lazyWithRetry(() => import('@/pages/Services'))
const Settings = lazyWithRetry(() => import('@/pages/Settings'))
const BayView = lazyWithRetry(() => import('@/pages/BayView'))
const WorkOrders = lazyWithRetry(() => import('@/pages/WorkOrders'))
const WorkOrderDetail = lazyWithRetry(() => import('@/pages/WorkOrderDetail'))
const Reviews = lazyWithRetry(() => import('@/pages/Reviews'))
const Portal = lazyWithRetry(() => import('@/pages/Portal'))

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64 opacity-0 animate-[fadeIn_0.3s_ease-in_0.15s_forwards]">
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
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<Landing />} />

        {/* Public customer portal (magic-link, no dashboard layout) */}
        <Route path="portal/:token" element={
          <Suspense fallback={<PageLoader />}>
            <Portal />
          </Suspense>
        } />
        <Route path="portal/:token/track/:workOrderId" element={
          <Suspense fallback={<PageLoader />}>
            <Portal />
          </Suspense>
        } />

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
          <Route path="bay-view" element={<BayView />} />
          <Route path="work-orders" element={<WorkOrders />} />
          <Route path="work-orders/:id" element={<WorkOrderDetail />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="services" element={<Services />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toaster />
    </ErrorBoundary>
  )
}

export default App
