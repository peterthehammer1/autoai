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
import RevenueTrend from '@/components/analytics/RevenueTrend'
import CallSentiment from '@/components/analytics/CallSentiment'
import InsightsPanel from '@/components/analytics/InsightsPanel'
import ServiceAnalysis from '@/components/analytics/ServiceAnalysis'
import RevenueBreakdown from '@/components/analytics/RevenueBreakdown'
import ConversionFunnel from '@/components/analytics/ConversionFunnel'
import TopCustomers from '@/components/analytics/TopCustomers'
import CustomerHealth from '@/components/analytics/CustomerHealth'
import ComparisonBar from '@/components/analytics/ComparisonBar'
import ExportButton from '@/components/analytics/ExportButton'
import DateRangePicker from '@/components/analytics/DateRangePicker'
import DrillDownDialog from '@/components/analytics/DrillDownDialog'

export default function Analytics() {
  const [period, setPeriod] = useState('month')
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

  const { data: targetsData } = useQuery({
    queryKey: ['analytics', 'targets'],
    queryFn: analytics.getTargets,
  })
  const targets = targetsData?.targets || []
  const revenueTarget = targets.find(t => t.metric_name === 'revenue')?.target_value

  return (
    <div className="space-y-6">
      {/* Section 0: Page Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 pl-14 sm:px-6 lg:pl-6 py-4 mb-2">
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

      {/* Section 1: KPI Strip */}
      <StatCards comprehensive={comprehensive} loading={compLoading} targets={targets} />

      {/* Section 2: Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2 items-stretch">
        <RevenueTrend comprehensive={comprehensive} onPointClick={setDrillDown} revenueTarget={revenueTarget} />
        <CallSentiment callTrends={callTrends} onPointClick={setDrillDown} />
      </div>

      {/* Section 3: AI Insights */}
      <InsightsPanel insightsData={insightsData} loading={insightsLoading} />

      {/* Section 4: Service & Bay Analysis */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-stretch">
        <ServiceAnalysis comprehensive={comprehensive} />
        <RevenueBreakdown comprehensive={comprehensive} />
        <ConversionFunnel comprehensive={comprehensive} />
      </div>

      {/* Section 5: Customer Intelligence */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-stretch">
        <TopCustomers comprehensive={comprehensive} />
        <CustomerHealth comprehensive={comprehensive} />
        <ComparisonBar comprehensive={comprehensive} />
      </div>

      {/* Section 6: Call Heatmap */}
      <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
        <CardHeader className="pb-2 sm:pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Call Volume Heatmap</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                <span className="hidden sm:inline">When calls come in by day and hour</span>
                {callTrends?.peak_hour_label && (
                  <span>
                    <span className="hidden sm:inline"> &bull; </span>
                    Peak: {callTrends.peak_hour_label}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!callTrends?.hourly_heatmap ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className="h-8 bg-slate-100 animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <div className="pb-2">
              {(() => {
                const allHours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
                const mobileHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
                const formatHour = (h) => h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`
                const maxValue = Math.max(...callTrends.hourly_heatmap.flat(), 1)
                return (
                  <>
                    {/* Desktop Heatmap */}
                    <div className="hidden sm:block overflow-x-auto -mx-2 px-2">
                      <div className="min-w-[520px]">
                        <div className="flex mb-1">
                          <div className="w-12" />
                          {allHours.map((hour) => (
                            <div key={hour} className="flex-1 text-center text-xs text-slate-400">
                              {formatHour(hour)}
                            </div>
                          ))}
                        </div>
                        {callTrends.day_labels.map((day, dayIdx) => (
                          <div key={day} className="flex items-center mb-1">
                            <div className="w-12 text-xs text-slate-500 font-medium">{day}</div>
                            {allHours.map((hour) => {
                              const value = callTrends.hourly_heatmap[dayIdx]?.[hour] || 0
                              const intensity = value / maxValue
                              return (
                                <div
                                  key={hour}
                                  className="flex-1 aspect-square mx-0.5 rounded-sm flex items-center justify-center text-xs font-medium transition-colors"
                                  style={{
                                    backgroundColor: value === 0 ? '#f1f5f9' : `rgba(59, 130, 246, ${0.2 + intensity * 0.8})`,
                                    color: intensity > 0.5 ? 'white' : '#64748b'
                                  }}
                                  title={`${day} ${hour}:00 - ${value} calls`}
                                >
                                  {value > 0 ? value : ''}
                                </div>
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mobile Heatmap — business hours only */}
                    <div className="sm:hidden -mx-2 px-2">
                      <div className="flex mb-1">
                        <div className="w-10" />
                        {mobileHours.map((hour) => (
                          <div key={hour} className="flex-1 text-center text-[10px] text-slate-400">
                            {formatHour(hour)}
                          </div>
                        ))}
                      </div>
                      {callTrends.day_labels.map((day, dayIdx) => (
                        <div key={day} className="flex items-center mb-1">
                          <div className="w-10 text-[10px] text-slate-500 font-medium">{day.slice(0, 3)}</div>
                          {mobileHours.map((hour) => {
                            const value = callTrends.hourly_heatmap[dayIdx]?.[hour] || 0
                            const intensity = value / maxValue
                            return (
                              <div
                                key={hour}
                                className="flex-1 aspect-square mx-px rounded-sm flex items-center justify-center text-[10px] font-medium"
                                style={{
                                  backgroundColor: value === 0 ? '#f1f5f9' : `rgba(59, 130, 246, ${0.2 + intensity * 0.8})`,
                                  color: intensity > 0.5 ? 'white' : '#64748b'
                                }}
                              >
                                {value > 0 ? value : ''}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>

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
                  </>
                )
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 7: Bay Utilization */}
      <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
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
