/**
 * regenerate-slots.js
 *
 * Maintains a 60-day forward window of time slots for all active bays.
 * Generates Mon-Fri slots only, 7:00-15:30 (30-min intervals).
 * Uses INSERT ... ON CONFLICT DO NOTHING for idempotency.
 * Optionally cleans up slots older than 90 days.
 *
 * Usage: node scripts/regenerate-slots.js [--cleanup]
 */

import { createClient } from '@supabase/supabase-js';
import { toZonedTime } from 'date-fns-tz';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const FORWARD_DAYS = 60;
const CLEANUP_DAYS = 90;
const SLOT_START_HOUR = 7;   // 7:00 AM
const SLOT_END_HOUR = 15;    // last slot starts at 15:30
const SLOT_INTERVAL = 30;    // minutes

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

async function main() {
  const doCleanup = process.argv.includes('--cleanup');

  console.log('Fetching active service bays...');
  const { data: bays, error: bayError } = await supabase
    .from('service_bays')
    .select('id, name')
    .eq('is_active', true);

  if (bayError) {
    console.error('Error fetching bays:', bayError);
    process.exit(1);
  }

  console.log(`Found ${bays.length} active bays`);

  // Find latest existing slot date
  const { data: latestSlot } = await supabase
    .from('time_slots')
    .select('slot_date')
    .order('slot_date', { ascending: false })
    .limit(1)
    .single();

  const today = toZonedTime(new Date(), 'America/New_York');
  today.setHours(0, 0, 0, 0);
  const targetEnd = addDays(today, FORWARD_DAYS);
  const startFrom = latestSlot
    ? addDays(new Date(latestSlot.slot_date + 'T12:00:00'), 1)
    : today;

  console.log(`Latest slot: ${latestSlot?.slot_date || 'none'}`);
  console.log(`Generating from ${formatDate(startFrom)} to ${formatDate(targetEnd)}`);

  const slotTimes = generateSlotTimes();
  let totalInserted = 0;

  // Process in batches by date to avoid huge inserts
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
          console.error(`Error inserting slots for ${dateStr}:`, error.message);
        } else {
          totalInserted += rows.length;
          process.stdout.write(`  ${dateStr}: ${rows.length} slots\n`);
        }
      }
    }
    current = addDays(current, 1);
  }

  console.log(`\nGenerated ${totalInserted} total slot rows (duplicates ignored)`);

  // Optional cleanup of old slots
  if (doCleanup) {
    const cutoff = formatDate(addDays(today, -CLEANUP_DAYS));
    console.log(`\nCleaning up slots before ${cutoff}...`);

    const { error: deleteError, count } = await supabase
      .from('time_slots')
      .delete()
      .lt('slot_date', cutoff)
      .eq('is_available', true); // Only delete unused slots

    if (deleteError) {
      console.error('Cleanup error:', deleteError.message);
    } else {
      console.log(`Cleaned up old available slots before ${cutoff}`);
    }
  }

  console.log('Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
