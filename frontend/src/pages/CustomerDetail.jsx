import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { customers } from '@/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Car,
  Calendar,
  Plus,
  Edit,
} from 'lucide-react'
import {
  formatPhone,
  formatTime12Hour,
  formatCurrency,
  getStatusColor,
} from '@/lib/utils'

export default function CustomerDetail() {
  const { id } = useParams()

  const { data, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customers.get(id),
  })

  const { data: appointmentsData } = useQuery({
    queryKey: ['customer', id, 'appointments'],
    queryFn: () => customers.getAppointments(id),
    enabled: !!id,
  })

  const customer = data?.customer

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Customer not found</p>
        <Button variant="link" asChild>
          <Link to="/customers">Back to Customers</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/customers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {customer.first_name} {customer.last_name}
          </h1>
          <p className="text-muted-foreground">Customer Profile</p>
        </div>
        <Button variant="outline">
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>

      {/* Customer Info Card */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  {customer.first_name} {customer.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {customer.total_visits || 0} visits
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {formatPhone(customer.phone)}
              </div>
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {customer.email}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vehicles */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Vehicles</CardTitle>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Vehicle
            </Button>
          </CardHeader>
          <CardContent>
            {customer.vehicles?.length > 0 ? (
              <div className="space-y-3">
                {customer.vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Car className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {vehicle.color && `${vehicle.color} • `}
                          {vehicle.mileage
                            ? `${vehicle.mileage.toLocaleString()} km`
                            : 'Mileage unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {vehicle.is_primary && (
                        <Badge variant="secondary">Primary</Badge>
                      )}
                      {vehicle.license_plate && (
                        <p className="text-sm text-muted-foreground">
                          {vehicle.license_plate}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-muted-foreground">
                No vehicles on file
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointments History */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment History</CardTitle>
        </CardHeader>
        <CardContent>
          {appointmentsData?.appointments?.length > 0 ? (
            <div className="space-y-3">
              {appointmentsData.appointments.map((apt) => (
                <Link
                  key={apt.id}
                  to={`/appointments/${apt.id}`}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold">
                        {format(new Date(apt.scheduled_date), 'd')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(apt.scheduled_date), 'MMM')}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">
                        {apt.appointment_services
                          ?.map((s) => s.service_name)
                          .join(', ') || 'Service'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime12Hour(apt.scheduled_time)}
                        {apt.vehicle &&
                          ` • ${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}`}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(apt.status)}>
                    {apt.status.replace('_', ' ')}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-muted-foreground">
              No appointment history
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
