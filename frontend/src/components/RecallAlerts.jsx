import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { analytics } from '@/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, AlertTriangle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function RecallAlerts() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'recall-alerts'],
    queryFn: analytics.recallAlerts,
    staleTime: 30 * 60 * 1000, // 30 min
    refetchIntervalInBackground: false,
  })

  const alerts = data?.alerts || []

  return (
    <Card className="shadow-lg border-0 overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-amber-50 to-orange-50/50 border-b">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
            <Shield className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-base">Recall Alerts</CardTitle>
            <CardDescription>Vehicles with open recalls</CardDescription>
          </div>
          {alerts.length > 0 && (
            <Badge className="ml-auto bg-red-100 text-red-700 hover:bg-red-100">
              {alerts.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse bg-slate-100 rounded" />
            ))}
          </div>
        ) : alerts.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {alerts.slice(0, 5).map((alert, idx) => (
              <Link
                key={idx}
                to={`/customers/${alert.customer_id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group"
              >
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-700">
                    {alert.customer_name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {alert.vehicle} — {alert.recall_count} recall{alert.recall_count > 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Shield className="h-8 w-8 text-emerald-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">No open recalls</p>
            <p className="text-xs text-slate-400 mt-0.5">All vehicles are clear</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
