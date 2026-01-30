import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { callLogs } from '@/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  TrendingDown, 
  Play, 
  FileText,
  User,
  Calendar,
  MessageSquare,
  ExternalLink
} from 'lucide-react'
import { cn, formatPhone, getOutcomeColor } from '@/lib/utils'

export default function CallLogs() {
  const [selectedCall, setSelectedCall] = useState(null)
  const [outcomeFilter, setOutcomeFilter] = useState('all')
  
  // Fetch call stats
  const { data: stats } = useQuery({
    queryKey: ['call-logs', 'stats'],
    queryFn: () => callLogs.stats('week'),
  })

  // Fetch call list
  const { data: callData, isLoading } = useQuery({
    queryKey: ['call-logs', 'list', outcomeFilter],
    queryFn: () => callLogs.list({ 
      limit: 50,
      ...(outcomeFilter !== 'all' && { outcome: outcomeFilter })
    }),
  })

  const formatDuration = (seconds) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600'
      case 'negative': return 'text-red-600'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Call Logs</h1>
        <p className="text-muted-foreground text-sm">
          AI voice agent call history and analytics
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <Phone className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 shrink-0" />
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Calls</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {stats?.summary?.total_calls ?? '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 shrink-0" />
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {formatDuration(stats?.summary?.avg_duration_seconds)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 shrink-0" />
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Booked</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {stats?.summary?.by_outcome?.booked ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 shrink-0" />
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Abandoned</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {stats?.summary?.by_outcome?.abandoned ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-[150px]">
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

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-24 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))
        ) : callData?.calls?.length > 0 ? (
          callData.calls.map((call) => (
            <Card 
              key={call.id} 
              className="cursor-pointer active:bg-muted/50 transition-colors"
              onClick={() => setSelectedCall(call)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">
                        {call.customer 
                          ? `${call.customer.first_name} ${call.customer.last_name}`
                          : formatPhone(call.phone_number)
                        }
                      </p>
                      <Badge className={cn('shrink-0 text-xs', getOutcomeColor(call.outcome))}>
                        {call.outcome || 'unknown'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {call.started_at 
                        ? format(new Date(call.started_at), 'MMM d, h:mm a')
                        : '-'
                      }
                      {' • '}
                      {formatDuration(call.duration_seconds)}
                    </p>
                    {call.transcript_summary && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {call.transcript_summary}
                      </p>
                    )}
                  </div>
                  <span className={cn('text-xs capitalize shrink-0', getSentimentColor(call.sentiment))}>
                    {call.sentiment || 'neutral'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Phone className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No calls found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden sm:block">
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
          <CardDescription>
            Click a row to view full transcript and details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <div className="h-12 animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : callData?.calls?.length > 0 ? (
                callData.calls.map((call) => (
                  <TableRow 
                    key={call.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedCall(call)}
                  >
                    <TableCell className="whitespace-nowrap">
                      {call.started_at 
                        ? format(new Date(call.started_at), 'MMM d, h:mm a')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {call.customer ? (
                        <span className="font-medium">
                          {call.customer.first_name} {call.customer.last_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell>{formatPhone(call.phone_number)}</TableCell>
                    <TableCell>{formatDuration(call.duration_seconds)}</TableCell>
                    <TableCell>
                      <Badge className={getOutcomeColor(call.outcome)}>
                        {call.outcome || 'unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={cn('capitalize', getSentimentColor(call.sentiment))}>
                        {call.sentiment || 'neutral'}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {call.transcript_summary || '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No calls found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
              {/* Call Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="h-4 w-4" /> Customer
                  </p>
                  <p className="font-medium">
                    {selectedCall.customer 
                      ? `${selectedCall.customer.first_name} ${selectedCall.customer.last_name}`
                      : 'Unknown'
                    }
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-4 w-4" /> Phone
                  </p>
                  <p className="font-medium">{formatPhone(selectedCall.phone_number)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> Date & Time
                  </p>
                  <p className="font-medium">
                    {selectedCall.started_at 
                      ? format(new Date(selectedCall.started_at), 'MMM d, yyyy h:mm a')
                      : '-'
                    }
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" /> Duration
                  </p>
                  <p className="font-medium">{formatDuration(selectedCall.duration_seconds)}</p>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge className={getOutcomeColor(selectedCall.outcome)}>
                  {selectedCall.outcome || 'unknown'}
                </Badge>
                <Badge variant="outline" className={getSentimentColor(selectedCall.sentiment)}>
                  {selectedCall.sentiment || 'neutral'} sentiment
                </Badge>
                {selectedCall.appointment && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Appointment Booked
                  </Badge>
                )}
              </div>

              {/* Recording */}
              {selectedCall.recording_url && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Play className="h-4 w-4" /> Recording
                  </p>
                  <audio 
                    controls 
                    className="w-full"
                    src={selectedCall.recording_url}
                  >
                    Your browser does not support audio playback.
                  </audio>
                </div>
              )}

              {/* Summary */}
              {selectedCall.transcript_summary && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" /> Call Summary
                  </p>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm">{selectedCall.transcript_summary}</p>
                  </div>
                </div>
              )}

              {/* Transcript */}
              {selectedCall.transcript && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <FileText className="h-4 w-4" /> Full Transcript
                  </p>
                  <div className="rounded-lg bg-muted p-4 max-h-64 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap font-sans">
                      {selectedCall.transcript}
                    </pre>
                  </div>
                </div>
              )}

              {/* Appointment Link */}
              {selectedCall.appointment && (
                <div className="pt-4 border-t">
                  <Button variant="outline" asChild>
                    <a href={`/appointments/${selectedCall.appointment.id}`}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Booked Appointment
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
