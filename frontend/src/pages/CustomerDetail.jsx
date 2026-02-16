import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import { customers, analytics, portal } from '@/api'
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
  Heart,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Target,
  Send,
  Check,
} from 'lucide-react'
import {
  formatTime12Hour,
  getStatusColor,
  formatCents,
  cn,
  parseDateLocal,
} from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import PhoneNumber, { Email } from '@/components/PhoneNumber'
import CarImage from '@/components/CarImage'
import VehicleIntelligence from '@/components/VehicleIntelligence'
import { useCustomerDetailTour } from '@/hooks/use-customer-detail-tour'
import { useBreadcrumbEntity } from '@/components/Breadcrumbs'

export default function CustomerDetail() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  
  const { toast } = useToast()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false)
  const [portalSending, setPortalSending] = useState(false)
  const [portalSent, setPortalSent] = useState(false)
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

  const { data: healthData, isLoading: isHealthLoading } = useQuery({
    queryKey: ['customer', id, 'health'],
    queryFn: () => analytics.customerHealth(id),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (data) => customers.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] })
      setIsEditOpen(false)
    },
  })

  const addVehicleMutation = useMutation({
    mutationFn: (data) => customers.addVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] })
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
  useCustomerDetailTour(!isLoading && !isHealthLoading)

  const { setEntityName } = useBreadcrumbEntity()
  useEffect(() => {
    if (customer) {
      setEntityName(`${customer.first_name || ''} ${customer.last_name || ''}`.trim())
    }
    return () => setEntityName(null)
  }, [customer, setEntityName])

  const handleSendPortalLink = async () => {
    setPortalSending(true)
    try {
      await portal.generateToken(id, true)
      setPortalSent(true)
      toast({ title: 'Portal link sent via SMS' })
      setTimeout(() => setPortalSent(false), 3000)
    } catch {
      toast({ title: 'Failed to send portal link', variant: 'destructive' })
    } finally {
      setPortalSending(false)
    }
  }

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
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse bg-slate-100" />
        <div className="h-64 animate-pulse bg-slate-100" />
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
    <div className="space-y-4">
      {/* Header - Dark Theme */}
      <div data-tour="custdetail-header" className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 pl-14 sm:px-6 lg:pl-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700">
            <Link to="/customers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <User className="h-5 w-5 text-blue-400" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white">
              {customer.first_name} {customer.last_name}
            </h1>
            <p className="text-xs text-slate-400">Customer Profile</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendPortalLink}
            disabled={portalSending || portalSent}
            className="text-xs border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            {portalSent ? (
              <><Check className="mr-1.5 h-3.5 w-3.5" /> Sent</>
            ) : portalSending ? (
              'Sending...'
            ) : (
              <><Send className="mr-1.5 h-3.5 w-3.5" /> Portal</>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleEditOpen} className="text-xs border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white">
            <Edit className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white shadow-lg border-0 rounded-lg overflow-hidden md:col-span-1">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-medium text-slate-700">Contact Info</h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100">
                <User className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {customer.first_name} {customer.last_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {customer.total_visits || 0} visits
                </p>
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <PhoneNumber phone={customer.phone} showRevealButton={false} />
              </div>
              {customer.email && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <Email email={customer.email} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customer Health Score Card */}
        {healthData && (
          <div data-tour="custdetail-health" className="bg-white shadow-lg border-0 rounded-lg overflow-hidden md:col-span-2">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-slate-400" />
                  Customer Health Score
                </h3>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded',
                  healthData.health_color === 'green' ? 'bg-slate-100 text-slate-700' :
                  healthData.health_color === 'blue' ? 'bg-slate-100 text-slate-600' :
                  healthData.health_color === 'yellow' ? 'bg-slate-100 text-slate-600' :
                  'bg-slate-100 text-slate-600'
                )}>
                  {healthData.health_status}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {/* Score Display */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="8"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke={
                        healthData.health_color === 'green' ? '#10b981' :
                        healthData.health_color === 'blue' ? '#3b82f6' :
                        healthData.health_color === 'yellow' ? '#f59e0b' :
                        '#ef4444'
                      }
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(healthData.health_score / 100) * 226} 226`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-slate-900">{healthData.health_score}</span>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="flex-1 grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">Recency:</span>
                    <span className="font-semibold">{healthData.score_breakdown.recency}/30</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">Frequency:</span>
                    <span className="font-semibold">{healthData.score_breakdown.frequency}/30</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">Value:</span>
                    <span className="font-semibold">{healthData.score_breakdown.value}/20</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">Loyalty:</span>
                    <span className="font-semibold">{healthData.score_breakdown.loyalty}/20</span>
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">{healthData.stats.total_visits}</p>
                  <p className="text-xs text-muted-foreground">Total Visits</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">{formatCents(healthData.stats.total_spend)}</p>
                  <p className="text-xs text-muted-foreground">Total Spend</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">
                    {healthData.stats.last_visit 
                      ? formatDistanceToNow(new Date(healthData.stats.last_visit), { addSuffix: true })
                      : 'Never'}
                  </p>
                  <p className="text-xs text-muted-foreground">Last Visit</p>
                </div>
              </div>

              {/* Recommendations */}
              {healthData.recommendations?.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Recommendations</p>
                  {healthData.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      {rec.type === 'action' && <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
                      {rec.type === 'service' && <Wrench className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />}
                      {rec.type === 'upsell' && <Target className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />}
                      <p className="text-slate-600">{rec.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vehicles */}
        <div data-tour="custdetail-vehicles" className="bg-white shadow-lg border-0 rounded-lg overflow-hidden md:col-span-3">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-700">Vehicles</h3>
            <Button size="sm" onClick={() => setIsAddVehicleOpen(true)} className="text-xs h-7">
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Vehicle
            </Button>
          </div>
          <div className="p-4">
            {customer.vehicles?.length > 0 ? (
              <div className="space-y-2">
                {customer.vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="border border-slate-100 rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <CarImage make={vehicle.make} model={vehicle.model} year={vehicle.year} size="sm" />
                        <div>
                          <p className="font-medium text-slate-900">
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
                          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">Primary</span>
                        )}
                        {vehicle.license_plate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {vehicle.license_plate}
                          </p>
                        )}
                      </div>
                    </div>
                    <VehicleIntelligence
                      customerId={id}
                      vehicleId={vehicle.id}
                      vin={vehicle.vin}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No vehicles on file
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Appointments History */}
      <div data-tour="custdetail-appointments" className="bg-white shadow-lg border-0 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-medium text-slate-700">Appointment History</h3>
        </div>
        <div className="p-4">
          {appointmentsData?.appointments?.length > 0 ? (
            <div className="space-y-2">
              {appointmentsData.appointments.map((apt) => (
                <Link
                  key={apt.id}
                  to={`/appointments/${apt.id}`}
                  className="flex items-center justify-between border border-slate-100 rounded-lg p-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center w-10">
                      <p className="text-sm font-semibold text-slate-800">
                        {format(parseDateLocal(apt.scheduled_date), 'd')}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(parseDateLocal(apt.scheduled_date), 'MMM')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {apt.appointment_services
                          ?.map((s) => s.service_name)
                          .join(', ') || 'Service'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime12Hour(apt.scheduled_time)}
                        {apt.vehicle &&
                          ` • ${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}`}
                      </p>
                    </div>
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded capitalize", getStatusColor(apt.status))}>
                    {apt.status.replace('_', ' ')}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No appointment history
            </p>
          )}
        </div>
      </div>

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
              {/* Live car image preview */}
              {vehicleForm.make && vehicleForm.model && (
                <div className="flex justify-center">
                  <CarImage make={vehicleForm.make} model={vehicleForm.model} year={vehicleForm.year} size="lg" />
                </div>
              )}
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
