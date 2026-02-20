import { Router } from 'express';
import { supabase } from '../config/database.js';
import { isValidUUID, isValidDate, validationError, clampPagination } from '../middleware/validate.js';
import { logger } from '../utils/logger.js';

const router = Router();

const VALID_ENTRY_TYPES = ['labor', 'break', 'training', 'idle'];

/**
 * GET /api/technicians
 * List active technicians
 */
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('technicians')
      .select('id, first_name, last_name, skill_level, hourly_rate')
      .eq('is_active', true)
      .order('first_name');

    if (error) throw error;
    res.json({ technicians: data || [] });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/technicians/efficiency-summary
 * All techs' billed vs actual hours for a period
 */
router.get('/efficiency-summary', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    // Default to current week
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    const startStr = start_date || weekStart.toISOString().split('T')[0];
    const endDate = end_date || now.toISOString().split('T')[0];

    // Get all active techs
    const { data: techs } = await supabase
      .from('technicians')
      .select('id, first_name, last_name, skill_level, hourly_rate')
      .eq('is_active', true)
      .order('first_name');

    // Get all time entries in range
    const { data: entries } = await supabase
      .from('time_entries')
      .select('technician_id, duration_minutes, work_order_id, entry_type')
      .gte('clock_in', `${startStr}T00:00:00`)
      .lte('clock_in', `${endDate}T23:59:59`)
      .not('clock_out', 'is', null)
      .eq('entry_type', 'labor');

    // Get billed hours from WO items for those WOs
    const woIds = [...new Set((entries || []).map(e => e.work_order_id).filter(Boolean))];
    let billedByTech = {};

    if (woIds.length > 0) {
      const { data: woItems } = await supabase
        .from('work_order_items')
        .select('technician_id, quantity, item_type')
        .in('work_order_id', woIds)
        .eq('item_type', 'labor')
        .not('technician_id', 'is', null);

      for (const item of woItems || []) {
        billedByTech[item.technician_id] = (billedByTech[item.technician_id] || 0) + (parseFloat(item.quantity) || 0);
      }
    }

    // Aggregate time entries by tech
    const actualByTech = {};
    for (const entry of entries || []) {
      actualByTech[entry.technician_id] = (actualByTech[entry.technician_id] || 0) + (entry.duration_minutes || 0);
    }

    const summary = (techs || []).map(tech => {
      const actualMinutes = actualByTech[tech.id] || 0;
      const billedHours = billedByTech[tech.id] || 0;
      const billedMinutes = billedHours * 60;
      const efficiencyPct = actualMinutes > 0 ? Math.round((billedMinutes / actualMinutes) * 100) : null;

      return {
        technician_id: tech.id,
        name: `${tech.first_name} ${tech.last_name}`,
        skill_level: tech.skill_level,
        hourly_rate: tech.hourly_rate,
        actual_minutes: Math.round(actualMinutes),
        billed_minutes: Math.round(billedMinutes),
        efficiency_pct: efficiencyPct,
      };
    });

    res.json({ summary, period: { start: startStr, end: endDate } });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/technicians/:id/active-entry
 * Get the currently open clock-in entry for a tech
 */
router.get('/:id/active-entry', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid technician ID');

    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        work_order:work_orders(id, work_order_number, status,
          vehicle:vehicles(year, make, model),
          customer:customers(first_name, last_name)
        )
      `)
      .eq('technician_id', id)
      .is('clock_out', null)
      .maybeSingle();

    if (error) throw error;
    res.json({ entry: data || null });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/technicians/:id/clock-in
 */
router.post('/:id/clock-in', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid technician ID');

    const { work_order_id, entry_type = 'labor', notes } = req.body;

    if (work_order_id && !isValidUUID(work_order_id)) {
      return validationError(res, 'Invalid work order ID');
    }
    if (!VALID_ENTRY_TYPES.includes(entry_type)) {
      return validationError(res, 'Invalid entry type');
    }

    // Check for existing open entry
    const { data: existing } = await supabase
      .from('time_entries')
      .select('id')
      .eq('technician_id', id)
      .is('clock_out', null)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: { message: 'Already clocked in — clock out first' } });
    }

    const row = {
      technician_id: id,
      clock_in: new Date().toISOString(),
      entry_type,
    };
    if (work_order_id) row.work_order_id = work_order_id;
    if (notes) row.notes = notes;

    const { data, error } = await supabase
      .from('time_entries')
      .insert(row)
      .select('*')
      .single();

    if (error) throw error;

    logger.info('Tech clocked in', { technician_id: id, entry_id: data.id, work_order_id });
    res.status(201).json({ entry: data });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/technicians/:id/clock-out
 */
router.post('/:id/clock-out', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid technician ID');

    const { entry_id, notes } = req.body;
    if (!entry_id || !isValidUUID(entry_id)) {
      return validationError(res, 'entry_id is required');
    }

    // Find the entry
    const { data: entry } = await supabase
      .from('time_entries')
      .select('*')
      .eq('id', entry_id)
      .eq('technician_id', id)
      .single();

    if (!entry) {
      return res.status(404).json({ error: { message: 'Time entry not found' } });
    }
    if (entry.clock_out) {
      return res.status(409).json({ error: { message: 'Entry already clocked out' } });
    }

    const updates = { clock_out: new Date().toISOString() };
    if (notes) updates.notes = notes;

    const { data: updated, error } = await supabase
      .from('time_entries')
      .update(updates)
      .eq('id', entry_id)
      .select('*')
      .single();

    if (error) throw error;

    logger.info('Tech clocked out', { technician_id: id, entry_id, duration_minutes: updated.duration_minutes });
    res.json({ entry: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/technicians/:id/time-entries
 * List time entries for a tech with optional date filters
 */
router.get('/:id/time-entries', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid technician ID');

    const { start_date, end_date, limit: rawLimit, offset: rawOffset } = req.query;
    const { limit, offset } = clampPagination(rawLimit, rawOffset);

    let query = supabase
      .from('time_entries')
      .select(`
        *,
        work_order:work_orders(id, work_order_number,
          vehicle:vehicles(year, make, model),
          customer:customers(first_name, last_name)
        )
      `, { count: 'exact' })
      .eq('technician_id', id)
      .order('clock_in', { ascending: false })
      .range(offset, offset + limit - 1);

    if (start_date && isValidDate(start_date)) {
      query = query.gte('clock_in', `${start_date}T00:00:00`);
    }
    if (end_date && isValidDate(end_date)) {
      query = query.lte('clock_in', `${end_date}T23:59:59`);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({ time_entries: data || [], total: count || 0 });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/technicians/:id/efficiency
 * Billed vs actual hours for a single tech
 */
router.get('/:id/efficiency', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid technician ID');

    const { start_date, end_date } = req.query;
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const startStr = start_date || weekStart.toISOString().split('T')[0];
    const endStr = end_date || now.toISOString().split('T')[0];

    // Get completed time entries
    const { data: entries } = await supabase
      .from('time_entries')
      .select('duration_minutes, work_order_id')
      .eq('technician_id', id)
      .eq('entry_type', 'labor')
      .not('clock_out', 'is', null)
      .gte('clock_in', `${startStr}T00:00:00`)
      .lte('clock_in', `${endStr}T23:59:59`);

    const actualMinutes = (entries || []).reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    const woIds = [...new Set((entries || []).map(e => e.work_order_id).filter(Boolean))];

    let billedMinutes = 0;
    if (woIds.length > 0) {
      const { data: woItems } = await supabase
        .from('work_order_items')
        .select('quantity')
        .in('work_order_id', woIds)
        .eq('item_type', 'labor')
        .eq('technician_id', id);

      billedMinutes = (woItems || []).reduce((sum, i) => sum + (parseFloat(i.quantity) || 0), 0) * 60;
    }

    const efficiencyPct = actualMinutes > 0 ? Math.round((billedMinutes / actualMinutes) * 100) : null;

    res.json({
      actual_minutes: Math.round(actualMinutes),
      billed_minutes: Math.round(billedMinutes),
      efficiency_pct: efficiencyPct,
      entries_count: (entries || []).length,
      work_orders_count: woIds.length,
      period: { start: startStr, end: endStr },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
