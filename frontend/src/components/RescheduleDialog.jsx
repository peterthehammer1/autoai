import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DayPicker } from 'react-day-picker'
import { format, isBefore, startOfDay, isWeekend } from 'date-fns'
import { appointments, availability } from '@/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Calendar, Clock } from 'lucide-react'
import { cn, formatTime12Hour, parseDateLocal } from '@/lib/utils'

export default function RescheduleDialog({ appointment, open, onOpenChange }) {
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)

  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['availability', 'day', selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null],
    queryFn: () => availability.day(format(selectedDate, 'yyyy-MM-dd')),
    enabled: !!selectedDate,
  })

  const rescheduleMutation = useMutation({
    mutationFn: () =>
      appointments.update(appointment.id, {
        scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
        scheduled_time: selectedTime,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      onOpenChange(false)
      setSelectedDate(null)
      setSelectedTime(null)
    },
  })

  const today = startOfDay(new Date())
  const disabledDays = [
    { before: today },
    { dayOfWeek: [0, 6] },
  ]

  const timeSlots = slotsData?.slots?.filter(s => s.available) || []

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) {
        setSelectedDate(null)
        setSelectedTime(null)
      }
      onOpenChange(v)
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Reschedule Appointment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current info */}
          {appointment && (
            <div className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3">
              Currently: <span className="font-medium text-slate-700">
                {appointment.scheduled_date && format(parseDateLocal(appointment.scheduled_date), 'MMM d, yyyy')}
                {appointment.scheduled_time && ` at ${formatTime12Hour(appointment.scheduled_time)}`}
              </span>
            </div>
          )}

          {/* Date picker */}
          <div className="flex justify-center">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date)
                setSelectedTime(null)
              }}
              disabled={disabledDays}
              className="text-sm"
              classNames={{
                months: "flex flex-col",
                month: "space-y-3",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-semibold text-slate-800",
                nav: "space-x-1 flex items-center",
                nav_button: "h-7 w-7 bg-transparent p-0 hover:bg-slate-100 rounded-md inline-flex items-center justify-center",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-slate-400 rounded-md w-9 font-medium text-[0.8rem]",
                row: "flex w-full mt-1",
                cell: "text-center text-sm relative p-0 [&:has([aria-selected])]:bg-blue-50 rounded-md",
                day: "h-9 w-9 p-0 font-normal rounded-md hover:bg-slate-100 inline-flex items-center justify-center",
                day_selected: "bg-blue-600 text-white hover:bg-blue-700 focus:bg-blue-700",
                day_today: "bg-slate-100 font-semibold",
                day_disabled: "text-slate-300 hover:bg-transparent",
                day_outside: "text-slate-300 opacity-50",
              }}
            />
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">
                  Available times for {format(selectedDate, 'MMM d')}
                </span>
              </div>
              {slotsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : timeSlots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => setSelectedTime(slot.time)}
                      className={cn(
                        "px-2 py-2 text-xs font-medium rounded-md border transition-colors",
                        selectedTime === slot.time
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                      )}
                    >
                      {formatTime12Hour(slot.time)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No available times for this date</p>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedDate || !selectedTime || rescheduleMutation.isPending}
              onClick={() => rescheduleMutation.mutate()}
            >
              {rescheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reschedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
