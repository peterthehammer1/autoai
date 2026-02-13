import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCents } from '@/lib/utils'
import { Star, Wrench, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function SidebarCards({ comprehensive }) {
  const healthData = comprehensive?.health_distribution ? [
    { name: 'Excellent', value: comprehensive.health_distribution.excellent, color: '#22c55e' },
    { name: 'Good', value: comprehensive.health_distribution.good, color: '#3b82f6' },
    { name: 'Fair', value: comprehensive.health_distribution.fair, color: '#f59e0b' },
    { name: 'New', value: comprehensive.health_distribution.new, color: '#8b5cf6' },
    { name: 'At Risk', value: comprehensive.health_distribution.at_risk, color: '#ef4444' },
  ].filter(d => d.value > 0) : []

  return (
    <>
      {/* Top Customers */}
      <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              Top Customers
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link to="/customers">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {comprehensive?.top_customers?.slice(0, 4).map((customer, idx) => (
              <div key={customer.id} className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-medium text-slate-600">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 truncate">{customer.name}</p>
                  <p className="text-[10px] text-slate-500">{customer.visits} visits</p>
                </div>
                <p className="text-xs font-semibold text-slate-900">
                  {formatCents(customer.total_spent || 0)}
                </p>
              </div>
            )) || (
              <p className="text-xs text-slate-500 text-center py-2">No data available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Popular Services */}
      <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wrench className="h-3.5 w-3.5 text-slate-500" />
            Popular Services
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {comprehensive?.top_services?.slice(0, 4).map((service) => {
              const maxCount = comprehensive.top_services[0]?.count || 1
              const percentage = (service.count / maxCount) * 100
              return (
                <div key={service.name}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="truncate text-slate-700">{service.name}</span>
                    <span className="font-medium text-slate-900 ml-2">{service.count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            }) || (
              <p className="text-xs text-slate-500 text-center py-2">No data available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customer Health Distribution */}
      <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-slate-500" />
            Customer Health
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-2">
            {healthData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs bg-slate-50 rounded p-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 truncate">{item.name}</span>
                <span className="font-medium ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
