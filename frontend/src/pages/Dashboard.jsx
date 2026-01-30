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
  ArrowUpRight,
  Sparkles,
  Users,
  CheckCircle2,
  Zap,
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
      value: overview?.today?.appointments ?? '0',
      change: '+12%',
      changeType: 'positive',
      icon: Calendar,
      color: 'text-blue-600',
      bgClass: 'stat-blue',
    },
    {
      name: "AI Calls Handled",
      value: overview?.today?.calls ?? '0',
      change: '+8%',
      changeType: 'positive',
      icon: Phone,
      color: 'text-emerald-600',
      bgClass: 'stat-green',
    },
    {
      name: 'Conversion Rate',
      value: overview?.week?.conversion_rate ? `${overview.week.conversion_rate}%` : '0%',
      change: '+5%',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgClass: 'stat-purple',
    },
    {
      name: 'Revenue (MTD)',
      value: overview?.month?.revenue_booked
        ? formatCurrency(overview.month.revenue_booked)
        : '$0',
      change: '+18%',
      changeType: 'positive',
      icon: DollarSign,
      color: 'text-amber-600',
      bgClass: 'stat-amber',
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-gray-500">
            Welcome back! Here's what's happening with your business today.
          </p>
        </div>
        <Button asChild className="gradient-primary shadow-glow border-0 h-11 px-6">
          <Link to="/appointments">
            <Calendar className="mr-2 h-4 w-4" />
            New Appointment
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={stat.name}
            className={cn(
              'rounded-2xl p-5 card-premium-hover',
              stat.bgClass
            )}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn('rounded-xl p-2.5', 'bg-white/60')}>
                <stat.icon className={cn('h-5 w-5', stat.color)} />
              </div>
              <span className={cn(
                'flex items-center gap-0.5 text-xs font-semibold',
                stat.changeType === 'positive' ? 'text-emerald-600' : 'text-red-600'
              )}>
                <ArrowUpRight className="h-3 w-3" />
                {stat.change}
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
            <p className="text-sm text-gray-600">{stat.name}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 card-premium rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Today's Schedule</h2>
              <p className="text-sm text-gray-500">
                {todayData?.summary?.total || 0} appointments scheduled
              </p>
            </div>
            <Button variant="outline" size="sm" asChild className="rounded-xl">
              <Link to="/appointments">
                View All
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="p-4">
            {todayLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-xl bg-gray-100"
                  />
                ))}
              </div>
            ) : todayData?.appointments?.length > 0 ? (
              <div className="space-y-2">
                {todayData.appointments.slice(0, 5).map((apt, index) => (
                  <Link
                    key={apt.id}
                    to={`/appointments/${apt.id}`}
                    className="flex items-center gap-4 rounded-xl p-4 transition-all duration-200 hover:bg-gray-50 group"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-gray-100 group-hover:bg-white group-hover:shadow-soft transition-all">
                      <span className="text-lg font-bold text-gray-900">
                        {formatTime12Hour(apt.scheduled_time).split(':')[0]}
                      </span>
                      <span className="text-[10px] font-medium text-gray-500 uppercase">
                        {formatTime12Hour(apt.scheduled_time).includes('PM') ? 'PM' : 'AM'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {apt.customer?.first_name} {apt.customer?.last_name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {apt.vehicle?.year} {apt.vehicle?.make} {apt.vehicle?.model}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {apt.appointment_services?.map((s) => s.service_name).join(', ')}
                      </p>
                    </div>
                    <Badge className={cn(
                      'shrink-0 rounded-lg font-medium',
                      getStatusColor(apt.status)
                    )}>
                      {apt.status.replace('_', ' ')}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-2xl bg-gray-100 p-4 mb-4">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <p className="font-medium text-gray-900 mb-1">No appointments today</p>
                <p className="text-sm text-gray-500">Your schedule is clear</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* AI Performance Card */}
          <div className="card-premium rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">AI Performance</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Calls Handled</span>
                <span className="font-semibold text-gray-900">{overview?.week?.calls ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Bookings Made</span>
                <span className="font-semibold text-gray-900">{overview?.week?.ai_bookings ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Success Rate</span>
                <span className="font-semibold text-emerald-600">
                  {overview?.week?.conversion_rate ?? 0}%
                </span>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span>AI agent is handling calls 24/7</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="card-premium rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Today's Summary</h2>
              <p className="text-sm text-gray-500">Appointment status breakdown</p>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'Completed', color: 'bg-emerald-500', count: todayData?.by_status?.completed?.length || 0 },
                { label: 'In Progress', color: 'bg-purple-500', count: todayData?.by_status?.in_progress?.length || 0 },
                { label: 'Checked In', color: 'bg-amber-500', count: todayData?.by_status?.checked_in?.length || 0 },
                { label: 'Confirmed', color: 'bg-blue-500', count: todayData?.by_status?.confirmed?.length || 0 },
                { label: 'Scheduled', color: 'bg-gray-400', count: todayData?.by_status?.scheduled?.length || 0 },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={cn('h-2.5 w-2.5 rounded-full', item.color)} />
                    <span className="text-sm text-gray-600">{item.label}</span>
                  </div>
                  <span className="font-semibold text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            icon: CheckCircle2,
            label: 'AI Bookings This Week',
            value: overview?.week?.ai_bookings ?? 0,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            icon: Phone,
            label: 'Total Calls This Week',
            value: overview?.week?.calls ?? 0,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            icon: Users,
            label: 'New Customers This Week',
            value: overview?.week?.new_customers ?? 0,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
          },
        ].map((item) => (
          <div key={item.label} className="card-premium rounded-2xl p-5 flex items-center gap-4">
            <div className={cn('rounded-xl p-3', item.bg)}>
              <item.icon className={cn('h-6 w-6', item.color)} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="text-sm text-gray-500">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
