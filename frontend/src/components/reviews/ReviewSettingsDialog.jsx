import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reviews } from '@/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ExternalLink } from 'lucide-react'

export default function ReviewSettingsDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({
    google_url: '',
    auto_send: true,
    dedup_days: 30,
  })
  const queryClient = useQueryClient()

  const { data: settings } = useQuery({
    queryKey: ['reviews', 'settings'],
    queryFn: () => reviews.getSettings(),
    enabled: open,
  })

  useEffect(() => {
    if (!settings) return
    setForm({
      google_url: settings.google_url || '',
      auto_send: settings.auto_send,
      dedup_days: settings.dedup_days || 30,
    })
  }, [settings])

  const mutation = useMutation({
    mutationFn: (data) => reviews.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['reviews', 'settings'])
      onOpenChange(false)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate({
      google_url: form.google_url,
      auto_send: form.auto_send,
      dedup_days: Number(form.dedup_days),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review Settings</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Google Review URL */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600">Google Review URL</Label>
              <Input
                type="url"
                placeholder="https://g.page/r/..."
                value={form.google_url}
                onChange={(e) => setForm({ ...form, google_url: e.target.value })}
                className="h-9 text-sm"
              />
              {form.google_url && (
                <a
                  href={form.google_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600"
                >
                  Preview link <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>

            {/* Auto-send toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs text-slate-600">Auto-send after completion</Label>
                <p className="text-[10px] text-slate-400">Automatically send review requests via daily cron</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.auto_send}
                onClick={() => setForm({ ...form, auto_send: !form.auto_send })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  form.auto_send ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${
                    form.auto_send ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Dedup days */}
            <div className="flex items-center gap-3">
              <Label className="w-40 text-xs text-slate-600 shrink-0">Dedup window (days)</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={form.dedup_days}
                onChange={(e) => setForm({ ...form, dedup_days: e.target.value })}
                className="h-9 text-sm w-20"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Customers won't receive another review request within this window.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
