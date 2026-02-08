import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { appointments } from '@/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Car,
  Phone,
  Mail,
  MapPin,
  Wrench,
  DollarSign,
  CheckCircle,
  XCircle,
  Edit,
} from 'lucide-react'
import {
  cn,
  formatTime12Hour,
  formatDuration,
  formatCents,
  getStatusColor,
} from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import PhoneNumber, { Email } from '@/components/PhoneNumber'
import CarImage from '@/components/CarImage'

export default function AppointmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading, error } = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointments.get(id),
  })

  const updateMutation = useMutation({
    mutationFn: (updates) => appointments.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointment', id])
      toast({ title: 'Appointment updated' })
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })

  const confirmMutation = useMutation({
    mutationFn: () => appointments.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointment', id])
      toast({ title: 'Confirmation sent' })
    },
  })

  const apt = data?.appointment

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse bg-slate-100" />
        <div className="h-64 animate-pulse bg-slate-100" />
      </div>
    )
  }

  if (error || !apt) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Appointment not found</p>
        <Button variant="link" asChild>
          <Link to="/appointments">Back to Appointments</Link>
        </Button>
      </div>
    )
  }

  const statusActions = {
    scheduled: ['confirmed', 'cancelled'],
    confirmed: ['checked_in', 'cancelled', 'no_show'],
    checked_in: ['in_progress', 'cancelled'],
    in_progress: ['completed'],
  }

  const availableActions = statusActions[apt.status] || []

  return (
    <div className="space-y-4">
      {/* Header - Dark Theme */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700">
            <Link to="/appointments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Calendar className="h-5 w-5 text-blue-400" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white">
              Appointment Details
            </h1>
            <p className="text-xs text-slate-400">
              {format(new Date(apt.scheduled_date), 'EEEE, MMMM d, yyyy')} at{' '}
              {formatTime12Hour(apt.scheduled_time)}
            </p>
          </div>
          <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded capitalize">
            {apt.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      {availableActions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="flex flex-wrap gap-2">
            {availableActions.includes('confirmed') && (
              <Button
                onClick={() => updateMutation.mutate({ status: 'confirmed' })}
                disabled={updateMutation.isPending}
                size="sm"
                className="bg-slate-700 hover:bg-slate-800"
              >
                Confirm
              </Button>
            )}
            {availableActions.includes('checked_in') && (
              <Button
                onClick={() => updateMutation.mutate({ status: 'checked_in' })}
                disabled={updateMutation.isPending}
                size="sm"
                className="bg-slate-700 hover:bg-slate-800"
              >
                Check In
              </Button>
            )}
            {availableActions.includes('in_progress') && (
              <Button
                onClick={() => updateMutation.mutate({ status: 'in_progress' })}
                disabled={updateMutation.isPending}
                size="sm"
                className="bg-slate-700 hover:bg-slate-800"
              >
                Start Work
              </Button>
            )}
            {availableActions.includes('completed') && (
              <Button
                onClick={() => updateMutation.mutate({ status: 'completed' })}
                disabled={updateMutation.isPending}
                size="sm"
                className="bg-slate-700 hover:bg-slate-800"
              >
                Mark Complete
              </Button>
            )}
            {availableActions.includes('cancelled') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateMutation.mutate({ status: 'cancelled' })}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
            )}
            {apt.status === 'scheduled' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
              >
                Send Confirmation SMS
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Customer Info */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30">
            <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-400" />
              Customer
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm font-medium text-slate-800">
              {apt.customer?.first_name} {apt.customer?.last_name}
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <PhoneNumber phone={apt.customer?.phone} email={apt.customer?.email} />
              </div>
              {apt.customer?.email && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <Email email={apt.customer?.email} />
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to={`/customers/${apt.customer?.id}`}>View Customer</Link>
            </Button>
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30">
            <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Car className="h-4 w-4 text-blue-400" />
              Vehicle
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {apt.vehicle ? (
              <>
                <div className="flex items-start gap-3">
                  <CarImage 
                    make={apt.vehicle.make} 
                    model={apt.vehicle.model} 
                    year={apt.vehicle.year}
                    size="md"
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {apt.vehicle.year} {apt.vehicle.make} {apt.vehicle.model}
                    </p>
                    {apt.vehicle.color && (
                      <p className="text-xs text-slate-500">
                        {apt.vehicle.color}
                      </p>
                    )}
                    {apt.vehicle.license_plate && (
                      <p className="text-xs text-slate-500">
                        Plate: {apt.vehicle.license_plate}
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-500">No vehicle on file</p>
            )}
          </div>
        </div>

        {/* Appointment Details */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30">
            <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-400" />
              Appointment
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Date</p>
                <p className="text-sm text-slate-800">
                  {format(new Date(apt.scheduled_date), 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Time</p>
                <p className="text-sm text-slate-800">
                  {formatTime12Hour(apt.scheduled_time)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Duration</p>
                <p className="text-sm text-slate-800">
                  {formatDuration(apt.estimated_duration_minutes)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Bay</p>
                <p className="text-sm text-slate-800">{apt.bay?.name || '-'}</p>
              </div>
            </div>
            {(apt.loaner_requested || apt.shuttle_requested || apt.waiter) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                {apt.loaner_requested && (
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">Loaner</span>
                )}
                {apt.shuttle_requested && (
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">Shuttle</span>
                )}
                {apt.waiter && (
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">Waiting</span>
                )}
              </div>
            )}
            {apt.customer_notes && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Customer Notes</p>
                <p className="text-sm text-slate-700">{apt.customer_notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Services */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30">
            <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-blue-400" />
              Services
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {apt.appointment_services?.map((svc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div>
                    <p className="text-sm text-slate-800">{svc.service_name}</p>
                    <p className="text-xs text-slate-500">
                      {formatDuration(svc.duration_minutes)}
                    </p>
                  </div>
                  <p className="text-sm text-slate-700">
                    {formatCents(svc.quoted_price)}
                  </p>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-sm font-medium text-slate-800">Total</span>
                <span className="text-sm font-medium text-slate-800">{formatCents(apt.quoted_total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <div>
            <span>Created: </span>
            {format(new Date(apt.created_at), 'MMM d, yyyy h:mm a')}
          </div>
          <div>
            <span>Source: </span>
            {apt.created_by === 'ai_agent' ? 'AI Voice Agent' : apt.created_by}
          </div>
          {apt.call_id && (
            <div>
              <span>Call ID: </span>
              {apt.call_id}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
