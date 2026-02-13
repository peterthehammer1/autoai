import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCents } from '@/lib/utils'
import { Wrench } from 'lucide-react'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4']

export default function ServiceAnalysis({ comprehensive }) {
  const loading = !comprehensive
  const services = comprehensive?.top_services?.slice(0, 5).map((s, i) => ({
    name: s.name.length > 18 ? s.name.slice(0, 16) + '...' : s.name,
    fullName: s.name,
    count: s.count,
    revenue: s.revenue,
    fill: COLORS[i % COLORS.length],
  })) || []

  return (
    <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-100">
            <Wrench className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-base">Service Analysis</CardTitle>
            <CardDescription>Top services by volume & revenue</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <div className="h-40 bg-slate-100 animate-pulse rounded" />
            {[1, 2, 3].map(i => (
              <div key={i} className="h-6 bg-slate-100 animate-pulse rounded" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No service data available</p>
        ) : (
          <>
            <div className="h-40 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={services} layout="vertical" margin={{ left: 0 }}>
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={90} />
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${value} bookings (${formatCents(props.payload.revenue || 0)} revenue)`,
                      props.payload.fullName,
                    ]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} animationDuration={800} animationEasing="ease-out">
                    {services.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 border-t pt-3">
              {services.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.fill }} />
                    <span className="text-slate-700 truncate">{s.fullName}</span>
                  </div>
                  <span className="font-semibold text-slate-900 ml-2 shrink-0">{formatCents(s.revenue || 0)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
