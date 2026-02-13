import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn, formatCents } from '@/lib/utils'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

const metrics = [
  {
    key: 'calls',
    label: 'Calls',
    color: 'bg-blue-500',
    getCurrent: (c) => c?.calls?.total || 0,
    getChange: (c) => c?.calls?.change || 0,
    format: (v) => v.toLocaleString(),
  },
  {
    key: 'revenue',
    label: 'Revenue',
    color: 'bg-emerald-500',
    getCurrent: (c) => c?.revenue?.period_total || 0,
    getChange: (c) => c?.revenue?.change || 0,
    format: (v) => formatCents(v),
  },
  {
    key: 'customers',
    label: 'New Customers',
    color: 'bg-violet-500',
    getCurrent: (c) => c?.customers?.new || 0,
    getChange: (c) => c?.customers?.change || 0,
    format: (v) => v.toLocaleString(),
  },
  {
    key: 'conversion',
    label: 'Conversion',
    color: 'bg-amber-500',
    getCurrent: (c) => c?.calls?.conversion_rate || 0,
    getChange: () => 0, // no previous conversion rate directly available
    format: (v) => `${v}%`,
  },
]

export default function ComparisonBar({ comprehensive }) {
  if (!comprehensive) return null

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-white/20 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Period Comparison</CardTitle>
        <CardDescription>Current vs previous period</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map(({ key, label, color, getCurrent, getChange, format: fmt }) => {
            const current = getCurrent(comprehensive)
            const change = getChange(comprehensive)
            // Derive previous from change percentage: current = prev * (1 + change/100)
            const previous = change !== 0 ? Math.round(current / (1 + change / 100)) : current
            const maxVal = Math.max(current, previous, 1)
            const isUp = change > 0
            const isDown = change < 0

            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-600">{label}</span>
                  {change !== 0 && (
                    <span className={cn(
                      "flex items-center gap-0.5 text-xs font-semibold",
                      isUp ? "text-emerald-600" : "text-red-600"
                    )}>
                      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {isUp ? '+' : ''}{change}%
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-12">Current</span>
                    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", color)}
                        style={{ width: `${(current / maxVal) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-900 w-16 text-right">{fmt(current)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-12">Previous</span>
                    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-300 rounded-full transition-all duration-500"
                        style={{ width: `${(previous / maxVal) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-500 w-16 text-right">{fmt(previous)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
