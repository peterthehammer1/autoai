import { format } from 'date-fns'
import { parseDateLocal } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PhoneCall } from 'lucide-react'

export default function CallSentiment({ callTrends, onPointClick }) {
  const data = callTrends?.sentiment_trend?.map(d => ({
    date: format(parseDateLocal(d.date), 'MMM d'),
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
    <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 h-full flex flex-col">
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
      <CardContent className="flex-1">
        <div className="h-56">
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
  )
}
