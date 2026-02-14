import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customers } from '@/api'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const colorOptions = ['blue', 'red', 'green', 'amber', 'purple', 'slate']

const colorDots = {
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
  slate: 'bg-slate-500',
}

export default function TagSelector({ customerId, assignedTags = [] }) {
  const [open, setOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('blue')
  const [isCreating, setIsCreating] = useState(false)
  const queryClient = useQueryClient()

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: customers.listTags,
    enabled: open,
  })

  const assignMutation = useMutation({
    mutationFn: (tagId) => customers.addTag(customerId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (tagId) => customers.removeTag(customerId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })

  const createMutation = useMutation({
    mutationFn: (data) => customers.createTag(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      setNewTagName('')
      setIsCreating(false)
      // Auto-assign the newly created tag
      if (result?.tag?.id) {
        assignMutation.mutate(result.tag.id)
      }
    },
  })

  const assignedIds = new Set(assignedTags.map(t => t.id))
  const allTags = tagsData?.tags || []

  const handleToggle = (tagId) => {
    if (assignedIds.has(tagId)) {
      removeMutation.mutate(tagId)
    } else {
      assignMutation.mutate(tagId)
    }
  }

  const handleCreateTag = (e) => {
    e.preventDefault()
    if (!newTagName.trim()) return
    createMutation.mutate({ name: newTagName.trim(), color: newTagColor })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
          <Plus className="h-3 w-3" />
          Tag
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2 border-b border-slate-100">
          <p className="text-xs font-medium text-slate-500 px-1">Assign tags</p>
        </div>
        <div className="max-h-48 overflow-y-auto p-1">
          {allTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleToggle(tag.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-slate-50 transition-colors"
            >
              <div className={cn('h-2.5 w-2.5 rounded-full', colorDots[tag.color] || colorDots.blue)} />
              <span className="flex-1 text-left text-slate-700">{tag.name}</span>
              {assignedIds.has(tag.id) && <Check className="h-3.5 w-3.5 text-blue-600" />}
            </button>
          ))}
          {allTags.length === 0 && (
            <p className="text-xs text-slate-400 px-2 py-3 text-center">No tags yet</p>
          )}
        </div>
        <div className="border-t border-slate-100 p-2">
          {isCreating ? (
            <form onSubmit={handleCreateTag} className="space-y-2">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name"
                className="h-7 text-xs"
                autoFocus
                maxLength={50}
              />
              <div className="flex items-center gap-1">
                {colorOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewTagColor(c)}
                    className={cn(
                      'h-5 w-5 rounded-full border-2 transition-all',
                      colorDots[c],
                      newTagColor === c ? 'border-slate-800 scale-110' : 'border-transparent'
                    )}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                <Button type="submit" size="sm" className="h-6 text-xs flex-1" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Create'}
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 rounded hover:bg-slate-50 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Create new tag
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
