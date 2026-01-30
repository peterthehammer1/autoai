import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { smsLogs } from '@/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Bell,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import PhoneNumber, { maskPhone } from '@/components/PhoneNumber'

export default function SmsLogs() {
  const [selectedSms, setSelectedSms] = useState(null)
  const [typeFilter, setTypeFilter] = useState('')

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['sms-stats'],
    queryFn: () => smsLogs.stats('week'),
  })

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['sms-logs', typeFilter],
    queryFn: () => smsLogs.list({ limit: 50, message_type: typeFilter || undefined }),
  })

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-amber-600" />
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <Badge className="bg-emerald-100 text-emerald-700">Sent</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-700">Failed</Badge>
      default:
        return <Badge className="bg-amber-100 text-amber-700">Queued</Badge>
    }
  }

  const getTypeBadge = (type) => {
    switch (type) {
      case 'confirmation':
        return <Badge className="bg-blue-100 text-blue-700">Confirmation</Badge>
      case 'reminder':
        return <Badge className="bg-violet-100 text-violet-700">Reminder</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-700">Custom</Badge>
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'confirmation':
        return <CheckCircle2 className="h-4 w-4" />
      case 'reminder':
        return <Bell className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  // Use maskPhone from PhoneNumber component for privacy

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">SMS Messages</h1>
        <p className="text-slate-500 mt-1">
          View all outgoing text messages
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-slate-100">
              <Send className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats?.total || 0}</p>
              <p className="text-sm text-slate-500">Total Sent</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-slate-200 shadow-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-blue-50">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats?.by_type?.confirmation || 0}</p>
              <p className="text-sm text-slate-500">Confirmations</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-slate-200 shadow-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-violet-50">
              <Bell className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats?.by_type?.reminder || 0}</p>
              <p className="text-sm text-slate-500">Reminders</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-slate-200 shadow-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {stats?.total ? Math.round((stats.by_status?.sent || 0) / stats.total * 100) : 0}%
              </p>
              <p className="text-sm text-slate-500">Success Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button
          variant={typeFilter === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTypeFilter('')}
        >
          All
        </Button>
        <Button
          variant={typeFilter === 'confirmation' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTypeFilter('confirmation')}
        >
          Confirmations
        </Button>
        <Button
          variant={typeFilter === 'reminder' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTypeFilter('reminder')}
        >
          Reminders
        </Button>
      </div>

      {/* SMS List */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-card overflow-hidden">
        {logsLoading ? (
          <div className="p-8 text-center text-slate-500">Loading messages...</div>
        ) : !logsData?.logs?.length ? (
          <div className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-900">No messages yet</p>
            <p className="text-sm text-slate-500">SMS messages will appear here once sent</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logsData.logs.map((sms) => (
              <div
                key={sms.id}
                className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => setSelectedSms(sms)}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'rounded-lg p-2',
                    sms.message_type === 'confirmation' ? 'bg-blue-100 text-blue-600' :
                    sms.message_type === 'reminder' ? 'bg-violet-100 text-violet-600' :
                    'bg-slate-100 text-slate-600'
                  )}>
                    {getTypeIcon(sms.message_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {sms.customer ? (
                        <span className="font-medium text-slate-900">
                          {sms.customer.first_name} {sms.customer.last_name}
                        </span>
                      ) : (
                        <span className="font-medium text-slate-900">
                          <PhoneNumber phone={sms.to_phone} showRevealButton={false} />
                        </span>
                      )}
                      {getTypeBadge(sms.message_type)}
                      {getStatusBadge(sms.status)}
                    </div>
                    <p className="text-sm text-slate-500 truncate">
                      {sms.message_body.split('\n')[0]}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(sms.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  {getStatusIcon(sms.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SMS Detail Dialog */}
      <Dialog open={!!selectedSms} onOpenChange={() => setSelectedSms(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Message Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedSms && (
            <div className="space-y-4">
              {/* Status and Type */}
              <div className="flex items-center gap-2">
                {getTypeBadge(selectedSms.message_type)}
                {getStatusBadge(selectedSms.status)}
              </div>
              
              {/* Recipient */}
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">To</p>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-900">
                    {selectedSms.customer 
                      ? <>{selectedSms.customer.first_name} {selectedSms.customer.last_name} - <PhoneNumber phone={selectedSms.to_phone} showRevealButton={false} /></>
                      : <PhoneNumber phone={selectedSms.to_phone} showRevealButton={false} />
                    }
                  </span>
                </div>
              </div>
              
              {/* Date */}
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Sent</p>
                <p className="text-slate-900">
                  {format(new Date(selectedSms.created_at), 'EEEE, MMMM d, yyyy h:mm a')}
                </p>
              </div>
              
              {/* Message */}
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Message</p>
                <div className="bg-slate-50 rounded-lg p-4 text-sm whitespace-pre-wrap text-slate-700">
                  {selectedSms.message_body}
                </div>
              </div>
              
              {/* Error if failed */}
              {selectedSms.status === 'failed' && selectedSms.error_message && (
                <div>
                  <p className="text-sm font-medium text-red-600 mb-1">Error</p>
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                    {selectedSms.error_message}
                  </p>
                </div>
              )}
              
              {/* Twilio SID */}
              {selectedSms.twilio_sid && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Message ID</p>
                  <p className="text-xs text-slate-400 font-mono">{selectedSms.twilio_sid}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
