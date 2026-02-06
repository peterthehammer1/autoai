import { cn } from '@/lib/utils'

/**
 * CustomerAvatar - Generates visually appealing avatars with gradients
 * Each customer gets a unique color combination based on their name
 */

// Teal/dark blue gradient combinations - matching sidebar theme (#082438)
const gradients = [
  'from-[#082438] to-[#0a3a54]',
  'from-[#0a3a54] to-[#0d4a6a]',
  'from-[#0d4a6a] to-[#105a80]',
  'from-[#105a80] to-[#0d4a6a]',
  'from-[#0a3a54] to-[#082438]',
  'from-[#082438] to-[#0d4a6a]',
  'from-[#0d4a6a] to-[#0a3a54]',
  'from-[#105a80] to-[#082438]',
]

// Generate a consistent index based on name
function getGradientIndex(name) {
  if (!name) return 0
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash) % gradients.length
}

// Get initials from name
function getInitials(firstName, lastName) {
  const first = firstName?.charAt(0)?.toUpperCase() || ''
  const last = lastName?.charAt(0)?.toUpperCase() || ''
  return first + last || '?'
}

// Size presets
const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
  '2xl': 'h-20 w-20 text-2xl',
}

export default function CustomerAvatar({ 
  firstName, 
  lastName, 
  size = 'md',
  className,
  showRing = false,
}) {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim()
  const initials = getInitials(firstName, lastName)
  const gradientIndex = getGradientIndex(fullName)
  const gradient = gradients[gradientIndex]

  return (
    <div 
      className={cn(
        'relative flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm',
        gradient,
        sizeClasses[size],
        showRing && 'ring-2 ring-white ring-offset-2',
        className
      )}
    >
      {/* Subtle inner shadow for depth */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/10 to-transparent" />
      
      {/* Initials */}
      <span className="relative z-10 font-medium tracking-wide">
        {initials}
      </span>
    </div>
  )
}

/**
 * CustomerAvatarWithStatus - Avatar with online/offline indicator
 */
export function CustomerAvatarWithStatus({ 
  firstName, 
  lastName, 
  size = 'md',
  status = 'offline', // 'online', 'offline', 'away'
  className,
}) {
  const statusColors = {
    online: 'bg-emerald-500',
    offline: 'bg-slate-400',
    away: 'bg-amber-500',
  }

  const statusSizes = {
    xs: 'h-1.5 w-1.5',
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
    xl: 'h-3.5 w-3.5',
    '2xl': 'h-4 w-4',
  }

  return (
    <div className={cn('relative', className)}>
      <CustomerAvatar 
        firstName={firstName} 
        lastName={lastName} 
        size={size} 
      />
      <span 
        className={cn(
          'absolute bottom-0 right-0 rounded-full ring-2 ring-white',
          statusColors[status],
          statusSizes[size]
        )} 
      />
    </div>
  )
}

/**
 * CustomerAvatarGroup - Stack multiple avatars
 */
export function CustomerAvatarGroup({ 
  customers = [], 
  max = 4,
  size = 'sm',
  className,
}) {
  const shown = customers.slice(0, max)
  const remaining = customers.length - max

  return (
    <div className={cn('flex -space-x-2', className)}>
      {shown.map((customer, index) => (
        <CustomerAvatar
          key={customer.id || index}
          firstName={customer.first_name}
          lastName={customer.last_name}
          size={size}
          showRing
          className="hover:z-10 transition-transform hover:scale-110"
        />
      ))}
      {remaining > 0 && (
        <div 
          className={cn(
            'flex items-center justify-center rounded-full bg-slate-200 text-slate-600 font-medium ring-2 ring-white',
            sizeClasses[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  )
}
