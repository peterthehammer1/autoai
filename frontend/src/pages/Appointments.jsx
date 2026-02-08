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
} from '@/lib/utils'
import NewAppointmentModal from '@/components/NewAppointmentModal'
import PhoneNumber from '@/components/PhoneNumber'
import CarImage from '@/components/CarImage'

export default function Appointments() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('calendar')
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  
  const dateFilter = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
  const statusFilter = searchParams.get('status') || ''

  // Fetch upcoming appointments
  const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
    queryKey: ['appointments', 'upcoming'],
    queryFn: () => appointments.upcoming(100),
    enabled: activeTab === 'upcoming',
  })

  // Fetch appointments for specific date
  const { data: dateData, isLoading: dateLoading } = useQuery({
    queryKey: ['appointments', dateFilter, statusFilter],
    queryFn: () => {
      const params = { date: dateFilter }
      if (statusFilter) params.status = statusFilter
      return appointments.list(params)
    },
    enabled: activeTab === 'by-date',
  })

  // Fetch appointments for calendar month
  const calendarStart = format(startOfMonth(calendarMonth), 'yyyy-MM-dd')
  const calendarEnd = format(endOfMonth(calendarMonth), 'yyyy-MM-dd')
  
  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: ['appointments', 'calendar', calendarStart, calendarEnd],
    queryFn: () => appointments.list({ start_date: calendarStart, end_date: calendarEnd, limit: 200 }),
    enabled: activeTab === 'calendar',
  })

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

  // Generate calendar days (Monday start)
  const monthStart = startOfMonth(calendarMonth)
  const monthEnd = endOfMonth(calendarMonth)
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  })

  const handleDateChange = (days) => {
    const newDate = addDays(new Date(dateFilter), days)
    setSearchParams({ date: format(newDate, 'yyyy-MM-dd'), status: statusFilter })
  }

  const handleStatusChange = (status) => {
    setSearchParams({ date: dateFilter, status: status === 'all' ? '' : status })
  }

  const handleToday = () => {
    setSearchParams({ date: format(new Date(), 'yyyy-MM-dd'), status: statusFilter })
  }

  const formatDateLabel = (dateStr) => {
    const date = parseISO(dateStr)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'EEEE, MMMM d')
  }

  return (
    <div className="space-y-4">
      {/* Page Header - Dark Theme */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4">
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

      {/* View Tabs with New Appointment Button */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-full sm:w-auto bg-slate-100 p-1">
            <TabsTrigger value="upcoming" className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-slate-800 text-slate-600">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-slate-800 text-slate-600">
              Calendar
            </TabsTrigger>
            <TabsTrigger value="by-date" className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-slate-800 text-slate-600">
              By Date
            </TabsTrigger>
          </TabsList>
{/* Hidden for demo - use AI to book appointments
          <Button onClick={() => setIsNewModalOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
*/}
        </div>

        {/* Upcoming Appointments Tab */}
        <TabsContent value="upcoming" className="mt-4 space-y-4">
          {upcomingLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-slate-200 p-4">
                  <div className="h-20 animate-pulse bg-slate-100" />
                </div>
              ))}
            </div>
          ) : !upcomingData?.appointments?.length ? (
            <div className="bg-white border border-slate-200 p-12 text-center">
              <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-slate-700 mb-1">No Upcoming Appointments</h3>
              <p className="text-xs text-slate-500">There are no scheduled appointments.</p>
            </div>
          ) : (
            Object.entries(upcomingData.by_date || {}).map(([date, apts]) => (
              <div key={date} className="space-y-2">
                {/* Date Header */}
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 flex-col items-center justify-center rounded-lg",
                    isToday(parseISO(date)) ? "bg-gradient-to-br from-teal-dark to-teal text-white" : "bg-slate-100 text-slate-600"
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

                {/* Appointments for this date */}
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {apts.map((apt, index) => (
                      <Link
                        key={apt.id}
                        to={`/appointments/${apt.id}`}
                        className={cn(
                          "block p-3 hover:bg-slate-100 transition-colors",
                          index % 2 === 1 && "bg-slate-50/50"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Time */}
                          <div className="flex h-12 w-14 flex-col items-center justify-center rounded bg-slate-100 shrink-0">
                            <span className="text-sm font-semibold text-slate-700">
                              {formatTime12Hour(apt.scheduled_time).split(' ')[0]}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {formatTime12Hour(apt.scheduled_time).split(' ')[1]}
                            </span>
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="text-sm font-medium text-slate-800">
                                {apt.customer?.first_name} {apt.customer?.last_name}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded capitalize shrink-0">
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
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            {/* Month Navigation */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <h2 className="text-base font-semibold text-slate-800">
                  {format(calendarMonth, 'MMMM yyyy')}
                </h2>
                <button 
                  className="text-xs text-slate-500 hover:text-slate-700"
                  onClick={() => setCalendarMonth(new Date())}
                >
                  Go to today
                </button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {/* Day Headers */}
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 border-b border-slate-200 bg-slate-50"
                >
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {calendarDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const dayAppointments = appointmentsByDate[dateKey] || []
                const isCurrentMonth = isSameMonth(day, calendarMonth)
                const isCurrentDay = isToday(day)
                const maxVisible = 4

                return (
                  <div
                    key={dateKey}
                    className={cn(
                      'min-h-[120px] sm:min-h-[140px] p-1.5 sm:p-2 border-b border-r border-slate-200 text-left flex flex-col',
                      !isCurrentMonth && 'bg-slate-50/50',
                      isCurrentDay && 'bg-indigo-50/30'
                    )}
                  >
                    {/* Day Number */}
                    <span className={cn(
                      'text-lg sm:text-xl font-light mb-1',
                      isCurrentMonth ? 'text-slate-400' : 'text-slate-300',
                      isCurrentDay && 'text-indigo-500 font-normal'
                    )}>
                      {format(day, 'd')}
                    </span>
                    
                    {/* Appointment Pills */}
                    {dayAppointments.length > 0 && (
                      <div className="flex-1 space-y-1 min-w-0">
                        {dayAppointments.slice(0, maxVisible).map((apt) => (
                          <Link
                            key={apt.id}
                            to={`/appointments/${apt.id}`}
                            className="block bg-indigo-50 border-l-[3px] border-indigo-500 rounded-md px-1.5 sm:px-2 py-0.5 sm:py-1 hover:bg-indigo-100 transition-colors truncate"
                          >
                            <span className="text-[10px] sm:text-[13px] font-medium text-indigo-700 truncate">
                              <span className="hidden sm:inline">
                                {formatTime12Hour(apt.scheduled_time).split(' ')[0]} - {apt.customer?.first_name}
                              </span>
                              <span className="sm:hidden">
                                {formatTime12Hour(apt.scheduled_time).split(' ')[0]}
                              </span>
                            </span>
                          </Link>
                        ))}
                        {dayAppointments.length > maxVisible && (
                          <button
                            className="text-[10px] sm:text-xs text-slate-400 hover:text-indigo-600 px-1.5 transition-colors"
                            onClick={() => {
                              setActiveTab('by-date')
                              setSearchParams({ date: dateKey, status: statusFilter })
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
          </div>
        </TabsContent>

        {/* By Date Tab */}
        <TabsContent value="by-date" className="mt-4 space-y-4">
          {/* Date Navigation */}
          <div className="bg-white border border-slate-200 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDateChange(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={handleToday} className="h-8 px-3 text-xs">
                  Today
                </Button>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) =>
                    setSearchParams({ date: e.target.value, status: statusFilter })
                  }
                  className="w-[140px] h-8 text-sm border-slate-300"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDateChange(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Select value={statusFilter || 'all'} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[140px] h-8 text-xs border-slate-300">
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
              isToday(new Date(dateFilter)) ? "bg-gradient-to-br from-teal-dark to-teal text-white" : "bg-slate-100 text-slate-600"
            )}>
              <span className="text-[10px] font-medium uppercase">
                {format(new Date(dateFilter), 'MMM')}
              </span>
              <span className="text-sm font-semibold leading-none">
                {format(new Date(dateFilter), 'd')}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-800">
                {format(new Date(dateFilter), 'EEEE, MMMM d, yyyy')}
              </h3>
              <p className="text-xs text-slate-500">
                {dateData?.appointments?.length || 0} appointments
              </p>
            </div>
          </div>

          {/* Appointments Table */}
          <div className="bg-white border border-slate-200">
            {dateLoading ? (
              <div className="p-6">
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse bg-slate-100" />
                  ))}
                </div>
              </div>
            ) : !dateData?.appointments?.length ? (
              <div className="p-12 text-center">
                <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-slate-700 mb-1">No Appointments</h3>
                <p className="text-xs text-slate-500">No appointments scheduled for this date.</p>
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
                        "block p-3 hover:bg-slate-100",
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
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {apt.customer?.first_name} {apt.customer?.last_name}
                            </p>
                            <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded capitalize shrink-0">
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
                      <TableHead className="w-24 text-xs font-medium text-slate-600">Duration</TableHead>
                      <TableHead className="w-28 text-xs font-medium text-slate-600">Status</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dateData.appointments.map((apt, index) => (
                      <TableRow key={apt.id} className={cn("hover:bg-slate-100", index % 2 === 1 && "bg-slate-50/50")}>
                        <TableCell className="font-mono text-sm text-slate-700">
                          {formatTime12Hour(apt.scheduled_time)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-slate-800">
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
                          <span className="text-sm text-slate-700">
                            {formatDuration(apt.estimated_duration_minutes)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded capitalize">
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
