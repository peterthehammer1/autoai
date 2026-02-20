import { Router } from 'express';
import { supabase } from '../config/database.js';
import { isValidUUID, clampPagination, validationError } from '../middleware/validate.js';
import { logger } from '../utils/logger.js';
import { sendPaymentLinkSMS } from '../services/sms.js';

const router = Router();

const VALID_STATUSES = [
  'draft', 'estimated', 'sent_to_customer', 'approved',
  'in_progress', 'completed', 'invoiced', 'paid', 'void'
];

const VALID_ITEM_TYPES = ['labor', 'part', 'fee', 'sublet', 'discount'];
const VALID_PAYMENT_METHODS = ['cash', 'card', 'debit', 'check', 'e_transfer', 'online'];

/**
 * Recalculate work order totals from line items
 */
async function recalculateTotals(workOrderId) {
  const { data: items } = await supabase
    .from('work_order_items')
    .select('total_cents, item_type, status')
    .eq('work_order_id', workOrderId)
    .neq('status', 'declined');

  const subtotal = (items || []).reduce((sum, item) => {
    if (item.item_type === 'discount') return sum - Math.abs(item.total_cents);
    return sum + item.total_cents;
  }, 0);

  // Get current tax rate and discount
  const { data: wo } = await supabase
    .from('work_orders')
    .select('tax_rate, discount_cents')
    .eq('id', workOrderId)
    .single();

  const taxRate = wo?.tax_rate || 0.13;
  const discountCents = wo?.discount_cents || 0;
  const taxablAmount = Math.max(0, subtotal - discountCents);
  const taxCents = Math.round(taxablAmount * taxRate);
  const totalCents = taxablAmount + taxCents;

  const { data: updated, error } = await supabase
    .from('work_orders')
    .update({
      subtotal_cents: subtotal,
      tax_cents: taxCents,
      total_cents: totalCents,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workOrderId)
    .select('subtotal_cents, tax_cents, total_cents, discount_cents')
    .single();

  if (error) throw error;
  return updated;
}

/**
 * POST /api/work-orders
 * Create a new work order (optionally from an appointment)
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      appointment_id,
      customer_id,
      vehicle_id,
      notes,
      internal_notes,
      tax_rate,
    } = req.body;

    if (!customer_id || !isValidUUID(customer_id)) {
      return validationError(res, 'Valid customer_id is required');
    }
    if (appointment_id && !isValidUUID(appointment_id)) {
      return validationError(res, 'Invalid appointment_id');
    }
    if (vehicle_id && !isValidUUID(vehicle_id)) {
      return validationError(res, 'Invalid vehicle_id');
    }

    // Check if appointment already has a work order
    if (appointment_id) {
      const { data: existing } = await supabase
        .from('work_orders')
        .select('id, work_order_number')
        .eq('appointment_id', appointment_id)
        .neq('status', 'void')
        .single();

      if (existing) {
        return res.status(409).json({
          error: { message: `Appointment already has work order WO-${1000 + existing.work_order_number}` },
          work_order_id: existing.id,
        });
      }
    }

    const payload = {
      customer_id,
      appointment_id: appointment_id || null,
      vehicle_id: vehicle_id || null,
      notes: notes || null,
      internal_notes: internal_notes || null,
      status: 'draft',
    };
    if (tax_rate != null) payload.tax_rate = tax_rate;

    const { data: wo, error } = await supabase
      .from('work_orders')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;

    // If created from appointment, auto-populate line items from appointment services
    if (appointment_id) {
      const { data: aptServices } = await supabase
        .from('appointment_services')
        .select('service_id, service_name, quoted_price, duration_minutes')
        .eq('appointment_id', appointment_id);

      if (aptServices && aptServices.length > 0) {
        const items = aptServices.map((svc, idx) => ({
          work_order_id: wo.id,
          item_type: 'labor',
          service_id: svc.service_id,
          description: svc.service_name,
          quantity: 1,
          unit_price_cents: svc.quoted_price || 0,
          total_cents: svc.quoted_price || 0,
          sort_order: idx,
        }));

        await supabase.from('work_order_items').insert(items);
        await recalculateTotals(wo.id);
      }
    }

    // Re-fetch with full data
    const { data: fullWO } = await supabase
      .from('work_orders')
      .select(`
        *,
        customer:customers(id, first_name, last_name, phone, email),
        vehicle:vehicles(id, year, make, model, color, license_plate),
        work_order_items(*)
      `)
      .eq('id', wo.id)
      .single();

    res.status(201).json({
      work_order: {
        ...fullWO,
        work_order_display: `WO-${1000 + fullWO.work_order_number}`,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/work-orders
 * List work orders with filters
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, customer_id, start_date, end_date } = req.query;
    const { limit, offset } = clampPagination(req.query.limit, req.query.offset);

    let query = supabase
      .from('work_orders')
      .select(`
        *,
        customer:customers(id, first_name, last_name, phone),
        vehicle:vehicles(id, year, make, model),
        appointment:appointments(id, scheduled_date, scheduled_time)
      `, { count: 'exact' })
      .neq('status', 'void')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      const statuses = status.split(',');
      query = query.in('status', statuses);
    }

    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date + 'T23:59:59');
    }

    const { data: workOrders, error, count } = await query;
    if (error) throw error;

    // Add display number
    const enriched = (workOrders || []).map(wo => ({
      ...wo,
      work_order_display: `WO-${1000 + wo.work_order_number}`,
    }));

    res.json({
      work_orders: enriched,
      pagination: {
        total: count,
        limit,
        offset,
        has_more: (offset + (workOrders || []).length) < count,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/work-orders/:id
 * Full detail with items and payments
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid work order ID');

    const { data: wo, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        customer:customers(id, first_name, last_name, phone, email),
        vehicle:vehicles(id, year, make, model, color, license_plate, vin),
        appointment:appointments(id, scheduled_date, scheduled_time, status),
        work_order_items(
          *,
          service:services(id, name),
          technician:technicians(id, first_name, last_name)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: { message: 'Work order not found' } });
      }
      throw error;
    }

    // Fetch payments separately
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('work_order_id', id)
      .order('created_at', { ascending: false });

    const totalPaid = (payments || [])
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount_cents, 0);

    res.json({
      work_order: {
        ...wo,
        work_order_display: `WO-${1000 + wo.work_order_number}`,
        payments: payments || [],
        total_paid_cents: totalPaid,
        balance_due_cents: wo.total_cents - totalPaid,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/work-orders/:id
 * Update status, notes, discount, tax_rate
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid work order ID');

    const allowedFields = [
      'status', 'notes', 'internal_notes', 'discount_cents', 'discount_reason',
      'tax_rate', 'authorization_method', 'authorized_at', 'authorized_by',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.status && !VALID_STATUSES.includes(updates.status)) {
      return validationError(res, `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('work_orders')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    // Recalculate if discount or tax changed
    if (updates.discount_cents !== undefined || updates.tax_rate !== undefined) {
      await recalculateTotals(id);
    }

    // Re-fetch full data
    const { data: fullWO } = await supabase
      .from('work_orders')
      .select(`
        *,
        customer:customers(id, first_name, last_name, phone, email),
        vehicle:vehicles(id, year, make, model),
        work_order_items(*)
      `)
      .eq('id', id)
      .single();

    // Log status change to history
    if (updates.status) {
      try {
        await supabase.from('work_order_status_history').insert({
          work_order_id: id,
          status: updates.status,
          changed_by: req.body.changed_by || 'advisor',
        });
      } catch (histErr) {
        logger.error('Failed to log WO status history (non-blocking)', { error: histErr });
      }
    }

    // Auto-SMS on key status transitions
    const SMS_TRIGGERS = ['sent_to_customer', 'in_progress', 'completed', 'invoiced'];
    if (updates.status && SMS_TRIGGERS.includes(updates.status) && fullWO.customer?.phone) {
      try {
        const { ensurePortalToken, portalUrl } = await import('./portal.js');
        const { sendPortalLinkSMS } = await import('../services/sms.js');
        const token = await ensurePortalToken(fullWO.customer.id);
        const customerName = `${fullWO.customer.first_name || ''} ${fullWO.customer.last_name || ''}`.trim();
        const vehicleDesc = fullWO.vehicle
          ? `${fullWO.vehicle.year} ${fullWO.vehicle.make} ${fullWO.vehicle.model}`
          : null;

        // Map WO status to message context
        const contextMap = {
          sent_to_customer: 'estimate',
          in_progress: 'in_progress',
          completed: 'completed',
          invoiced: 'invoiced',
        };

        // For in_progress/completed/invoiced, link directly to the tracker
        const trackerStatuses = ['in_progress', 'completed', 'invoiced'];
        const baseUrl = await portalUrl(token);
        const url = trackerStatuses.includes(updates.status)
          ? `${baseUrl}/track/${id}`
          : baseUrl;

        await sendPortalLinkSMS({
          customerPhone: fullWO.customer.phone,
          customerName,
          portalUrl: url,
          messageContext: contextMap[updates.status],
          vehicleDescription: vehicleDesc,
          customerId: fullWO.customer.id,
          workOrderId: id,
        });
      } catch (smsErr) {
        logger.error(`Portal SMS failed on WO ${updates.status} (non-blocking)`, { error: smsErr });
      }
    }

    res.json({
      work_order: {
        ...fullWO,
        work_order_display: `WO-${1000 + fullWO.work_order_number}`,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/work-orders/:id/items
 * Add a line item
 */
router.post('/:id/items', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid work order ID');

    const { item_type, service_id, description, quantity, unit_price_cents, cost_cents, technician_id } = req.body;

    if (!item_type || !VALID_ITEM_TYPES.includes(item_type)) {
      return validationError(res, `item_type must be one of: ${VALID_ITEM_TYPES.join(', ')}`);
    }
    if (!description) {
      return validationError(res, 'description is required');
    }
    if (unit_price_cents == null) {
      return validationError(res, 'unit_price_cents is required');
    }

    const qty = quantity || 1;
    const totalCents = Math.round(qty * unit_price_cents);

    // Get next sort_order
    const { data: lastItem } = await supabase
      .from('work_order_items')
      .select('sort_order')
      .eq('work_order_id', id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (lastItem?.sort_order || 0) + 1;

    const { data: item, error } = await supabase
      .from('work_order_items')
      .insert({
        work_order_id: id,
        item_type,
        service_id: service_id || null,
        description,
        quantity: qty,
        unit_price_cents,
        cost_cents: cost_cents || 0,
        total_cents: totalCents,
        technician_id: technician_id || null,
        sort_order: sortOrder,
      })
      .select('*')
      .single();

    if (error) throw error;

    const totals = await recalculateTotals(id);

    res.status(201).json({ item, totals });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/work-orders/:id/items/:itemId
 * Update a line item
 */
router.patch('/:id/items/:itemId', async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    if (!isValidUUID(id) || !isValidUUID(itemId)) {
      return validationError(res, 'Invalid ID format');
    }

    const allowedFields = [
      'description', 'quantity', 'unit_price_cents', 'cost_cents',
      'item_type', 'status', 'technician_id', 'sort_order',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Recalculate line total if price or quantity changed
    if (updates.quantity !== undefined || updates.unit_price_cents !== undefined) {
      const { data: current } = await supabase
        .from('work_order_items')
        .select('quantity, unit_price_cents')
        .eq('id', itemId)
        .single();

      const qty = updates.quantity ?? current.quantity;
      const price = updates.unit_price_cents ?? current.unit_price_cents;
      updates.total_cents = Math.round(qty * price);
    }

    const { data: item, error } = await supabase
      .from('work_order_items')
      .update(updates)
      .eq('id', itemId)
      .eq('work_order_id', id)
      .select('*')
      .single();

    if (error) throw error;

    const totals = await recalculateTotals(id);

    res.json({ item, totals });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/work-orders/:id/items/:itemId
 * Remove a line item
 */
router.delete('/:id/items/:itemId', async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    if (!isValidUUID(id) || !isValidUUID(itemId)) {
      return validationError(res, 'Invalid ID format');
    }

    const { error } = await supabase
      .from('work_order_items')
      .delete()
      .eq('id', itemId)
      .eq('work_order_id', id);

    if (error) throw error;

    const totals = await recalculateTotals(id);

    res.json({ success: true, totals });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/work-orders/:id/recalculate
 * Force recalculate totals
 */
router.post('/:id/recalculate', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid work order ID');

    const totals = await recalculateTotals(id);
    res.json({ totals });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/work-orders/:id/payments
 * Record a payment
 */
router.post('/:id/payments', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid work order ID');

    const { amount_cents, method, reference_number, notes } = req.body;

    if (!amount_cents || amount_cents <= 0) {
      return validationError(res, 'amount_cents must be a positive number');
    }
    if (!method || !VALID_PAYMENT_METHODS.includes(method)) {
      return validationError(res, `method must be one of: ${VALID_PAYMENT_METHODS.join(', ')}`);
    }

    // Get work order customer_id
    const { data: wo } = await supabase
      .from('work_orders')
      .select('customer_id, total_cents, status')
      .eq('id', id)
      .single();

    if (!wo) {
      return res.status(404).json({ error: { message: 'Work order not found' } });
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        work_order_id: id,
        customer_id: wo.customer_id,
        amount_cents,
        method,
        reference_number: reference_number || null,
        notes: notes || null,
      })
      .select('*')
      .single();

    if (error) throw error;

    // Check if fully paid — get all completed payments
    const { data: allPayments } = await supabase
      .from('payments')
      .select('amount_cents')
      .eq('work_order_id', id)
      .eq('status', 'completed');

    const totalPaid = (allPayments || []).reduce((sum, p) => sum + p.amount_cents, 0);

    // Auto-update status to 'paid' if balance is covered
    if (totalPaid >= wo.total_cents && wo.status !== 'paid') {
      await supabase
        .from('work_orders')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', id);
    }

    res.status(201).json({
      payment,
      total_paid_cents: totalPaid,
      balance_due_cents: wo.total_cents - totalPaid,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/work-orders/:id/payments
 * List payments for a work order
 */
router.get('/:id/payments', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid work order ID');

    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('work_order_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalPaid = (payments || [])
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount_cents, 0);

    res.json({ payments: payments || [], total_paid_cents: totalPaid });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/work-orders/:id/send-payment-link
 * Send SMS with portal payment link to customer
 */
router.post('/:id/send-payment-link', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid work order ID');

    const { data: wo, error: woErr } = await supabase
      .from('work_orders')
      .select(`
        id, work_order_number, total_cents, status,
        customer:customers (id, first_name, last_name, phone),
        vehicle:vehicles (year, make, model)
      `)
      .eq('id', id)
      .single();

    if (woErr || !wo) return res.status(404).json({ error: { message: 'Work order not found' } });
    if (!wo.customer?.phone) return validationError(res, 'Customer has no phone number');

    // Get balance
    const { data: payments } = await supabase
      .from('payments')
      .select('amount_cents')
      .eq('work_order_id', id)
      .eq('status', 'completed');
    const totalPaid = (payments || []).reduce((sum, p) => sum + p.amount_cents, 0);
    const balanceDue = wo.total_cents - totalPaid;

    if (balanceDue <= 0) return validationError(res, 'No balance due on this work order');

    // Ensure portal token (dynamic import to avoid circular dependency)
    const { ensurePortalToken, portalUrl: getPortalUrl } = await import('./portal.js');
    const token = await ensurePortalToken(wo.customer.id);
    const baseUrl = await getPortalUrl(token);
    const portalUrl = `${baseUrl}/track/${id}`;

    const vehicleDescription = wo.vehicle
      ? `${wo.vehicle.year} ${wo.vehicle.make} ${wo.vehicle.model}`
      : null;

    const result = await sendPaymentLinkSMS({
      customerPhone: wo.customer.phone,
      customerName: `${wo.customer.first_name || ''} ${wo.customer.last_name || ''}`.trim(),
      vehicleDescription,
      portalUrl,
      balanceCents: balanceDue,
      customerId: wo.customer.id,
      workOrderId: id,
    });

    if (!result.success) {
      return res.status(500).json({ error: { message: result.error || 'Failed to send SMS' } });
    }

    res.json({ success: true, message_id: result.messageId });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/work-orders/:id/time-entries
 * All time entries for a work order
 */
router.get('/:id/time-entries', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid work order ID');

    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        technician:technicians(id, first_name, last_name)
      `)
      .eq('work_order_id', id)
      .order('clock_in', { ascending: true });

    if (error) throw error;

    const totalMinutes = (data || [])
      .filter(e => e.duration_minutes)
      .reduce((sum, e) => sum + e.duration_minutes, 0);

    res.json({ time_entries: data || [], total_minutes: totalMinutes });
  } catch (error) {
    next(error);
  }
});

export { recalculateTotals };
export default router;
