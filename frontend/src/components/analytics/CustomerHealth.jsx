import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users } from 'lucide-react'

const HEALTH_COLORS = {
  Excellent: '#22c55e',
  Good: '#3b82f6',
  Fair: '#f59e0b',
  New: '#8b5cf6',
  'At Risk': '#ef4444',
}

export default function CustomerHealth({ comprehensive }) {
  const loading = !comprehensive
  const returningRate = comprehensive?.returning_rate || 0

  const healthData = comprehensive?.health_distribution ? [
    { name: 'Excellent', value: comprehensive.health_distribution.excellent },
    { name: 'Good', value: comprehensive.health_distribution.good },
    { name: 'Fair', value: comprehensive.health_distribution.fair },
    { name: 'New', value: comprehensive.health_distribution.new },
    { name: 'At Risk', value: comprehensive.health_distribution.at_risk },
  ].filter(d => d.value > 0) : []

  const total = healthData.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-violet-100">
            <Users className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <CardTitle className="text-base">Customer Health</CardTitle>
            <CardDescription>Distribution & retention</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <div className="space-y-3">
            <div className="h-36 bg-slate-100 animate-pulse rounded" />
            <div className="h-12 bg-slate-100 animate-pulse rounded" />
          </div>
        ) : healthData.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No health data available</p>
        ) : (
          <>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {healthData.map((entry) => (
                      <Cell key={entry.name} fill={HEALTH_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mb-3">
              {healthData.map((item) => (
                <span key={item.name} className="flex items-center gap-1 text-[10px]">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: HEALTH_COLORS[item.name] }} />
                  {item.name}: {item.value}
                </span>
              ))}
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center border">
              <p className="text-2xl font-bold text-slate-900">{returningRate}%</p>
              <p className="text-xs text-slate-500">Returning Customer Rate</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
