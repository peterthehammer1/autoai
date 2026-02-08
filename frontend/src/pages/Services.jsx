import { useQuery } from '@tanstack/react-query'
import { services } from '@/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Search, Wrench, Clock, Star } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

export default function Services() {
  const { data, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => services.list(),
  })

  const { data: categories } = useQuery({
    queryKey: ['services', 'categories'],
    queryFn: services.categories,
  })

  return (
    <div className="space-y-6">
      {/* Page Header - With Teal Accent */}
      <div className="bg-gradient-to-r from-teal-dark to-teal px-4 py-4 rounded-lg">
        <h1 className="text-lg font-semibold text-white">Services</h1>
        <p className="text-sm text-white/70">Manage your service offerings</p>
      </div>

      {/* Categories Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        {categories?.categories?.slice(0, 4).map((cat, index) => {
          const gradients = [
            'from-teal-dark to-teal',
            'from-emerald-dark to-emerald',
            'from-teal-medium to-teal-light',
            'from-amber-dark to-amber',
          ]
          return (
            <div key={cat.id} className={`bg-gradient-to-br ${gradients[index % 4]} p-4 rounded-lg shadow-sm`}>
              <p className="font-medium text-white">{cat.name}</p>
              <p className="text-sm text-white/70">{cat.description}</p>
            </div>
          )
        })}
      </div>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Services</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Bay Type</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <div className="h-12 animate-pulse bg-slate-100" />
                    </TableCell>
                  </TableRow>
                ))
              ) : data?.services?.length > 0 ? (
                data.services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{service.name}</span>
                        {service.is_popular && (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        )}
                      </div>
                      {service.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {service.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {service.category?.name || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {formatDuration(service.duration_minutes)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {service.price_min > 0 
                        ? `$${service.price_min.toLocaleString()}`
                        : (service.price_display || 'Free')
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {service.required_bay_type?.replace('_', ' ') || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No services found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
