import { useState } from 'react'
import { smsLogs } from '@/api'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Send, Loader2, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function BulkSmsDialog({ open, onOpenChange, customers = [] }) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 })
  const [done, setDone] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const handleSend = async (e) => {
    e.preventDefault()
    if (!body.trim() || customers.length === 0) return

    setSending(true)
    setDone(false)
    const total = customers.length
    setProgress({ sent: 0, failed: 0, total })

    let sent = 0
    let failed = 0

    for (const customer of customers) {
      try {
        await smsLogs.send({
          to: customer.phone,
          body: body.trim(),
          customer_id: customer.id,
        })
        sent++
      } catch {
        failed++
      }
      setProgress({ sent, failed, total })
    }

    setSending(false)
    setDone(true)
    queryClient.invalidateQueries({ queryKey: ['sms-logs'] })
    toast({
      title: `Bulk SMS complete`,
      description: `${sent} sent, ${failed} failed out of ${total}`,
    })
  }

  const handleClose = () => {
    setBody('')
    setDone(false)
    setProgress({ sent: 0, failed: 0, total: 0 })
    onOpenChange(false)
  }

  const charCount = body.length
  const segments = Math.ceil(charCount / 160) || 1

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Bulk SMS</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <p className="font-medium text-slate-800">Messages sent</p>
            <p className="text-sm text-slate-500 mt-1">
              {progress.sent} delivered, {progress.failed} failed
            </p>
            <Button className="mt-4" onClick={handleClose}>Done</Button>
          </div>
        ) : (
          <form onSubmit={handleSend}>
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 rounded-md px-3 py-2">
                <p className="text-sm text-slate-700 font-medium">
                  Sending to {customers.length} customer{customers.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type your message..."
                  rows={4}
                  maxLength={1600}
                  required
                  disabled={sending}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y disabled:opacity-50"
                />
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{charCount} / 1600 characters</span>
                  <span>{segments} segment{segments !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {sending && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Sending...</span>
                    <span>{progress.sent + progress.failed} / {progress.total}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${((progress.sent + progress.failed) / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={sending}>
                Cancel
              </Button>
              <Button type="submit" disabled={sending || !body.trim()}>
                {sending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                Send to All
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
