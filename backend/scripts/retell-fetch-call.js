import 'dotenv/config';
import { Retell } from 'retell-sdk';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const RETELL_API_KEY = process.env.NUCLEUS_API_KEY || process.env.RETELL_API_KEY;
const callId = process.argv[2];
if (!RETELL_API_KEY || !callId) {
  console.error('Usage: NUCLEUS_API_KEY=... node retell-fetch-call.js <call_id>');
  process.exit(1);
}

const retell = new Retell({ apiKey: RETELL_API_KEY });
const full = await retell.call.retrieve(callId);
const outPath = path.join(projectRoot, `retell/call-${callId}.json`);
writeFileSync(outPath, JSON.stringify(full, null, 2));
console.log('Saved to', outPath);
