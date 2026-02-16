import { Router } from 'express';
import crypto from 'node:crypto';
import { supabase } from '../config/database.js';
import { isValidUUID, validationError } from '../middleware/validate.js';
import { recalculateTotals } from './work-orders.js';
import { logger } from '../utils/logger.js';
import { BUSINESS } from '../config/business.js';

const router = Router();

// ── Token helpers ──

/**
 * Validate a portal token. Returns customer row or null.
 */
async function validatePortalToken(token) {
  if (!token || token.length !== 64) return null;

  const { data: customer, error } = await supabase
    .from('customers')
    .select('id, first_name, last_name, phone, email, portal_token_expires_at')
    .eq('portal_token', token)
    .single();

  if (error || !customer) return null;

  if (customer.portal_token_expires_at && new Date(customer.portal_token_expires_at) < new Date()) {
    return null;
  }

  return customer;
}

/**
 * Ensure a customer has a valid (non-expired) portal token.
 * Reuses existing token if still valid, otherwise generates a new one.
 * Returns the token string.
 */
export async function ensurePortalToken(customerId) {
  const { data: customer } = await supabase
    .from('customers')
    .select('portal_token, portal_token_expires_at')
    .eq('id', customerId)
    .single();

  if (
    customer?.portal_token &&
    customer.portal_token_expires_at &&
    new Date(customer.portal_token_expires_at) > new Date()
  ) {
    return customer.portal_token;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 6);

  await supabase
    .from('customers')
    .update({
      portal_token: token,
      portal_token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', customerId);

  return token;
}

/**
 * Build portal URL from a token.
 */
export function portalUrl(token) {
  const base = process.env.FRONTEND_URL || BUSINESS.url;
  return `${base}/portal/${token}`;
}

// ── Middleware: validate token on every public request ──

async function requireToken(req, res, next) {
  const customer = await validatePortalToken(req.params.token);
  if (!customer) {
    return res.status(401).json({ error: { message: 'Invalid or expired portal link' } });
  }
  req.portalCustomer = customer;
  next();
}

// ── Public endpoints (no API key — token-validated) ──

/**
 * GET /:token — Customer info + vehicles
 */
router.get('/:token', requireToken, async (req, res, next) => {
  try {
    const { id } = req.portalCustomer;

    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        id, first_name, last_name, phone, email,
        vehicles(id, year, make, model, color, license_plate, mileage)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ customer });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /:token/appointments — Current + recent appointments
 */
router.get('/:token/appointments', requireToken, async (req, res, next) => {
  try {
    const { id } = req.portalCustomer;

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id, status, scheduled_date, scheduled_time, quoted_total,
        customer_notes, loaner_requested, shuttle_requested, waiter,
        vehicle:vehicles(id, year, make, model, color),
        appointment_services(service_name, quoted_price, duration_minutes)
      `)
      .eq('customer_id', id)
      .is('deleted_at', null)
      .order('scheduled_date', { ascending: false })
      .limit(20);

    if (error) throw error;

    res.json({ appointments: appointments || [] });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /:token/work-orders — List work orders (customer-safe)
 */
router.get('/:token/work-orders', requireToken, async (req, res, next) => {
  try {
    const { id } = req.portalCustomer;

    const { data: workOrders, error } = await supabase
      .from('work_orders')
      .select(`
        id, work_order_number, status, notes,
        subtotal_cents, tax_cents, discount_cents, total_cents,
        authorization_method, authorized_at, authorized_by,
        created_at, updated_at,
        vehicle:vehicles(id, year, make, model),
        appointment:appointments(id, scheduled_date, scheduled_time)
      `)
      .eq('customer_id', id)
      .not('status', 'in', '("draft","void")')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const safe = (workOrders || []).map(wo => ({
      ...wo,
      work_order_display: `WO-${1000 + wo.work_order_number}`,
    }));

    res.json({ work_orders: safe });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /:token/work-orders/:id — WO detail (customer-safe, no cost_cents or internal_notes)
 */
router.get('/:token/work-orders/:id', requireToken, async (req, res, next) => {
  try {
    const customerId = req.portalCustomer.id;
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid work order ID');

    const { data: wo, error } = await supabase
      .from('work_orders')
      .select(`
        id, work_order_number, status, notes,
        subtotal_cents, tax_cents, discount_cents, total_cents,
        authorization_method, authorized_at, authorized_by,
        created_at, updated_at,
        vehicle:vehicles(id, year, make, model, color, license_plate),
        appointment:appointments(id, scheduled_date, scheduled_time, status),
        work_order_items(
          id, item_type, description, quantity,
          unit_price_cents, total_cents, status, sort_order
        )
      `)
      .eq('id', id)
      .eq('customer_id', customerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: { message: 'Work order not found' } });
      }
      throw error;
    }

    // Sort items by sort_order
    if (wo.work_order_items) {
      wo.work_order_items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    // Fetch payments
    const { data: payments } = await supabase
      .from('payments')
      .select('id, amount_cents, method, status, created_at')
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
 * POST /:token/work-orders/:id/approve — Approve/decline estimate items
 */
router.post('/:token/work-orders/:id/approve', requireToken, async (req, res, next) => {
  try {
    const customer = req.portalCustomer;
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid work order ID');

    // Fetch WO and verify ownership + approvable status
    const { data: wo, error: woErr } = await supabase
      .from('work_orders')
      .select('id, status, customer_id')
      .eq('id', id)
      .eq('customer_id', customer.id)
      .single();

    if (woErr || !wo) {
      return res.status(404).json({ error: { message: 'Work order not found' } });
    }

    if (!['estimated', 'sent_to_customer'].includes(wo.status)) {
      return res.status(400).json({ error: { message: 'This estimate is no longer pending approval' } });
    }

    const { items, approve_all } = req.body;

    if (approve_all) {
      // Approve all non-declined items
      await supabase
        .from('work_order_items')
        .update({ status: 'approved' })
        .eq('work_order_id', id)
        .neq('status', 'declined');
    } else if (Array.isArray(items) && items.length > 0) {
      // Update each item individually
      for (const item of items) {
        if (!item.id || !['approved', 'declined'].includes(item.status)) continue;
        await supabase
          .from('work_order_items')
          .update({ status: item.status })
          .eq('id', item.id)
          .eq('work_order_id', id);
      }
    } else {
      return validationError(res, 'Provide items array or approve_all: true');
    }

    // Update WO authorization fields + status
    const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    await supabase
      .from('work_orders')
      .update({
        status: 'approved',
        authorization_method: 'portal',
        authorized_at: new Date().toISOString(),
        authorized_by: customerName || 'Customer',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Recalculate totals (excludes declined items)
    await recalculateTotals(id);

    // Return updated WO
    const { data: updated } = await supabase
      .from('work_orders')
      .select(`
        id, work_order_number, status, notes,
        subtotal_cents, tax_cents, discount_cents, total_cents,
        authorization_method, authorized_at, authorized_by,
        work_order_items(
          id, item_type, description, quantity,
          unit_price_cents, total_cents, status, sort_order
        )
      `)
      .eq('id', id)
      .single();

    res.json({
      success: true,
      work_order: {
        ...updated,
        work_order_display: `WO-${1000 + updated.work_order_number}`,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── Protected: generate/refresh portal token (requires API key) ──

export async function generateToken(req, res, next) {
  try {
    const { customer_id, send_sms } = req.body;
    if (!customer_id || !isValidUUID(customer_id)) {
      return validationError(res, 'Valid customer_id is required');
    }

    // Verify customer exists
    const { data: customer, error } = await supabase
      .from('customers')
      .select('id, first_name, last_name, phone')
      .eq('id', customer_id)
      .single();

    if (error || !customer) {
      return res.status(404).json({ error: { message: 'Customer not found' } });
    }

    const token = await ensurePortalToken(customer_id);
    const url = portalUrl(token);

    // Optionally send SMS with portal link
    if (send_sms && customer.phone) {
      try {
        const { sendPortalLinkSMS } = await import('../services/sms.js');
        const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
        await sendPortalLinkSMS({
          customerPhone: customer.phone,
          customerName,
          portalUrl: url,
          messageContext: 'general',
          customerId: customer.id,
        });
      } catch (smsErr) {
        logger.error('Portal SMS send failed (non-blocking)', { error: smsErr });
      }
    }

    res.json({ token, portal_url: url });
  } catch (error) {
    next(error);
  }
}

export default router;
