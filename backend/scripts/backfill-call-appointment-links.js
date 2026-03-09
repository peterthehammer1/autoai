/**
 * Backfill call_logs ↔ appointments links
 *
 * Matches call_logs to appointments by:
 * 1. Customer phone number (normalized)
 * 2. Appointment created during the call window (between call start and end + 2 min buffer)
 * 3. Appointment created by ai_agent
 * 4. Appointment not already linked to a different call
 *
 * Run: cd backend && node scripts/backfill-call-appointment-links.js
 *
 * Add --dry-run to preview without making changes:
 *   node scripts/backfill-call-appointment-links.js --dry-run
 */

import { supabase, normalizePhone } from '../src/config/database.js';

const DRY_RUN = process.argv.includes('--dry-run');

async function backfill() {
  console.log(DRY_RUN ? '=== DRY RUN — no changes will be made ===' : '=== BACKFILL: Linking call_logs ↔ appointments ===');

  // Get all call_logs that don't have an appointment_id linked
  const { data: calls, error: callError } = await supabase
    .from('call_logs')
    .select('id, retell_call_id, phone_normalized, started_at, ended_at, outcome, appointment_id')
    .is('appointment_id', null)
    .not('phone_normalized', 'is', null)
    .order('started_at', { ascending: false });

  if (callError) {
    console.error('Error fetching call_logs:', callError);
    process.exit(1);
  }

  console.log(`Found ${calls.length} unlinked call logs\n`);

  let linked = 0;
  let skipped = 0;
  const claimedAppointments = new Set(); // Track appointments already matched this run

  for (const call of calls) {
    // Find appointments created by ai_agent for this phone during the call window
    const callStart = call.started_at;
    // Use ended_at + 2min buffer, or started_at + 15min if call hasn't ended
    const endTime = call.ended_at
      ? new Date(new Date(call.ended_at).getTime() + 2 * 60 * 1000).toISOString()
      : new Date(new Date(call.started_at).getTime() + 15 * 60 * 1000).toISOString();

    const { data: appointments } = await supabase
      .from('appointments')
      .select(`
        id, call_id, created_at, scheduled_date, scheduled_time,
        customer:customers(phone_normalized),
        appointment_services(service_name)
      `)
      .eq('created_by', 'ai_agent')
      .gte('created_at', callStart)
      .lte('created_at', endTime)
      .is('deleted_at', null);

    if (!appointments || appointments.length === 0) {
      continue;
    }

    // Filter to appointments matching this caller's phone, not already claimed
    const matching = appointments.filter(a =>
      a.customer?.phone_normalized === call.phone_normalized &&
      !claimedAppointments.has(a.id)
    );

    if (matching.length === 0) {
      continue;
    }

    if (matching.length > 1) {
      console.log(`  ⚠ Multiple matches for call ${call.retell_call_id} (${call.phone_normalized}) — skipping`);
      skipped++;
      continue;
    }

    const appt = matching[0];
    const services = appt.appointment_services?.map(s => s.service_name).join(', ') || 'unknown';

    if (appt.call_id && appt.call_id !== call.retell_call_id) {
      console.log(`  ⚠ Appointment ${appt.id} already linked to different call — skipping`);
      skipped++;
      continue;
    }

    console.log(`  ✓ ${call.phone_normalized} | call ${call.retell_call_id?.slice(0, 12)}... → appt ${appt.id.slice(0, 8)}... (${services} on ${appt.scheduled_date})`);
    claimedAppointments.add(appt.id);

    if (!DRY_RUN) {
      // Update appointment with call_id
      await supabase
        .from('appointments')
        .update({ call_id: call.retell_call_id })
        .eq('id', appt.id);

      // Update call_log with appointment_id and outcome
      await supabase
        .from('call_logs')
        .update({
          appointment_id: appt.id,
          outcome: 'booked',
          customer_id: (await supabase
            .from('appointments')
            .select('customer_id')
            .eq('id', appt.id)
            .single()
          ).data?.customer_id || null
        })
        .eq('id', call.id);
    }

    linked++;
  }

  console.log(`\n${DRY_RUN ? 'Would link' : 'Linked'}: ${linked} call↔appointment pairs`);
  if (skipped > 0) console.log(`Skipped: ${skipped} (ambiguous or already linked)`);
  console.log('Done.');
}

backfill().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
