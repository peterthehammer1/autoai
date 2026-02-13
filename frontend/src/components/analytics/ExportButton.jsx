import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { arrayToCSV, downloadCSV, formatDateForFilename } from '@/lib/csv'
import { formatCents } from '@/lib/utils'
import { FileDown, FileSpreadsheet, DollarSign, Database } from 'lucide-react'

function exportSummary(comprehensive) {
  if (!comprehensive) return
  const rows = [
    { Metric: 'Total Calls', Value: comprehensive.calls?.total || 0 },
    { Metric: 'Booked Calls', Value: comprehensive.calls?.booked || 0 },
    { Metric: 'Conversion Rate', Value: `${comprehensive.calls?.conversion_rate || 0}%` },
    { Metric: 'Satisfaction Rate', Value: `${comprehensive.calls?.satisfaction_rate || 0}%` },
    { Metric: 'Period Revenue', Value: formatCents(comprehensive.revenue?.period_total || 0) },
    { Metric: 'Month Revenue', Value: formatCents(comprehensive.revenue?.month_total || 0) },
    { Metric: 'Avg Ticket', Value: formatCents(comprehensive.revenue?.avg_ticket || 0) },
    { Metric: 'Appointments', Value: comprehensive.revenue?.appointments || 0 },
    { Metric: 'New Customers', Value: comprehensive.customers?.new || 0 },
    { Metric: 'Returning Rate', Value: `${comprehensive.returning_rate || 0}%` },
  ]
  const csv = arrayToCSV(rows, [
    { key: 'Metric', header: 'Metric' },
    { key: 'Value', header: 'Value' },
  ])
  downloadCSV(csv, `analytics-summary-${formatDateForFilename()}.csv`)
}

function exportRevenue(comprehensive) {
  if (!comprehensive?.revenue_trend?.length) return
  const csv = arrayToCSV(comprehensive.revenue_trend, [
    { key: 'date', header: 'Date' },
    { key: 'revenue', header: 'Revenue (cents)' },
    { key: 'appointments', header: 'Appointments' },
  ])
  downloadCSV(csv, `revenue-detail-${formatDateForFilename()}.csv`)
}

function exportAll(comprehensive) {
  if (!comprehensive) return
  const rows = []

  // Services
  for (const svc of comprehensive.top_services || []) {
    rows.push({ Section: 'Top Service', Name: svc.name, Count: svc.count, Revenue: svc.revenue })
  }
  // Customers
  for (const cust of comprehensive.top_customers || []) {
    rows.push({ Section: 'Top Customer', Name: cust.name, Count: cust.visits, Revenue: cust.total_spent })
  }
  // Outcomes
  for (const [outcome, count] of Object.entries(comprehensive.calls?.by_outcome || {})) {
    rows.push({ Section: 'Call Outcome', Name: outcome, Count: count, Revenue: '' })
  }
  // Categories
  for (const cat of comprehensive.by_category || []) {
    rows.push({ Section: 'Revenue Category', Name: cat.name, Count: '', Revenue: cat.revenue })
  }

  const csv = arrayToCSV(rows, [
    { key: 'Section', header: 'Section' },
    { key: 'Name', header: 'Name' },
    { key: 'Count', header: 'Count' },
    { key: 'Revenue', header: 'Revenue' },
  ])
  downloadCSV(csv, `analytics-all-${formatDateForFilename()}.csv`)
}

const options = [
  { label: 'Summary CSV', desc: 'Key metrics overview', icon: FileSpreadsheet, fn: exportSummary },
  { label: 'Revenue Detail', desc: 'Daily revenue breakdown', icon: DollarSign, fn: exportRevenue },
  { label: 'All Data', desc: 'Services, customers, outcomes', icon: Database, fn: exportAll },
]

export default function ExportButton({ comprehensive }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-300 hover:text-white hover:bg-slate-700">
          <FileDown className="h-3.5 w-3.5 mr-1.5" />
          Export
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="end">
        {options.map(({ label, desc, icon: Icon, fn }) => (
          <button
            key={label}
            onClick={() => fn(comprehensive)}
            className="flex items-center gap-2 w-full rounded-md px-2 py-2 text-left hover:bg-slate-100 transition-colors"
          >
            <Icon className="h-4 w-4 text-slate-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-900">{label}</p>
              <p className="text-[10px] text-slate-500">{desc}</p>
            </div>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
