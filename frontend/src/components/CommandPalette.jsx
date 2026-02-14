import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { search } from '@/api'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Search, User, Calendar, Wrench, ClipboardList, Loader2 } from 'lucide-react'

const TYPE_CONFIG = {
  customers: { label: 'Customers', icon: User },
  appointments: { label: 'Appointments', icon: Calendar },
  services: { label: 'Services', icon: Wrench },
  work_orders: { label: 'Work Orders', icon: ClipboardList },
}

export default function CommandPalette({ open, onOpenChange }) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setQuery('')
      setDebouncedQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const { data, isFetching } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => search.query(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
  })

  // Flatten results for keyboard navigation
  const allResults = useMemo(() => {
    if (!data?.results) return []
    const items = []
    for (const type of ['customers', 'appointments', 'work_orders', 'services']) {
      const group = data.results[type] || []
      if (group.length > 0) {
        items.push({ type: 'header', label: TYPE_CONFIG[type].label, key: `header-${type}` })
        group.forEach(item => items.push({ ...item, key: item.id }))
      }
    }
    return items
  }, [data])

  const selectableResults = useMemo(() => allResults.filter(r => r.type !== 'header'), [allResults])

  // Reset active index when results change
  useEffect(() => { setActiveIndex(0) }, [allResults])

  const openResult = useCallback((item) => {
    if (item?.href) {
      navigate(item.href)
      onOpenChange(false)
    }
  }, [navigate, onOpenChange])

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, selectableResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      openResult(selectableResults[activeIndex])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden [&>button]:hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
          {isFetching ? (
            <Loader2 className="h-4 w-4 text-slate-400 animate-spin shrink-0" />
          ) : (
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder="Search customers, appointments, services..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-xs text-slate-400 hover:text-slate-600">
              Clear
            </button>
          )}
        </div>

        {/* Results */}
        <ScrollArea className="max-h-80">
          {debouncedQuery.length < 2 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              Type at least 2 characters to search
            </div>
          ) : allResults.length === 0 && !isFetching ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              No results for "{debouncedQuery}"
            </div>
          ) : (
            <div className="py-2">
              {allResults.map((item) => {
                if (item.type === 'header') {
                  return (
                    <div key={item.key} className="px-4 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {item.label}
                    </div>
                  )
                }
                const idx = selectableResults.indexOf(item)
                const isActive = idx === activeIndex
                const typeKey = item.type === 'work_order' ? 'work_orders' : item.type + 's'
                const config = TYPE_CONFIG[typeKey] || TYPE_CONFIG.customers
                const Icon = config.icon
                return (
                  <button
                    key={item.key}
                    className={cn(
                      'flex items-center gap-3 w-full px-4 py-2 text-left text-sm transition-colors',
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                    )}
                    onClick={() => openResult(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-blue-500' : 'text-slate-400')} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      {item.subtitle && <p className="text-xs text-slate-400 truncate">{item.subtitle}</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 text-[10px] text-slate-400">
          <span><kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">↑↓</kbd> Navigate</span>
          <span><kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">↵</kbd> Open</span>
          <span><kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">Esc</kbd> Close</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
