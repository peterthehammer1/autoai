import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, getDay } from 'date-fns'
import { CardHeader, CardContent } from '@/components/ui/card'
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { appointments } from '@/api'

function MiniCalendar() {
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  const { data: monthAppointments } = useQuery({
    queryKey: ['appointments', 'month', format(calendarMonth, 'yyyy-MM')],
    queryFn: () => appointments.list({
      start_date: format(startOfMonth(calendarMonth), 'yyyy-MM-dd'),
      end_date: format(endOfMonth(calendarMonth), 'yyyy-MM-dd'),
      limit: 200
    }),
  })

  const appointmentsByDate = {}
  if (monthAppointments?.data) {
    monthAppointments.data.forEach(apt => {
      const date = apt.scheduled_date
      appointmentsByDate[date] = (appointmentsByDate[date] || 0) + 1
    })
  }

  const monthStart = startOfMonth(calendarMonth)
  const monthEnd = endOfMonth(calendarMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDayOfWeek = getDay(monthStart)

  return (
    <>
      <CardHeader className="pb-2 bg-gradient-to-r from-slate-50 to-white border-b">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </button>
          <span className="text-sm font-semibold text-slate-800">
            {format(calendarMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-3 flex-1">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
            <div key={i} className="text-center text-xs font-semibold text-slate-400 py-1 uppercase tracking-wide" aria-label={day}>
              {day.charAt(0)}
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {/* Actual days */}
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const count = appointmentsByDate[dateStr] || 0
            const isCurrentDay = isToday(day)

            return (
              <Link
                key={dateStr}
                to={`/appointments?date=${dateStr}`}
                aria-label={`${format(day, 'MMMM d')}${count > 0 ? `, ${count} appointment${count > 1 ? 's' : ''}` : ''}`}
                className={cn(
                  'aspect-square flex flex-col items-center justify-center text-xs rounded-lg transition-all relative',
                  isCurrentDay
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white font-semibold shadow-md shadow-blue-500/25'
                    : 'hover:bg-slate-100 text-slate-700',
                  count > 0 && !isCurrentDay && 'font-semibold bg-slate-50'
                )}
              >
                <span>{format(day, 'd')}</span>
                {count > 0 && (
                  <span className={cn(
                    'absolute bottom-1 w-1 h-1 rounded-full',
                    isCurrentDay ? 'bg-white' : 'bg-blue-500'
                  )} />
                )}
              </Link>
            )
          })}
        </div>
      </CardContent>
      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
        <p className="text-xs text-slate-500 text-center">Click a date to view appointments</p>
      </div>
    </>
  )
}

export default MiniCalendar
