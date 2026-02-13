import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, getDay } from 'date-fns'
import { useDashboardTour } from '@/hooks/use-dashboard-tour'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
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
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
  Target,
  Sparkles,
  Smile,
  Sun,
  Moon,
  Sunrise,
  ChevronLeft,
  ChevronRight,
  Bot,
  Activity,
  Mic,
  Car,
  Wrench,
} from 'lucide-react'
import { cn, formatTime12Hour, getStatusColor, formatCents } from '@/lib/utils'

// Animated number component for impact
function AnimatedNumber({ value, prefix = '', suffix = '', duration = 1000 }) {
  const [displayValue, setDisplayValue] = useState(0)
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) || 0 : value || 0
  
  useEffect(() => {
    const startTime = Date.now()
    const startValue = displayValue
    
    const animate = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime) / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const current = startValue + (numericValue - startValue) * easeOut
      
      setDisplayValue(current)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [numericValue])
  
  return (
    <span>
      {prefix}{Math.round(displayValue).toLocaleString()}{suffix}
    </span>
  )
}

// Get greeting based on time of day
function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return { text: 'Good morning', icon: Sunrise, color: 'text-amber-500' }
  if (hour < 17) return { text: 'Good afternoon', icon: Sun, color: 'text-yellow-500' }
  return { text: 'Good evening', icon: Moon, color: 'text-indigo-500' }
}

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
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const greeting = getGreeting()
  const GreetingIcon = greeting.icon

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
    refetchIntervalInBackground: false,
  })

  const ready = !overviewLoading && !todayLoading && !insightsLoading
  const { startTour } = useDashboardTour(ready)

  const { data: callTrends } = useQuery({
    queryKey: ['analytics', 'call-trends', 'week'],
    queryFn: () => analytics.callTrends('week'),
  })

  // Fetch appointments for the calendar month
  const { data: monthAppointments } = useQuery({
    queryKey: ['appointments', 'month', format(calendarMonth, 'yyyy-MM')],
    queryFn: () => appointments.list({ 
      start_date: format(startOfMonth(calendarMonth), 'yyyy-MM-dd'),
      end_date: format(endOfMonth(calendarMonth), 'yyyy-MM-dd'),
      limit: 200
    }),
  })

  // Build appointment counts by date for calendar
  const appointmentsByDate = {}
  if (monthAppointments?.data) {
    monthAppointments.data.forEach(apt => {
      const date = apt.scheduled_date
      appointmentsByDate[date] = (appointmentsByDate[date] || 0) + 1
    })
  }

  // AI Insights Panel Component (reusable)
  const AIInsightsPanel = () => (
    insightsData?.insights?.length > 0 ? (
      <div data-tour="ai-insights" className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg overflow-hidden shadow-card">
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-600 to-slate-700">
              <Sparkles className="h-4 w-4 text-blue-300" />
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
    ) : null
  )

  // Sentiment Chart - memoized to prevent re-renders
  const sentimentChartContent = useMemo(() => {
    if (!callTrends?.sentiment_trend?.length) return null
    
    return (
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                <Smile className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Customer Sentiment</CardTitle>
                <CardDescription>Call sentiment analysis this week</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/analytics">
                View Details
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={callTrends.sentiment_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(d) => format(new Date(d), 'MMM d')}
                  stroke="#94a3b8"
                  fontSize={12}
                />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  labelFormatter={(d) => format(new Date(d), 'MMM d, yyyy')}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area 
                  type="monotone" 
                  dataKey="positive" 
                  stackId="1" 
                  stroke="#22c55e" 
                  fill="#22c55e" 
                  fillOpacity={0.6}
                  name="Positive"
                  isAnimationActive={false}
                />
                <Area 
                  type="monotone" 
                  dataKey="neutral" 
                  stackId="1" 
                  stroke="#64748b" 
                  fill="#64748b" 
                  fillOpacity={0.6}
                  name="Neutral"
                  isAnimationActive={false}
                />
                <Area 
                  type="monotone" 
                  dataKey="negative" 
                  stackId="1" 
                  stroke="#ef4444" 
                  fill="#ef4444" 
                  fillOpacity={0.6}
                  name="Negative"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }, [callTrends?.sentiment_trend])

  // Mini Calendar Component
  const MiniCalendar = () => {
    const monthStart = startOfMonth(calendarMonth)
    const monthEnd = endOfMonth(calendarMonth)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const startDayOfWeek = getDay(monthStart)
    
    return (
      <>
        <CardHeader className="pb-2 bg-gradient-to-r from-slate-50 to-white border-b">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4 text-slate-500" />
            </button>
            <span className="text-sm font-semibold text-slate-800">
              {format(calendarMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-slate-400 py-1 uppercase tracking-wide" aria-label={day}>
                {day.charAt(0)}
              </div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {/* Actual days */}
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const count = appointmentsByDate[dateStr] || 0
              const isCurrentDay = isToday(day)
              
              return (
                <Link
                  key={dateStr}
                  to={`/appointments?date=${dateStr}`}
                  aria-label={`${format(day, 'MMMM d')}${count > 0 ? `, ${count} appointment${count > 1 ? 's' : ''}` : ''}`}
                  className={cn(
                    'aspect-square flex flex-col items-center justify-center text-xs rounded-lg transition-all relative',
                    isCurrentDay
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white font-semibold shadow-md shadow-blue-500/25'
                      : 'hover:bg-slate-100 text-slate-700',
                    count > 0 && !isCurrentDay && 'font-semibold bg-slate-50'
                  )}
                >
                  <span>{format(day, 'd')}</span>
                  {count > 0 && (
                    <span className={cn(
                      'absolute bottom-1 w-1 h-1 rounded-full',
                      isCurrentDay ? 'bg-white' : 'bg-teal-500'
                    )} />
                  )}
                </Link>
              )
            })}
          </div>
        </CardContent>
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[10px] text-slate-500 text-center">Click a date to view appointments</p>
        </div>
      </>
    )
  }

  // Generate mini sparkline data
  const generateSparkline = (base, variance = 10) => {
    return Array.from({ length: 7 }, (_, i) => ({
      value: base + Math.floor(Math.random() * variance * 2) - variance
    }))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <div data-tour="dashboard-header" className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GreetingIcon className={cn("h-5 w-5", greeting.color)} aria-hidden="true" />
            <div>
              <h1 className="text-lg font-semibold text-white">{greeting.text}</h1>
              <p className="text-xs text-slate-400">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            </div>
          </div>
          <a 
            href="https://nucleus.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 opacity-60 hover:opacity-100 transition-opacity"
          >
            <span className="text-[11px] text-slate-400">Powered by</span>
            <img 
              src="/nucleus-logo.svg" 
              alt="Nucleus" 
              className="h-3.5 brightness-0 invert opacity-70"
            />
          </a>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-5">
          {/* Today's Schedule Card - Enhanced */}
          <Card data-tour="todays-schedule" className="shadow-lg border-0 overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-white border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 shadow-lg shadow-slate-500/15">
                    <Calendar className="h-5 w-5 text-blue-300" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Today's Schedule</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <span className="font-semibold text-blue-600">{todayData?.summary?.total || 0}</span> appointments scheduled
                    </CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="gap-1.5 shadow-sm">
                  <Link to="/appointments">
                    View All
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Status Pills */}
              <div className="flex items-center gap-2 px-5 py-3 bg-slate-50/50 border-b overflow-x-auto">
                {[
                  { label: 'Completed', color: 'bg-blue-700', count: todayData?.by_status?.completed?.length || 0 },
                  { label: 'In Progress', color: 'bg-blue-500', count: todayData?.by_status?.in_progress?.length || 0 },
                  { label: 'Checked In', color: 'bg-blue-400', count: todayData?.by_status?.checked_in?.length || 0 },
                  { label: 'Confirmed', color: 'bg-slate-600', count: todayData?.by_status?.confirmed?.length || 0 },
                  { label: 'Scheduled', color: 'bg-slate-400', count: todayData?.by_status?.scheduled?.length || 0 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border shadow-sm whitespace-nowrap">
                    <div className={cn('h-2 w-2 rounded-full', item.color)} />
                    <span className="text-xs font-medium text-slate-600">{item.count}</span>
                    <span className="text-xs text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
              
              {/* Appointments List */}
              <div className="px-3 py-2">
                {todayLoading ? (
                  <div className="space-y-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-9 animate-pulse bg-slate-100 rounded-lg" />
                    ))}
                  </div>
                ) : todayData?.appointments?.length > 0 ? (
                  <div>
                    {/* Column Headers */}
                    <div className="flex items-center gap-3 px-3 py-1.5">
                      <span className="w-20 text-[11px] text-slate-400 font-medium uppercase tracking-wider">Time</span>
                      <span className="flex-1 text-[11px] text-slate-400 font-medium uppercase tracking-wider">Customer</span>
                      <span className="w-36 hidden sm:block text-[11px] text-slate-400 font-medium uppercase tracking-wider">Vehicle</span>
                      <span className="w-32 hidden md:block text-[11px] text-slate-400 font-medium uppercase tracking-wider">Service</span>
                      <span className="w-24 text-right text-[11px] text-slate-400 font-medium uppercase tracking-wider">Status</span>
                    </div>
                    {/* Rows */}
                    <div className="divide-y divide-slate-100">
                      {todayData.appointments.slice(0, 8).map((apt, index) => (
                        <Link
                          key={apt.id}
                          to={`/appointments/${apt.id}`}
                          className="flex items-center gap-3 py-2.5 px-3 transition-colors hover:bg-slate-50 rounded-lg group"
                        >
                          <div className="w-20 flex items-center gap-1.5">
                            {index === 0 && (
                              <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                            )}
                            <span className={cn("text-xs font-semibold text-slate-700 whitespace-nowrap", index !== 0 && "ml-3.5")}>
                              {formatTime12Hour(apt.scheduled_time)}
                            </span>
                          </div>
                          <span className="flex-1 min-w-0 text-sm font-medium text-slate-900 truncate group-hover:text-blue-700">
                            {apt.customer?.first_name} {apt.customer?.last_name}
                          </span>
                          <span className="w-36 hidden sm:block text-xs text-slate-500 truncate">
                            {apt.vehicle ? `${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}` : '—'}
                          </span>
                          <span className="w-32 hidden md:block text-xs text-slate-400 truncate">
                            {apt.services?.[0]?.name || '—'}
                          </span>
                          <div className="w-24 flex justify-end">
                            <Badge
                              className={cn(
                                'shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full',
                                getStatusColor(apt.display_status || apt.status)
                              )}
                              aria-label={`Status: ${(apt.display_status || apt.status).replace('_', ' ')}`}
                            >
                              {(apt.display_status || apt.status).replace('_', ' ')}
                            </Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 p-5 mb-4 shadow-inner">
                      <Calendar className="h-10 w-10 text-slate-300" />
                    </div>
                    <p className="font-semibold text-slate-900 text-lg">No appointments today</p>
                    <p className="text-sm text-slate-500 mt-1">Your schedule is clear for now</p>
                    <Button variant="outline" size="sm" asChild className="mt-4">
                      <Link to="/appointments">
                        Browse Schedule
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sentiment Chart */}
          {sentimentChartContent}
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-5">
          {/* AI Performance Card - Enhanced */}
          <Card data-tour="ai-agent" className="shadow-lg border-0 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900"></span>
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-white text-base">AI Agent</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">Performance this week</CardDescription>
                  </div>
                </div>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30">
                  Live
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {/* Main Stats */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="h-4 w-4 text-blue-400" />
                    <span className="text-xs text-slate-400">Calls Handled</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    <AnimatedNumber value={overview?.week?.calls ?? 0} />
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-400" />
                    <span className="text-xs text-slate-400">Bookings Made</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    <AnimatedNumber value={overview?.week?.ai_bookings ?? 0} />
                  </p>
                </div>
              </div>
              
              {/* Conversion Rate */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Conversion Rate</span>
                  <span className="text-lg font-bold text-blue-400">{overview?.week?.conversion_rate ?? 0}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden" role="progressbar" aria-valuenow={overview?.week?.conversion_rate ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label="Conversion rate">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(overview?.week?.conversion_rate ?? 0, 100)}%` }}
                  />
                </div>
              </div>
              
              {/* Additional Metrics */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-400">Avg. Duration</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{overview?.week?.avg_call_duration ?? '2:30'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smile className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-400">Satisfaction</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-400">{overview?.week?.satisfaction ?? '94'}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-400">New Customers</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{overview?.week?.new_customers ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Mini Calendar - Enhanced */}
          <Card data-tour="mini-calendar" className="shadow-lg border-0 overflow-hidden">
            <MiniCalendar />
          </Card>
          
        </div>
      </div>

      {/* AI Insights Panel */}
      <AIInsightsPanel />
    </div>
  )
}
