import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCents } from '@/lib/utils'
import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function TopCustomers({ comprehensive }) {
  const loading = !comprehensive
  const customers = comprehensive?.top_customers?.slice(0, 5) || []

  return (
    <Card className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-100">
              <Star className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base">Top Customers</CardTitle>
              <CardDescription>By total spend</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link to="/customers">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-7 w-7 bg-slate-100 animate-pulse rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-24 bg-slate-100 animate-pulse rounded" />
                  <div className="h-2.5 w-16 bg-slate-100 animate-pulse rounded" />
                </div>
                <div className="h-3 w-14 bg-slate-100 animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No customer data available</p>
        ) : (
          <div className="space-y-3">
            {customers.map((customer, idx) => (
              <div key={customer.id} className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{customer.name}</p>
                  <p className="text-[11px] text-slate-500">{customer.visits} visits</p>
                </div>
                <p className="text-sm font-semibold text-slate-900 shrink-0">
                  {formatCents(customer.total_spent || 0)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
