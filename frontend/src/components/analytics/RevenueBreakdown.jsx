import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCents, cn } from '@/lib/utils'
import { BarChart3 } from 'lucide-react'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function RevenueBreakdown({ comprehensive }) {
  const [tab, setTab] = useState('category')
  const loading = !comprehensive

  const categoryData = comprehensive?.by_category?.slice(0, 6).map((c) => ({
    name: c.name,
    value: c.revenue / 100,
  })) || []

  const outcomeData = Object.entries(comprehensive?.calls?.by_outcome || {}).map(
    ([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })
  )

  return (
    <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Revenue Breakdown</CardTitle>
              <CardDescription className="hidden sm:block">Category revenue & call outcomes</CardDescription>
            </div>
          </div>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setTab('category')}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                tab === 'category' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              By Category
            </button>
            <button
              onClick={() => setTab('outcomes')}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                tab === 'outcomes' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Outcomes
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-48 bg-slate-100 animate-pulse rounded" />
        ) : tab === 'category' ? (
          categoryData.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No category data available</p>
          ) : (
            <div className="h-48">
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
          )
        ) : (
          outcomeData.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No outcome data available</p>
          ) : (
            <div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={outcomeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
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
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {outcomeData.map((item, idx) => (
                  <span key={item.name} className="flex items-center gap-1 text-[10px]">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    {item.name}: {item.value}
                  </span>
                ))}
              </div>
            </div>
          )
        )}
      </CardContent>
    </Card>
  )
}
