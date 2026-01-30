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

export default function Appointments() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('upcoming')
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
    queryFn: () => appointments.list({ start_date: calendarStart, end_date: calendarEnd }),
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

  // Generate calendar days
  const monthStart = startOfMonth(calendarMonth)
  const monthEnd = endOfMonth(calendarMonth)
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(monthEnd),
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
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="text-slate-500 text-sm hidden sm:block">
            Manage service appointments and scheduling
          </p>
        </div>
        <Button onClick={() => setIsNewModalOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          New Appointment
        </Button>
      </div>

      {/* View Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="upcoming" className="flex-1 sm:flex-none">
            <CalendarDays className="h-4 w-4 mr-2" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex-1 sm:flex-none">
            <Grid3X3 className="h-4 w-4 mr-2" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="by-date" className="flex-1 sm:flex-none">
            <Calendar className="h-4 w-4 mr-2" />
            By Date
          </TabsTrigger>
        </TabsList>

        {/* Upcoming Appointments Tab */}
        <TabsContent value="upcoming" className="mt-4 space-y-4">
          {upcomingLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-24 animate-pulse rounded bg-slate-100" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !upcomingData?.appointments?.length ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-1">No Upcoming Appointments</h3>
                <p className="text-slate-500 mb-4">There are no scheduled appointments.</p>
                <Button onClick={() => setIsNewModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Book Appointment
                </Button>
              </CardContent>
            </Card>
          ) : (
            Object.entries(upcomingData.by_date || {}).map(([date, apts]) => (
              <div key={date} className="space-y-3">
                {/* Date Header */}
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-12 w-12 flex-col items-center justify-center rounded-lg",
                    isToday(parseISO(date)) ? "bg-primary text-white" : "bg-slate-100 text-slate-600"
                  )}>
                    <span className="text-xs font-medium uppercase">
                      {format(parseISO(date), 'MMM')}
                    </span>
                    <span className="text-lg font-bold leading-none">
                      {format(parseISO(date), 'd')}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{formatDateLabel(date)}</h3>
                    <p className="text-sm text-slate-500">
                      {apts.length} appointment{apts.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Appointments for this date */}
                <Card>
                  <div className="divide-y divide-slate-100">
                    {apts.map((apt) => (
                      <Link
                        key={apt.id}
                        to={`/appointments/${apt.id}`}
                        className="block p-4 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          {/* Time */}
                          <div className="flex h-14 w-16 flex-col items-center justify-center rounded-lg bg-slate-100 shrink-0">
                            <span className="text-sm font-bold text-slate-900">
                              {formatTime12Hour(apt.scheduled_time).split(' ')[0]}
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatTime12Hour(apt.scheduled_time).split(' ')[1]}
                            </span>
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-slate-400" />
                                <span className="font-medium text-slate-900">
                                  {apt.customer?.first_name} {apt.customer?.last_name}
                                </span>
                              </div>
                              <Badge className={cn('shrink-0', getStatusColor(apt.status))}>
                                {apt.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            {apt.vehicle && (
                              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                                <Car className="h-4 w-4 text-slate-400" />
                                <span>{apt.vehicle.year} {apt.vehicle.make} {apt.vehicle.model}</span>
                              </div>
                            )}
                            
                            <p className="text-sm text-slate-500 truncate">
                              {apt.appointment_services?.map((s) => s.service_name).join(', ') || 'Service'}
                            </p>
                            
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(apt.estimated_duration_minutes)}
                              </span>
                              {apt.customer?.phone && (
                                <PhoneNumber phone={apt.customer.phone} showRevealButton={false} />
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </Card>
              </div>
            ))
          )}
        </TabsContent>

        {/* Calendar View Tab */}
        <TabsContent value="calendar" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-900">
                    {format(calendarMonth, 'MMMM yyyy')}
                  </h2>
                  <Button 
                    variant="link" 
                    className="text-sm text-slate-500 h-auto p-0"
                    onClick={() => setCalendarMonth(new Date())}
                  >
                    Go to today
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-semibold text-slate-500 py-2"
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

                  return (
                    <Popover key={dateKey}>
                      <PopoverTrigger asChild>
                        <button
                          className={cn(
                            'relative min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 border rounded-lg transition-colors text-left',
                            isCurrentMonth 
                              ? 'bg-white hover:bg-slate-50 border-slate-200' 
                              : 'bg-slate-50 border-slate-100 text-slate-400',
                            isCurrentDay && 'ring-2 ring-primary ring-offset-1',
                            dayAppointments.length > 0 && 'cursor-pointer'
                          )}
                          disabled={dayAppointments.length === 0}
                        >
                          <span className={cn(
                            'text-sm font-medium',
                            isCurrentDay && 'text-primary font-bold'
                          )}>
                            {format(day, 'd')}
                          </span>
                          
                          {/* Appointment indicators */}
                          {dayAppointments.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {dayAppointments.slice(0, 3).map((apt) => (
                                <div
                                  key={apt.id}
                                  className={cn(
                                    'text-[10px] sm:text-xs px-1 py-0.5 rounded truncate',
                                    apt.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                    apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                    apt.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                                    'bg-blue-100 text-blue-700'
                                  )}
                                >
                                  <span className="hidden sm:inline">
                                    {formatTime12Hour(apt.scheduled_time).split(' ')[0]} - {apt.customer?.first_name}
                                  </span>
                                  <span className="sm:hidden">
                                    {formatTime12Hour(apt.scheduled_time).split(':')[0]}
                                  </span>
                                </div>
                              ))}
                              {dayAppointments.length > 3 && (
                                <div className="text-[10px] text-slate-500 px-1">
                                  +{dayAppointments.length - 3} more
                                </div>
                              )}
                            </div>
                          )}
                        </button>
                      </PopoverTrigger>
                      
                      {dayAppointments.length > 0 && (
                        <PopoverContent className="w-80 p-0" align="start">
                          <div className="p-3 border-b border-slate-100">
                            <h3 className="font-semibold text-slate-900">
                              {format(day, 'EEEE, MMMM d')}
                            </h3>
                            <p className="text-sm text-slate-500">
                              {dayAppointments.length} appointment{dayAppointments.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {dayAppointments.map((apt) => (
                              <Link
                                key={apt.id}
                                to={`/appointments/${apt.id}`}
                                className="block p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                              >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <span className="font-medium text-slate-900">
                                    {formatTime12Hour(apt.scheduled_time)}
                                  </span>
                                  <Badge className={cn('text-xs', getStatusColor(apt.status))}>
                                    {apt.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                                <p className="text-sm font-medium text-slate-700">
                                  {apt.customer?.first_name} {apt.customer?.last_name}
                                </p>
                                {apt.vehicle && (
                                  <p className="text-xs text-slate-500">
                                    {apt.vehicle.year} {apt.vehicle.make} {apt.vehicle.model}
                                  </p>
                                )}
                                <p className="text-xs text-slate-500 truncate">
                                  {apt.appointment_services?.map((s) => s.service_name).join(', ')}
                                </p>
                              </Link>
                            ))}
                          </div>
                        </PopoverContent>
                      )}
                    </Popover>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-blue-100" />
                  <span className="text-slate-600">Scheduled</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-amber-100" />
                  <span className="text-slate-600">In Progress</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-100" />
                  <span className="text-slate-600">Completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-red-100" />
                  <span className="text-slate-600">Cancelled</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Date Tab */}
        <TabsContent value="by-date" className="mt-4 space-y-4">
          {/* Date Navigation */}
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => handleDateChange(-1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={handleToday} className="h-9 px-3 text-sm">
                    Today
                  </Button>
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) =>
                      setSearchParams({ date: e.target.value, status: statusFilter })
                    }
                    className="w-[140px] h-9 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => handleDateChange(1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <Select value={statusFilter || 'all'} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[140px] h-9">
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
            </CardContent>
          </Card>

          {/* Date Header */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-12 w-12 flex-col items-center justify-center rounded-lg",
              isToday(new Date(dateFilter)) ? "bg-primary text-white" : "bg-slate-100 text-slate-600"
            )}>
              <span className="text-xs font-medium uppercase">
                {format(new Date(dateFilter), 'MMM')}
              </span>
              <span className="text-lg font-bold leading-none">
                {format(new Date(dateFilter), 'd')}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                {format(new Date(dateFilter), 'EEEE, MMMM d, yyyy')}
              </h3>
              <p className="text-sm text-slate-500">
                {dateData?.appointments?.length || 0} appointments
              </p>
            </div>
          </div>

          {/* Appointments Table */}
          <Card>
            {dateLoading ? (
              <CardContent className="p-6">
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded bg-slate-100" />
                  ))}
                </div>
              </CardContent>
            ) : !dateData?.appointments?.length ? (
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-1">No Appointments</h3>
                <p className="text-slate-500">No appointments scheduled for this date.</p>
              </CardContent>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {dateData.appointments.map((apt) => (
                    <Link
                      key={apt.id}
                      to={`/appointments/${apt.id}`}
                      className="block p-4 hover:bg-slate-50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-14 w-16 flex-col items-center justify-center rounded-lg bg-slate-100 shrink-0">
                          <span className="text-sm font-bold">
                            {formatTime12Hour(apt.scheduled_time).split(' ')[0]}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatTime12Hour(apt.scheduled_time).split(' ')[1]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium truncate">
                              {apt.customer?.first_name} {apt.customer?.last_name}
                            </p>
                            <Badge className={cn('shrink-0 text-xs', getStatusColor(apt.status))}>
                              {apt.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-500 truncate">
                            {apt.vehicle ? `${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}` : '-'}
                          </p>
                          <p className="text-sm text-slate-500 truncate">
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
                    <TableRow>
                      <TableHead className="w-24">Time</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead className="w-24">Duration</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dateData.appointments.map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell className="font-mono">
                          {formatTime12Hour(apt.scheduled_time)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {apt.customer?.first_name} {apt.customer?.last_name}
                            </p>
                            <p className="text-sm text-slate-500">
                              <PhoneNumber phone={apt.customer?.phone} showRevealButton={false} />
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {apt.vehicle ? (
                            `${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}`
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {apt.appointment_services?.map((s) => s.service_name).join(', ')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDuration(apt.estimated_duration_minutes)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(apt.status)}>
                            {apt.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/appointments/${apt.id}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </Card>
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
