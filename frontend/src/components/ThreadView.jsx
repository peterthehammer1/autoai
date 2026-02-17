import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, differenceInMinutes } from 'date-fns'
import { smsLogs } from '@/api'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronLeft, Reply, User, MessageSquare } from 'lucide-react'
import PhoneNumber from '@/components/PhoneNumber'
import SmsComposeDialog from '@/components/SmsComposeDialog'
import { Link } from 'react-router-dom'

export default function ThreadView({ phone, onBack }) {
  const [isSmsOpen, setIsSmsOpen] = useState(false)
  const bottomRef = useRef(null)

  const { data, isLoading } = useQuery({
    queryKey: ['sms-thread', phone],
    queryFn: () => smsLogs.thread(phone),
    enabled: !!phone,
  })

  const messages = data?.messages || []
  const customer = data?.customer

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  const customerName = customer
    ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
    : null

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white shadow-lg border-0 rounded-lg overflow-hidden">
      {/* Thread Header */}
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0 -ml-2 h-9 w-9" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shrink-0">
          {customerName ? (
            <span className="text-sm font-semibold text-white">{customerName.charAt(0)}</span>
          ) : (
            <User className="h-4 w-4 text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {customerName || <PhoneNumber phone={phone} />}
          </p>
          <p className="text-xs text-slate-500">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {customer?.id && (
            <Button variant="outline" size="sm" asChild className="text-xs">
              <Link to={`/customers/${customer.id}`}>
                <User className="h-3.5 w-3.5 mr-1" />
                Profile
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setIsSmsOpen(true)} className="text-xs">
            <Reply className="h-3.5 w-3.5 mr-1" />
            Reply
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2 max-w-lg mx-auto">
          {messages.map((msg, i) => {
            const isInbound = msg.message_type === 'reply'
            const showTimeDivider = i > 0 &&
              differenceInMinutes(new Date(msg.created_at), new Date(messages[i - 1].created_at)) > 60

            return (
              <div key={msg.id}>
                {showTimeDivider && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs text-slate-400">
                      {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                    </span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                )}
                <div className={cn('flex', isInbound ? 'justify-start' : 'justify-end')}>
                  <div className={cn(
                    'rounded-2xl px-4 py-2.5 max-w-[85%] shadow-sm',
                    isInbound
                      ? 'bg-slate-100 text-slate-800 rounded-tl-sm'
                      : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-sm'
                  )}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message_body}</p>
                    <p className={cn(
                      'text-xs mt-1',
                      isInbound ? 'text-slate-400' : 'text-blue-200'
                    )}>
                      {msg.created_at ? format(new Date(msg.created_at), 'h:mm a') : ''}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <SmsComposeDialog
        open={isSmsOpen}
        onOpenChange={setIsSmsOpen}
        recipientPhone={phone}
        recipientName={customerName}
        customerId={customer?.id}
      />
    </div>
  )
}
