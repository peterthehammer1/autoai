import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { analytics } from '@/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Phone, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { cn, formatPhone, getOutcomeColor } from '@/lib/utils'

export default function CallLogs() {
  const { data: callStats, isLoading } = useQuery({
    queryKey: ['analytics', 'calls'],
    queryFn: () => analytics.calls('week'),
  })

  // Mock call logs for display since we don't have a list endpoint yet
  const mockCalls = [
    {
      id: 1,
      phone: '555-234-5678',
      started_at: new Date().toISOString(),
      duration_seconds: 245,
      outcome: 'booked',
      sentiment: 'positive',
    },
    {
      id: 2,
      phone: '555-345-6789',
      started_at: new Date(Date.now() - 3600000).toISOString(),
      duration_seconds: 180,
      outcome: 'inquiry',
      sentiment: 'neutral',
    },
    {
      id: 3,
      phone: '555-456-7890',
      started_at: new Date(Date.now() - 7200000).toISOString(),
      duration_seconds: 320,
      outcome: 'booked',
      sentiment: 'positive',
    },
    {
      id: 4,
      phone: '555-567-8901',
      started_at: new Date(Date.now() - 10800000).toISOString(),
      duration_seconds: 45,
      outcome: 'abandoned',
      sentiment: 'neutral',
    },
    {
      id: 5,
      phone: '555-678-9012',
      started_at: new Date(Date.now() - 14400000).toISOString(),
      duration_seconds: 420,
      outcome: 'transferred',
      sentiment: 'negative',
    },
  ]

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Call Logs</h1>
        <p className="text-muted-foreground">
          AI voice agent call history and analytics
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Phone className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Calls</p>
                <p className="text-2xl font-bold">
                  {callStats?.summary?.total_calls ?? '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">
                  {callStats?.summary?.avg_duration_seconds
                    ? formatDuration(callStats.summary.avg_duration_seconds)
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Booked</p>
                <p className="text-2xl font-bold">
                  {callStats?.summary?.by_outcome?.booked ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Abandoned</p>
                <p className="text-2xl font-bold">
                  {callStats?.summary?.by_outcome?.abandoned ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outcome Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Outcomes This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(callStats?.summary?.by_outcome || {}).map(
                ([outcome, count]) => (
                  <div key={outcome} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getOutcomeColor(outcome)}>
                        {outcome}
                      </Badge>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peak Call Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {callStats?.peak_hours?.map((item) => (
                <div key={item.hour} className="flex items-center justify-between">
                  <span>
                    {item.hour === 0
                      ? '12 AM'
                      : item.hour < 12
                      ? `${item.hour} AM`
                      : item.hour === 12
                      ? '12 PM'
                      : `${item.hour - 12} PM`}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{
                          width: `${(item.count / (callStats.peak_hours[0]?.count || 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right font-medium">{item.count}</span>
                  </div>
                </div>
              )) || <p className="text-muted-foreground">No data available</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Sentiment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockCalls.map((call) => (
                <TableRow key={call.id}>
                  <TableCell>
                    {format(new Date(call.started_at), 'MMM d, h:mm a')}
                  </TableCell>
                  <TableCell>{formatPhone(call.phone)}</TableCell>
                  <TableCell>{formatDuration(call.duration_seconds)}</TableCell>
                  <TableCell>
                    <Badge className={getOutcomeColor(call.outcome)}>
                      {call.outcome}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'capitalize',
                        call.sentiment === 'positive' && 'text-green-600',
                        call.sentiment === 'negative' && 'text-red-600'
                      )}
                    >
                      {call.sentiment}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
