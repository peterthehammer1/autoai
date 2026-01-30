import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { customers } from '@/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Car,
  Plus,
  Edit,
  Loader2,
} from 'lucide-react'
import {
  formatTime12Hour,
  getStatusColor,
} from '@/lib/utils'
import PhoneNumber, { Email } from '@/components/PhoneNumber'

export default function CustomerDetail() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [vehicleForm, setVehicleForm] = useState({
    year: '',
    make: '',
    model: '',
    color: '',
    license_plate: '',
    mileage: '',
    is_primary: false,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customers.get(id),
  })

  const { data: appointmentsData } = useQuery({
    queryKey: ['customer', id, 'appointments'],
    queryFn: () => customers.getAppointments(id),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (data) => customers.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer', id])
      setIsEditOpen(false)
    },
  })

  const addVehicleMutation = useMutation({
    mutationFn: (data) => customers.addVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer', id])
      setIsAddVehicleOpen(false)
      setVehicleForm({
        year: '',
        make: '',
        model: '',
        color: '',
        license_plate: '',
        mileage: '',
        is_primary: false,
      })
    },
  })

  const customer = data?.customer

  const handleEditOpen = () => {
    if (customer) {
      setEditForm({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
      })
      setIsEditOpen(true)
    }
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate(editForm)
  }

  const handleAddVehicleSubmit = (e) => {
    e.preventDefault()
    addVehicleMutation.mutate({
      ...vehicleForm,
      year: vehicleForm.year ? parseInt(vehicleForm.year) : null,
      mileage: vehicleForm.mileage ? parseInt(vehicleForm.mileage) : null,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-100" />
        <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-500">Customer not found</p>
        <Button variant="link" asChild>
          <Link to="/customers">Back to Customers</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/customers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">
            {customer.first_name} {customer.last_name}
          </h1>
          <p className="text-slate-500">Customer Profile</p>
        </div>
        <Button variant="outline" onClick={handleEditOpen}>
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
                <p className="font-medium text-slate-900">
                  {customer.first_name} {customer.last_name}
                </p>
                <p className="text-sm text-slate-500">
                  {customer.total_visits || 0} visits
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="h-4 w-4 text-slate-400" />
                <PhoneNumber phone={customer.phone} showRevealButton={false} />
              </div>
              {customer.email && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <Email email={customer.email} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vehicles */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Vehicles</CardTitle>
            <Button size="sm" onClick={() => setIsAddVehicleOpen(true)}>
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
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Car className="h-6 w-6 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-900">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </p>
                        <p className="text-sm text-slate-500">
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
                        <p className="text-sm text-slate-500">
                          {vehicle.license_plate}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-slate-500">
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
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">
                        {format(new Date(apt.scheduled_date), 'd')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(apt.scheduled_date), 'MMM')}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {apt.appointment_services
                          ?.map((s) => s.service_name)
                          .join(', ') || 'Service'}
                      </p>
                      <p className="text-sm text-slate-500">
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
            <p className="py-6 text-center text-slate-500">
              No appointment history
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Vehicle Dialog */}
      <Dialog open={isAddVehicleOpen} onOpenChange={setIsAddVehicleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vehicle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddVehicleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    placeholder="2024"
                    value={vehicleForm.year}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="make">Make</Label>
                  <Input
                    id="make"
                    placeholder="Toyota"
                    value={vehicleForm.make}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    placeholder="Camry"
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    placeholder="Silver"
                    value={vehicleForm.color}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license_plate">License Plate</Label>
                  <Input
                    id="license_plate"
                    placeholder="ABC 123"
                    value={vehicleForm.license_plate}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, license_plate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mileage">Mileage (km)</Label>
                <Input
                  id="mileage"
                  type="number"
                  placeholder="50000"
                  value={vehicleForm.mileage}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, mileage: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_primary"
                  checked={vehicleForm.is_primary}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, is_primary: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label htmlFor="is_primary" className="font-normal">Set as primary vehicle</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddVehicleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addVehicleMutation.isPending}>
                {addVehicleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Vehicle
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
