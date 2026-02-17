import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCents } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

const steps = [
  { key: 'calls', label: 'Total Calls', gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-700' },
  { key: 'booked', label: 'Booked', gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  { key: 'appointments', label: 'Completed', gradient: 'from-violet-500 to-violet-600', bg: 'bg-violet-50', text: 'text-violet-700' },
  { key: 'revenue', label: 'Revenue', gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', text: 'text-amber-700' },
]

export default function ConversionFunnel({ comprehensive }) {
  const [animate, setAnimate] = useState(false)
  const loading = !comprehensive

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setAnimate(true), 100)
      return () => clearTimeout(timer)
    }
  }, [loading])

  const values = loading ? [0, 0, 0, 0] : [
    comprehensive.calls?.total || 0,
    comprehensive.calls?.booked || 0,
    comprehensive.revenue?.appointments || 0,
    comprehensive.revenue?.period_total || 0,
  ]

  const maxVal = Math.max(values[0], 1)
  const widths = values.map((v, i) => {
    if (i === 3) return values[2] > 0 ? (values[2] / maxVal) * 100 : 5
    return Math.max((v / maxVal) * 100, 5)
  })

  const rates = []
  for (let i = 1; i < values.length; i++) {
    if (i === 3) {
      rates.push(values[2] > 0 ? formatCents(Math.round(values[3] / values[2])) + '/appt' : '-')
    } else {
      rates.push(values[i - 1] > 0 ? Math.round((values[i] / values[i - 1]) * 100) + '%' : '-')
    }
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Conversion Funnel</CardTitle>
        <CardDescription>Call to revenue pipeline</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={step.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-600">{step.label}</span>
                {loading ? (
                  <div className="h-4 w-12 bg-slate-100 animate-pulse rounded" />
                ) : (
                  <span className={`text-sm font-bold ${step.text}`}>
                    {i === 3 ? formatCents(values[i]) : values[i].toLocaleString()}
                  </span>
                )}
              </div>
              {loading ? (
                <div className="h-7 bg-slate-100 animate-pulse rounded-full" />
              ) : (
                <div className="h-7 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${step.gradient} rounded-full transition-all duration-700 ease-out`}
                    style={{ width: animate ? `${widths[i]}%` : '0%' }}
                  />
                </div>
              )}
              {i < steps.length - 1 && (
                <div className="flex items-center justify-center my-1">
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                  <span className="text-xs text-slate-500 ml-1">
                    {loading ? '...' : rates[i]}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
