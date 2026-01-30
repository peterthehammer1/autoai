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
  formatCurrency,
  getStatusColor,
} from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import PhoneNumber, { Email } from '@/components/PhoneNumber'

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
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/appointments">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Appointment Details
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(apt.scheduled_date), 'EEEE, MMMM d, yyyy')} at{' '}
            {formatTime12Hour(apt.scheduled_time)}
          </p>
        </div>
        <Badge className={cn('text-sm', getStatusColor(apt.status))}>
          {apt.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Quick Actions */}
      {availableActions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {availableActions.includes('confirmed') && (
                <Button
                  onClick={() => updateMutation.mutate({ status: 'confirmed' })}
                  disabled={updateMutation.isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm
                </Button>
              )}
              {availableActions.includes('checked_in') && (
                <Button
                  onClick={() => updateMutation.mutate({ status: 'checked_in' })}
                  disabled={updateMutation.isPending}
                >
                  Check In
                </Button>
              )}
              {availableActions.includes('in_progress') && (
                <Button
                  onClick={() => updateMutation.mutate({ status: 'in_progress' })}
                  disabled={updateMutation.isPending}
                >
                  Start Work
                </Button>
              )}
              {availableActions.includes('completed') && (
                <Button
                  onClick={() => updateMutation.mutate({ status: 'completed' })}
                  disabled={updateMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Mark Complete
                </Button>
              )}
              {availableActions.includes('cancelled') && (
                <Button
                  variant="outline"
                  onClick={() => updateMutation.mutate({ status: 'cancelled' })}
                  disabled={updateMutation.isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              )}
              {apt.status === 'scheduled' && (
                <Button
                  variant="outline"
                  onClick={() => confirmMutation.mutate()}
                  disabled={confirmMutation.isPending}
                >
                  Send Confirmation SMS
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-lg font-medium">
                {apt.customer?.first_name} {apt.customer?.last_name}
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <PhoneNumber phone={apt.customer?.phone} showRevealButton={false} />
              </div>
              {apt.customer?.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Email email={apt.customer?.email} />
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/customers/${apt.customer?.id}`}>View Customer</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Vehicle Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {apt.vehicle ? (
              <>
                <div>
                  <p className="text-lg font-medium">
                    {apt.vehicle.year} {apt.vehicle.make} {apt.vehicle.model}
                  </p>
                  {apt.vehicle.color && (
                    <p className="text-sm text-muted-foreground">
                      {apt.vehicle.color}
                    </p>
                  )}
                </div>
                {apt.vehicle.license_plate && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Plate: </span>
                    {apt.vehicle.license_plate}
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No vehicle on file</p>
            )}
          </CardContent>
        </Card>

        {/* Appointment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Appointment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">
                  {format(new Date(apt.scheduled_date), 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Time</p>
                <p className="font-medium">
                  {formatTime12Hour(apt.scheduled_time)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-medium">
                  {formatDuration(apt.estimated_duration_minutes)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Bay</p>
                <p className="font-medium">{apt.bay?.name || '-'}</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-2 text-sm">
              {apt.loaner_requested && (
                <Badge variant="outline">Loaner Requested</Badge>
              )}
              {apt.shuttle_requested && (
                <Badge variant="outline">Shuttle Requested</Badge>
              )}
              {apt.waiter && <Badge variant="outline">Waiting</Badge>}
            </div>
            {apt.customer_notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Customer Notes</p>
                  <p className="text-sm">{apt.customer_notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {apt.appointment_services?.map((svc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{svc.service_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDuration(svc.duration_minutes)}
                    </p>
                  </div>
                  <p className="font-medium">
                    {formatCurrency(svc.quoted_price)}
                  </p>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between font-medium">
                <span>Total</span>
                <span>{formatCurrency(apt.quoted_total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
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
        </CardContent>
      </Card>
    </div>
  )
}
