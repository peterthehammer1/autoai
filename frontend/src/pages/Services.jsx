import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { services } from '@/api'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Wrench, Clock, Star, Loader2 } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

const EMPTY_FORM = {
  name: '',
  description: '',
  duration_minutes: '',
  price_min: '',
  price_max: '',
  price_display: '',
  category_id: '',
  required_bay_type: '',
  is_popular: false,
}

const BAY_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'alignment', label: 'Alignment' },
  { value: 'paint', label: 'Paint' },
  { value: 'detail', label: 'Detail' },
  { value: 'electrical', label: 'Electrical' },
]

export default function Services() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState(null) // null = create mode
  const [form, setForm] = useState(EMPTY_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => services.list(),
  })

  const { data: categories } = useQuery({
    queryKey: ['services', 'categories'],
    queryFn: services.categories,
  })

  const createMutation = useMutation({
    mutationFn: (data) => services.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      setIsDialogOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data) => services.update(editingService.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      setIsDialogOpen(false)
    },
  })

  const handleOpenCreate = () => {
    setEditingService(null)
    setForm(EMPTY_FORM)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (service) => {
    setEditingService(service)
    setForm({
      name: service.name || '',
      description: service.description || '',
      duration_minutes: service.duration_minutes?.toString() || '',
      price_min: service.price_min?.toString() || '',
      price_max: service.price_max?.toString() || '',
      price_display: service.price_display || '',
      category_id: service.category?.id || '',
      required_bay_type: service.required_bay_type || '',
      is_popular: service.is_popular || false,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      name: form.name,
      duration_minutes: parseInt(form.duration_minutes, 10),
      ...(form.description && { description: form.description }),
      ...(form.price_min && { price_min: parseInt(form.price_min, 10) }),
      ...(form.price_max && { price_max: parseInt(form.price_max, 10) }),
      ...(form.price_display && { price_display: form.price_display }),
      ...(form.category_id && { category_id: form.category_id }),
      ...(form.required_bay_type && { required_bay_type: form.required_bay_type }),
      is_popular: form.is_popular,
    }
    if (editingService) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      {/* Page Header - Dark Theme */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 pl-14 sm:px-6 lg:pl-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="h-5 w-5 text-blue-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">Services</h1>
              <p className="text-xs text-slate-400">Manage your service offerings</p>
            </div>
          </div>
          <Button size="sm" onClick={handleOpenCreate} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Service</span>
          </Button>
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
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(service)}>
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
                      <div className="min-w-0 flex-1">
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
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold text-slate-900">
                          {service.price_min > 0
                            ? `$${service.price_min.toLocaleString()}`
                            : (service.price_display || 'Free')
                          }
                        </span>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleOpenEdit(service)}>
                          Edit
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDuration(service.duration_minutes)}
                      </div>
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {service.category?.name || '-'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <p>No services found</p>
              <Button variant="outline" size="sm" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-1" />
                Add First Service
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Service' : 'Add Service'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="svc-name">Name *</Label>
                <Input
                  id="svc-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Oil Change"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="svc-desc">Description</Label>
                <Input
                  id="svc-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Full synthetic oil change with filter"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="svc-duration">Duration (min) *</Label>
                  <Input
                    id="svc-duration"
                    type="number"
                    required
                    min="1"
                    value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                    placeholder="30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="svc-category">Category</Label>
                  <Select
                    value={form.category_id}
                    onValueChange={(v) => setForm({ ...form, category_id: v })}
                  >
                    <SelectTrigger id="svc-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="svc-price-min">Price Min ($)</Label>
                  <Input
                    id="svc-price-min"
                    type="number"
                    min="0"
                    value={form.price_min}
                    onChange={(e) => setForm({ ...form, price_min: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="svc-price-max">Price Max ($)</Label>
                  <Input
                    id="svc-price-max"
                    type="number"
                    min="0"
                    value={form.price_max}
                    onChange={(e) => setForm({ ...form, price_max: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="svc-price-display">Display Text</Label>
                  <Input
                    id="svc-price-display"
                    value={form.price_display}
                    onChange={(e) => setForm({ ...form, price_display: e.target.value })}
                    placeholder="From $49"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="svc-bay">Bay Type</Label>
                  <Select
                    value={form.required_bay_type}
                    onValueChange={(v) => setForm({ ...form, required_bay_type: v })}
                  >
                    <SelectTrigger id="svc-bay">
                      <SelectValue placeholder="Select bay type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BAY_TYPES.map((bt) => (
                        <SelectItem key={bt.value} value={bt.value}>
                          {bt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex items-end">
                  <div className="flex items-center gap-2 pb-2">
                    <input
                      type="checkbox"
                      id="svc-popular"
                      checked={form.is_popular}
                      onChange={(e) => setForm({ ...form, is_popular: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <Label htmlFor="svc-popular" className="font-normal">Popular service</Label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingService ? 'Save Changes' : 'Add Service'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
