/**
 * Update Retell agent, LLM (general_tools + URLs + prompt), and phone number inbound webhook
 * to match retell/retell-config.json and retell/agent-prompt-slim.md (backend www.alignedai.dev).
 *
 * Run from project root:
 *   NUCLEUS_API_KEY=your_key node backend/scripts/retell-update-agent.js
 *
 * Uses: agent_id, llm_id from retell-config.json; updates agent webhook_url,
 * LLM general_tools + general_prompt, and all phone numbers bound to this agent (inbound_webhook_url).
 */

import { Retell } from 'retell-sdk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const configPath = path.join(projectRoot, 'retell/retell-config.json');
const promptPath = path.join(projectRoot, 'retell/agent-prompt-slim.md');

const API_KEY = process.env.NUCLEUS_API_KEY || process.env.RETELL_API_KEY;
if (!API_KEY) {
  console.error('Set NUCLEUS_API_KEY or RETELL_API_KEY');
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const agentId = config.agent_id;
const llmId = config.llm_id;
const webhookBase = 'https://www.alignedai.dev/api/webhooks/voice';
const postCallUrl = `${webhookBase}`;
const inboundUrl = `${webhookBase}/inbound`;

const client = new Retell({ apiKey: API_KEY });

async function main() {
  console.log('Updating Retell agent and LLM from retell-config.json...\n');

  // 1. Update agent: post-call webhook URL
  try {
    await client.agent.update(agentId, {
      webhook_url: postCallUrl,
    });
    console.log('OK Agent webhook_url:', postCallUrl);
  } catch (e) {
    console.error('Failed to update agent:', e.message);
    throw e;
  }

  // 2. Update LLM: general_tools (all function URLs from config) and general_prompt
  const generalTools = config.general_tools;
  let prompt;
  try {
    prompt = readFileSync(promptPath, 'utf8');
  } catch (e) {
    console.warn('Could not read prompt file:', e.message);
  }

  const llmUpdate = {};
  if (generalTools && generalTools.length) {
    llmUpdate.general_tools = generalTools;
  }
  if (prompt) {
    llmUpdate.general_prompt = prompt;
  }

  if (Object.keys(llmUpdate).length > 0) {
    try {
      await client.llm.update(llmId, llmUpdate);
      console.log('OK LLM updated:');
      if (llmUpdate.general_tools) console.log('   - general_tools: %d tools', llmUpdate.general_tools.length);
      if (llmUpdate.general_prompt) console.log('   - general_prompt: %d chars from agent-prompt-slim.md', llmUpdate.general_prompt.length);
    } catch (e) {
      console.error('Failed to update LLM:', e.message);
      throw e;
    }
  } else {
    console.log('No LLM updates to apply.');
  }

  // 3. List phone numbers and set inbound webhook for those using this agent
  let list;
  try {
    list = await client.phoneNumber.list({});
  } catch (e) {
    console.error('Failed to list phone numbers:', e.message);
    throw e;
  }

  const numbers = list.phone_numbers || list || [];
  const ourNumbers = numbers.filter(
    (n) => n.inbound_agent_id === agentId || n.outbound_agent_id === agentId
  );
  if (ourNumbers.length === 0) {
    console.log('No phone numbers bound to this agent; skipping inbound webhook.');
  } else {
    for (const num of ourNumbers) {
      const phone = num.phone_number || num.phone_number_pretty?.replace(/\D/g, '');
      const e164 = phone.startsWith('+') ? phone : `+1${phone}`;
      try {
        await client.phoneNumber.update(e164, {
          inbound_webhook_url: inboundUrl,
        });
        console.log('OK Phone', num.phone_number_pretty || e164, 'inbound_webhook_url:', inboundUrl);
      } catch (e) {
        console.error('Failed to update phone', e164, e.message);
      }
    }
  }

  console.log('\nDone. Agent, LLM, and phone inbound webhook point to www.alignedai.dev.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
