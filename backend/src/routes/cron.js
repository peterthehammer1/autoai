import { Router } from 'express';
import { supabase } from '../config/database.js';

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
    console.error('CRON_SECRET not set — rejecting cron request');
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

    const today = new Date();
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
            console.error(`Cron: error inserting slots for ${dateStr}:`, error.message);
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
      console.error('Cron: cleanup error:', deleteError.message);
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
    console.error('Cron regenerate-slots error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
