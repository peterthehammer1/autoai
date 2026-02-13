import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCents } from '@/lib/utils'
import { TrendingUp } from 'lucide-react'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4']

export default function ServiceTrends({ comprehensive }) {
  const services = comprehensive?.top_services?.slice(0, 5).map((s, i) => ({
    name: s.name.length > 18 ? s.name.slice(0, 16) + '...' : s.name,
    fullName: s.name,
    count: s.count,
    revenue: s.revenue,
    fill: COLORS[i % COLORS.length],
  })) || []

  if (services.length === 0) return null

  return (
    <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
          Top Services
        </CardTitle>
        <CardDescription className="text-xs">By booking volume</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-44">
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
      </CardContent>
    </Card>
  )
}
