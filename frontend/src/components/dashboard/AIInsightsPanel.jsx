import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Info,
  Target,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const insightConfig = {
  trend_up: { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  trend_down: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
  success: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' },
  action: { icon: Target, color: 'text-violet-600', bg: 'bg-violet-50' },
}

function AIInsightsPanel({ insightsData }) {
  if (!insightsData?.insights?.length) return null

  return (
    <div data-tour="ai-insights" className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg overflow-hidden shadow-card">
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-600 to-slate-700">
            <Sparkles className="h-4 w-4 text-blue-300" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">AI Insights</h2>
            <p className="text-xs text-slate-400">Powered by your data</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {insightsData.insights.slice(0, 6).map((insight, idx) => {
            const config = insightConfig[insight.type] || insightConfig.info
            const Icon = config.icon
            return (
              <div
                key={idx}
                className="bg-white/5 backdrop-blur rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={cn('rounded-lg p-1.5 shrink-0', config.bg)}>
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white truncate">{insight.title}</p>
                      {insight.value && (
                        <span className={cn(
                          'text-xs font-bold shrink-0',
                          insight.type === 'trend_up' || insight.type === 'success' ? 'text-emerald-400' :
                          insight.type === 'trend_down' || insight.type === 'warning' ? 'text-amber-400' :
                          'text-blue-400'
                        )}>
                          {insight.value}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{insight.message}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AIInsightsPanel
