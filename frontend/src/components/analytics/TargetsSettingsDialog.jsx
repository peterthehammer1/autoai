import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { analytics } from '@/api'
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
import { Loader2 } from 'lucide-react'

const METRICS = [
  { key: 'total_calls', label: 'Total Calls', format: 'number', suffix: '' },
  { key: 'booked_calls', label: 'Booked Calls', format: 'number', suffix: '' },
  { key: 'revenue', label: 'Revenue ($)', format: 'currency', suffix: '' },
  { key: 'avg_ticket', label: 'Avg Ticket ($)', format: 'currency', suffix: '' },
  { key: 'satisfaction_rate', label: 'Satisfaction (%)', format: 'percent', suffix: '%' },
  { key: 'new_customers', label: 'New Customers', format: 'number', suffix: '' },
]

export default function TargetsSettingsDialog({ open, onOpenChange, targets }) {
  const [form, setForm] = useState({})
  const queryClient = useQueryClient()

  // Initialize form from targets
  useEffect(() => {
    if (!targets) return
    const initial = {}
    for (const metric of METRICS) {
      const target = targets.find(t => t.metric_name === metric.key)
      if (target) {
        // Convert cents to dollars for currency fields
        initial[metric.key] = metric.format === 'currency'
          ? (target.target_value / 100).toFixed(0)
          : String(target.target_value)
      } else {
        initial[metric.key] = ''
      }
    }
    setForm(initial)
  }, [targets])

  const mutation = useMutation({
    mutationFn: (data) => analytics.updateTargets(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics', 'targets'] })
      onOpenChange(false)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = METRICS
      .filter(m => form[m.key] && form[m.key] !== '')
      .map(m => ({
        metric_name: m.key,
        // Convert dollars to cents for currency fields
        target_value: m.format === 'currency'
          ? Math.round(parseFloat(form[m.key]) * 100)
          : parseFloat(form[m.key]),
        period: 'week',
        display_format: m.format,
      }))
    mutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Analytics Targets</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-3 py-4">
            {METRICS.map((metric) => (
              <div key={metric.key} className="flex items-center gap-3">
                <Label className="w-32 text-xs text-slate-600 shrink-0">{metric.label}</Label>
                <Input
                  type="number"
                  step={metric.format === 'currency' ? '0.01' : '1'}
                  min="0"
                  placeholder="—"
                  value={form[metric.key] || ''}
                  onChange={(e) => setForm({ ...form, [metric.key]: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            ))}
            <p className="text-xs text-slate-400 mt-2">
              Targets are per-week. Revenue and avg ticket values are in dollars.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Targets
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
