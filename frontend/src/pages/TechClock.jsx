import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import { technicians, workOrders } from '@/api'
import { Button } from '@/components/ui/button'
import { cn, formatCents } from '@/lib/utils'
import {
  Clock,
  Play,
  Square,
  Car,
  User,
  Wrench,
  ChevronDown,
  Coffee,
  BookOpen,
  Pause,
  Phone,
  Timer,
} from 'lucide-react'

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function LiveTimer({ clockIn }) {
  const [elapsed, setElapsed] = useState('')
  useEffect(() => {
    const update = () => {
      const ms = Date.now() - new Date(clockIn).getTime()
      const totalMin = Math.floor(ms / 60000)
      const h = Math.floor(totalMin / 60)
      const m = totalMin % 60
      const s = Math.floor((ms % 60000) / 1000)
      setElapsed(h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [clockIn])
  return <span className="font-mono text-2xl font-bold text-teal-700">{elapsed}</span>
}

export default function TechClock() {
  const queryClient = useQueryClient()
  const [selectedTechId, setSelectedTechId] = useState(
    () => localStorage.getItem('tech_clock_last_tech_id') || ''
  )

  // Persist tech selection
  useEffect(() => {
    if (selectedTechId) {
      localStorage.setItem('tech_clock_last_tech_id', selectedTechId)
    }
  }, [selectedTechId])

  // Fetch technicians
  const { data: techData, isLoading: techsLoading } = useQuery({
    queryKey: ['technicians'],
    queryFn: technicians.list,
  })
  const techList = techData?.technicians || []
  const selectedTech = techList.find(t => t.id === selectedTechId)

  // Active entry for selected tech
  const { data: activeData, isLoading: activeLoading } = useQuery({
    queryKey: ['tech-active-entry', selectedTechId],
    queryFn: () => technicians.activeEntry(selectedTechId),
    enabled: !!selectedTechId,
    refetchInterval: 10000,
  })
  const activeEntry = activeData?.entry

  // In-progress work orders
  const { data: woData } = useQuery({
    queryKey: ['work-orders-in-progress'],
    queryFn: () => workOrders.list({ status: 'in_progress', limit: 20 }),
    enabled: !!selectedTechId,
  })
  const activeWOs = woData?.work_orders || []

  // Today's entries for selected tech
  const today = new Date().toISOString().split('T')[0]
  const { data: todayData } = useQuery({
    queryKey: ['tech-today-entries', selectedTechId, today],
    queryFn: () => technicians.timeEntries(selectedTechId, { start_date: today, end_date: today, limit: 10 }),
    enabled: !!selectedTechId,
  })
  const todayEntries = todayData?.time_entries || []

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: ({ techId, data }) => technicians.clockIn(techId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tech-active-entry'] })
      queryClient.invalidateQueries({ queryKey: ['tech-today-entries'] })
    },
  })

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: ({ techId, data }) => technicians.clockOut(techId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tech-active-entry'] })
      queryClient.invalidateQueries({ queryKey: ['tech-today-entries'] })
    },
  })

  const handleClockIn = (workOrderId, entryType = 'labor') => {
    const data = { entry_type: entryType }
    if (workOrderId) data.work_order_id = workOrderId
    clockInMutation.mutate({ techId: selectedTechId, data })
  }

  const handleClockOut = () => {
    if (!activeEntry) return
    clockOutMutation.mutate({
      techId: selectedTechId,
      data: { entry_id: activeEntry.id },
    })
  }

  // Today totals
  const todayTotalMinutes = todayEntries
    .filter(e => e.duration_minutes)
    .reduce((sum, e) => sum + e.duration_minutes, 0)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-teal-600" />
              <h1 className="text-base font-bold text-slate-900">Tech Clock</h1>
            </div>
            <p className="text-xs text-slate-500">
              {format(new Date(), 'EEEE, MMM d')}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Tech Selector */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400 block mb-2">
            Technician
          </label>
          {techsLoading ? (
            <div className="h-10 bg-slate-100 animate-pulse rounded-lg" />
          ) : (
            <div className="relative">
              <select
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-base font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">Select your name...</option>
                {techList.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.first_name} {t.last_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>

        {selectedTechId && !activeLoading && (
          <>
            {/* Active Entry Banner */}
            {activeEntry ? (
              <div className={cn(
                'rounded-xl border-2 p-4 space-y-3',
                activeEntry.entry_type === 'labor'
                  ? 'bg-teal-50 border-teal-300'
                  : 'bg-amber-50 border-amber-300'
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Clock className="h-5 w-5 text-teal-600" />
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">Clocked In</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    since {format(new Date(activeEntry.clock_in), 'h:mm a')}
                  </span>
                </div>

                <div className="text-center py-2">
                  <LiveTimer clockIn={activeEntry.clock_in} />
                </div>

                {activeEntry.work_order && (
                  <div className="bg-white/60 rounded-lg px-3 py-2">
                    <p className="text-sm font-medium text-slate-700">
                      WO-{1000 + activeEntry.work_order.work_order_number}
                    </p>
                    {activeEntry.work_order.vehicle && (
                      <p className="text-xs text-slate-500">
                        {activeEntry.work_order.vehicle.year} {activeEntry.work_order.vehicle.make} {activeEntry.work_order.vehicle.model}
                      </p>
                    )}
                    {activeEntry.work_order.customer && (
                      <p className="text-xs text-slate-400">
                        {activeEntry.work_order.customer.first_name} {activeEntry.work_order.customer.last_name}
                      </p>
                    )}
                  </div>
                )}

                {activeEntry.entry_type !== 'labor' && (
                  <p className="text-xs text-amber-700 font-medium text-center capitalize">
                    {activeEntry.entry_type}
                  </p>
                )}

                <Button
                  onClick={handleClockOut}
                  disabled={clockOutMutation.isPending}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 text-base"
                >
                  <Square className="h-4 w-4 mr-2" />
                  {clockOutMutation.isPending ? 'Clocking out...' : 'Clock Out'}
                </Button>
              </div>
            ) : (
              <>
                {/* Work Orders to clock into */}
                {activeWOs.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Active Work Orders
                    </h3>
                    {activeWOs.map(wo => {
                      const vehicle = wo.vehicle
                      const customer = wo.customer
                      return (
                        <button
                          key={wo.id}
                          onClick={() => handleClockIn(wo.id)}
                          disabled={clockInMutation.isPending}
                          className="w-full bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-teal-300 hover:bg-teal-50/30 transition-colors active:bg-teal-50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900">
                                {wo.work_order_display}
                              </p>
                              {vehicle && (
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Car className="h-3 w-3" />
                                  {vehicle.year} {vehicle.make} {vehicle.model}
                                </p>
                              )}
                              {customer && (
                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                  <User className="h-3 w-3" />
                                  {customer.first_name} {customer.last_name}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              <Play className="h-5 w-5 text-teal-600" />
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {activeWOs.length === 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                    <Wrench className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No active work orders</p>
                    <p className="text-xs text-slate-400 mt-1">Work orders must be "In Progress" to clock in</p>
                  </div>
                )}

                {/* Non-WO clock options */}
                <div className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Other
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleClockIn(null, 'training')}
                      disabled={clockInMutation.isPending}
                      className="bg-white rounded-xl border border-slate-200 p-3 text-center hover:border-blue-300 hover:bg-blue-50/30 transition-colors active:bg-blue-50"
                    >
                      <BookOpen className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                      <span className="text-xs font-medium text-slate-600">Training</span>
                    </button>
                    <button
                      onClick={() => handleClockIn(null, 'break')}
                      disabled={clockInMutation.isPending}
                      className="bg-white rounded-xl border border-slate-200 p-3 text-center hover:border-amber-300 hover:bg-amber-50/30 transition-colors active:bg-amber-50"
                    >
                      <Coffee className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                      <span className="text-xs font-medium text-slate-600">Break</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Today's Log */}
            {todayEntries.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Today's Log
                  </h3>
                  <span className="text-xs font-medium text-slate-500">
                    Total: {formatDuration(todayTotalMinutes)}
                  </span>
                </div>
                <div className="divide-y divide-slate-50">
                  {todayEntries.map(entry => (
                    <div key={entry.id} className="px-4 py-2.5 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700">
                          {entry.work_order
                            ? `WO-${1000 + entry.work_order.work_order_number}`
                            : <span className="capitalize">{entry.entry_type}</span>
                          }
                        </p>
                        <p className="text-xs text-slate-400">
                          {format(new Date(entry.clock_in), 'h:mm a')}
                          {entry.clock_out && ` – ${format(new Date(entry.clock_out), 'h:mm a')}`}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        {entry.clock_out ? (
                          <span className="text-sm font-medium text-slate-700">
                            {formatDuration(entry.duration_minutes)}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-teal-600 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto px-4 py-6 text-center">
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
