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
} from 'recharts'
import { analytics } from '@/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'

const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899']

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Performance metrics and insights
          </p>
        </div>
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
