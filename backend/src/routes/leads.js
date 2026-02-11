import { Router } from 'express';
import { supabase } from '../config/database.js';
import { isValidEmail, clampPagination, validationError } from '../middleware/validate.js';

export default function createLeadsRouter(requireApiKey) {
  const router = Router();

/**
 * POST /api/leads
 * Public — submit a lead from the landing page
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !name.trim()) {
      return validationError(res, 'Name is required');
    }
    if (!email || !isValidEmail(email)) {
      return validationError(res, 'A valid email is required');
    }

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ lead: { id: lead.id } });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/leads
 * Protected — list leads for the dashboard
 */
router.get('/', requireApiKey, async (req, res, next) => {
  try {
    const { status } = req.query;
    const { limit, offset } = clampPagination(req.query.limit, req.query.offset);

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: leads, error, count } = await query;

    if (error) throw error;

    res.json({
      leads,
      pagination: {
        total: count,
        limit,
        offset,
        has_more: (offset + leads.length) < count,
      },
    });
  } catch (error) {
    next(error);
  }
});

  return router;
}
