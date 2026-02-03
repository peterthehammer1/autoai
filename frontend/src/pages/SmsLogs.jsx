import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import { smsLogs } from '@/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Sparkles,
  Search,
  X,
  Calendar,
  Phone,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpFromLine,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import PhoneNumber from '@/components/PhoneNumber'
import { Link } from 'react-router-dom'

export default function SmsLogs() {
  const [selectedSmsId, setSelectedSmsId] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const { data: stats } = useQuery({
    queryKey: ['sms-stats'],
    queryFn: () => smsLogs.stats('week'),
  })

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['sms-logs', typeFilter],
    queryFn: () => smsLogs.list({ limit: 200, message_type: typeFilter !== 'all' ? typeFilter : undefined }),
  })

  // Filter logs by search term and exclude failed status for demo
  const filteredLogs = useMemo(() => {
    if (!logsData?.logs) return []
    
    // Filter out failed messages for demo
    let logs = logsData.logs.filter(sms => sms.status !== 'failed')
    
    if (!searchTerm) return logs
    
    const term = searchTerm.toLowerCase()
    return logs.filter(sms => 
      sms.to_phone?.includes(term) ||
      sms.customer?.first_name?.toLowerCase().includes(term) ||
      sms.customer?.last_name?.toLowerCase().includes(term) ||
      sms.message_body?.toLowerCase().includes(term)
    )
  }, [logsData?.logs, searchTerm])

  // Get selected SMS details
  const selectedSms = useMemo(() => {
    if (!selectedSmsId || !logsData?.logs) return null
    return logsData.logs.find(s => s.id === selectedSmsId)
  }, [selectedSmsId, logsData?.logs])

  // Auto-select first SMS when data loads
  useEffect(() => {
    if (filteredLogs.length > 0 && !selectedSmsId) {
      setSelectedSmsId(filteredLogs[0].id)
    }
  }, [filteredLogs, selectedSmsId])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'received':
        return <ArrowDownLeft className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-amber-500" />
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Delivered</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Failed</Badge>
      case 'received':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Received</Badge>
      default:
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>
    }
  }

  const getTypeConfig = (type) => {
    switch (type) {
      case 'confirmation':
        return { label: 'Confirmation', icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-100' }
      case 'reminder':
        return { label: 'Reminder', icon: Bell, color: 'text-violet-600', bg: 'bg-violet-100' }
      case 'cancellation':
        return { label: 'Cancellation', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' }
      case 'reply':
        return { label: 'Reply', icon: ArrowDownLeft, color: 'text-emerald-600', bg: 'bg-emerald-100' }
      default:
        return { label: 'Message', icon: MessageSquare, color: 'text-slate-600', bg: 'bg-slate-100' }
    }
  }

  const handleFilterChange = (filter) => {
    setTypeFilter(filter)
    setSelectedSmsId(null)
  }

  const successRate = stats?.total ? Math.round(((stats.by_status?.sent || 0) + (stats.by_status?.delivered || 0)) / stats.total * 100) : 0

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      {/* Page Header - Professional */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">SMS Messages</h1>
            <p className="text-sm text-slate-500">{stats?.total || 0} messages this week</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-slate-500">Confirmations</p>
              <p className="text-lg font-semibold text-slate-800">{stats?.by_type?.confirmation || 0}</p>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div className="text-right hidden sm:block">
              <p className="text-sm text-slate-500">Reminders</p>
              <p className="text-lg font-semibold text-slate-800">{stats?.by_type?.reminder || 0}</p>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div className="text-right">
              <p className="text-sm text-slate-500">Success Rate</p>
              <p className="text-lg font-semibold text-slate-800">{successRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Master/Detail Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Left Panel - SMS List */}
        <div className={cn(
          "flex flex-col bg-white border border-slate-200 overflow-hidden",
          "w-full lg:w-80",
          selectedSmsId ? "hidden lg:flex" : "flex"
        )}>
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-slate-200 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm border-slate-300"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="flex-1 h-8 text-xs border-slate-300">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="confirmation">Confirmations</SelectItem>
                  <SelectItem value="reminder">Reminders</SelectItem>
                  <SelectItem value="cancellation">Cancellations</SelectItem>
                  <SelectItem value="reply">Replies</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SMS List */}
          <ScrollArea className="flex-1">
            {logsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-slate-500">Loading messages...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No messages found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredLogs.map((sms) => {
                  const typeConfig = getTypeConfig(sms.message_type)
                  return (
                    <button
                      key={sms.id}
                      onClick={() => setSelectedSmsId(sms.id)}
                      className={cn(
                        "w-full p-3 text-left hover:bg-slate-50 transition-colors",
                        selectedSmsId === sms.id && "bg-slate-100 border-l-2 border-l-slate-600"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Type indicator */}
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
                          <MessageSquare className="h-4 w-4 text-slate-500" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {sms.customer 
                                ? `${sms.customer.first_name} ${sms.customer.last_name}`
                                : <PhoneNumber phone={sms.to_phone} email={sms.customer?.email} />
                              }
                            </p>
                            <span className="text-xs text-slate-500 capitalize">{typeConfig.label}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500">
                              {sms.created_at ? format(new Date(sms.created_at), 'MMM d, h:mm a') : '-'}
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-500 capitalize">{sms.status}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel - SMS Details */}
        <div className={cn(
          "flex-1 flex flex-col min-h-0",
          !selectedSmsId ? "hidden lg:flex" : "flex"
        )}>
          {!selectedSmsId ? (
            <div className="flex-1 flex items-center justify-center bg-white border border-slate-200">
              <div className="text-center">
                <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-slate-700 mb-1">Select a Message</h3>
                <p className="text-xs text-slate-500">Choose a message from the list to view details</p>
              </div>
            </div>
          ) : selectedSms ? (
            <div className="flex-1 flex flex-col bg-white border border-slate-200 overflow-hidden">
              {/* SMS Header */}
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile Back Button */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="lg:hidden shrink-0 -ml-2"
                      onClick={() => setSelectedSmsId(null)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="h-10 w-10 rounded bg-slate-200 flex items-center justify-center shrink-0">
                      <MessageSquare className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-semibold text-slate-800 truncate">
                          {selectedSms.customer 
                            ? `${selectedSms.customer.first_name} ${selectedSms.customer.last_name}`
                            : 'Unknown Recipient'
                          }
                        </h2>
                        <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded capitalize">{selectedSms.status}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <PhoneNumber phone={selectedSms.to_phone} email={selectedSms.customer?.email} />
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">{selectedSms.created_at ? format(new Date(selectedSms.created_at), 'MMM d, yyyy \'at\' h:mm a') : '-'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    {selectedSms.customer && (
                      <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                        <Link to={`/customers/${selectedSms.customer.id}`}>
                          <User className="h-4 w-4 mr-1" />
                          View Customer
                        </Link>
                      </Button>
                    )}
                    {selectedSms.customer && (
                      <Button variant="ghost" size="icon" asChild className="sm:hidden">
                        <Link to={`/customers/${selectedSms.customer.id}`}>
                          <User className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setSelectedSmsId(null)} className="hidden lg:flex">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-4 sm:mt-6">
                  <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                      <MessageCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Type
                    </div>
                    <p className="text-base sm:text-lg font-bold text-slate-900 capitalize truncate">
                      {getTypeConfig(selectedSms.message_type).label}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                      <Send className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Status
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      {getStatusIcon(selectedSms.status)}
                      <span className="text-base sm:text-lg font-bold text-slate-900 capitalize truncate">
                        {selectedSms.status === 'sent' ? 'Delivered' : selectedSms.status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                      <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Sent
                    </div>
                    <p className="text-base sm:text-lg font-bold text-slate-900 truncate">
                      {selectedSms.created_at ? formatDistanceToNow(new Date(selectedSms.created_at), { addSuffix: true }) : '-'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                      <ArrowUpFromLine className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Direction
                    </div>
                    <p className="text-base sm:text-lg font-bold text-slate-900">
                      {selectedSms.message_type === 'reply' ? 'Inbound' : 'Outbound'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Message Content */}
              <ScrollArea className="flex-1 p-4 sm:p-6">
                <div className="space-y-6">
                  {/* Message Bubble */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Message Content
                    </h3>
                    <div className={cn(
                      "rounded-2xl p-5 shadow-sm max-w-lg",
                      selectedSms.message_type === 'reply' 
                        ? "bg-slate-100 text-slate-800 rounded-tl-sm ml-0" 
                        : "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-sm ml-auto"
                    )}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {selectedSms.message_body}
                      </p>
                    </div>
                    <p className={cn(
                      "text-xs text-slate-400 mt-2",
                      selectedSms.message_type === 'reply' ? "text-left" : "text-right"
                    )}>
                      {selectedSms.created_at ? format(new Date(selectedSms.created_at), 'h:mm a') : ''}
                    </p>
                  </div>

                  {/* Error if failed */}
                  {selectedSms.status === 'failed' && selectedSms.error_message && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-red-100 rounded-lg shrink-0">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-red-800 mb-1">Delivery Failed</h4>
                          <p className="text-sm text-red-700">{selectedSms.error_message}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Message Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">To</span>
                        <p className="font-medium text-slate-900">
                          <PhoneNumber phone={selectedSms.to_phone} email={selectedSms.customer?.email} />
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">From</span>
                        <p className="font-medium text-slate-900">
                          <PhoneNumber phone={selectedSms.from_phone} masked={false} />
                        </p>
                      </div>
                      {selectedSms.twilio_sid && (
                        <div className="col-span-2">
                          <span className="text-slate-500">Message ID</span>
                          <p className="font-mono text-xs text-slate-600 truncate">{selectedSms.twilio_sid}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Appointment Link */}
                  {selectedSms.appointment_id && (
                    <Button variant="outline" className="w-full" asChild>
                      <Link to={`/appointments/${selectedSms.appointment_id}`}>
                        <Calendar className="h-4 w-4 mr-2" />
                        View Related Appointment
                        <ArrowUpRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
