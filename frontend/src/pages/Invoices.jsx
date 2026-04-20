import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { invoices } from '@/api'
import { FileText, ChevronRight, User, Car } from 'lucide-react'
import { cn, centsToUSD } from '@/lib/utils'

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'void', label: 'Void' },
]

function statusColor(status) {
  return {
    draft: 'bg-slate-100 text-slate-600',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    void: 'bg-red-100 text-red-700',
  }[status] || 'bg-slate-100 text-slate-600'
}

export default function Invoices() {
  const [tab, setTab] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', tab],
    queryFn: () => invoices.list({
      status: tab === 'all' ? undefined : tab,
      limit: 100,
    }),
  })

  const list = Array.isArray(data) ? data : []

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 pl-14 sm:px-6 lg:pl-6 py-4">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-blue-400" />
          <div>
            <h1 className="text-lg font-semibold text-white">Invoices</h1>
            <p className="text-xs text-slate-400">{list.length} {tab === 'all' ? 'total' : tab}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {STATUS_TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'px-3 py-2 text-sm font-medium border-b-2 -mb-px',
              tab === t.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-slate-100 h-16 rounded animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <FileText className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">No invoices {tab !== 'all' ? `in ${tab}` : 'yet'}.</p>
          <p className="text-xs text-slate-400 mt-1">
            Generate one from a completed appointment.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {list.map((inv, i) => (
            <Link
              key={inv.id}
              to={`/invoices/${inv.id}`}
              className={cn(
                'flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors',
                i > 0 && 'border-t border-slate-100'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-slate-900 text-sm">{inv.invoice_number}</span>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded font-medium capitalize',
                    statusColor(inv.status)
                  )}>
                    {inv.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {inv.customer_name || `${inv.customer?.first_name || ''} ${inv.customer?.last_name || ''}`.trim() || '—'}
                  </span>
                  {inv.vehicle_description && (
                    <span className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      {inv.vehicle_description}
                    </span>
                  )}
                  <span>{format(parseISO(inv.invoice_date), 'MMM d, yyyy')}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-slate-900">{centsToUSD(inv.total_cents)}</div>
                {inv.tax_cents > 0 && (
                  <div className="text-xs text-slate-400">incl. {centsToUSD(inv.tax_cents)} tax</div>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
