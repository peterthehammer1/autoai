import { useState } from 'react'
import { Car } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * CarImage component - displays a car image based on make/model
 * Uses Imagin.studio API for realistic car renders
 * Falls back to a car icon if image fails to load
 */
export default function CarImage({ 
  make, 
  model, 
  year,
  className,
  size = 'md',
  showFallbackIcon = true,
}) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Size presets
  const sizeClasses = {
    xs: 'h-8 w-12',
    sm: 'h-10 w-16',
    md: 'h-14 w-24',
    lg: 'h-20 w-32',
    xl: 'h-28 w-44',
  }

  const iconSizes = {
    xs: 'h-4 w-4',
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-10 w-10',
  }

  // Clean up make/model for URL
  const cleanMake = make?.trim().toLowerCase().replace(/\s+/g, '-') || ''
  const cleanModel = model?.trim().toLowerCase().replace(/\s+/g, '-') || ''

  // Imagin.studio URL - they provide free car images
  // Using angle=23 for a nice 3/4 view
  const imageUrl = cleanMake && cleanModel
    ? `https://cdn.imagin.studio/getimage?customer=img&make=${encodeURIComponent(make)}&modelFamily=${encodeURIComponent(model)}${year ? `&modelYear=${year}` : ''}&angle=23`
    : null

  // If no make/model provided or error occurred, show fallback
  if (!imageUrl || hasError) {
    if (!showFallbackIcon) return null
    
    return (
      <div className={cn(
        'flex items-center justify-center bg-slate-100 rounded-lg',
        sizeClasses[size],
        className
      )}>
        <Car className={cn('text-slate-400', iconSizes[size])} />
      </div>
    )
  }

  return (
    <div className={cn(
      'relative overflow-hidden rounded-lg bg-slate-50',
      sizeClasses[size],
      className
    )}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 animate-pulse">
          <Car className={cn('text-slate-300', iconSizes[size])} />
        </div>
      )}
      <img
        src={imageUrl}
        alt={`${year || ''} ${make} ${model}`.trim()}
        className={cn(
          'h-full w-full object-contain transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false)
          setHasError(true)
        }}
        loading="lazy"
      />
    </div>
  )
}

/**
 * Inline car image for use in lists/tables
 */
export function CarImageInline({ make, model, year, className }) {
  return (
    <CarImage 
      make={make} 
      model={model} 
      year={year} 
      size="sm" 
      className={cn('shrink-0', className)}
    />
  )
}

/**
 * Card-style car image with vehicle info
 */
export function CarImageCard({ make, model, year, className }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <CarImage make={make} model={model} year={year} size="md" />
      <div className="min-w-0">
        <p className="font-medium text-slate-900 truncate">
          {year} {make} {model}
        </p>
      </div>
    </div>
  )
}
