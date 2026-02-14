import { useState, useCallback, useMemo } from 'react'

export function useSelection() {
  const [selected, setSelected] = useState(new Set())

  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectAll = useCallback((ids) => {
    setSelected(new Set(ids))
  }, [])

  const clearAll = useCallback(() => {
    setSelected(new Set())
  }, [])

  const isSelected = useCallback((id) => selected.has(id), [selected])

  const count = selected.size

  return { selected, count, toggle, selectAll, clearAll, isSelected }
}
