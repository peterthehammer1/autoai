import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { cn, formatCents, formatTime12Hour, parseDateLocal, getStatusColor } from '@/lib/utils'
import {
  Car,
  Calendar,
  ClipboardList,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  CheckCircle,
  Circle,
  Phone,
  FileText,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  Check,
  X,
  Wrench,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function portalFetch(token, path = '') {
  const res = await fetch(`${API_BASE}/portal/${token}${path}`)
  if (!res.ok) {
    if (res.status === 401) throw new Error('EXPIRED')
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Error: ${res.status}`)
  }
  return res.json()
}

async function portalPost(token, path, body) {
  const res = await fetch(`${API_BASE}/portal/${token}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Error: ${res.status}`)
  }
  return res.json()
}

// ── Status helpers ──

const APPOINTMENT_STEPS = [
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'checked_in', label: 'Checked In' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Complete' },
]

function getStepIndex(status) {
  const idx = APPOINTMENT_STEPS.findIndex(s => s.key === status)
  return idx >= 0 ? idx : 0
}

function getWOStatusLabel(status) {
  const labels = {
    estimated: 'Estimate Ready',
    sent_to_customer: 'Estimate Ready',
    approved: 'Approved',
    in_progress: 'In Progress',
    completed: 'Completed',
    invoiced: 'Invoiced',
    paid: 'Paid',
  }
  return labels[status] || status?.replace(/_/g, ' ')
}

function getWOStatusColor(status) {
  const colors = {
    estimated: 'bg-blue-100 text-blue-700',
    sent_to_customer: 'bg-blue-100 text-blue-700',
    approved: 'bg-emerald-100 text-emerald-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed: 'bg-slate-200 text-slate-700',
    invoiced: 'bg-purple-100 text-purple-700',
    paid: 'bg-green-100 text-green-700',
  }
  return colors[status] || 'bg-slate-100 text-slate-600'
}

// ── Main Portal Component ──

export default function Portal() {
  const { token, workOrderId, inspectionId } = useParams()
  const [state, setState] = useState('loading') // loading | valid | expired | error
  const [customer, setCustomer] = useState(null)
  const [tab, setTab] = useState(workOrderId ? 'tracker' : inspectionId ? 'inspection' : 'status')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    portalFetch(token)
      .then(data => {
        setCustomer(data.customer)
        setState('valid')
      })
      .catch(err => {
        if (err.message === 'EXPIRED') setState('expired')
        else {
          setState('error')
          setErrorMsg(err.message)
        }
      })
  }, [token])

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    )
  }

  if (state === 'expired' || state === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">
            {state === 'expired' ? 'Link Expired' : 'Something went wrong'}
          </h1>
          <p className="text-sm text-slate-500">
            {state === 'expired'
              ? 'This portal link has expired. Please contact us for a new one.'
              : errorMsg || 'We couldn\'t load your portal. Please try again later.'}
          </p>
          <a
            href="tel:+16473711990"
            className="inline-flex items-center gap-2 text-teal-600 font-medium text-sm hover:underline"
          >
            <Phone className="h-4 w-4" />
            (647) 371-1990
          </a>
        </div>
      </div>
    )
  }

  // Direct tracker view (from SMS deep link)
  if (workOrderId) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-bold text-slate-900">Premier Auto Service</h1>
                <p className="text-xs text-slate-500">
                  Hi {customer?.first_name || 'there'}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-teal-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {(customer?.first_name?.[0] || 'P').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
          <RepairTracker token={token} workOrderId={workOrderId} />
        </main>
        <footer className="max-w-lg mx-auto px-4 py-6 text-center">
          <a
            href="tel:+16473711990"
            className="inline-flex items-center gap-1.5 text-teal-600 text-xs font-medium hover:underline"
          >
            <Phone className="h-3 w-3" />
            (647) 371-1990
          </a>
          <p className="text-xs text-slate-400 mt-1">Premier Auto Service</p>
        </footer>
      </div>
    )
  }

  // Direct inspection view (from SMS deep link)
  if (inspectionId) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-bold text-slate-900">Premier Auto Service</h1>
                <p className="text-xs text-slate-500">
                  Hi {customer?.first_name || 'there'}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-teal-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {(customer?.first_name?.[0] || 'P').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
          <InspectionReport token={token} inspectionId={inspectionId} />
        </main>
        <footer className="max-w-lg mx-auto px-4 py-6 text-center">
          <a
            href="tel:+16473711990"
            className="inline-flex items-center gap-1.5 text-teal-600 text-xs font-medium hover:underline"
          >
            <Phone className="h-3 w-3" />
            (647) 371-1990
          </a>
          <p className="text-xs text-slate-400 mt-1">Premier Auto Service</p>
        </footer>
      </div>
    )
  }

  const tabs = [
    { key: 'status', label: 'Status', icon: Clock },
    { key: 'estimate', label: 'Estimate', icon: FileText },
    { key: 'inspection', label: 'Inspection', icon: ClipboardCheck },
    { key: 'history', label: 'History', icon: Calendar },
    { key: 'vehicles', label: 'Vehicles', icon: Car },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold text-slate-900">Premier Auto Service</h1>
              <p className="text-xs text-slate-500">
                Hi {customer?.first_name || 'there'}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-teal-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {(customer?.first_name?.[0] || 'P').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-[57px] z-10">
        <div className="max-w-lg mx-auto px-4 flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                data-tab={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
                  tab === t.key
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {tab === 'status' && <StatusTab token={token} />}
        {tab === 'estimate' && <EstimateTab token={token} customer={customer} />}
        {tab === 'inspection' && <InspectionTab token={token} />}
        {tab === 'history' && <HistoryTab token={token} />}
        {tab === 'vehicles' && <VehiclesTab vehicles={customer?.vehicles || []} />}
      </main>

      {/* Footer */}
      <footer className="max-w-lg mx-auto px-4 py-6 text-center">
        <a
          href="tel:+16473711990"
          className="inline-flex items-center gap-1.5 text-teal-600 text-xs font-medium hover:underline"
        >
          <Phone className="h-3 w-3" />
          (647) 371-1990
        </a>
        <p className="text-xs text-slate-400 mt-1">Premier Auto Service</p>
      </footer>
    </div>
  )
}

// ── Repair Tracker ──

const WO_TRACKER_STEPS = [
  { key: 'estimated', label: 'Estimate Sent' },
  { key: 'approved', label: 'Approved' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'invoiced', label: 'Ready for Pickup' },
]

function getTrackerStepIndex(status) {
  const idx = WO_TRACKER_STEPS.findIndex(s => s.key === status)
  // paid maps to invoiced (last visible step)
  if (status === 'paid') return WO_TRACKER_STEPS.length - 1
  if (status === 'sent_to_customer') return 0
  return idx >= 0 ? idx : 0
}

function RepairTracker({ token, workOrderId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const intervalRef = useRef(null)

  const fetchTracker = useCallback(async () => {
    try {
      const result = await portalFetch(token, `/work-orders/${workOrderId}/tracker`)
      setData(result)
      setLastUpdated(new Date())
    } catch {
      // keep showing stale data if we have it
    } finally {
      setLoading(false)
    }
  }, [token, workOrderId])

  useEffect(() => {
    fetchTracker()
    // Poll every 30 seconds
    intervalRef.current = setInterval(fetchTracker, 30000)
    return () => clearInterval(intervalRef.current)
  }, [fetchTracker])

  if (loading) return <LoadingCard />
  if (!data) {
    return <EmptyState icon={AlertCircle} title="Not found" message="Could not load repair status." />
  }

  const { work_order: wo, status_history: history, shop } = data
  const stepIndex = getTrackerStepIndex(wo.status)
  const vehicle = wo.vehicle
  const vehicleLabel = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : null
  const items = wo.work_order_items || []

  // Build a map of step -> timestamp from history
  const stepTimestamps = {}
  for (const entry of history) {
    if (!stepTimestamps[entry.status]) {
      stepTimestamps[entry.status] = entry.created_at
    }
  }
  // sent_to_customer maps to estimated step
  if (stepTimestamps.sent_to_customer && !stepTimestamps.estimated) {
    stepTimestamps.estimated = stepTimestamps.sent_to_customer
  }

  return (
    <div className="space-y-4">
      {/* Vehicle + WO header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">{wo.work_order_display}</p>
            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getWOStatusColor(wo.status))}>
              {getWOStatusLabel(wo.status)}
            </span>
          </div>
          {vehicleLabel && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Car className="h-3.5 w-3.5 text-slate-400" />
              {vehicleLabel}
            </div>
          )}
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-4">Repair Progress</h3>
        <div className="space-y-0">
          {WO_TRACKER_STEPS.map((step, i) => {
            const isComplete = i < stepIndex
            const isCurrent = i === stepIndex
            const isFuture = i > stepIndex
            const timestamp = stepTimestamps[step.key]
            return (
              <div key={step.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-teal-600" />
                  ) : isCurrent ? (
                    <div className="h-5 w-5 rounded-full border-2 border-teal-600 bg-teal-50 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-teal-600 animate-pulse" />
                    </div>
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300" />
                  )}
                  {i < WO_TRACKER_STEPS.length - 1 && (
                    <div className={cn(
                      'w-0.5 h-8',
                      isComplete ? 'bg-teal-600' : 'bg-slate-200'
                    )} />
                  )}
                </div>
                <div className="pt-0.5 pb-3">
                  <p className={cn(
                    'text-sm',
                    isCurrent ? 'font-semibold text-teal-700' : isComplete ? 'font-medium text-slate-700' : 'text-slate-400'
                  )}>
                    {step.label}
                    {isCurrent && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-teal-600">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
                        </span>
                        Current
                      </span>
                    )}
                  </p>
                  {(isComplete || isCurrent) && timestamp && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {format(new Date(timestamp), 'MMM d, h:mm a')}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Service Summary */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          <div className="px-4 py-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400">Services</h3>
          </div>
          {items.map(item => (
            <div key={item.id} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-sm text-slate-700">{item.description}</span>
              </div>
              <span className="text-sm font-medium text-slate-900">{formatCents(item.total_cents)}</span>
            </div>
          ))}
          <div className="px-4 py-3 flex items-center justify-between bg-slate-50">
            <span className="text-sm font-semibold text-slate-900">Total</span>
            <span className="text-sm font-semibold text-slate-900">{formatCents(wo.total_cents)}</span>
          </div>
        </div>
      )}

      {/* Timeline Feed */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-3">Activity</h3>
          <div className="space-y-3">
            {[...history].reverse().map(entry => (
              <div key={entry.id} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="h-3 w-3 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-700">
                    {getWOStatusLabel(entry.status)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {format(new Date(entry.created_at), 'MMM d, h:mm a')}
                  </p>
                  {entry.notes && (
                    <p className="text-xs text-slate-500 mt-0.5">{entry.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact + last updated */}
      <div className="text-center space-y-2">
        {lastUpdated && (
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
            <RefreshCw className="h-3 w-3" />
            Updates every 30s
          </p>
        )}
        {shop && (
          <a
            href={`tel:${shop.phone}`}
            className="inline-flex items-center gap-1.5 text-teal-600 text-xs font-medium hover:underline"
          >
            <Phone className="h-3 w-3" />
            Questions? Call {shop.name}
          </a>
        )}
      </div>
    </div>
  )
}

// ── Status Tab ──

function StatusTab({ token }) {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState(null)
  const [workOrders, setWorkOrders] = useState(null)
  const [loading, setLoading] = useState(true)
  const [trackerWOId, setTrackerWOId] = useState(null)

  useEffect(() => {
    Promise.all([
      portalFetch(token, '/appointments'),
      portalFetch(token, '/work-orders'),
    ])
      .then(([aptData, woData]) => {
        setAppointments(aptData.appointments || [])
        setWorkOrders(woData.work_orders || [])
      })
      .catch(() => {
        setAppointments([])
        setWorkOrders([])
      })
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <LoadingCard />

  // If viewing inline tracker
  if (trackerWOId) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setTrackerWOId(null)}
          className="flex items-center gap-1 text-xs text-teal-600 hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to status
        </button>
        <RepairTracker token={token} workOrderId={trackerWOId} />
      </div>
    )
  }

  // Active work orders (approved, in_progress)
  const activeWOs = (workOrders || []).filter(wo =>
    ['approved', 'in_progress', 'sent_to_customer'].includes(wo.status)
  )

  // Find the most recent active appointment
  const activeApt = appointments?.find(a =>
    !['completed', 'cancelled', 'no_show'].includes(a.status)
  )

  if (activeWOs.length === 0 && !activeApt) {
    return (
      <EmptyState
        icon={Clock}
        title="No active services"
        message="You don't have any upcoming appointments or active repairs right now."
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Active Work Orders — Repair Tracker Cards */}
      {activeWOs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400">Active Repairs</h3>
          {activeWOs.map(wo => {
            const stepIndex = getTrackerStepIndex(wo.status)
            const vehicle = wo.vehicle
            const vehicleLabel = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : null
            return (
              <button
                key={wo.id}
                onClick={() => setTrackerWOId(wo.id)}
                className="w-full bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-teal-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{wo.work_order_display}</p>
                    {vehicleLabel && (
                      <p className="text-xs text-slate-500">{vehicleLabel}</p>
                    )}
                  </div>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getWOStatusColor(wo.status))}>
                    {getWOStatusLabel(wo.status)}
                  </span>
                </div>
                {/* Mini progress bar */}
                <div className="flex gap-1">
                  {WO_TRACKER_STEPS.map((step, i) => (
                    <div
                      key={step.key}
                      className={cn(
                        'h-1.5 flex-1 rounded-full',
                        i <= stepIndex ? 'bg-teal-500' : 'bg-slate-200'
                      )}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-teal-600 font-medium">Track progress</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Active Appointment (fallback when no active WOs) */}
      {activeApt && (
        <div className="space-y-3">
          {activeWOs.length > 0 && (
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400">Appointment</h3>
          )}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {format(parseDateLocal(activeApt.scheduled_date), 'EEEE, MMMM do')}
                </p>
                <p className="text-xs text-slate-500">
                  {formatTime12Hour(activeApt.scheduled_time)}
                </p>
              </div>
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(activeApt.status))}>
                {activeApt.status.replace(/_/g, ' ')}
              </span>
            </div>

            {activeApt.vehicle && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Car className="h-3.5 w-3.5 text-slate-400" />
                {activeApt.vehicle.year} {activeApt.vehicle.make} {activeApt.vehicle.model}
              </div>
            )}

            {activeApt.appointment_services?.length > 0 && (
              <div className="flex items-start gap-2 text-xs text-slate-600">
                <ClipboardList className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                <div>{activeApt.appointment_services.map(s => s.service_name).join(', ')}</div>
              </div>
            )}
          </div>

          {/* Appointment Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-4">Progress</h3>
            <div className="space-y-0">
              {APPOINTMENT_STEPS.map((step, i) => {
                const aptStepIndex = getStepIndex(activeApt.status)
                const isComplete = i < aptStepIndex
                const isCurrent = i === aptStepIndex
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      {isComplete ? (
                        <CheckCircle2 className="h-5 w-5 text-teal-600" />
                      ) : isCurrent ? (
                        <div className="h-5 w-5 rounded-full border-2 border-teal-600 bg-teal-50 flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-teal-600" />
                        </div>
                      ) : (
                        <Circle className="h-5 w-5 text-slate-300" />
                      )}
                      {i < APPOINTMENT_STEPS.length - 1 && (
                        <div className={cn(
                          'w-0.5 h-6',
                          isComplete ? 'bg-teal-600' : 'bg-slate-200'
                        )} />
                      )}
                    </div>
                    <p className={cn(
                      'text-sm pt-0.5',
                      isCurrent ? 'font-semibold text-teal-700' : isComplete ? 'text-slate-600' : 'text-slate-400'
                    )}>
                      {step.label}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Estimate Tab ──

function EstimateTab({ token, customer }) {
  const [workOrders, setWorkOrders] = useState(null)
  const [selectedWO, setSelectedWO] = useState(null)
  const [woDetail, setWODetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [approving, setApproving] = useState(false)
  const [approved, setApproved] = useState(false)
  const [itemStatuses, setItemStatuses] = useState({})

  useEffect(() => {
    portalFetch(token, '/work-orders')
      .then(data => {
        const pending = (data.work_orders || []).filter(wo =>
          ['estimated', 'sent_to_customer'].includes(wo.status)
        )
        setWorkOrders(pending)
        // Auto-select the first pending WO
        if (pending.length === 1) {
          loadWODetail(pending[0].id)
        }
      })
      .catch(() => setWorkOrders([]))
      .finally(() => setLoading(false))
  }, [token])

  const loadWODetail = useCallback(async (woId) => {
    setDetailLoading(true)
    setSelectedWO(woId)
    setApproved(false)
    try {
      const data = await portalFetch(token, `/work-orders/${woId}`)
      setWODetail(data.work_order)
      // Initialize item statuses
      const statuses = {}
      for (const item of data.work_order.work_order_items || []) {
        statuses[item.id] = item.status === 'declined' ? 'declined' : 'approved'
      }
      setItemStatuses(statuses)
    } catch {
      setWODetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [token])

  const handleApprove = async () => {
    if (!woDetail) return
    setApproving(true)
    try {
      const allApproved = Object.values(itemStatuses).every(s => s === 'approved')
      const body = allApproved
        ? { approve_all: true }
        : { items: Object.entries(itemStatuses).map(([id, status]) => ({ id, status })) }

      const result = await portalPost(token, `/work-orders/${woDetail.id}/approve`, body)
      setWODetail(result.work_order)
      setApproved(true)
    } catch (err) {
      alert(err.message || 'Failed to approve estimate')
    } finally {
      setApproving(false)
    }
  }

  const toggleItem = (itemId) => {
    setItemStatuses(prev => ({
      ...prev,
      [itemId]: prev[itemId] === 'approved' ? 'declined' : 'approved',
    }))
  }

  if (loading) return <LoadingCard />

  if (!workOrders?.length) {
    return (
      <EmptyState
        icon={FileText}
        title="No pending estimates"
        message="You don't have any estimates waiting for approval."
      />
    )
  }

  // WO list (if multiple)
  if (!selectedWO) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-500">You have {workOrders.length} estimate{workOrders.length > 1 ? 's' : ''} to review:</p>
        {workOrders.map(wo => (
          <button
            key={wo.id}
            onClick={() => loadWODetail(wo.id)}
            className="w-full bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-teal-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{wo.work_order_display}</p>
                <p className="text-xs text-slate-500">
                  {wo.vehicle ? `${wo.vehicle.year} ${wo.vehicle.make} ${wo.vehicle.model}` : 'Vehicle'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">{formatCents(wo.total_cents)}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          </button>
        ))}
      </div>
    )
  }

  if (detailLoading) return <LoadingCard />
  if (!woDetail) {
    return <EmptyState icon={AlertCircle} title="Error" message="Could not load estimate details." />
  }

  // Approved confirmation
  if (approved) {
    return (
      <div className="bg-white rounded-xl border border-emerald-200 p-6 text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">Estimate Approved</h3>
        <p className="text-sm text-slate-500">Thank you! We'll get started on your vehicle right away.</p>
        {workOrders.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSelectedWO(null); setWODetail(null); setApproved(false) }}
          >
            View other estimates
          </Button>
        )}
      </div>
    )
  }

  const items = woDetail.work_order_items || []
  const approvedCount = Object.values(itemStatuses).filter(s => s === 'approved').length

  return (
    <div className="space-y-4">
      {/* WO header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">{woDetail.work_order_display}</p>
            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getWOStatusColor(woDetail.status))}>
              {getWOStatusLabel(woDetail.status)}
            </span>
          </div>
          {workOrders.length > 1 && (
            <button
              onClick={() => { setSelectedWO(null); setWODetail(null) }}
              className="text-xs text-teal-600 hover:underline"
            >
              Back
            </button>
          )}
        </div>
        {woDetail.notes && (
          <p className="text-xs text-slate-500 mt-2">{woDetail.notes}</p>
        )}
      </div>

      {/* Line items */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        <div className="px-4 py-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400">Services & Parts</h3>
        </div>
        {items.map(item => {
          const itemStatus = itemStatuses[item.id] || 'approved'
          const isDeclined = itemStatus === 'declined'
          return (
            <div key={item.id} className={cn('px-4 py-3 flex items-center gap-3', isDeclined && 'opacity-50')}>
              <button
                onClick={() => toggleItem(item.id)}
                className={cn(
                  'flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors',
                  isDeclined
                    ? 'border-slate-300 bg-white'
                    : 'border-teal-600 bg-teal-600'
                )}
              >
                {!isDeclined && <Check className="h-3 w-3 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm text-slate-900', isDeclined && 'line-through')}>
                  {item.description}
                </p>
                <p className="text-xs text-slate-400">
                  {item.item_type} {item.quantity > 1 ? `x${item.quantity}` : ''}
                </p>
              </div>
              <p className={cn('text-sm font-medium text-slate-900 whitespace-nowrap', isDeclined && 'line-through')}>
                {formatCents(item.total_cents)}
              </p>
            </div>
          )
        })}
      </div>

      {/* Totals */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Subtotal</span>
          <span>{formatCents(woDetail.subtotal_cents)}</span>
        </div>
        {woDetail.discount_cents > 0 && (
          <div className="flex justify-between text-xs text-emerald-600">
            <span>Discount</span>
            <span>-{formatCents(woDetail.discount_cents)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs text-slate-500">
          <span>Tax</span>
          <span>{formatCents(woDetail.tax_cents)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold text-slate-900 pt-2 border-t border-slate-200">
          <span>Total</span>
          <span>{formatCents(woDetail.total_cents)}</span>
        </div>
      </div>

      {/* Approve button */}
      {['estimated', 'sent_to_customer'].includes(woDetail.status) && (
        <Button
          onClick={handleApprove}
          disabled={approving || approvedCount === 0}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white"
        >
          {approving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Approving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Approve {approvedCount === items.length ? 'All' : `${approvedCount} of ${items.length}`} Items
            </>
          )}
        </Button>
      )}

      {/* Payment stub */}
      {woDetail.balance_due_cents > 0 && woDetail.status !== 'estimated' && woDetail.status !== 'sent_to_customer' && (
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-4 text-center">
          <p className="text-xs text-slate-400">Online payment coming soon</p>
          <p className="text-sm font-semibold text-slate-600 mt-1">
            Balance due: {formatCents(woDetail.balance_due_cents)}
          </p>
        </div>
      )}
    </div>
  )
}

// ── History Tab ──

function HistoryTab({ token }) {
  const [appointments, setAppointments] = useState(null)
  const [workOrders, setWorkOrders] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      portalFetch(token, '/appointments'),
      portalFetch(token, '/work-orders'),
    ])
      .then(([aptData, woData]) => {
        setAppointments(aptData.appointments || [])
        setWorkOrders(woData.work_orders || [])
      })
      .catch(() => {
        setAppointments([])
        setWorkOrders([])
      })
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <LoadingCard />

  const completedAppts = appointments?.filter(a =>
    ['completed', 'cancelled', 'no_show'].includes(a.status)
  ) || []

  const completedWOs = workOrders?.filter(wo =>
    ['completed', 'invoiced', 'paid'].includes(wo.status)
  ) || []

  if (completedAppts.length === 0 && completedWOs.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No service history"
        message="Your past appointments and work orders will appear here."
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Past appointments */}
      {completedAppts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400">Past Appointments</h3>
          {completedAppts.map(apt => {
            const vehicle = apt.vehicle
            const services = apt.appointment_services?.map(s => s.service_name) || []
            return (
              <div key={apt.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-900">
                    {format(parseDateLocal(apt.scheduled_date), 'MMM d, yyyy')}
                  </p>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(apt.status))}>
                    {apt.status.replace(/_/g, ' ')}
                  </span>
                </div>
                {vehicle && (
                  <p className="text-xs text-slate-500">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                )}
                {services.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">{services.join(', ')}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Completed work orders */}
      {completedWOs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400">Work Orders</h3>
          {completedWOs.map(wo => (
            <div key={wo.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-slate-900">{wo.work_order_display}</p>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getWOStatusColor(wo.status))}>
                  {getWOStatusLabel(wo.status)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {wo.vehicle ? `${wo.vehicle.year} ${wo.vehicle.make} ${wo.vehicle.model}` : ''}
                </p>
                <p className="text-sm font-semibold text-slate-900">{formatCents(wo.total_cents)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Vehicles Tab ──

function VehiclesTab({ vehicles }) {
  if (!vehicles?.length) {
    return (
      <EmptyState
        icon={Car}
        title="No vehicles on file"
        message="Your vehicles will appear here once added by the shop."
      />
    )
  }

  return (
    <div className="space-y-3">
      {vehicles.map(v => (
        <div key={v.id} className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
              <Car className="h-5 w-5 text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">
                {v.year} {v.make} {v.model}
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                {v.color && <span>{v.color}</span>}
                {v.license_plate && <span className="font-mono">{v.license_plate}</span>}
              </div>
            </div>
          </div>
          {v.mileage && (
            <p className="text-xs text-slate-400 mt-2 ml-13">
              {Number(v.mileage).toLocaleString()} km
            </p>
          )}

          {/* Link to inspection tab */}
          <button
            onClick={() => {
              // Navigate to Inspection tab (parent sets tab via ref or we use a simple approach)
              const tabBtn = document.querySelector('[data-tab="inspection"]')
              if (tabBtn) tabBtn.click()
            }}
            className="mt-3 w-full px-3 py-2 bg-teal-50 rounded-lg border border-teal-200 text-center hover:bg-teal-100 transition-colors"
          >
            <p className="text-xs text-teal-700 font-medium flex items-center justify-center gap-1">
              <ClipboardCheck className="h-3 w-3" />
              View Vehicle Inspections
            </p>
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Inspection Tab ──

const CONDITION_STYLES = {
  good: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle, label: 'Good' },
  fair: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', icon: AlertTriangle, label: 'Monitor' },
  needs_attention: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', icon: AlertCircle, label: 'Attention' },
  urgent: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-600', icon: XCircle, label: 'Urgent' },
}

function InspectionTab({ token }) {
  const [inspectionsList, setInspectionsList] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    portalFetch(token, '/inspections')
      .then(data => setInspectionsList(data.inspections || []))
      .catch(() => setInspectionsList([]))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <LoadingCard />

  if (!inspectionsList?.length) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="No inspections"
        message="Your vehicle inspection reports will appear here."
      />
    )
  }

  // If viewing a specific inspection
  if (selectedId) {
    return (
      <div className="space-y-3">
        {inspectionsList.length > 1 && (
          <button
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-1 text-xs text-teal-600 hover:underline"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to inspections
          </button>
        )}
        <InspectionReport token={token} inspectionId={selectedId} />
      </div>
    )
  }

  // Auto-select if only one
  if (inspectionsList.length === 1) {
    return <InspectionReport token={token} inspectionId={inspectionsList[0].id} />
  }

  // List view
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">{inspectionsList.length} inspection report{inspectionsList.length > 1 ? 's' : ''}</p>
      {inspectionsList.map(insp => {
        const vehicle = insp.vehicle
        const vehicleLabel = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : null
        return (
          <button
            key={insp.id}
            onClick={() => setSelectedId(insp.id)}
            className="w-full bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-teal-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                {vehicleLabel && <p className="text-sm font-semibold text-slate-900">{vehicleLabel}</p>}
                <p className="text-xs text-slate-500">
                  {format(new Date(insp.completed_at || insp.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </button>
        )
      })}
    </div>
  )
}

function InspectionReport({ token, inspectionId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState({})
  const [lightboxPhoto, setLightboxPhoto] = useState(null)

  useEffect(() => {
    setLoading(true)
    portalFetch(token, `/inspections/${inspectionId}`)
      .then(result => {
        setData(result)
        // Auto-expand categories with flagged items
        const expanded = {}
        for (const item of result.inspection?.inspection_items || []) {
          if (item.condition === 'needs_attention' || item.condition === 'urgent') {
            expanded[item.category] = true
          }
        }
        setExpandedCategories(expanded)
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [token, inspectionId])

  if (loading) return <LoadingCard />
  if (!data?.inspection) {
    return <EmptyState icon={AlertCircle} title="Not found" message="Could not load inspection report." />
  }

  const { inspection, summary } = data
  const items = inspection.inspection_items || []
  const vehicle = inspection.vehicle

  // Group items by category
  const categories = {}
  for (const item of items) {
    if (!categories[item.category]) categories[item.category] = []
    categories[item.category].push(item)
  }

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center">
            <ClipboardCheck className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Vehicle Inspection Report</h3>
            {vehicle && (
              <p className="text-xs text-slate-500">{vehicle.year} {vehicle.make} {vehicle.model}</p>
            )}
          </div>
        </div>
        {inspection.completed_at && (
          <p className="text-xs text-slate-400 mt-2">
            Completed {format(new Date(inspection.completed_at), 'MMM d, yyyy')}
          </p>
        )}
      </div>

      {/* Summary badges */}
      <div className="grid grid-cols-4 gap-2">
        {['good', 'fair', 'needs_attention', 'urgent'].map(key => {
          const style = CONDITION_STYLES[key]
          const Icon = style.icon
          const count = summary?.[key] || 0
          return (
            <div
              key={key}
              className={cn('rounded-xl border p-3 text-center', style.bg, count > 0 ? 'border-transparent' : 'border-slate-200 bg-white')}
            >
              <Icon className={cn('h-4 w-4 mx-auto mb-1', count > 0 ? style.text : 'text-slate-300')} />
              <p className={cn('text-lg font-bold', count > 0 ? style.text : 'text-slate-300')}>{count}</p>
              <p className={cn('text-[10px] font-medium', count > 0 ? style.text : 'text-slate-400')}>{style.label}</p>
            </div>
          )
        })}
      </div>

      {/* Category sections */}
      <div className="space-y-2">
        {Object.entries(categories).map(([category, catItems]) => {
          const expanded = expandedCategories[category]
          const hasFlagged = catItems.some(i => i.condition === 'needs_attention' || i.condition === 'urgent')
          return (
            <div key={category} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  <span className="text-sm font-semibold text-slate-700">{category}</span>
                  {hasFlagged && !expanded && (
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                  )}
                </div>
                <div className="flex gap-1">
                  {catItems.map((item, i) => (
                    <div key={i} className={cn('h-2 w-2 rounded-full', CONDITION_STYLES[item.condition]?.dot || 'bg-slate-300')} />
                  ))}
                </div>
              </button>

              {expanded && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {catItems.map(item => {
                    const style = CONDITION_STYLES[item.condition]
                    const Icon = style?.icon
                    const photos = item.inspection_photos || []
                    return (
                      <div key={item.id} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-700">{item.item_name}</span>
                          {style && (
                            <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', style.bg, style.text)}>
                              <Icon className="h-3 w-3" />
                              {style.label}
                            </span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-xs text-slate-500 mt-1">{item.notes}</p>
                        )}
                        {photos.length > 0 && (
                          <div className="flex gap-2 mt-2 overflow-x-auto">
                            {photos.map(photo => (
                              <button
                                key={photo.id}
                                onClick={() => setLightboxPhoto(photo.photo_url)}
                                className="flex-shrink-0"
                              >
                                <img
                                  src={photo.photo_url}
                                  alt={photo.caption || item.item_name}
                                  className="h-16 w-16 object-cover rounded-lg border border-slate-200"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightboxPhoto(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxPhoto}
            alt="Inspection photo"
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  )
}

// ── Shared components ──

function LoadingCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
    </div>
  )
}

function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
      <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-slate-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mt-1">{message}</p>
    </div>
  )
}
