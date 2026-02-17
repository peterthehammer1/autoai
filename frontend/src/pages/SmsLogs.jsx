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
  Filter,
  Reply,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import PhoneNumber from '@/components/PhoneNumber'
import { Link } from 'react-router-dom'
import SmsComposeDialog from '@/components/SmsComposeDialog'
import ConversationList from '@/components/ConversationList'
import ThreadView from '@/components/ThreadView'

export default function SmsLogs() {
  const [selectedSmsId, setSelectedSmsId] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [isSmsOpen, setIsSmsOpen] = useState(false)
  const [viewMode, setViewMode] = useState('messages')
  const [selectedThread, setSelectedThread] = useState(null)

  const { data: stats } = useQuery({
    queryKey: ['sms-stats'],
    queryFn: () => smsLogs.stats('week'),
  })

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['sms-logs', typeFilter, dateFrom, dateTo],
    queryFn: () => smsLogs.list({
      limit: 200,
      message_type: typeFilter !== 'all' ? typeFilter : undefined,
      ...(dateFrom && { date_from: dateFrom }),
      ...(dateTo && { date_to: dateTo }),
    }),
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

  // Auto-select first SMS only on initial data load
  const [hasAutoSelected, setHasAutoSelected] = useState(false)
  useEffect(() => {
    if (!hasAutoSelected && filteredLogs.length > 0 && !selectedSmsId) {
      setSelectedSmsId(filteredLogs[0].id)
      setHasAutoSelected(true)
    }
  }, [filteredLogs, selectedSmsId, hasAutoSelected])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-slate-500" />
      case 'received':
        return <ArrowDownLeft className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-slate-400" />
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50">Delivered</Badge>
      case 'failed':
        return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Failed</Badge>
      case 'received':
        return <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-50">Received</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Pending</Badge>
    }
  }

  const getTypeConfig = (type) => {
    switch (type) {
      case 'confirmation':
        return { label: 'Confirmation', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' }
      case 'reminder':
        return { label: 'Reminder', icon: Bell, color: 'text-blue-600', bg: 'bg-blue-50' }
      case 'cancellation':
        return { label: 'Cancellation', icon: XCircle, color: 'text-slate-600', bg: 'bg-slate-100' }
      case 'reply':
        return { label: 'Reply', icon: ArrowDownLeft, color: 'text-blue-500', bg: 'bg-blue-50' }
      default:
        return { label: 'Message', icon: MessageSquare, color: 'text-slate-600', bg: 'bg-slate-100' }
    }
  }

  const handleFilterChange = (filter) => {
    setTypeFilter(filter)
    setSelectedSmsId(null)
  }

  const successRate = stats?.total ? Math.round(((stats.by_status?.sent || 0) + (stats.by_status?.delivered || 0)) / stats.total * 100) : 0

  const activeFilterCount = [dateFrom, dateTo].filter(Boolean).length

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 pl-14 sm:px-6 lg:pl-6 py-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">SMS Messages</h1>
              <p className="text-xs text-slate-400">Automated messaging system</p>
            </div>
          </div>
          <div className="flex items-center bg-slate-700/50 rounded-lg p-0.5">
            <button
              onClick={() => { setViewMode('messages'); setSelectedThread(null) }}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                viewMode === 'messages'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              )}
            >
              Messages
            </button>
            <button
              onClick={() => { setViewMode('threads'); setSelectedSmsId(null) }}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                viewMode === 'threads'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              )}
            >
              Conversations
            </button>
          </div>
        </div>
      </div>

      {/* Conversations Mode */}
      {viewMode === 'threads' && (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          <div className={cn(
            "flex flex-col bg-white shadow-lg border-0 rounded-lg overflow-hidden",
            "w-full lg:w-96",
            selectedThread ? "hidden lg:flex" : "flex"
          )}>
            <ConversationList onSelectThread={setSelectedThread} selectedPhone={selectedThread} />
          </div>
          <div className={cn(
            "flex-1 flex flex-col min-h-0",
            !selectedThread ? "hidden lg:flex" : "flex"
          )}>
            {selectedThread ? (
              <ThreadView phone={selectedThread} onBack={() => setSelectedThread(null)} />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-white shadow-lg border-0 rounded-lg">
                <div className="text-center">
                  <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 p-5 mb-4 shadow-inner mx-auto w-fit">
                    <MessageCircle className="h-10 w-10 text-slate-300" />
                  </div>
                  <h3 className="font-semibold text-slate-700 text-base mb-1">Select a Conversation</h3>
                  <p className="text-sm text-slate-500">Choose a thread to view message history</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages Mode - Master/Detail Layout */}
      <div className={cn("flex-1 flex flex-col lg:flex-row gap-4 min-h-0", viewMode !== 'messages' && "hidden")}>
        {/* Left Panel - SMS List */}
        <div className={cn(
          "flex flex-col bg-white shadow-lg border-0 rounded-lg overflow-hidden",
          "w-full lg:w-[440px]",
          selectedSmsId ? "hidden lg:flex" : "flex"
        )}>
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-10 text-sm border-slate-300"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="flex-1 h-10 text-xs border-slate-300">
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
              <Button
                variant={showFilters ? "secondary" : "outline"}
                size="sm"
                className="h-10 px-2.5 shrink-0 relative"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>
            {showFilters && (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider">From</label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-8 text-xs border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider">To</label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-8 text-xs border-slate-300"
                    />
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-slate-500 px-2"
                    onClick={() => { setDateFrom(''); setDateTo('') }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* SMS List */}
          <ScrollArea className="flex-1">
            {logsLoading ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 animate-pulse bg-slate-100 rounded-lg" />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-8 text-center">
                <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 p-5 mb-4 shadow-inner mx-auto w-fit">
                  <MessageSquare className="h-10 w-10 text-slate-300" />
                </div>
                <p className="font-semibold text-slate-700 text-base">No messages found</p>
                <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div>
                {/* Column Headers */}
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-100">
                  <span className="w-28 text-xs text-slate-400 font-medium uppercase tracking-wider">Date / Time</span>
                  <span className="flex-1 text-xs text-slate-400 font-medium uppercase tracking-wider">Recipient</span>
                  <span className="w-28 text-right text-xs text-slate-400 font-medium uppercase tracking-wider">Type</span>
                </div>
                {/* Rows */}
                <div className="divide-y divide-slate-100">
                  {filteredLogs.map((sms) => {
                    const typeConfig = getTypeConfig(sms.message_type)
                    return (
                      <button
                        key={sms.id}
                        onClick={() => setSelectedSmsId(sms.id)}
                        className={cn(
                          "w-full flex items-center gap-2 py-2.5 px-3 text-left hover:bg-slate-50 rounded-lg transition-colors group",
                          selectedSmsId === sms.id && "bg-blue-50 border-l-2 border-l-blue-600"
                        )}
                      >
                        <div className="w-28 shrink-0">
                          <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
                            {sms.created_at ? format(new Date(sms.created_at), 'MMM d, h:mm a') : '-'}
                          </span>
                        </div>
                        <span className="flex-1 min-w-0 text-sm font-medium text-slate-900 truncate group-hover:text-blue-700">
                          {sms.customer
                            ? `${sms.customer.first_name} ${sms.customer.last_name}`
                            : <PhoneNumber phone={sms.to_phone} email={sms.customer?.email} />
                          }
                        </span>
                        <div className="w-28 shrink-0 flex justify-end">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-semibold capitalize",
                            typeConfig.label === 'Confirmation' || typeConfig.label === 'Reminder'
                              ? 'text-blue-600 bg-blue-50'
                              : 'text-slate-500 bg-slate-100'
                          )}>
                            {typeConfig.label}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
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
            <div className="flex-1 flex items-center justify-center bg-white shadow-lg border-0 rounded-lg">
              <div className="text-center">
                <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 p-5 mb-4 shadow-inner mx-auto w-fit">
                  <MessageSquare className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="font-semibold text-slate-700 text-base mb-1">Select a Message</h3>
                <p className="text-sm text-slate-500">Choose a message from the list to view details</p>
              </div>
            </div>
          ) : selectedSms ? (
            <div className="flex-1 flex flex-col bg-white shadow-lg border-0 rounded-lg overflow-hidden">
              {/* SMS Header */}
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile Back Button */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="lg:hidden shrink-0 -ml-2 h-11 w-11"
                      onClick={() => setSelectedSmsId(null)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shrink-0">
                      <MessageSquare className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-semibold text-slate-800 truncate">
                          {selectedSms.customer
                            ? `${selectedSms.customer.first_name} ${selectedSms.customer.last_name}`
                            : 'Unknown Recipient'
                          }
                        </h2>
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded font-medium capitalize">{selectedSms.status}</span>
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
                    <Button variant="outline" size="sm" onClick={() => setIsSmsOpen(true)} className="hidden sm:flex">
                      <Reply className="h-4 w-4 mr-1" />
                      Reply
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsSmsOpen(true)} className="sm:hidden">
                      <Reply className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedSmsId(null)} className="hidden lg:flex">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-4 sm:mt-6">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-2 sm:p-3 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-white/70 text-xs mb-0.5 sm:mb-1">
                      <MessageCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Type
                    </div>
                    <p className="text-base sm:text-lg font-bold text-white capitalize truncate">
                      {getTypeConfig(selectedSms.message_type).label}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-dark to-emerald rounded-lg p-2 sm:p-3 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-white/70 text-xs mb-0.5 sm:mb-1">
                      <Send className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Status
                    </div>
                    <p className="text-base sm:text-lg font-bold text-white capitalize truncate">
                      {selectedSms.status === 'sent' ? 'Delivered' : selectedSms.status || 'Unknown'}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-400 rounded-lg p-2 sm:p-3 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-white/70 text-xs mb-0.5 sm:mb-1">
                      <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Sent
                    </div>
                    <p className="text-base sm:text-lg font-bold text-white truncate">
                      {selectedSms.created_at ? formatDistanceToNow(new Date(selectedSms.created_at), { addSuffix: true }) : '-'}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-slateblue-dark to-slateblue rounded-lg p-2 sm:p-3 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-white/70 text-xs mb-0.5 sm:mb-1">
                      <ArrowUpFromLine className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Direction
                    </div>
                    <p className="text-base sm:text-lg font-bold text-white">
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
                        : "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-sm ml-auto"
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
      <SmsComposeDialog
        open={isSmsOpen}
        onOpenChange={setIsSmsOpen}
        recipientPhone={selectedSms?.to_phone}
        recipientName={selectedSms?.customer ? `${selectedSms.customer.first_name} ${selectedSms.customer.last_name}` : undefined}
        customerId={selectedSms?.customer?.id}
      />
    </div>
  )
}
