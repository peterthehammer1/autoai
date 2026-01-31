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
  TrendingDown,
  DollarSign,
  ArrowRight,
  ArrowUpRight,
  Zap,
  Users,
  CheckCircle2,
  Clock,
  Lightbulb,
  AlertTriangle,
  Info,
  Target,
  Sparkles,
} from 'lucide-react'
import { cn, formatTime12Hour, getStatusColor, formatCurrency } from '@/lib/utils'

// Insight icon and color mapping
const insightConfig = {
  trend_up: { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  trend_down: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
  success: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' },
  action: { icon: Target, color: 'text-violet-600', bg: 'bg-violet-50' },
}

export default function Dashboard() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: analytics.overview,
  })

  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: appointments.today,
  })

  const { data: insightsData, isLoading: insightsLoading } = useQuery({
    queryKey: ['analytics', 'insights'],
    queryFn: analytics.insights,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  })

  const stats = [
    {
      name: "Today's Appointments",
      value: overview?.today?.appointments ?? '0',
      change: '+12%',
      icon: Calendar,
      iconColor: 'text-blue-600',
      bgClass: 'stat-blue',
    },
    {
      name: "AI Calls Handled",
      value: overview?.today?.calls ?? '0',
      change: '+8%',
      icon: Phone,
      iconColor: 'text-emerald-600',
      bgClass: 'stat-green',
    },
    {
      name: 'Conversion Rate',
      value: overview?.week?.conversion_rate ? `${overview.week.conversion_rate}%` : '0%',
      change: '+5%',
      icon: TrendingUp,
      iconColor: 'text-violet-600',
      bgClass: 'stat-purple',
    },
    {
      name: 'Revenue (MTD)',
      value: overview?.month?.revenue_booked
        ? formatCurrency(overview.month.revenue_booked)
        : '$0',
      change: '+18%',
      icon: DollarSign,
      iconColor: 'text-amber-600',
      bgClass: 'stat-amber',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* AI Insights Panel - Top of Dashboard */}
      {insightsData?.insights?.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg overflow-hidden shadow-card">
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">AI Insights</h2>
                <p className="text-xs text-slate-400">Powered by your data</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {insightsData.insights.slice(0, 6).map((insight, idx) => {
                const config = insightConfig[insight.type] || insightConfig.info
                const Icon = config.icon
                return (
                  <div
                    key={idx}
                    className="bg-white/5 backdrop-blur rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('rounded-lg p-1.5 shrink-0', config.bg)}>
                        <Icon className={cn('h-4 w-4', config.color)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-white truncate">{insight.title}</p>
                          {insight.value && (
                            <span className={cn(
                              'text-xs font-bold shrink-0',
                              insight.type === 'trend_up' || insight.type === 'success' ? 'text-emerald-400' :
                              insight.type === 'trend_down' || insight.type === 'warning' ? 'text-amber-400' :
                              'text-blue-400'
                            )}>
                              {insight.value}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{insight.message}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={stat.name}
            className={cn(
              'rounded-lg p-4 bg-white border border-slate-200 shadow-card',
              stat.bgClass
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={cn('rounded-lg p-2 bg-white shadow-sm')}>
                <stat.icon className={cn('h-5 w-5', stat.iconColor)} />
              </div>
              <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
                <ArrowUpRight className="h-3 w-3" />
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{stat.name}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-card overflow-hidden">
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Today's Schedule</h2>
              <p className="text-sm text-slate-500">
                {todayData?.summary?.total || 0} appointments scheduled
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/appointments">
                View All
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="p-3 sm:p-4">
            {todayLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : todayData?.appointments?.length > 0 ? (
              <div className="space-y-2">
                {todayData.appointments.slice(0, 5).map((apt) => (
                  <Link
                    key={apt.id}
                    to={`/appointments/${apt.id}`}
                    className="flex items-center gap-3 sm:gap-4 rounded-lg p-3 transition-colors hover:bg-slate-50 group"
                  >
                    <div className="flex h-12 w-14 flex-col items-center justify-center rounded-lg bg-slate-100 group-hover:bg-white group-hover:shadow-sm transition-all">
                      <span className="text-base font-bold text-slate-900">
                        {formatTime12Hour(apt.scheduled_time).split(':')[0]}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 uppercase">
                        {formatTime12Hour(apt.scheduled_time).includes('PM') ? 'PM' : 'AM'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {apt.customer?.first_name} {apt.customer?.last_name}
                      </p>
                      <p className="text-sm text-slate-500 truncate">
                        {apt.vehicle?.year} {apt.vehicle?.make} {apt.vehicle?.model}
                      </p>
                    </div>
                    <Badge className={cn(
                      'shrink-0 text-xs font-medium',
                      getStatusColor(apt.display_status || apt.status)
                    )}>
                      {(apt.display_status || apt.status).replace('_', ' ')}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-lg bg-slate-100 p-3 mb-3">
                  <Calendar className="h-6 w-6 text-slate-400" />
                </div>
                <p className="font-medium text-slate-900">No appointments today</p>
                <p className="text-sm text-slate-500">Your schedule is clear</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* AI Performance Card */}
          <div className="bg-slate-900 rounded-lg overflow-hidden shadow-card">
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-base font-semibold text-white">AI Performance</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Calls Handled</span>
                  <span className="font-semibold text-white">{overview?.week?.calls ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Bookings Made</span>
                  <span className="font-semibold text-white">{overview?.week?.ai_bookings ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Success Rate</span>
                  <span className="font-semibold text-emerald-400">
                    {overview?.week?.conversion_rate ?? 0}%
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-700">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>AI agent is handling calls 24/7</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-card overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Today's Summary</h2>
              <p className="text-sm text-slate-500">Status breakdown</p>
            </div>
            <div className="p-4 sm:p-5 space-y-3">
              {[
                { label: 'Completed', color: 'bg-emerald-500', count: todayData?.by_status?.completed?.length || 0 },
                { label: 'In Progress', color: 'bg-amber-500', count: todayData?.by_status?.in_progress?.length || 0 },
                { label: 'Checked In', color: 'bg-blue-500', count: todayData?.by_status?.checked_in?.length || 0 },
                { label: 'Confirmed', color: 'bg-violet-500', count: todayData?.by_status?.confirmed?.length || 0 },
                { label: 'Scheduled', color: 'bg-slate-400', count: todayData?.by_status?.scheduled?.length || 0 },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={cn('h-2 w-2 rounded-full', item.color)} />
                    <span className="text-sm text-slate-600">{item.label}</span>
                  </div>
                  <span className="font-semibold text-slate-900">{item.count}</span>
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
            iconColor: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
          },
          {
            icon: Phone,
            label: 'Total Calls This Week',
            value: overview?.week?.calls ?? 0,
            iconColor: 'text-blue-600',
            bgColor: 'bg-blue-50',
          },
          {
            icon: Users,
            label: 'New Customers This Week',
            value: overview?.week?.new_customers ?? 0,
            iconColor: 'text-violet-600',
            bgColor: 'bg-violet-50',
          },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-lg border border-slate-200 shadow-card p-4 flex items-center gap-4">
            <div className={cn('rounded-lg p-2.5', item.bgColor)}>
              <item.icon className={cn('h-5 w-5', item.iconColor)} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{item.value}</p>
              <p className="text-sm text-slate-500">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
