import { useState } from 'react'
import { format } from 'date-fns'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CalendarDays } from 'lucide-react'

export default function DateRangePicker({ period, onPeriodChange, customRange, onCustomRangeChange }) {
  const [popoverOpen, setPopoverOpen] = useState(false)

  const handlePeriodChange = (value) => {
    if (value === 'custom') {
      setPopoverOpen(true)
    }
    onPeriodChange(value)
  }

  const rangeLabel = customRange?.from && customRange?.to
    ? `${format(customRange.from, 'MMM d')} – ${format(customRange.to, 'MMM d')}`
    : 'Select dates'

  return (
    <div className="flex items-center gap-2">
      <Tabs value={period} onValueChange={handlePeriodChange}>
        <TabsList className="bg-slate-700/50 p-1 border border-slate-600">
          <TabsTrigger value="day" className="text-xs text-slate-300 data-[state=active]:bg-slate-600 data-[state=active]:text-white">Today</TabsTrigger>
          <TabsTrigger value="week" className="text-xs text-slate-300 data-[state=active]:bg-slate-600 data-[state=active]:text-white">Week</TabsTrigger>
          <TabsTrigger value="month" className="text-xs text-slate-300 data-[state=active]:bg-slate-600 data-[state=active]:text-white">Month</TabsTrigger>
          <TabsTrigger value="custom" className="text-xs text-slate-300 data-[state=active]:bg-slate-600 data-[state=active]:text-white">Custom</TabsTrigger>
        </TabsList>
      </Tabs>

      {period === 'custom' && (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-300 hover:text-white hover:bg-slate-700 gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {rangeLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-slate-700 bg-slate-900" align="end" sideOffset={8}>
              <DayPicker
                mode="range"
                selected={customRange}
                onSelect={(range) => {
                  onCustomRangeChange(range)
                  if (range?.from && range?.to) setPopoverOpen(false)
                }}
                numberOfMonths={1}
                disabled={{ after: new Date() }}
                style={{ '--rdp-accent-color': '#2563eb', '--rdp-background-color': '#1e293b' }}
                classNames={{
                  months: 'flex flex-col p-3',
                  month: 'space-y-3',
                  caption: 'flex justify-center relative items-center text-slate-200 text-sm font-medium py-1',
                  caption_label: 'text-sm font-medium',
                  nav: 'space-x-1 flex items-center',
                  nav_button: 'h-7 w-7 bg-transparent p-0 text-slate-400 hover:text-white inline-flex items-center justify-center rounded-md',
                  nav_button_previous: 'absolute left-1',
                  nav_button_next: 'absolute right-1',
                  table: 'w-full border-collapse',
                  head_row: 'flex',
                  head_cell: 'text-slate-500 rounded-md w-9 font-normal text-[0.7rem]',
                  row: 'flex w-full mt-1',
                  cell: 'text-center text-sm p-0 relative h-9 w-9',
                  day: 'h-9 w-9 p-0 font-normal text-slate-300 hover:bg-slate-700 rounded-md inline-flex items-center justify-center cursor-pointer',
                  day_selected: 'bg-blue-600 text-white hover:bg-blue-600',
                  day_today: 'bg-slate-700 text-white font-semibold',
                  day_outside: 'text-slate-600 opacity-50',
                  day_disabled: 'text-slate-700 opacity-30 cursor-default',
                  day_range_middle: 'bg-blue-600/20 text-blue-200 rounded-none',
                  day_range_start: 'bg-blue-600 text-white rounded-l-md rounded-r-none',
                  day_range_end: 'bg-blue-600 text-white rounded-r-md rounded-l-none',
                }}
              />
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
