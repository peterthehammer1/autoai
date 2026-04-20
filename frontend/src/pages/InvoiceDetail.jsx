import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { invoices } from '@/api'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  FileText, ArrowLeft, User, Car, Calendar, Trash2, Plus, Send, CheckCircle2, Ban,
} from 'lucide-react'
import { cn, centsToUSD } from '@/lib/utils'

function statusBadge(status) {
  const map = {
    draft: 'bg-slate-100 text-slate-700',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    void: 'bg-red-100 text-red-700',
  }
  return map[status] || 'bg-slate-100 text-slate-600'
}

const LINE_TYPES = [
  { value: 'labor', label: 'Labor' },
  { value: 'part', label: 'Part' },
  { value: 'fee', label: 'Fee' },
  { value: 'discount', label: 'Discount' },
]

function AddLineForm({ invoiceId, onAdded }) {
  const [lineType, setLineType] = useState('labor')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [isTaxable, setIsTaxable] = useState(true)
  const { toast } = useToast()

  const mutation = useMutation({
    mutationFn: (data) => invoices.addLine(invoiceId, data),
    onSuccess: () => {
      toast({ title: 'Line added' })
      setDescription(''); setUnitPrice(''); setQuantity('1')
      onAdded()
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const submit = (e) => {
    e.preventDefault()
    if (!description.trim() || !unitPrice) return
    mutation.mutate({
      line_type: lineType,
      description: description.trim(),
      quantity: parseFloat(quantity) || 1,
      unit_price_cents: Math.round(parseFloat(unitPrice) * 100),
      is_taxable: isTaxable,
    })
  }

  return (
    <form onSubmit={submit} className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
      <div className="grid grid-cols-12 gap-2">
        <select
          value={lineType}
          onChange={e => setLineType(e.target.value)}
          className="col-span-2 text-sm border border-slate-300 rounded px-2 py-1.5"
        >
          {LINE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="col-span-5 text-sm border border-slate-300 rounded px-2 py-1.5"
          required
        />
        <input
          type="number"
          step="0.01"
          placeholder="Qty"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          className="col-span-1 text-sm border border-slate-300 rounded px-2 py-1.5"
        />
        <input
          type="number"
          step="0.01"
          placeholder="Unit $"
          value={unitPrice}
          onChange={e => setUnitPrice(e.target.value)}
          className="col-span-2 text-sm border border-slate-300 rounded px-2 py-1.5"
          required
        />
        <Button type="submit" size="sm" disabled={mutation.isPending} className="col-span-2">
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={isTaxable} onChange={e => setIsTaxable(e.target.checked)} />
        Taxable
      </label>
    </form>
  )
}

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data: inv, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoices.get(id),
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['invoice', id] })

  const statusMutation = useMutation({
    mutationFn: (status) => invoices.setStatus(id, status),
    onSuccess: (_, status) => {
      toast({ title: `Invoice ${status}` })
      refresh()
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const deleteLineMutation = useMutation({
    mutationFn: (itemId) => invoices.deleteLine(id, itemId),
    onSuccess: () => { toast({ title: 'Line removed' }); refresh() },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  if (isLoading) return <div className="py-8 text-center text-slate-500">Loading…</div>
  if (!inv) return <div className="py-8 text-center text-slate-500">Invoice not found.</div>

  const isDraft = inv.status === 'draft'
  const lineItems = inv.line_items || []

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 pl-14 sm:px-6 lg:pl-6 py-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-2"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-5 w-5 text-blue-400 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-white truncate">
                {inv.invoice_number}
              </h1>
              <p className="text-xs text-slate-400">
                {format(parseISO(inv.invoice_date), 'MMMM d, yyyy')}
              </p>
            </div>
            <span className={cn('text-xs px-2 py-1 rounded font-medium capitalize', statusBadge(inv.status))}>
              {inv.status}
            </span>
          </div>
          <div className="flex gap-2 shrink-0">
            {isDraft && (
              <Button
                size="sm" variant="secondary"
                onClick={() => statusMutation.mutate('sent')}
                disabled={statusMutation.isPending}
              >
                <Send className="h-3 w-3 mr-1" /> Send
              </Button>
            )}
            {inv.status !== 'paid' && inv.status !== 'void' && (
              <Button
                size="sm"
                onClick={() => statusMutation.mutate('paid')}
                disabled={statusMutation.isPending}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Paid
              </Button>
            )}
            {inv.status !== 'void' && inv.status !== 'paid' && (
              <Button
                size="sm" variant="destructive"
                onClick={() => {
                  if (confirm('Void this invoice? This cannot be undone.')) {
                    statusMutation.mutate('void')
                  }
                }}
                disabled={statusMutation.isPending}
              >
                <Ban className="h-3 w-3 mr-1" /> Void
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Customer + vehicle snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase mb-2">
            <User className="h-3 w-3" /> Customer
          </div>
          <div className="text-sm font-medium text-slate-900">{inv.customer_name || '—'}</div>
          <div className="text-xs text-slate-500 space-y-0.5 mt-1">
            {inv.customer_phone && <div>{inv.customer_phone}</div>}
            {inv.customer_email && <div>{inv.customer_email}</div>}
            {inv.customer_address && <div>{inv.customer_address}</div>}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase mb-2">
            <Car className="h-3 w-3" /> Vehicle
          </div>
          <div className="text-sm font-medium text-slate-900">{inv.vehicle_description || '—'}</div>
          <div className="text-xs text-slate-500 space-y-0.5 mt-1">
            {inv.vehicle_vin && <div>VIN: {inv.vehicle_vin}</div>}
            {inv.vehicle_km != null && <div>{inv.vehicle_km.toLocaleString()} km</div>}
          </div>
          {inv.appointment_id && (
            <Link
              to={`/appointments/${inv.appointment_id}`}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
            >
              <Calendar className="h-3 w-3" /> View appointment
            </Link>
          )}
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-900">Line items</h2>
          <span className="text-xs text-slate-500">{lineItems.length} line{lineItems.length !== 1 ? 's' : ''}</span>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left px-4 py-2 font-medium w-16">Type</th>
              <th className="text-left px-4 py-2 font-medium">Description</th>
              <th className="text-right px-4 py-2 font-medium w-16">Qty</th>
              <th className="text-right px-4 py-2 font-medium w-24">Unit</th>
              <th className="text-right px-4 py-2 font-medium w-24">Line total</th>
              <th className="text-center px-2 py-2 font-medium w-12">Tax</th>
              {isDraft && <th className="w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {lineItems.length === 0 ? (
              <tr><td colSpan={isDraft ? 7 : 6} className="text-center py-6 text-slate-400 text-xs">No line items yet.</td></tr>
            ) : lineItems.map(l => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-xs text-slate-500 capitalize">{l.line_type}</td>
                <td className="px-4 py-2 text-slate-900">
                  {l.description}
                  {l.part_number && <span className="text-xs text-slate-400 ml-2">#{l.part_number}</span>}
                </td>
                <td className="px-4 py-2 text-right text-slate-600">{parseFloat(l.quantity)}</td>
                <td className="px-4 py-2 text-right text-slate-600">{centsToUSD(l.unit_price_cents)}</td>
                <td className="px-4 py-2 text-right text-slate-900 font-medium">{centsToUSD(l.line_total_cents)}</td>
                <td className="px-2 py-2 text-center text-xs text-slate-500">{l.is_taxable ? '✓' : '—'}</td>
                {isDraft && (
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => {
                        if (confirm(`Remove "${l.description}"?`)) deleteLineMutation.mutate(l.id)
                      }}
                      className="text-slate-300 hover:text-red-500"
                      disabled={deleteLineMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {isDraft && (
          <div className="px-4 py-3 border-t border-slate-100">
            <AddLineForm invoiceId={id} onAdded={refresh} />
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-2">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <span>{centsToUSD(inv.subtotal_cents)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>
            Tax {inv.is_tax_exempt ? '(exempt)' : `(${(parseFloat(inv.tax_rate) * 100).toFixed(1)}%)`}
          </span>
          <span>{centsToUSD(inv.tax_cents)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-slate-900 pt-2 border-t border-slate-200">
          <span>Total</span>
          <span>{centsToUSD(inv.total_cents)}</span>
        </div>
      </div>

      {/* Notes */}
      {(inv.notes || inv.internal_notes) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inv.notes && (
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="text-xs font-medium text-slate-500 uppercase mb-2">Notes (visible to customer)</div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{inv.notes}</div>
            </div>
          )}
          {inv.internal_notes && (
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
              <div className="text-xs font-medium text-amber-700 uppercase mb-2">Internal notes</div>
              <div className="text-sm text-amber-900 whitespace-pre-wrap">{inv.internal_notes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
