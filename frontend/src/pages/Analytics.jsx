import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { analytics } from '@/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { BarChart3, Clock, Activity } from 'lucide-react'

// Analytics sub-components
import StatCards from '@/components/analytics/StatCards'
import GaugeCards from '@/components/analytics/GaugeCards'
import RevenueTrend from '@/components/analytics/RevenueTrend'
import CallSentiment from '@/components/analytics/CallSentiment'
import ChartCards from '@/components/analytics/ChartCards'
import InsightsPanel from '@/components/analytics/InsightsPanel'
import SidebarCards from '@/components/analytics/SidebarCards'
import ConversionFunnel from '@/components/analytics/ConversionFunnel'
import ComparisonBar from '@/components/analytics/ComparisonBar'
import ServiceTrends from '@/components/analytics/ServiceTrends'
import ExportButton from '@/components/analytics/ExportButton'
import DateRangePicker from '@/components/analytics/DateRangePicker'
import DrillDownDialog from '@/components/analytics/DrillDownDialog'

export default function Analytics() {
  const [period, setPeriod] = useState('week')
  const [customRange, setCustomRange] = useState(undefined)
  const [drillDown, setDrillDown] = useState(null)

  // Build date params for custom range
  const customDates = period === 'custom' && customRange?.from && customRange?.to
    ? { startDate: format(customRange.from, 'yyyy-MM-dd'), endDate: format(customRange.to, 'yyyy-MM-dd') }
    : {}

  const queryEnabled = period !== 'custom' || (customRange?.from && customRange?.to)

  // Fetch all analytics data
  const { data: comprehensive, isLoading: compLoading } = useQuery({
    queryKey: ['analytics', 'comprehensive', period, customDates.startDate, customDates.endDate],
    queryFn: () => analytics.comprehensive(period, customDates),
    enabled: !!queryEnabled,
  })

  const { data: callTrends } = useQuery({
    queryKey: ['analytics', 'call-trends', period, customDates.startDate, customDates.endDate],
    queryFn: () => analytics.callTrends(period, customDates),
    enabled: !!queryEnabled,
  })

  const { data: insightsData, isLoading: insightsLoading } = useQuery({
    queryKey: ['analytics', 'insights'],
    queryFn: analytics.insights,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
  })

  const { data: bayStats } = useQuery({
    queryKey: ['analytics', 'bay-utilization'],
    queryFn: () => analytics.bayUtilization(),
  })

  return (
    <div className="space-y-4">
      {/* Page Header - Dark Theme */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 mb-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">Analytics</h1>
              <p className="text-xs text-slate-400">Business performance metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton comprehensive={comprehensive} />
            <DateRangePicker
              period={period}
              onPeriodChange={setPeriod}
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
            />
          </div>
        </div>
      </div>

      {/* Hero Stats Row */}
      <StatCards comprehensive={comprehensive} loading={compLoading} />

      {/* Circular Gauges Row */}
      <GaugeCards comprehensive={comprehensive} bayStats={bayStats} />

      {/* Charts + Insights Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <RevenueTrend comprehensive={comprehensive} onPointClick={setDrillDown} />
          <CallSentiment callTrends={callTrends} comprehensive={comprehensive} onPointClick={setDrillDown} />
        </div>
        <div className="space-y-4">
          <InsightsPanel insightsData={insightsData} loading={insightsLoading} />
          <ConversionFunnel comprehensive={comprehensive} />
        </div>
      </div>

      {/* Secondary Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <ChartCards comprehensive={comprehensive} />
        </div>
        <div className="space-y-4">
          <ComparisonBar comprehensive={comprehensive} />
          <ServiceTrends comprehensive={comprehensive} />
        </div>
      </div>

      {/* Bottom Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <SidebarCards comprehensive={comprehensive} />
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
                  <span className="hidden sm:inline">When calls come in by day and hour &bull; </span>
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

      {/* Drill-down dialog */}
      <DrillDownDialog drillDown={drillDown} onClose={() => setDrillDown(null)} />
    </div>
  )
}
