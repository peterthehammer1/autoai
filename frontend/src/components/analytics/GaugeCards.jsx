import { Card, CardContent } from '@/components/ui/card'
import { CircularProgress } from '@/components/ui/circular-progress'

const gauges = [
  { key: 'conversion', label: 'Conversion', sub: 'Calls to Bookings', color: 'emerald', getValue: (c) => c?.calls?.conversion_rate || 0 },
  { key: 'satisfaction', label: 'Satisfaction', sub: 'Customer CSAT', color: 'violet', getValue: (c) => c?.calls?.satisfaction_rate || 0 },
  { key: 'returning', label: 'Returning', sub: 'Repeat Customers', color: 'blue', getValue: (c) => c?.returning_rate || 0 },
  { key: 'utilization', label: 'Utilization', sub: 'Bay Capacity', color: 'slate', getValue: (c, b) => b?.overall?.utilization_percent || 0 },
]

export default function GaugeCards({ comprehensive, bayStats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {gauges.map(({ key, label, sub, color, getValue }) => (
        <Card key={key} className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <CircularProgress
                value={getValue(comprehensive, bayStats)}
                size={70}
                strokeWidth={6}
                color={color}
                showValue={false}
              />
              <div className="flex-1 min-w-0">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {getValue(comprehensive, bayStats)}%
                </p>
                <p className="text-xs sm:text-sm text-slate-500">{label}</p>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{sub}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
