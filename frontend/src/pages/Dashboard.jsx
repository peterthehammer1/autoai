import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, getDay } from 'date-fns'
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
  Smile,
  Sun,
  Moon,
  Sunrise,
  ChevronLeft,
  ChevronRight,
  PhoneCall,
  Bot,
} from 'lucide-react'
import { cn, formatTime12Hour, getStatusColor, formatCents } from '@/lib/utils'
import CarImage from '@/components/CarImage'

// Get greeting based on time of day
function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return { text: 'Good morning', icon: Sunrise, color: 'text-amber-500' }
  if (hour < 17) return { text: 'Good afternoon', icon: Sun, color: 'text-yellow-500' }
  return { text: 'Good evening', icon: Moon, color: 'text-indigo-500' }
}

// Insight icon and color mapping - using sidebar teal theme
const insightConfig = {
  trend_up: { icon: TrendingUp, color: 'text-teal', bg: 'bg-teal-dark/10' },
  trend_down: { icon: TrendingDown, color: 'text-slate-600', bg: 'bg-slate-100' },
  success: { icon: CheckCircle2, color: 'text-teal', bg: 'bg-teal-dark/10' },
  warning: { icon: AlertTriangle, color: 'text-slate-600', bg: 'bg-slate-100' },
  info: { icon: Info, color: 'text-teal-medium', bg: 'bg-teal-medium/10' },
  action: { icon: Target, color: 'text-teal-light', bg: 'bg-teal-light/10' },
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
  })

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

  const stats = [
    {
      name: "Today's Appointments",
      value: overview?.today?.appointments ?? '0',
      change: '+12%',
      icon: Calendar,
      iconColor: 'text-teal-dark',
      bgClass: 'stat-blue',
    },
    {
      name: "AI Calls Handled",
      value: overview?.today?.calls ?? '0',
      change: '+8%',
      icon: Phone,
      iconColor: 'text-teal',
      bgClass: 'stat-green',
    },
    {
      name: 'Conversion Rate',
      value: overview?.week?.conversion_rate ? `${overview.week.conversion_rate}%` : '0%',
      change: '+5%',
      icon: TrendingUp,
      iconColor: 'text-teal-medium',
      bgClass: 'stat-purple',
    },
    {
      name: 'Revenue (MTD)',
      value: overview?.month?.revenue_booked
        ? formatCents(overview.month.revenue_booked)
        : '$0',
      change: '+18%',
      icon: DollarSign,
      iconColor: 'text-teal-light',
      bgClass: 'stat-amber',
    },
  ]

  // AI Insights Panel Component (reusable)
  const AIInsightsPanel = () => (
    insightsData?.insights?.length > 0 ? (
      <div className="bg-gradient-to-r from-teal-dark to-teal rounded-lg overflow-hidden shadow-card">
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">AI Insights</h2>
              <p className="text-xs text-white/60">Powered by your data</p>
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
                    <div className="rounded-lg p-1.5 shrink-0 bg-white/10">
                      <Icon className="h-4 w-4 text-white/80" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-white truncate">{insight.title}</p>
                        {insight.value && (
                          <span className="text-xs font-bold shrink-0 text-white/80">
                            {insight.value}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{insight.message}</p>
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-dark/10">
                <Smile className="h-4 w-4 text-teal" />
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
      <div className="bg-white border border-slate-200 overflow-hidden flex-1">
        <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-slate-500" />
            </button>
            <span className="text-sm font-medium text-slate-700">
              {format(calendarMonth, 'MMMM yyyy')}
            </span>
            <button 
              onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </div>
        <div className="p-2">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-[10px] font-medium text-slate-400 py-1">
                {day}
              </div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5">
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
                  className={cn(
                    'aspect-square flex flex-col items-center justify-center text-xs transition-colors relative',
                    isCurrentDay 
                      ? 'bg-teal-dark text-white font-medium' 
                      : 'hover:bg-slate-100 text-slate-700',
                    count > 0 && !isCurrentDay && 'font-medium'
                  )}
                >
                  <span>{format(day, 'd')}</span>
                  {count > 0 && (
                    <span className={cn(
                      'absolute bottom-0.5 w-1 h-1 rounded-full',
                      isCurrentDay ? 'bg-white' : 'bg-slate-400'
                    )} />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
        <div className="px-3 py-2 border-t border-slate-100 bg-slate-50">
          <p className="text-[10px] text-slate-500 text-center">Click a date to view appointments</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Welcome Header - With Teal Accent */}
      <div className="bg-gradient-to-r from-teal-dark to-teal -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 py-4 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">{greeting.text}</h1>
            <p className="text-sm text-white/70">
              {format(new Date(), 'EEEE, MMMM d, yyyy')} • {todayData?.summary?.total || 0} appointments today
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-light animate-pulse" />
            <span className="text-white/80">AI Agent Online</span>
          </div>
        </div>
      </div>

      {/* Stats Grid - Colorful */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const gradients = [
            'from-teal-dark to-teal',
            'from-emerald-dark to-emerald',
            'from-teal-medium to-teal-light',
            'from-amber-dark to-amber',
          ]
          return (
            <div
              key={stat.name}
              className={`bg-gradient-to-br ${gradients[index]} p-4 rounded-lg shadow-sm`}
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="h-4 w-4 text-white/70" />
                <span className="text-xs text-white/80 bg-white/20 px-1.5 py-0.5 rounded">{stat.change}</span>
              </div>
              <p className="text-xl font-semibold text-white">{stat.value}</p>
              <p className="text-sm text-white/70">{stat.name}</p>
            </div>
          )
        })}
      </div>

      {/* Sentiment Chart - Hidden on mobile, shown on desktop */}
      <div className="hidden sm:block">
        {sentimentChartContent}
      </div>

      {/* Main Content Grid - Equal height columns */}
      <div className="grid gap-4 lg:grid-cols-5 lg:items-stretch">
        {/* Left Column - 3/5 width - Single card with schedule + summary */}
        <div className="lg:col-span-3 bg-white border border-slate-200 overflow-hidden flex flex-col">
          {/* Today's Schedule Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
            <div>
              <h2 className="text-sm font-medium text-slate-700">Today's Schedule</h2>
              <p className="text-xs text-slate-500">
                {todayData?.summary?.total || 0} appointments
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-slate-600 hover:text-slate-800">
              <Link to="/appointments">
                View All
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          
          {/* Appointments List */}
          <div className="p-3 sm:p-4 flex-1">
            {todayLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse bg-slate-100" />
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
                      {apt.vehicle && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <CarImage 
                            make={apt.vehicle.make} 
                            model={apt.vehicle.model} 
                            year={apt.vehicle.year}
                            size="xs"
                          />
                          <span className="truncate">{apt.vehicle.year} {apt.vehicle.make} {apt.vehicle.model}</span>
                        </div>
                      )}
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
          
          {/* Status Summary - Bottom of card */}
          <div className="border-t border-slate-100 p-4 sm:p-5 bg-slate-50/50">
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: 'Completed', color: 'bg-teal-dark', count: todayData?.by_status?.completed?.length || 0 },
                { label: 'In Progress', color: 'bg-teal', count: todayData?.by_status?.in_progress?.length || 0 },
                { label: 'Checked In', color: 'bg-teal-medium', count: todayData?.by_status?.checked_in?.length || 0 },
                { label: 'Confirmed', color: 'bg-teal-light', count: todayData?.by_status?.confirmed?.length || 0 },
                { label: 'Scheduled', color: 'bg-slate-400', count: todayData?.by_status?.scheduled?.length || 0 },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className="text-lg font-bold text-slate-900">{item.count}</p>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <div className={cn('h-1.5 w-1.5 rounded-full', item.color)} />
                    <span className="text-[10px] text-slate-500">{item.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - 2/5 width */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* AI Performance Card - Professional */}
          <div className="bg-white border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-slate-700">AI Agent Performance</h2>
                <div className="flex items-center gap-1.5 text-xs text-green-600">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-green-500" />
                  Online
                </div>
              </div>
              <p className="text-xs text-slate-500">This week</p>
            </div>
            <div className="p-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-slate-800">{overview?.week?.calls ?? 0}</p>
                  <p className="text-xs text-slate-500">Calls Handled</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-slate-800">{overview?.week?.ai_bookings ?? 0}</p>
                  <p className="text-xs text-slate-500">Bookings Made</p>
                </div>
              </div>
              
              {/* Conversion Rate Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">Conversion Rate</span>
                  <span className="text-sm font-medium text-slate-700">{overview?.week?.conversion_rate ?? 0}%</span>
                </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-teal-dark rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(overview?.week?.conversion_rate ?? 0, 100)}%` }}
                  />
                </div>
              </div>
              
              {/* Additional Stats */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Avg. Call Duration</span>
                  <span className="text-slate-700">{overview?.week?.avg_call_duration ?? '2:30'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Satisfaction</span>
                  <span className="text-slate-700">{overview?.week?.satisfaction ?? '94'}%</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Mini Calendar */}
          <MiniCalendar />
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            icon: CheckCircle2,
            label: 'AI Bookings This Week',
            value: overview?.week?.ai_bookings ?? 0,
            iconColor: 'text-slate-400',
            bgColor: 'bg-white',
          },
          {
            icon: Phone,
            label: 'Total Calls This Week',
            value: overview?.week?.calls ?? 0,
            iconColor: 'text-slate-400',
            bgColor: 'bg-white',
          },
          {
            icon: Users,
            label: 'New Customers This Week',
            value: overview?.week?.new_customers ?? 0,
            iconColor: 'text-slate-400',
            bgColor: 'bg-white',
          },
        ].map((item) => (
          <div key={item.label} className="bg-white border border-slate-200 p-4 flex items-center gap-3">
            <item.icon className={cn('h-5 w-5', item.iconColor)} />
            <div>
              <p className="text-lg font-semibold text-slate-800">{item.value}</p>
              <p className="text-sm text-slate-500">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sentiment Chart - shown at bottom on mobile */}
      <div className="sm:hidden">
        {sentimentChartContent}
      </div>

      {/* AI Insights - at bottom so it doesn't cause layout shift when loading */}
      <AIInsightsPanel />
    </div>
  )
}
