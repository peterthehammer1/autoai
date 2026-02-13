import { format } from 'date-fns'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCents, cn } from '@/lib/utils'
import {
  PhoneCall, CheckCircle2, DollarSign, Smile,
} from 'lucide-react'

export default function CallSentiment({ callTrends, comprehensive, onPointClick }) {
  const data = callTrends?.sentiment_trend?.map(d => ({
    date: format(new Date(d.date), 'MMM d'),
    rawDate: d.date,
    positive: d.positive,
    neutral: d.neutral,
    negative: d.negative,
  })) || []

  const handleClick = (payload) => {
    if (payload?.activePayload?.[0] && onPointClick) {
      const point = payload.activePayload[0].payload
      onPointClick({ type: 'sentiment', date: point.rawDate, data: point })
    }
  }

  return (
    <>
      <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100">
                <PhoneCall className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Call Volume & Sentiment</CardTitle>
                <CardDescription className="hidden sm:block">Daily call breakdown by sentiment (click for details)</CardDescription>
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
              <AreaChart data={data} onClick={handleClick}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="positive" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} animationDuration={800} animationEasing="ease-out" />
                <Area type="monotone" dataKey="neutral" stackId="1" stroke="#64748b" fill="#64748b" fillOpacity={0.6} animationDuration={800} animationEasing="ease-out" />
                <Area type="monotone" dataKey="negative" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} animationDuration={800} animationEasing="ease-out" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Mini summary row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2.5 border border-blue-200">
          <div className="flex items-center gap-1.5 mb-0.5">
            <PhoneCall className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-[10px] font-medium text-blue-600">Calls</span>
          </div>
          <p className="text-lg font-bold text-blue-900">{comprehensive?.calls?.total || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-sky-50 to-sky-100 rounded-lg p-2.5 border border-sky-200">
          <div className="flex items-center gap-1.5 mb-0.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-sky-600" />
            <span className="text-[10px] font-medium text-sky-600">Booked</span>
          </div>
          <p className="text-lg font-bold text-sky-900">{comprehensive?.calls?.booked || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-2.5 border border-slate-200">
          <div className="flex items-center gap-1.5 mb-0.5">
            <DollarSign className="h-3.5 w-3.5 text-slate-600" />
            <span className="text-[10px] font-medium text-slate-600">Revenue</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{formatCents(comprehensive?.revenue?.period_total || 0)}</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-2.5 border border-indigo-200">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Smile className="h-3.5 w-3.5 text-indigo-600" />
            <span className="text-[10px] font-medium text-indigo-600">Happy</span>
          </div>
          <p className="text-lg font-bold text-indigo-900">{comprehensive?.calls?.satisfaction_rate || 0}%</p>
        </div>
      </div>
    </>
  )
}
