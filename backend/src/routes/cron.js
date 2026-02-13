import { Router } from 'express';
import { supabase } from '../config/database.js';
import { nowEST, daysFromNowEST } from '../utils/timezone.js';
import { sendReminderSMS, sendServiceReminderSMS } from '../services/sms.js';
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
      } catch (smsErr) {
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

export default router;
