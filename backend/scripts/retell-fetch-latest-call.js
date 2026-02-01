/**
 * Fetch the latest call from Retell API for your agent and save to retell/latest-call.json.
 * Run from project root: RETELL_API_KEY=your_key node backend/scripts/retell-fetch-latest-call.js
 * Or from backend: RETELL_API_KEY=your_key node scripts/retell-fetch-latest-call.js
 *
 * Then open retell/latest-call.json to review transcript, tool calls, and call_analysis.
 */

import 'dotenv/config';
import { Retell } from 'retell-sdk';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const configPath = path.join(projectRoot, 'retell/retell-config.json');
const outputPath = path.join(projectRoot, 'retell/latest-call.json');

const RETELL_API_KEY = process.env.RETELL_API_KEY;
if (!RETELL_API_KEY) {
  console.error('Set RETELL_API_KEY (e.g. RETELL_API_KEY=key_xxx node backend/scripts/retell-fetch-latest-call.js)');
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const agentId = config.agent_id;

const retell = new Retell({ apiKey: RETELL_API_KEY });

async function main() {
  // List recent calls for this agent (most recent first)
  const listBody = {
    filter_criteria: {
      agent_id: [agentId],
    },
    limit: 5,
    sort_order: 'descending',
  };
  const calls = await retell.call.list(listBody);
  if (!calls || calls.length === 0) {
    console.log('No calls found for agent', agentId);
    writeFileSync(outputPath, JSON.stringify({ error: 'No calls found', agent_id: agentId }, null, 2));
    return;
  }

  const latest = calls[0];
  const callId = latest.call_id;
  console.log('Latest call_id:', callId, '| started:', latest.start_timestamp ? new Date(latest.start_timestamp).toISOString() : 'n/a');

  // Get full call details (transcript, transcript_with_tool_calls, call_analysis)
  const fullCall = await retell.call.retrieve(callId);
  writeFileSync(outputPath, JSON.stringify(fullCall, null, 2), 'utf8');
  console.log('Written to retell/latest-call.json');
  console.log('Transcript length:', fullCall.transcript ? fullCall.transcript.length : 0);
  console.log('Tool calls in transcript_with_tool_calls:', Array.isArray(fullCall.transcript_with_tool_calls)
    ? fullCall.transcript_with_tool_calls.filter(u => u.role === 'tool_call_invocation').length
    : 0);
  if (fullCall.call_analysis) {
    console.log('Summary:', fullCall.call_analysis.call_summary ? fullCall.call_analysis.call_summary.slice(0, 80) + '...' : 'n/a');
    console.log('Sentiment:', fullCall.call_analysis.user_sentiment);
    console.log('Call successful:', fullCall.call_analysis.call_successful);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
