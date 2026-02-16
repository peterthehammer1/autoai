import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Phone,
  DollarSign,
  ArrowRight,
  AlertTriangle,
  Wrench,
} from 'lucide-react'
import { formatCents } from '@/lib/utils'
import AnimatedNumber from '@/components/dashboard/AnimatedNumber'

function MissedRevenueCard({ missedRevenue }) {
  if (!missedRevenue || missedRevenue.total <= 0) return null

  return (
    <Card className="shadow-lg border-0 overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-amber-50 to-orange-50 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/15">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base">Missed Revenue</CardTitle>
            <CardDescription>Estimated last 30 days</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-3xl font-bold text-slate-900 mb-4">
          <AnimatedNumber value={missedRevenue.total} prefix="$" />
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">Non-booked calls</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-slate-900">{formatCents(missedRevenue.non_booked_calls?.value)}</span>
              <span className="text-xs text-slate-400 ml-1">({missedRevenue.non_booked_calls?.count})</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">Overdue services</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-slate-900">{formatCents(missedRevenue.overdue_services?.value)}</span>
              <span className="text-xs text-slate-400 ml-1">({missedRevenue.overdue_services?.count})</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">Cancellations</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-slate-900">{formatCents(missedRevenue.cancellations?.value)}</span>
              <span className="text-xs text-slate-400 ml-1">({missedRevenue.cancellations?.count})</span>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t">
          <Button variant="outline" size="sm" asChild className="w-full gap-1.5">
            <Link to="/customers">
              View Customers
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default MissedRevenueCard
