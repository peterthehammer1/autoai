import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { customers } from '@/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, User, Phone, Car, Calendar } from 'lucide-react'
import { formatPhone } from '@/lib/utils'

export default function Customers() {
  const [searchPhone, setSearchPhone] = useState('')
  const [searchSubmitted, setSearchSubmitted] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['customer', 'lookup', searchSubmitted],
    queryFn: () => customers.lookup(searchSubmitted),
    enabled: searchSubmitted.length >= 7,
  })

  const handleSearch = (e) => {
    e.preventDefault()
    setSearchSubmitted(searchPhone)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Search and manage customer records
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Lookup</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by phone number..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {searchSubmitted && (
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="h-32 animate-pulse rounded bg-muted" />
            ) : data?.found ? (
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">
                        {data.customer.full_name || 'Unknown'}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {formatPhone(data.customer.phone)}
                        </span>
                        {data.customer.email && (
                          <span>{data.customer.email}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button asChild>
                    <Link to={`/customers/${data.customer.id}`}>
                      View Profile
                    </Link>
                  </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <p className="text-2xl font-bold">
                      {data.customer.total_visits || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Visits</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <p className="text-2xl font-bold">
                      {data.customer.vehicles?.length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Vehicles</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <p className="text-2xl font-bold">
                      {data.customer.is_returning ? 'Yes' : 'New'}
                    </p>
                    <p className="text-sm text-muted-foreground">Returning</p>
                  </div>
                </div>

                {/* Vehicles */}
                {data.customer.vehicles?.length > 0 && (
                  <div>
                    <h4 className="mb-3 font-medium">Vehicles on File</h4>
                    <div className="space-y-2">
                      {data.customer.vehicles.map((vehicle) => (
                        <div
                          key={vehicle.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <Car className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </p>
                              {vehicle.color && (
                                <p className="text-sm text-muted-foreground">
                                  {vehicle.color}
                                </p>
                              )}
                            </div>
                          </div>
                          {vehicle.is_primary && (
                            <Badge variant="secondary">Primary</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center">
                <User className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">
                  No customer found with phone number "{searchSubmitted}"
                </p>
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Customer
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!searchSubmitted && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-medium">Search for a customer</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter a phone number to find customer records
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
