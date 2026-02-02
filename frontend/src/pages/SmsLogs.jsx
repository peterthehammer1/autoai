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

  // Filter logs by search term
  const filteredLogs = useMemo(() => {
    if (!logsData?.logs) return []
    if (!searchTerm) return logsData.logs
    
    const term = searchTerm.toLowerCase()
    return logsData.logs.filter(sms => 
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
    <div className="h-[calc(100vh-6rem)] flex flex-col animate-fade-in">
      {/* Top Stats Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-3 sm:p-4 mb-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-white/10 rounded-lg backdrop-blur">
              <Smartphone className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold">SMS Communications</h1>
              <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">Automated Messaging</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="text-center">
              <p className="text-lg sm:text-2xl font-bold">{stats?.total || 0}</p>
              <p className="text-[10px] sm:text-xs text-slate-400">Sent</p>
            </div>
            <div className="h-6 sm:h-8 w-px bg-white/20 hidden sm:block" />
            <div className="text-center hidden sm:block">
              <p className="text-2xl font-bold">{stats?.by_type?.confirmation || 0}</p>
              <p className="text-xs text-slate-400">Confirmations</p>
            </div>
            <div className="h-8 w-px bg-white/20 hidden lg:block" />
            <div className="text-center hidden lg:block">
              <p className="text-2xl font-bold">{stats?.by_type?.reminder || 0}</p>
              <p className="text-xs text-slate-400">Reminders</p>
            </div>
            <div className="h-6 sm:h-8 w-px bg-white/20" />
            <div className="text-center">
              <p className="text-lg sm:text-2xl font-bold text-emerald-400">{successRate}%</p>
              <p className="text-[10px] sm:text-xs text-slate-400">Success</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Master/Detail Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Left Panel - SMS List */}
        <div className={cn(
          "flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden",
          "w-full lg:w-96",
          selectedSmsId ? "hidden lg:flex" : "flex"
        )}>
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-slate-200 bg-slate-50 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="flex-1 bg-white h-8 text-xs">
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
              <span className="text-xs text-slate-500 whitespace-nowrap">
                {filteredLogs.length} messages
              </span>
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
              <div className="divide-y divide-slate-100">
                {filteredLogs.map((sms) => {
                  const typeConfig = getTypeConfig(sms.message_type)
                  const TypeIcon = typeConfig.icon
                  return (
                    <button
                      key={sms.id}
                      onClick={() => setSelectedSmsId(sms.id)}
                      className={cn(
                        "w-full p-3 text-left hover:bg-slate-50 transition-colors",
                        selectedSmsId === sms.id && "bg-blue-50 border-l-2 border-l-blue-500"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Type indicator */}
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                          typeConfig.bg
                        )}>
                          <TypeIcon className={cn("h-5 w-5", typeConfig.color)} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-slate-900 truncate">
                              {sms.customer 
                                ? `${sms.customer.first_name} ${sms.customer.last_name}`
                                : <PhoneNumber phone={sms.to_phone} showRevealButton={false} />
                              }
                            </p>
                            {getStatusIcon(sms.status)}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">
                              {sms.created_at ? format(new Date(sms.created_at), 'MMM d, h:mm a') : '-'}
                            </span>
                            <Badge className={cn("text-[10px] px-1.5 py-0", typeConfig.bg, typeConfig.color)}>
                              {typeConfig.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-1">
                            {sms.message_body?.split('\n')[0] || 'No content'}
                          </p>
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
            <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-slate-200">
              <div className="text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Select a Message</h3>
                <p className="text-sm text-slate-500">Choose a message from the list to view details</p>
              </div>
            </div>
          ) : selectedSms ? (
            <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* SMS Header */}
              <div className="bg-gradient-to-r from-slate-50 to-white p-4 sm:p-6 border-b border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {/* Mobile Back Button */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="lg:hidden shrink-0 -ml-2"
                      onClick={() => setSelectedSmsId(null)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className={cn(
                      "h-10 w-10 sm:h-14 sm:w-14 rounded-full flex items-center justify-center shrink-0",
                      getTypeConfig(selectedSms.message_type).bg
                    )}>
                      {(() => {
                        const Icon = getTypeConfig(selectedSms.message_type).icon
                        return <Icon className={cn("h-5 w-5 sm:h-7 sm:w-7", getTypeConfig(selectedSms.message_type).color)} />
                      })()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                          {selectedSms.customer 
                            ? `${selectedSms.customer.first_name} ${selectedSms.customer.last_name}`
                            : 'Unknown Recipient'
                          }
                        </h2>
                        {getStatusBadge(selectedSms.status)}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <PhoneNumber phone={selectedSms.to_phone} showRevealButton={false} />
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
                          <PhoneNumber phone={selectedSms.to_phone} showRevealButton={false} />
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">From</span>
                        <p className="font-medium text-slate-900">
                          <PhoneNumber phone={selectedSms.from_phone} showRevealButton={false} />
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
