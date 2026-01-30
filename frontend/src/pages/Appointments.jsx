import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns'
import { appointments } from '@/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Calendar,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react'
import {
  cn,
  formatTime12Hour,
  formatPhone,
  formatDuration,
  getStatusColor,
} from '@/lib/utils'
import NewAppointmentModal from '@/components/NewAppointmentModal'

export default function Appointments() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [view, setView] = useState('list')
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  
  const dateFilter = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
  const statusFilter = searchParams.get('status') || ''
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['appointments', dateFilter, statusFilter],
    queryFn: () => {
      const params = { date: dateFilter }
      if (statusFilter) params.status = statusFilter
      return appointments.list(params)
    },
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground text-sm hidden sm:block">
            Manage service appointments and scheduling
          </p>
        </div>
        <Button onClick={() => setIsNewModalOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          New Appointment
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            {/* Date Navigation */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10"
                onClick={() => handleDateChange(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleToday} className="h-9 sm:h-10 px-2 sm:px-3 text-sm">
                Today
              </Button>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) =>
                  setSearchParams({ date: e.target.value, status: statusFilter })
                }
                className="w-[130px] sm:w-40 h-9 sm:h-10 text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10"
                onClick={() => handleDateChange(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Status Filter & View Toggle Row */}
            <div className="flex items-center gap-2 sm:gap-4 sm:flex-1">
              <Select value={statusFilter || 'all'} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[130px] sm:w-40 h-9 sm:h-10">
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
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle - Hidden on mobile, default to card view */}
              <div className="ml-auto hidden sm:block">
                <Tabs value={view} onValueChange={setView}>
                  <TabsList>
                    <TabsTrigger value="list">List</TabsTrigger>
                    <TabsTrigger value="calendar">Calendar</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        <h2 className="text-base sm:text-lg font-semibold">
          {format(new Date(dateFilter), 'EEE, MMM d')}
          <span className="hidden sm:inline">, {format(new Date(dateFilter), 'yyyy')}</span>
        </h2>
        <Badge variant="secondary" className="text-xs">
          {data?.appointments?.length || 0} appts
        </Badge>
      </div>

      {/* Appointments - Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))
        ) : data?.appointments?.length > 0 ? (
          data.appointments.map((apt) => (
            <Link key={apt.id} to={`/appointments/${apt.id}`}>
              <Card className="active:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-14 w-16 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <span className="text-sm font-bold">
                        {formatTime12Hour(apt.scheduled_time).split(' ')[0]}
                      </span>
                      <span className="text-xs">
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
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {apt.vehicle ? `${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}` : '-'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {apt.appointment_services?.map((s) => s.service_name).join(', ') || '-'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDuration(apt.estimated_duration_minutes)} • {formatPhone(apt.customer?.phone)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No appointments for this date</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Appointments Table - Desktop Only */}
      {view === 'list' && (
        <Card className="hidden sm:block">
          <Table>
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
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <div className="h-12 animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : data?.appointments?.length > 0 ? (
                data.appointments.map((apt) => (
                  <TableRow key={apt.id}>
                    <TableCell className="font-mono">
                      {formatTime12Hour(apt.scheduled_time)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {apt.customer?.first_name} {apt.customer?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatPhone(apt.customer?.phone)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {apt.vehicle ? (
                        <span>
                          {apt.vehicle.year} {apt.vehicle.make} {apt.vehicle.model}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        {apt.appointment_services
                          ?.map((s) => s.service_name)
                          .join(', ') || '-'}
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
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No appointments found for this date
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Calendar View (simplified) - Desktop Only */}
      {view === 'calendar' && (
        <Card className="hidden sm:block">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-3">
              {isLoading ? (
                <div className="h-64 animate-pulse rounded bg-muted" />
              ) : data?.appointments?.length > 0 ? (
                data.appointments.map((apt) => (
                  <Link
                    key={apt.id}
                    to={`/appointments/${apt.id}`}
                    className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-16 w-20 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <span className="text-lg font-bold">
                        {formatTime12Hour(apt.scheduled_time).split(' ')[0]}
                      </span>
                      <span className="text-xs">
                        {formatTime12Hour(apt.scheduled_time).split(' ')[1]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {apt.customer?.first_name} {apt.customer?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {apt.vehicle?.year} {apt.vehicle?.make} {apt.vehicle?.model}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {apt.appointment_services
                          ?.map((s) => s.service_name)
                          .join(', ')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge className={getStatusColor(apt.status)}>
                        {apt.status.replace('_', ' ')}
                      </Badge>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDuration(apt.estimated_duration_minutes)}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="flex h-64 items-center justify-center text-muted-foreground">
                  No appointments for this date
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Appointment Modal */}
      <NewAppointmentModal
        open={isNewModalOpen}
        onOpenChange={setIsNewModalOpen}
        onSuccess={(appointment) => {
          // Navigate to the newly created appointment
          navigate(`/appointments/${appointment.id}`)
        }}
      />
    </div>
  )
}
