import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addDays, subDays, isToday as isTodayFn } from 'date-fns'
import { getNextBusinessDay } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { appointments } from '@/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn, formatTime12Hour, formatCents, parseDateLocal } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  Columns,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Car,
  Wrench,
  ExternalLink,
  CheckCircle2,
  Play,
  AlertCircle,
  Zap,
  Gauge,
  Hammer,
  StickyNote,
  CalendarClock,
} from 'lucide-react'

// ── Status config ───────────────────────────────────────────────────────
const STATUS_CONFIG = {
  scheduled:    { label: 'Scheduled',    color: 'bg-blue-500',    border: 'border-l-blue-500',    bg: 'bg-blue-50',   text: 'text-blue-700' },
  confirmed:    { label: 'Confirmed',    color: 'bg-emerald-500', border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  checked_in:   { label: 'Checked In',   color: 'bg-cyan-500',    border: 'border-l-cyan-500',    bg: 'bg-cyan-50',    text: 'text-cyan-700' },
  in_progress:  { label: 'In Progress',  color: 'bg-amber-500',   border: 'border-l-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700' },
  checking_out: { label: 'Checking Out', color: 'bg-orange-500',  border: 'border-l-orange-500',  bg: 'bg-orange-50',  text: 'text-orange-700' },
  completed:    { label: 'Completed',    color: 'bg-slate-400',   border: 'border-l-slate-400',   bg: 'bg-slate-50',   text: 'text-slate-600' },
}

const STATUS_TRANSITIONS = {
  scheduled:   [{ status: 'confirmed', label: 'Confirm', icon: CheckCircle2 }],
  confirmed:   [{ status: 'checked_in', label: 'Check In', icon: User }],
  checked_in:  [{ status: 'in_progress', label: 'Start Service', icon: Play }],
  in_progress: [{ status: 'completed', label: 'Mark Complete', icon: CheckCircle2 }],
}

// ── Bay type icons ──────────────────────────────────────────────────────
const BAY_TYPE_ICONS = {
  quick_service:   Zap,
  general_service: Wrench,
  alignment:       Gauge,
  diagnostic:      AlertCircle,
  heavy_repair:    Hammer,
  express_lane:    Zap,
}

// ── Timeline constants ──────────────────────────────────────────────────
const OPEN_HOUR = 7
const CLOSE_HOUR = 17 // Display until 5 PM so appointments ending after 4 PM aren't clipped
const TOTAL_MINUTES = (CLOSE_HOUR - OPEN_HOUR) * 60
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR + 1 }, (_, i) => OPEN_HOUR + i)
const MIN_BLOCK_WIDTH = 7

function getPositionStyle(apt) {
  const [h, m] = (apt.scheduled_time || '07:00').split(':').map(Number)
  const minutesFromOpen = (h - OPEN_HOUR) * 60 + m
  const duration = apt.estimated_duration_minutes || 60
  const left = Math.max(0, (minutesFromOpen / TOTAL_MINUTES) * 100)
  const rawWidth = (duration / TOTAL_MINUTES) * 100
  const width = Math.max(Math.min(rawWidth, 100 - left), MIN_BLOCK_WIDTH)
  return { left: `${left}%`, width: `${width}%` }
}

function getEndTime(apt) {
  const [h, m] = (apt.scheduled_time || '07:00').split(':').map(Number)
  const totalMin = h * 60 + m + (apt.estimated_duration_minutes || 60)
  const eh = Math.floor(totalMin / 60)
  const em = totalMin % 60
  return formatTime12Hour(`${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`)
}

function getTechInitials(tech) {
  if (!tech) return null
  return `${(tech.first_name || '')[0] || ''}${(tech.last_name || '')[0] || ''}`.toUpperCase()
}

// ── Current time hook ───────────────────────────────────────────────────
function useCurrentTime() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])
  return now
}

function getCurrentTimePercent(now) {
  const h = now.getHours()
  const m = now.getMinutes()
  const minutesFromOpen = (h - OPEN_HOUR) * 60 + m
  if (minutesFromOpen < 0 || minutesFromOpen > TOTAL_MINUTES) return null
  return (minutesFromOpen / TOTAL_MINUTES) * 100
}

// ── Main component ──────────────────────────────────────────────────────
export default function BayView() {
  const [selectedDate, setSelectedDate] = useState(format(getNextBusinessDay(), 'yyyy-MM-dd'))
  const [selectedApt, setSelectedApt] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const now = useCurrentTime()

  const isViewingToday = isTodayFn(parseDateLocal(selectedDate))
  const timePercent = isViewingToday ? getCurrentTimePercent(now) : null

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', 'by-bay', selectedDate],
    queryFn: () => appointments.byBay(selectedDate),
    refetchInterval: 60000,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => appointments.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'by-bay', selectedDate] })
      queryClient.invalidateQueries({ queryKey: ['appointments', 'today'] })
      setSelectedApt(null)
      toast({ title: 'Status updated' })
    },
  })

  const navigateDate = (dir) => {
    const next = dir === 'prev' ? subDays(parseDateLocal(selectedDate), 1) : addDays(parseDateLocal(selectedDate), 1)
    setSelectedDate(format(next, 'yyyy-MM-dd'))
  }

  const goToday = () => setSelectedDate(format(getNextBusinessDay(), 'yyyy-MM-dd'))

  const allBays = data?.bays || []
  const unassigned = data?.unassigned || []
  // Only show bays that have appointments to reduce clutter
  const activeBays = allBays.filter(b => b.appointments.length > 0)

  // ── Compute stats ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    const allApts = [...allBays.flatMap(b => b.appointments), ...unassigned]
    const baysInUse = allBays.filter(b => b.appointments.length > 0).length
    const inProgress = allApts.filter(a => a.status === 'in_progress' || a.status === 'checking_out').length
    const completed = allApts.filter(a => a.status === 'completed').length
    return {
      total: data?.total_appointments || allApts.length,
      baysInUse,
      totalBays: allBays.length,
      inProgress,
      completed,
    }
  }, [data, allBays, unassigned])

  // ── Render helpers ──────────────────────────────────────────────────
  const renderAppointmentBlock = (apt) => {
    const style = getPositionStyle(apt)
    const serviceName = apt.appointment_services?.[0]?.service_name || 'Service'
    const customerName = apt.customer
      ? `${apt.customer.first_name || ''} ${apt.customer.last_name || ''}`.trim()
      : 'Unknown'
    const cfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG.scheduled
    const isShort = (apt.estimated_duration_minutes || 60) < 45
    const dimmed = statusFilter && apt.status !== statusFilter
    const initials = getTechInitials(apt.technician)

    return (
      <button
        key={apt.id}
        onClick={() => setSelectedApt(apt)}
        className={cn(
          'absolute top-1.5 bottom-1.5 rounded-md border-l-[3px] bg-white shadow-sm cursor-pointer overflow-hidden transition-all z-10',
          'hover:shadow-md hover:-translate-y-px',
          cfg.border,
          dimmed && 'opacity-25'
        )}
        style={style}
        title={`${customerName} — ${serviceName}\n${formatTime12Hour(apt.scheduled_time)} – ${getEndTime(apt)}`}
      >
        <div className="h-full px-2 py-1 flex flex-col justify-center min-w-0">
          {isShort ? (
            <span className="truncate text-[11px] font-semibold text-slate-800">{customerName}</span>
          ) : (
            <>
              <div className="flex items-center gap-1 min-w-0">
                <span className="truncate text-[11px] font-semibold text-slate-800">{customerName}</span>
                {initials && (
                  <span className={cn('shrink-0 h-4 w-4 rounded-full text-[8px] font-bold flex items-center justify-center text-white', cfg.color)}>
                    {initials}
                  </span>
                )}
              </div>
              <span className="truncate text-[10px] text-slate-500">{serviceName}</span>
              <span className="truncate text-[9px] text-slate-400">
                {formatTime12Hour(apt.scheduled_time)} – {getEndTime(apt)}
              </span>
            </>
          )}
        </div>
      </button>
    )
  }

  const renderTimeGrid = () => (
    <div className="absolute inset-0 flex pointer-events-none">
      {HOURS.map((hour, i) => (
        <div key={hour} className="flex-1 relative">
          {i > 0 && <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-100" />}
          <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-slate-100/70" />
        </div>
      ))}
    </div>
  )

  const renderNowLine = () => {
    if (timePercent == null) return null
    return (
      <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: `${timePercent}%` }}>
        <div className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white shadow" />
        <div className="absolute top-0 bottom-0 w-px bg-red-500/70" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 pl-14 sm:px-6 lg:pl-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Columns className="h-5 w-5 text-blue-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">Shop Floor</h1>
              <p className="text-xs text-slate-400">
                {format(parseDateLocal(selectedDate), 'EEEE, MMMM d, yyyy')}
                {isViewingToday && (
                  <span className="ml-2 inline-flex items-center gap-1 text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              onClick={() => navigateDate('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              onClick={goToday}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              onClick={() => navigateDate('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8 px-2 text-xs bg-slate-700 border border-slate-600 text-slate-200 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Appointments</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{stats.total}</p>
              </div>
              <CalendarClock className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Bays Active</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">
                  {stats.baysInUse}<span className="text-sm font-normal text-slate-400">/{stats.totalBays}</span>
                </p>
              </div>
              <Columns className="h-8 w-8 text-emerald-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">In Progress</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{stats.inProgress}</p>
              </div>
              <Play className="h-8 w-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-400 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Completed</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{stats.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-slate-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Status Filter Pills ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter(null)}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
            !statusFilter
              ? 'bg-slate-800 text-white border-slate-800'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          )}
        >
          All
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(statusFilter === key ? null : key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border',
              statusFilter === key
                ? cn(cfg.bg, cfg.text, 'border-current')
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', cfg.color)} />
            {cfg.label}
          </button>
        ))}
      </div>

      {/* ── Scheduling Board ──────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : activeBays.length === 0 && unassigned.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 py-16 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Wrench className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-base font-semibold text-slate-700">No appointments scheduled</p>
          <p className="text-sm text-slate-500 mt-1">
            {format(parseDateLocal(selectedDate), 'EEEE, MMMM d')} has a clear schedule
          </p>
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-xl border border-slate-200 overflow-hidden">
          {/* Time header */}
          <div className="flex border-b border-slate-200 bg-slate-50/80">
            <div className="w-36 lg:w-48 shrink-0 px-3 py-2.5 border-r border-slate-200">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Service Bay</span>
            </div>
            <div className="flex-1 relative flex">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="flex-1 text-center text-[10px] font-medium text-slate-400 py-2.5 border-l border-slate-200/60 first:border-l-0"
                >
                  {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </div>
              ))}
            </div>
          </div>

          {/* Bay rows */}
          {activeBays.map((bay, rowIdx) => {
            const BayIcon = BAY_TYPE_ICONS[bay.bay_type] || Wrench
            const aptCount = bay.appointments.length
            const firstTech = bay.appointments[0]?.technician
            return (
              <div key={bay.id} className={cn('flex border-b border-slate-100 last:border-b-0 h-20', rowIdx % 2 === 1 && 'bg-slate-50/40')}>
                <div className="w-36 lg:w-48 shrink-0 px-3 py-2 border-r border-slate-200 flex flex-col justify-center gap-0.5">
                  <div className="flex items-center gap-2">
                    <BayIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="text-sm font-semibold text-slate-800 truncate">{bay.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 capitalize pl-5.5">{bay.bay_type?.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-2 pl-5.5">
                    {firstTech && (
                      <span className="text-[10px] text-slate-500 truncate">
                        {firstTech.first_name} {(firstTech.last_name || '')[0]}.
                      </span>
                    )}
                    {aptCount > 0 && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                        {aptCount} job{aptCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex-1 relative">
                  {renderTimeGrid()}
                  {renderNowLine()}
                  {bay.appointments.map(renderAppointmentBlock)}
                </div>
              </div>
            )
          })}

          {/* Unassigned row */}
          {unassigned.length > 0 && (
            <div className="flex border-t-2 border-amber-200 h-20 bg-amber-50/30">
              <div className="w-36 lg:w-48 shrink-0 px-3 py-2 border-r border-slate-200 flex flex-col justify-center gap-0.5">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="text-sm font-semibold text-amber-700">Unassigned</span>
                </div>
                <span className="text-[10px] text-amber-500 pl-5.5">
                  {unassigned.length} appointment{unassigned.length !== 1 ? 's' : ''} need a bay
                </span>
              </div>
              <div className="flex-1 relative">
                {renderTimeGrid()}
                {renderNowLine()}
                {unassigned.map(renderAppointmentBlock)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Appointment Detail Dialog ─────────────────────────────────── */}
      <Dialog open={!!selectedApt} onOpenChange={(open) => !open && setSelectedApt(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Appointment Details
            </DialogTitle>
          </DialogHeader>
          {selectedApt && (() => {
            const cfg = STATUS_CONFIG[selectedApt.status] || STATUS_CONFIG.scheduled
            const transitions = STATUS_TRANSITIONS[selectedApt.status] || []
            const customerName = selectedApt.customer
              ? `${selectedApt.customer.first_name || ''} ${selectedApt.customer.last_name || ''}`.trim()
              : 'Unknown'
            return (
              <div className="space-y-4">
                {/* Status banner */}
                <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg', cfg.bg)}>
                  <span className={cn('h-2.5 w-2.5 rounded-full', cfg.color)} />
                  <span className={cn('text-sm font-medium', cfg.text)}>{cfg.label}</span>
                  <span className="text-xs text-slate-400 ml-auto">
                    {formatTime12Hour(selectedApt.scheduled_time)} – {getEndTime(selectedApt)}
                  </span>
                </div>

                {/* Customer */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{customerName}</p>
                    {selectedApt.customer?.phone && (
                      <p className="text-xs text-slate-500">{selectedApt.customer.phone}</p>
                    )}
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Duration</p>
                    <p className="font-medium">{selectedApt.estimated_duration_minutes || 60} min</p>
                  </div>
                  {selectedApt.technician && (
                    <div>
                      <p className="text-xs text-slate-500">Technician</p>
                      <p className="font-medium text-sm">
                        {selectedApt.technician.first_name} {selectedApt.technician.last_name}
                      </p>
                    </div>
                  )}
                </div>

                {/* Vehicle */}
                {selectedApt.vehicle && (
                  <div className="flex items-center gap-2 text-sm bg-slate-50 px-3 py-2 rounded-lg">
                    <Car className="h-4 w-4 text-slate-400" />
                    <span className="font-medium">
                      {selectedApt.vehicle.year} {selectedApt.vehicle.make} {selectedApt.vehicle.model}
                    </span>
                  </div>
                )}

                {/* Services */}
                {selectedApt.appointment_services?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5">Services</p>
                    <div className="space-y-1">
                      {selectedApt.appointment_services.map((svc, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <Wrench className="h-3.5 w-3.5 text-slate-400" />
                            {svc.service_name}
                          </span>
                          {svc.quoted_price && (
                            <span className="text-slate-500">{formatCents(svc.quoted_price)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedApt.internal_notes && (
                  <div className="flex items-start gap-2 text-sm bg-amber-50 px-3 py-2 rounded-lg">
                    <StickyNote className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-amber-800 text-xs leading-relaxed">{selectedApt.internal_notes}</p>
                  </div>
                )}

                {/* Status actions */}
                {transitions.length > 0 && (
                  <div className="flex gap-2">
                    {transitions.map(({ status, label, icon: Icon }) => (
                      <Button
                        key={status}
                        size="sm"
                        className="flex-1"
                        disabled={statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ id: selectedApt.id, status })}
                      >
                        <Icon className="h-4 w-4 mr-1.5" />
                        {label}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Link to detail */}
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/appointments/${selectedApt.id}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Full Details
                  </Link>
                </Button>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
