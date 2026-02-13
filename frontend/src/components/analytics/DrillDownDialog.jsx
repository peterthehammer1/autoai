import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { formatCents } from '@/lib/utils'
import { format } from 'date-fns'

function RevenueDetail({ data }) {
  if (!data) return null
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-slate-900">${data.revenue?.toFixed(2) || '0.00'}</p>
          <p className="text-xs text-slate-500">Revenue</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-slate-900">{data.appointments || 0}</p>
          <p className="text-xs text-slate-500">Appointments</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-slate-900">
            {data.appointments ? `$${(data.revenue / data.appointments).toFixed(2)}` : '-'}
          </p>
          <p className="text-xs text-slate-500">Avg Ticket</p>
        </div>
      </div>
    </div>
  )
}

function SentimentDetail({ data }) {
  if (!data) return null
  const total = (data.positive || 0) + (data.neutral || 0) + (data.negative || 0)
  const items = [
    { label: 'Positive', value: data.positive || 0, color: 'bg-emerald-500' },
    { label: 'Neutral', value: data.neutral || 0, color: 'bg-slate-400' },
    { label: 'Negative', value: data.negative || 0, color: 'bg-red-500' },
  ]

  return (
    <div className="space-y-3">
      <div className="bg-slate-50 rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-slate-900">{total}</p>
        <p className="text-xs text-slate-500">Total Calls</p>
      </div>
      <div className="space-y-2">
        {items.map(({ label, value, color }) => {
          const pct = total > 0 ? Math.round((value / total) * 100) : 0
          return (
            <div key={label}>
              <div className="flex items-center justify-between mb-1 text-sm">
                <span className="text-slate-600">{label}</span>
                <span className="font-medium text-slate-900">{value} ({pct}%)</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DrillDownDialog({ drillDown, onClose }) {
  const isOpen = !!drillDown
  const dateLabel = drillDown?.date
    ? format(new Date(drillDown.date), 'EEEE, MMM d, yyyy')
    : ''

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {drillDown?.type === 'revenue' ? 'Revenue Details' : 'Call Details'}
          </DialogTitle>
          <DialogDescription>{dateLabel}</DialogDescription>
        </DialogHeader>
        {drillDown?.type === 'revenue' ? (
          <RevenueDetail data={drillDown?.data} />
        ) : drillDown ? (
          <SentimentDetail data={drillDown.data} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
