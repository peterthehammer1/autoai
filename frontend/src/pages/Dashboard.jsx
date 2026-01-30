import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { analytics, appointments } from '@/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Phone,
  TrendingUp,
  DollarSign,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { cn, formatTime12Hour, getStatusColor, formatCurrency } from '@/lib/utils'

export default function Dashboard() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: analytics.overview,
  })

  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: appointments.today,
  })

  const stats = [
    {
      name: "Today's Appointments",
      value: overview?.today?.appointments ?? '-',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: "Today's Calls",
      value: overview?.today?.calls ?? '-',
      icon: Phone,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Week Conversion',
      value: overview?.week?.conversion_rate ? `${overview.week.conversion_rate}%` : '-',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'Month Revenue',
      value: overview?.month?.revenue_booked
        ? formatCurrency(overview.month.revenue_booked)
        : '-',
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Welcome back! Here's what's happening today.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/appointments">
            View All Appointments
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className={cn('rounded-full p-2 sm:p-3 w-fit', stat.bgColor)}>
                  <stat.icon className={cn('h-4 w-4 sm:h-5 sm:w-5', stat.color)} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{stat.name}</p>
                  <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today's Schedule & Quick Stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Appointments */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Today's Schedule</CardTitle>
              <CardDescription>
                {todayData?.summary?.total || 0} appointments scheduled
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/appointments">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {todayLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-lg bg-muted"
                  />
                ))}
              </div>
            ) : todayData?.appointments?.length > 0 ? (
              <div className="space-y-3">
                {todayData.appointments.slice(0, 6).map((apt) => (
                  <Link
                    key={apt.id}
                    to={`/appointments/${apt.id}`}
                    className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted font-mono text-sm">
                      {formatTime12Hour(apt.scheduled_time)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {apt.customer?.first_name} {apt.customer?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {apt.vehicle?.year} {apt.vehicle?.make} {apt.vehicle?.model}
                        {' • '}
                        {apt.appointment_services?.map((s) => s.service_name).join(', ')}
                      </p>
                    </div>
                    <Badge className={cn('shrink-0', getStatusColor(apt.status))}>
                      {apt.status.replace('_', ' ')}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No appointments today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Summary</CardTitle>
            <CardDescription>Appointment status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm">Completed</span>
                </div>
                <span className="font-medium">
                  {todayData?.by_status?.completed?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-purple-500" />
                  <span className="text-sm">In Progress</span>
                </div>
                <span className="font-medium">
                  {todayData?.by_status?.in_progress?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">Checked In</span>
                </div>
                <span className="font-medium">
                  {todayData?.by_status?.checked_in?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Confirmed</span>
                </div>
                <span className="font-medium">
                  {todayData?.by_status?.confirmed?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-400" />
                  <span className="text-sm">Scheduled</span>
                </div>
                <span className="font-medium">
                  {todayData?.by_status?.scheduled?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm">Cancelled/No-show</span>
                </div>
                <span className="font-medium">
                  {(todayData?.by_status?.cancelled?.length || 0) +
                    (todayData?.by_status?.no_show?.length || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Week Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">AI Bookings This Week</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {overview?.week?.ai_bookings ?? '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <Phone className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Calls This Week</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {overview?.week?.calls ?? '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Appointments This Week</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {overview?.week?.appointments ?? '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
