import 'dotenv/config';
import { Retell } from 'retell-sdk';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const configPath = path.join(projectRoot, 'retell/retell-config.json');
const outputDir = path.join(projectRoot, 'retell');

const RETELL_API_KEY = process.env.NUCLEUS_API_KEY || process.env.RETELL_API_KEY;
if (!RETELL_API_KEY) {
  console.error('Set NUCLEUS_API_KEY');
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const agentId = config.agent_id;
const retell = new Retell({ apiKey: RETELL_API_KEY });

const calls = await retell.call.list({
  filter_criteria: { agent_id: [agentId] },
  limit: 20,
  sort_order: 'descending',
});

console.log(`Found ${calls.length} recent calls for agent ${agentId}`);
console.log('---');
for (const c of calls) {
  const start = c.start_timestamp ? new Date(c.start_timestamp).toISOString() : 'n/a';
  const dur = c.duration_ms ? `${Math.round(c.duration_ms / 1000)}s` : 'n/a';
  const summary = c.call_analysis?.call_summary?.slice(0, 80) || '';
  console.log(`${start} | ${dur} | ${c.call_id} | ${summary}`);
}

writeFileSync(path.join(outputDir, 'calls-list.json'), JSON.stringify(calls, null, 2));
