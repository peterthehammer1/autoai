import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { customers } from '@/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Search, Plus, User, Phone, Car, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import PhoneNumber, { Email } from '@/components/PhoneNumber'

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch all customers
  const { data, isLoading } = useQuery({
    queryKey: ['customers', 'list', searchTerm],
    queryFn: () => customers.list({ search: searchTerm || undefined, limit: 100 }),
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Customer List */}
      <Card>
        {isLoading ? (
          <CardContent className="p-6">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          </CardContent>
        ) : !data?.customers?.length ? (
          <CardContent className="p-12 text-center">
            <User className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Customers Found</h3>
            <p className="text-slate-500">
              {searchTerm ? `No customers match "${searchTerm}"` : 'No customers in the system yet.'}
            </p>
          </CardContent>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="sm:hidden divide-y divide-slate-100">
              {data.customers.map((customer) => (
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
                        {customer.first_name} {customer.last_name}
                      </p>
                      <p className="text-sm text-slate-500">
                        <PhoneNumber phone={customer.phone} showRevealButton={false} />
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {customer.vehicle_count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {customer.vehicle_count} vehicle{customer.vehicle_count !== 1 ? 's' : ''}
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
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Vehicles</TableHead>
                  <TableHead className="text-center">Visits</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-slate-900">
                          {customer.first_name} {customer.last_name}
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
                    <TableCell className="text-center">
                      {customer.total_visits || 0}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {format(new Date(customer.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/customers/${customer.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Card>

      {/* Stats */}
      {data?.pagination && (
        <p className="text-sm text-slate-500 text-center">
          Showing {data.customers?.length || 0} of {data.pagination.total} customers
        </p>
      )}
    </div>
  )
}
