import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { TabsContent } from '@/components/ui/tabs'
import { Calendar } from 'lucide-react'
import { formatTime12Hour, getStatusColor, parseDateLocal } from '@/lib/utils'
import { Link } from 'react-router-dom'

export default function AppointmentsTab({
  appointmentsData,
}) {
  return (
    <TabsContent value="appointments" className="m-0 p-4 sm:p-6">
      <h3 className="font-semibold text-slate-900 mb-4 text-sm sm:text-base">Appointment History</h3>
      {appointmentsData?.appointments?.length > 0 ? (
        <div className="space-y-3">
          {appointmentsData.appointments.map((apt) => (
            <Link
              key={apt.id}
              to={`/appointments/${apt.id}`}
              className="block bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg px-3 py-2 min-w-[52px]">
                    <p className="text-lg font-bold text-white">
                      {format(parseDateLocal(apt.scheduled_date), 'd')}
                    </p>
                    <p className="text-xs text-white/70 uppercase">
                      {format(parseDateLocal(apt.scheduled_date), 'MMM')}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {apt.appointment_services?.map((s) => s.service_name).join(', ') || 'Service'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatTime12Hour(apt.scheduled_time)}
                      {apt.vehicle && ` \u2022 ${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}`}
                    </p>
                  </div>
                </div>
                <Badge className={getStatusColor(apt.status)}>
                  {apt.status.replace('_', ' ')}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No appointment history</p>
        </div>
      )}
    </TabsContent>
  )
}
