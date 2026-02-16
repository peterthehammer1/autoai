import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Phone,
  Users,
  CheckCircle2,
  Clock,
  Smile,
  Bot,
} from 'lucide-react'
import AnimatedNumber from '@/components/dashboard/AnimatedNumber'

function AIAgentCard({ overview }) {
  return (
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
  )
}

export default AIAgentCard
