import { Router } from 'express';
import { supabase } from '../config/database.js';
import { nowEST } from '../utils/timezone.js';
import { isValidPhone, isValidUUID, clampPagination, validationError } from '../middleware/validate.js';
import { sendSMS } from '../services/sms.js';

const router = Router();

/**
 * GET /api/sms-logs/conversations
 * Get SMS conversations grouped by phone number
 */
router.get('/conversations', async (req, res, next) => {
  try {
    const { limit: rawLimit, offset: rawOffset } = req.query;
    const { limit, offset } = clampPagination(rawLimit, rawOffset);

    // Fetch all SMS logs with customer info
    const { data: logs, error } = await supabase
      .from('sms_logs')
      .select(`
        id, to_phone, from_phone, message_body, message_type, status, created_at,
        customer:customers(id, first_name, last_name, phone)
      `)
      .neq('status', 'failed')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Group by phone number (to_phone for outbound, from_phone for inbound)
    const threads = new Map();
    for (const log of logs || []) {
      const phone = log.message_type === 'reply' ? log.from_phone : log.to_phone;
      if (!phone) continue;

      if (!threads.has(phone)) {
        threads.set(phone, {
          phone,
          customer: log.customer || null,
          latest_message: log.message_body,
          latest_type: log.message_type,
          message_count: 0,
          last_activity: log.created_at,
        });
      }
      threads.get(phone).message_count++;
    }

    const conversations = Array.from(threads.values())
      .sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity))
      .slice(offset, offset + limit);

    res.json({
      conversations,
      pagination: {
        total: threads.size,
        limit,
        offset,
        has_more: (offset + conversations.length) < threads.size,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sms-logs/thread/:phone
 * Get all messages for a specific phone number (thread view)
 */
router.get('/thread/:phone', async (req, res, next) => {
  try {
    const { phone } = req.params;
    if (!phone) return validationError(res, 'Phone number is required');

    const { limit, offset } = clampPagination(req.query.limit || 200, req.query.offset);

    // Find messages where this phone is either sender or recipient
    const { data: messages, error, count } = await supabase
      .from('sms_logs')
      .select(`
        id, to_phone, from_phone, message_body, message_type, status, created_at,
        customer:customers(id, first_name, last_name, phone),
        appointment:appointments(id, scheduled_date, scheduled_time)
      `, { count: 'exact' })
      .or(`to_phone.eq.${phone},from_phone.eq.${phone}`)
      .neq('status', 'failed')
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get customer info from first message that has it
    const customer = (messages || []).find(m => m.customer)?.customer || null;

    res.json({
      phone,
      customer,
      messages: messages || [],
      pagination: {
        total: count,
        limit,
        offset,
        has_more: (offset + (messages || []).length) < count,
      },
    });
  } catch (error) {
    next(error);
  }
});

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
 * POST /api/sms-logs/send
 * Send a custom SMS message
 */
router.post('/send', async (req, res, next) => {
  try {
    const { to, body, customer_id, appointment_id } = req.body;

    if (!to || !isValidPhone(to)) {
      return validationError(res, 'Valid phone number is required');
    }
    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      return validationError(res, 'Message body is required');
    }
    if (body.length > 1600) {
      return validationError(res, 'Message body must be 1600 characters or less');
    }
    if (customer_id && !isValidUUID(customer_id)) {
      return validationError(res, 'Invalid customer ID');
    }
    if (appointment_id && !isValidUUID(appointment_id)) {
      return validationError(res, 'Invalid appointment ID');
    }

    const result = await sendSMS(to, body.trim(), {
      messageType: 'custom',
      customerId: customer_id || null,
      appointmentId: appointment_id || null,
    });

    if (!result.success) {
      return res.status(502).json({ error: { message: result.error || 'Failed to send SMS' } });
    }

    res.status(201).json({ success: true, messageId: result.messageId });
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
