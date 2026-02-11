import { Router } from 'express';
import { supabase } from '../config/database.js';
import { nowEST } from '../utils/timezone.js';
import { clampPagination } from '../middleware/validate.js';

const router = Router();

/**
 * GET /api/sms-logs
 * Get SMS log history with optional filters
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      message_type,
      status,
      date_from,
      date_to
    } = req.query;
    const { limit, offset } = clampPagination(req.query.limit, req.query.offset);

    let query = supabase
      .from('sms_logs')
      .select(`
        *,
        customer:customers(
          id,
          first_name,
          last_name,
          phone
        ),
        appointment:appointments(
          id,
          scheduled_date,
          scheduled_time
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (message_type) {
      query = query.eq('message_type', message_type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (date_from) {
      query = query.gte('created_at', date_from);
    }

    if (date_to) {
      query = query.lte('created_at', date_to);
    }

    const { data: logs, error, count } = await query;

    if (error) throw error;

    res.json({
      logs,
      pagination: {
        total: count,
        limit,
        offset,
        has_more: (offset + logs.length) < count
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sms-logs/stats
 * Get SMS statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const { period = 'week' } = req.query;
    
    let dateFilter = nowEST();
    if (period === 'today') {
      dateFilter.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else if (period === 'month') {
      dateFilter.setMonth(dateFilter.getMonth() - 1);
    }

    const { data: logs, error } = await supabase
      .from('sms_logs')
      .select('message_type, status')
      .gte('created_at', dateFilter.toISOString());

    if (error) throw error;

    const stats = {
      total: logs.length,
      by_type: {
        confirmation: logs.filter(l => l.message_type === 'confirmation').length,
        reminder: logs.filter(l => l.message_type === 'reminder').length,
        custom: logs.filter(l => l.message_type === 'custom').length
      },
      by_status: {
        sent: logs.filter(l => l.status === 'sent').length,
        delivered: logs.filter(l => l.status === 'delivered').length,
        failed: logs.filter(l => l.status === 'failed').length,
        queued: logs.filter(l => l.status === 'queued').length
      }
    };

    res.json(stats);

  } catch (error) {
    next(error);
  }
});

export default router;
