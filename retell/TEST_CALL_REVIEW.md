# Test Call Review – Frank Jones (2026-02-01)

**Call ID:** `call_59a5d2e62e2a8554404fc9ec2a0`  
**Started:** 2026-02-01T17:04:13.718Z  
**Duration:** ~216 seconds (~3.6 min)  
**From:** +15199918959 → **To:** +17164122499 (inbound)  
**Disconnection:** `agent_hangup` (Amber ended after goodbye)  
**Retell analysis:** Call successful: **true** | Sentiment: **Neutral**

---

## 1. What Worked Well

### Conversation flow
- **Opening:** Amber greeted, asked about the lights. Caller said check engine and oil light.
- **Oil light:** Amber correctly emphasized not to ignore the oil light and not to drive much until checked.
- **Diagnostic:** Amber explained check engine diagnostic and that the fee applies to repair.
- **Service lookup:** One `get_services` call with `search: "diagnostic"` → **Check Engine Light Diagnosis** found (ID `0648476d-9e9f-4f0a-ac3e-b69c080bc21d`).
- **Availability:** One `check_availability` for 2026-02-02 morning → slots 08:00 and 08:30 returned; Amber offered both.
- **Details collected:** Name (Frank Jones), phone confirmation (user said use 519-804-0969), vehicle (Honda Civic 2005), time (8:00 AM).
- **Closing:** Amber said “you’re all set,” mentioned SMS, asked if anything else, then ended call cleanly with `end_call`.

### Backend behavior
- **get_services:** Success; one service returned with name, price, duration.
- **check_availability:** Success; two Monday slots returned.
- **Template handling:** When `customer_phone` was the literal `"{{customer_phone}}"`, the backend did **not** crash; it returned a clear message: *“I need the number you’re calling from to complete the booking. Is this the best number for your account?”*

### Call metadata
- **Twilio:** `twilio_call_sid`, `from_number`/`to_number` present.
- **Analysis:** Summary and sentiment populated; `call_successful: true`.

---

## 2. Critical Issue: No Appointment Was Actually Booked

### What happened
- **All three `book_appointment` tool calls** were sent with:
  - `customer_phone`: `"{{customer_phone}}"`
  - `vehicle_id`: `"{{vehicle_id}}"`
- So the **inbound webhook did not set dynamic variables** (or Retell did not call it / did not apply the response). The LLM was given literal placeholders instead of the caller’s number and vehicle.
- The backend correctly detected template variables and returned: *“I need the number you’re calling from to complete the booking…”* for **all three** attempts.
- There was **no fourth** `book_appointment` with a real phone number (e.g. 5198040969 or +15198040969).
- Amber then said **“you’re all set for Monday, February 2nd at 8:00 AM”** and **“You’ll get a text with the details”** even though **no appointment was created** and no SMS was sent.

### Impact
- **Customer was told they were booked when they were not.**
- No record in `appointments`; no confirmation SMS.
- Call log / analytics would show “booked” only if derived from transcript; the actual backend state is “no booking.”

---

## 3. Root Cause: Inbound Webhook Not Providing Variables

- **Expected:** When the call comes in, Retell calls **inbound webhook** `https://www.alignedai.dev/api/webhooks/voice/inbound` with `from_number` (and optionally `call_inbound` payload). Our backend returns `call_inbound.dynamic_variables.customer_phone: from_number` (and related fields). Retell should inject these so the LLM gets e.g. `customer_phone: "+15199918959"` in tool calls.
- **Actual:** The LLM received **literal** `{{customer_phone}}` and `{{vehicle_id}}` in every `book_appointment` request, so the inbound webhook either:
  1. Was **not called** (e.g. wrong URL, 404, or not configured for this number), or  
  2. Was called but the **response shape** is not what Retell/Nucleus expects, so variables were not applied.

The backend and prompt are set up to use dynamic variables; the missing link is Retell successfully calling the inbound URL and applying our `dynamic_variables`.

---

## 4. Agent Behavior After Failed Bookings

- After the first two “I need the number…” responses, Amber asked Frank to confirm the number (519-804-0969) and then said “let me try entering that number differently” and asked for digits (5-1-9, 8-0-4, 0-9-6-9). Frank said “Yep.”
- **But** the third `book_appointment` still used `"{{customer_phone}}"` and `"{{vehicle_id}}"` — the LLM did not substitute the confirmed number into the next tool call.
- Then Amber said “you’re all set” without a successful `book_appointment` response. So the model **assumed success** after the user confirmed the number, instead of requiring a successful booking result before saying “you’re all set.”

---

## 5. Tool Call Summary

| # | Tool                 | Arguments (relevant) | Result |
|---|----------------------|----------------------|--------|
| 1 | get_services         | search: "diagnostic" | ✅ 1 service (Check Engine Light Diagnosis) |
| 2 | check_availability   | 2026-02-02, morning  | ✅ 2 slots (08:00, 08:30) |
| 3 | book_appointment     | customer_phone: `"{{customer_phone}}"` | ❌ “I need the number you’re calling from…” |
| 4 | book_appointment     | same (template)      | ❌ Same message |
| 5 | book_appointment     | same (template)     | ❌ Same message |
| 6 | end_call             | —                    | ✅ Call ended |

---

## 6. Recommendations

### A. Fix inbound webhook (required)
1. **Retell dashboard:** For the number **+17164122499** (or the number used for this test), confirm the **inbound / “before call”** webhook URL is exactly:
   - `https://www.alignedai.dev/api/webhooks/voice/inbound`
2. Confirm the **post-call** webhook is `https://www.alignedai.dev/api/webhooks/voice` (so call_started/ended/analyzed are received).
3. If the provider supports it, check that the inbound response shape matches their spec (e.g. `call_inbound.agent_override.retell_llm` and `call_inbound.dynamic_variables`). Our backend already returns `customer_phone: from_number` and related fields.
4. After changing, place another test call and confirm in Retell (or in a new `latest-call.json`) that `book_appointment` is invoked with a real phone number (e.g. +15199918959 or +15198040969), not `"{{customer_phone}}"`.

### B. Agent prompt (recommended)
- In the agent instructions, add: when `book_appointment` returns *“I need the number you’re calling from…”*, the agent must **collect the number from the customer**, then call `book_appointment` again with **that exact number** (e.g. 5198040969 or +15198040969) in `customer_phone`. Do **not** say “you’re all set” or “you’ll get a text” until the API returns `success: true` and `booked: true`.

### C. Backend (optional)
- If Retell ever sends caller context (e.g. `from_number` or similar) in the HTTP request body or headers when invoking custom tools, we could use that in `book_appointment` as a fallback when `customer_phone` is missing or still a template. Today our backend does not receive caller number on the tool request; it only sees what the LLM sends.

### D. Verification after fix
- Run the E2E test with `TEST_PHONE=15199918959` (or the number you use).
- Place a real call, complete a booking, then confirm in the dashboard (or DB) that an appointment exists and that an SMS was sent (if applicable).

---

## 7. Summary

| Aspect              | Status | Notes |
|---------------------|--------|--------|
| get_services        | ✅     | Diagnostic service found. |
| check_availability  | ✅     | Slots returned. |
| book_appointment    | ❌     | All 3 attempts used `{{customer_phone}}`; no booking created. |
| Inbound variables   | ❌     | Not set; fix inbound webhook URL/format. |
| Agent recovery      | ⚠️     | Asked for number but did not retry with real number; said “you’re all set” without success. |
| End call            | ✅     | Clean hangup. |
| Call analysis       | ⚠️     | Marked successful; actual outcome was “no booking.” |

**Bottom line:** Conversation and service/availability logic were good. The blocking issue is that dynamic variables (especially `customer_phone`) are not being set for the call, so booking never succeeds and the customer was incorrectly told they were booked. Fixing the inbound webhook (and tightening the agent prompt as above) should resolve this.
