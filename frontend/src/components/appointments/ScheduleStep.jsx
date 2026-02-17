import { format, isToday, isTomorrow } from 'date-fns'
import { parseDateLocal } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDuration, formatTime12Hour } from '@/lib/utils'
import {
  Clock,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react'

function ScheduleStep({
  selectedServices,
  totalDuration,
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  availabilityData,
  availabilityLoading,
  slotsByDate,
}) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="bg-muted/50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Services: {selectedServices.length}
            </span>
            <span className="font-medium">
              Duration: {formatDuration(totalDuration)}
            </span>
          </div>
        </CardContent>
      </Card>

      {availabilityLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Checking availability...</span>
        </div>
      ) : !availabilityData?.available ? (
        <div className="text-center py-8 text-muted-foreground" role="alert">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
          <p>No availability found</p>
          <p className="text-sm">
            Try selecting different services or check back later
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(slotsByDate).map(([date, slots]) => {
            const dateObj = parseDateLocal(date)
            const dayLabel = isToday(dateObj)
              ? 'Today'
              : isTomorrow(dateObj)
                ? 'Tomorrow'
                : format(dateObj, 'EEEE, MMM d')

            return (
              <div key={date}>
                <h4 className="font-medium text-sm mb-2">{dayLabel}</h4>
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot) => {
                    const isSelected =
                      selectedDate === slot.date &&
                      selectedTime === slot.start_time

                    return (
                      <Button
                        key={`${slot.date}-${slot.start_time}`}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setSelectedDate(slot.date)
                          setSelectedTime(slot.start_time)
                        }}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTime12Hour(slot.start_time)}
                      </Button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Selected Time Summary */}
      {selectedDate && selectedTime && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-800">
              <Check className="h-5 w-5" />
              <span className="font-semibold">Selected Time</span>
            </div>
            <p className="text-lg mt-2">
              {format(parseDateLocal(selectedDate), 'EEEE, MMMM d, yyyy')} at{' '}
              {formatTime12Hour(selectedTime)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ScheduleStep
