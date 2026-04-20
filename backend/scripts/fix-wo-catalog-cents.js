// One-off: fix work_order_items that got saved with unit_price in DOLLARS
// where the DB expected CENTS. The "Choose from service catalog" flow
// populated unit_price_cents with services.price_min (dollars) directly,
// so $125 became 125¢. Multiply by 100 for affected rows and recompute
// parent work-order totals. Matching by service_id + unit_price_cents
// === Math.round(price_min) keeps manual-entry rows untouched.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { recalculateTotals } from '../src/routes/work-orders.js';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const { data: items } = await s
  .from('work_order_items')
  .select('id, work_order_id, service_id, description, quantity, unit_price_cents, total_cents')
  .not('service_id', 'is', null)
  .gt('unit_price_cents', 0);

const svcIds = [...new Set(items.map(i => i.service_id))];
const { data: svcs } = await s.from('services').select('id, price_min').in('id', svcIds);
const svcMap = Object.fromEntries(svcs.map(v => [v.id, v]));

const affected = items.filter(i => {
  const svc = svcMap[i.service_id];
  if (!svc || !svc.price_min) return false;
  return i.unit_price_cents === Math.round(parseFloat(svc.price_min));
});

console.log(`Scanned ${items.length} catalog-linked items, ${affected.length} match the bug pattern.`);

const affectedWOs = new Set();
for (const i of affected) {
  const fixedUnit = i.unit_price_cents * 100;
  const fixedTotal = Math.round(parseFloat(i.quantity) * fixedUnit);
  await s.from('work_order_items').update({
    unit_price_cents: fixedUnit,
    total_cents: fixedTotal,
  }).eq('id', i.id);
  affectedWOs.add(i.work_order_id);
  console.log(`  ${i.description}: ${i.unit_price_cents}¢ → ${fixedUnit}¢`);
}

console.log(`\nRecomputing totals for ${affectedWOs.size} work order(s)…`);
for (const woId of affectedWOs) {
  const t = await recalculateTotals(woId);
  console.log(`  ${woId.slice(0,8)}  subtotal ${t.subtotal_cents}¢  tax ${t.tax_cents}¢  total ${t.total_cents}¢`);
}

console.log('\nDone.');
