import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { smsLogs } from '@/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Send, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function SmsComposeDialog({
  open,
  onOpenChange,
  recipientPhone,
  recipientName,
  customerId,
  appointmentId,
}) {
  const [phone, setPhone] = useState(recipientPhone || '')
  const [body, setBody] = useState('')
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const sendMutation = useMutation({
    mutationFn: (data) => smsLogs.send(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-logs'] })
      queryClient.invalidateQueries({ queryKey: ['customer'] })
      toast({ title: 'SMS sent successfully' })
      setBody('')
      onOpenChange(false)
    },
    onError: (err) => {
      toast({ title: 'Failed to send SMS', description: err.message, variant: 'destructive' })
    },
  })

  const handleSend = (e) => {
    e.preventDefault()
    const toPhone = recipientPhone || phone
    if (!toPhone || !body.trim()) return
    sendMutation.mutate({
      to: toPhone,
      body: body.trim(),
      customer_id: customerId || undefined,
      appointment_id: appointmentId || undefined,
    })
  }

  const charCount = body.length
  const segments = Math.ceil(charCount / 160) || 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send SMS</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSend}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>To</Label>
              {recipientPhone ? (
                <p className="text-sm text-slate-700 bg-slate-50 rounded-md px-3 py-2">
                  {recipientName ? `${recipientName} — ` : ''}{recipientPhone}
                </p>
              ) : (
                <Input
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              )}
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
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              />
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{charCount} / 1600 characters</span>
                <span>{segments} segment{segments !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sendMutation.isPending || !body.trim()}>
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Send
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
