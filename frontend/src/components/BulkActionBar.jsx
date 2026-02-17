import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export default function BulkActionBar({ count, onClear, actions = [] }) {
  if (count === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 text-white px-4 py-3 shadow-lg animate-in slide-in-from-bottom-4 duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{count} selected</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 px-2 text-xs"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant="outline"
              onClick={action.onClick}
              className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700 hover:text-white h-8 text-xs"
            >
              {action.icon && <action.icon className="h-3.5 w-3.5 mr-1.5" />}
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
