import { useState, useMemo, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customers, analytics } from '@/api'
import { Users, User, Send, Download } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useCustomersTour } from '@/hooks/use-customers-tour'
import SmsComposeDialog from '@/components/SmsComposeDialog'
import BulkActionBar from '@/components/BulkActionBar'
import BulkSmsDialog from '@/components/BulkSmsDialog'
import { useSelection } from '@/hooks/use-selection'
import { arrayToCSV, downloadCSV, formatDateForFilename } from '@/lib/csv'
import CustomerListPanel from '@/components/customers/CustomerListPanel'
import CustomerHeaderCard from '@/components/customers/CustomerHeaderCard'
import OverviewTab from '@/components/customers/OverviewTab'
import VehiclesTab from '@/components/customers/VehiclesTab'
import AppointmentsTab from '@/components/customers/AppointmentsTab'
import InteractionsTab from '@/components/customers/InteractionsTab'
import InsightsTab from '@/components/customers/InsightsTab'
import EditCustomerDialog from '@/components/customers/EditCustomerDialog'
import AddVehicleDialog from '@/components/customers/AddVehicleDialog'

const ITEMS_PER_PAGE = 50

export default function Customers() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false)
  const [isSmsOpen, setIsSmsOpen] = useState(false)
  const [isBulkSmsOpen, setIsBulkSmsOpen] = useState(false)
  const [editForm, setEditForm] = useState({})
  const selection = useSelection()
  const [vehicleForm, setVehicleForm] = useState({
    year: '',
    make: '',
    model: '',
    color: '',
    license_plate: '',
    mileage: '',
    is_primary: false,
  })

  // Fetch all customers
  const { data, isLoading } = useQuery({
    queryKey: ['customers', 'list'],
    queryFn: () => customers.list({ limit: 500 }),
  })

  // Fetch selected customer details
  const { data: customerData, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['customer', selectedCustomerId],
    queryFn: () => customers.get(selectedCustomerId),
    enabled: !!selectedCustomerId,
  })

  // Fetch customer appointments
  const { data: appointmentsData } = useQuery({
    queryKey: ['customer', selectedCustomerId, 'appointments'],
    queryFn: () => customers.getAppointments(selectedCustomerId),
    enabled: !!selectedCustomerId,
  })

  // Fetch customer health data
  const { data: healthData } = useQuery({
    queryKey: ['customer', selectedCustomerId, 'health'],
    queryFn: () => analytics.customerHealth(selectedCustomerId),
    enabled: !!selectedCustomerId,
  })

  // Fetch customer interactions (calls + SMS)
  const { data: interactionsData } = useQuery({
    queryKey: ['customer', selectedCustomerId, 'interactions'],
    queryFn: () => customers.getInteractions(selectedCustomerId),
    enabled: !!selectedCustomerId,
  })

  const updateMutation = useMutation({
    mutationFn: (data) => customers.update(selectedCustomerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', selectedCustomerId] })
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] })
      setIsEditOpen(false)
    },
  })

  const addVehicleMutation = useMutation({
    mutationFn: (data) => customers.addVehicle(selectedCustomerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', selectedCustomerId] })
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

  const removeTagMutation = useMutation({
    mutationFn: ({ customerId, tagId }) => customers.removeTag(customerId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', selectedCustomerId] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })

  // Build bulk customer list from selection
  const selectedCustomers = useMemo(() => {
    if (selection.count === 0 || !data?.customers) return []
    return data.customers.filter(c => selection.isSelected(c.id))
  }, [selection.count, selection.selected, data?.customers])

  const handleExportCSV = useCallback(() => {
    if (selectedCustomers.length === 0) return
    const columns = [
      { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'total_visits', label: 'Total Visits' },
    ]
    const csv = arrayToCSV(selectedCustomers, columns)
    downloadCSV(csv, `customers-${formatDateForFilename()}`)
  }, [selectedCustomers])

  // Sort alphabetically by last name and filter by search
  const sortedAndFilteredCustomers = useMemo(() => {
    if (!data?.customers) return []

    let filtered = data.customers

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(c =>
        c.first_name?.toLowerCase().includes(term) ||
        c.last_name?.toLowerCase().includes(term) ||
        c.phone?.includes(term) ||
        c.email?.toLowerCase().includes(term)
      )
    }

    return [...filtered].sort((a, b) => {
      const lastNameA = (a.last_name || '').trim().toLowerCase()
      const lastNameB = (b.last_name || '').trim().toLowerCase()

      if (!lastNameA && lastNameB) return 1
      if (lastNameA && !lastNameB) return -1
      if (!lastNameA && !lastNameB) {
        const firstNameA = (a.first_name || '').toLowerCase()
        const firstNameB = (b.first_name || '').toLowerCase()
        return firstNameA.localeCompare(firstNameB)
      }

      if (lastNameA < lastNameB) return -1
      if (lastNameA > lastNameB) return 1

      const firstNameA = (a.first_name || '').toLowerCase()
      const firstNameB = (b.first_name || '').toLowerCase()
      return firstNameA.localeCompare(firstNameB)
    })
  }, [data?.customers, searchTerm])

  // Auto-select first customer only on initial data load
  const [hasAutoSelected, setHasAutoSelected] = useState(false)
  useEffect(() => {
    if (!hasAutoSelected && sortedAndFilteredCustomers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(sortedAndFilteredCustomers[0].id)
      setHasAutoSelected(true)
    }
  }, [sortedAndFilteredCustomers, selectedCustomerId, hasAutoSelected])

  useCustomersTour(!isLoading && !isLoadingCustomer)

  const selectedCustomer = customerData?.customer
  const totalVehicles = data?.customers?.reduce((sum, c) => sum + (c.vehicle_count || 0), 0) || 0
  const totalVisits = data?.customers?.reduce((sum, c) => sum + (c.total_visits || 0), 0) || 0

  const handleEditOpen = () => {
    if (selectedCustomer) {
      setEditForm({
        first_name: selectedCustomer.first_name || '',
        last_name: selectedCustomer.last_name || '',
        email: selectedCustomer.email || '',
        phone: selectedCustomer.phone || '',
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

  // Get initials for avatar
  const getInitials = (firstName, lastName) => {
    return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase() || '?'
  }

  // Get avatar color based on name
  const getAvatarColor = (name) => {
    const colors = [
      'bg-blue-600', 'bg-blue-500', 'bg-blue-700', 'bg-blue-600',
      'bg-blue-500', 'bg-blue-700', 'bg-blue-600', 'bg-blue-500'
    ]
    const index = (name || '').charCodeAt(0) % colors.length
    return colors[index]
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Page Header */}
      <div data-tour="customers-header" className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 pl-14 sm:px-6 lg:pl-6 py-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">Customers</h1>
              <p className="text-xs text-slate-400">Customer relationship management</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Master/Detail Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Left Panel - Customer List */}
        <CustomerListPanel
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          isLoading={isLoading}
          sortedAndFilteredCustomers={sortedAndFilteredCustomers}
          selectedCustomerId={selectedCustomerId}
          setSelectedCustomerId={setSelectedCustomerId}
          selection={selection}
        />

        {/* Right Panel - Customer Details */}
        <div data-tour="customers-detail" className={cn(
          "flex-1 flex flex-col min-h-0",
          !selectedCustomerId ? "hidden lg:flex" : "flex"
        )}>
          {!selectedCustomerId ? (
            <div className="flex-1 flex items-center justify-center bg-white shadow-lg border-0 rounded-lg">
              <div className="text-center">
                <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 p-5 mb-4 shadow-inner mx-auto w-fit">
                  <User className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="font-semibold text-slate-700 text-base mb-1">Select a Customer</h3>
                <p className="text-sm text-slate-500">Choose from the list to view details</p>
              </div>
            </div>
          ) : isLoadingCustomer ? (
            <div className="flex-1 flex items-center justify-center bg-white shadow-lg border-0 rounded-lg">
              <div className="space-y-2 p-3 w-full">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 animate-pulse bg-slate-100 rounded-lg" />
                ))}
              </div>
            </div>
          ) : selectedCustomer ? (
            <div className="flex-1 flex flex-col bg-white shadow-lg border-0 rounded-lg overflow-hidden">
              {/* Customer Header */}
              <CustomerHeaderCard
                selectedCustomer={selectedCustomer}
                healthData={healthData}
                removeTagMutation={removeTagMutation}
                setSelectedCustomerId={setSelectedCustomerId}
                setIsSmsOpen={setIsSmsOpen}
                handleEditOpen={handleEditOpen}
              />

              {/* Tabbed Content */}
              <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                <TabsList className="w-full justify-start rounded-none border-b border-slate-200 bg-white p-0 h-auto overflow-x-auto flex-nowrap">
                  <TabsTrigger
                    value="overview"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 py-2.5 px-4 text-sm text-slate-500 whitespace-nowrap font-medium"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="vehicles"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 py-2.5 px-4 text-sm text-slate-500 whitespace-nowrap font-medium"
                  >
                    <span className="sm:hidden">Vehicles</span>
                    <span className="hidden sm:inline">Vehicles ({selectedCustomer.vehicles?.length || 0})</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="appointments"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 py-2.5 px-4 text-sm text-slate-500 whitespace-nowrap font-medium"
                  >
                    <span className="sm:hidden">Appts</span>
                    <span className="hidden sm:inline">Appointments ({appointmentsData?.appointments?.length || 0})</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="interactions"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 py-2.5 px-4 text-sm text-slate-500 whitespace-nowrap font-medium"
                  >
                    <span className="sm:hidden">Activity</span>
                    <span className="hidden sm:inline">Activity ({interactionsData?.interactions?.length || 0})</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="insights"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 py-2.5 px-4 text-sm text-slate-500 whitespace-nowrap font-medium"
                  >
                    Insights
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1">
                  <OverviewTab
                    selectedCustomer={selectedCustomer}
                    healthData={healthData}
                    appointmentsData={appointmentsData}
                    interactionsData={interactionsData}
                    updateMutation={updateMutation}
                  />
                  <VehiclesTab
                    selectedCustomer={selectedCustomer}
                    setIsAddVehicleOpen={setIsAddVehicleOpen}
                  />
                  <AppointmentsTab
                    appointmentsData={appointmentsData}
                  />
                  <InteractionsTab
                    interactionsData={interactionsData}
                  />
                  <InsightsTab
                    healthData={healthData}
                  />
                </ScrollArea>
              </Tabs>
            </div>
          ) : null}
        </div>
      </div>

      {/* Edit Customer Dialog */}
      <EditCustomerDialog
        isEditOpen={isEditOpen}
        setIsEditOpen={setIsEditOpen}
        editForm={editForm}
        setEditForm={setEditForm}
        handleEditSubmit={handleEditSubmit}
        updateMutation={updateMutation}
      />

      {/* SMS Compose Dialog */}
      <SmsComposeDialog
        open={isSmsOpen}
        onOpenChange={setIsSmsOpen}
        recipientPhone={selectedCustomer?.phone}
        recipientName={selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : undefined}
        customerId={selectedCustomer?.id}
      />

      {/* Bulk SMS Dialog */}
      <BulkSmsDialog
        open={isBulkSmsOpen}
        onOpenChange={setIsBulkSmsOpen}
        customers={selectedCustomers}
      />

      {/* Bulk Action Bar */}
      <BulkActionBar
        count={selection.count}
        onClear={selection.clearAll}
        actions={[
          { label: 'Send SMS', icon: Send, onClick: () => setIsBulkSmsOpen(true) },
          { label: 'Export CSV', icon: Download, onClick: handleExportCSV },
        ]}
      />

      {/* Add Vehicle Dialog */}
      <AddVehicleDialog
        isAddVehicleOpen={isAddVehicleOpen}
        setIsAddVehicleOpen={setIsAddVehicleOpen}
        vehicleForm={vehicleForm}
        setVehicleForm={setVehicleForm}
        handleAddVehicleSubmit={handleAddVehicleSubmit}
        addVehicleMutation={addVehicleMutation}
      />
    </div>
  )
}
