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
import { formatCurrency, cn } from '@/lib/utils'
import { TrendingUp, Clock, Phone, Smile, Meh, Frown } from 'lucide-react'

const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899']
const SENTIMENT_COLORS = { positive: '#22c55e', neutral: '#64748b', negative: '#ef4444' }

export default function Analytics() {
  const [period, setPeriod] = useState('week')

  const { data: overview } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: analytics.overview,
  })

  const { data: appointmentStats } = useQuery({
    queryKey: ['analytics', 'appointments', period],
    queryFn: () => analytics.appointments(period),
  })

  const { data: callStats } = useQuery({
    queryKey: ['analytics', 'calls', period],
    queryFn: () => analytics.calls(period),
  })

  const { data: serviceStats } = useQuery({
    queryKey: ['analytics', 'services', period],
    queryFn: () => analytics.services(period),
  })

  const { data: bayStats } = useQuery({
    queryKey: ['analytics', 'bay-utilization'],
    queryFn: () => analytics.bayUtilization(),
  })

  const { data: callTrends } = useQuery({
    queryKey: ['analytics', 'call-trends', period],
    queryFn: () => analytics.callTrends(period),
  })

  // Transform data for charts
  const dailyChartData =
    appointmentStats?.daily?.map((d) => ({
      date: format(new Date(d.date), 'MMM d'),
      total: d.total,
      completed: d.completed,
      cancelled: d.cancelled,
    })) || []

  const outcomeData = Object.entries(callStats?.summary?.by_outcome || {}).map(
    ([name, value]) => ({ name, value })
  )

  const sourceData = Object.entries(appointmentStats?.summary?.by_source || {}).map(
    ([name, value]) => ({
      name: name === 'ai_agent' ? 'AI Agent' : name,
      value,
    })
  )

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-end">
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList>
            <TabsTrigger value="day">Today</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Appointments</p>
            <p className="text-3xl font-bold">
              {appointmentStats?.summary?.total ?? '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Calls</p>
            <p className="text-3xl font-bold">
              {callStats?.summary?.total_calls ?? '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Conversion Rate</p>
            <p className="text-3xl font-bold">
              {overview?.week?.conversion_rate ?? 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Revenue Booked</p>
            <p className="text-3xl font-bold">
              {formatCurrency(overview?.month?.revenue_booked ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Appointments</CardTitle>
            <CardDescription>Appointments by day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3b82f6" name="Total" />
                  <Bar dataKey="completed" fill="#22c55e" name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Call Outcomes */}
        <Card>
          <CardHeader>
            <CardTitle>Call Outcomes</CardTitle>
            <CardDescription>Distribution by outcome</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={outcomeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {outcomeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Booking Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Sources</CardTitle>
            <CardDescription>How appointments are created</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sourceData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="capitalize">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Popular Services */}
        <Card>
          <CardHeader>
            <CardTitle>Popular Services</CardTitle>
            <CardDescription>Most booked services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {serviceStats?.services?.slice(0, 5).map((service, idx) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                      {idx + 1}
                    </span>
                    <span className="truncate">{service.name}</span>
                  </div>
                  <span className="font-medium">{service.count}</span>
                </div>
              )) || <p className="text-muted-foreground">No data available</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sentiment Trend */}
      {callTrends?.sentiment_trend?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smile className="h-5 w-5 text-emerald-500" />
              Call Sentiment Trends
            </CardTitle>
            <CardDescription>
              Customer sentiment analysis over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={callTrends.sentiment_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(d) => format(new Date(d), 'MMM d')}
                    stroke="#94a3b8"
                  />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    labelFormatter={(d) => format(new Date(d), 'MMM d, yyyy')}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="positive" 
                    stackId="1" 
                    stroke="#22c55e" 
                    fill="#22c55e" 
                    fillOpacity={0.6}
                    name="Positive"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="neutral" 
                    stackId="1" 
                    stroke="#64748b" 
                    fill="#64748b" 
                    fillOpacity={0.6}
                    name="Neutral"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="negative" 
                    stackId="1" 
                    stroke="#ef4444" 
                    fill="#ef4444" 
                    fillOpacity={0.6}
                    name="Negative"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hourly Call Heatmap */}
      {callTrends?.hourly_heatmap && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Call Volume Heatmap
            </CardTitle>
            <CardDescription>
              When calls come in by day and hour • Peak time: {callTrends.peak_hour_label}
            </CardDescription>
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

      {/* Call Duration Trend */}
      {callTrends?.duration_trend?.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-violet-500" />
                Average Call Duration
              </CardTitle>
              <CardDescription>
                Duration trends in seconds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={callTrends.duration_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(d) => format(new Date(d), 'MMM d')}
                      stroke="#94a3b8"
                    />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      labelFormatter={(d) => format(new Date(d), 'MMM d, yyyy')}
                      formatter={(value) => [`${value}s`, 'Avg Duration']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="avg_duration" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                AI Performance Summary
              </CardTitle>
              <CardDescription>
                Key metrics at a glance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-slate-50 p-4 text-center">
                  <p className="text-3xl font-bold text-slate-900">{callTrends?.total_calls || 0}</p>
                  <p className="text-sm text-slate-500">Total Calls</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-600">
                    {overview?.week?.conversion_rate || 0}%
                  </p>
                  <p className="text-sm text-slate-500">Conversion Rate</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">
                    {callStats?.summary?.avg_duration_seconds 
                      ? `${Math.round(callStats.summary.avg_duration_seconds / 60)}m`
                      : '0m'}
                  </p>
                  <p className="text-sm text-slate-500">Avg Duration</p>
                </div>
                <div className="rounded-lg bg-violet-50 p-4 text-center">
                  <p className="text-3xl font-bold text-violet-600">
                    {callTrends?.peak_hour_label || '-'}
                  </p>
                  <p className="text-sm text-slate-500">Peak Hour</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bay Utilization */}
      <Card>
        <CardHeader>
          <CardTitle>Bay Utilization</CardTitle>
          <CardDescription>
            Today's capacity usage by service bay
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bayStats?.by_bay?.map((bay) => (
              <div key={bay.bay_id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{bay.bay_name}</span>
                  <span className="text-muted-foreground">
                    {bay.booked_slots}/{bay.total_slots} slots (
                    {bay.utilization_percent}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${bay.utilization_percent}%` }}
                  />
                </div>
              </div>
            )) || <p className="text-muted-foreground">No data available</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
