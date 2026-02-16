import { format, formatDistanceToNow } from 'date-fns'
import { TabsContent } from '@/components/ui/tabs'
import {
  Car,
  CalendarCheck,
  Calendar,
  Clock,
  PhoneCall,
  MessageSquare,
} from 'lucide-react'
import { parseDateLocal } from '@/lib/utils'
import CarImage from '@/components/CarImage'
import InlineNotes from '@/components/InlineNotes'

export default function OverviewTab({
  selectedCustomer,
  healthData,
  appointmentsData,
  interactionsData,
  updateMutation,
}) {
  return (
    <TabsContent value="overview" className="m-0 p-4 sm:p-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Health Score Card */}
        {healthData && (
          <div className="border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-700 mb-3">
              Customer Health
            </h3>
            <div className="flex items-center gap-5">
              <div className="relative">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="32" fill="none"
                    stroke="#2563eb"
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${(healthData.health_score / 100) * 201} 201`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-semibold text-slate-800">{healthData.health_score}</span>
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Recency</span>
                  <span className="text-slate-700">{healthData.score_breakdown.recency}/30</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Frequency</span>
                  <span className="text-slate-700">{healthData.score_breakdown.frequency}/30</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Value</span>
                  <span className="text-slate-700">{healthData.score_breakdown.value}/20</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Loyalty</span>
                  <span className="text-slate-700">{healthData.score_breakdown.loyalty}/20</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {healthData?.stats?.last_visit && (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <CalendarCheck className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Last Visit</p>
                  <p className="text-xs text-slate-500">
                    {formatDistanceToNow(new Date(healthData.stats.last_visit), { addSuffix: true })}
                  </p>
                </div>
              </div>
            )}
            {appointmentsData?.appointments?.[0] && (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Next Appointment</p>
                  <p className="text-xs text-slate-500">
                    {format(parseDateLocal(appointmentsData.appointments[0].scheduled_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}
            {interactionsData?.interactions?.[0] && (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                  {interactionsData.interactions[0].type === 'call' ? (
                    <PhoneCall className="h-4 w-4 text-blue-600" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Last {interactionsData.interactions[0].type === 'call' ? 'Call' : 'SMS'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDistanceToNow(new Date(interactionsData.interactions[0].timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Primary Vehicle */}
        {selectedCustomer.vehicles?.length > 0 && (
          <div className="sm:col-span-2 border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <Car className="h-4 w-4 text-slate-400" />
              Primary Vehicle
            </h3>
            <div className="flex items-center gap-3 sm:gap-4">
              <CarImage
                make={selectedCustomer.vehicles[0].make}
                model={selectedCustomer.vehicles[0].model}
                year={selectedCustomer.vehicles[0].year}
                size="lg"
                className="shrink-0 sm:h-28 sm:w-44"
              />
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-semibold text-slate-900 truncate">
                  {selectedCustomer.vehicles[0].year} {selectedCustomer.vehicles[0].make} {selectedCustomer.vehicles[0].model}
                </p>
                <p className="text-sm text-slate-500">
                  {selectedCustomer.vehicles[0].color && `${selectedCustomer.vehicles[0].color} \u2022 `}
                  {selectedCustomer.vehicles[0].mileage
                    ? `${selectedCustomer.vehicles[0].mileage.toLocaleString()} km`
                    : 'Mileage not recorded'}
                  {selectedCustomer.vehicles[0].license_plate && ` \u2022 ${selectedCustomer.vehicles[0].license_plate}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="sm:col-span-2 border border-slate-200 rounded-lg p-4">
          <InlineNotes
            value={selectedCustomer.notes}
            onSave={(val) => updateMutation.mutate({ notes: val })}
            isPending={updateMutation.isPending}
            label="Notes"
            placeholder="Add notes about this customer..."
          />
        </div>
      </div>
    </TabsContent>
  )
}
