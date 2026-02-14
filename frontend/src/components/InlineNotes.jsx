import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Pencil, Check, X, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function InlineNotes({ value, onSave, isPending, label = 'Notes', placeholder = 'Add a note...' }) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')

  const handleEdit = () => {
    setDraft(value || '')
    setIsEditing(true)
  }

  const handleSave = () => {
    onSave(draft.trim() || null)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setDraft(value || '')
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
          autoFocus
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            <Check className="h-3.5 w-3.5 mr-1" />
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isPending}>
            <X className="h-3.5 w-3.5 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</label>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleEdit}
        >
          <Pencil className="h-3 w-3 mr-1" />
          Edit
        </Button>
      </div>
      {value ? (
        <p
          className="text-sm text-slate-700 whitespace-pre-wrap cursor-pointer hover:bg-slate-50 rounded px-2 py-1.5 -mx-2 transition-colors"
          onClick={handleEdit}
        >
          {value}
        </p>
      ) : (
        <p
          className="text-sm text-slate-400 italic cursor-pointer hover:bg-slate-50 rounded px-2 py-1.5 -mx-2 transition-colors"
          onClick={handleEdit}
        >
          {placeholder}
        </p>
      )}
    </div>
  )
}
