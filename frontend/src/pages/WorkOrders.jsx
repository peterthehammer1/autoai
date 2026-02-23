import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { workOrders } from '@/api'
import { Button } from '@/components/ui/button'
import {
  ClipboardList,
  ChevronRight,
  Search,
  User,
  Car,
  Calendar,
} from 'lucide-react'
import { cn, centsToUSD } from '@/lib/utils'

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'estimated,sent_to_customer', label: 'Estimated' },
  { value: 'approved,in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'invoiced,paid', label: 'Invoiced' },
]

function getWOStatusColor(status) {
  const colors = {
    draft: 'bg-slate-100 text-slate-600',
    estimated: 'bg-blue-100 text-blue-700',
    sent_to_customer: 'bg-blue-100 text-blue-700',
    approved: 'bg-emerald-100 text-emerald-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed: 'bg-slate-200 text-slate-700',
    invoiced: 'bg-purple-100 text-purple-700',
    paid: 'bg-green-100 text-green-700',
    void: 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-slate-100 text-slate-600'
}

function formatWOStatus(status) {
  return (status || '').replace(/_/g, ' ')
}

export default function WorkOrders() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(0)
  const limit = 25

  const { data, isLoading } = useQuery({
    queryKey: ['work-orders', activeTab, page],
    queryFn: () =>
      workOrders.list({
        status: activeTab === 'all' ? undefined : activeTab,
        limit,
        offset: page * limit,
      }),
  })

  const woList = data?.work_orders || []
  const pagination = data?.pagination || {}

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 pl-14 sm:px-6 lg:pl-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-blue-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">Work Orders</h1>
              <p className="text-xs text-slate-400">
                {pagination.total || 0} total work orders
              </p>
            </div>
          </div>
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

      {/* Table */}
      <div className="bg-white rounded-lg shadow-lg border-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400 w-28">
                  WO #
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                  Customer
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400 hidden md:table-cell">
                  Vehicle
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400 w-28">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400 w-24">
                  Total
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-400 w-28 hidden sm:table-cell">
                  Date
                </th>
                <th className="w-8 px-2" />
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
              ) : woList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                    No work orders found
                  </td>
                </tr>
              ) : (
                woList.map((wo) => (
                  <tr
                    key={wo.id}
                    onClick={() => navigate(`/work-orders/${wo.id}`)}
                    className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-800">
                        {wo.work_order_display}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                        <span className="text-sm text-slate-700 truncate max-w-[120px] sm:max-w-[180px]">
                          {wo.customer
                            ? `${wo.customer.first_name || ''} ${wo.customer.last_name || ''}`.trim()
                            : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-slate-500 truncate max-w-[180px] block">
                        {wo.vehicle
                          ? `${wo.vehicle.year} ${wo.vehicle.make} ${wo.vehicle.model}`
                          : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-block text-xs px-2 py-0.5 rounded capitalize',
                          getWOStatusColor(wo.status)
                        )}
                      >
                        {formatWOStatus(wo.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-slate-800">
                        {centsToUSD(wo.total_cents)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-slate-400">
                        {format(new Date(wo.created_at), 'MMM d, yyyy')}
                      </span>
                    </td>
                    <td className="px-2">
                      <ChevronRight className="h-4 w-4 text-slate-300" />
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
    </div>
  )
}
