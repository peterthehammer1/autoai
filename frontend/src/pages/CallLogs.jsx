import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import { callLogs } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Phone, 
  Clock, 
  Play, 
  FileText,
  User,
  MessageSquare,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  BarChart3,
  Search,
  X,
  Calendar,
  TrendingUp,
  Mic,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Volume2,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import PhoneNumber from '@/components/PhoneNumber'
import { Link } from 'react-router-dom'

export default function CallLogs() {
  const [selectedCallId, setSelectedCallId] = useState(null)
  const [outcomeFilter, setOutcomeFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  const { data: stats } = useQuery({
    queryKey: ['call-logs', 'stats'],
    queryFn: () => callLogs.stats('week'),
  })

  const { data: callData, isLoading } = useQuery({
    queryKey: ['call-logs', 'list', outcomeFilter],
    queryFn: () => callLogs.list({ 
      limit: 200,
      ...(outcomeFilter !== 'all' && { outcome: outcomeFilter })
    }),
  })

  // Filter calls by search term
  const filteredCalls = useMemo(() => {
    if (!callData?.calls) return []
    if (!searchTerm) return callData.calls
    
    const term = searchTerm.toLowerCase()
    return callData.calls.filter(call => 
      call.phone_number?.includes(term) ||
      call.customer?.first_name?.toLowerCase().includes(term) ||
      call.customer?.last_name?.toLowerCase().includes(term) ||
      call.transcript_summary?.toLowerCase().includes(term)
    )
  }, [callData?.calls, searchTerm])

  // Get selected call details
  const selectedCall = useMemo(() => {
    if (!selectedCallId || !callData?.calls) return null
    return callData.calls.find(c => c.id === selectedCallId)
  }, [selectedCallId, callData?.calls])

  // Auto-select first call when data loads
  useEffect(() => {
    if (filteredCalls.length > 0 && !selectedCallId) {
      setSelectedCallId(filteredCalls[0].id)
    }
  }, [filteredCalls, selectedCallId])

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return <ThumbsUp className="h-4 w-4 text-emerald-500" />
      case 'negative':
        return <ThumbsDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-slate-400" />
    }
  }

  const getSentimentBadge = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Positive</Badge>
      case 'negative':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Negative</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Neutral</Badge>
    }
  }

  const getOutcomeBadge = (outcome) => {
    const config = {
      booked: { bg: 'bg-emerald-100 text-emerald-700', label: 'Booked', icon: CheckCircle2 },
      completed: { bg: 'bg-emerald-100 text-emerald-700', label: 'Completed', icon: CheckCircle2 },
      inquiry: { bg: 'bg-blue-100 text-blue-700', label: 'Inquiry', icon: MessageSquare },
      transferred: { bg: 'bg-amber-100 text-amber-700', label: 'Transferred', icon: PhoneOutgoing },
      abandoned: { bg: 'bg-red-100 text-red-700', label: 'Abandoned', icon: XCircle },
    }
    const c = config[outcome] || { bg: 'bg-slate-100 text-slate-600', label: outcome || 'Unknown', icon: Phone }
    const Icon = c.icon
    return (
      <Badge className={`${c.bg} hover:${c.bg} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {c.label}
      </Badge>
    )
  }

  const getOutcomeColor = (outcome) => {
    switch (outcome) {
      case 'booked':
      case 'completed':
        return 'bg-emerald-500'
      case 'inquiry':
        return 'bg-blue-500'
      case 'transferred':
        return 'bg-amber-500'
      case 'abandoned':
        return 'bg-red-500'
      default:
        return 'bg-slate-400'
    }
  }

  const parseTranscript = (transcript) => {
    if (!transcript) return []
    const lines = transcript.split('\n').filter(line => line.trim())
    const messages = []
    for (const line of lines) {
      const match = line.match(/^(Agent|User|Customer|Caller|AI|Assistant|Amber):\s*(.+)$/i)
      if (match) {
        const speaker = match[1].toLowerCase()
        const isAgent = ['agent', 'ai', 'assistant', 'amber'].includes(speaker)
        messages.push({ speaker: isAgent ? 'Amber' : 'Customer', isAgent, text: match[2].trim() })
      } else if (line.trim() && messages.length > 0) {
        messages[messages.length - 1].text += ' ' + line.trim()
      }
    }
    return messages
  }

  const handleFilterChange = (filter) => {
    setOutcomeFilter(filter)
    setSelectedCallId(null)
  }

  const conversionRate = stats?.summary?.total_calls 
    ? Math.round((stats.summary.by_outcome?.booked || 0) / stats.summary.total_calls * 100) 
    : 0

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col animate-fade-in">
      {/* Top Stats Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-3 sm:p-4 mb-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-white/10 rounded-lg backdrop-blur">
              <PhoneCall className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold">AI Call Center</h1>
              <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">Voice Agent Analytics</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="text-center">
              <p className="text-lg sm:text-2xl font-bold">{stats?.summary?.total_calls ?? 0}</p>
              <p className="text-[10px] sm:text-xs text-slate-400">Calls</p>
            </div>
            <div className="h-6 sm:h-8 w-px bg-white/20 hidden sm:block" />
            <div className="text-center hidden sm:block">
              <p className="text-2xl font-bold">{formatDuration(stats?.summary?.avg_duration_seconds)}</p>
              <p className="text-xs text-slate-400">Avg Duration</p>
            </div>
            <div className="h-8 w-px bg-white/20 hidden lg:block" />
            <div className="text-center hidden lg:block">
              <p className="text-2xl font-bold">{stats?.summary?.by_outcome?.booked ?? 0}</p>
              <p className="text-xs text-slate-400">Bookings</p>
            </div>
            <div className="h-6 sm:h-8 w-px bg-white/20" />
            <div className="text-center">
              <p className="text-lg sm:text-2xl font-bold text-emerald-400">{conversionRate}%</p>
              <p className="text-[10px] sm:text-xs text-slate-400">Conv.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Master/Detail Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Left Panel - Call List */}
        <div className={cn(
          "flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden",
          "w-full lg:w-96",
          selectedCallId ? "hidden lg:flex" : "flex"
        )}>
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-slate-200 bg-slate-50 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search calls..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={outcomeFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="flex-1 bg-white h-8 text-xs">
                  <SelectValue placeholder="All Outcomes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outcomes</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="inquiry">Inquiry</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                  <SelectItem value="abandoned">Abandoned</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-slate-500 whitespace-nowrap">
                {filteredCalls.length} calls
              </span>
            </div>
          </div>

          {/* Call List */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-slate-500">Loading calls...</p>
              </div>
            ) : filteredCalls.length === 0 ? (
              <div className="p-8 text-center">
                <Phone className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No calls found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredCalls.map((call) => (
                  <button
                    key={call.id}
                    onClick={() => setSelectedCallId(call.id)}
                    className={cn(
                      "w-full p-3 text-left hover:bg-slate-50 transition-colors",
                      selectedCallId === call.id && "bg-blue-50 border-l-2 border-l-blue-500"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Outcome indicator */}
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        call.outcome === 'booked' || call.outcome === 'completed' ? 'bg-emerald-100' :
                        call.outcome === 'inquiry' ? 'bg-blue-100' :
                        call.outcome === 'abandoned' ? 'bg-red-100' : 'bg-slate-100'
                      )}>
                        {call.direction === 'outbound' ? (
                          <PhoneOutgoing className={cn(
                            "h-5 w-5",
                            call.outcome === 'booked' || call.outcome === 'completed' ? 'text-emerald-600' :
                            call.outcome === 'inquiry' ? 'text-blue-600' :
                            call.outcome === 'abandoned' ? 'text-red-600' : 'text-slate-500'
                          )} />
                        ) : (
                          <PhoneIncoming className={cn(
                            "h-5 w-5",
                            call.outcome === 'booked' || call.outcome === 'completed' ? 'text-emerald-600' :
                            call.outcome === 'inquiry' ? 'text-blue-600' :
                            call.outcome === 'abandoned' ? 'text-red-600' : 'text-slate-500'
                          )} />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-slate-900 truncate">
                            {call.customer 
                              ? `${call.customer.first_name} ${call.customer.last_name}`
                              : <PhoneNumber phone={call.phone_number} showRevealButton={false} />
                            }
                          </p>
                          {getSentimentIcon(call.sentiment)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">
                            {call.started_at ? format(new Date(call.started_at), 'MMM d, h:mm a') : '-'}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500">
                            {formatDuration(call.duration_seconds)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-1">
                          {call.transcript_summary || 'No summary available'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel - Call Details */}
        <div className={cn(
          "flex-1 flex flex-col min-h-0",
          !selectedCallId ? "hidden lg:flex" : "flex"
        )}>
          {!selectedCallId ? (
            <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-slate-200">
              <div className="text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Select a Call</h3>
                <p className="text-sm text-slate-500">Choose a call from the list to view details</p>
              </div>
            </div>
          ) : selectedCall ? (
            <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Call Header */}
              <div className="bg-gradient-to-r from-slate-50 to-white p-4 sm:p-6 border-b border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {/* Mobile Back Button */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="lg:hidden shrink-0 -ml-2"
                      onClick={() => setSelectedCallId(null)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className={cn(
                      "h-10 w-10 sm:h-14 sm:w-14 rounded-full flex items-center justify-center shrink-0",
                      selectedCall.outcome === 'booked' || selectedCall.outcome === 'completed' ? 'bg-emerald-100' :
                      selectedCall.outcome === 'inquiry' ? 'bg-blue-100' :
                      selectedCall.outcome === 'abandoned' ? 'bg-red-100' : 'bg-slate-100'
                    )}>
                      <PhoneIncoming className={cn(
                        "h-5 w-5 sm:h-7 sm:w-7",
                        selectedCall.outcome === 'booked' || selectedCall.outcome === 'completed' ? 'text-emerald-600' :
                        selectedCall.outcome === 'inquiry' ? 'text-blue-600' :
                        selectedCall.outcome === 'abandoned' ? 'text-red-600' : 'text-slate-500'
                      )} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                          {selectedCall.customer 
                            ? `${selectedCall.customer.first_name} ${selectedCall.customer.last_name}`
                            : 'Unknown Caller'
                          }
                        </h2>
                        {getOutcomeBadge(selectedCall.outcome)}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <PhoneNumber phone={selectedCall.phone_number} showRevealButton={false} />
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">{selectedCall.started_at ? format(new Date(selectedCall.started_at), 'MMM d, yyyy \'at\' h:mm a') : '-'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    {selectedCall.customer && (
                      <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                        <Link to={`/customers/${selectedCall.customer.id}`}>
                          <User className="h-4 w-4 mr-1" />
                          View Customer
                        </Link>
                      </Button>
                    )}
                    {selectedCall.customer && (
                      <Button variant="ghost" size="icon" asChild className="sm:hidden">
                        <Link to={`/customers/${selectedCall.customer.id}`}>
                          <User className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setSelectedCallId(null)} className="hidden lg:flex">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-4 sm:mt-6">
                  <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                      <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Duration
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-slate-900">
                      {formatDuration(selectedCall.duration_seconds)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                      <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Sentiment
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      {getSentimentIcon(selectedCall.sentiment)}
                      <span className="text-lg sm:text-xl font-bold text-slate-900 capitalize truncate">
                        {selectedCall.sentiment || 'Neutral'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                      <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Intent
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-slate-900 capitalize truncate">
                      {selectedCall.intent_detected || 'Unknown'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                      <PhoneIncoming className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Direction
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-slate-900 capitalize">
                      {selectedCall.direction || 'Inbound'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabbed Content */}
              <Tabs defaultValue="transcript" className="flex-1 flex flex-col min-h-0">
                <TabsList className="w-full justify-start rounded-none border-b border-slate-200 bg-slate-50 p-0 h-auto">
                  <TabsTrigger 
                    value="transcript" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm"
                  >
                    <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Transcript</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="summary" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm"
                  >
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">AI Summary</span>
                  </TabsTrigger>
                  {selectedCall.recording_url && (
                    <TabsTrigger 
                      value="recording" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm"
                    >
                      <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Recording</span>
                    </TabsTrigger>
                  )}
                </TabsList>

                <ScrollArea className="flex-1">
                  {/* Transcript Tab */}
                  <TabsContent value="transcript" className="m-0 p-4 sm:p-6">
                    {selectedCall.transcript ? (
                      <div className="space-y-4">
                        {parseTranscript(selectedCall.transcript).map((msg, idx) => (
                          <div 
                            key={idx} 
                            className={cn('flex', msg.isAgent ? 'justify-start' : 'justify-end')}
                          >
                            <div className={cn('max-w-[75%]', msg.isAgent ? 'order-2' : 'order-1')}>
                              <div className={cn(
                                'flex items-center gap-2 mb-1',
                                msg.isAgent ? 'justify-start' : 'justify-end'
                              )}>
                                <span className={cn(
                                  'text-xs font-medium',
                                  msg.isAgent ? 'text-violet-600' : 'text-blue-600'
                                )}>
                                  {msg.speaker}
                                </span>
                              </div>
                              <div className={cn(
                                'rounded-2xl px-4 py-3 text-sm',
                                msg.isAgent 
                                  ? 'bg-gradient-to-br from-violet-50 to-violet-100 text-slate-800 rounded-tl-sm border border-violet-200' 
                                  : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm'
                              )}>
                                {msg.text}
                              </div>
                            </div>
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mx-2',
                              msg.isAgent ? 'bg-violet-100 order-1' : 'bg-blue-100 order-2'
                            )}>
                              {msg.isAgent ? (
                                <Mic className="h-4 w-4 text-violet-600" />
                              ) : (
                                <User className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No transcript available</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Summary Tab */}
                  <TabsContent value="summary" className="m-0 p-4 sm:p-6">
                    {selectedCall.transcript_summary ? (
                      <div className="space-y-6">
                        <div className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-xl p-6 border border-violet-200">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-violet-100 rounded-lg shrink-0">
                              <Sparkles className="h-5 w-5 text-violet-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900 mb-2">AI-Generated Summary</h3>
                              <p className="text-slate-700 leading-relaxed">
                                {selectedCall.transcript_summary}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Call Metadata */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <h4 className="text-sm font-medium text-slate-700 mb-3">Call Details</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Outcome</span>
                                <span className="font-medium capitalize">{selectedCall.outcome || 'Unknown'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Sentiment</span>
                                <span className="font-medium capitalize">{selectedCall.sentiment || 'Neutral'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Intent</span>
                                <span className="font-medium capitalize">{selectedCall.intent_detected || 'Unknown'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Duration</span>
                                <span className="font-medium">{formatDuration(selectedCall.duration_seconds)}</span>
                              </div>
                            </div>
                          </div>

                          {selectedCall.appointment && (
                            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                              <h4 className="text-sm font-medium text-emerald-800 mb-3 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" />
                                Appointment Booked
                              </h4>
                              <Button variant="outline" size="sm" className="w-full" asChild>
                                <Link to={`/appointments/${selectedCall.appointment.id}`}>
                                  View Appointment
                                  <ArrowUpRight className="h-4 w-4 ml-1" />
                                </Link>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No summary available</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Recording Tab */}
                  {selectedCall.recording_url && (
                    <TabsContent value="recording" className="m-0 p-4 sm:p-6">
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-slate-200 rounded-lg">
                            <Volume2 className="h-5 w-5 text-slate-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">Call Recording</h3>
                            <p className="text-sm text-slate-500">
                              Duration: {formatDuration(selectedCall.duration_seconds)}
                            </p>
                          </div>
                        </div>
                        <audio 
                          controls 
                          className="w-full" 
                          src={selectedCall.recording_url}
                        >
                          Your browser does not support audio playback.
                        </audio>
                      </div>
                    </TabsContent>
                  )}
                </ScrollArea>
              </Tabs>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
