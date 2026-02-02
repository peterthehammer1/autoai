import { useState, useEffect } from 'react'
import { Car } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * CarImage component - displays a car image based on make/model/year
 * Uses CarImagery.com database for high-quality car photos
 * Falls back to a car icon if image fails to load
 */

// Cache for the car images lookup data
let carImagesCache = null
let carImagesCachePromise = null

// Load the car images lookup JSON
async function loadCarImagesLookup() {
  if (carImagesCache) return carImagesCache
  if (carImagesCachePromise) return carImagesCachePromise
  
  carImagesCachePromise = fetch('/car-images.json')
    .then(res => res.json())
    .then(data => {
      carImagesCache = data
      return data
    })
    .catch(err => {
      console.error('Failed to load car images lookup:', err)
      return {}
    })
  
  return carImagesCachePromise
}

// Find the best matching image for a make/model/year
function findCarImage(lookup, make, model, year) {
  if (!lookup || !make || !model) return null
  
  const key = `${make.toLowerCase()}|${model.toLowerCase()}`
  const entries = lookup[key]
  
  if (!entries || entries.length === 0) {
    // Try partial model match (e.g., "CX-5" might be stored as "CX5")
    const modelNormalized = model.toLowerCase().replace(/[-\s]/g, '')
    const altKey = `${make.toLowerCase()}|${modelNormalized}`
    const altEntries = lookup[altKey]
    if (altEntries && altEntries.length > 0) {
      return findBestMatch(altEntries, year)
    }
    
    // Try finding any model that starts with the same prefix
    const prefix = model.toLowerCase().split(/[-\s]/)[0]
    for (const k of Object.keys(lookup)) {
      if (k.startsWith(`${make.toLowerCase()}|${prefix}`)) {
        return findBestMatch(lookup[k], year)
      }
    }
    
    return null
  }
  
  return findBestMatch(entries, year)
}

function findBestMatch(entries, year) {
  const targetYear = parseInt(year) || new Date().getFullYear()
  
  // Find entry where year falls within range
  let bestMatch = null
  let bestScore = -Infinity
  
  for (const entry of entries) {
    const [ys, ye, filename] = entry
    
    // Score based on how well the year matches
    let score = 0
    if (targetYear >= ys && targetYear <= ye) {
      score = 100 // Perfect match
    } else if (targetYear < ys) {
      score = -Math.abs(ys - targetYear) // Penalize future cars less
    } else {
      score = -Math.abs(targetYear - ye) * 2 // Penalize old cars more
    }
    
    if (score > bestScore) {
      bestScore = score
      bestMatch = filename
    }
  }
  
  return bestMatch
}

export default function CarImage({ 
  make, 
  model, 
  year,
  className,
  size = 'md',
  showFallbackIcon = true,
}) {
  const [imageUrl, setImageUrl] = useState(null)
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

  useEffect(() => {
    let cancelled = false
    
    async function lookupImage() {
      if (!make || !model) {
        setIsLoading(false)
        return
      }
      
      try {
        const lookup = await loadCarImagesLookup()
        if (cancelled) return
        
        const filename = findCarImage(lookup, make, model, year)
        
        if (filename) {
          setImageUrl(`https://www.carimagery.com/img/${filename}`)
        }
      } catch (err) {
        console.error('Error looking up car image:', err)
      }
      
      if (!cancelled) {
        setIsLoading(false)
      }
    }
    
    lookupImage()
    
    return () => { cancelled = true }
  }, [make, model, year])

  // If no make/model provided, loading, or error occurred, show fallback
  if (!make || !model || (!imageUrl && !isLoading) || hasError) {
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

  if (isLoading || !imageUrl) {
    return (
      <div className={cn(
        'flex items-center justify-center bg-slate-100 rounded-lg animate-pulse',
        sizeClasses[size],
        className
      )}>
        <Car className={cn('text-slate-300', iconSizes[size])} />
      </div>
    )
  }

  return (
    <div className={cn(
      'relative overflow-hidden rounded-lg bg-slate-50',
      sizeClasses[size],
      className
    )}>
      <img
        src={imageUrl}
        alt={`${year || ''} ${make} ${model}`.trim()}
        className="h-full w-full object-cover"
        onError={() => setHasError(true)}
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
