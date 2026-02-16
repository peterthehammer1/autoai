import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { TabsContent } from '@/components/ui/tabs'
import {
  PhoneCall,
  MessageSquare,
  CheckCircle2,
  Bell,
  ThumbsUp,
  ThumbsDown,
  Minus,
  ArrowUpRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function InteractionsTab({
  interactionsData,
}) {
  return (
    <TabsContent value="interactions" className="m-0 p-4 sm:p-6">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2 text-sm sm:text-base">
        <MessageSquare className="h-4 w-4 text-slate-400" />
        Communication History
      </h3>
      {interactionsData?.interactions?.length > 0 ? (
        <div className="space-y-3">
          {interactionsData.interactions.map((interaction) => (
            <Link
              key={`${interaction.type}-${interaction.id}`}
              to={interaction.type === 'call' ? `/call-logs` : `/sms-logs`}
              className="block bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 bg-blue-50">
                  {interaction.type === 'call' ? (
                    <PhoneCall className="h-5 w-5 text-blue-600" />
                  ) : (
                    interaction.message_type === 'confirmation' ? (
                      <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    ) : interaction.message_type === 'reminder' ? (
                      <Bell className="h-5 w-5 text-blue-600" />
                    ) : (
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                    )
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 capitalize">
                        {interaction.type === 'call' ? 'Phone Call' : 'SMS'}
                      </span>
                      {interaction.type === 'call' && interaction.outcome && (
                        <Badge className="text-xs bg-blue-50 text-blue-600">
                          {interaction.outcome}
                        </Badge>
                      )}
                      {interaction.type === 'sms' && interaction.message_type && (
                        <Badge className="text-xs bg-blue-50 text-blue-600">
                          {interaction.message_type}
                        </Badge>
                      )}
                      {interaction.type === 'call' && interaction.sentiment && (
                        <span className="text-slate-400">
                          {interaction.sentiment === 'positive' ? (
                            <ThumbsUp className="h-3.5 w-3.5 text-blue-600" />
                          ) : interaction.sentiment === 'negative' ? (
                            <ThumbsDown className="h-3.5 w-3.5 text-blue-600" />
                          ) : (
                            <Minus className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {interaction.timestamp ? format(new Date(interaction.timestamp), 'MMM d, h:mm a') : '-'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                    {interaction.summary || 'No details available'}
                  </p>
                  {interaction.type === 'call' && interaction.duration_seconds > 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      Duration: {Math.floor(interaction.duration_seconds / 60)}m {interaction.duration_seconds % 60}s
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <ArrowUpRight className="h-4 w-4 text-slate-400 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No interactions recorded</p>
          <p className="text-xs text-slate-400 mt-1">Calls and SMS messages will appear here</p>
        </div>
      )}
    </TabsContent>
  )
}
