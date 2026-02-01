# Webhook URLs & Fixing 404 / 401 on Test Calls

Your test call showed **two** problems that break smooth booking:

1. **Inbound webhook 404** – Retell couldn’t reach our inbound URL, so `{{customer_phone}}` and other variables were **never set**. The agent then sent the literal string `"{{customer_phone}}"` to our API, and booking failed.
2. **Post-call webhooks 401 Invalid signature** – Retell sent `call_started`, `call_ended`, and `call_analyzed` to our backend, and we rejected them due to signature verification.

Fix both of these so calls work and booking succeeds.

---

## 1. Set the correct webhook URLs in Retell

Use these **exact** URLs (replace with your real backend host if different):

| Purpose | URL |
|--------|-----|
| **Inbound webhook** (before call connects – sets `{{customer_phone}}`, etc.) | `https://backend-jade-eight-75.vercel.app/api/webhooks/voice/inbound` |
| **Post-call webhook** (call_started, call_ended, call_analyzed) | `https://backend-jade-eight-75.vercel.app/api/webhooks/voice` |

- **Inbound** is usually configured per phone number or in “Inbound” / “Before call” settings.
- **Post-call** is usually on the Agent → Webhook / Events settings.

If you still have **`/api/webhooks/retell`** anywhere, change it to **`/api/webhooks/voice`** (we renamed the route). A wrong path causes **404**.

---

## 2. Fix 401 Invalid signature

We verify the `x-retell-signature` header using your provider API key. The backend reads **`NUCLEUS_API_KEY`** first, then **`RETELL_API_KEY`** (so white-label env names work). If the key doesn’t match what the provider uses for webhook signing, verification fails and we return **401**.

**Option A – Use the correct key (recommended)**  
In **Vercel** (or wherever the backend runs), set:

- **`NUCLEUS_API_KEY`** (or **`RETELL_API_KEY`**) = the same API key the voice provider uses for **webhook signing** (often the same as the API key in the provider dashboard).

**Option B – Temporarily skip verification**  
If you need to unblock immediately and can’t fix the key:

- In Vercel, add: `RETELL_SKIP_WEBHOOK_VERIFY=true`
- Redeploy.

Then fix the key and remove this env var for production.

---

## 3. What we changed in the backend

- **Template variables** – If `customer_phone` or `vehicle_id` is still a template (e.g. `"{{customer_phone}}"`) because the inbound webhook failed, we no longer throw. We return a clear message so the agent can say: “I need the number you’re calling from – is this the best number for your account?”
- **Diagnostic search** – “diagnostic” / “check engine light” now fall back to services with “Diagnosis” in the name (e.g. “Check Engine Light Diagnosis”) so one search is enough.
- **Optional skip verify** – `RETELL_SKIP_WEBHOOK_VERIFY=true` lets webhooks through when signature verification would otherwise fail.

After fixing the **inbound URL** (no more 404) and either the **API key** or **skip verify** (no more 401), retest a call; booking should complete and the agent should stop sending literal `{{customer_phone}}`.
