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

  // Filter calls by search term and exclude abandoned for demo
  const filteredCalls = useMemo(() => {
    if (!callData?.calls) return []
    
    // Filter out abandoned/failed calls for demo
    let calls = callData.calls.filter(call => call.outcome !== 'abandoned' && call.outcome !== 'failed')
    
    if (!searchTerm) return calls
    
    const term = searchTerm.toLowerCase()
    return calls.filter(call => 
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

  // Auto-select a call with transcript when data loads, or fall back to first call
  useEffect(() => {
    if (filteredCalls.length > 0 && !selectedCallId) {
      // Prefer a call with a transcript
      const callWithTranscript = filteredCalls.find(c => c.transcript && c.transcript.length > 0)
      setSelectedCallId(callWithTranscript?.id || filteredCalls[0].id)
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
        return <ThumbsUp className="h-4 w-4 text-teal" />
      case 'negative':
        return <ThumbsDown className="h-4 w-4 text-slate-500" />
      default:
        return <Minus className="h-4 w-4 text-slate-400" />
    }
  }

  const getSentimentBadge = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return <Badge className="bg-teal-dark/10 text-teal hover:bg-teal-dark/10">Positive</Badge>
      case 'negative':
        return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Negative</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Neutral</Badge>
    }
  }

  const getOutcomeBadge = (outcome) => {
    const config = {
      booked: { bg: 'bg-teal-dark/10 text-teal', label: 'Booked', icon: CheckCircle2 },
      completed: { bg: 'bg-teal-dark/10 text-teal', label: 'Completed', icon: CheckCircle2 },
      inquiry: { bg: 'bg-teal-medium/10 text-teal-medium', label: 'Inquiry', icon: MessageSquare },
      transferred: { bg: 'bg-slate-100 text-slate-600', label: 'Transferred', icon: PhoneOutgoing },
      abandoned: { bg: 'bg-slate-100 text-slate-600', label: 'Abandoned', icon: XCircle },
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
        return 'bg-teal-dark'
      case 'inquiry':
        return 'bg-teal-medium'
      case 'transferred':
        return 'bg-teal-light'
      case 'abandoned':
        return 'bg-slate-400'
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
        const newText = match[2].trim()
        
        // Group consecutive messages from the same speaker
        const lastMsg = messages[messages.length - 1]
        if (lastMsg && lastMsg.isAgent === isAgent) {
          // Same speaker - append to previous message
          lastMsg.text += ' ' + newText
        } else {
          // Different speaker - create new message
          messages.push({ speaker: isAgent ? 'Amber' : 'Customer', isAgent, text: newText })
        }
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
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      {/* Page Header - With Teal Accent */}
      <div className="bg-gradient-to-r from-teal-dark to-teal px-4 py-4 mb-4 rounded-lg mx-4 mt-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Call Logs</h1>
            <p className="text-sm text-white/70">{stats?.summary?.total_calls ?? 0} calls this week</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-white/70">Avg Duration</p>
              <p className="text-lg font-semibold text-white">{formatDuration(stats?.summary?.avg_duration_seconds)}</p>
            </div>
            <div className="h-8 w-px bg-white/20 hidden sm:block" />
            <div className="text-right hidden sm:block">
              <p className="text-sm text-white/70">Bookings</p>
              <p className="text-lg font-semibold text-white">{stats?.summary?.by_outcome?.booked ?? 0}</p>
            </div>
            <div className="h-8 w-px bg-white/20 hidden sm:block" />
            <div className="text-right">
              <p className="text-sm text-white/70">Conversion</p>
              <p className="text-lg font-semibold text-white">{conversionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Master/Detail Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Left Panel - Call List */}
        <div className={cn(
          "flex flex-col bg-white border border-slate-200 overflow-hidden",
          "w-full lg:w-80",
          selectedCallId ? "hidden lg:flex" : "flex"
        )}>
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-slate-200 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search calls..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm border-slate-300"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={outcomeFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="flex-1 h-8 text-xs border-slate-300">
                  <SelectValue placeholder="All Outcomes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outcomes</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="inquiry">Inquiry</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                </SelectContent>
              </Select>
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
              <div className="divide-y divide-slate-200">
                {filteredCalls.map((call) => (
                  <button
                    key={call.id}
                    onClick={() => setSelectedCallId(call.id)}
                    className={cn(
                      "w-full p-3 text-left hover:bg-slate-50 transition-colors",
                      selectedCallId === call.id && "bg-teal-dark/5 border-l-2 border-l-teal-dark"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Outcome indicator */}
                      <div className="w-8 h-8 rounded-lg bg-teal-dark/10 flex items-center justify-center shrink-0">
                        {call.direction === 'outbound' ? (
                          <PhoneOutgoing className="h-4 w-4 text-teal" />
                        ) : (
                          <PhoneIncoming className="h-4 w-4 text-teal" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {call.customer 
                              ? `${call.customer.first_name} ${call.customer.last_name}`
                              : <PhoneNumber phone={call.phone_number} email={call.customer?.email} />
                            }
                          </p>
                          <span className="text-xs text-slate-500 capitalize">{call.outcome || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500">
                            {call.started_at ? format(new Date(call.started_at), 'MMM d, h:mm a') : '-'}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500">
                            {formatDuration(call.duration_seconds)}
                          </span>
                        </div>
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
            <div className="flex-1 flex items-center justify-center bg-white border border-slate-200">
              <div className="text-center">
                <Phone className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-slate-700 mb-1">Select a Call</h3>
                <p className="text-xs text-slate-500">Choose a call from the list to view details</p>
              </div>
            </div>
          ) : selectedCall ? (
            <div className="flex-1 flex flex-col bg-white border border-slate-200 overflow-hidden">
              {/* Call Header */}
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile Back Button */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="lg:hidden shrink-0 -ml-2"
                      onClick={() => setSelectedCallId(null)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-teal-dark to-teal flex items-center justify-center shrink-0">
                      <PhoneIncoming className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-semibold text-slate-800 truncate">
                          {selectedCall.customer 
                            ? `${selectedCall.customer.first_name} ${selectedCall.customer.last_name}`
                            : 'Unknown Caller'
                          }
                        </h2>
                        <span className="text-xs px-2 py-0.5 bg-teal-dark/10 text-teal rounded font-medium capitalize">{selectedCall.outcome || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <PhoneNumber phone={selectedCall.phone_number} email={selectedCall.customer?.email} />
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
                  <div className="bg-gradient-to-br from-teal-dark to-teal rounded-lg p-2 sm:p-3 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-white/70 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                      <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Duration
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-white">
                      {formatDuration(selectedCall.duration_seconds)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-dark to-emerald rounded-lg p-2 sm:p-3 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-white/70 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                      <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Sentiment
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-white capitalize truncate">
                      {selectedCall.sentiment || 'Neutral'}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-teal-medium to-teal-light rounded-lg p-2 sm:p-3 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-white/70 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                      <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Intent
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-white capitalize truncate">
                      {selectedCall.intent_detected || 'Unknown'}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-dark to-amber rounded-lg p-2 sm:p-3 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-white/70 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                      <PhoneIncoming className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Direction
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-white capitalize">
                      {selectedCall.direction || 'Inbound'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabbed Content */}
              <Tabs defaultValue="summary" className="flex-1 flex flex-col min-h-0">
                <TabsList className="w-full justify-start rounded-none border-b border-slate-200 bg-slate-50 p-0 h-auto">
                  <TabsTrigger 
                    value="summary" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-dark data-[state=active]:bg-transparent data-[state=active]:text-teal-dark py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-500"
                  >
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">AI Summary</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="transcript" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-dark data-[state=active]:bg-transparent data-[state=active]:text-teal-dark py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-500"
                  >
                    <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Transcript</span>
                  </TabsTrigger>
                  {selectedCall.recording_url && (
                    <TabsTrigger 
                      value="recording" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-dark data-[state=active]:bg-transparent data-[state=active]:text-teal-dark py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-500"
                    >
                      <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Recording</span>
                    </TabsTrigger>
                  )}
                </TabsList>

                <ScrollArea className="flex-1">
                  {/* AI Summary Tab */}
                  <TabsContent value="summary" className="m-0 p-4 sm:p-6">
                    {selectedCall.transcript_summary ? (
                      <div className="space-y-6">
                        <div className="bg-teal-dark/5 rounded-xl p-6 border border-teal-dark/20">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-teal-dark/10 rounded-lg shrink-0">
                              <Sparkles className="h-5 w-5 text-teal" />
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
                            <div className="bg-teal-dark/5 rounded-lg p-4 border border-teal-dark/20">
                              <h4 className="text-sm font-medium text-teal mb-3 flex items-center gap-2">
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
                                  msg.isAgent ? 'text-teal' : 'text-slate-600'
                                )}>
                                  {msg.speaker}
                                </span>
                              </div>
                              <div className={cn(
                                'rounded-2xl px-4 py-3 text-sm',
                                msg.isAgent 
                                  ? 'bg-teal-dark/5 text-slate-800 rounded-tl-sm border border-teal-dark/20' 
                                  : 'bg-gradient-to-br from-teal to-teal-dark text-white rounded-tr-sm'
                              )}>
                                {msg.text}
                              </div>
                            </div>
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mx-2',
                              msg.isAgent ? 'bg-teal-dark/10 order-1' : 'bg-slate-100 order-2'
                            )}>
                              {msg.isAgent ? (
                                <Mic className="h-4 w-4 text-teal" />
                              ) : (
                                <User className="h-4 w-4 text-slate-600" />
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
