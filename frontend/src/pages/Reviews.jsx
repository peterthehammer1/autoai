import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { reviews } from '@/api'
import { Button } from '@/components/ui/button'
import { Star, Settings, Send, MousePointerClick, CheckCircle2 } from 'lucide-react'
import { cn, parseDateLocal } from '@/lib/utils'
import ReviewSettingsDialog from '@/components/reviews/ReviewSettingsDialog'

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'sent', label: 'Sent' },
  { value: 'clicked', label: 'Clicked' },
  { value: 'completed', label: 'Completed' },
  { value: 'skipped', label: 'Skipped' },
]

function getStatusColor(status) {
  const colors = {
    pending: 'bg-slate-100 text-slate-600',
    sent: 'bg-blue-100 text-blue-700',
    clicked: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
    skipped: 'bg-slate-100 text-slate-500',
    failed: 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-slate-100 text-slate-600'
}

function getTypeBadge(type) {
  if (type === 'internal_feedback') {
    return <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">Feedback</span>
  }
  return <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">Google</span>
}

export default function Reviews() {
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const limit = 25

  const { data: stats } = useQuery({
    queryKey: ['reviews', 'stats'],
    queryFn: () => reviews.stats(),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', 'list', activeTab, page],
    queryFn: () =>
      reviews.list({
        status: activeTab === 'all' ? undefined : activeTab,
        limit,
        offset: page * limit,
      }),
  })

  const list = data?.review_requests || []
  const pagination = data?.pagination || {}

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 pl-14 sm:px-6 lg:pl-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Star className="h-5 w-5 text-amber-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">Reviews</h1>
              <p className="text-xs text-slate-400">
                Automated review requests & reputation management
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg shadow-lg border-0 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Send className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-slate-500">Requests Sent</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats?.total_sent || 0}</p>
          <p className="text-xs text-slate-400">{stats?.sent_30d || 0} in last 30 days</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg border-0 p-4">
          <div className="flex items-center gap-2 mb-1">
            <MousePointerClick className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-slate-500">Click Rate</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats?.click_rate || '0.0'}%</p>
          <p className="text-xs text-slate-400">{stats?.total_clicked || 0} clicked</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg border-0 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-xs text-slate-500">Completed</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats?.total_completed || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg border-0 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Star className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-slate-500">Completion Rate</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats?.completion_rate || '0.0'}%</p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setActiveTab(tab.value)
              setPage(0)
            }}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
              activeTab === tab.value
                ? 'bg-slate-800 text-white'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-lg border-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                  Customer
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400 hidden sm:table-cell w-28">
                  Appt Date
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400 w-24">
                  Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400 w-24">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400 hidden md:table-cell w-36">
                  Sent At
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400 hidden lg:table-cell w-36">
                  Clicked At
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400 hidden lg:table-cell">
                  Skip Reason
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-5 bg-slate-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                    No review requests found
                  </td>
                </tr>
              ) : (
                list.map((rr) => (
                  <tr key={rr.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700">
                        {rr.customer
                          ? `${rr.customer.first_name || ''} ${rr.customer.last_name || ''}`.trim()
                          : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-slate-500">
                        {rr.appointment?.scheduled_date
                          ? format(parseDateLocal(rr.appointment.scheduled_date), 'MMM d, yyyy')
                          : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {getTypeBadge(rr.review_type)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-block text-xs px-2 py-0.5 rounded capitalize', getStatusColor(rr.status))}>
                        {rr.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-slate-400">
                        {rr.sent_at ? format(new Date(rr.sent_at), 'MMM d, h:mm a') : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-slate-400">
                        {rr.clicked_at ? format(new Date(rr.clicked_at), 'MMM d, h:mm a') : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-slate-400">
                        {rr.skip_reason ? rr.skip_reason.replace(/_/g, ' ') : '-'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Showing {page * limit + 1}–{Math.min((page + 1) * limit, pagination.total)} of{' '}
              {pagination.total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                className="text-xs h-8"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.has_more}
                className="text-xs h-8"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <ReviewSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
