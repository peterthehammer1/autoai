import { Router } from 'express';
import { supabase } from '../config/database.js';
import { sendCampaignSMS } from '../services/sms.js';
import { BUSINESS } from '../config/business.js';
import { logger } from '../utils/logger.js';
import { isValidUUID, clampPagination, validationError } from '../middleware/validate.js';

const router = Router();

const VALID_TYPES = ['welcome', 'follow_up', 'win_back', 'seasonal'];
const VALID_STATUSES = ['active', 'paused', 'completed', 'draft'];
// ── Helper: read campaign_* settings ──
async function getCampaignSettings() {
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .like('key', 'campaign_%');
  const map = {};
  for (const row of data || []) map[row.key] = row.value;
  return {
    welcome_enabled: map.campaign_welcome_enabled !== 'false',
    follow_up_enabled: map.campaign_follow_up_enabled !== 'false',
    win_back_enabled: map.campaign_win_back_enabled !== 'false',
    dedup_days: parseInt(map.campaign_dedup_days || '30', 10),
    win_back_days: parseInt(map.campaign_win_back_days || '180', 10),
  };
}

// ── Helper: substitute template variables ──
function renderTemplate(template, vars) {
  return template
    .replace(/\{first_name\}/g, vars.first_name || 'there')
    .replace(/\{vehicle\}/g, vars.vehicle || 'vehicle')
    .replace(/\{portal_link\}/g, vars.portal_link || '')
    .replace(/\{business_name\}/g, BUSINESS.name)
    .replace(/\{business_phone\}/g, BUSINESS.phone)
    .replace(/\{agent_name\}/g, BUSINESS.agentName);
}

/**
 * GET / — List campaigns
 */
router.get('/', async (req, res) => {
  try {
    const { campaign_type, status } = req.query;
    const { limit, offset } = clampPagination(req.query.limit, req.query.offset);

    let query = supabase
      .from('campaigns')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (campaign_type && VALID_TYPES.includes(campaign_type)) {
      query = query.eq('campaign_type', campaign_type);
    }
    if (status && VALID_STATUSES.includes(status)) {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({
      campaigns: data,
      pagination: { total: count, limit, offset, has_more: offset + limit < count },
    });
  } catch (err) {
    logger.error('GET /campaigns failed', { error: err });
    res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * GET /stats — Aggregate campaign stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { count: totalSent } = await supabase
      .from('campaign_sends')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent');

    const { count: totalFailed } = await supabase
      .from('campaign_sends')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed');

    const { count: totalSkipped } = await supabase
      .from('campaign_sends')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'skipped');

    const { count: activeCampaigns } = await supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { count: sent30d } = await supabase
      .from('campaign_sends')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', thirtyDaysAgo.toISOString());

    const total = (totalSent || 0) + (totalFailed || 0);
    res.json({
      total_sent: totalSent || 0,
      total_failed: totalFailed || 0,
      total_skipped: totalSkipped || 0,
      active_campaigns: activeCampaigns || 0,
      delivery_rate: total > 0 ? (((totalSent || 0) / total) * 100).toFixed(1) : '100.0',
      sent_30d: sent30d || 0,
    });
  } catch (err) {
    logger.error('GET /campaigns/stats failed', { error: err });
    res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * GET /settings — Read campaign settings
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await getCampaignSettings();
    res.json(settings);
  } catch (err) {
    logger.error('GET /campaigns/settings failed', { error: err });
    res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * PUT /settings — Update campaign settings
 */
router.put('/settings', async (req, res) => {
  try {
    const { welcome_enabled, follow_up_enabled, win_back_enabled, dedup_days, win_back_days } = req.body;
    const now = new Date().toISOString();

    const updates = [];
    if (welcome_enabled !== undefined) updates.push({ key: 'campaign_welcome_enabled', value: String(welcome_enabled), updated_at: now });
    if (follow_up_enabled !== undefined) updates.push({ key: 'campaign_follow_up_enabled', value: String(follow_up_enabled), updated_at: now });
    if (win_back_enabled !== undefined) updates.push({ key: 'campaign_win_back_enabled', value: String(win_back_enabled), updated_at: now });
    if (dedup_days !== undefined) updates.push({ key: 'campaign_dedup_days', value: String(dedup_days), updated_at: now });
    if (win_back_days !== undefined) updates.push({ key: 'campaign_win_back_days', value: String(win_back_days), updated_at: now });

    if (updates.length > 0) {
      const { error } = await supabase
        .from('settings')
        .upsert(updates, { onConflict: 'key' });
      if (error) throw error;
    }

    const settings = await getCampaignSettings();
    res.json(settings);
  } catch (err) {
    logger.error('PUT /campaigns/settings failed', { error: err });
    res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * GET /:id — Single campaign with recent sends
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid campaign ID');

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !campaign) {
      return res.status(404).json({ error: { message: 'Campaign not found' } });
    }

    // Recent sends
    const { data: sends } = await supabase
      .from('campaign_sends')
      .select(`
        id, status, skip_reason, sent_at,
        customer:customers (id, first_name, last_name, phone)
      `)
      .eq('campaign_id', id)
      .order('sent_at', { ascending: false })
      .limit(50);

    res.json({ campaign, sends: sends || [] });
  } catch (err) {
    logger.error('GET /campaigns/:id failed', { error: err });
    res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * POST / — Create a new campaign (typically seasonal)
 */
router.post('/', async (req, res) => {
  try {
    const { name, campaign_type, message_template, audience_filter, scheduled_at } = req.body;

    if (!name || !name.trim()) return validationError(res, 'Name is required');
    if (!campaign_type || !VALID_TYPES.includes(campaign_type)) {
      return validationError(res, `campaign_type must be one of: ${VALID_TYPES.join(', ')}`);
    }
    if (!message_template || !message_template.trim()) {
      return validationError(res, 'message_template is required');
    }
    if (message_template.length > 480) {
      return validationError(res, 'message_template must be under 480 characters');
    }

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        name: name.trim(),
        campaign_type,
        status: 'draft',
        message_template: message_template.trim(),
        audience_filter: audience_filter || {},
        scheduled_at: scheduled_at || null,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ campaign });
  } catch (err) {
    logger.error('POST /campaigns failed', { error: err });
    res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * PATCH /:id — Update campaign
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid campaign ID');

    const allowed = ['name', 'status', 'message_template', 'audience_filter', 'scheduled_at'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.status && !VALID_STATUSES.includes(updates.status)) {
      return validationError(res, `status must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    if (updates.message_template && updates.message_template.length > 480) {
      return validationError(res, 'message_template must be under 480 characters');
    }

    if (Object.keys(updates).length === 0) {
      return validationError(res, 'No valid fields to update');
    }

    updates.updated_at = new Date().toISOString();

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!campaign) return res.status(404).json({ error: { message: 'Campaign not found' } });

    res.json({ campaign });
  } catch (err) {
    logger.error('PATCH /campaigns/:id failed', { error: err });
    res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * DELETE /:id — Delete campaign (seasonal only)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid campaign ID');

    // Don't allow deleting auto campaigns
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('campaign_type')
      .eq('id', id)
      .single();

    if (!campaign) return res.status(404).json({ error: { message: 'Campaign not found' } });
    if (['welcome', 'follow_up', 'win_back'].includes(campaign.campaign_type)) {
      return res.status(403).json({ error: { message: 'Cannot delete auto campaigns. Use pause instead.' } });
    }

    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    logger.error('DELETE /campaigns/:id failed', { error: err });
    res.status(500).json({ error: { message: err.message } });
  }
});

/**
 * POST /:id/send — Execute a campaign manually (seasonal or any)
 * Query: ?dry_run=true to get audience count without sending
 */
router.post('/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid campaign ID');
    const dryRun = req.query.dry_run === 'true';

    const { data: campaign, error: campErr } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (campErr || !campaign) {
      return res.status(404).json({ error: { message: 'Campaign not found' } });
    }

    // Build audience query
    let query = supabase
      .from('customers')
      .select('id, first_name, last_name, phone, marketing_opt_in, portal_token')
      .eq('marketing_opt_in', true)
      .not('phone', 'is', null);

    const filter = campaign.audience_filter || {};

    if (filter.min_visits) query = query.gte('total_visits', filter.min_visits);
    if (filter.last_visit_before) query = query.lt('last_visit_date', filter.last_visit_before);
    if (filter.last_visit_after) query = query.gt('last_visit_date', filter.last_visit_after);

    let { data: customers, error: custErr } = await query;
    if (custErr) throw custErr;
    customers = customers || [];

    // Tag filtering (requires separate join query)
    if (filter.tags && filter.tags.length > 0) {
      const { data: taggedRows } = await supabase
        .from('customer_tags')
        .select('customer_id')
        .in('tag_id', filter.tags);
      const taggedIds = new Set((taggedRows || []).map(r => r.customer_id));
      customers = customers.filter(c => taggedIds.has(c.id));
    }

    // Dedup: skip recently contacted
    const settings = await getCampaignSettings();
    const dedupCutoff = new Date();
    dedupCutoff.setDate(dedupCutoff.getDate() - settings.dedup_days);
    const customerIds = customers.map(c => c.id);

    let recentlyContacted = new Set();
    if (customerIds.length > 0) {
      const { data: recentSends } = await supabase
        .from('campaign_sends')
        .select('customer_id')
        .eq('campaign_id', id)
        .eq('status', 'sent')
        .gte('sent_at', dedupCutoff.toISOString());
      recentlyContacted = new Set((recentSends || []).map(s => s.customer_id));
    }

    const eligibleCustomers = customers.filter(c => !recentlyContacted.has(c.id));

    if (dryRun) {
      return res.json({
        dry_run: true,
        total_audience: customers.length,
        eligible: eligibleCustomers.length,
        deduped: customers.length - eligibleCustomers.length,
      });
    }

    // Execute sends
    const portalBase = process.env.PORTAL_BASE_URL || 'https://premierauto.ai';
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    // Get most recent vehicle per customer for template
    const vehicleMap = new Map();
    if (eligibleCustomers.length > 0) {
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, customer_id, year, make, model')
        .in('customer_id', eligibleCustomers.map(c => c.id))
        .order('created_at', { ascending: false });
      for (const v of vehicles || []) {
        if (!vehicleMap.has(v.customer_id)) {
          vehicleMap.set(v.customer_id, `${v.year} ${v.make} ${v.model}`);
        }
      }
    }

    for (const customer of eligibleCustomers) {
      if (!customer.phone) {
        await supabase.from('campaign_sends').insert({
          campaign_id: id,
          customer_id: customer.id,
          status: 'skipped',
          skip_reason: 'no_phone',
        });
        skipped++;
        continue;
      }

      const portalUrl = customer.portal_token ? `${portalBase}/portal/${customer.portal_token}` : '';
      const vehicleDescription = vehicleMap.get(customer.id) || null;

      try {
        const result = await sendCampaignSMS({
          customerPhone: customer.phone,
          customerName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
          vehicleDescription,
          portalUrl,
          campaignType: campaign.campaign_type,
          messageTemplate: campaign.message_template,
          customerId: customer.id,
        });

        await supabase.from('campaign_sends').insert({
          campaign_id: id,
          customer_id: customer.id,
          status: result.success ? 'sent' : 'failed',
          skip_reason: result.success ? null : result.error,
        });

        if (result.success) sent++;
        else failed++;
      } catch (smsErr) {
        await supabase.from('campaign_sends').insert({
          campaign_id: id,
          customer_id: customer.id,
          status: 'failed',
          skip_reason: smsErr.message,
        });
        failed++;
      }

      // Rate limiting: 100ms between sends
      if (eligibleCustomers.indexOf(customer) < eligibleCustomers.length - 1) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    // Update campaign stats
    await supabase
      .from('campaigns')
      .update({
        total_sent: campaign.total_sent + sent,
        total_failed: campaign.total_failed + failed,
        status: campaign.campaign_type === 'seasonal' ? 'completed' : campaign.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    res.json({ success: true, sent, failed, skipped, total: eligibleCustomers.length });
  } catch (err) {
    logger.error('POST /campaigns/:id/send failed', { error: err });
    res.status(500).json({ error: { message: err.message } });
  }
});

export { getCampaignSettings, renderTemplate };
export default router;
