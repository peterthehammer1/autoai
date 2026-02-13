import { format } from 'date-fns'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCents } from '@/lib/utils'
import { DollarSign } from 'lucide-react'

export default function RevenueTrend({ comprehensive, onPointClick }) {
  const data = comprehensive?.revenue_trend?.map(d => ({
    date: format(new Date(d.date), 'MMM d'),
    rawDate: d.date,
    revenue: d.revenue / 100,
    appointments: d.appointments,
  })) || []

  const handleClick = (payload) => {
    if (payload?.activePayload?.[0] && onPointClick) {
      const point = payload.activePayload[0].payload
      onPointClick({ type: 'revenue', date: point.rawDate, data: point })
    }
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-100">
              <DollarSign className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <CardTitle className="text-base">Revenue Trend</CardTitle>
              <CardDescription className="hidden sm:block">Daily revenue over time (click for details)</CardDescription>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xl sm:text-2xl font-bold text-slate-900">
              {formatCents(comprehensive?.revenue?.period_total || 0)}
            </p>
            <p className="text-xs text-slate-500">Period Total</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} onClick={handleClick}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
                animationDuration={800}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
