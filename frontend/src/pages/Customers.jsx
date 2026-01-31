import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { customers } from '@/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Search, 
  User, 
  ChevronRight, 
  ChevronLeft,
  Users,
  Car,
  CalendarCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import PhoneNumber, { Email } from '@/components/PhoneNumber'

const ITEMS_PER_PAGE = 10

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch all customers
  const { data, isLoading } = useQuery({
    queryKey: ['customers', 'list'],
    queryFn: () => customers.list({ limit: 500 }),
  })

  // Sort alphabetically by last name and filter by search
  const sortedAndFilteredCustomers = useMemo(() => {
    if (!data?.customers) return []
    
    let filtered = data.customers
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(c => 
        c.first_name?.toLowerCase().includes(term) ||
        c.last_name?.toLowerCase().includes(term) ||
        c.phone?.includes(term) ||
        c.email?.toLowerCase().includes(term)
      )
    }
    
    // Sort by last name alphabetically, customers without last names go to the end
    return [...filtered].sort((a, b) => {
      const lastNameA = (a.last_name || '').trim().toLowerCase()
      const lastNameB = (b.last_name || '').trim().toLowerCase()
      
      // Push customers without last names to the end
      if (!lastNameA && lastNameB) return 1
      if (lastNameA && !lastNameB) return -1
      if (!lastNameA && !lastNameB) {
        // Both have no last name, sort by first name
        const firstNameA = (a.first_name || '').toLowerCase()
        const firstNameB = (b.first_name || '').toLowerCase()
        return firstNameA.localeCompare(firstNameB)
      }
      
      // Normal alphabetical sort by last name
      if (lastNameA < lastNameB) return -1
      if (lastNameA > lastNameB) return 1
      
      // If last names are equal, sort by first name
      const firstNameA = (a.first_name || '').toLowerCase()
      const firstNameB = (b.first_name || '').toLowerCase()
      return firstNameA.localeCompare(firstNameB)
    })
  }, [data?.customers, searchTerm])

  // Pagination
  const totalItems = sortedAndFilteredCustomers.length
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedCustomers = sortedAndFilteredCustomers.slice(startIndex, endIndex)

  // Reset to page 1 when search changes
  const handleSearch = (value) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  // Calculate stats
  const totalVehicles = data?.customers?.reduce((sum, c) => sum + (c.vehicle_count || 0), 0) || 0
  const totalVisits = data?.customers?.reduce((sum, c) => sum + (c.total_visits || 0), 0) || 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Stats Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Customer Directory</h1>
              <p className="text-sm text-slate-400">Manage your customer database</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">Customers</span>
              </div>
              <p className="text-3xl font-bold">{data?.customers?.length || 0}</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Car className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">Vehicles</span>
              </div>
              <p className="text-3xl font-bold">{totalVehicles}</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <CalendarCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">Total Visits</span>
              </div>
              <p className="text-3xl font-bold">{totalVisits}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Pagination Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        {totalItems > 0 && (
          <div className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-900">{startIndex + 1}</span> to{' '}
            <span className="font-medium text-slate-900">{Math.min(endIndex, totalItems)}</span> of{' '}
            <span className="font-medium text-slate-900">{totalItems}</span> customers
          </div>
        )}
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-500">Loading customers...</p>
          </div>
        ) : !sortedAndFilteredCustomers.length ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-900 mb-1">No Customers Found</p>
            <p className="text-sm text-slate-500">
              {searchTerm ? `No customers match "${searchTerm}"` : 'No customers in the system yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="sm:hidden divide-y divide-slate-100">
              {paginatedCustomers.map((customer) => (
                <Link
                  key={customer.id}
                  to={`/customers/${customer.id}`}
                  className="block p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {customer.last_name}, {customer.first_name}
                      </p>
                      <p className="text-sm text-slate-500">
                        <PhoneNumber phone={customer.phone} showRevealButton={false} />
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {customer.vehicle_count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {customer.vehicle_count} car{customer.vehicle_count !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop Table View */}
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="w-[250px]">Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center w-[100px]">Vehicles</TableHead>
                  <TableHead className="text-center w-[80px]">Visits</TableHead>
                  <TableHead className="w-[120px]">Added</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.map((customer) => (
                  <TableRow 
                    key={customer.id}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => window.location.href = `/customers/${customer.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-slate-900">
                          {customer.last_name}, {customer.first_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      <PhoneNumber phone={customer.phone} showRevealButton={false} />
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {customer.email ? <Email email={customer.email} /> : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {customer.vehicle_count > 0 ? (
                        <Badge variant="secondary">{customer.vehicle_count}</Badge>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-slate-600">
                      {customer.total_visits || 0}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {format(new Date(customer.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'ghost'}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
