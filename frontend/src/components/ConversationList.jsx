import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { smsLogs } from '@/api'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { MessageSquare, User } from 'lucide-react'

export default function ConversationList({ onSelectThread, selectedPhone }) {
  const { data, isLoading } = useQuery({
    queryKey: ['sms-conversations'],
    queryFn: () => smsLogs.conversations({ limit: 100 }),
  })

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 animate-pulse bg-slate-100 rounded-lg" />
        ))}
      </div>
    )
  }

  const conversations = data?.conversations || []

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 p-5 mb-4 shadow-inner mx-auto w-fit">
          <MessageSquare className="h-10 w-10 text-slate-300" />
        </div>
        <p className="font-semibold text-slate-700 text-base">No conversations</p>
        <p className="text-sm text-slate-500 mt-1">Messages will appear here</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="divide-y divide-slate-100">
        {conversations.map((conv) => {
          const name = conv.customer
            ? `${conv.customer.first_name || ''} ${conv.customer.last_name || ''}`.trim()
            : null
          const initial = name ? name.charAt(0).toUpperCase() : '#'

          return (
            <button
              key={conv.phone}
              onClick={() => onSelectThread(conv.phone)}
              className={cn(
                'w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 transition-colors',
                selectedPhone === conv.phone && 'bg-blue-50 border-l-2 border-l-blue-600'
              )}
            >
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shrink-0">
                {name ? (
                  <span className="text-sm font-semibold text-white">{initial}</span>
                ) : (
                  <User className="h-4 w-4 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {name || conv.phone}
                  </p>
                  <span className="text-xs text-slate-400 shrink-0">
                    {conv.last_activity ? formatDistanceToNow(new Date(conv.last_activity), { addSuffix: true }) : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs text-slate-500 truncate">
                    {conv.latest_message?.slice(0, 60) || 'No message'}
                  </p>
                  <Badge variant="secondary" className="text-xs h-4 px-1.5 shrink-0">
                    {conv.message_count}
                  </Badge>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </ScrollArea>
  )
}
