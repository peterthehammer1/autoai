import { Router } from 'express';
import { supabase } from '../config/database.js';
import { nowEST } from '../utils/timezone.js';
import { isValidUUID, clampPagination, validationError } from '../middleware/validate.js';

const router = Router();

/**
 * GET /api/call-logs
 * List all call logs with optional filters
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      outcome,
      date_from,
      date_to,
      customer_id
    } = req.query;
    const { limit, offset } = clampPagination(req.query.limit, req.query.offset);

    let query = supabase
      .from('call_logs')
      .select(`
        *,
        customer:customers(
          id,
          first_name,
          last_name,
          phone,
          email
        ),
        appointment:appointments(
          id,
          scheduled_date,
          scheduled_time,
          status
        )
      `, { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (outcome) {
      query = query.eq('outcome', outcome);
    }
    if (date_from) {
      query = query.gte('started_at', date_from);
    }
    if (date_to) {
      query = query.lte('started_at', date_to);
    }
    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }

    const { data: calls, error, count } = await query;

    if (error) throw error;

    res.json({
      calls,
      pagination: {
        total: count,
        limit,
        offset,
        has_more: (offset + calls.length) < count
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/call-logs/:id
 * Get a single call log with full details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid call log ID');

    const { data: call, error } = await supabase
      .from('call_logs')
      .select(`
        *,
        customer:customers(
          id,
          first_name,
          last_name,
          phone,
          email,
          total_visits
        ),
        appointment:appointments(
          id,
          scheduled_date,
          scheduled_time,
          status,
          appointment_services(
            service_name,
            quoted_price
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: { message: 'Call log not found' } });
      }
      throw error;
    }

    res.json(call);

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/call-logs/stats/summary
 * Get call statistics
 */
router.get('/stats/summary', async (req, res, next) => {
  try {
    const { period = 'week' } = req.query;
    
    // Calculate date range
    const now = nowEST();
    let startDate;

    switch (period) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get all calls in period
    const { data: calls, error } = await supabase
      .from('call_logs')
      .select('*')
      .gte('started_at', startDate.toISOString());

    if (error) throw error;

    // Calculate stats
    const totalCalls = calls.length;
    const totalDuration = calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
    const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

    // Group by outcome
    const byOutcome = calls.reduce((acc, call) => {
      const outcome = call.outcome || 'unknown';
      acc[outcome] = (acc[outcome] || 0) + 1;
      return acc;
    }, {});

    // Group by sentiment
    const bySentiment = calls.reduce((acc, call) => {
      const sentiment = call.sentiment || 'neutral';
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {});

    // Peak hours
    const byHour = calls.reduce((acc, call) => {
      if (call.started_at) {
        const hour = new Date(call.started_at).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
      }
      return acc;
    }, {});

    const peakHours = Object.entries(byHour)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      summary: {
        total_calls: totalCalls,
        total_duration_seconds: totalDuration,
        avg_duration_seconds: avgDuration,
        by_outcome: byOutcome,
        by_sentiment: bySentiment
      },
      peak_hours: peakHours,
      period
    });

  } catch (error) {
    next(error);
  }
});

export default router;
