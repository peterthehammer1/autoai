import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useDashboardTour } from '@/hooks/use-dashboard-tour'
import { analytics, appointments } from '@/api'
import { Card } from '@/components/ui/card'
import {
  Sun,
  Moon,
  Sunrise,
} from 'lucide-react'
import RescheduleDialog from '@/components/RescheduleDialog'
import { cn, getNextBusinessDay, isWeekend } from '@/lib/utils'
import AIInsightsPanel from '@/components/dashboard/AIInsightsPanel'
import SentimentChart from '@/components/dashboard/SentimentChart'
import TodaysSchedule from '@/components/dashboard/TodaysSchedule'
import AIAgentCard from '@/components/dashboard/AIAgentCard'
import RevenueGeneratedCard from '@/components/dashboard/RevenueGeneratedCard'
import MiniCalendar from '@/components/dashboard/MiniCalendar'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return { text: 'Good morning', icon: Sunrise, color: 'text-amber-500' }
  if (hour < 17) return { text: 'Good afternoon', icon: Sun, color: 'text-yellow-500' }
  return { text: 'Good evening', icon: Moon, color: 'text-indigo-500' }
}

export default function Dashboard() {
  const queryClient = useQueryClient()
  const [rescheduleAppointment, setRescheduleAppointment] = useState(null)
  const greeting = getGreeting()
  const GreetingIcon = greeting.icon

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => appointments.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'today'] })
      queryClient.invalidateQueries({ queryKey: ['appointments', 'month'] })
    },
  })

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: analytics.overview,
  })

  const isWeekendDay = isWeekend()
  const businessDate = isWeekendDay ? format(getNextBusinessDay(), 'yyyy-MM-dd') : null

  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['appointments', 'today', businessDate],
    queryFn: () => {
      if (businessDate) {
        return appointments.today(businessDate)
      }
      return appointments.today()
    },
  })

  const { data: insightsData, isLoading: insightsLoading } = useQuery({
    queryKey: ['analytics', 'insights'],
    queryFn: analytics.insights,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
  })

  const ready = !overviewLoading && !todayLoading && !insightsLoading
  const { startTour } = useDashboardTour(ready)

  const { data: callTrends } = useQuery({
    queryKey: ['analytics', 'call-trends', 'week'],
    queryFn: () => analytics.callTrends('week'),
  })

  const { data: aiRevenue } = useQuery({
    queryKey: ['analytics', 'ai-revenue'],
    queryFn: analytics.aiRevenue,
    refetchInterval: 15 * 60 * 1000,
    refetchIntervalInBackground: false,
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <div data-tour="dashboard-header" className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 pl-14 sm:px-6 lg:pl-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GreetingIcon className={cn("h-5 w-5", greeting.color)} aria-hidden="true" />
            <div>
              <h1 className="text-lg font-semibold text-white">{greeting.text}</h1>
              <p className="text-xs text-slate-400">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
                {isWeekendDay && (
                  <span className="ml-2 text-blue-400">
                    &middot; Showing {format(getNextBusinessDay(), 'EEEE')}'s schedule
                  </span>
                )}
              </p>
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
      <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <TodaysSchedule
            todayData={todayData}
            todayLoading={todayLoading}
            isWeekendDay={isWeekendDay}
            statusMutation={statusMutation}
            setRescheduleAppointment={setRescheduleAppointment}
          />

          <SentimentChart callTrends={callTrends} />
        </div>

        {/* Right Column - 1/3 width */}
        <div className="flex flex-col gap-5 min-h-0">
          <AIAgentCard overview={overview} />

          <RevenueGeneratedCard aiRevenue={aiRevenue} />

          {/* Mini Calendar - Enhanced */}
          <Card data-tour="mini-calendar" className="shadow-lg border-0 overflow-hidden flex-1 flex flex-col">
            <MiniCalendar />
          </Card>

        </div>
      </div>

      {/* AI Insights Panel */}
      <AIInsightsPanel insightsData={insightsData} />

      {/* Reschedule Dialog */}
      <RescheduleDialog
        appointment={rescheduleAppointment}
        open={!!rescheduleAppointment}
        onOpenChange={(open) => { if (!open) setRescheduleAppointment(null) }}
      />
    </div>
  )
}
