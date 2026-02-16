import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  CalendarCheck,
  Clock,
  Users,
  ArrowRight,
} from 'lucide-react'
import { formatCents } from '@/lib/utils'
import AnimatedNumber from '@/components/dashboard/AnimatedNumber'

function RevenueGeneratedCard({ aiRevenue }) {
  if (!aiRevenue) return null

  return (
    <Card className="shadow-lg border-0 overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/15">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base">Revenue Generated</CardTitle>
            <CardDescription>AI bookings last 30 days</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-3xl font-bold text-slate-900 mb-4">
          <AnimatedNumber value={aiRevenue.total_revenue} prefix="$" />
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-slate-600">Bookings made</span>
            </div>
            <span className="text-sm font-semibold text-slate-900">{aiRevenue.booking_count}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-slate-600">Staff hours saved</span>
            </div>
            <span className="text-sm font-semibold text-slate-900">{aiRevenue.hours_saved}h</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-slate-600">Repeat customers</span>
            </div>
            <span className="text-sm font-semibold text-slate-900">{aiRevenue.repeat_customers}</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t">
          <Button variant="outline" size="sm" asChild className="w-full gap-1.5">
            <Link to="/analytics">
              View Analytics
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default RevenueGeneratedCard
