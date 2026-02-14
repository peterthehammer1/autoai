import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, addDays, subDays } from 'date-fns'
import { Link } from 'react-router-dom'
import { appointments } from '@/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatTime12Hour, formatCents } from '@/lib/utils'
import {
  Columns,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Car,
  Wrench,
  ExternalLink,
} from 'lucide-react'

const STATUS_COLORS = {
  scheduled: 'bg-blue-500',
  confirmed: 'bg-emerald-500',
  checked_in: 'bg-cyan-500',
  in_progress: 'bg-amber-500',
  checking_out: 'bg-orange-500',
  completed: 'bg-slate-400',
}

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  in_progress: 'In Progress',
  checking_out: 'Checking Out',
  completed: 'Completed',
}

// Business hours: 7 AM to 4 PM = 9 hours = 540 minutes
const OPEN_HOUR = 7
const CLOSE_HOUR = 16
const TOTAL_MINUTES = (CLOSE_HOUR - OPEN_HOUR) * 60
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR + 1 }, (_, i) => OPEN_HOUR + i)

const MIN_BLOCK_WIDTH = 7 // minimum % width so short appointments stay readable

function getPositionStyle(apt) {
  const [h, m] = (apt.scheduled_time || '07:00').split(':').map(Number)
  const minutesFromOpen = (h - OPEN_HOUR) * 60 + m
  const duration = apt.estimated_duration_minutes || 60
  const left = Math.max(0, (minutesFromOpen / TOTAL_MINUTES) * 100)
  const rawWidth = (duration / TOTAL_MINUTES) * 100
  const width = Math.max(Math.min(rawWidth, 100 - left), MIN_BLOCK_WIDTH)
  return { left: `${left}%`, width: `${width}%` }
}

export default function BayView() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedApt, setSelectedApt] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', 'by-bay', selectedDate],
    queryFn: () => appointments.byBay(selectedDate),
  })

  const navigateDate = (dir) => {
    const d = dir === 'prev'
      ? subDays(new Date(selectedDate), 1)
      : addDays(new Date(selectedDate), 1)
    setSelectedDate(format(d, 'yyyy-MM-dd'))
  }

  const goToday = () => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))

  const bays = data?.bays || []
  const unassigned = data?.unassigned || []

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 pl-14 sm:px-6 lg:pl-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Columns className="h-5 w-5 text-blue-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">Bay View</h1>
              <p className="text-xs text-slate-400">Service bay scheduling board</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
              onClick={() => navigateDate('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
              onClick={goToday}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
              onClick={() => navigateDate('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8 px-2 text-xs bg-slate-700 border border-slate-600 text-slate-200 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex items-center gap-4 flex-wrap">
        <p className="text-sm font-medium text-slate-700">
          {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
        </p>
        <Badge variant="secondary" className="text-xs">
          {data?.total_appointments || 0} appointments
        </Badge>
        <div className="flex items-center gap-2 ml-auto">
          {Object.entries(STATUS_LABELS).slice(0, 4).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1">
              <div className={cn('h-2.5 w-2.5 rounded-sm', STATUS_COLORS[key])} />
              <span className="text-[10px] text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduling Board */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="bg-white shadow-lg border-0 rounded-lg overflow-hidden">
          {/* Time header */}
          <div className="flex border-b border-slate-200">
            <div className="w-32 lg:w-40 shrink-0 px-3 py-2 bg-slate-50 border-r border-slate-200">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Bay</span>
            </div>
            <div className="flex-1 flex">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="flex-1 text-center text-[10px] text-slate-400 py-2 border-l border-slate-100 first:border-l-0"
                >
                  {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </div>
              ))}
            </div>
          </div>

          {/* Bay rows */}
          {bays.map((bay) => (
            <div key={bay.id} className="flex border-b border-slate-100 last:border-b-0 h-16">
              <div className="w-32 lg:w-40 shrink-0 px-3 py-2 bg-slate-50 border-r border-slate-200 flex flex-col justify-center">
                <span className="text-sm font-medium text-slate-800 truncate">{bay.name}</span>
                <span className="text-[10px] text-slate-400 capitalize">{bay.bay_type?.replace('_', ' ')}</span>
              </div>
              <div className="flex-1 relative">
                {/* Hour grid lines */}
                <div className="absolute inset-0 flex">
                  {HOURS.map((hour) => (
                    <div key={hour} className="flex-1 border-l border-slate-50 first:border-l-0" />
                  ))}
                </div>
                {/* Appointment blocks */}
                {bay.appointments.map((apt) => {
                  const style = getPositionStyle(apt)
                  const serviceName = apt.appointment_services?.[0]?.service_name || 'Service'
                  const customerName = apt.customer
                    ? `${apt.customer.first_name || ''} ${apt.customer.last_name || ''}`.trim()
                    : 'Unknown'
                  return (
                    <button
                      key={apt.id}
                      onClick={() => setSelectedApt(apt)}
                      className={cn(
                        'absolute top-1.5 bottom-1.5 rounded-md px-2 py-1 text-white text-[11px] leading-tight font-medium overflow-hidden shadow-sm cursor-pointer hover:brightness-110 hover:shadow-md transition-all z-10',
                        STATUS_COLORS[apt.status] || 'bg-slate-400'
                      )}
                      style={style}
                      title={`${customerName} - ${serviceName}`}
                    >
                      <span className="truncate block font-semibold">{customerName}</span>
                      <span className="truncate block opacity-80 text-[10px]">{serviceName}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Unassigned row */}
          {unassigned.length > 0 && (
            <div className="flex border-t-2 border-slate-200 h-16">
              <div className="w-32 lg:w-40 shrink-0 px-3 py-2 bg-amber-50 border-r border-slate-200 flex flex-col justify-center">
                <span className="text-sm font-medium text-amber-700">Unassigned</span>
                <span className="text-[10px] text-amber-500">{unassigned.length} appt{unassigned.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex-1 relative">
                <div className="absolute inset-0 flex">
                  {HOURS.map((hour) => (
                    <div key={hour} className="flex-1 border-l border-slate-50 first:border-l-0" />
                  ))}
                </div>
                {unassigned.map((apt) => {
                  const style = getPositionStyle(apt)
                  const customerName = apt.customer
                    ? `${apt.customer.first_name || ''} ${apt.customer.last_name || ''}`.trim()
                    : 'Unknown'
                  const serviceName = apt.appointment_services?.[0]?.service_name || 'Service'
                  return (
                    <button
                      key={apt.id}
                      onClick={() => setSelectedApt(apt)}
                      className={cn(
                        'absolute top-1.5 bottom-1.5 rounded-md px-2 py-1 text-white text-[11px] leading-tight font-medium overflow-hidden shadow-sm cursor-pointer hover:brightness-110 hover:shadow-md transition-all z-10',
                        STATUS_COLORS[apt.status] || 'bg-slate-400'
                      )}
                      style={style}
                      title={`${customerName} - ${serviceName}`}
                    >
                      <span className="truncate block font-semibold">{customerName}</span>
                      <span className="truncate block opacity-80 text-[10px]">{serviceName}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {bays.length === 0 && unassigned.length === 0 && (
            <div className="py-12 text-center">
              <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700">No appointments</p>
              <p className="text-xs text-slate-500 mt-1">No scheduled appointments for this date</p>
            </div>
          )}
        </div>
      )}

      {/* Appointment Detail Dialog */}
      <Dialog open={!!selectedApt} onOpenChange={(open) => !open && setSelectedApt(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Appointment Details
            </DialogTitle>
          </DialogHeader>
          {selectedApt && (
            <div className="space-y-4">
              {/* Customer */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {selectedApt.customer
                      ? `${selectedApt.customer.first_name || ''} ${selectedApt.customer.last_name || ''}`.trim()
                      : 'Unknown'}
                  </p>
                  {selectedApt.customer?.phone && (
                    <p className="text-xs text-slate-500">{selectedApt.customer.phone}</p>
                  )}
                </div>
              </div>

              {/* Time & Status */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Time</p>
                  <p className="font-medium">{formatTime12Hour(selectedApt.scheduled_time)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Duration</p>
                  <p className="font-medium">{selectedApt.estimated_duration_minutes || 60} min</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <span className={cn(
                    'inline-flex items-center gap-1.5 text-xs font-medium capitalize',
                  )}>
                    <span className={cn('h-2 w-2 rounded-full', STATUS_COLORS[selectedApt.status])} />
                    {(selectedApt.status || '').replace('_', ' ')}
                  </span>
                </div>
                {selectedApt.technician && (
                  <div>
                    <p className="text-xs text-slate-500">Technician</p>
                    <p className="font-medium text-sm">
                      {selectedApt.technician.first_name} {selectedApt.technician.last_name}
                    </p>
                  </div>
                )}
              </div>

              {/* Vehicle */}
              {selectedApt.vehicle && (
                <div className="flex items-center gap-2 text-sm">
                  <Car className="h-4 w-4 text-slate-400" />
                  <span>{selectedApt.vehicle.year} {selectedApt.vehicle.make} {selectedApt.vehicle.model}</span>
                </div>
              )}

              {/* Services */}
              {selectedApt.appointment_services?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Services</p>
                  <div className="space-y-1">
                    {selectedApt.appointment_services.map((svc, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Wrench className="h-3.5 w-3.5 text-slate-400" />
                          {svc.service_name}
                        </span>
                        {svc.quoted_price && (
                          <span className="text-slate-500">{formatCents(svc.quoted_price)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Link to detail */}
              <Button variant="outline" className="w-full" asChild>
                <Link to={`/appointments/${selectedApt.id}`}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Details
                </Link>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
