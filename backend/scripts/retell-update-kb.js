// Sync local retell/kb-*.md files into the Retell knowledge base.
// Strategy: upload files that are referenced by the LLM's KB but aren't
// already in it, and refresh files that have changed locally. For now
// (simple case), we just add any local kb-*.md file whose filename isn't
// already a source in the KB. Run after editing any kb-*.md file.

import 'dotenv/config';
import { Retell } from 'retell-sdk';
import { readFileSync } from 'fs';
import { readdir } from 'fs/promises';
import path from 'path';

const KB_ID = process.env.RETELL_KNOWLEDGE_BASE_ID || 'knowledge_base_47a9b33761c1080a';
const client = new Retell({ apiKey: process.env.NUCLEUS_API_KEY || 'key_80e08bf8729fafff9a02258ee34f' });

const retellDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', 'retell');
const localFiles = (await readdir(retellDir)).filter(f => f.startsWith('kb-') && f.endsWith('.md'));

const kb = await client.knowledgeBase.retrieve(KB_ID);
const existingFilenames = new Set((kb.knowledge_base_sources || []).map(s => s.filename));

console.log(`KB: ${kb.knowledge_base_name}`);
console.log(`Already loaded (${existingFilenames.size}): ${[...existingFilenames].join(', ')}`);
console.log(`Local files (${localFiles.length}): ${localFiles.join(', ')}`);

const toAdd = localFiles.filter(f => !existingFilenames.has(f));
if (toAdd.length === 0) {
  console.log('Nothing to add. (To replace an existing file, delete the source in the Retell dashboard first.)');
  process.exit(0);
}

console.log(`\nAdding ${toAdd.length}: ${toAdd.join(', ')}`);
for (const fname of toAdd) {
  const content = readFileSync(path.join(retellDir, fname), 'utf8');
  const file = new File([content], fname, { type: 'text/markdown' });
  await client.knowledgeBase.addSources(KB_ID, {
    knowledge_base_files: [file],
  });
  console.log(`  OK ${fname}`);
}
console.log('\nDone. Retell will process new sources asynchronously (may take 30-60s to be retrievable).');
