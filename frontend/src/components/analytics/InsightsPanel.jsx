import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Info, Target, Sparkles,
} from 'lucide-react'

const insightConfig = {
  trend_up: { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  trend_down: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
  success: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' },
  action: { icon: Target, color: 'text-violet-600', bg: 'bg-violet-50' },
}

export default function InsightsPanel({ insightsData, loading }) {
  return (
    <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-0 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-blue-300" />
          </div>
          <div>
            <CardTitle className="text-sm text-white">AI Insights</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Powered by your data</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-16 bg-white/5 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : insightsData?.insights?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {insightsData.insights.slice(0, 6).map((insight, idx) => {
              const config = insightConfig[insight.type] || insightConfig.info
              const Icon = config.icon
              return (
                <div
                  key={idx}
                  className="bg-white/5 backdrop-blur rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className={cn('rounded p-1 shrink-0', config.bg)}>
                      <Icon className={cn('h-3 w-3', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-white truncate">{insight.title}</p>
                        {insight.value && (
                          <span className={cn(
                            'text-[10px] font-bold shrink-0',
                            insight.type === 'trend_up' || insight.type === 'success' ? 'text-emerald-400' :
                            insight.type === 'trend_down' || insight.type === 'warning' ? 'text-amber-400' :
                            'text-blue-400'
                          )}>
                            {insight.value}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{insight.message}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-4">No insights available</p>
        )}
      </CardContent>
    </Card>
  )
}
