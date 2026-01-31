import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import { smsLogs } from '@/api'
import { Card, CardContent } from '@/components/ui/card'
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
  ArrowUpRight,
  Smartphone,
  MessageCircle,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import PhoneNumber from '@/components/PhoneNumber'
import { Link } from 'react-router-dom'

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
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-amber-500" />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'Delivered'
      case 'failed':
        return 'Failed'
      default:
        return 'Pending'
    }
  }

  const getTypeConfig = (type) => {
    switch (type) {
      case 'confirmation':
        return { 
          label: 'Confirmation', 
          icon: CheckCircle2, 
          color: 'text-blue-600', 
          bg: 'bg-blue-50',
          badgeBg: 'bg-blue-100 text-blue-700'
        }
      case 'reminder':
        return { 
          label: 'Reminder', 
          icon: Bell, 
          color: 'text-violet-600', 
          bg: 'bg-violet-50',
          badgeBg: 'bg-violet-100 text-violet-700'
        }
      default:
        return { 
          label: 'Message', 
          icon: MessageSquare, 
          color: 'text-slate-600', 
          bg: 'bg-slate-50',
          badgeBg: 'bg-slate-100 text-slate-700'
        }
    }
  }

  const successRate = stats?.total ? Math.round(((stats.by_status?.sent || 0) + (stats.by_status?.delivered || 0)) / stats.total * 100) : 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Stats Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">SMS Communications</h1>
              <p className="text-sm text-slate-400">Automated customer messaging</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Send className="h-4 w-4 text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">Total Sent</span>
              </div>
              <p className="text-3xl font-bold">{stats?.total || 0}</p>
              <p className="text-xs text-slate-400 mt-1">This week</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">Confirmations</span>
              </div>
              <p className="text-3xl font-bold">{stats?.by_type?.confirmation || 0}</p>
              <p className="text-xs text-slate-400 mt-1">Booking confirmations</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="h-4 w-4 text-violet-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">Reminders</span>
              </div>
              <p className="text-3xl font-bold">{stats?.by_type?.reminder || 0}</p>
              <p className="text-xs text-slate-400 mt-1">24hr reminders sent</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">Success Rate</span>
              </div>
              <p className="text-3xl font-bold">{successRate}%</p>
              <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${successRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-1.5 w-fit shadow-sm">
        <Button
          variant={typeFilter === '' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTypeFilter('')}
          className={cn(
            'rounded-md transition-all',
            typeFilter === '' ? 'shadow-sm' : 'hover:bg-slate-100'
          )}
        >
          <MessageCircle className="h-4 w-4 mr-1.5" />
          All Messages
        </Button>
        <Button
          variant={typeFilter === 'confirmation' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTypeFilter('confirmation')}
          className={cn(
            'rounded-md transition-all',
            typeFilter === 'confirmation' ? 'shadow-sm' : 'hover:bg-slate-100'
          )}
        >
          <CheckCircle2 className="h-4 w-4 mr-1.5" />
          Confirmations
        </Button>
        <Button
          variant={typeFilter === 'reminder' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTypeFilter('reminder')}
          className={cn(
            'rounded-md transition-all',
            typeFilter === 'reminder' ? 'shadow-sm' : 'hover:bg-slate-100'
          )}
        >
          <Bell className="h-4 w-4 mr-1.5" />
          Reminders
        </Button>
      </div>

      {/* SMS List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {logsLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-500">Loading messages...</p>
          </div>
        ) : !logsData?.logs?.length ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-900 mb-1">No messages yet</p>
            <p className="text-sm text-slate-500">SMS messages will appear here once sent</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logsData.logs.map((sms, index) => {
              const typeConfig = getTypeConfig(sms.message_type)
              const TypeIcon = typeConfig.icon
              
              return (
                <div
                  key={sms.id}
                  className="group p-4 hover:bg-slate-50/50 cursor-pointer transition-all"
                  onClick={() => setSelectedSms(sms)}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn(
                      'shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                      typeConfig.bg
                    )}>
                      <TypeIcon className={cn('h-5 w-5', typeConfig.color)} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900">
                          {sms.customer 
                            ? `${sms.customer.first_name} ${sms.customer.last_name}`
                            : <PhoneNumber phone={sms.to_phone} showRevealButton={false} />
                          }
                        </span>
                        <Badge className={cn('text-xs', typeConfig.badgeBg)}>
                          {typeConfig.label}
                        </Badge>
                      </div>
                      
                      {/* Message Preview - styled like an SMS bubble */}
                      <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-3 py-2 max-w-md mb-2">
                        <p className="text-sm text-slate-700 line-clamp-2">
                          {sms.message_body.split('\n')[0]}
                        </p>
                      </div>
                      
                      {/* Meta info */}
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          {getStatusIcon(sms.status)}
                          {getStatusText(sms.status)}
                        </span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(sms.created_at), { addSuffix: true })}</span>
                        {sms.customer && (
                          <>
                            <span>•</span>
                            <Link 
                              to={`/customers/${sms.customer.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary hover:underline flex items-center gap-0.5"
                            >
                              View Customer
                              <ArrowUpRight className="h-3 w-3" />
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Arrow */}
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-400 transition-colors shrink-0" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* SMS Detail Dialog */}
      <Dialog open={!!selectedSms} onOpenChange={() => setSelectedSms(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={cn(
                'p-1.5 rounded-lg',
                selectedSms && getTypeConfig(selectedSms.message_type).bg
              )}>
                <MessageSquare className={cn(
                  'h-4 w-4',
                  selectedSms && getTypeConfig(selectedSms.message_type).color
                )} />
              </div>
              Message Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedSms && (
            <div className="space-y-4">
              {/* Recipient Card */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {selectedSms.customer 
                        ? `${selectedSms.customer.first_name} ${selectedSms.customer.last_name}`
                        : 'Customer'
                      }
                    </p>
                    <p className="text-sm text-slate-500">
                      <PhoneNumber phone={selectedSms.to_phone} showRevealButton={true} />
                    </p>
                  </div>
                  {selectedSms.customer && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/customers/${selectedSms.customer.id}`}>
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Status and Type */}
              <div className="flex items-center gap-2">
                <Badge className={getTypeConfig(selectedSms.message_type).badgeBg}>
                  {getTypeConfig(selectedSms.message_type).label}
                </Badge>
                <Badge className={cn(
                  selectedSms.status === 'failed' 
                    ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-100 text-emerald-700'
                )}>
                  {getStatusIcon(selectedSms.status)}
                  <span className="ml-1">{getStatusText(selectedSms.status)}</span>
                </Badge>
                <span className="text-xs text-slate-500 ml-auto">
                  {format(new Date(selectedSms.created_at), 'MMM d, h:mm a')}
                </span>
              </div>
              
              {/* Message as SMS Bubble */}
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Message</p>
                <div className="bg-primary text-white rounded-2xl rounded-br-sm p-4 shadow-sm">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedSms.message_body}
                  </p>
                </div>
                <p className="text-xs text-slate-400 mt-2 text-right">
                  {format(new Date(selectedSms.created_at), 'EEEE, MMMM d, yyyy h:mm a')}
                </p>
              </div>
              
              {/* Error if failed */}
              {selectedSms.status === 'failed' && selectedSms.error_message && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-700 mb-1 flex items-center gap-1.5">
                    <XCircle className="h-4 w-4" />
                    Delivery Failed
                  </p>
                  <p className="text-sm text-red-600">
                    {selectedSms.error_message}
                  </p>
                </div>
              )}
              
              {/* Appointment Link */}
              {selectedSms.appointment_id && (
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/appointments/${selectedSms.appointment_id}`}>
                    View Related Appointment
                    <ArrowUpRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
