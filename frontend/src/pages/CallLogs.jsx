import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import { callLogs } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  TrendingUp, 
  Play, 
  FileText,
  User,
  Calendar,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  PhoneCall,
  PhoneIncoming,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Sparkles,
  BarChart3,
} from 'lucide-react'
import { cn, getOutcomeColor } from '@/lib/utils'
import PhoneNumber from '@/components/PhoneNumber'
import { Link } from 'react-router-dom'

const ITEMS_PER_PAGE = 10

export default function CallLogs() {
  const [selectedCall, setSelectedCall] = useState(null)
  const [outcomeFilter, setOutcomeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  
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

  // Pagination logic
  const allCalls = callData?.calls || []
  const totalItems = allCalls.length
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedCalls = allCalls.slice(startIndex, endIndex)

  const formatDuration = (seconds) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
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
      booked: { bg: 'bg-emerald-100 text-emerald-700', label: 'Booked' },
      inquiry: { bg: 'bg-blue-100 text-blue-700', label: 'Inquiry' },
      transferred: { bg: 'bg-amber-100 text-amber-700', label: 'Transferred' },
      abandoned: { bg: 'bg-red-100 text-red-700', label: 'Abandoned' },
    }
    const c = config[outcome] || { bg: 'bg-slate-100 text-slate-600', label: outcome || 'Unknown' }
    return <Badge className={`${c.bg} hover:${c.bg}`}>{c.label}</Badge>
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
        messages.push({ speaker: isAgent ? 'Amber' : 'Caller', isAgent, text: match[2].trim() })
      } else if (line.trim() && messages.length > 0) {
        messages[messages.length - 1].text += ' ' + line.trim()
      }
    }
    return messages
  }

  const handleFilterChange = (filter) => {
    setOutcomeFilter(filter)
    setCurrentPage(1)
  }

  const conversionRate = stats?.summary?.total_calls 
    ? Math.round((stats.summary.by_outcome?.booked || 0) / stats.summary.total_calls * 100) 
    : 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Stats Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">AI Call Center</h1>
              <p className="text-sm text-slate-400">Voice agent performance & history</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <PhoneIncoming className="h-4 w-4 text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">Total Calls</span>
              </div>
              <p className="text-3xl font-bold">{stats?.summary?.total_calls ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">This week</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-violet-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">Avg Duration</span>
              </div>
              <p className="text-3xl font-bold">{formatDuration(stats?.summary?.avg_duration_seconds)}</p>
              <p className="text-xs text-slate-400 mt-1">Per call</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">Bookings</span>
              </div>
              <p className="text-3xl font-bold">{stats?.summary?.by_outcome?.booked ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">Appointments made</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">Conversion</span>
              </div>
              <p className="text-3xl font-bold">{conversionRate}%</p>
              <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${conversionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Pagination Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Filter by outcome:</span>
          <Select value={outcomeFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[150px] bg-white">
              <SelectValue placeholder="All Outcomes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outcomes</SelectItem>
              <SelectItem value="booked">Booked</SelectItem>
              <SelectItem value="inquiry">Inquiry</SelectItem>
              <SelectItem value="transferred">Transferred</SelectItem>
              <SelectItem value="abandoned">Abandoned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {totalItems > 0 && (
          <div className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-900">{startIndex + 1}</span> to{' '}
            <span className="font-medium text-slate-900">{Math.min(endIndex, totalItems)}</span> of{' '}
            <span className="font-medium text-slate-900">{totalItems}</span> calls
          </div>
        )}
      </div>

      {/* Call Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-500">Loading calls...</p>
          </div>
        ) : !allCalls.length ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="h-8 w-8 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-900 mb-1">No calls yet</p>
            <p className="text-sm text-slate-500">Call logs will appear here once calls are made</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="w-[180px]">Date & Time</TableHead>
                  <TableHead>Caller</TableHead>
                  <TableHead className="w-[100px]">Duration</TableHead>
                  <TableHead className="w-[110px]">Outcome</TableHead>
                  <TableHead className="w-[100px]">Sentiment</TableHead>
                  <TableHead className="hidden lg:table-cell">Summary</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCalls.map((call) => (
                  <TableRow 
                    key={call.id}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setSelectedCall(call)}
                  >
                    <TableCell>
                      <div className="text-sm font-medium text-slate-900">
                        {call.started_at ? format(new Date(call.started_at), 'MMM d, yyyy') : '-'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {call.started_at ? format(new Date(call.started_at), 'h:mm a') : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">
                            {call.customer 
                              ? `${call.customer.first_name} ${call.customer.last_name}`
                              : <PhoneNumber phone={call.phone_number} showRevealButton={false} />
                            }
                          </div>
                          {call.customer && (
                            <div className="text-xs text-slate-400">
                              <PhoneNumber phone={call.phone_number} showRevealButton={false} />
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {formatDuration(call.duration_seconds)}
                      </div>
                    </TableCell>
                    <TableCell>{getOutcomeBadge(call.outcome)}</TableCell>
                    <TableCell>{getSentimentBadge(call.sentiment)}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <p className="text-sm text-slate-600 truncate max-w-xs">
                        {call.transcript_summary || '-'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'ghost'}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Call Detail Modal */}
      <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Call Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedCall && (
            <div className="space-y-6">
              {/* Caller Info Card */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <User className="h-6 w-6 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {selectedCall.customer 
                        ? `${selectedCall.customer.first_name} ${selectedCall.customer.last_name}`
                        : 'Unknown Caller'
                      }
                    </p>
                    <p className="text-sm text-slate-500">
                      <PhoneNumber phone={selectedCall.phone_number} showRevealButton={true} />
                    </p>
                  </div>
                  {selectedCall.customer && (
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/customers/${selectedCall.customer.id}`}>
                        View Profile
                        <ArrowUpRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              {/* Call Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Date</p>
                  <p className="font-medium text-sm">
                    {selectedCall.started_at ? format(new Date(selectedCall.started_at), 'MMM d, yyyy') : '-'}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Time</p>
                  <p className="font-medium text-sm">
                    {selectedCall.started_at ? format(new Date(selectedCall.started_at), 'h:mm a') : '-'}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Duration</p>
                  <p className="font-medium text-sm">{formatDuration(selectedCall.duration_seconds)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Direction</p>
                  <p className="font-medium text-sm capitalize">{selectedCall.direction || 'Inbound'}</p>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                {getOutcomeBadge(selectedCall.outcome)}
                {getSentimentBadge(selectedCall.sentiment)}
                {selectedCall.appointment && (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Appointment Booked
                  </Badge>
                )}
              </div>

              {/* Recording */}
              {selectedCall.recording_url && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Play className="h-4 w-4" /> Recording
                  </p>
                  <audio controls className="w-full" src={selectedCall.recording_url}>
                    Your browser does not support audio playback.
                  </audio>
                </div>
              )}

              {/* Summary */}
              {selectedCall.transcript_summary && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" /> AI Summary
                  </p>
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
                    <p className="text-sm text-slate-700">{selectedCall.transcript_summary}</p>
                  </div>
                </div>
              )}

              {/* Transcript */}
              {selectedCall.transcript && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <FileText className="h-4 w-4" /> Conversation
                  </p>
                  <div className="bg-slate-100 rounded-lg p-4 max-h-80 overflow-y-auto">
                    <div className="space-y-3">
                      {parseTranscript(selectedCall.transcript).map((msg, idx) => (
                        <div 
                          key={idx} 
                          className={cn('flex flex-col', msg.isAgent ? 'items-start' : 'items-end')}
                        >
                          <span className={cn(
                            'text-xs font-medium mb-1',
                            msg.isAgent ? 'text-slate-500' : 'text-blue-600'
                          )}>
                            {msg.speaker}
                          </span>
                          <div className={cn(
                            'max-w-[85%] rounded-2xl px-4 py-2 text-sm',
                            msg.isAgent 
                              ? 'bg-white text-slate-900 rounded-tl-sm shadow-sm' 
                              : 'bg-blue-500 text-white rounded-tr-sm'
                          )}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Appointment Link */}
              {selectedCall.appointment && (
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/appointments/${selectedCall.appointment.id}`}>
                    View Booked Appointment
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
