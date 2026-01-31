import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import { smsLogs } from '@/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import PhoneNumber from '@/components/PhoneNumber'
import { Link } from 'react-router-dom'

const ITEMS_PER_PAGE = 10

export default function SmsLogs() {
  const [selectedSms, setSelectedSms] = useState(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const { data: stats } = useQuery({
    queryKey: ['sms-stats'],
    queryFn: () => smsLogs.stats('week'),
  })

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['sms-logs', typeFilter],
    queryFn: () => smsLogs.list({ limit: 200, message_type: typeFilter || undefined }),
  })

  // Pagination logic
  const allLogs = logsData?.logs || []
  const totalItems = allLogs.length
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedLogs = allLogs.slice(startIndex, endIndex)

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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Delivered</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Failed</Badge>
      default:
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>
    }
  }

  const getTypeConfig = (type) => {
    switch (type) {
      case 'confirmation':
        return { label: 'Confirmation', icon: CheckCircle2, badgeBg: 'bg-blue-100 text-blue-700 hover:bg-blue-100' }
      case 'reminder':
        return { label: 'Reminder', icon: Bell, badgeBg: 'bg-violet-100 text-violet-700 hover:bg-violet-100' }
      default:
        return { label: 'Message', icon: MessageSquare, badgeBg: 'bg-slate-100 text-slate-700 hover:bg-slate-100' }
    }
  }

  const successRate = stats?.total ? Math.round(((stats.by_status?.sent || 0) + (stats.by_status?.delivered || 0)) / stats.total * 100) : 0

  // Reset to page 1 when filter changes
  const handleFilterChange = (filter) => {
    setTypeFilter(filter)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Stats Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 text-white relative overflow-hidden">
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
            </div>
            
            <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">Confirmations</span>
              </div>
              <p className="text-3xl font-bold">{stats?.by_type?.confirmation || 0}</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="h-4 w-4 text-violet-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">Reminders</span>
              </div>
              <p className="text-3xl font-bold">{stats?.by_type?.reminder || 0}</p>
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

      {/* Filter & Pagination Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-1.5 w-fit shadow-sm">
          <Button
            variant={typeFilter === '' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleFilterChange('')}
            className="rounded-md"
          >
            <MessageCircle className="h-4 w-4 mr-1.5" />
            All
          </Button>
          <Button
            variant={typeFilter === 'confirmation' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleFilterChange('confirmation')}
            className="rounded-md"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Confirmations
          </Button>
          <Button
            variant={typeFilter === 'reminder' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleFilterChange('reminder')}
            className="rounded-md"
          >
            <Bell className="h-4 w-4 mr-1.5" />
            Reminders
          </Button>
        </div>

        {totalItems > 0 && (
          <div className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-900">{startIndex + 1}</span> to{' '}
            <span className="font-medium text-slate-900">{Math.min(endIndex, totalItems)}</span> of{' '}
            <span className="font-medium text-slate-900">{totalItems}</span> messages
          </div>
        )}
      </div>

      {/* SMS Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {logsLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-500">Loading messages...</p>
          </div>
        ) : !allLogs.length ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-900 mb-1">No messages yet</p>
            <p className="text-sm text-slate-500">SMS messages will appear here once sent</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="w-[180px]">Date & Time</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead className="hidden md:table-cell">Message Preview</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((sms) => {
                  const typeConfig = getTypeConfig(sms.message_type)
                  return (
                    <TableRow 
                      key={sms.id}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setSelectedSms(sms)}
                    >
                      <TableCell className="font-medium text-slate-600">
                        <div className="text-sm">{format(new Date(sms.created_at), 'MMM d, yyyy')}</div>
                        <div className="text-xs text-slate-400">{format(new Date(sms.created_at), 'h:mm a')}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-slate-500" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">
                              {sms.customer 
                                ? `${sms.customer.first_name} ${sms.customer.last_name}`
                                : <PhoneNumber phone={sms.to_phone} showRevealButton={false} />
                              }
                            </div>
                            {sms.customer && (
                              <div className="text-xs text-slate-400">
                                <PhoneNumber phone={sms.to_phone} showRevealButton={false} />
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-sm text-slate-600 truncate max-w-xs">
                          {sms.message_body.split('\n')[0]}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge className={typeConfig.badgeBg}>
                          {typeConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(sms.status)}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </TableCell>
                    </TableRow>
                  )
                })}
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

      {/* SMS Detail Dialog */}
      <Dialog open={!!selectedSms} onOpenChange={() => setSelectedSms(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
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
                {getStatusBadge(selectedSms.status)}
                <span className="text-xs text-slate-500 ml-auto">
                  {format(new Date(selectedSms.created_at), 'MMM d, h:mm a')}
                </span>
              </div>
              
              {/* Message */}
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Message</p>
                <div className="bg-primary text-white rounded-2xl rounded-br-sm p-4 shadow-sm">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedSms.message_body}
                  </p>
                </div>
              </div>
              
              {/* Error if failed */}
              {selectedSms.status === 'failed' && selectedSms.error_message && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-700 mb-1 flex items-center gap-1.5">
                    <XCircle className="h-4 w-4" />
                    Delivery Failed
                  </p>
                  <p className="text-sm text-red-600">{selectedSms.error_message}</p>
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
