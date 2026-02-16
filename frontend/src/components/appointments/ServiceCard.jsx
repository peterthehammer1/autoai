import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatDuration } from '@/lib/utils'
import { Check } from 'lucide-react'

function ServiceCard({ service, isSelected, onToggle }) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all',
        isSelected && 'ring-2 ring-primary border-primary bg-primary/5'
      )}
      onClick={onToggle}
    >
      <CardContent className="p-3 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{service.name}</p>
            {service.is_popular && (
              <Badge variant="secondary" className="text-xs">
                Popular
              </Badge>
            )}
          </div>
          {service.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {service.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>{formatDuration(service.duration_minutes)}</span>
            <span>{service.price_display}</span>
          </div>
        </div>
        <div
          className={cn(
            'h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors',
            isSelected
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-muted-foreground/50'
          )}
        >
          {isSelected && <Check className="h-4 w-4" />}
        </div>
      </CardContent>
    </Card>
  )
}

export default ServiceCard
