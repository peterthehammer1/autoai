import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { customers, appointments, callLogs, smsLogs, analytics } from '@/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileDown,
  Users,
  Calendar,
  Phone,
  MessageSquare,
  BarChart3,
  Loader2,
  CheckCircle,
  Target,
} from 'lucide-react'
import { arrayToCSV, downloadCSV, formatDateForFilename } from '@/lib/csv'
import { formatTime12Hour, formatCents } from '@/lib/utils'
import TargetsSettingsDialog from '@/components/analytics/TargetsSettingsDialog'

export default function Reports() {
  const [dateRange, setDateRange] = useState('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [downloadingReport, setDownloadingReport] = useState(null)
  const [downloadedReports, setDownloadedReports] = useState([])
  const [targetsOpen, setTargetsOpen] = useState(false)

  const { data: targetsData } = useQuery({
    queryKey: ['analytics', 'targets'],
    queryFn: analytics.getTargets,
  })
  const targets = targetsData?.targets || []

  // Get date range based on selection
  const getDateRange = () => {
    const today = new Date()
    switch (dateRange) {
      case 'week':
        return { start: subDays(today, 7), end: today }
      case 'month':
        return { start: startOfMonth(today), end: today }
      case 'last-month':
        const lastMonth = subMonths(today, 1)
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
      case 'custom':
        return { 
          start: customStartDate ? new Date(customStartDate) : subDays(today, 30),
          end: customEndDate ? new Date(customEndDate) : today
        }
      default:
        return { start: subDays(today, 30), end: today }
    }
  }

  const handleDownload = async (reportType) => {
    setDownloadingReport(reportType)
    
    try {
      const { start, end } = getDateRange()
      const startStr = format(start, 'yyyy-MM-dd')
      const endStr = format(end, 'yyyy-MM-dd')
      const dateLabel = `${format(start, 'MMM-d')}-to-${format(end, 'MMM-d-yyyy')}`

      switch (reportType) {
        case 'customers': {
          const data = await customers.list({ limit: 1000 })
          const csv = arrayToCSV(data.customers || [], [
            { key: 'first_name', label: 'First Name' },
            { key: 'last_name', label: 'Last Name' },
            { key: 'phone', label: 'Phone' },
            { key: 'email', label: 'Email' },
            { key: 'total_visits', label: 'Total Visits' },
            { key: 'total_spent', label: 'Total Spent' },
            { key: 'health_status', label: 'Health Status' },
            { key: 'created_at', label: 'Customer Since' },
          ])
          downloadCSV(csv, `customers-${formatDateForFilename()}.csv`)
          break
        }

        case 'appointments': {
          const data = await appointments.list({ 
            start_date: startStr, 
            end_date: endStr,
            limit: 1000 
          })
          const csv = arrayToCSV((data.appointments || []).map(apt => ({
            ...apt,
            customer_name: apt.customer ? `${apt.customer.first_name} ${apt.customer.last_name}` : '',
            customer_phone: apt.customer?.phone || '',
            vehicle: apt.vehicle ? `${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}` : '',
            services: apt.appointment_services?.map(s => s.service_name).join('; ') || '',
            time_formatted: formatTime12Hour(apt.scheduled_time),
            total_formatted: apt.quoted_total ? formatCents(apt.quoted_total) : '',
          })), [
            { key: 'scheduled_date', label: 'Date' },
            { key: 'time_formatted', label: 'Time' },
            { key: 'customer_name', label: 'Customer' },
            { key: 'customer_phone', label: 'Phone' },
            { key: 'vehicle', label: 'Vehicle' },
            { key: 'services', label: 'Services' },
            { key: 'status', label: 'Status' },
            { key: 'total_formatted', label: 'Quoted Total' },
            { key: 'created_by', label: 'Booked By' },
          ])
          downloadCSV(csv, `appointments-${dateLabel}.csv`)
          break
        }

        case 'calls': {
          const data = await callLogs.list({ limit: 1000 })
          // Filter by date range
          const filtered = (data.calls || []).filter(call => {
            if (!call.started_at) return false
            const callDate = new Date(call.started_at)
            return callDate >= start && callDate <= end
          })
          const csv = arrayToCSV(filtered.map(call => ({
            ...call,
            customer_name: call.customer ? `${call.customer.first_name} ${call.customer.last_name}` : '',
            date: call.started_at ? format(new Date(call.started_at), 'yyyy-MM-dd') : '',
            time: call.started_at ? format(new Date(call.started_at), 'h:mm a') : '',
            duration_formatted: call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}:${String(call.duration_seconds % 60).padStart(2, '0')}` : '',
          })), [
            { key: 'date', label: 'Date' },
            { key: 'time', label: 'Time' },
            { key: 'phone_number', label: 'Phone Number' },
            { key: 'customer_name', label: 'Customer' },
            { key: 'direction', label: 'Direction' },
            { key: 'outcome', label: 'Outcome' },
            { key: 'duration_formatted', label: 'Duration' },
            { key: 'sentiment', label: 'Sentiment' },
            { key: 'transcript_summary', label: 'Summary' },
          ])
          downloadCSV(csv, `call-logs-${dateLabel}.csv`)
          break
        }

        case 'sms': {
          const data = await smsLogs.list({ limit: 1000 })
          // Filter by date range
          const filtered = (data.logs || []).filter(sms => {
            if (!sms.created_at) return false
            const smsDate = new Date(sms.created_at)
            return smsDate >= start && smsDate <= end
          })
          const csv = arrayToCSV(filtered.map(sms => ({
            ...sms,
            customer_name: sms.customer ? `${sms.customer.first_name} ${sms.customer.last_name}` : '',
            date: sms.created_at ? format(new Date(sms.created_at), 'yyyy-MM-dd') : '',
            time: sms.created_at ? format(new Date(sms.created_at), 'h:mm a') : '',
          })), [
            { key: 'date', label: 'Date' },
            { key: 'time', label: 'Time' },
            { key: 'to_phone', label: 'Phone Number' },
            { key: 'customer_name', label: 'Customer' },
            { key: 'message_type', label: 'Type' },
            { key: 'status', label: 'Status' },
            { key: 'message_body', label: 'Message' },
          ])
          downloadCSV(csv, `sms-logs-${dateLabel}.csv`)
          break
        }

        case 'summary': {
          const [overviewData, callData, appointmentData] = await Promise.all([
            analytics.overview(),
            callLogs.stats('month'),
            appointments.list({ start_date: startStr, end_date: endStr, limit: 1000 })
          ])
          
          // Create summary report
          const appts = appointmentData.appointments || []
          const completed = appts.filter(a => a.status === 'completed').length
          const revenue = appts.reduce((sum, a) => sum + (a.quoted_total || 0), 0)
          
          const summaryData = [
            { metric: 'Report Period', value: `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}` },
            { metric: 'Total Appointments', value: appts.length },
            { metric: 'Completed Appointments', value: completed },
            { metric: 'Completion Rate', value: appts.length > 0 ? `${Math.round(completed / appts.length * 100)}%` : '0%' },
            { metric: 'Total Revenue (Quoted)', value: formatCents(revenue) },
            { metric: 'Total Calls (Week)', value: overviewData.week?.calls || 0 },
            { metric: 'AI Bookings (Week)', value: overviewData.week?.ai_bookings || 0 },
            { metric: 'Conversion Rate', value: `${overviewData.week?.conversion_rate || 0}%` },
            { metric: 'New Customers (Week)', value: overviewData.week?.new_customers || 0 },
          ]
          
          const csv = arrayToCSV(summaryData, [
            { key: 'metric', label: 'Metric' },
            { key: 'value', label: 'Value' },
          ])
          downloadCSV(csv, `summary-report-${dateLabel}.csv`)
          break
        }
      }
      
      setDownloadedReports(prev => [...prev, reportType])
      setTimeout(() => {
        setDownloadedReports(prev => prev.filter(r => r !== reportType))
      }, 3000)
    } catch (error) {
      console.error('Error downloading report:', error)
    } finally {
      setDownloadingReport(null)
    }
  }

  const reports = [
    {
      id: 'summary',
      name: 'Summary Report',
      description: 'Key metrics and performance overview for the selected period',
      icon: BarChart3,
    },
    {
      id: 'customers',
      name: 'Customer List',
      description: 'All customers with contact info, visit history, and health status',
      icon: Users,
    },
    {
      id: 'appointments',
      name: 'Appointments Report',
      description: 'Appointments with customer, vehicle, services, and status details',
      icon: Calendar,
    },
    {
      id: 'calls',
      name: 'Call Log Export',
      description: 'Call history with outcomes, duration, sentiment, and summaries',
      icon: Phone,
    },
    {
      id: 'sms',
      name: 'SMS Log Export',
      description: 'SMS message history with delivery status and content',
      icon: MessageSquare,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Page Header - Dark Theme */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 pl-14 sm:px-6 lg:pl-6 py-4 mb-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <FileDown className="h-5 w-5 text-blue-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">Reports</h1>
              <p className="text-xs text-slate-400">Download data exports and reports</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTargetsOpen(true)}
            className="text-xs border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            <Target className="h-3.5 w-3.5 mr-1.5" />
            Targets
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white shadow-lg border-0 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1 max-w-xs">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Date Range</label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-9 text-sm border-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {dateRange === 'custom' && (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Start Date</label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-9 text-sm border-slate-300 w-40"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">End Date</label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-9 text-sm border-slate-300 w-40"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon
          const isDownloading = downloadingReport === report.id
          const justDownloaded = downloadedReports.includes(report.id)
          
          return (
            <div
              key={report.id}
              className="bg-white shadow-lg border-0 rounded-lg p-4 flex flex-col"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-slate-800">{report.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
                </div>
              </div>
              
              <div className="mt-auto pt-3 border-t border-slate-100">
                <Button
                  onClick={() => handleDownload(report.id)}
                  disabled={isDownloading}
                  variant={justDownloaded ? "outline" : "default"}
                  size="sm"
                  className={`w-full text-xs ${justDownloaded ? 'text-green-600 border-green-200' : 'bg-slate-700 hover:bg-slate-800'}`}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Preparing...
                    </>
                  ) : justDownloaded ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                      Downloaded
                    </>
                  ) : (
                    <>
                      <FileDown className="h-3.5 w-3.5 mr-1.5" />
                      Download CSV
                    </>
                  )}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info Note */}
      <div className="bg-slate-50 border-0 rounded-lg p-3 text-xs text-slate-600">
        <p>
          <strong>Note:</strong> Customer List export includes all customers regardless of date range.
          All other reports are filtered to the selected date range.
        </p>
      </div>

      <TargetsSettingsDialog open={targetsOpen} onOpenChange={setTargetsOpen} targets={targets} />
    </div>
  )
}
