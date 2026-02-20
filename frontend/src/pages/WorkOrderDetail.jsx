import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { workOrders, services as servicesApi, portal, inspections } from '@/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  ClipboardList,
  User,
  Car,
  Calendar,
  Plus,
  Trash2,
  DollarSign,
  CreditCard,
  Wrench,
  Package,
  Receipt,
  ChevronRight,
  X,
  Check,
  Edit,
  Send,
  ShieldCheck,
  ClipboardCheck,
  CheckCircle,
  AlertTriangle,
  AlertCircle as AlertCircleIcon,
  XCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { cn, formatCents, formatTime12Hour, parseDateLocal } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useBreadcrumbEntity } from '@/components/Breadcrumbs'
import PhoneNumber from '@/components/PhoneNumber'

function getWOStatusColor(status) {
  const colors = {
    draft: 'bg-slate-100 text-slate-600',
    estimated: 'bg-blue-100 text-blue-700',
    sent_to_customer: 'bg-blue-100 text-blue-700',
    approved: 'bg-emerald-100 text-emerald-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed: 'bg-slate-200 text-slate-700',
    invoiced: 'bg-purple-100 text-purple-700',
    paid: 'bg-green-100 text-green-700',
    void: 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-slate-100 text-slate-600'
}

// Status progression flow
const STATUS_TRANSITIONS = {
  draft: ['estimated'],
  estimated: ['sent_to_customer', 'approved'],
  sent_to_customer: ['approved'],
  approved: ['in_progress'],
  in_progress: ['completed'],
  completed: ['invoiced'],
  invoiced: ['paid'],
}

const STATUS_LABELS = {
  estimated: 'Mark as Estimated',
  sent_to_customer: 'Send to Customer',
  approved: 'Mark Approved',
  in_progress: 'Start Work',
  completed: 'Mark Complete',
  invoiced: 'Create Invoice',
  paid: 'Mark Paid',
}

const ITEM_TYPE_ICONS = {
  labor: Wrench,
  part: Package,
  fee: Receipt,
  sublet: Receipt,
  discount: DollarSign,
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Credit Card' },
  { value: 'debit', label: 'Debit' },
  { value: 'check', label: 'Check' },
  { value: 'e_transfer', label: 'E-Transfer' },
]

function AddItemForm({ workOrderId, onClose }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [itemType, setItemType] = useState('labor')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [showCatalog, setShowCatalog] = useState(false)

  const { data: catalogData } = useQuery({
    queryKey: ['services-catalog'],
    queryFn: () => servicesApi.list({ is_active: true }),
    enabled: showCatalog,
  })

  const addMutation = useMutation({
    mutationFn: (data) => workOrders.addItem(workOrderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] })
      toast({ title: 'Item added' })
      onClose()
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!description || !unitPrice) return
    addMutation.mutate({
      item_type: itemType,
      description,
      quantity: parseFloat(quantity) || 1,
      unit_price_cents: parseFloat(unitPrice) || 0,
      cost_cents: costPrice ? parseFloat(costPrice) : 0,
    })
  }

  const handleSelectService = (svc) => {
    setDescription(svc.name)
    setUnitPrice(String(svc.price_min || ''))
    setItemType('labor')
    setShowCatalog(false)
  }

  return (
    <form onSubmit={handleSubmit} className="border border-blue-200 bg-blue-50/30 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-700">Add Line Item</h4>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Quick add from catalog */}
      {!showCatalog ? (
        <button
          type="button"
          onClick={() => setShowCatalog(true)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Choose from service catalog...
        </button>
      ) : (
        <div className="border border-slate-200 rounded bg-white max-h-40 overflow-y-auto">
          {(catalogData?.services || []).map((svc) => (
            <button
              key={svc.id}
              type="button"
              onClick={() => handleSelectService(svc)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0 flex justify-between"
            >
              <span className="text-slate-700">{svc.name}</span>
              <span className="text-slate-400">{formatCents(svc.price_min)}</span>
            </button>
          ))}
          {(catalogData?.services || []).length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400">No services found</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <select
          value={itemType}
          onChange={(e) => setItemType(e.target.value)}
          className="text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white"
        >
          <option value="labor">Labor</option>
          <option value="part">Part</option>
          <option value="fee">Fee</option>
          <option value="sublet">Sublet</option>
          <option value="discount">Discount</option>
        </select>
        <Input
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="col-span-1 sm:col-span-3 h-8 text-sm"
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-slate-400 uppercase">Qty</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 uppercase">Unit Price ($)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            className="h-8 text-sm"
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 uppercase">Cost ($)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            className="h-8 text-sm"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs h-8">
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={addMutation.isPending} className="text-xs h-8 bg-slate-800 hover:bg-slate-700">
          {addMutation.isPending ? 'Adding...' : 'Add Item'}
        </Button>
      </div>
    </form>
  )
}

function RecordPaymentForm({ workOrderId, balanceDue, onClose }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [amount, setAmount] = useState(balanceDue > 0 ? String(balanceDue) : '')
  const [method, setMethod] = useState('card')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')

  const paymentMutation = useMutation({
    mutationFn: (data) => workOrders.addPayment(workOrderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] })
      toast({ title: 'Payment recorded' })
      onClose()
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) return
    paymentMutation.mutate({
      amount_cents: parseFloat(amount),
      method,
      reference_number: reference || undefined,
      notes: notes || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="border border-green-200 bg-green-50/30 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-700">Record Payment</h4>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-400 uppercase">Amount ($)</label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 text-sm"
            required
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 uppercase">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white h-8"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Input
        placeholder="Reference # (optional)"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        className="h-8 text-sm"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs h-8">
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={paymentMutation.isPending}
          className="text-xs h-8 bg-green-600 hover:bg-green-700"
        >
          {paymentMutation.isPending ? 'Processing...' : 'Record Payment'}
        </Button>
      </div>
    </form>
  )
}

function SendPortalLinkButton({ customerId, toast }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    setSending(true)
    try {
      await portal.generateToken(customerId, true)
      setSent(true)
      toast({ title: 'Portal link sent via SMS' })
      setTimeout(() => setSent(false), 3000)
    } catch (err) {
      toast({ title: 'Failed to send portal link', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSend}
      disabled={sending || sent}
      className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
    >
      {sent ? (
        <>
          <Check className="h-3.5 w-3.5 mr-1" />
          Sent
        </>
      ) : sending ? (
        'Sending...'
      ) : (
        <>
          <Send className="h-3.5 w-3.5 mr-1" />
          Send Portal Link
        </>
      )}
    </Button>
  )
}

export default function WorkOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [showAddItem, setShowAddItem] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [editingInternalNotes, setEditingInternalNotes] = useState(false)
  const [internalNotesValue, setInternalNotesValue] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => workOrders.get(id),
  })

  const wo = data?.work_order

  const { setEntityName } = useBreadcrumbEntity()
  useEffect(() => {
    if (wo) {
      setEntityName(wo.work_order_display)
    }
    return () => setEntityName(null)
  }, [wo, setEntityName])

  const updateMutation = useMutation({
    mutationFn: (updates) => workOrders.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      toast({ title: 'Work order updated' })
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: (itemId) => workOrders.deleteItem(id, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] })
      toast({ title: 'Item removed' })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse bg-slate-100" />
        <div className="h-64 animate-pulse bg-slate-100" />
      </div>
    )
  }

  if (error || !wo) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Work order not found</p>
        <Button variant="link" asChild>
          <Link to="/work-orders">Back to Work Orders</Link>
        </Button>
      </div>
    )
  }

  const nextStatuses = STATUS_TRANSITIONS[wo.status] || []
  const items = wo.work_order_items || []
  const payments = wo.payments || []
  const balanceDue = wo.balance_due_cents || 0
  const isEditable = !['paid', 'void'].includes(wo.status)

  const laborItems = items.filter((i) => i.item_type === 'labor')
  const partItems = items.filter((i) => i.item_type === 'part')
  const otherItems = items.filter((i) => !['labor', 'part'].includes(i.item_type))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 pl-14 sm:px-6 lg:pl-6 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <Link to="/work-orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <ClipboardList className="h-5 w-5 text-blue-400" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white">{wo.work_order_display}</h1>
            <p className="text-xs text-slate-400">
              Created {format(new Date(wo.created_at), 'MMM d, yyyy')}
              {wo.appointment && (
                <>
                  {' '}
                  &middot; Apt:{' '}
                  {format(parseDateLocal(wo.appointment.scheduled_date), 'MMM d')} at{' '}
                  {formatTime12Hour(wo.appointment.scheduled_time)}
                </>
              )}
            </p>
          </div>
          <span
            className={cn(
              'text-xs px-2 py-1 rounded capitalize',
              getWOStatusColor(wo.status)
            )}
          >
            {wo.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Status Actions */}
      {nextStatuses.length > 0 && (
        <div className="bg-white shadow-lg border-0 rounded-lg p-3">
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((status) => (
              <Button
                key={status}
                onClick={() => updateMutation.mutate({ status })}
                disabled={updateMutation.isPending}
                size="sm"
                className="bg-slate-700 hover:bg-slate-800"
              >
                {STATUS_LABELS[status] || status}
              </Button>
            ))}
            {wo.customer?.id && ['sent_to_customer', 'approved', 'in_progress', 'completed', 'invoiced'].includes(wo.status) && (
              <SendPortalLinkButton customerId={wo.customer.id} toast={toast} />
            )}
            {wo.status !== 'void' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateMutation.mutate({ status: 'void' })}
                disabled={updateMutation.isPending}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Void
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Customer & Vehicle */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white shadow-lg border-0 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30">
            <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-400" />
              Customer
            </h3>
          </div>
          <div className="p-4 space-y-2">
            <p className="text-sm font-medium text-slate-800">
              {wo.customer
                ? `${wo.customer.first_name || ''} ${wo.customer.last_name || ''}`.trim()
                : '-'}
            </p>
            {wo.customer?.phone && (
              <div className="text-sm text-slate-600">
                <PhoneNumber phone={wo.customer.phone} />
              </div>
            )}
            {wo.customer?.id && (
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <Link to={`/customers/${wo.customer.id}`}>View Customer</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="bg-white shadow-lg border-0 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30">
            <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Car className="h-4 w-4 text-blue-400" />
              Vehicle
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {wo.vehicle ? (
              <>
                <p className="text-sm font-medium text-slate-800">
                  {wo.vehicle.year} {wo.vehicle.make} {wo.vehicle.model}
                </p>
                {wo.vehicle.color && (
                  <p className="text-xs text-muted-foreground">{wo.vehicle.color}</p>
                )}
                {wo.vehicle.license_plate && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Plate: {wo.vehicle.license_plate}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No vehicle on file</p>
            )}
            {wo.appointment?.id && (
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <Link to={`/appointments/${wo.appointment.id}`}>View Appointment</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white shadow-lg border-0 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-blue-400" />
            Line Items
          </h3>
          {isEditable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddItem(true)}
              className="text-xs h-8"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Item
            </Button>
          )}
        </div>

        <div className="p-4 space-y-1">
          {items.length === 0 && !showAddItem && (
            <p className="text-sm text-slate-400 text-center py-4">
              No line items yet. Click "Add Item" to begin.
            </p>
          )}

          {/* Group: Labor */}
          {laborItems.length > 0 && (
            <div className="mb-3">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-1">
                Labor
              </p>
              {laborItems.map((item) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  editable={isEditable}
                  onDelete={() => deleteItemMutation.mutate(item.id)}
                  deleting={deleteItemMutation.isPending}
                />
              ))}
            </div>
          )}

          {/* Group: Parts */}
          {partItems.length > 0 && (
            <div className="mb-3">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-1">
                Parts
              </p>
              {partItems.map((item) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  editable={isEditable}
                  onDelete={() => deleteItemMutation.mutate(item.id)}
                  deleting={deleteItemMutation.isPending}
                />
              ))}
            </div>
          )}

          {/* Group: Other */}
          {otherItems.length > 0 && (
            <div className="mb-3">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-1">
                Other
              </p>
              {otherItems.map((item) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  editable={isEditable}
                  onDelete={() => deleteItemMutation.mutate(item.id)}
                  deleting={deleteItemMutation.isPending}
                />
              ))}
            </div>
          )}

          {showAddItem && (
            <AddItemForm
              workOrderId={id}
              onClose={() => setShowAddItem(false)}
            />
          )}

          {/* Totals */}
          {items.length > 0 && (
            <div className="border-t border-slate-200 pt-3 mt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-slate-700">{formatCents(wo.subtotal_cents)}</span>
              </div>
              {wo.discount_cents > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    Discount{wo.discount_reason && ` (${wo.discount_reason})`}
                  </span>
                  <span className="text-red-600">-{formatCents(wo.discount_cents)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  Tax ({((wo.tax_rate || 0.13) * 100).toFixed(0)}%)
                </span>
                <span className="text-slate-700">{formatCents(wo.tax_cents)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-slate-100 pt-2">
                <span className="text-slate-800">Total</span>
                <span className="text-slate-800">{formatCents(wo.total_cents)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inspection */}
      {wo.vehicle?.id && !['draft', 'void'].includes(wo.status) && (
        <InspectionCard
          workOrderId={id}
          vehicleId={wo.vehicle.id}
          status={wo.status}
        />
      )}

      {/* Payments */}
      <div className="bg-white shadow-lg border-0 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-blue-400" />
            Payments
          </h3>
          {wo.total_cents > 0 && balanceDue > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPayment(true)}
              className="text-xs h-8"
            >
              <Plus className="h-3 w-3 mr-1" />
              Record Payment
            </Button>
          )}
        </div>

        <div className="p-4 space-y-3">
          {payments.length === 0 && !showPayment && (
            <p className="text-sm text-slate-400 text-center py-2">No payments recorded</p>
          )}

          {payments.map((pmt) => (
            <div
              key={pmt.id}
              className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
            >
              <div>
                <p className="text-sm text-slate-700 capitalize">{pmt.method.replace('_', ' ')}</p>
                <p className="text-xs text-slate-400">
                  {format(new Date(pmt.created_at), 'MMM d, yyyy h:mm a')}
                  {pmt.reference_number && ` - Ref: ${pmt.reference_number}`}
                </p>
              </div>
              <span className="text-sm font-medium text-green-700">
                {formatCents(pmt.amount_cents)}
              </span>
            </div>
          ))}

          {showPayment && (
            <RecordPaymentForm
              workOrderId={id}
              balanceDue={balanceDue}
              onClose={() => setShowPayment(false)}
            />
          )}

          {/* Balance */}
          {wo.total_cents > 0 && (
            <div className="border-t border-slate-200 pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Paid</span>
                <span className="text-green-700">{formatCents(wo.total_paid_cents)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-slate-800">Balance Due</span>
                <span className={balanceDue > 0 ? 'text-red-600' : 'text-green-700'}>
                  {formatCents(balanceDue)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white shadow-lg border-0 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Edit className="h-4 w-4 text-blue-400" />
              Notes
            </h3>
            {!editingNotes && (
              <button
                onClick={() => {
                  setNotesValue(wo.notes || '')
                  setEditingNotes(true)
                }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
            )}
          </div>
          <div className="p-4">
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-slate-200 rounded-md p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="Customer-visible notes..."
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingNotes(false)}
                    className="text-xs h-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      updateMutation.mutate({ notes: notesValue })
                      setEditingNotes(false)
                    }}
                    className="text-xs h-8 bg-slate-800 hover:bg-slate-700"
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                {wo.notes || <span className="text-slate-400 italic">No notes</span>}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white shadow-lg border-0 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Edit className="h-4 w-4 text-amber-400" />
              Internal Notes
            </h3>
            {!editingInternalNotes && (
              <button
                onClick={() => {
                  setInternalNotesValue(wo.internal_notes || '')
                  setEditingInternalNotes(true)
                }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
            )}
          </div>
          <div className="p-4">
            {editingInternalNotes ? (
              <div className="space-y-2">
                <textarea
                  value={internalNotesValue}
                  onChange={(e) => setInternalNotesValue(e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-slate-200 rounded-md p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="Internal-only notes..."
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingInternalNotes(false)}
                    className="text-xs h-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      updateMutation.mutate({ internal_notes: internalNotesValue })
                      setEditingInternalNotes(false)
                    }}
                    className="text-xs h-8 bg-slate-800 hover:bg-slate-700"
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                {wo.internal_notes || (
                  <span className="text-slate-400 italic">No internal notes</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-white shadow-lg border-0 rounded-lg p-3">
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div>
            <span>Created: </span>
            {format(new Date(wo.created_at), 'MMM d, yyyy h:mm a')}
          </div>
          {wo.updated_at && (
            <div>
              <span>Updated: </span>
              {format(new Date(wo.updated_at), 'MMM d, yyyy h:mm a')}
            </div>
          )}
          {wo.authorized_at && (
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {wo.authorization_method === 'portal' ? 'Portal Approved' : 'Authorized'}
              </span>
              <span>
                {format(new Date(wo.authorized_at), 'MMM d, yyyy h:mm a')}
                {wo.authorized_by && ` by ${wo.authorized_by}`}
              </span>
              {wo.authorization_ip && (
                <span className="text-slate-300">IP: {wo.authorization_ip}</span>
              )}
              {wo.work_order_items && (() => {
                const approved = wo.work_order_items.filter(i => i.status === 'approved').length
                const declined = wo.work_order_items.filter(i => i.status === 'declined').length
                if (approved === 0 && declined === 0) return null
                return (
                  <span className="text-slate-400">
                    ({approved} approved{declined > 0 ? `, ${declined} declined` : ''})
                  </span>
                )
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const CONDITION_COLORS = {
  good: 'bg-emerald-500',
  fair: 'bg-amber-400',
  needs_attention: 'bg-orange-500',
  urgent: 'bg-red-600',
}

function InspectionCard({ workOrderId, vehicleId, status: woStatus }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [creating, setCreating] = useState(false)
  const [sending, setSending] = useState(false)
  const [addingToEstimate, setAddingToEstimate] = useState(false)

  const { data: inspectionData, isLoading } = useQuery({
    queryKey: ['inspections', { work_order_id: workOrderId }],
    queryFn: () => inspections.list({ work_order_id: workOrderId }),
  })

  const inspection = inspectionData?.inspections?.[0]
  const items = inspection?.inspection_items || []
  const totalItems = items.length
  const inspectedCount = items.filter(i => i.condition !== 'not_inspected').length

  // Summary counts
  const summary = { good: 0, fair: 0, needs_attention: 0, urgent: 0 }
  for (const item of items) {
    if (summary[item.condition] !== undefined) summary[item.condition]++
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const result = await inspections.create({ work_order_id: workOrderId, vehicle_id: vehicleId })
      queryClient.invalidateQueries({ queryKey: ['inspections'] })
      navigate(`/inspections/${result.inspection.id}`)
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handleSend = async () => {
    setSending(true)
    try {
      await inspections.update(inspection.id, { status: 'sent' })
      queryClient.invalidateQueries({ queryKey: ['inspections'] })
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] })
      toast({ title: 'Inspection sent to customer' })
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const handleAddToEstimate = async () => {
    const flaggedIds = items
      .filter(i => i.condition === 'needs_attention' || i.condition === 'urgent')
      .map(i => i.id)
    if (flaggedIds.length === 0) return
    setAddingToEstimate(true)
    try {
      await inspections.addToEstimate(inspection.id, flaggedIds)
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] })
      toast({ title: `${flaggedIds.length} item${flaggedIds.length > 1 ? 's' : ''} added to estimate` })
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setAddingToEstimate(false)
    }
  }

  if (isLoading) return null

  return (
    <div className="bg-white shadow-lg border-0 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-blue-400" />
          Vehicle Inspection
        </h3>
        {inspection && (
          <span className={cn(
            'text-xs px-2 py-0.5 rounded capitalize',
            inspection.status === 'completed' ? 'bg-emerald-100 text-emerald-700'
              : inspection.status === 'sent' ? 'bg-purple-100 text-purple-700'
              : 'bg-amber-100 text-amber-700'
          )}>
            {inspection.status === 'in_progress' ? 'In Progress' : inspection.status}
          </span>
        )}
      </div>

      <div className="p-4">
        {!inspection ? (
          <div className="text-center py-4">
            <p className="text-sm text-slate-400 mb-3">No inspection started yet</p>
            <Button
              onClick={handleCreate}
              disabled={creating || !vehicleId}
              size="sm"
              className="bg-slate-700 hover:bg-slate-800"
            >
              {creating ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Creating...</>
              ) : (
                <><ClipboardCheck className="h-3.5 w-3.5 mr-1.5" /> Start Inspection</>
              )}
            </Button>
            {!vehicleId && (
              <p className="text-xs text-red-500 mt-2">Vehicle required to start inspection</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Progress */}
            {inspection.status === 'in_progress' && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', inspectedCount === totalItems ? 'bg-emerald-500' : 'bg-blue-500')}
                    style={{ width: `${totalItems > 0 ? Math.round((inspectedCount / totalItems) * 100) : 0}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                  {inspectedCount}/{totalItems}
                </span>
              </div>
            )}

            {/* Summary badges (completed or sent) */}
            {(inspection.status === 'completed' || inspection.status === 'sent') && (
              <div className="flex flex-wrap gap-2">
                {summary.good > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                    <CheckCircle className="h-3 w-3" /> {summary.good} Good
                  </span>
                )}
                {summary.fair > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                    <AlertTriangle className="h-3 w-3" /> {summary.fair} Fair
                  </span>
                )}
                {summary.needs_attention > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-orange-50 text-orange-700">
                    <AlertCircleIcon className="h-3 w-3" /> {summary.needs_attention} Attention
                  </span>
                )}
                {summary.urgent > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-red-50 text-red-700">
                    <XCircle className="h-3 w-3" /> {summary.urgent} Urgent
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/inspections/${inspection.id}`)}
                className="text-xs h-8"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                {inspection.status === 'in_progress' ? 'Continue Inspection' : 'View Report'}
              </Button>

              {inspection.status === 'completed' && (
                <>
                  <Button
                    size="sm"
                    onClick={handleSend}
                    disabled={sending}
                    className="text-xs h-8 bg-teal-600 hover:bg-teal-700"
                  >
                    {sending ? 'Sending...' : (
                      <><Send className="h-3 w-3 mr-1" /> Send to Customer</>
                    )}
                  </Button>
                  {(summary.needs_attention + summary.urgent) > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddToEstimate}
                      disabled={addingToEstimate}
                      className="text-xs h-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    >
                      {addingToEstimate ? 'Adding...' : (
                        <><Plus className="h-3 w-3 mr-1" /> Add to Estimate</>
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Sent timestamp */}
            {inspection.status === 'sent' && inspection.sent_at && (
              <p className="text-xs text-slate-400">
                Sent {format(new Date(inspection.sent_at), 'MMM d, yyyy h:mm a')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function LineItemRow({ item, editable, onDelete, deleting }) {
  const Icon = ITEM_TYPE_ICONS[item.item_type] || Receipt

  return (
    <div className={cn("flex items-center gap-3 py-2 border-b border-slate-50 last:border-0 group", item.status === 'declined' && 'opacity-50')}>
      <div className="h-6 w-6 rounded bg-slate-50 flex items-center justify-center shrink-0">
        <Icon className="h-3 w-3 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm text-slate-700 truncate", item.status === 'declined' && 'line-through')}>{item.description}</p>
        <p className="text-xs text-slate-400">
          {item.quantity > 1 && `${item.quantity} x `}
          {formatCents(item.unit_price_cents)}
          {item.cost_cents > 0 && (
            <span className="ml-2 text-slate-300">
              Cost: {formatCents(item.cost_cents)}
              {' '}
              ({Math.round(((item.unit_price_cents - item.cost_cents) / item.cost_cents) * 100)}% margin)
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {item.status === 'declined' && (
          <span className="text-xs font-medium text-red-500 uppercase">Declined</span>
        )}
        <span
          className={cn(
            'text-sm font-medium',
            item.item_type === 'discount' ? 'text-red-600' : item.status === 'declined' ? 'text-slate-400 line-through' : 'text-slate-700'
          )}
        >
          {item.item_type === 'discount' ? '-' : ''}
          {formatCents(Math.abs(item.total_cents))}
        </span>
        {editable && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
