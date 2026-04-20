// Backfill invoices for work orders already in 'invoiced' or 'paid' status
// before the auto-generation wiring shipped. Uses the same helper as the
// PATCH handler, so behavior is identical to a future mark-invoiced click.
// Idempotent — skips WOs that already have a linked invoice.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { generateInvoiceFromWorkOrder } from '../src/routes/invoices.js';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const { data: wos } = await s
  .from('work_orders')
  .select('id, work_order_number, status, updated_at')
  .in('status', ['invoiced', 'paid'])
  .order('updated_at', { ascending: true });

console.log(`Found ${wos.length} WO(s) in invoiced/paid status.\n`);

let generated = 0;
let skipped = 0;
let failed = 0;

for (const wo of wos) {
  try {
    const inv = await generateInvoiceFromWorkOrder(wo.id);
    if (inv.already_existed) {
      skipped++;
      console.log(`  SKIP  WO-${wo.work_order_number}  → already has ${inv.invoice_number}`);
    } else {
      generated++;
      const paidStatus = wo.status === 'paid';
      // If the WO is 'paid', mark the invoice paid too so dashboard reflects reality.
      if (paidStatus) {
        await s.from('invoices').update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', inv.id);
      }
      console.log(`  OK    WO-${wo.work_order_number}  → ${inv.invoice_number}  $${(inv.total_cents/100).toFixed(2)}${paidStatus ? '  (marked paid)' : ''}`);
    }
  } catch (err) {
    failed++;
    console.log(`  FAIL  WO-${wo.work_order_number}  → ${err.message}`);
  }
}

console.log(`\nGenerated: ${generated}   Skipped: ${skipped}   Failed: ${failed}`);
