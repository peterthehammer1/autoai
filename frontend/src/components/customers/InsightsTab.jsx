import { TabsContent } from '@/components/ui/tabs'
import {
  AlertCircle,
  Wrench,
  Target,
} from 'lucide-react'

export default function InsightsTab({
  healthData,
}) {
  return (
    <TabsContent value="insights" className="m-0 p-4 sm:p-6">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2 text-sm sm:text-base">
        <Target className="h-4 w-4 text-slate-400" />
        AI-Powered Recommendations
      </h3>
      {healthData?.recommendations?.length > 0 ? (
        <div className="space-y-3">
          {healthData.recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-start gap-3"
            >
              {rec.type === 'action' && <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />}
              {rec.type === 'service' && <Wrench className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />}
              {rec.type === 'upsell' && <Target className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />}
              <div>
                <p className="font-medium text-blue-600 capitalize">{rec.type}</p>
                <p className="text-sm text-slate-600 mt-1">{rec.message}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-blue-50 rounded-lg">
          <Target className="h-12 w-12 text-blue-200 mx-auto mb-3" />
          <p className="text-slate-500">No recommendations available yet</p>
          <p className="text-xs text-slate-400 mt-1">More data needed to generate insights</p>
        </div>
      )}
    </TabsContent>
  )
}
