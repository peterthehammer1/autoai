import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const colorMap = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
}

export default function TagBadge({ tag, onRemove, size = 'sm' }) {
  const colors = colorMap[tag.color] || colorMap.blue

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        colors,
        size === 'sm' ? 'text-xs px-1.5 py-0' : 'text-xs px-2 py-0.5'
      )}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(tag.id) }}
          className="hover:opacity-70 -mr-0.5"
        >
          <X className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
        </button>
      )}
    </span>
  )
}
