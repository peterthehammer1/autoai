import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { 
  format, 
  addDays, 
  addMonths, 
  subMonths,
  isToday, 
  isTomorrow, 
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from 'date-fns'
import { appointments } from '@/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Car,
  CalendarDays,
  Grid3X3,
} from 'lucide-react'
import {
  cn,
  formatTime12Hour,
  formatDuration,
  getStatusColor,
  getNextBusinessDay,
  parseDateLocal,
} from '@/lib/utils'
import NewAppointmentModal from '@/components/NewAppointmentModal'
import PhoneNumber from '@/components/PhoneNumber'
import CarImage from '@/components/CarImage'
import { useAppointmentsTour } from '@/hooks/use-appointments-tour'

// Post-it color palette for appointment cards
const postItColors = [
  { bg: 'bg-violet-100', border: 'border-l-violet-400', text: 'text-violet-800' },
  { bg: 'bg-emerald-100', border: 'border-l-emerald-400', text: 'text-emerald-800' },
  { bg: 'bg-sky-100', border: 'border-l-sky-400', text: 'text-sky-800' },
  { bg: 'bg-amber-100', border: 'border-l-amber-400', text: 'text-amber-800' },
  { bg: 'bg-cyan-100', border: 'border-l-cyan-400', text: 'text-cyan-800' },
  { bg: 'bg-rose-100', border: 'border-l-rose-400', text: 'text-rose-800' },
]

const getPostItColor = (apt) => {
  const name = `${apt.customer?.first_name || ''}${apt.customer?.last_name || ''}`
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return postItColors[hash % postItColors.length]
}

const parseTimeToHours = (timeStr) => {
  if (!timeStr) return 8
  const [h, m] = timeStr.split(':').map(Number)
  return h + m / 60
}

const formatEndTime = (startTime, durationMinutes) => {
  if (!startTime) return ''
  const [h, m] = startTime.split(':').map(Number)
  const totalMins = h * 60 + m + (durationMinutes || 60)
  const endH = Math.floor(totalMins / 60)
  const endM = totalMins % 60
  return formatTime12Hour(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`)
}

const START_HOUR = 7
const END_HOUR = 19
const HOUR_HEIGHT = 80
const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

export default function Appointments() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('calendar')
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  
  // Calendar view state — default to day view on mobile
  const [calendarView, setCalendarView] = useState(
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'day' : 'week'
  )
  const businessDay = getNextBusinessDay()
  const [calendarMonth, setCalendarMonth] = useState(businessDay)
  const [weekStart, setWeekStart] = useState(startOfWeek(businessDay, { weekStartsOn: 1 }))
  const [calendarDay, setCalendarDay] = useState(format(businessDay, 'yyyy-MM-dd'))

  const dateFilter = searchParams.get('date') || format(businessDay, 'yyyy-MM-dd')
  const statusFilter = searchParams.get('status') || ''

  // Fetch upcoming appointments
  const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
    queryKey: ['appointments', 'upcoming'],
    queryFn: () => appointments.upcoming(100),
    enabled: activeTab === 'upcoming',
  })

  // Fetch appointments for specific date (By Date tab)
  const { data: dateData, isLoading: dateLoading } = useQuery({
    queryKey: ['appointments', dateFilter, statusFilter],
    queryFn: () => {
      const params = { date: dateFilter }
      if (statusFilter) params.status = statusFilter
      return appointments.list(params)
    },
    enabled: activeTab === 'by-date',
  })

  // Compute calendar query range based on view
  const calViewRange = calendarView === 'week'
    ? { start: format(weekStart, 'yyyy-MM-dd'), end: format(addDays(weekStart, 6), 'yyyy-MM-dd') }
    : calendarView === 'day'
    ? { start: calendarDay, end: calendarDay }
    : { start: format(startOfMonth(calendarMonth), 'yyyy-MM-dd'), end: format(endOfMonth(calendarMonth), 'yyyy-MM-dd') }

  // Fetch appointments for calendar view
  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: ['appointments', 'calendar', calViewRange.start, calViewRange.end],
    queryFn: () => appointments.list({ start_date: calViewRange.start, end_date: calViewRange.end, limit: 200 }),
    enabled: activeTab === 'calendar',
  })

  useAppointmentsTour(!calendarLoading && !upcomingLoading)

  // Group calendar appointments by date
  const appointmentsByDate = {}
  if (calendarData?.appointments) {
    calendarData.appointments.forEach(apt => {
      if (!appointmentsByDate[apt.scheduled_date]) {
        appointmentsByDate[apt.scheduled_date] = []
      }
      appointmentsByDate[apt.scheduled_date].push(apt)
    })
  }

  // Week days
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  })

  // Generate month calendar days (Monday start)
  const monthStart = startOfMonth(calendarMonth)
  const monthEnd = endOfMonth(calendarMonth)
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  })

  const handleDateChange = (days) => {
    const newDate = addDays(parseDateLocal(dateFilter), days)
    setSearchParams({ date: format(newDate, 'yyyy-MM-dd'), status: statusFilter })
  }

  const handleStatusChange = (status) => {
    setSearchParams({ date: dateFilter, status: status === 'all' ? '' : status })
  }

  const handleToday = () => {
    setSearchParams({ date: format(getNextBusinessDay(), 'yyyy-MM-dd'), status: statusFilter })
  }

  const formatDateLabel = (dateStr) => {
    const date = parseDateLocal(dateStr)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'EEEE, MMMM d')
  }

  // Navigation helpers
  const navigateWeek = (dir) => setWeekStart(addDays(weekStart, dir * 7))
  const navigateDay = (dir) => {
    setCalendarDay(format(addDays(parseDateLocal(calendarDay), dir), 'yyyy-MM-dd'))
  }
  const goToToday = () => {
    const bd = getNextBusinessDay()
    setWeekStart(startOfWeek(bd, { weekStartsOn: 1 }))
    setCalendarDay(format(bd, 'yyyy-MM-dd'))
    setCalendarMonth(bd)
  }

  // Renders a single post-it appointment card (used in week + day views)
  const renderPostItCard = (apt, style = {}) => {
    const color = getPostItColor(apt)
    const serviceName = apt.appointment_services?.[0]?.service_name || 'Service'
    const endTime = formatEndTime(apt.scheduled_time, apt.estimated_duration_minutes)
    
    return (
      <Link
        key={apt.id}
        to={`/appointments/${apt.id}`}
        className={cn(
          'absolute left-1 right-1 rounded-lg border-l-[4px] px-2 py-1.5 overflow-hidden transition-all hover:shadow-md hover:opacity-90 cursor-pointer',
          color.bg, color.border, color.text
        )}
        style={style}
      >
        <p className="text-xs font-semibold truncate">
          {apt.customer?.first_name} {apt.customer?.last_name}
        </p>
        <p className="text-[10px] truncate opacity-70">
          {serviceName}
        </p>
        <p className="text-[10px] opacity-60">
          {formatTime12Hour(apt.scheduled_time)} - {endTime}
        </p>
      </Link>
    )
  }

  // Calendar navigation header label
  const calendarNavLabel = calendarView === 'week'
    ? `${format(weekStart, 'MMM d')} — ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
    : calendarView === 'day'
    ? format(parseISO(calendarDay), 'EEEE, MMMM d, yyyy')
    : format(calendarMonth, 'MMMM yyyy')

  return (
    <div className="space-y-4">
      {/* Page Header - Dark Theme */}
      <div data-tour="appts-header" className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 pl-14 sm:px-6 lg:pl-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">Appointments</h1>
              <p className="text-xs text-slate-400">Manage scheduled appointments</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList data-tour="appts-tabs" className="w-full sm:w-auto bg-slate-100 p-1">
            <TabsTrigger value="upcoming" className="flex-1 sm:flex-none py-2.5 data-[state=active]:bg-white data-[state=active]:text-slate-800 text-slate-600">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex-1 sm:flex-none py-2.5 data-[state=active]:bg-white data-[state=active]:text-slate-800 text-slate-600">
              Calendar
            </TabsTrigger>
            <TabsTrigger value="by-date" className="flex-1 sm:flex-none py-2.5 data-[state=active]:bg-white data-[state=active]:text-slate-800 text-slate-600">
              By Date
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Upcoming Appointments Tab */}
        <TabsContent value="upcoming" className="mt-4 space-y-4">
          {upcomingLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white shadow-lg border-0 rounded-lg p-4">
                  <div className="h-20 animate-pulse bg-slate-100 rounded-lg" />
                </div>
              ))}
            </div>
          ) : !upcomingData?.appointments?.length ? (
            <div className="bg-white shadow-lg border-0 rounded-lg p-12 text-center">
              <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 p-5 mb-4 shadow-inner mx-auto w-fit">
                <Calendar className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="font-semibold text-slate-700 text-base mb-1">No Upcoming Appointments</h3>
              <p className="text-sm text-slate-500">There are no scheduled appointments.</p>
            </div>
          ) : (
            Object.entries(upcomingData.by_date || {}).map(([date, apts]) => (
              <div key={date} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 flex-col items-center justify-center rounded-lg",
                    isToday(parseISO(date)) ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white" : "bg-slate-100 text-slate-600"
                  )}>
                    <span className="text-[10px] font-medium uppercase">
                      {format(parseISO(date), 'MMM')}
                    </span>
                    <span className="text-sm font-semibold leading-none">
                      {format(parseISO(date), 'd')}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-800">{formatDateLabel(date)}</h3>
                    <p className="text-xs text-slate-500">
                      {apts.length} appointment{apts.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="bg-white shadow-lg border-0 rounded-lg overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {apts.map((apt, index) => (
                      <Link
                        key={apt.id}
                        to={`/appointments/${apt.id}`}
                        className={cn(
                          "block p-3 hover:bg-slate-50 rounded-lg transition-colors group",
                          index % 2 === 1 && "bg-slate-50/50"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-14 flex-col items-center justify-center rounded bg-slate-100 shrink-0">
                            <span className="text-sm font-semibold text-slate-700">
                              {formatTime12Hour(apt.scheduled_time).split(' ')[0]}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {formatTime12Hour(apt.scheduled_time).split(' ')[1]}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="text-sm font-medium text-slate-800 group-hover:text-blue-700">
                                {apt.customer?.first_name} {apt.customer?.last_name}
                              </span>
                              <span className={cn("text-xs px-2 py-0.5 rounded capitalize shrink-0", getStatusColor(apt.display_status || apt.status))}>
                                {(apt.display_status || apt.status).replace('_', ' ')}
                              </span>
                            </div>
                            {apt.vehicle && (
                              <p className="text-xs text-slate-500 mb-1">
                                {apt.vehicle.year} {apt.vehicle.make} {apt.vehicle.model}
                              </p>
                            )}
                            <p className="text-xs text-slate-500 truncate">
                              {apt.appointment_services?.map((s) => s.service_name).join(', ') || 'Service'}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(apt.estimated_duration_minutes)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* Calendar View Tab */}
        <TabsContent value="calendar" className="mt-4">
          <div data-tour="appts-calendar" className="bg-white shadow-lg border-0 rounded-lg overflow-hidden">
            {/* Calendar Header: Navigation + View Toggle */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={goToToday}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    if (calendarView === 'week') navigateWeek(-1)
                    else if (calendarView === 'day') navigateDay(-1)
                    else setCalendarMonth(subMonths(calendarMonth, 1))
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    if (calendarView === 'week') navigateWeek(1)
                    else if (calendarView === 'day') navigateDay(1)
                    else setCalendarMonth(addMonths(calendarMonth, 1))
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <h2 className="text-sm sm:text-base font-semibold text-slate-800 ml-1">
                  {calendarNavLabel}
                </h2>
              </div>

              <div data-tour="appts-view-toggle" className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                {['week', 'day', 'month'].map((view) => (
                  <button
                    key={view}
                    onClick={() => setCalendarView(view)}
                    className={cn(
                      'px-3 py-2 text-xs font-medium rounded-md transition-colors capitalize',
                      view === 'week' && 'hidden sm:block',
                      calendarView === view
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    {view === 'week' ? 'Week' : view === 'day' ? 'Day' : 'Month'}
                  </button>
                ))}
              </div>
            </div>

            {/* ===== WEEK VIEW ===== */}
            {calendarView === 'week' && (
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Day column headers */}
                  <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50/50">
                    <div />
                    {weekDays.map((day) => (
                      <div
                        key={format(day, 'yyyy-MM-dd')}
                        className={cn(
                          'text-center py-3 border-l border-slate-200',
                          isToday(day) && 'bg-indigo-50/50'
                        )}
                      >
                        <p className="text-xs font-medium text-slate-500 uppercase">{format(day, 'EEE')}</p>
                        <p className={cn(
                          'text-xl font-semibold mt-0.5',
                          isToday(day) ? 'text-indigo-600' : 'text-slate-800'
                        )}>
                          {format(day, 'd')}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Time grid */}
                  <div className="grid grid-cols-[48px_repeat(7,1fr)] relative">
                    {/* Time gutter */}
                    <div>
                      {hours.map((hour) => (
                        <div key={hour} className="relative border-b border-slate-100" style={{ height: HOUR_HEIGHT }}>
                          <span className="absolute -top-2.5 right-1 text-[10px] text-slate-400 font-medium">
                            {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Day columns */}
                    {weekDays.map((day) => {
                      const dateKey = format(day, 'yyyy-MM-dd')
                      const dayApts = appointmentsByDate[dateKey] || []

                      return (
                        <div
                          key={dateKey}
                          className={cn(
                            'relative border-l border-slate-200',
                            isToday(day) && 'bg-indigo-50/20'
                          )}
                          style={{ height: hours.length * HOUR_HEIGHT }}
                        >
                          {/* Hour grid lines */}
                          {hours.map((hour, i) => (
                            <div
                              key={hour}
                              className="absolute w-full border-b border-slate-100"
                              style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                            />
                          ))}

                          {/* Appointment cards */}
                          {dayApts.map((apt) => {
                            const startH = parseTimeToHours(apt.scheduled_time)
                            const duration = apt.estimated_duration_minutes || 60
                            const top = Math.max((startH - START_HOUR) * HOUR_HEIGHT, 0)
                            const height = Math.max((duration / 60) * HOUR_HEIGHT, 40)

                            return renderPostItCard(apt, { top, height })
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ===== DAY VIEW ===== */}
            {calendarView === 'day' && (
              <div className="overflow-x-auto">
                <div className="min-w-[400px]">
                  {/* Day header */}
                  <div className="grid grid-cols-[60px_1fr] border-b border-slate-200 bg-slate-50/50">
                    <div />
                    <div className={cn(
                      'text-center py-3 border-l border-slate-200',
                      isToday(parseISO(calendarDay)) && 'bg-indigo-50/50'
                    )}>
                      <p className="text-xs font-medium text-slate-500 uppercase">
                        {format(parseISO(calendarDay), 'EEEE')}
                      </p>
                      <p className={cn(
                        'text-xl font-semibold mt-0.5',
                        isToday(parseISO(calendarDay)) ? 'text-indigo-600' : 'text-slate-800'
                      )}>
                        {format(parseISO(calendarDay), 'MMMM d')}
                      </p>
                    </div>
                  </div>

                  {/* Time grid */}
                  <div className="grid grid-cols-[60px_1fr] relative">
                    {/* Time gutter */}
                    <div>
                      {hours.map((hour) => (
                        <div key={hour} className="relative border-b border-slate-100" style={{ height: HOUR_HEIGHT }}>
                          <span className="absolute -top-2.5 right-2 text-[11px] text-slate-400 font-medium">
                            {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Single day column */}
                    <div
                      className={cn(
                        'relative border-l border-slate-200',
                        isToday(parseISO(calendarDay)) && 'bg-indigo-50/20'
                      )}
                      style={{ height: hours.length * HOUR_HEIGHT }}
                    >
                      {/* Hour grid lines */}
                      {hours.map((hour, i) => (
                        <div
                          key={hour}
                          className="absolute w-full border-b border-slate-100"
                          style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                        />
                      ))}

                      {/* Appointment cards */}
                      {(appointmentsByDate[calendarDay] || []).map((apt) => {
                        const startH = parseTimeToHours(apt.scheduled_time)
                        const duration = apt.estimated_duration_minutes || 60
                        const top = Math.max((startH - START_HOUR) * HOUR_HEIGHT, 0)
                        const height = Math.max((duration / 60) * HOUR_HEIGHT, 40)

                        return renderPostItCard(apt, { top, height })
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== MONTH VIEW ===== */}
            {calendarView === 'month' && (
              <>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7">
                  {/* Day Headers */}
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-2 sm:py-3 border-b border-slate-200 bg-slate-50"
                    >
                      <span className="hidden sm:inline">{day}</span>
                      <span className="sm:hidden">{day.charAt(0)}</span>
                    </div>
                  ))}

                  {/* Calendar Days */}
                  {calendarDays.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd')
                    const dayAppointments = appointmentsByDate[dateKey] || []
                    const isCurrentMonth = isSameMonth(day, calendarMonth)
                    const isCurrentDay = isToday(day)
                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
                    const maxVisible = isMobile ? 1 : 3

                    return (
                      <div
                        key={dateKey}
                        className={cn(
                          'min-h-[90px] sm:min-h-[150px] p-1 sm:p-2 border-b border-r border-slate-200 text-left flex flex-col',
                          !isCurrentMonth && 'bg-slate-50/50',
                          isCurrentDay && 'bg-indigo-50/30'
                        )}
                      >
                        <span className={cn(
                          'text-sm sm:text-xl font-light mb-0.5 sm:mb-1',
                          isCurrentMonth ? 'text-slate-400' : 'text-slate-300',
                          isCurrentDay && 'text-indigo-500 font-normal'
                        )}>
                          {format(day, 'd')}
                        </span>
                        
                        {dayAppointments.length > 0 && (
                          <div className="flex-1 space-y-1 min-w-0">
                            {dayAppointments.slice(0, maxVisible).map((apt) => {
                              const color = getPostItColor(apt)
                              return (
                                <Link
                                  key={apt.id}
                                  to={`/appointments/${apt.id}`}
                                  className={cn(
                                    'block rounded-md border-l-[3px] px-1.5 sm:px-2 py-0.5 sm:py-1 hover:shadow-sm transition-all truncate',
                                    color.bg, color.border, color.text
                                  )}
                                >
                                  <span className="text-xs font-semibold truncate block">
                                    <span className="hidden sm:inline">
                                      {apt.customer?.first_name} {apt.customer?.last_name}
                                    </span>
                                    <span className="sm:hidden">
                                      {apt.customer?.first_name}
                                    </span>
                                  </span>
                                  <span className="text-[10px] sm:text-xs opacity-60 truncate block hidden sm:block">
                                    {formatTime12Hour(apt.scheduled_time)}
                                  </span>
                                </Link>
                              )
                            })}
                            {dayAppointments.length > maxVisible && (
                              <button
                                className="text-xs text-slate-400 hover:text-indigo-600 px-1.5 py-0.5 transition-colors"
                                onClick={() => {
                                  setCalendarView('day')
                                  setCalendarDay(dateKey)
                                }}
                              >
                                +{dayAppointments.length - maxVisible} more
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* By Date Tab */}
        <TabsContent value="by-date" className="mt-4 space-y-4">
          {/* Date Navigation */}
          <div className="bg-white shadow-lg border-0 rounded-lg p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => handleDateChange(-1)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button variant="ghost" onClick={handleToday} className="h-10 px-3 text-sm">
                  Today
                </Button>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) =>
                    setSearchParams({ date: e.target.value, status: statusFilter })
                  }
                  className="flex-1 sm:w-[140px] sm:flex-none h-10 text-sm border-slate-300"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => handleDateChange(1)}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              <Select value={statusFilter || 'all'} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full sm:w-[140px] h-10 text-sm border-slate-300">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="checked_in">Checked In</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Header */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 flex-col items-center justify-center rounded-lg",
              isToday(parseDateLocal(dateFilter)) ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white" : "bg-slate-100 text-slate-600"
            )}>
              <span className="text-[10px] font-medium uppercase">
                {format(parseDateLocal(dateFilter), 'MMM')}
              </span>
              <span className="text-sm font-semibold leading-none">
                {format(parseDateLocal(dateFilter), 'd')}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-800">
                {format(parseDateLocal(dateFilter), 'EEEE, MMMM d, yyyy')}
              </h3>
              <p className="text-xs text-slate-500">
                {dateData?.appointments?.length || 0} appointments
              </p>
            </div>
          </div>

          {/* Appointments Table */}
          <div className="bg-white shadow-lg border-0 rounded-lg overflow-hidden">
            {dateLoading ? (
              <div className="p-6">
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse bg-slate-100 rounded-lg" />
                  ))}
                </div>
              </div>
            ) : !dateData?.appointments?.length ? (
              <div className="p-12 text-center">
                <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 p-5 mb-4 shadow-inner mx-auto w-fit">
                  <Calendar className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="font-semibold text-slate-700 text-base mb-1">No Appointments</h3>
                <p className="text-sm text-slate-500">No appointments scheduled for this date.</p>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {dateData.appointments.map((apt, index) => (
                    <Link
                      key={apt.id}
                      to={`/appointments/${apt.id}`}
                      className={cn(
                        "block p-3 hover:bg-slate-50 rounded-lg group",
                        index % 2 === 1 && "bg-slate-50/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-14 flex-col items-center justify-center rounded bg-slate-100 shrink-0">
                          <span className="text-sm font-semibold text-slate-700">
                            {formatTime12Hour(apt.scheduled_time).split(' ')[0]}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {formatTime12Hour(apt.scheduled_time).split(' ')[1]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-800 group-hover:text-blue-700 truncate">
                              {apt.customer?.first_name} {apt.customer?.last_name}
                            </p>
                            <span className={cn("text-xs px-1.5 py-0.5 rounded capitalize shrink-0", getStatusColor(apt.display_status || apt.status))}>
                              {(apt.display_status || apt.status).replace('_', ' ')}
                            </span>
                          </div>
                          {apt.vehicle && (
                            <p className="text-xs text-slate-500 truncate">{apt.vehicle.year} {apt.vehicle.make} {apt.vehicle.model}</p>
                          )}
                          <p className="text-xs text-slate-500 truncate">
                            {apt.appointment_services?.map((s) => s.service_name).join(', ')}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Desktop Table View */}
                <Table className="hidden sm:table">
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-24 text-xs font-medium text-slate-600">Time</TableHead>
                      <TableHead className="text-xs font-medium text-slate-600">Customer</TableHead>
                      <TableHead className="text-xs font-medium text-slate-600">Vehicle</TableHead>
                      <TableHead className="text-xs font-medium text-slate-600">Services</TableHead>
                      <TableHead className="text-xs font-medium text-slate-600">Technician</TableHead>
                      <TableHead className="w-24 text-xs font-medium text-slate-600">Duration</TableHead>
                      <TableHead className="w-28 text-xs font-medium text-slate-600 text-right">Status</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dateData.appointments.map((apt, index) => (
                      <TableRow key={apt.id} className={cn("hover:bg-slate-50 group", index % 2 === 1 && "bg-slate-50/50")}>
                        <TableCell className="text-sm text-slate-700">
                          {formatTime12Hour(apt.scheduled_time)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-slate-800 group-hover:text-blue-700">
                              {apt.customer?.first_name} {apt.customer?.last_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              <PhoneNumber phone={apt.customer?.phone} email={apt.customer?.email} />
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {apt.vehicle ? (
                            <span className="text-sm text-slate-700">{apt.vehicle.year} {apt.vehicle.make} {apt.vehicle.model}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate text-sm text-slate-600">
                            {apt.appointment_services?.map((s) => s.service_name).join(', ')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {apt.technician ? (
                            <div>
                              <p className="text-sm text-slate-700">{apt.technician.first_name} {apt.technician.last_name}</p>
                              {apt.technician.skill_level && (
                                <p className="text-xs text-slate-400 capitalize">{apt.technician.skill_level}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-700">
                            {formatDuration(apt.estimated_duration_minutes)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn("text-xs px-2 py-0.5 rounded capitalize", getStatusColor(apt.display_status || apt.status))}>
                            {(apt.display_status || apt.status).replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild className="text-xs">
                            <Link to={`/appointments/${apt.id}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Appointment Modal */}
      <NewAppointmentModal
        open={isNewModalOpen}
        onOpenChange={setIsNewModalOpen}
        onSuccess={(appointment) => {
          navigate(`/appointments/${appointment.id}`)
        }}
      />
    </div>
  )
}
