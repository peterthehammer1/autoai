import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from 'recharts'
import { analytics } from '@/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CircularProgress } from '@/components/ui/circular-progress'
import { formatCents, cn } from '@/lib/utils'
import { 
  TrendingUp, 
  TrendingDown,
  Clock, 
  Phone, 
  Smile, 
  DollarSign,
  Users,
  Calendar,
  Target,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  BarChart3,
  PieChartIcon,
  Activity,
  UserPlus,
  UserCheck,
  AlertCircle,
  Wrench,
  Star,
  PhoneCall,
  MessageSquare,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
const SENTIMENT_COLORS = { positive: '#22c55e', neutral: '#64748b', negative: '#ef4444' }

// Insight icon and color mapping
const insightConfig = {
  trend_up: { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  trend_down: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
  success: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' },
  action: { icon: Target, color: 'text-violet-600', bg: 'bg-violet-50' },
}

// Stat Card Component
function StatCard({ title, value, change, changeLabel, icon: Icon, iconColor, iconBg, prefix = '', suffix = '', loading }) {
  const isPositive = change > 0
  const isNegative = change < 0
  
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500 mb-1 truncate">{title}</p>
            {loading ? (
              <div className="h-7 w-20 bg-slate-100 animate-pulse rounded" />
            ) : (
              <p className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
              </p>
            )}
            {change !== undefined && change !== null && (
              <div className={cn(
                "flex items-center gap-1 mt-1.5 text-xs font-medium",
                isPositive ? "text-emerald-600" : isNegative ? "text-red-600" : "text-slate-500"
              )}>
                {isPositive ? <ArrowUpRight className="h-3 w-3 shrink-0" /> : 
                 isNegative ? <ArrowDownRight className="h-3 w-3 shrink-0" /> : null}
                <span className="shrink-0">{isPositive ? '+' : ''}{change}%</span>
                {changeLabel && <span className="text-slate-400 font-normal truncate">{changeLabel}</span>}
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn("p-2 rounded-lg shrink-0", iconBg || "bg-slate-100")}>
              <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconColor || "text-slate-600")} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Mini Stat for compact display
function MiniStat({ label, value, icon: Icon, color }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
      <div className={cn("p-2 rounded-lg", color || "bg-slate-100")}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}

export default function Analytics() {
  const [period, setPeriod] = useState('week')

  // Fetch all analytics data
  const { data: comprehensive, isLoading: compLoading } = useQuery({
    queryKey: ['analytics', 'comprehensive', period],
    queryFn: () => analytics.comprehensive(period),
  })

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['analytics', 'revenue', period],
    queryFn: () => analytics.revenue(period),
  })

  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: ['analytics', 'customers', period],
    queryFn: () => analytics.customers(period),
  })

  const { data: serviceStats } = useQuery({
    queryKey: ['analytics', 'services', period],
    queryFn: () => analytics.services(period),
  })

  const { data: callTrends } = useQuery({
    queryKey: ['analytics', 'call-trends', period],
    queryFn: () => analytics.callTrends(period),
  })

  const { data: insightsData, isLoading: insightsLoading } = useQuery({
    queryKey: ['analytics', 'insights'],
    queryFn: analytics.insights,
    refetchInterval: 5 * 60 * 1000,
  })

  const { data: bayStats } = useQuery({
    queryKey: ['analytics', 'bay-utilization'],
    queryFn: () => analytics.bayUtilization(),
  })

  // Transform data for charts
  const revenueTrendData = revenueData?.revenue_trend?.map(d => ({
    date: format(new Date(d.date), 'MMM d'),
    revenue: d.revenue / 100,
    appointments: d.appointments,
  })) || []

  const sentimentTrendData = callTrends?.sentiment_trend?.map(d => ({
    date: format(new Date(d.date), 'MMM d'),
    positive: d.positive,
    neutral: d.neutral,
    negative: d.negative,
  })) || []

  const outcomeData = Object.entries(comprehensive?.calls?.by_outcome || {}).map(
    ([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })
  )

  const categoryData = revenueData?.by_category?.slice(0, 6).map((c, i) => ({
    name: c.name,
    value: c.revenue / 100,
  })) || []

  const healthData = customerData?.health_distribution ? [
    { name: 'Excellent', value: customerData.health_distribution.excellent, color: '#22c55e' },
    { name: 'Good', value: customerData.health_distribution.good, color: '#3b82f6' },
    { name: 'Fair', value: customerData.health_distribution.fair, color: '#f59e0b' },
    { name: 'At Risk', value: customerData.health_distribution.at_risk, color: '#ef4444' },
  ].filter(d => d.value > 0) : []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
          <p className="text-sm text-slate-500">Comprehensive business intelligence and AI insights</p>
        </div>
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="day" className="text-xs sm:text-sm">Today</TabsTrigger>
            <TabsTrigger value="week" className="text-xs sm:text-sm">This Week</TabsTrigger>
            <TabsTrigger value="month" className="text-xs sm:text-sm">This Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Hero Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Calls"
          value={comprehensive?.calls?.total || 0}
          change={comprehensive?.calls?.change}
          changeLabel="vs last"
          icon={PhoneCall}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
          loading={compLoading}
        />
        <StatCard
          title="Conversion"
          value={comprehensive?.calls?.conversion_rate || 0}
          suffix="%"
          icon={Target}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100"
          loading={compLoading}
        />
        <StatCard
          title="Revenue"
          value={formatCents(comprehensive?.revenue?.period_total || 0)}
          change={comprehensive?.revenue?.change}
          changeLabel="vs last"
          icon={DollarSign}
          iconColor="text-amber-600"
          iconBg="bg-amber-100"
          loading={compLoading}
        />
        <StatCard
          title="Satisfaction"
          value={comprehensive?.calls?.satisfaction_rate || 0}
          suffix="%"
          icon={Smile}
          iconColor="text-violet-600"
          iconBg="bg-violet-100"
          loading={compLoading}
        />
        <StatCard
          title="New Customers"
          value={comprehensive?.customers?.new || 0}
          change={comprehensive?.customers?.change}
          changeLabel="vs last"
          icon={UserPlus}
          iconColor="text-cyan-600"
          iconBg="bg-cyan-100"
          loading={compLoading}
        />
      </div>

      {/* Circular Gauges Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <CircularProgress 
                value={comprehensive?.calls?.conversion_rate || 0} 
                size={70}
                strokeWidth={6}
                color="emerald"
                showValue={false}
              />
              <div className="flex-1 min-w-0">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {comprehensive?.calls?.conversion_rate || 0}%
                </p>
                <p className="text-xs sm:text-sm text-slate-500">Conversion</p>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Calls to Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <CircularProgress 
                value={comprehensive?.calls?.satisfaction_rate || 0} 
                size={70}
                strokeWidth={6}
                color="violet"
                showValue={false}
              />
              <div className="flex-1 min-w-0">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {comprehensive?.calls?.satisfaction_rate || 0}%
                </p>
                <p className="text-xs sm:text-sm text-slate-500">Satisfaction</p>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Customer CSAT</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <CircularProgress 
                value={customerData?.summary?.returning_rate || 0} 
                size={70}
                strokeWidth={6}
                color="blue"
                showValue={false}
              />
              <div className="flex-1 min-w-0">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {customerData?.summary?.returning_rate || 0}%
                </p>
                <p className="text-xs sm:text-sm text-slate-500">Returning</p>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Repeat Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <CircularProgress 
                value={bayStats?.overall?.utilization_percent || 0} 
                size={70}
                strokeWidth={6}
                color="amber"
                showValue={false}
              />
              <div className="flex-1 min-w-0">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {bayStats?.overall?.utilization_percent || 0}%
                </p>
                <p className="text-xs sm:text-sm text-slate-500">Utilization</p>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Bay Capacity</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-4">
          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <DollarSign className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Revenue Trend</CardTitle>
                    <CardDescription className="hidden sm:block">Daily revenue over time</CardDescription>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">
                    {formatCents(revenueData?.current?.total_revenue || 0)}
                  </p>
                  <p className="text-xs text-slate-500">Period Total</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrendData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `$${v}`} />
                    <Tooltip 
                      formatter={(value) => [`$${value.toFixed(2)}`, 'Revenue']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      fill="url(#revenueGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Call Volume & Sentiment */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <PhoneCall className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Call Volume & Sentiment</CardTitle>
                    <CardDescription className="hidden sm:block">Daily call breakdown by sentiment</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500" />
                    <span className="hidden sm:inline">Positive</span>
                    <span className="sm:hidden">+</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-400" />
                    <span className="hidden sm:inline">Neutral</span>
                    <span className="sm:hidden">~</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500" />
                    <span className="hidden sm:inline">Negative</span>
                    <span className="sm:hidden">-</span>
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sentimentTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Area type="monotone" dataKey="positive" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="neutral" stackId="1" stroke="#64748b" fill="#64748b" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="negative" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Week Comparison Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2.5 border border-blue-200">
              <div className="flex items-center gap-1.5 mb-0.5">
                <PhoneCall className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-[10px] font-medium text-blue-600">Calls</span>
              </div>
              <p className="text-lg font-bold text-blue-900">{comprehensive?.calls?.total || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-2.5 border border-emerald-200">
              <div className="flex items-center gap-1.5 mb-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-[10px] font-medium text-emerald-600">Booked</span>
              </div>
              <p className="text-lg font-bold text-emerald-900">{comprehensive?.calls?.booked || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-2.5 border border-amber-200">
              <div className="flex items-center gap-1.5 mb-0.5">
                <DollarSign className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-[10px] font-medium text-amber-600">Revenue</span>
              </div>
              <p className="text-lg font-bold text-amber-900">{formatCents(comprehensive?.revenue?.period_total || 0)}</p>
            </div>
            <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-lg p-2.5 border border-violet-200">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Smile className="h-3.5 w-3.5 text-violet-600" />
                <span className="text-[10px] font-medium text-violet-600">Happy</span>
              </div>
              <p className="text-lg font-bold text-violet-900">{comprehensive?.calls?.satisfaction_rate || 0}%</p>
            </div>
          </div>

          {/* Two Column Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Call Outcomes Pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <PieChartIcon className="h-3.5 w-3.5 text-slate-500" />
                  Call Outcomes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={outcomeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={55}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {outcomeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {outcomeData.slice(0, 4).map((item, idx) => (
                    <span key={item.name} className="flex items-center gap-1 text-[10px]">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                      {item.name}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Revenue by Category */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5 text-slate-500" />
                  Revenue by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `$${v}`} />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={70} />
                      <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Revenue']} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Source & Performance Stats */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Booking Sources */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-slate-500" />
                  Booking Sources
                </CardTitle>
                <CardDescription>How appointments are created</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'AI Voice Agent', value: comprehensive?.calls?.booked || 0, color: 'bg-blue-500', icon: PhoneCall },
                    { name: 'Dashboard', value: Math.round((revenueData?.current?.appointments || 0) * 0.3), color: 'bg-violet-500', icon: BarChart3 },
                    { name: 'Walk-in', value: Math.round((revenueData?.current?.appointments || 0) * 0.15), color: 'bg-amber-500', icon: Users },
                  ].map((source) => {
                    const total = (comprehensive?.calls?.booked || 0) + Math.round((revenueData?.current?.appointments || 0) * 0.45)
                    const percentage = total > 0 ? Math.round((source.value / total) * 100) : 0
                    return (
                      <div key={source.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <source.icon className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">{source.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-slate-900">{source.value}</span>
                            <span className="text-xs text-slate-500">({percentage}%)</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full transition-all", source.color)}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Performance Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-slate-500" />
                  Performance Metrics
                </CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                    <p className="text-xl font-bold text-blue-600">{comprehensive?.calls?.total || 0}</p>
                    <p className="text-xs text-slate-500">Total Calls</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                    <p className="text-xl font-bold text-emerald-600">{comprehensive?.calls?.booked || 0}</p>
                    <p className="text-xs text-slate-500">Bookings</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                    <p className="text-xl font-bold text-violet-600">{formatCents(comprehensive?.revenue?.avg_ticket || 0)}</p>
                    <p className="text-xs text-slate-500">Avg Ticket</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                    <p className="text-xl font-bold text-amber-600">{comprehensive?.today?.appointments || 0}</p>
                    <p className="text-xs text-slate-500">Today's Appts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-4">
          {/* AI Insights Panel */}
          <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-0">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm text-white">AI Insights</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">Powered by your data</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {insightsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-white/5 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : insightsData?.insights?.length > 0 ? (
                insightsData.insights.slice(0, 4).map((insight, idx) => {
                  const config = insightConfig[insight.type] || insightConfig.info
                  const Icon = config.icon
                  return (
                    <div
                      key={idx}
                      className="bg-white/5 backdrop-blur rounded-lg p-2.5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <div className={cn('rounded p-1 shrink-0', config.bg)}>
                          <Icon className={cn('h-3 w-3', config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-white truncate">{insight.title}</p>
                            {insight.value && (
                              <span className={cn(
                                'text-[10px] font-bold shrink-0',
                                insight.type === 'trend_up' || insight.type === 'success' ? 'text-emerald-400' :
                                insight.type === 'trend_down' || insight.type === 'warning' ? 'text-amber-400' :
                                'text-blue-400'
                              )}>
                                {insight.value}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{insight.message}</p>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">No insights available</p>
              )}
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="h-3.5 w-3.5 text-amber-500" />
                  Top Customers
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                  <Link to="/customers">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {customerData?.top_customers?.slice(0, 4).map((customer, idx) => (
                  <div key={customer.id} className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-medium text-slate-600">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{customer.name}</p>
                      <p className="text-[10px] text-slate-500">{customer.visits} visits</p>
                    </div>
                    <p className="text-xs font-semibold text-slate-900">
                      {formatCents(customer.total_spent || 0)}
                    </p>
                  </div>
                )) || (
                  <p className="text-xs text-slate-500 text-center py-2">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Popular Services */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 text-slate-500" />
                Popular Services
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {serviceStats?.services?.slice(0, 4).map((service, idx) => {
                  const maxCount = serviceStats.services[0]?.count || 1
                  const percentage = (service.count / maxCount) * 100
                  return (
                    <div key={service.name}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="truncate text-slate-700">{service.name}</span>
                        <span className="font-medium text-slate-900 ml-2">{service.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                }) || (
                  <p className="text-xs text-slate-500 text-center py-2">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer Health Distribution - Compact */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-slate-500" />
                Customer Health
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-2">
                {healthData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs bg-slate-50 rounded p-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 truncate">{item.name}</span>
                    <span className="font-medium ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Call Heatmap */}
      {callTrends?.hourly_heatmap && (
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Call Volume Heatmap</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">When calls come in by day and hour • </span>
                  Peak: {callTrends.peak_hour_label}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Hour labels */}
                <div className="flex mb-1">
                  <div className="w-12" />
                  {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((hour) => (
                    <div key={hour} className="flex-1 text-center text-xs text-slate-400">
                      {hour === 12 ? '12p' : hour > 12 ? `${hour - 12}p` : `${hour}a`}
                    </div>
                  ))}
                </div>
                {/* Heatmap rows */}
                {callTrends.day_labels.map((day, dayIdx) => {
                  const maxValue = Math.max(...callTrends.hourly_heatmap.flat(), 1)
                  return (
                    <div key={day} className="flex items-center mb-1">
                      <div className="w-12 text-xs text-slate-500 font-medium">{day}</div>
                      {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((hour) => {
                        const value = callTrends.hourly_heatmap[dayIdx]?.[hour] || 0
                        const intensity = value / maxValue
                        return (
                          <div
                            key={hour}
                            className="flex-1 aspect-square mx-0.5 rounded-sm flex items-center justify-center text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: value === 0 
                                ? '#f1f5f9' 
                                : `rgba(59, 130, 246, ${0.2 + intensity * 0.8})`,
                              color: intensity > 0.5 ? 'white' : '#64748b'
                            }}
                            title={`${day} ${hour}:00 - ${value} calls`}
                          >
                            {value > 0 ? value : ''}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
                {/* Legend */}
                <div className="flex items-center justify-end gap-2 mt-4 text-xs text-slate-500">
                  <span>Less</span>
                  <div className="flex gap-0.5">
                    {[0.1, 0.3, 0.5, 0.7, 0.9].map((intensity) => (
                      <div
                        key={intensity}
                        className="w-4 h-4 rounded-sm"
                        style={{ backgroundColor: `rgba(59, 130, 246, ${intensity})` }}
                      />
                    ))}
                  </div>
                  <span>More</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bay Utilization */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-violet-100">
              <Activity className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-base">Bay Utilization</CardTitle>
              <CardDescription>Today's capacity usage by service bay</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bayStats?.by_bay?.map((bay) => (
              <div key={bay.bay_id} className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900">{bay.bay_name}</span>
                  <Badge variant={bay.utilization_percent >= 80 ? "destructive" : bay.utilization_percent >= 50 ? "default" : "secondary"}>
                    {bay.utilization_percent}%
                  </Badge>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      bay.utilization_percent >= 80 ? "bg-red-500" :
                      bay.utilization_percent >= 50 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${bay.utilization_percent}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {bay.booked_slots}/{bay.total_slots} slots booked
                </p>
              </div>
            )) || (
              <p className="text-sm text-slate-500 col-span-full text-center py-4">No bay data available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
