import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  ArrowRight,
  MoreVertical,
  CalendarClock,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { cn, formatTime12Hour, getStatusColor, getStatusDotColor, getNextBusinessDay } from '@/lib/utils'

const STATUS_TRANSITIONS = {
  scheduled: [
    { status: 'confirmed', label: 'Confirm' },
    { status: 'cancelled', label: 'Cancel' },
  ],
  confirmed: [
    { status: 'checked_in', label: 'Check In' },
    { status: 'cancelled', label: 'Cancel' },
  ],
  checked_in: [
    { status: 'in_progress', label: 'Start Service' },
  ],
  in_progress: [
    { status: 'completed', label: 'Mark Complete' },
  ],
}

const RESCHEDULABLE = ['scheduled', 'confirmed', 'checked_in']

function TodaysSchedule({ todayData, todayLoading, isWeekendDay, statusMutation, setRescheduleAppointment }) {
  return (
    <Card data-tour="todays-schedule" className="shadow-lg border-0 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-white border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 shadow-lg shadow-slate-500/15">
              <Calendar className="h-5 w-5 text-blue-300" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {isWeekendDay ? `${format(getNextBusinessDay(), 'EEEE')}'s Schedule` : "Today's Schedule"}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <span className="font-semibold text-blue-600">{todayData?.summary?.total || 0}</span> appointments scheduled
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="gap-1.5 shadow-sm">
            <Link to="/appointments">
              View All
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Status Pills */}
        <div className="flex items-center gap-2 px-5 py-3 bg-slate-50/50 border-b overflow-x-auto scrollbar-hide">
          {[
            { label: 'Completed', status: 'completed', count: todayData?.by_status?.completed?.length || 0 },
            { label: 'In Progress', status: 'in_progress', count: todayData?.by_status?.in_progress?.length || 0 },
            { label: 'Checked In', status: 'checked_in', count: todayData?.by_status?.checked_in?.length || 0 },
            { label: 'Confirmed', status: 'confirmed', count: todayData?.by_status?.confirmed?.length || 0 },
            { label: 'Scheduled', status: 'scheduled', count: todayData?.by_status?.scheduled?.length || 0 },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border shadow-sm whitespace-nowrap">
              <div className={cn('h-2 w-2 rounded-full', getStatusDotColor(item.status))} />
              <span className="text-xs font-medium text-slate-600">{item.count}</span>
              <span className="text-xs text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Appointments List */}
        <div className="px-3 py-2">
          {todayLoading ? (
            <div className="space-y-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-9 animate-pulse bg-slate-100 rounded-lg" />
              ))}
            </div>
          ) : todayData?.appointments?.length > 0 ? (
            <div>
              {/* Desktop: Table Layout */}
              <div className="hidden sm:block">
                {/* Column Headers */}
                <div className="flex items-center gap-3 px-3 py-1.5">
                  <span className="w-20 text-xs text-slate-400 font-medium uppercase tracking-wider">Time</span>
                  <span className="flex-1 text-xs text-slate-400 font-medium uppercase tracking-wider">Customer</span>
                  <span className="w-36 text-xs text-slate-400 font-medium uppercase tracking-wider">Vehicle</span>
                  <span className="w-32 hidden md:block text-xs text-slate-400 font-medium uppercase tracking-wider">Service</span>
                  <span className="w-28 text-right text-xs text-slate-400 font-medium uppercase tracking-wider">Status</span>
                  <span className="w-7 shrink-0" />
                </div>
                {/* Rows */}
                <div className="divide-y divide-slate-100">
                  {todayData.appointments.slice(0, 15).map((apt, index) => {
                    const transitions = STATUS_TRANSITIONS[apt.status] || []
                    const canReschedule = RESCHEDULABLE.includes(apt.status)
                    const hasActions = transitions.length > 0 || canReschedule
                    return (
                      <div
                        key={apt.id}
                        className="flex items-center gap-3 py-2.5 px-3 transition-colors hover:bg-slate-50 rounded-lg group"
                      >
                        <Link
                          to={`/appointments/${apt.id}`}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <div className="w-20 flex items-center gap-1.5">
                            {index === 0 && (
                              <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                            )}
                            <span className={cn("text-xs font-semibold text-slate-700 whitespace-nowrap", index !== 0 && "ml-3.5")}>
                              {formatTime12Hour(apt.scheduled_time)}
                            </span>
                          </div>
                          <span className="flex-1 min-w-0 text-sm font-medium text-slate-900 truncate group-hover:text-blue-700">
                            {apt.customer?.first_name} {apt.customer?.last_name}
                          </span>
                          <span className="w-36 text-xs text-slate-500 truncate">
                            {apt.vehicle ? `${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}` : '\u2014'}
                          </span>
                          <span className="w-32 hidden md:block text-xs text-slate-400 truncate">
                            {apt.appointment_services?.[0]?.service_name || '\u2014'}
                          </span>
                          <div className="w-28 flex justify-end">
                            <Badge
                              className={cn(
                                'shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full',
                                getStatusColor(apt.display_status || apt.status)
                              )}
                              aria-label={`Status: ${(apt.display_status || apt.status).replace('_', ' ')}`}
                            >
                              {(apt.display_status || apt.status).replace('_', ' ')}
                            </Badge>
                          </div>
                        </Link>
                        <div className="w-7 shrink-0 flex justify-center">
                          {hasActions && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-200 transition-all" aria-label="Actions">
                                  <MoreVertical className="h-4 w-4 text-slate-500" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                                {transitions.map((t) => (
                                  <DropdownMenuItem
                                    key={t.status}
                                    onClick={() => statusMutation.mutate({ id: apt.id, status: t.status })}
                                  >
                                    {t.label}
                                  </DropdownMenuItem>
                                ))}
                                {canReschedule && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setRescheduleAppointment(apt)}>
                                      <CalendarClock className="h-4 w-4 mr-2 text-slate-500" />
                                      Reschedule
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Mobile: Card Layout */}
              <div className="sm:hidden divide-y divide-slate-100">
                {todayData.appointments.slice(0, 15).map((apt, index) => {
                  const transitions = STATUS_TRANSITIONS[apt.status] || []
                  const canReschedule = RESCHEDULABLE.includes(apt.status)
                  const hasActions = transitions.length > 0 || canReschedule
                  return (
                    <div key={apt.id} className="px-3 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <Link to={`/appointments/${apt.id}`} className="flex items-center gap-2 min-w-0 flex-1">
                          {index === 0 && (
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                          )}
                          <span className="text-sm font-semibold text-slate-900 truncate">
                            {apt.customer?.first_name} {apt.customer?.last_name}
                          </span>
                        </Link>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            className={cn(
                              'shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full',
                              getStatusColor(apt.display_status || apt.status)
                            )}
                          >
                            {(apt.display_status || apt.status).replace('_', ' ')}
                          </Badge>
                          {hasActions && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded-md hover:bg-slate-200 transition-all" aria-label="Actions">
                                  <MoreVertical className="h-4 w-4 text-slate-400" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                                {transitions.map((t) => (
                                  <DropdownMenuItem
                                    key={t.status}
                                    onClick={() => statusMutation.mutate({ id: apt.id, status: t.status })}
                                  >
                                    {t.label}
                                  </DropdownMenuItem>
                                ))}
                                {canReschedule && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setRescheduleAppointment(apt)}>
                                      <CalendarClock className="h-4 w-4 mr-2 text-slate-500" />
                                      Reschedule
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                      <Link to={`/appointments/${apt.id}`} className="block">
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="font-medium">{formatTime12Hour(apt.scheduled_time)}</span>
                          <span className="text-slate-300">&middot;</span>
                          <span className="truncate">
                            {apt.vehicle ? `${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}` : '\u2014'}
                          </span>
                        </div>
                        {apt.appointment_services?.[0]?.service_name && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{apt.appointment_services[0].service_name}</p>
                        )}
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 p-5 mb-4 shadow-inner">
                <Calendar className="h-10 w-10 text-slate-300" />
              </div>
              <p className="font-semibold text-slate-900 text-lg">
                {isWeekendDay ? `No appointments ${format(getNextBusinessDay(), 'EEEE')}` : 'No appointments today'}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {isWeekendDay ? 'Enjoy your weekend!' : 'Your schedule is clear for now'}
              </p>
              <Button variant="outline" size="sm" asChild className="mt-4">
                <Link to="/appointments">
                  Browse Schedule
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default TodaysSchedule
