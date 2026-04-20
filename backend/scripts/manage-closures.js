// Manage shop_closures — list, add, remove.
//
// Usage:
//   node scripts/manage-closures.js list
//   node scripts/manage-closures.js add 2026-12-25 "Christmas Day" [--spoken "closed for Christmas"]
//   node scripts/manage-closures.js remove 2026-12-25

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const [, , cmd, ...rest] = process.argv;

async function list() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await s
    .from('shop_closures')
    .select('closure_date, reason, spoken_reason, created_at')
    .gte('closure_date', today)
    .order('closure_date');
  if (error) { console.error(error.message); process.exit(1); }
  if (!data || data.length === 0) { console.log('No upcoming closures.'); return; }
  console.log(`${data.length} upcoming closure${data.length === 1 ? '' : 's'}:`);
  data.forEach(r => {
    console.log(`  ${r.closure_date}  ${r.reason}${r.spoken_reason ? `  (spoken: ${r.spoken_reason})` : ''}`);
  });
}

async function add() {
  const date = rest[0];
  const spokenIdx = rest.indexOf('--spoken');
  const reason = spokenIdx > 0 ? rest.slice(1, spokenIdx).join(' ') : rest.slice(1).join(' ');
  const spoken_reason = spokenIdx > 0 ? rest.slice(spokenIdx + 1).join(' ') : null;
  if (!date || !reason) {
    console.error('Usage: manage-closures.js add YYYY-MM-DD "Reason" [--spoken "spoken reason"]');
    process.exit(1);
  }
  const { data, error } = await s
    .from('shop_closures')
    .insert({ closure_date: date, reason, spoken_reason })
    .select()
    .single();
  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Added: ${data.closure_date}  ${data.reason}`);
}

async function remove() {
  const date = rest[0];
  if (!date) { console.error('Usage: manage-closures.js remove YYYY-MM-DD'); process.exit(1); }
  const { error } = await s.from('shop_closures').delete().eq('closure_date', date);
  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Removed closure on ${date}`);
}

const handlers = { list, add, remove };
const handler = handlers[cmd];
if (!handler) {
  console.error(`Usage: ${Object.keys(handlers).map(c => `\n  manage-closures.js ${c} ...`).join('')}`);
  process.exit(1);
}
await handler();
