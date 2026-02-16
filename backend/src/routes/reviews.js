import { Router } from 'express';
import { supabase } from '../config/database.js';
import { sendReviewRequestSMS } from '../services/sms.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ── Helper: read a setting from the settings table ──
// eslint-disable-next-line no-unused-vars
async function getSetting(key) {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single();
  return data?.value ?? null;
}

// ── Helper: read all review_* settings at once ──
async function getReviewSettings() {
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .like('key', 'review_%');
  const map = {};
  for (const row of data || []) map[row.key] = row.value;
  return {
    google_url: map.review_google_url || '',
    auto_send: map.review_auto_send !== 'false',
    delay_hours: parseInt(map.review_delay_hours || '0', 10),
    dedup_days: parseInt(map.review_dedup_days || '30', 10),
  };
}

/**
 * GET / — List review requests with pagination + filters
 */
router.get('/', async (req, res) => {
  try {
    const { status, customer_id, limit = 25, offset = 0 } = req.query;

    let query = supabase
      .from('review_requests')
      .select(`
        *,
        customer:customers (id, first_name, last_name, phone),
        appointment:appointments (id, scheduled_date, scheduled_time)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status && status !== 'all') query = query.eq('status', status);
    if (customer_id) query = query.eq('customer_id', customer_id);

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({
      review_requests: data,
      pagination: {
        total: count,
        limit: Number(limit),
        offset: Number(offset),
        has_more: Number(offset) + Number(limit) < count,
      },
    });
  } catch (err) {
    logger.error('GET /reviews failed', { error: err });
    res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * GET /stats — Aggregate stats for the dashboard KPI cards
 */
router.get('/stats', async (req, res) => {
  try {
    // Total sent
    const { count: totalSent } = await supabase
      .from('review_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['sent', 'clicked', 'completed']);

    // Total clicked
    const { count: totalClicked } = await supabase
      .from('review_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['clicked', 'completed']);

    // Total completed
    const { count: totalCompleted } = await supabase
      .from('review_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed');

    // 30-day sent count
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { count: sent30d } = await supabase
      .from('review_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['sent', 'clicked', 'completed'])
      .gte('sent_at', thirtyDaysAgo.toISOString());

    res.json({
      total_sent: totalSent || 0,
      total_clicked: totalClicked || 0,
      total_completed: totalCompleted || 0,
      click_rate: totalSent ? ((totalClicked / totalSent) * 100).toFixed(1) : '0.0',
      completion_rate: totalSent ? ((totalCompleted / totalSent) * 100).toFixed(1) : '0.0',
      sent_30d: sent30d || 0,
    });
  } catch (err) {
    logger.error('GET /reviews/stats failed', { error: err });
    res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * POST /send — Manually send a review request for a specific appointment
 */
router.post('/send', async (req, res) => {
  try {
    const { appointment_id } = req.body;
    if (!appointment_id) {
      return res.status(400).json({ error: { message: 'appointment_id required' } });
    }

    const settings = await getReviewSettings();

    // Get appointment with customer + vehicle
    const { data: apt, error: aptErr } = await supabase
      .from('appointments')
      .select(`
        id, scheduled_date, status,
        customer:customers (id, first_name, last_name, phone, marketing_opt_in),
        vehicle:vehicles (year, make, model)
      `)
      .eq('id', appointment_id)
      .single();

    if (aptErr || !apt) {
      return res.status(404).json({ error: { message: 'Appointment not found' } });
    }

    const customer = apt.customer;
    if (!customer?.phone) {
      return res.status(400).json({ error: { message: 'Customer has no phone number' } });
    }

    // Dedup check
    const dedupCutoff = new Date();
    dedupCutoff.setDate(dedupCutoff.getDate() - settings.dedup_days);
    const { count: recentCount } = await supabase
      .from('review_requests')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customer.id)
      .in('status', ['sent', 'clicked', 'completed'])
      .gte('sent_at', dedupCutoff.toISOString());

    if (recentCount > 0) {
      return res.status(409).json({ error: { message: `Customer was already sent a review request in the last ${settings.dedup_days} days` } });
    }

    // Determine sentiment from most recent call
    let reviewType = 'google';
    const { data: recentCall } = await supabase
      .from('call_logs')
      .select('sentiment')
      .eq('customer_id', customer.id)
      .not('sentiment', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (recentCall?.sentiment === 'negative') {
      reviewType = 'internal_feedback';
    }

    const googleUrl = settings.google_url;
    if (!googleUrl && reviewType === 'google') {
      return res.status(400).json({ error: { message: 'Google review URL not configured. Go to Reviews → Settings.' } });
    }

    // Create review_requests row
    const { data: reviewReq, error: insertErr } = await supabase
      .from('review_requests')
      .insert({
        customer_id: customer.id,
        appointment_id: apt.id,
        review_type: reviewType,
        review_url: reviewType === 'google' ? googleUrl : null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Build tracking URL
    const baseUrl = process.env.API_BASE_URL || `https://${req.get('host')}`;
    const trackingUrl = `${baseUrl}/api/reviews/click/${reviewReq.id}`;

    const vehicleDescription = apt.vehicle
      ? `${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}`
      : null;

    const smsResult = await sendReviewRequestSMS({
      customerPhone: customer.phone,
      customerName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
      vehicleDescription,
      reviewType,
      trackingUrl,
      customerId: customer.id,
      appointmentId: apt.id,
    });

    if (smsResult.success) {
      await supabase
        .from('review_requests')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', reviewReq.id);
    } else {
      await supabase
        .from('review_requests')
        .update({ status: 'failed' })
        .eq('id', reviewReq.id);
    }

    res.json({ success: true, review_request: { ...reviewReq, status: smsResult.success ? 'sent' : 'failed' } });
  } catch (err) {
    logger.error('POST /reviews/send failed', { error: err });
    res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * GET /settings — Read review settings
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await getReviewSettings();
    res.json(settings);
  } catch (err) {
    logger.error('GET /reviews/settings failed', { error: err });
    res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * PUT /settings — Update review settings
 */
router.put('/settings', async (req, res) => {
  try {
    const { google_url, auto_send, delay_hours, dedup_days } = req.body;
    const now = new Date().toISOString();

    const updates = [];
    if (google_url !== undefined) updates.push({ key: 'review_google_url', value: String(google_url), updated_at: now });
    if (auto_send !== undefined) updates.push({ key: 'review_auto_send', value: String(auto_send), updated_at: now });
    if (delay_hours !== undefined) updates.push({ key: 'review_delay_hours', value: String(delay_hours), updated_at: now });
    if (dedup_days !== undefined) updates.push({ key: 'review_dedup_days', value: String(dedup_days), updated_at: now });

    if (updates.length > 0) {
      const { error } = await supabase
        .from('settings')
        .upsert(updates, { onConflict: 'key' });
      if (error) throw error;
    }

    const settings = await getReviewSettings();
    res.json(settings);
  } catch (err) {
    logger.error('PUT /reviews/settings failed', { error: err });
    res.status(500).json({ error: { message: err.message } });
  }
});

// ── Public click-tracking router (no API key required) ──
export const clickRouter = Router();

/**
 * GET /click/:id — Record click and redirect to review URL
 */
clickRouter.get('/click/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: reviewReq, error } = await supabase
      .from('review_requests')
      .select('id, review_url, review_type, status')
      .eq('id', id)
      .single();

    if (error || !reviewReq) {
      return res.status(404).send('Review request not found');
    }

    // Only update if not already clicked/completed
    if (reviewReq.status === 'sent') {
      await supabase
        .from('review_requests')
        .update({ status: 'clicked', clicked_at: new Date().toISOString() })
        .eq('id', id);
    }

    // Redirect to Google review URL or a thank-you page for internal feedback
    const redirectUrl = reviewReq.review_url || 'https://premierautoservice.com';
    res.redirect(302, redirectUrl);
  } catch (err) {
    logger.error('GET /reviews/click/:id failed', { error: err });
    res.redirect(302, 'https://premierautoservice.com');
  }
});

export default router;
