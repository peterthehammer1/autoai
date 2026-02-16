import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDuration, formatCurrency } from '@/lib/utils'
import ServiceCard from '@/components/appointments/ServiceCard'
import {
  Wrench,
  Loader2,
  X,
  Info,
} from 'lucide-react'

function ServiceStep({
  serviceSearch,
  setServiceSearch,
  selectedServices,
  toggleService,
  selectedCategory,
  setSelectedCategory,
  servicesData,
  servicesLoading,
  categoriesData,
  popularData,
  vehicleIntelData,
  totalDuration,
  totalPriceMin,
  totalPriceMax,
}) {
  return (
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

      {/* Mileage-Based Recommendations */}
      {vehicleIntelData?.success && vehicleIntelData.maintenance && (
        (() => {
          const overdue = vehicleIntelData.maintenance.recently_due || []
          const upcoming = vehicleIntelData.maintenance.upcoming_services || []
          if (overdue.length === 0 && upcoming.length === 0) return null
          return (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
              <div className="flex items-center gap-2 text-blue-800 font-medium mb-1.5">
                <Info className="h-4 w-4" />
                Recommended Based on Mileage
              </div>
              <div className="flex flex-wrap gap-1.5">
                {overdue.slice(0, 2).map((item, i) => (
                  <Badge key={`o-${i}`} className="text-xs bg-red-100 text-red-700 hover:bg-red-100">
                    Overdue: {item.services.slice(0, 2).join(', ')}
                  </Badge>
                ))}
                {upcoming.slice(0, 2).map((item, i) => (
                  <Badge key={`u-${i}`} className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
                    Due soon: {item.services.slice(0, 2).join(', ')}
                  </Badge>
                ))}
              </div>
            </div>
          )
        })()
      )}

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
  )
}

export default ServiceStep
