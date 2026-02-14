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
      {/* Page Header - Dark Theme */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 pl-14 sm:px-6 lg:pl-6 py-4">
        <div className="flex items-center gap-3">
          <Wrench className="h-5 w-5 text-blue-400" />
          <div>
            <h1 className="text-lg font-semibold text-white">Services</h1>
            <p className="text-xs text-slate-400">Manage your service offerings</p>
          </div>
        </div>
      </div>

      {/* Categories Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        {categories?.categories?.slice(0, 4).map((cat, index) => {
          const gradients = [
            'from-blue-600 to-blue-700',
            'from-emerald-600 to-emerald-500',
            'from-blue-500 to-blue-400',
            'from-slate-600 to-slate-500',
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
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse bg-slate-100 rounded-lg" />
              ))}
            </div>
          ) : data?.services?.length > 0 ? (
            <>
              {/* Desktop: Table Layout */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="hidden md:table-cell">Bay Type</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.services.map((service) => (
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
                        <TableCell className="hidden md:table-cell">
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
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: Card Layout */}
              <div className="sm:hidden divide-y divide-slate-100">
                {data.services.map((service) => (
                  <div key={service.id} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-slate-900">{service.name}</span>
                          {service.is_popular && (
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
                          )}
                        </div>
                        {service.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{service.description}</p>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-slate-900 shrink-0">
                        {service.price_min > 0
                          ? `$${service.price_min.toLocaleString()}`
                          : (service.price_display || 'Free')
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDuration(service.duration_minutes)}
                      </div>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {service.category?.name || '-'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No services found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
