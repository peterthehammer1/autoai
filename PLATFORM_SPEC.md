# Premier Auto Service – Platform Spec

**Purpose:** Single source of truth for how this platform is built and what must be configured. Use this (and the code) instead of guessing.

---

## 1. Architecture Overview

| Layer | Technology | Role |
|-------|------------|------|
| **Voice agent** | Retell AI (Amber) | Inbound calls; uses our backend for lookup, booking, tow, confirmations |
| **Backend** | Node.js + Express | Supabase, webhooks, voice functions, dashboard API |
| **Database** | Supabase (PostgreSQL) | customers, vehicles, appointments, time_slots, call_logs, tow_requests, etc. |
| **Frontend** | React + Vite + shadcn/ui | Dashboard: appointments, customers, call logs, analytics, settings |
| **SMS** | Twilio | Confirmations, reminders (backend sends; optional inbound via webhook) |

**Backend base URL (production):** `https://www.alignedai.dev`  
**Frontend API base:** Set by `VITE_API_URL` or defaults (see Frontend section below).

---

## 2. Backend Route Map (Exact)

All routes below are under the backend. Mount points from `backend/src/index.js`:

| Mount | Router / handler | Purpose |
|-------|------------------|--------|
| `/api/webhooks` | `webhooks.js` | Voice + Twilio webhooks |
| `/api/voice` | `retell-functions.js` | Voice agent function calls |
| `/api/call-logs` | `call-logs.js` | Call log list/detail/stats (used by frontend Call Logs page) |
| `/api/call-center` | `call-center.js` | Call center dashboard API (calls, stats, customer history) |
| `/api/appointments` | `appointments.js` | CRUD, today, upcoming |
| `/api/customers` | `customers.js` | Lookup, CRUD, vehicles |
| `/api/services` | `services.js` | Catalog, popular, categories |
| `/api/availability` | `availability.js` | Check slots, day, next |
| `/api/analytics` | `analytics.js` | Overview, calls, appointments, insights |
| `/api/reminders` | `reminders.js` | Reminder logic |
| `/api/sms-logs` | `sms-logs.js` | SMS log list/stats |

### 2.1 Webhook routes (webhooks.js)

- **POST /api/webhooks/voice/inbound**  
  - **Called by:** Voice provider when an **inbound call** is received (before call connects).  
  - **Request:** `event: "call_inbound"`, `call_inbound: { from_number, to_number, agent_id }`.  
  - **Response:** JSON with `call_inbound.dynamic_variables` (customer_name, customer_phone, vehicle_info, vehicle_id, is_existing_customer, is_today_closed, next_open_day, next_open_date, etc.) and optional `call_inbound.agent_override.retell_llm.begin_message`.  
  - **Verification:** `x-retell-signature` + `RETELL_API_KEY` (see Env).

- **POST /api/webhooks/voice**  
  - **Called by:** Voice provider for **post-call events**.  
  - **Request:** `event` in `call_started` | `call_ended` | `call_analyzed`, plus `call` object.  
  - **Behavior:**  
    - `call_started`: insert into `call_logs` (retell_call_id, phone_number, started_at, agent_id), link customer_id by phone.  
    - `call_ended`: update `call_logs` (ended_at, duration_seconds, outcome, appointment_id if any).  
    - `call_analyzed`: update or insert `call_logs` with transcript, transcript_summary, sentiment, intent_detected, recording_url, etc.  
  - **Verification:** Same as inbound.

- **POST /api/webhooks/twilio/sms**  
  - Inbound SMS (e.g. “stop” → marketing_opt_in false). Returns TwiML.

### 2.2 Voice agent function routes (retell-functions.js)

All are **POST**, under **/api/voice/**:

- `/api/voice/lookup_customer` – body: phone_number (or args.phone_number). Returns customer + vehicles.
- `/api/voice/get_services` – body: search, category, mileage. Returns services (+ recommendations if mileage).
- `/api/voice/check_availability` – body: service_ids, preferred_date, preferred_time, days_to_check. Returns slots (weekdays 7am–4pm only).
- `/api/voice/book_appointment` – body: customer_phone, service_ids, appointment_date, appointment_time, customer_first_name, customer_last_name, vehicle_id or vehicle_year/make/model, call_id (optional). Creates customer/vehicle if needed, creates appointment, links to call_logs by retell_call_id if call_id provided.
- `/api/voice/get_customer_appointments` – body: customer_phone. Returns appointments.
- `/api/voice/modify_appointment` – body: appointment_id, action (cancel | reschedule | add_services), new_date, new_time, service_ids as needed.
- `/api/voice/send_confirmation` – body: appointment_id or customer_phone. Sends SMS via Twilio. **Automatic SMS:** The backend already sends confirmation SMS after `book_appointment`, after `modify_appointment` (reschedule or add_services), and cancellation SMS after `modify_appointment` (cancel). Use send_confirmation only to resend on request.
- `/api/voice/submit_tow_request` – body: customer_phone, pickup_address_line1, pickup_city, pickup_state, pickup_zip, customer_first_name, customer_last_name, vehicle_id or vehicle_year/make/model, pickup_notes, call_id (optional). Inserts into `tow_requests`.

### 2.3 Call logs vs call-center

- **Frontend Call Logs page** uses **/api/call-logs**:  
  - `GET /api/call-logs` (list, filters: outcome, date_from, date_to, customer_id),  
  - `GET /api/call-logs/:id`,  
  - `GET /api/call-logs/stats/summary?period=week`.  
- **/api/call-center** is a separate API (e.g. `GET /api/call-center/calls`) with richer formatting (call_date, call_time, duration_formatted, etc.); same underlying `call_logs` table.

---

## 3. What the voice provider dashboard must use

These are the **exact** URLs our backend expects to be configured in the **voice provider (Retell) dashboard**:

| Setting | Where in dashboard | Value |
|--------|--------------------|--------|
| **Agent-level webhook URL** (post-call events) | Agent → Webhook Settings | `https://www.alignedai.dev/api/webhooks/voice` |
| **Inbound webhook URL** (before call connects) | Phone number / Inbound config | `https://www.alignedai.dev/api/webhooks/voice/inbound` |
| **Function URLs** (custom tools) | Agent → Functions | Base: `https://www.alignedai.dev/api/voice/` then e.g. `get_services`, `check_availability`, `book_appointment`, `get_customer_appointments`, `modify_appointment`, `send_confirmation`, `submit_tow_request`. (lookup_customer is optional; we inject context via inbound webhook.) |

If the dashboard has only one webhook URL field, that is the **post-call** URL. The **inbound** webhook is configured per number (or in number/telephony settings), not on the agent.

---

## 4. Database (relevant to voice + calls)

- **call_logs:** id, retell_call_id (unique), phone_number, phone_normalized, customer_id, direction, started_at, ended_at, duration_seconds, outcome (enum: booked, inquiry, completed, abandoned, transferred, …), appointment_id, transcript, transcript_summary, recording_url, sentiment, intent_detected, agent_id.  
  - Populated by webhooks: `call_started` creates row; `call_ended` / `call_analyzed` update it.

- **appointments:** call_id (VARCHAR) stores the voice provider’s call id when booking from a call; used to link appointment to call_logs (via retell_call_id) and to set outcome = 'booked'.

- **tow_requests:** call_id (VARCHAR) optional; customer_id, vehicle_id, pickup_* address fields, status.

- **customers / vehicles:** Normalized phone (phone_normalized); inbound webhook looks up by from_number → customer and vehicles.

---

## 5. Environment (backend)

- **NUCLEUS_API_KEY** (or **RETELL_API_KEY**) – Used in `webhooks.js` for webhook signature verification (inbound + post-call). Must be the provider API key with webhook verification permission. White-label setups can use `NUCLEUS_API_KEY`.  
- **SUPABASE_URL**, **SUPABASE_SERVICE_KEY** (and optionally SUPABASE_ANON_KEY).  
- **TWILIO_*** – For send_confirmation and any outbound SMS.  
- **PORT**, **NODE_ENV**, **TIMEZONE** – Optional/server config.

The code accepts **NUCLEUS_API_KEY** or **RETELL_API_KEY** (Nucleus first) for webhook verification.

---

## 6. Frontend

- **API base:** `frontend/src/api/index.js` – `API_BASE = import.meta.env.VITE_API_URL || (localhost ? '/api' : 'https://www.alignedai.dev/api')`. So production frontend defaults to `https://www.alignedai.dev/api` unless `VITE_API_URL` is set (e.g. to the same backend: `https://www.alignedai.dev`).
- **Call Logs:** Uses `callLogs.list()`, `callLogs.get()`, `callLogs.stats()` → **/api/call-logs**.

---

## 7. Agent prompt and config (retell/)

- **agent-prompt-slim.md** – Amber’s instructions: booking checklist (name, phone, vehicle), closed-day logic (is_today_closed, next_open_day/date), tow-in flow (submit_tow_request with pickup address), filler phrases, no “today” when closed.
- **retell-config.json** – Reference for agent name, LLM id, **general_tools** (names + URLs under /api/voice/), and **webhooks** (inbound url, post_call url + events). Copy these into the voice provider UI; URLs there must match section 3.

---

## 8. Summary: “What we need to do” by context

- **To have call logging and full call records:**  
  Set **Agent-level webhook URL** = `https://www.alignedai.dev/api/webhooks/voice` (events: call_started, call_ended, call_analyzed). No other backend change needed.

- **To have caller context and closed-day/tow behavior:**  
  Set **Inbound webhook URL** (on the number) = `https://www.alignedai.dev/api/webhooks/voice/inbound`. Backend already returns dynamic_variables and optional begin_message.

- **To have booking, tow, confirmations from the agent:**  
  Register each custom function in the dashboard with the **same names and URLs** as in `retell/retell-config.json` (base `https://www.alignedai.dev/api/voice/...`).

- **To change backend URL (e.g. different domain):**  
  Update `retell-config.json` and the voice provider dashboard; ensure RETELL_API_KEY and Supabase (and Twilio if used) are correct for that backend.

This document is the in-depth reference for how the platform is set up and what must be configured where.
