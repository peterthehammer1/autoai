import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  Filter,
  StickyNote,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import InlineNotes from '@/components/InlineNotes'
import PhoneNumber from '@/components/PhoneNumber'
import { Link } from 'react-router-dom'

export default function CallLogs() {
  const [selectedCallId, setSelectedCallId] = useState(null)
  const [outcomeFilter, setOutcomeFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sentimentFilter, setSentimentFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const queryClient = useQueryClient()

  const { data: stats } = useQuery({
    queryKey: ['call-logs', 'stats'],
    queryFn: () => callLogs.stats('week'),
  })

  const { data: callData, isLoading } = useQuery({
    queryKey: ['call-logs', 'list', outcomeFilter, dateFrom, dateTo, sentimentFilter],
    queryFn: () => callLogs.list({
      limit: 200,
      ...(outcomeFilter !== 'all' && { outcome: outcomeFilter }),
      ...(sentimentFilter !== 'all' && { sentiment: sentimentFilter }),
      ...(dateFrom && { date_from: dateFrom }),
      ...(dateTo && { date_to: dateTo }),
    }),
  })

  const notesMutation = useMutation({
    mutationFn: ({ id, notes }) => callLogs.update(id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-logs'] })
    },
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

  // Auto-select a call with transcript only on initial data load
  const [hasAutoSelected, setHasAutoSelected] = useState(false)
  useEffect(() => {
    if (!hasAutoSelected && filteredCalls.length > 0 && !selectedCallId) {
      // Prefer a call with a transcript
      const callWithTranscript = filteredCalls.find(c => c.transcript && c.transcript.length > 0)
      setSelectedCallId(callWithTranscript?.id || filteredCalls[0].id)
      setHasAutoSelected(true)
    }
  }, [filteredCalls, selectedCallId, hasAutoSelected])

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return <ThumbsUp className="h-4 w-4 text-emerald-600" />
      case 'negative':
        return <ThumbsDown className="h-4 w-4 text-slate-500" />
      default:
        return <Minus className="h-4 w-4 text-slate-400" />
    }
  }

  const getSentimentBadge = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50">Positive</Badge>
      case 'negative':
        return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Negative</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Neutral</Badge>
    }
  }

  const getOutcomeBadge = (outcome) => {
    const config = {
      booked: { bg: 'bg-emerald-50 text-emerald-600', label: 'Booked', icon: CheckCircle2 },
      completed: { bg: 'bg-emerald-50 text-emerald-600', label: 'Completed', icon: CheckCircle2 },
      inquiry: { bg: 'bg-blue-50 text-blue-600', label: 'Inquiry', icon: MessageSquare },
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
        return 'bg-blue-600'
      case 'inquiry':
        return 'bg-blue-400'
      case 'transferred':
        return 'bg-blue-300'
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

  const activeFilterCount = [dateFrom, dateTo, sentimentFilter !== 'all' && sentimentFilter].filter(Boolean).length

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 pl-14 sm:px-6 lg:pl-6 py-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-blue-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">Call Logs</h1>
              <p className="text-xs text-slate-400">AI-powered call management</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Master/Detail Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Left Panel - Call List */}
        <div className={cn(
          "flex flex-col bg-white shadow-lg border-0 rounded-lg overflow-hidden",
          "w-full lg:w-96",
          selectedCallId ? "hidden lg:flex" : "flex"
        )}>
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search calls..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-10 text-sm border-slate-300"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={outcomeFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="flex-1 h-10 text-xs border-slate-300">
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
              <Button
                variant={showFilters ? "secondary" : "outline"}
                size="sm"
                className="h-10 px-2.5 shrink-0 relative"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>
            {showFilters && (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider">From</label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-8 text-xs border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider">To</label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-8 text-xs border-slate-300"
                    />
                  </div>
                </div>
                <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                  <SelectTrigger className="h-8 text-xs border-slate-300">
                    <SelectValue placeholder="All Sentiments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sentiments</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-slate-500 px-2"
                    onClick={() => { setDateFrom(''); setDateTo(''); setSentimentFilter('all') }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Call List */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 animate-pulse bg-slate-100 rounded-lg" />
                ))}
              </div>
            ) : filteredCalls.length === 0 ? (
              <div className="p-8 text-center">
                <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 p-5 mb-4 shadow-inner mx-auto w-fit">
                  <Phone className="h-10 w-10 text-slate-300" />
                </div>
                <p className="font-semibold text-slate-700 text-base">No calls found</p>
                <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div>
                {/* Column Headers */}
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-100">
                  <span className="w-28 text-xs text-slate-400 font-medium uppercase tracking-wider">Date / Time</span>
                  <span className="flex-1 text-xs text-slate-400 font-medium uppercase tracking-wider">Caller</span>
                  <span className="w-20 text-right text-xs text-slate-400 font-medium uppercase tracking-wider">Outcome</span>
                </div>
                {/* Rows */}
                <div className="divide-y divide-slate-100">
                {filteredCalls.map((call) => (
                  <button
                    key={call.id}
                    onClick={() => setSelectedCallId(call.id)}
                    className={cn(
                      "w-full flex items-center gap-2 py-2.5 px-3 text-left hover:bg-slate-50 rounded-lg transition-colors group",
                      selectedCallId === call.id && "bg-blue-50 border-l-2 border-l-blue-600"
                    )}
                  >
                    <div className="w-28 shrink-0">
                      <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
                        {call.started_at ? format(new Date(call.started_at), 'MMM d, h:mm a') : '-'}
                      </span>
                    </div>
                    <span className="flex-1 min-w-0 text-sm font-medium text-slate-900 truncate group-hover:text-blue-700">
                      {call.customer
                        ? `${call.customer.first_name} ${call.customer.last_name}`
                        : <PhoneNumber phone={call.phone_number} email={call.customer?.email} />
                      }
                    </span>
                    <div className="w-20 shrink-0 flex justify-end">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-semibold capitalize",
                        call.outcome === 'booked' || call.outcome === 'completed'
                          ? 'text-emerald-600 bg-emerald-50'
                          : 'text-slate-500 bg-slate-100'
                      )}>
                        {call.outcome || '—'}
                      </span>
                    </div>
                  </button>
                ))}
                </div>
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
            <div className="flex-1 flex items-center justify-center bg-white shadow-lg border-0 rounded-lg">
              <div className="text-center">
                <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 p-5 mb-4 shadow-inner mx-auto w-fit">
                  <Phone className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="font-semibold text-slate-700 text-base mb-1">Select a Call</h3>
                <p className="text-sm text-slate-500">Choose a call from the list to view details</p>
              </div>
            </div>
          ) : selectedCall ? (
            <div className="flex-1 flex flex-col bg-white shadow-lg border-0 rounded-lg overflow-hidden">
              {/* Call Header */}
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile Back Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden shrink-0 -ml-2 h-11 w-11"
                      onClick={() => setSelectedCallId(null)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shrink-0">
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
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded font-medium capitalize">{selectedCall.outcome || 'Unknown'}</span>
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
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-2 sm:p-3 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-white/70 text-xs mb-0.5 sm:mb-1">
                      <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Duration
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-white">
                      {formatDuration(selectedCall.duration_seconds)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-dark to-emerald rounded-lg p-2 sm:p-3 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-white/70 text-xs mb-0.5 sm:mb-1">
                      <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Sentiment
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-white capitalize truncate">
                      {selectedCall.sentiment || 'Neutral'}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-400 rounded-lg p-2 sm:p-3 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-white/70 text-xs mb-0.5 sm:mb-1">
                      <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Intent
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-white capitalize truncate">
                      {selectedCall.intent_detected || 'Unknown'}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-slateblue-dark to-slateblue rounded-lg p-2 sm:p-3 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-white/70 text-xs mb-0.5 sm:mb-1">
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
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-500"
                  >
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">AI Summary</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="transcript" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-500"
                  >
                    <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Transcript</span>
                  </TabsTrigger>
                  {selectedCall.recording_url && (
                    <TabsTrigger
                      value="recording"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-500"
                    >
                      <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Recording</span>
                    </TabsTrigger>
                  )}
                  <TabsTrigger
                    value="notes"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-slate-500"
                  >
                    <StickyNote className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Notes</span>
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1">
                  {/* AI Summary Tab */}
                  <TabsContent value="summary" className="m-0 p-4 sm:p-6">
                    {selectedCall.transcript_summary ? (
                      <div className="space-y-6">
                        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                              <Sparkles className="h-5 w-5 text-blue-600" />
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
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                              <h4 className="text-sm font-medium text-blue-600 mb-3 flex items-center gap-2">
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
                                  msg.isAgent ? 'text-blue-600' : 'text-slate-600'
                                )}>
                                  {msg.speaker}
                                </span>
                              </div>
                              <div className={cn(
                                'rounded-2xl px-4 py-3 text-sm',
                                msg.isAgent 
                                  ? 'bg-blue-50 text-slate-800 rounded-tl-sm border border-blue-100'
                                  : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm'
                              )}>
                                {msg.text}
                              </div>
                            </div>
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mx-2',
                              msg.isAgent ? 'bg-blue-100 order-1' : 'bg-slate-100 order-2'
                            )}>
                              {msg.isAgent ? (
                                <Mic className="h-4 w-4 text-blue-600" />
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

                  {/* Notes Tab */}
                  <TabsContent value="notes" className="m-0 p-4 sm:p-6">
                    <InlineNotes
                      value={selectedCall.notes}
                      onSave={(val) => notesMutation.mutate({ id: selectedCall.id, notes: val })}
                      isPending={notesMutation.isPending}
                      label="Call Notes"
                      placeholder="Add notes about this call..."
                    />
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
