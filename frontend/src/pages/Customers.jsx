import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import { customers, analytics } from '@/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { 
  Search, 
  User, 
  ChevronRight, 
  ChevronLeft,
  Users,
  Car,
  CalendarCheck,
  Phone,
  Mail,
  Plus,
  Edit,
  Loader2,
  Heart,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertCircle,
  Wrench,
  Target,
  Clock,
  FileText,
  PhoneCall,
  X,
  Star,
  MapPin,
  MessageSquare,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Bell,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from 'lucide-react'
import { cn, formatTime12Hour, getStatusColor, formatCents } from '@/lib/utils'
import PhoneNumber, { Email } from '@/components/PhoneNumber'
import CarImage from '@/components/CarImage'
import CustomerAvatar from '@/components/CustomerAvatar'
import { Link } from 'react-router-dom'

const ITEMS_PER_PAGE = 50

export default function Customers() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
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
      queryClient.invalidateQueries(['customer', selectedCustomerId])
      queryClient.invalidateQueries(['customers', 'list'])
      setIsEditOpen(false)
    },
  })

  const addVehicleMutation = useMutation({
    mutationFn: (data) => customers.addVehicle(selectedCustomerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer', selectedCustomerId])
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

  // Auto-select first customer when data loads
  useEffect(() => {
    if (sortedAndFilteredCustomers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(sortedAndFilteredCustomers[0].id)
    }
  }, [sortedAndFilteredCustomers, selectedCustomerId])

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
      'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 
      'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500'
    ]
    const index = (name || '').charCodeAt(0) % colors.length
    return colors[index]
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col animate-fade-in">
      {/* Top Stats Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-3 sm:p-4 mb-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-white/10 rounded-lg backdrop-blur">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold">Customer Management</h1>
              <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">CRM Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="text-center">
              <p className="text-lg sm:text-2xl font-bold">{data?.customers?.length || 0}</p>
              <p className="text-[10px] sm:text-xs text-slate-400">Customers</p>
            </div>
            <div className="h-6 sm:h-8 w-px bg-white/20 hidden sm:block" />
            <div className="text-center hidden sm:block">
              <p className="text-2xl font-bold">{totalVehicles}</p>
              <p className="text-xs text-slate-400">Vehicles</p>
            </div>
            <div className="h-8 w-px bg-white/20 hidden lg:block" />
            <div className="text-center hidden lg:block">
              <p className="text-2xl font-bold">{totalVisits}</p>
              <p className="text-xs text-slate-400">Total Visits</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Master/Detail Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Left Panel - Customer List */}
        <div className={cn(
          "flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden",
          "w-full lg:w-80",
          selectedCustomerId ? "hidden lg:flex" : "flex"
        )}>
          {/* Search Header */}
          <div className="p-3 border-b border-slate-200 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white h-9 text-sm"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {sortedAndFilteredCustomers.length} customers
            </p>
          </div>

          {/* Customer List */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-slate-500">Loading...</p>
              </div>
            ) : sortedAndFilteredCustomers.length === 0 ? (
              <div className="p-8 text-center">
                <User className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No customers found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sortedAndFilteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomerId(customer.id)}
                    className={cn(
                      "w-full p-3 text-left hover:bg-slate-50 transition-colors flex items-center gap-3",
                      selectedCustomerId === customer.id && "bg-blue-50 border-l-2 border-l-blue-500"
                    )}
                  >
                    <CustomerAvatar 
                      firstName={customer.first_name}
                      lastName={customer.last_name}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {customer.first_name} {customer.last_name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {customer.phone || 'No phone'}
                      </p>
                    </div>
                    {customer.total_visits > 0 && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {customer.total_visits}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel - Customer Details */}
        <div className={cn(
          "flex-1 flex flex-col min-h-0",
          !selectedCustomerId ? "hidden lg:flex" : "flex"
        )}>
          {!selectedCustomerId ? (
            <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-slate-200">
              <div className="text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Select a Customer</h3>
                <p className="text-sm text-slate-500">Choose a customer from the list to view their details</p>
              </div>
            </div>
          ) : isLoadingCustomer ? (
            <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-slate-200">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : selectedCustomer ? (
            <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Customer Header */}
              <div className="bg-gradient-to-r from-slate-50 to-white p-4 sm:p-6 border-b border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {/* Mobile Back Button */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="lg:hidden shrink-0 -ml-2"
                      onClick={() => setSelectedCustomerId(null)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <CustomerAvatar 
                      firstName={selectedCustomer.first_name}
                      lastName={selectedCustomer.last_name}
                      size="xl"
                      className="h-12 w-12 sm:h-16 sm:w-16 text-lg sm:text-xl"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg sm:text-2xl font-bold text-slate-900 truncate">
                          {selectedCustomer.first_name} {selectedCustomer.last_name}
                        </h2>
                        {healthData && (
                          <Badge className={cn(
                            'text-xs shrink-0',
                            healthData.health_color === 'green' ? 'bg-emerald-100 text-emerald-700' :
                            healthData.health_color === 'blue' ? 'bg-blue-100 text-blue-700' :
                            healthData.health_color === 'yellow' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          )}>
                            {healthData.health_status}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <PhoneNumber phone={selectedCustomer.phone} showRevealButton={false} />
                        </span>
                        {selectedCustomer.email && (
                          <span className="flex items-center gap-1 hidden sm:flex">
                            <Mail className="h-3.5 w-3.5" />
                            <Email email={selectedCustomer.email} />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 hidden sm:block">
                        Customer since {format(new Date(selectedCustomer.created_at), 'MMMM yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={handleEditOpen} className="hidden sm:flex">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleEditOpen} className="sm:hidden">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedCustomerId(null)} className="hidden lg:flex">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-4 sm:mt-6">
                  <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                      <CalendarCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span className="hidden sm:inline">Total </span>Visits
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-slate-900">
                      {healthData?.stats?.total_visits || selectedCustomer.total_visits || 0}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                      <DollarSign className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span className="hidden sm:inline">Total </span>Spend
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-slate-900">
                      {healthData?.stats?.total_spend ? formatCents(healthData.stats.total_spend) : '$0'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                      <Car className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Vehicles
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-slate-900">
                      {selectedCustomer.vehicles?.length || 0}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                      <Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Health
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-slate-900">
                      {healthData?.health_score || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabbed Content */}
              <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                <TabsList className="w-full justify-start rounded-none border-b border-slate-200 bg-slate-50 p-0 h-auto overflow-x-auto flex-nowrap">
                  <TabsTrigger 
                    value="overview" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="vehicles" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap"
                  >
                    <span className="sm:hidden">Vehicles</span>
                    <span className="hidden sm:inline">Vehicles ({selectedCustomer.vehicles?.length || 0})</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="appointments" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap"
                  >
                    <span className="sm:hidden">Appts</span>
                    <span className="hidden sm:inline">Appointments ({appointmentsData?.appointments?.length || 0})</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="interactions" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap"
                  >
                    <span className="sm:hidden">Activity</span>
                    <span className="hidden sm:inline">Interactions ({interactionsData?.interactions?.length || 0})</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="insights" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap"
                  >
                    <span className="sm:hidden">AI</span>
                    <span className="hidden sm:inline">AI Insights</span>
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1">
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="m-0 p-4 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      {/* Health Score Card */}
                      {healthData && (
                        <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-5">
                          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Heart className="h-4 w-4 text-rose-500" />
                            Customer Health
                          </h3>
                          <div className="flex items-center gap-6">
                            <div className="relative">
                              <svg className="w-24 h-24 transform -rotate-90">
                                <circle cx="48" cy="48" r="40" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                                <circle
                                  cx="48" cy="48" r="40" fill="none"
                                  stroke={
                                    healthData.health_color === 'green' ? '#10b981' :
                                    healthData.health_color === 'blue' ? '#3b82f6' :
                                    healthData.health_color === 'yellow' ? '#f59e0b' : '#ef4444'
                                  }
                                  strokeWidth="8" strokeLinecap="round"
                                  strokeDasharray={`${(healthData.health_score / 100) * 251} 251`}
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-bold text-slate-900">{healthData.health_score}</span>
                              </div>
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Recency</span>
                                <span className="font-medium">{healthData.score_breakdown.recency}/30</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Frequency</span>
                                <span className="font-medium">{healthData.score_breakdown.frequency}/30</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Value</span>
                                <span className="font-medium">{healthData.score_breakdown.value}/20</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Loyalty</span>
                                <span className="font-medium">{healthData.score_breakdown.loyalty}/20</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Recent Activity */}
                      <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          Recent Activity
                        </h3>
                        <div className="space-y-3">
                          {healthData?.stats?.last_visit && (
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CalendarCheck className="h-4 w-4 text-emerald-600" />
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
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <Calendar className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">Next Appointment</p>
                                <p className="text-xs text-slate-500">
                                  {format(new Date(appointmentsData.appointments[0].scheduled_date), 'MMM d, yyyy')}
                                </p>
                              </div>
                            </div>
                          )}
                          {interactionsData?.interactions?.[0] && (
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center",
                                interactionsData.interactions[0].type === 'call' ? 'bg-violet-100' : 'bg-amber-100'
                              )}>
                                {interactionsData.interactions[0].type === 'call' ? (
                                  <PhoneCall className="h-4 w-4 text-violet-600" />
                                ) : (
                                  <MessageSquare className="h-4 w-4 text-amber-600" />
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
                        <div className="sm:col-span-2 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-4 sm:p-5">
                          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Car className="h-4 w-4 text-slate-500" />
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
                                {selectedCustomer.vehicles[0].color && `${selectedCustomer.vehicles[0].color} • `}
                                {selectedCustomer.vehicles[0].mileage 
                                  ? `${selectedCustomer.vehicles[0].mileage.toLocaleString()} km`
                                  : 'Mileage not recorded'}
                                {selectedCustomer.vehicles[0].license_plate && ` • ${selectedCustomer.vehicles[0].license_plate}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Vehicles Tab */}
                  <TabsContent value="vehicles" className="m-0 p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-900 text-sm sm:text-base">Registered Vehicles</h3>
                      <Button size="sm" onClick={() => setIsAddVehicleOpen(true)}>
                        <Plus className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Add Vehicle</span>
                      </Button>
                    </div>
                    {selectedCustomer.vehicles?.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {selectedCustomer.vehicles.map((vehicle) => (
                          <div
                            key={vehicle.id}
                            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start gap-3 sm:gap-4">
                              <CarImage 
                                make={vehicle.make} 
                                model={vehicle.model} 
                                year={vehicle.year}
                                size="md"
                                className="shrink-0 sm:h-20 sm:w-32"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-900">
                                    {vehicle.year} {vehicle.make} {vehicle.model}
                                  </p>
                                  {vehicle.is_primary && (
                                    <Badge className="bg-amber-100 text-amber-700 text-xs">Primary</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-slate-500 mt-1">
                                  {vehicle.color && `${vehicle.color} • `}
                                  {vehicle.mileage 
                                    ? `${vehicle.mileage.toLocaleString()} km`
                                    : 'Mileage unknown'}
                                </p>
                                {vehicle.license_plate && (
                                  <p className="text-xs text-slate-400 mt-1 font-mono">
                                    {vehicle.license_plate}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-slate-50 rounded-xl">
                        <Car className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No vehicles registered</p>
                        <Button size="sm" variant="outline" className="mt-3" onClick={() => setIsAddVehicleOpen(true)}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add First Vehicle
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  {/* Appointments Tab */}
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
                                <div className="text-center bg-slate-100 rounded-lg px-3 py-2">
                                  <p className="text-lg font-bold text-slate-900">
                                    {format(new Date(apt.scheduled_date), 'd')}
                                  </p>
                                  <p className="text-xs text-slate-500 uppercase">
                                    {format(new Date(apt.scheduled_date), 'MMM')}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {apt.appointment_services?.map((s) => s.service_name).join(', ') || 'Service'}
                                  </p>
                                  <p className="text-sm text-slate-500">
                                    {formatTime12Hour(apt.scheduled_time)}
                                    {apt.vehicle && ` • ${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}`}
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

                  {/* Interactions Tab */}
                  <TabsContent value="interactions" className="m-0 p-4 sm:p-6">
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2 text-sm sm:text-base">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      Communication History
                    </h3>
                    {interactionsData?.interactions?.length > 0 ? (
                      <div className="space-y-3">
                        {interactionsData.interactions.map((interaction) => (
                          <Link
                            key={`${interaction.type}-${interaction.id}`}
                            to={interaction.type === 'call' ? `/call-logs` : `/sms-logs`}
                            className="block bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start gap-4">
                              {/* Icon */}
                              <div className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                                interaction.type === 'call' 
                                  ? interaction.outcome === 'booked' ? 'bg-emerald-100' : 'bg-blue-100'
                                  : interaction.message_type === 'confirmation' ? 'bg-blue-100' 
                                  : interaction.message_type === 'reminder' ? 'bg-violet-100'
                                  : 'bg-slate-100'
                              )}>
                                {interaction.type === 'call' ? (
                                  <PhoneCall className={cn(
                                    "h-5 w-5",
                                    interaction.outcome === 'booked' ? 'text-emerald-600' : 'text-blue-600'
                                  )} />
                                ) : (
                                  interaction.message_type === 'confirmation' ? (
                                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                  ) : interaction.message_type === 'reminder' ? (
                                    <Bell className="h-5 w-5 text-violet-600" />
                                  ) : (
                                    <MessageSquare className="h-5 w-5 text-slate-600" />
                                  )
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-900 capitalize">
                                      {interaction.type === 'call' ? 'Phone Call' : 'SMS'}
                                    </span>
                                    {interaction.type === 'call' && interaction.outcome && (
                                      <Badge className={cn(
                                        "text-xs",
                                        interaction.outcome === 'booked' ? 'bg-emerald-100 text-emerald-700' :
                                        interaction.outcome === 'inquiry' ? 'bg-blue-100 text-blue-700' :
                                        'bg-slate-100 text-slate-700'
                                      )}>
                                        {interaction.outcome}
                                      </Badge>
                                    )}
                                    {interaction.type === 'sms' && interaction.message_type && (
                                      <Badge className={cn(
                                        "text-xs",
                                        interaction.message_type === 'confirmation' ? 'bg-blue-100 text-blue-700' :
                                        interaction.message_type === 'reminder' ? 'bg-violet-100 text-violet-700' :
                                        'bg-slate-100 text-slate-700'
                                      )}>
                                        {interaction.message_type}
                                      </Badge>
                                    )}
                                    {interaction.type === 'call' && interaction.sentiment && (
                                      <span className="text-slate-400">
                                        {interaction.sentiment === 'positive' ? (
                                          <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" />
                                        ) : interaction.sentiment === 'negative' ? (
                                          <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
                                        ) : (
                                          <Minus className="h-3.5 w-3.5 text-slate-400" />
                                        )}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-400 whitespace-nowrap">
                                    {interaction.timestamp ? format(new Date(interaction.timestamp), 'MMM d, h:mm a') : '-'}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                  {interaction.summary || 'No details available'}
                                </p>
                                {interaction.type === 'call' && interaction.duration_seconds > 0 && (
                                  <p className="text-xs text-slate-400 mt-1">
                                    Duration: {Math.floor(interaction.duration_seconds / 60)}m {interaction.duration_seconds % 60}s
                                  </p>
                                )}
                              </div>

                              {/* Arrow */}
                              <ArrowUpRight className="h-4 w-4 text-slate-400 shrink-0" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-slate-50 rounded-xl">
                        <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No interactions recorded</p>
                        <p className="text-xs text-slate-400 mt-1">Calls and SMS messages will appear here</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* AI Insights Tab */}
                  <TabsContent value="insights" className="m-0 p-4 sm:p-6">
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2 text-sm sm:text-base">
                      <Target className="h-4 w-4 text-violet-500" />
                      AI-Powered Recommendations
                    </h3>
                    {healthData?.recommendations?.length > 0 ? (
                      <div className="space-y-4">
                        {healthData.recommendations.map((rec, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "rounded-xl border p-4 flex items-start gap-3",
                              rec.type === 'action' && "bg-amber-50 border-amber-200",
                              rec.type === 'service' && "bg-blue-50 border-blue-200",
                              rec.type === 'upsell' && "bg-violet-50 border-violet-200"
                            )}
                          >
                            {rec.type === 'action' && <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />}
                            {rec.type === 'service' && <Wrench className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />}
                            {rec.type === 'upsell' && <Target className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />}
                            <div>
                              <p className="font-medium text-slate-900 capitalize">{rec.type}</p>
                              <p className="text-sm text-slate-600 mt-1">{rec.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-slate-50 rounded-xl">
                        <Target className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No recommendations available yet</p>
                        <p className="text-xs text-slate-400 mt-1">More data needed to generate insights</p>
                      </div>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </div>
          ) : null}
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
