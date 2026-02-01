# Retell AI – Docs & MCP Reference

Deep dive into Retell documentation and your MCP setup. Use this with [Retell Docs](https://docs.retellai.com/general/introduction) and the [full index](https://docs.retellai.com/llms.txt).

---

## 1. Retell MCP in Cursor – Status & Setup

### Current setup (already installed)

Your Cursor MCP config (`.cursor/mcp.json`) has **Retell MCP** configured:

- **Server name:** `retellai`
- **Package:** `@abhaybabbar/retellai-mcp-server` (community MCP server for Retell AI)
- **Command:** `npx -y @abhaybabbar/retellai-mcp-server`
- **Env:** `RETELL_API_KEY` set
- **Status:** `disabled: false`

This MCP gives Cursor (and Composer) **tools to talk to Retell’s API**: manage agents, calls, phone numbers, voices, LLMs, etc. It does **not** change how your voice agent (Amber) runs calls; it’s for **you** to manage Retell from the IDE.

### If Retell MCP is missing or broken

1. **Re-add in Cursor**
   - **Cursor Settings** → **Features** → **MCP** → **+ Add New MCP Server**
   - **Name:** e.g. `retellai`
   - **Command:** `npx`
   - **Args:** `-y`, `@abhaybabbar/retellai-mcp-server`
   - **Env:** `RETELL_API_KEY` = your Retell API key (with webhook permission if you use webhooks)

2. **Alternative: Composio**
   - One-command add: `npx @composio/cli add cursor --app retellai`
   - See [Composio Retell](https://mcp.composio.dev/retellai) and [Retell blog – MCP](https://www.retellai.com/blog/connect-any-ai-voice-agent-to-mcp-with-retell-ai-mcp-node).

### Retell “MCP” in two different senses

| Context | Meaning | Where |
|--------|--------|--------|
| **Cursor MCP (your setup)** | MCP server that exposes Retell **API** to Cursor (agents, calls, numbers, etc.) | `.cursor/mcp.json`, Cursor UI |
| **Retell agent MCP** | Voice **agent** can call **your** MCP server’s tools during a call | Dashboard: Agent → Add MCP → your MCP endpoint |

- **Get MCP Tools API:** [Get MCP Tools](https://docs.retellai.com/api-references/get-mcp-tools.md) – returns tool definitions for an agent’s MCP server (used when the **voice agent** uses MCP tools).
- **Build doc:** [MCP (single/multi-prompt)](https://docs.retellai.com/build/single-multi-prompt/mcp.md) – how to connect an MCP server to an **agent** and use its tools in conversation.

---

## 2. Webhooks (Post-Call & Inbound)

### Overview

- **Docs:** [Webhook Overview](https://docs.retellai.com/features/webhook-overview)
- **Purpose:** Receive **POST** requests from Retell when events happen (no polling).
- **Timeout:** 10 seconds; retries up to 3 times if no 2xx.
- **Order:** Events are sent in order; delivery is not blocking (e.g. `call_ended` can still fire if `call_started` failed).

### Post-call events (call lifecycle)

| Event | When | Payload |
|-------|------|--------|
| `call_started` | New call begins | Basic call info. **Not sent** if call never connected (e.g. dial failed). |
| `call_ended` | Call ends, transfers, or errors | Full [call object](https://docs.retellai.com/api-references/get-call) **except** `call_analysis`. |
| `call_analyzed` | Analysis finished | Full call data **including** `call_analysis`. |

If the call **did not connect** (e.g. `dial_failed`, `dial_no_answer`, `dial_busy`), **`call_started` is not sent**; `call_ended` and `call_analyzed` are still sent.

### Inbound webhook (before call/SMS connects)

- **Docs:** [Inbound webhook](https://docs.retellai.com/features/inbound-call-webhook)
- **Purpose:** When an **inbound** call or SMS hits your number, Retell POSTs to you **before** connecting. You can:
  - Override agent id/version
  - Set **dynamic variables** (e.g. `customer_name`, `customer_phone`)
  - Set **metadata**
  - Override agent settings for that call (e.g. `begin_message`, voice, LLM params)
  - Reject the call (by not returning `override_agent_id`)

**Request:** `event`: `call_inbound` or `chat_inbound`; body includes `from_number`, `to_number`, `agent_id`, etc. No `call_id` yet.

**Response:** JSON with optional:

- `call_inbound` / `chat_inbound`:
  - `override_agent_id`, `override_agent_version`
  - `dynamic_variables` (e.g. for personalization)
  - `metadata`
  - `agent_override` (e.g. `retell_llm.begin_message`, `agent.voice_id`, etc.)

Your backend uses this to look up the caller and inject `customer_name`, `vehicle_info`, `is_today_closed`, etc.

### Registering webhooks

- **Docs:** [Setup guide (register webhook)](https://docs.retellai.com/features/register-webhook)
- **Options:**
  1. **Account-level:** Settings → Webhooks → one URL for all agents.
  2. **Agent-level:** Agent detail → Webhook; if set, it overrides account-level for that agent.
- **Handler:** Must accept POST, return 2xx quickly (e.g. 204). Your backend uses the same URL for post-call and (separately) for inbound.

### Securing webhooks

- **Docs:** [Secure the webhook](https://docs.retellai.com/features/secure-webhook)
- **Header:** `x-retell-signature`
- **Verification:** Use `Retell.verify(JSON.stringify(req.body), process.env.RETELL_API_KEY, req.headers['x-retell-signature'])` (Node SDK). Only API keys with the **webhook** badge can verify.
- **IP allowlist:** `100.20.5.228` (Retell).

Your `backend/src/routes/webhooks.js` already uses `verifyRetellSignature` with the Retell SDK.

---

## 3. Post-Call Analysis

- **Docs:** [Post Call Analysis Overview](https://docs.retellai.com/features/post-call-analysis-overview)
- **Purpose:** After each call, Retell can extract structured fields (e.g. summary, sentiment, custom categories).
- **Consumption:** [Consume the analysis data](https://docs.retellai.com/features/post-call-analysis-consumption.md) – e.g. in your `call_analyzed` webhook you receive `call_analysis` and persist it (as in your `call_logs`).

Custom analysis is not populated for calls that never connected or had no conversation.

---

## 4. Knowledge Base

- **Docs:** [Knowledge Base](https://docs.retellai.com/build/knowledge-base)
- **Purpose:** Give the agent extra context (URLs, documents, text) so it answers from your content.
- **Behavior:** When a KB is linked to an agent, the agent retrieves relevant chunks **before** each response; no prompt change required. Content appears under `## Related Knowledge Base Contexts`.
- **Sources:** URLs (up to 500), files (e.g. PDF, DOCX, MD; limits apply), custom text (up to 50 snippets).
- **Options:** Auto-refresh URLs, auto-crawling paths, chunk count (1–10), similarity threshold.

Your project uses KB files under `retell/kb-*.md` and attaches them in the Retell dashboard.

---

## 5. Full Documentation Index (Help Area)

Fetch the full list anytime: **https://docs.retellai.com/llms.txt**

Summary of sections:

| Section | Topics |
|--------|--------|
| **Accounts** | Access control, API keys, billing, KYC, workspaces, webhook-capable keys |
| **Agent** | Language, versioning, comparison |
| **AI QA** | Cohorts, resolution criteria, metrics, QA results |
| **API References** | Agents, calls, chats, batch calls, knowledge bases, LLMs, phone numbers, voices, MCP tools, tests, etc. |
| **Build** | Conversation flow (nodes, MCP node, transfer, etc.), single/multi-prompt, custom functions, **MCP**, knowledge base, prompt engineering, telephony, TTS, DTMF |
| **Deploy** | Inbound/outbound calls, Twilio/Telnyx/Vonage/Amazon Connect/Five9/Genesys, web call, SMS, batch calls, concurrency |
| **Features** | **Webhook overview**, **Inbound webhook**, **Register webhook**, **Secure webhook**, post-call analysis, analytics, alerting, session history |
| **Get started** | Quick start, SDKs |
| **Integrate LLM** | Custom LLM, WebSocket, function calling |
| **Integrations** | e.g. HubSpot |
| **Reliability** | Latency, disconnects, fraud protection, abuse prevention |
| **Test** | Playground, simulation, batch test, phone/web testing |
| **Videos** | By feature, use case, beginners |

Direct links you’ll use often:

- [Introduction](https://docs.retellai.com/general/introduction)
- [Webhook Overview](https://docs.retellai.com/features/webhook-overview)
- [Inbound webhook](https://docs.retellai.com/features/inbound-call-webhook)
- [Register webhook](https://docs.retellai.com/features/register-webhook)
- [Secure webhook](https://docs.retellai.com/features/secure-webhook)
- [MCP (for agents)](https://docs.retellai.com/build/single-multi-prompt/mcp.md)
- [Knowledge Base](https://docs.retellai.com/build/knowledge-base)
- [Get MCP Tools API](https://docs.retellai.com/api-references/get-mcp-tools.md)
- [Post Call Analysis Overview](https://docs.retellai.com/features/post-call-analysis-overview)

---

## 6. This Project vs Retell

| What | Where |
|------|--------|
| Post-call webhook URL | Retell dashboard (or account settings) → Post-call webhook → `https://www.alignedai.dev/api/webhooks/voice` |
| Inbound webhook URL | Retell dashboard (phone number / inbound config) → Inbound webhook → `https://www.alignedai.dev/api/webhooks/voice/inbound` |
| Webhook handler | `backend/src/routes/webhooks.js` (verification, `call_started` / `call_ended` / `call_analyzed`, inbound with dynamic variables) |
| Agent prompt & tools | `retell/agent-prompt-slim.md`, `retell/retell-config.json` |
| Knowledge base files | `retell/kb-*.md` (upload/link in Retell dashboard) |
| Cursor MCP (manage Retell from IDE) | `.cursor/mcp.json` → `retellai` → `@abhaybabbar/retellai-mcp-server` |

Using this reference together with the official docs and `llms.txt` gives you the full Retell help area and your current setup in one place.
