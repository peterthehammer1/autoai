/**
 * Update Retell/Nucleus chat agent LLM with tools and prompt for SMS/website chat.
 * 
 * Run from project root:
 *   NUCLEUS_API_KEY=your_key node backend/scripts/retell-update-chat-agent.js
 */

import { Retell } from 'retell-sdk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const configPath = path.join(projectRoot, 'retell/chat-agent-config.json');
const promptPath = path.join(projectRoot, 'retell/chat-agent-prompt.md');

const API_KEY = process.env.NUCLEUS_API_KEY || process.env.RETELL_API_KEY;
if (!API_KEY) {
  console.error('Set NUCLEUS_API_KEY or RETELL_API_KEY');
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const agentId = config.agent_id;
const llmId = config.llm_id;

const client = new Retell({ apiKey: API_KEY });

async function main() {
  console.log('Updating Chat Agent from chat-agent-config.json...\n');
  console.log('Agent ID:', agentId);
  console.log('LLM ID:', llmId);

  // Read prompt
  let prompt;
  try {
    prompt = readFileSync(promptPath, 'utf8');
    console.log('Prompt loaded:', prompt.length, 'chars');
  } catch (e) {
    console.error('Could not read prompt file:', e.message);
    process.exit(1);
  }

  // Update LLM with tools and prompt
  const generalTools = config.general_tools;
  
  const llmUpdate = {
    general_tools: generalTools,
    general_prompt: prompt,
  };

  try {
    await client.llm.update(llmId, llmUpdate);
    console.log('\nOK LLM updated:');
    console.log('   - general_tools:', generalTools.length, 'tools');
    console.log('   - general_prompt:', prompt.length, 'chars');
  } catch (e) {
    console.error('Failed to update LLM:', e.message);
    throw e;
  }

  // Try to publish the agent
  try {
    await client.agent.publish(agentId);
    console.log('OK Agent published');
  } catch (e) {
    console.warn('Could not publish agent:', e.message);
  }

  console.log('\nDone! Chat agent updated with SMS/chat configuration.');
  console.log('\nTools configured:');
  generalTools.forEach((tool, i) => {
    console.log(`  ${i + 1}. ${tool.name}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
