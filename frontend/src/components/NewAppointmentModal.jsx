import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, addDays, parseISO, isToday, isTomorrow } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { appointments, customers, services, availability } from '@/api'
import {
  cn,
  formatPhone,
  formatCurrency,
  formatDuration,
  formatTime12Hour,
} from '@/lib/utils'
import {
  Search,
  User,
  Car,
  Wrench,
  Calendar,
  Clock,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Loader2,
  Phone,
  Mail,
  X,
  AlertCircle,
} from 'lucide-react'

const STEPS = [
  { id: 'customer', title: 'Customer', icon: User },
  { id: 'vehicle', title: 'Vehicle', icon: Car },
  { id: 'services', title: 'Services', icon: Wrench },
  { id: 'schedule', title: 'Schedule', icon: Calendar },
]

export default function NewAppointmentModal({ open, onOpenChange, onSuccess }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Step management
  const [currentStep, setCurrentStep] = useState(0)

  // Customer state
  const [phoneSearch, setPhoneSearch] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [customer, setCustomer] = useState(null)
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [newCustomerForm, setNewCustomerForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  })

  // Vehicle state
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [isNewVehicle, setIsNewVehicle] = useState(false)
  const [newVehicleForm, setNewVehicleForm] = useState({
    year: '',
    make: '',
    model: '',
    color: '',
    mileage: '',
  })

  // Services state
  const [selectedServices, setSelectedServices] = useState([])
  const [serviceSearch, setServiceSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)

  // Schedule state
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [availableSlots, setAvailableSlots] = useState([])

  // Fetch services
  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['services', serviceSearch, selectedCategory],
    queryFn: () =>
      services.list({
        search: serviceSearch || undefined,
        category: selectedCategory || undefined,
      }),
    enabled: currentStep === 2,
  })

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => services.categories(),
    enabled: currentStep === 2,
  })

  // Fetch popular services
  const { data: popularData } = useQuery({
    queryKey: ['popularServices'],
    queryFn: () => services.popular(),
    enabled: currentStep === 2 && !serviceSearch && !selectedCategory,
  })

  // Check availability when services are selected and on schedule step
  const { data: availabilityData, isLoading: availabilityLoading } = useQuery({
    queryKey: ['availability', selectedServices.map((s) => s.id), selectedDate],
    queryFn: () =>
      availability.check({
        service_ids: selectedServices.map((s) => s.id).join(','),
        date: selectedDate || format(new Date(), 'yyyy-MM-dd'),
        days_to_check: 14,
      }),
    enabled: currentStep === 3 && selectedServices.length > 0,
  })

  // Book appointment mutation
  const bookMutation = useMutation({
    mutationFn: (data) => appointments.create(data),
    onSuccess: (data) => {
      toast({
        title: 'Appointment Booked',
        description: data.appointment?.confirmation_message || 'Appointment created successfully',
      })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      onSuccess?.(data.appointment)
      handleClose()
    },
    onError: (error) => {
      toast({
        title: 'Booking Failed',
        description: error.message || 'Failed to book appointment',
        variant: 'destructive',
      })
    },
  })

  // Reset state when modal closes
  const handleClose = () => {
    setCurrentStep(0)
    setPhoneSearch('')
    setCustomer(null)
    setIsNewCustomer(false)
    setNewCustomerForm({ first_name: '', last_name: '', email: '', phone: '' })
    setSelectedVehicle(null)
    setIsNewVehicle(false)
    setNewVehicleForm({ year: '', make: '', model: '', color: '', mileage: '' })
    setSelectedServices([])
    setServiceSearch('')
    setSelectedCategory(null)
    setSelectedDate(null)
    setSelectedTime(null)
    onOpenChange(false)
  }

  // Customer lookup
  const handlePhoneSearch = async () => {
    if (!phoneSearch.trim()) return

    setIsSearching(true)
    try {
      const result = await customers.lookup(phoneSearch)
      if (result.found) {
        setCustomer(result.customer)
        setIsNewCustomer(false)
        // Auto-select primary vehicle if available
        if (result.customer.vehicles?.length > 0) {
          const primary = result.customer.vehicles.find((v) => v.is_primary)
          setSelectedVehicle(primary || result.customer.vehicles[0])
        }
      } else {
        setCustomer(null)
        setIsNewCustomer(true)
        setNewCustomerForm((prev) => ({ ...prev, phone: phoneSearch }))
      }
    } catch (error) {
      toast({
        title: 'Search Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsSearching(false)
    }
  }

  // Toggle service selection
  const toggleService = (service) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === service.id)
      if (exists) {
        return prev.filter((s) => s.id !== service.id)
      }
      return [...prev, service]
    })
  }

  // Calculate totals
  const totalDuration = selectedServices.reduce(
    (sum, s) => sum + s.duration_minutes,
    0
  )
  const totalPriceMin = selectedServices.reduce(
    (sum, s) => sum + (s.price_min || 0),
    0
  )
  const totalPriceMax = selectedServices.reduce(
    (sum, s) => sum + (s.price_max || 0),
    0
  )

  // Navigation
  const canProceed = () => {
    switch (currentStep) {
      case 0: // Customer
        return customer || (isNewCustomer && newCustomerForm.first_name && newCustomerForm.phone)
      case 1: // Vehicle
        return selectedVehicle || (isNewVehicle && newVehicleForm.year && newVehicleForm.make && newVehicleForm.model)
      case 2: // Services
        return selectedServices.length > 0
      case 3: // Schedule
        return selectedDate && selectedTime
      default:
        return false
    }
  }

  const handleNext = () => {
    if (canProceed() && currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  // Submit booking
  const handleSubmit = () => {
    const payload = {
      customer_phone: customer?.phone || newCustomerForm.phone,
      customer_first_name: customer?.first_name || newCustomerForm.first_name,
      customer_last_name: customer?.last_name || newCustomerForm.last_name,
      customer_email: customer?.email || newCustomerForm.email,
      vehicle_id: selectedVehicle?.id,
      vehicle_year: isNewVehicle ? parseInt(newVehicleForm.year) : undefined,
      vehicle_make: isNewVehicle ? newVehicleForm.make : undefined,
      vehicle_model: isNewVehicle ? newVehicleForm.model : undefined,
      vehicle_mileage: isNewVehicle && newVehicleForm.mileage ? parseInt(newVehicleForm.mileage) : undefined,
      service_ids: selectedServices.map((s) => s.id),
      appointment_date: selectedDate,
      appointment_time: selectedTime,
      created_by: 'dashboard',
    }

    bookMutation.mutate(payload)
  }

  // Group slots by date for display
  const slotsByDate = {}
  if (availabilityData?.slots) {
    for (const slot of availabilityData.slots) {
      if (!slotsByDate[slot.date]) {
        slotsByDate[slot.date] = []
      }
      slotsByDate[slot.date].push(slot)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" aria-label="New Appointment">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
          <DialogDescription>
            Book a service appointment for a customer
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-2 py-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isCompleted = index < currentStep

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                    isActive && 'bg-primary text-primary-foreground',
                    isCompleted && 'text-primary',
                    !isActive && !isCompleted && 'text-muted-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2',
                      isActive && 'border-primary-foreground bg-primary-foreground/20',
                      isCompleted && 'border-primary bg-primary text-primary-foreground',
                      !isActive && !isCompleted && 'border-muted-foreground/50'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
                )}
              </div>
            )
          })}
        </div>

        <Separator />

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4 px-1">
          {/* Step 1: Customer */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter phone number..."
                  value={phoneSearch}
                  onChange={(e) => setPhoneSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePhoneSearch()}
                  className="flex-1"
                />
                <Button onClick={handlePhoneSearch} disabled={isSearching} aria-label="Search customer">
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Found Customer */}
              {customer && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-green-600" />
                          <span className="font-semibold text-green-800">
                            Customer Found
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold mt-2">
                          {customer.full_name || `${customer.first_name} ${customer.last_name}`}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {formatPhone(customer.phone)}
                          </span>
                          {customer.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </span>
                          )}
                        </div>
                        {customer.total_visits > 0 && (
                          <Badge variant="secondary" className="mt-2">
                            {customer.total_visits} previous visits
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Clear selected customer"
                        onClick={() => {
                          setCustomer(null)
                          setPhoneSearch('')
                          setSelectedVehicle(null)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* New Customer Form */}
              {isNewCustomer && !customer && (
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">New Customer</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No customer found with this phone number. Enter their details:
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          First Name *
                        </label>
                        <Input
                          placeholder="First name"
                          aria-required="true"
                          value={newCustomerForm.first_name}
                          onChange={(e) =>
                            setNewCustomerForm((prev) => ({
                              ...prev,
                              first_name: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Last Name
                        </label>
                        <Input
                          placeholder="Last name"
                          value={newCustomerForm.last_name}
                          onChange={(e) =>
                            setNewCustomerForm((prev) => ({
                              ...prev,
                              last_name: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Phone *
                        </label>
                        <Input
                          placeholder="Phone number"
                          aria-required="true"
                          value={newCustomerForm.phone}
                          onChange={(e) =>
                            setNewCustomerForm((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Email
                        </label>
                        <Input
                          type="email"
                          placeholder="Email address"
                          value={newCustomerForm.email}
                          onChange={(e) =>
                            setNewCustomerForm((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!customer && !isNewCustomer && (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Search for a customer by phone number</p>
                  <p className="text-sm">or they will be created as new</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Vehicle */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {/* Existing Vehicles */}
              {customer?.vehicles?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                    Customer's Vehicles
                  </h3>
                  {customer.vehicles.map((vehicle) => (
                    <Card
                      key={vehicle.id}
                      className={cn(
                        'cursor-pointer transition-all',
                        selectedVehicle?.id === vehicle.id &&
                          'ring-2 ring-primary border-primary'
                      )}
                      onClick={() => {
                        setSelectedVehicle(vehicle)
                        setIsNewVehicle(false)
                      }}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Car className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {vehicle.color && `${vehicle.color} · `}
                              {vehicle.mileage
                                ? `${vehicle.mileage.toLocaleString()} km`
                                : 'Mileage unknown'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {vehicle.is_primary && (
                            <Badge variant="secondary">Primary</Badge>
                          )}
                          {selectedVehicle?.id === vehicle.id && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Add New Vehicle */}
              <div className="space-y-2">
                {customer?.vehicles?.length > 0 && (
                  <Separator className="my-4" />
                )}
                <Button
                  variant={isNewVehicle ? 'default' : 'outline'}
                  className="w-full"
                  onClick={() => {
                    setIsNewVehicle(true)
                    setSelectedVehicle(null)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Vehicle
                </Button>

                {isNewVehicle && (
                  <Card className="mt-4">
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">
                            Year *
                          </label>
                          <Input
                            placeholder="2024"
                            value={newVehicleForm.year}
                            onChange={(e) =>
                              setNewVehicleForm((prev) => ({
                                ...prev,
                                year: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">
                            Make *
                          </label>
                          <Input
                            placeholder="Honda"
                            value={newVehicleForm.make}
                            onChange={(e) =>
                              setNewVehicleForm((prev) => ({
                                ...prev,
                                make: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">
                            Model *
                          </label>
                          <Input
                            placeholder="Accord"
                            value={newVehicleForm.model}
                            onChange={(e) =>
                              setNewVehicleForm((prev) => ({
                                ...prev,
                                model: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">
                            Color
                          </label>
                          <Input
                            placeholder="Silver"
                            value={newVehicleForm.color}
                            onChange={(e) =>
                              setNewVehicleForm((prev) => ({
                                ...prev,
                                color: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-sm font-medium mb-1 block">
                            Current Mileage (km)
                          </label>
                          <Input
                            placeholder="45000"
                            value={newVehicleForm.mileage}
                            onChange={(e) =>
                              setNewVehicleForm((prev) => ({
                                ...prev,
                                mileage: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {!customer?.vehicles?.length && !isNewVehicle && (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No vehicles on file</p>
                  <p className="text-sm">Add a vehicle to continue</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Services */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Search */}
              <div className="flex gap-2">
                <Input
                  placeholder="Search services..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  className="flex-1"
                />
                {serviceSearch && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setServiceSearch('')}
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Categories */}
              {categoriesData?.categories && !serviceSearch && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedCategory === null ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                  >
                    Popular
                  </Button>
                  {categoriesData.categories.map((cat) => (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.name ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        setSelectedCategory(
                          selectedCategory === cat.name ? null : cat.name
                        )
                      }
                    >
                      {cat.name}
                    </Button>
                  ))}
                </div>
              )}

              {/* Selected Services Summary */}
              {selectedServices.length > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">
                          {selectedServices.length} selected
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDuration(totalDuration)}
                        </span>
                      </div>
                      <span className="font-medium">
                        {totalPriceMin === totalPriceMax
                          ? formatCurrency(totalPriceMin)
                          : `${formatCurrency(totalPriceMin)} - ${formatCurrency(totalPriceMax)}`}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedServices.map((service) => (
                        <Badge
                          key={service.id}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => toggleService(service)}
                        >
                          {service.name}
                          <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Service List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {servicesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* Show popular when no filters */}
                    {!serviceSearch && !selectedCategory && popularData?.services && (
                      <>
                        {popularData.services.map((service) => (
                          <ServiceCard
                            key={service.id}
                            service={service}
                            isSelected={selectedServices.some(
                              (s) => s.id === service.id
                            )}
                            onToggle={() => toggleService(service)}
                          />
                        ))}
                      </>
                    )}

                    {/* Show filtered/searched services */}
                    {(serviceSearch || selectedCategory) &&
                      servicesData?.services?.map((service) => (
                        <ServiceCard
                          key={service.id}
                          service={service}
                          isSelected={selectedServices.some(
                            (s) => s.id === service.id
                          )}
                          onToggle={() => toggleService(service)}
                        />
                      ))}

                    {(serviceSearch || selectedCategory) &&
                      servicesData?.services?.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No services found</p>
                        </div>
                      )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Schedule */}
          {currentStep === 3 && (
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
                    const dateObj = parseISO(date)
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
                      {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')} at{' '}
                      {formatTime12Hour(selectedTime)}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={currentStep === 0 ? handleClose : handleBack}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || bookMutation.isPending}
            >
              {bookMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Book Appointment
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Service Card Component
function ServiceCard({ service, isSelected, onToggle }) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all',
        isSelected && 'ring-2 ring-primary border-primary bg-primary/5'
      )}
      onClick={onToggle}
    >
      <CardContent className="p-3 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{service.name}</p>
            {service.is_popular && (
              <Badge variant="secondary" className="text-xs">
                Popular
              </Badge>
            )}
          </div>
          {service.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {service.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>{formatDuration(service.duration_minutes)}</span>
            <span>{service.price_display}</span>
          </div>
        </div>
        <div
          className={cn(
            'h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors',
            isSelected
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-muted-foreground/50'
          )}
        >
          {isSelected && <Check className="h-4 w-4" />}
        </div>
      </CardContent>
    </Card>
  )
}
