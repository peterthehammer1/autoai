import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { appointments, customers as customersApi, services, availability } from '@/api'
import StepIndicator from '@/components/appointments/StepIndicator'
import CustomerStep from '@/components/appointments/CustomerStep'
import VehicleStep from '@/components/appointments/VehicleStep'
import ServiceStep from '@/components/appointments/ServiceStep'
import ScheduleStep from '@/components/appointments/ScheduleStep'
import {
  User,
  Car,
  Wrench,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
} from 'lucide-react'

const STEPS = [
  { id: 'customer', title: 'Customer', icon: User },
  { id: 'vehicle', title: 'Vehicle', icon: Car },
  { id: 'services', title: 'Services', icon: Wrench },
  { id: 'schedule', title: 'Schedule', icon: Calendar },
]

export function NewAppointmentModal({ open, onOpenChange, onSuccess }) {
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

  // Vehicle intelligence for service suggestions
  const { data: vehicleIntelData } = useQuery({
    queryKey: ['vehicle-intelligence', customer?.id, selectedVehicle?.id],
    queryFn: () => customersApi.getVehicleIntelligence(customer.id, selectedVehicle.id),
    enabled: currentStep === 2 && !!customer?.id && !!selectedVehicle?.id && !!selectedVehicle?.vin,
    staleTime: 10 * 60 * 1000,
  })

  // Customer lookup
  const handlePhoneSearch = async () => {
    if (!phoneSearch.trim()) return

    setIsSearching(true)
    try {
      const result = await customersApi.lookup(phoneSearch)
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
        <StepIndicator steps={STEPS} currentStep={currentStep} />

        <Separator />

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4 px-1">
          {currentStep === 0 && (
            <CustomerStep
              phoneSearch={phoneSearch}
              setPhoneSearch={setPhoneSearch}
              handlePhoneSearch={handlePhoneSearch}
              isSearching={isSearching}
              customer={customer}
              setCustomer={setCustomer}
              isNewCustomer={isNewCustomer}
              newCustomerForm={newCustomerForm}
              setNewCustomerForm={setNewCustomerForm}
              setSelectedVehicle={setSelectedVehicle}
            />
          )}

          {currentStep === 1 && (
            <VehicleStep
              customer={customer}
              selectedVehicle={selectedVehicle}
              setSelectedVehicle={setSelectedVehicle}
              isNewVehicle={isNewVehicle}
              setIsNewVehicle={setIsNewVehicle}
              newVehicleForm={newVehicleForm}
              setNewVehicleForm={setNewVehicleForm}
            />
          )}

          {currentStep === 2 && (
            <ServiceStep
              serviceSearch={serviceSearch}
              setServiceSearch={setServiceSearch}
              selectedServices={selectedServices}
              toggleService={toggleService}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              servicesData={servicesData}
              servicesLoading={servicesLoading}
              categoriesData={categoriesData}
              popularData={popularData}
              vehicleIntelData={vehicleIntelData}
              totalDuration={totalDuration}
              totalPriceMin={totalPriceMin}
              totalPriceMax={totalPriceMax}
            />
          )}

          {currentStep === 3 && (
            <ScheduleStep
              selectedServices={selectedServices}
              totalDuration={totalDuration}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
              availabilityData={availabilityData}
              availabilityLoading={availabilityLoading}
              slotsByDate={slotsByDate}
            />
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

export default NewAppointmentModal
