import { Router } from 'express';
import { supabase } from '../config/database.js';
import { nowEST, daysFromNowEST } from '../utils/timezone.js';
import { sendReminderSMS, sendServiceReminderSMS, sendReviewRequestSMS, sendCampaignSMS } from '../services/sms.js';
import { logger } from '../utils/logger.js';
import { format, subDays } from 'date-fns';

const router = Router();

const CRON_SECRET = process.env.CRON_SECRET;
const FORWARD_DAYS = 60;
const SLOT_START_HOUR = 7;
const SLOT_END_HOUR = 15;
const SLOT_INTERVAL = 30;
const CLEANUP_DAYS = 90;

function verifyCronAuth(req, res) {
  const auth = req.headers['authorization'];
  if (!CRON_SECRET) {
    logger.error('CRON_SECRET not set — rejecting cron request');
    res.status(401).json({ error: 'Cron not configured' });
    return false;
  }
  if (auth !== `Bearer ${CRON_SECRET}`) {
    res.status(401).json({ error: 'Invalid authorization' });
    return false;
  }
  return true;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function isWeekday(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function generateSlotTimes() {
  const times = [];
  for (let hour = SLOT_START_HOUR; hour <= SLOT_END_HOUR; hour++) {
    for (let min = 0; min < 60; min += SLOT_INTERVAL) {
      if (hour === SLOT_END_HOUR && min > 30) break;
      const start = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
      const endMin = min + SLOT_INTERVAL;
      const endHour = hour + Math.floor(endMin / 60);
      const endMinRem = endMin % 60;
      const end = `${String(endHour).padStart(2, '0')}:${String(endMinRem).padStart(2, '0')}:00`;
      times.push({ start, end });
    }
  }
  return times;
}

/**
 * GET /api/cron/regenerate-slots
 * Called by Vercel Cron weekly to maintain the 60-day slot window.
 * Requires CRON_SECRET in Authorization header.
 */
router.get('/regenerate-slots', async (req, res) => {
  if (!verifyCronAuth(req, res)) return;

  try {
    // Get active bays
    const { data: bays, error: bayError } = await supabase
      .from('service_bays')
      .select('id, name')
      .eq('is_active', true);

    if (bayError) throw bayError;

    // Find latest existing slot date
    const { data: latestSlot } = await supabase
      .from('time_slots')
      .select('slot_date')
      .order('slot_date', { ascending: false })
      .limit(1)
      .single();

    const today = nowEST();
    today.setHours(0, 0, 0, 0);
    const targetEnd = addDays(today, FORWARD_DAYS);
    const startFrom = latestSlot
      ? addDays(new Date(latestSlot.slot_date + 'T12:00:00'), 1)
      : today;

    const slotTimes = generateSlotTimes();
    let totalInserted = 0;
    let daysProcessed = 0;

    let current = new Date(startFrom);
    while (current <= targetEnd) {
      if (isWeekday(current)) {
        const dateStr = formatDate(current);
        const rows = [];

        for (const bay of bays) {
          for (const { start, end } of slotTimes) {
            rows.push({
              bay_id: bay.id,
              slot_date: dateStr,
              start_time: start,
              end_time: end,
              is_available: true
            });
          }
        }

        if (rows.length > 0) {
          const { error } = await supabase
            .from('time_slots')
            .upsert(rows, { onConflict: 'slot_date,start_time,bay_id', ignoreDuplicates: true });

          if (error) {
            logger.error('Cron: slot insert failed', { date: dateStr, error });
          } else {
            totalInserted += rows.length;
            daysProcessed++;
          }
        }
      }
      current = addDays(current, 1);
    }

    // Cleanup old available slots
    const cutoff = formatDate(addDays(today, -CLEANUP_DAYS));
    const { error: deleteError } = await supabase
      .from('time_slots')
      .delete()
      .lt('slot_date', cutoff)
      .eq('is_available', true);

    if (deleteError) {
      logger.error('Cron: slot cleanup failed', { error: deleteError });
    }

    res.json({
      success: true,
      bays: bays.length,
      days_processed: daysProcessed,
      slots_generated: totalInserted,
      range: {
        from: formatDate(startFrom),
        to: formatDate(targetEnd)
      },
      cleanup_cutoff: cutoff
    });

  } catch (err) {
    logger.error('Cron regenerate-slots failed', { error: err });
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/cron/send-reminders
 * Called by Vercel Cron daily at 9am EST to send 24-hour appointment reminders.
 * Requires CRON_SECRET in Authorization header.
 */
router.get('/send-reminders', async (req, res) => {
  if (!verifyCronAuth(req, res)) return;

  try {
    const tomorrowDate = daysFromNowEST(1);

    // Get appointments for tomorrow that haven't been reminded
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_date,
        scheduled_time,
        reminder_sent_at,
        customer:customers (
          id,
          first_name,
          phone
        ),
        vehicle:vehicles (
          year,
          make,
          model
        ),
        appointment_services (
          service_name
        )
      `)
      .eq('scheduled_date', tomorrowDate)
      .in('status', ['scheduled', 'confirmed'])
      .is('reminder_sent_at', null);

    if (error) throw error;

    if (!appointments || appointments.length === 0) {
      return res.json({ success: true, sent: 0, total: 0, date: tomorrowDate });
    }

    let sent = 0;
    let failed = 0;

    for (const apt of appointments) {
      if (!apt.customer?.phone) continue;

      const services = apt.appointment_services?.map(s => s.service_name).join(', ') || 'Service';
      const vehicleDescription = apt.vehicle
        ? `${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}`
        : null;

      try {
        const smsResult = await sendReminderSMS({
          customerPhone: apt.customer.phone,
          customerName: apt.customer.first_name,
          appointmentDate: apt.scheduled_date,
          appointmentTime: apt.scheduled_time,
          services,
          vehicleDescription,
          customerId: apt.customer.id,
          appointmentId: apt.id
        });

        if (smsResult.success) {
          await supabase
            .from('appointments')
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq('id', apt.id);
          sent++;
        } else {
          failed++;
        }
      } catch (_smsErr) {
        failed++;
      }
    }

    res.json({
      success: true,
      date: tomorrowDate,
      sent,
      failed,
      total: appointments.length
    });

  } catch (err) {
    logger.error('Cron send-reminders failed', { error: err });
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/cron/service-reminders
 * Called by Vercel Cron weekly (Mondays 10am EST) to send proactive service reminders
 * to customers with overdue maintenance services.
 * Requires CRON_SECRET in Authorization header.
 */
router.get('/service-reminders', async (req, res) => {
  if (!verifyCronAuth(req, res)) return;

  try {
    const today = nowEST();
    const todayStr = formatDate(today);
    const thirtyDaysAgo = format(subDays(today, 30), 'yyyy-MM-dd');

    // Find customers with services past their interval since last completion.
    // We query appointment_services joined with appointments that are completed,
    // along with the service definition for days_interval.
    const { data: completedServices, error: svcError } = await supabase
      .from('appointment_services')
      .select(`
        service_name,
        service_id,
        service:services (id, name, days_interval),
        appointment:appointments!inner (
          id,
          scheduled_date,
          status,
          customer_id,
          customer:customers (id, first_name, last_name, phone, marketing_opt_in),
          vehicle:vehicles (year, make, model)
        )
      `)
      .eq('appointment.status', 'completed')
      .not('service.days_interval', 'is', null);

    if (svcError) throw svcError;

    // Group by customer+service and find the latest completion date
    const customerServiceMap = new Map(); // key: `${customerId}:${serviceId}`
    for (const row of completedServices || []) {
      const customer = row.appointment?.customer;
      if (!customer?.phone || !customer.marketing_opt_in) continue;

      const serviceInterval = row.service?.days_interval;
      if (!serviceInterval) continue;

      const key = `${customer.id}:${row.service_id}`;
      const existing = customerServiceMap.get(key);
      if (!existing || row.appointment.scheduled_date > existing.lastDate) {
        customerServiceMap.set(key, {
          customerId: customer.id,
          customerPhone: customer.phone,
          customerName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
          serviceName: row.service.name || row.service_name,
          serviceId: row.service_id,
          daysInterval: serviceInterval,
          lastDate: row.appointment.scheduled_date,
          vehicleDescription: row.appointment.vehicle
            ? `${row.appointment.vehicle.year} ${row.appointment.vehicle.make} ${row.appointment.vehicle.model}`
            : null
        });
      }
    }

    // Filter to only overdue services
    const overdueEntries = [];
    for (const entry of customerServiceMap.values()) {
      const lastDate = new Date(entry.lastDate + 'T12:00:00');
      const daysSince = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= entry.daysInterval) {
        overdueEntries.push(entry);
      }
    }

    // Dedup: skip if customer received a service-reminder SMS in last 30 days
    const customerIds = [...new Set(overdueEntries.map(e => e.customerId))];
    let recentlyReminded = new Set();

    if (customerIds.length > 0) {
      const { data: recentSms } = await supabase
        .from('sms_logs')
        .select('customer_id')
        .eq('message_type', 'service_reminder')
        .in('customer_id', customerIds)
        .gte('created_at', `${thirtyDaysAgo}T00:00:00`);

      recentlyReminded = new Set((recentSms || []).map(s => s.customer_id));
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const entry of overdueEntries) {
      if (recentlyReminded.has(entry.customerId)) {
        skipped++;
        continue;
      }

      try {
        const result = await sendServiceReminderSMS({
          customerPhone: entry.customerPhone,
          customerName: entry.customerName,
          serviceName: entry.serviceName,
          vehicleDescription: entry.vehicleDescription,
          lastDate: entry.lastDate,
          customerId: entry.customerId
        });

        if (result.success) {
          sent++;
          // Mark this customer so we don't double-send within same batch
          recentlyReminded.add(entry.customerId);
        } else {
          failed++;
        }
      } catch (smsErr) {
        failed++;
        logger.error('Service reminder SMS failed', { customerId: entry.customerId, error: smsErr.message });
      }
    }

    res.json({
      success: true,
      date: todayStr,
      overdue_found: overdueEntries.length,
      sent,
      skipped,
      failed
    });

  } catch (err) {
    logger.error('Cron service-reminders failed', { error: err });
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/cron/send-review-requests
 * Called by Vercel Cron daily at 6pm EST (23:00 UTC) on weekdays.
 * Sends review requests to customers with completed appointments today.
 * Requires CRON_SECRET in Authorization header.
 */
router.get('/send-review-requests', async (req, res) => {
  if (!verifyCronAuth(req, res)) return;

  try {
    // Read review settings
    const { data: settingsRows } = await supabase
      .from('settings')
      .select('key, value')
      .like('key', 'review_%');

    const settingsMap = {};
    for (const row of settingsRows || []) settingsMap[row.key] = row.value;

    const autoSend = settingsMap.review_auto_send !== 'false';
    const googleUrl = settingsMap.review_google_url || '';
    const dedupDays = parseInt(settingsMap.review_dedup_days || '30', 10);

    if (!autoSend) {
      return res.json({ success: true, skipped_reason: 'auto_send disabled', sent: 0 });
    }

    if (!googleUrl) {
      return res.json({ success: true, skipped_reason: 'no google_url configured', sent: 0 });
    }

    const todayStr = formatDate(nowEST());

    // Get today's completed appointments with customer + vehicle
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_date,
        customer:customers (
          id,
          first_name,
          last_name,
          phone,
          marketing_opt_in
        ),
        vehicle:vehicles (
          year,
          make,
          model
        )
      `)
      .eq('scheduled_date', todayStr)
      .in('status', ['completed', 'invoiced', 'paid']);

    if (error) throw error;

    if (!appointments || appointments.length === 0) {
      return res.json({ success: true, sent: 0, total: 0, date: todayStr });
    }

    // Dedup: find customers who already got a review request recently
    const customerIds = [...new Set(appointments.map(a => a.customer?.id).filter(Boolean))];
    const dedupCutoff = new Date();
    dedupCutoff.setDate(dedupCutoff.getDate() - dedupDays);
    let recentlyRequested = new Set();

    if (customerIds.length > 0) {
      const { data: recentReqs } = await supabase
        .from('review_requests')
        .select('customer_id')
        .in('customer_id', customerIds)
        .in('status', ['sent', 'clicked', 'completed'])
        .gte('sent_at', dedupCutoff.toISOString());

      recentlyRequested = new Set((recentReqs || []).map(r => r.customer_id));
    }

    // Get sentiment for each customer from most recent call
    const sentimentMap = new Map();
    if (customerIds.length > 0) {
      const { data: callData } = await supabase
        .from('call_logs')
        .select('customer_id, sentiment, created_at')
        .in('customer_id', customerIds)
        .not('sentiment', 'is', null)
        .order('created_at', { ascending: false });

      for (const call of callData || []) {
        if (!sentimentMap.has(call.customer_id)) {
          sentimentMap.set(call.customer_id, call.sentiment);
        }
      }
    }

    const baseUrl = process.env.API_BASE_URL || `https://${req.get('host')}`;
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const apt of appointments) {
      const customer = apt.customer;
      if (!customer?.id) { skipped++; continue; }

      // Skip: no phone
      if (!customer.phone) {
        await supabase.from('review_requests').insert({
          customer_id: customer.id,
          appointment_id: apt.id,
          status: 'skipped',
          skip_reason: 'no_phone',
        });
        skipped++;
        continue;
      }

      // Skip: opted out
      if (customer.marketing_opt_in === false) {
        await supabase.from('review_requests').insert({
          customer_id: customer.id,
          appointment_id: apt.id,
          status: 'skipped',
          skip_reason: 'opted_out',
        });
        skipped++;
        continue;
      }

      // Skip: already sent within dedup window
      if (recentlyRequested.has(customer.id)) {
        await supabase.from('review_requests').insert({
          customer_id: customer.id,
          appointment_id: apt.id,
          status: 'skipped',
          skip_reason: 'already_sent',
        });
        skipped++;
        continue;
      }

      // Determine review type based on sentiment
      const sentiment = sentimentMap.get(customer.id);
      const reviewType = sentiment === 'negative' ? 'internal_feedback' : 'google';

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

      if (insertErr) {
        logger.error('Failed to create review request', { customerId: customer.id, error: insertErr });
        failed++;
        continue;
      }

      const trackingUrl = `${baseUrl}/api/reviews/click/${reviewReq.id}`;
      const vehicleDescription = apt.vehicle
        ? `${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}`
        : null;

      try {
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
          sent++;
          recentlyRequested.add(customer.id); // prevent double-send in same batch
        } else {
          await supabase
            .from('review_requests')
            .update({ status: 'failed' })
            .eq('id', reviewReq.id);
          failed++;
        }
      } catch (smsErr) {
        await supabase
          .from('review_requests')
          .update({ status: 'failed' })
          .eq('id', reviewReq.id);
        failed++;
        logger.error('Review request SMS failed', { customerId: customer.id, error: smsErr.message });
      }
    }

    res.json({
      success: true,
      date: todayStr,
      sent,
      skipped,
      failed,
      total: appointments.length,
    });

  } catch (err) {
    logger.error('Cron send-review-requests failed', { error: err });
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/cron/marketing-campaigns
 * Called by Vercel Cron daily at 10am EST (15:00 UTC) on weekdays.
 * Handles 3 auto-campaign types: welcome, follow_up, win_back.
 * Requires CRON_SECRET in Authorization header.
 */
router.get('/marketing-campaigns', async (req, res) => {
  if (!verifyCronAuth(req, res)) return;

  try {
    // Read settings
    const { data: settingsRows } = await supabase
      .from('settings')
      .select('key, value')
      .like('key', 'campaign_%');

    const cfg = {};
    for (const row of settingsRows || []) cfg[row.key] = row.value;

    const dedupDays = parseInt(cfg.campaign_dedup_days || '30', 10);
    const winBackDays = parseInt(cfg.campaign_win_back_days || '180', 10);

    const today = nowEST();
    const todayStr = formatDate(today);
    const dedupCutoff = new Date();
    dedupCutoff.setDate(dedupCutoff.getDate() - dedupDays);

    // Load auto-campaign templates
    const { data: autoCampaigns } = await supabase
      .from('campaigns')
      .select('id, campaign_type, message_template, status')
      .in('campaign_type', ['welcome', 'follow_up', 'win_back']);

    const campaignMap = {};
    for (const c of autoCampaigns || []) campaignMap[c.campaign_type] = c;

    const portalBase = process.env.PORTAL_BASE_URL || 'https://premierauto.ai';
    const results = {
      welcome: { sent: 0, skipped: 0, failed: 0 },
      follow_up: { sent: 0, skipped: 0, failed: 0 },
      win_back: { sent: 0, skipped: 0, failed: 0 },
    };

    // Helper: send a campaign message to one customer
    async function sendOne(type, customer, vehicleDescription) {
      const campaign = campaignMap[type];
      if (!campaign || campaign.status !== 'active') return;

      const portalUrl = customer.portal_token ? `${portalBase}/portal/${customer.portal_token}` : '';

      try {
        const result = await sendCampaignSMS({
          customerPhone: customer.phone,
          customerName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
          vehicleDescription,
          portalUrl,
          campaignType: type,
          messageTemplate: campaign.message_template,
          customerId: customer.id,
        });

        await supabase.from('campaign_sends').insert({
          campaign_id: campaign.id,
          customer_id: customer.id,
          status: result.success ? 'sent' : 'failed',
          skip_reason: result.success ? null : result.error,
        });

        if (result.success) {
          results[type].sent++;
          await supabase.from('campaigns')
            .update({ total_sent: campaign.total_sent + results[type].sent, updated_at: new Date().toISOString() })
            .eq('id', campaign.id);
        } else {
          results[type].failed++;
        }
      } catch (smsErr) {
        results[type].failed++;
        logger.error(`Campaign ${type} SMS failed`, { customerId: customer.id, error: smsErr.message });
      }
    }

    // ── WELCOME: first-time customers whose appointment completed yesterday ──
    if (cfg.campaign_welcome_enabled !== 'false' && campaignMap.welcome?.status === 'active') {
      const yesterdayStr = formatDate(addDays(today, -1));

      const { data: yesterdayApts } = await supabase
        .from('appointments')
        .select(`
          id,
          customer:customers!inner (id, first_name, last_name, phone, marketing_opt_in, portal_token, total_visits),
          vehicle:vehicles (year, make, model)
        `)
        .eq('scheduled_date', yesterdayStr)
        .in('status', ['completed', 'invoiced', 'paid']);

      // Filter to first-visit customers who opted in
      const welcomeTargets = (yesterdayApts || []).filter(
        a => a.customer?.marketing_opt_in && a.customer?.phone && a.customer?.total_visits <= 1
      );

      // Dedup
      const welcomeIds = welcomeTargets.map(a => a.customer.id);
      let welcomeDedup = new Set();
      if (welcomeIds.length > 0 && campaignMap.welcome) {
        const { data: recent } = await supabase
          .from('campaign_sends')
          .select('customer_id')
          .eq('campaign_id', campaignMap.welcome.id)
          .eq('status', 'sent')
          .in('customer_id', welcomeIds)
          .gte('sent_at', dedupCutoff.toISOString());
        welcomeDedup = new Set((recent || []).map(r => r.customer_id));
      }

      for (const apt of welcomeTargets) {
        if (welcomeDedup.has(apt.customer.id)) { results.welcome.skipped++; continue; }
        welcomeDedup.add(apt.customer.id);
        const veh = apt.vehicle ? `${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}` : null;
        await sendOne('welcome', apt.customer, veh);
      }
    }

    // ── FOLLOW-UP: appointments completed 3 days ago ──
    if (cfg.campaign_follow_up_enabled !== 'false' && campaignMap.follow_up?.status === 'active') {
      const threeDaysAgoStr = formatDate(addDays(today, -3));

      const { data: followUpApts } = await supabase
        .from('appointments')
        .select(`
          id,
          customer:customers!inner (id, first_name, last_name, phone, marketing_opt_in, portal_token),
          vehicle:vehicles (year, make, model)
        `)
        .eq('scheduled_date', threeDaysAgoStr)
        .in('status', ['completed', 'invoiced', 'paid']);

      const followUpTargets = (followUpApts || []).filter(
        a => a.customer?.marketing_opt_in && a.customer?.phone
      );

      // Dedup: campaign_sends + review_requests
      const followUpIds = followUpTargets.map(a => a.customer.id);
      let followUpDedup = new Set();
      if (followUpIds.length > 0) {
        if (campaignMap.follow_up) {
          const { data: recent } = await supabase
            .from('campaign_sends')
            .select('customer_id')
            .eq('campaign_id', campaignMap.follow_up.id)
            .eq('status', 'sent')
            .in('customer_id', followUpIds)
            .gte('sent_at', dedupCutoff.toISOString());
          followUpDedup = new Set((recent || []).map(r => r.customer_id));
        }

        // Also skip if customer already got a review request recently
        const { data: recentReviews } = await supabase
          .from('review_requests')
          .select('customer_id')
          .in('customer_id', followUpIds)
          .in('status', ['sent', 'clicked', 'completed'])
          .gte('sent_at', dedupCutoff.toISOString());
        for (const r of recentReviews || []) followUpDedup.add(r.customer_id);
      }

      const seenFollowUp = new Set();
      for (const apt of followUpTargets) {
        if (followUpDedup.has(apt.customer.id) || seenFollowUp.has(apt.customer.id)) {
          results.follow_up.skipped++;
          continue;
        }
        seenFollowUp.add(apt.customer.id);
        const veh = apt.vehicle ? `${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}` : null;
        await sendOne('follow_up', apt.customer, veh);
      }
    }

    // ── WIN-BACK: customers with no visit in win_back_days+ ──
    if (cfg.campaign_win_back_enabled !== 'false' && campaignMap.win_back?.status === 'active') {
      const cutoffDate = formatDate(addDays(today, -winBackDays));

      const { data: lapsedCustomers } = await supabase
        .from('customers')
        .select('id, first_name, last_name, phone, marketing_opt_in, portal_token')
        .eq('marketing_opt_in', true)
        .not('phone', 'is', null)
        .not('last_visit_date', 'is', null)
        .lt('last_visit_date', cutoffDate);

      // Dedup
      const lapsedIds = (lapsedCustomers || []).map(c => c.id);
      let winBackDedup = new Set();
      if (lapsedIds.length > 0 && campaignMap.win_back) {
        const { data: recent } = await supabase
          .from('campaign_sends')
          .select('customer_id')
          .eq('campaign_id', campaignMap.win_back.id)
          .eq('status', 'sent')
          .in('customer_id', lapsedIds)
          .gte('sent_at', dedupCutoff.toISOString());
        winBackDedup = new Set((recent || []).map(r => r.customer_id));
      }

      // Also skip if customer has upcoming appointment
      let upcomingCustomers = new Set();
      if (lapsedIds.length > 0) {
        const { data: upcoming } = await supabase
          .from('appointments')
          .select('customer_id')
          .in('customer_id', lapsedIds)
          .in('status', ['scheduled', 'confirmed'])
          .gte('scheduled_date', todayStr);
        upcomingCustomers = new Set((upcoming || []).map(a => a.customer_id));
      }

      // Get most recent vehicle per customer
      const vehicleMap = new Map();
      if (lapsedIds.length > 0) {
        const { data: vehicles } = await supabase
          .from('vehicles')
          .select('customer_id, year, make, model')
          .in('customer_id', lapsedIds)
          .order('created_at', { ascending: false });
        for (const v of vehicles || []) {
          if (!vehicleMap.has(v.customer_id)) {
            vehicleMap.set(v.customer_id, `${v.year} ${v.make} ${v.model}`);
          }
        }
      }

      for (const customer of lapsedCustomers || []) {
        if (winBackDedup.has(customer.id) || upcomingCustomers.has(customer.id)) {
          results.win_back.skipped++;
          continue;
        }
        await sendOne('win_back', customer, vehicleMap.get(customer.id) || null);
      }
    }

    res.json({ success: true, date: todayStr, results });

  } catch (err) {
    logger.error('Cron marketing-campaigns failed', { error: err });
    res.status(500).json({ error: err.message });
  }
});

export default router;
