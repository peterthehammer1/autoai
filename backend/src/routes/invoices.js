// Invoicing routes — ported from DynastyAuto, adapted for Premier's Supabase
// JS client. Money is stored in integer cents to avoid float precision issues.
// Invoice numbers are "INV-YYMM-XXXX" with the sequence tracked in `settings`.
//
// Endpoints:
//   POST   /generate/:appointmentId      — create invoice from completed appt
//   GET    /                              — list with filters
//   GET    /:id                           — retrieve with line items
//   PATCH  /:id                           — update metadata (tax_rate, notes, due_date, etc.)
//   PATCH  /:id/status                    — send / mark paid / void
//   POST   /:id/line-items                — add line
//   PATCH  /:id/line-items/:itemId        — edit line
//   DELETE /:id/line-items/:itemId        — remove line
//
// Transactions: Supabase JS client has no multi-statement transactions outside
// RPCs. We sequence writes carefully and make `recalculateTotals` idempotent
// so partial failures heal on the next call.

import { Router } from 'express';
import { supabase } from '../config/database.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

async function nextInvoiceNumber() {
  const now = new Date();
  const prefix = `INV-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Read-modify-write on settings.next_invoice_number. Not atomic across
  // concurrent calls — if two invoices are generated at the exact same
  // millisecond the second one may reuse a number and hit the UNIQUE
  // constraint, at which point the caller should retry. Acceptable for
  // a single-shop backend; if we ever need true concurrency, move this
  // into a Postgres function using SELECT ... FOR UPDATE.
  const { data: row } = await supabase
    .from('settings').select('value').eq('key', 'next_invoice_number').single();
  const seq = parseInt(row?.value || '1', 10);
  await supabase
    .from('settings')
    .update({ value: String(seq + 1), updated_at: new Date().toISOString() })
    .eq('key', 'next_invoice_number');
  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

function formatAddress(c) {
  const parts = [c.address_line1, c.address_line2, c.city, c.province, c.postal_code].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

// Recompute subtotal / tax / total from current line items. Safe to call
// anytime — idempotent, writes derived state.
async function recalculateTotals(invoiceId) {
  const { data: lines } = await supabase
    .from('invoice_line_items')
    .select('line_total_cents, is_taxable')
    .eq('invoice_id', invoiceId);

  const subtotal = (lines || []).reduce((s, l) => s + (l.line_total_cents || 0), 0);
  const taxable = (lines || []).reduce((s, l) => s + (l.is_taxable ? (l.line_total_cents || 0) : 0), 0);

  const { data: inv } = await supabase
    .from('invoices').select('tax_rate, is_tax_exempt').eq('id', invoiceId).single();
  const rate = inv?.is_tax_exempt ? 0 : parseFloat(inv?.tax_rate || '0.13');
  const taxCents = Math.round(taxable * rate);
  const total = subtotal + taxCents;

  await supabase
    .from('invoices')
    .update({ subtotal_cents: subtotal, tax_cents: taxCents, total_cents: total, updated_at: new Date().toISOString() })
    .eq('id', invoiceId);

  return { subtotal_cents: subtotal, tax_cents: taxCents, total_cents: total };
}

// Price conversion: Premier's appointment_services.quoted_price is DECIMAL
// dollars; the invoice line items store cents.
function dollarsToCents(d) {
  if (d == null) return 0;
  return Math.round(parseFloat(d) * 100);
}

// ─── Generate Invoice from Completed Appointment ────────────────────────────

router.post('/generate/:appointmentId', async (req, res, next) => {
  try {
    const { appointmentId } = req.params;

    const { data: appt } = await supabase
      .from('appointments')
      .select(`
        id, status, customer_id, vehicle_id,
        customer:customers (id, first_name, last_name, phone, email,
          address_line1, address_line2, city, province, postal_code, is_tax_exempt),
        vehicle:vehicles (id, year, make, model, vin, mileage),
        appointment_services (service_name, quoted_price)
      `)
      .eq('id', appointmentId)
      .single();

    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    if (appt.status !== 'completed') {
      return res.status(400).json({ error: 'Appointment must be completed first' });
    }

    // Existing-invoice short-circuit so we don't double-invoice.
    const { data: existing } = await supabase
      .from('invoices').select('id, invoice_number').eq('appointment_id', appointmentId).maybeSingle();
    if (existing) {
      return res.status(409).json({
        error: 'Invoice already exists',
        invoice_id: existing.id,
        invoice_number: existing.invoice_number,
      });
    }

    const invoiceNumber = await nextInvoiceNumber();
    const c = appt.customer || {};
    const v = appt.vehicle || {};
    const customerName = [c.first_name, c.last_name].filter(Boolean).join(' ');
    const vehicleDesc = [v.year, v.make, v.model].filter(Boolean).join(' ') || null;

    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        appointment_id: appointmentId,
        customer_id: appt.customer_id,
        vehicle_id: appt.vehicle_id,
        customer_name: customerName,
        customer_phone: c.phone,
        customer_email: c.email,
        customer_address: formatAddress(c),
        vehicle_description: vehicleDesc,
        vehicle_vin: v.vin,
        vehicle_km: v.mileage,
        is_tax_exempt: c.is_tax_exempt || false,
      })
      .select('*')
      .single();

    if (invErr) {
      logger.error('invoice.create error', { error: invErr });
      return res.status(500).json({ error: invErr.message });
    }

    // Labor lines from appointment services.
    const services = appt.appointment_services || [];
    const laborRows = services.map((s, i) => ({
      invoice_id: inv.id,
      line_type: 'labor',
      sort_order: i,
      description: s.service_name || 'Service',
      quantity: 1,
      unit_price_cents: dollarsToCents(s.quoted_price),
      line_total_cents: dollarsToCents(s.quoted_price),
    }));
    if (laborRows.length > 0) {
      await supabase.from('invoice_line_items').insert(laborRows);
    }

    // Optional shop-supplies fee (% of labor subtotal). Skipped when pct=0.
    const { data: suppliesRow } = await supabase
      .from('settings').select('value').eq('key', 'shop_supplies_pct').maybeSingle();
    const suppliesPct = parseFloat(suppliesRow?.value || '0');
    if (suppliesPct > 0 && laborRows.length > 0) {
      const laborSubtotal = laborRows.reduce((s, r) => s + r.line_total_cents, 0);
      const suppliesCents = Math.round(laborSubtotal * suppliesPct / 100);
      await supabase.from('invoice_line_items').insert({
        invoice_id: inv.id,
        line_type: 'fee',
        sort_order: laborRows.length,
        description: `Shop Supplies (${suppliesPct}%)`,
        quantity: 1,
        unit_price_cents: suppliesCents,
        line_total_cents: suppliesCents,
        is_taxable: true,
      });
    }

    const totals = await recalculateTotals(inv.id);

    const { data: lineItems } = await supabase
      .from('invoice_line_items').select('*').eq('invoice_id', inv.id).order('sort_order');

    res.status(201).json({ ...inv, ...totals, line_items: lineItems || [] });
  } catch (err) {
    logger.error('generate invoice error', { error: err });
    next(err);
  }
});

// ─── List ───────────────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { status, customer_id, appointment_id, from, to } = req.query;
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);

    let q = supabase
      .from('invoices')
      .select('*, customer:customers(first_name, last_name, phone)')
      .order('invoice_date', { ascending: false })
      .limit(limit);
    if (status) q = q.eq('status', status);
    if (customer_id) q = q.eq('customer_id', customer_id);
    if (appointment_id) q = q.eq('appointment_id', appointment_id);
    if (from) q = q.gte('invoice_date', from);
    if (to) q = q.lte('invoice_date', to);

    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (err) { next(err); }
});

// ─── Retrieve (with line items) ─────────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const { data: inv, error } = await supabase
      .from('invoices')
      .select('*, customer:customers(*), vehicle:vehicles(*)')
      .eq('id', req.params.id)
      .single();
    if (error || !inv) return res.status(404).json({ error: 'Invoice not found' });

    const { data: lineItems } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', req.params.id)
      .order('sort_order');

    res.json({ ...inv, line_items: lineItems || [] });
  } catch (err) { next(err); }
});

// ─── Patch metadata ─────────────────────────────────────────────────────────

router.patch('/:id', async (req, res, next) => {
  try {
    const { tax_rate, is_tax_exempt, notes, internal_notes, due_date } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (tax_rate !== undefined) updates.tax_rate = tax_rate;
    if (is_tax_exempt !== undefined) updates.is_tax_exempt = is_tax_exempt;
    if (notes !== undefined) updates.notes = notes;
    if (internal_notes !== undefined) updates.internal_notes = internal_notes;
    if (due_date !== undefined) updates.due_date = due_date;

    // Block edits to finalized invoices
    const { data: current } = await supabase
      .from('invoices').select('status').eq('id', req.params.id).single();
    if (!current) return res.status(404).json({ error: 'Invoice not found' });
    if (current.status === 'void') {
      return res.status(400).json({ error: 'Voided invoices cannot be edited' });
    }

    const { error } = await supabase.from('invoices').update(updates).eq('id', req.params.id);
    if (error) throw error;

    // Tax-rate or exemption changes require totals recompute.
    if (tax_rate !== undefined || is_tax_exempt !== undefined) {
      await recalculateTotals(req.params.id);
    }

    const { data: refreshed } = await supabase.from('invoices').select('*').eq('id', req.params.id).single();
    res.json(refreshed);
  } catch (err) { next(err); }
});

// ─── Status transitions (send / paid / void) ───────────────────────────────

router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const valid = ['draft', 'sent', 'paid', 'void'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${valid.join(', ')}` });
    }

    const { data: current } = await supabase
      .from('invoices').select('status').eq('id', req.params.id).single();
    if (!current) return res.status(404).json({ error: 'Invoice not found' });

    const updates = { status, updated_at: new Date().toISOString() };
    const now = new Date().toISOString();
    if (status === 'sent' && !current.sent_at) updates.sent_at = now;
    if (status === 'paid') updates.paid_at = now;
    if (status === 'void') updates.voided_at = now;

    const { error } = await supabase.from('invoices').update(updates).eq('id', req.params.id);
    if (error) throw error;

    const { data: refreshed } = await supabase.from('invoices').select('*').eq('id', req.params.id).single();
    res.json(refreshed);
  } catch (err) { next(err); }
});

// ─── Line item CRUD ─────────────────────────────────────────────────────────

router.post('/:id/line-items', async (req, res, next) => {
  try {
    const { line_type, description, part_number, quantity, unit_price_cents, is_taxable, cost_cents } = req.body;

    // Block edits to finalized invoices
    const { data: inv } = await supabase
      .from('invoices').select('status').eq('id', req.params.id).single();
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    if (inv.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft invoices can be edited' });
    }

    const { count } = await supabase
      .from('invoice_line_items')
      .select('id', { count: 'exact', head: true })
      .eq('invoice_id', req.params.id);

    const qty = parseFloat(quantity || '1');
    const unit = parseInt(unit_price_cents || '0', 10);
    const lineTotal = Math.round(qty * unit);

    const { data: newLine, error } = await supabase
      .from('invoice_line_items')
      .insert({
        invoice_id: req.params.id,
        line_type,
        sort_order: count || 0,
        description,
        part_number: part_number || null,
        quantity: qty,
        unit_price_cents: unit,
        line_total_cents: lineTotal,
        cost_cents: cost_cents != null ? parseInt(cost_cents, 10) : null,
        is_taxable: is_taxable !== false,
      })
      .select('*')
      .single();
    if (error) throw error;

    await recalculateTotals(req.params.id);
    res.status(201).json(newLine);
  } catch (err) { next(err); }
});

router.patch('/:id/line-items/:itemId', async (req, res, next) => {
  try {
    const { data: inv } = await supabase
      .from('invoices').select('status').eq('id', req.params.id).single();
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    if (inv.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft invoices can be edited' });
    }

    const updates = {};
    const fields = ['line_type', 'description', 'part_number', 'quantity', 'unit_price_cents', 'cost_cents', 'is_taxable', 'sort_order'];
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];

    // If quantity or unit price changed, recompute line_total_cents.
    if ('quantity' in updates || 'unit_price_cents' in updates) {
      const { data: existing } = await supabase
        .from('invoice_line_items').select('quantity, unit_price_cents').eq('id', req.params.itemId).single();
      const q = parseFloat('quantity' in updates ? updates.quantity : existing.quantity);
      const u = parseInt('unit_price_cents' in updates ? updates.unit_price_cents : existing.unit_price_cents, 10);
      updates.line_total_cents = Math.round(q * u);
    }

    const { error } = await supabase
      .from('invoice_line_items').update(updates).eq('id', req.params.itemId).eq('invoice_id', req.params.id);
    if (error) throw error;

    await recalculateTotals(req.params.id);
    const { data: refreshed } = await supabase.from('invoice_line_items').select('*').eq('id', req.params.itemId).single();
    res.json(refreshed);
  } catch (err) { next(err); }
});

router.delete('/:id/line-items/:itemId', async (req, res, next) => {
  try {
    const { data: inv } = await supabase
      .from('invoices').select('status').eq('id', req.params.id).single();
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    if (inv.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft invoices can be edited' });
    }

    const { error } = await supabase
      .from('invoice_line_items').delete().eq('id', req.params.itemId).eq('invoice_id', req.params.id);
    if (error) throw error;

    await recalculateTotals(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
