import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCents, cn } from '@/lib/utils'
import {
  PieChart as PieChartIcon, BarChart3, Target, PhoneCall, Users, Zap, DollarSign, Smile,
} from 'lucide-react'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function ChartCards({ comprehensive }) {
  const outcomeData = Object.entries(comprehensive?.calls?.by_outcome || {}).map(
    ([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })
  )

  const categoryData = comprehensive?.by_category?.slice(0, 6).map((c) => ({
    name: c.name,
    value: c.revenue / 100,
  })) || []

  return (
    <>
      {/* Pie + Bar row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Call Outcomes Pie */}
        <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChartIcon className="h-3.5 w-3.5 text-slate-500" />
              Call Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={outcomeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {outcomeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {outcomeData.slice(0, 4).map((item, idx) => (
                <span key={item.name} className="flex items-center gap-1 text-[10px]">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                  {item.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Category */}
        <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-slate-500" />
              Revenue by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={70} />
                  <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Revenue']} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} animationDuration={800} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Booking Sources + Performance row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Booking Sources */}
        <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-slate-500" />
              Booking Sources
            </CardTitle>
            <CardDescription>How appointments are created (estimated)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'AI Voice Agent', value: comprehensive?.calls?.booked || 0, color: 'bg-blue-500', icon: PhoneCall },
                { name: 'Dashboard', value: Math.round((comprehensive?.revenue?.appointments || 0) * 0.3), color: 'bg-violet-500', icon: BarChart3 },
                { name: 'Walk-in', value: Math.round((comprehensive?.revenue?.appointments || 0) * 0.15), color: 'bg-amber-500', icon: Users },
              ].map((source) => {
                const total = (comprehensive?.calls?.booked || 0) + Math.round((comprehensive?.revenue?.appointments || 0) * 0.45)
                const percentage = total > 0 ? Math.round((source.value / total) * 100) : 0
                return (
                  <div key={source.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <source.icon className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">{source.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900">{source.value}</span>
                        <span className="text-xs text-slate-500">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", source.color)}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-slate-500" />
              Performance Metrics
            </CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                <p className="text-xl font-bold text-blue-600">{comprehensive?.calls?.total || 0}</p>
                <p className="text-xs text-slate-500">Total Calls</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                <p className="text-xl font-bold text-emerald-600">{comprehensive?.calls?.booked || 0}</p>
                <p className="text-xs text-slate-500">Bookings</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                <p className="text-xl font-bold text-violet-600">{formatCents(comprehensive?.revenue?.avg_ticket || 0)}</p>
                <p className="text-xs text-slate-500">Avg Ticket</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                <p className="text-xl font-bold text-slate-600">{comprehensive?.today?.appointments || 0}</p>
                <p className="text-xs text-slate-500">Today's Appts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
