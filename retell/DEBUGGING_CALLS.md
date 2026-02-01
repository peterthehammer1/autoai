# Debugging Test Calls (Amber / Retell)

If a test call had errors or Amber hung up in the middle, use these steps to find out why.

---

## 1. Fetch the latest call from Retell

This saves the full call (transcript, tool calls, analysis) to a file you can inspect.

From the **project root** (with `RETELL_API_KEY` set):

```bash
RETELL_API_KEY=your_retell_api_key node backend/scripts/retell-fetch-latest-call.js
```

Then open **`retell/latest-call.json`** and check:

- **`transcript`** or **`transcript_with_tool_calls`** – what was said and which tools were called; look for failed or missing tool calls.
- **`call_analysis`** – `call_summary`, `user_sentiment`, `call_successful`.
- **`disconnection_reason`** (if present) – e.g. `agent_hangup`, `user_hangup`, `error`, etc.

---

## 2. Check Vercel logs (backend errors)

Your backend runs on Vercel. Any errors from our API will show up there.

1. Vercel Dashboard → your project → **Logs** (or **Functions**).
2. Filter by time of the test call.
3. Look for:
   - **`Invalid Retell webhook signature`** – webhook auth issue.
   - **`book_appointment error`**, **`get_services error`**, **`check_availability error`**, etc. – our code threw; the agent would have received a 500 or error response.
   - **`Call ended: ... disconnection_reason: ...`** – we log this for every call end; the reason (e.g. `agent_hangup`, `user_hangup`) helps explain who hung up.

If you see **timeouts** (e.g. 504 or function timeout), the voice provider may have given up waiting for our API; consider increasing timeouts or optimizing slow endpoints.

---

## 3. Check Retell dashboard

In the Retell dashboard:

- Open the **call** (by time or phone number).
- Check **disconnection reason** and **call status**.
- Review **tool call** results: failed or timed-out tools can cause the agent to say something wrong or end the call.

---

## 4. Common causes of mid-call hangups

| Cause | What to check |
|--------|----------------|
| **Tool call failed (500 / timeout)** | Vercel logs for our API errors; Retell call detail for failed tool calls. |
| **Agent called `end_call` too early** | In `latest-call.json`, look at `transcript_with_tool_calls` for an `end_call` invocation before the customer said goodbye. |
| **Inbound webhook failed** | Vercel logs for errors on `/api/webhooks/voice/inbound` (e.g. 401, 500). Agent might not get `{{customer_phone}}` etc. |
| **Network / timeout** | Vercel function cold start or slow Supabase; Retell may timeout waiting for our response. |

---

## 5. Quick checklist after a bad test call

1. Run: `RETELL_API_KEY=xxx node backend/scripts/retell-fetch-latest-call.js`
2. Open `retell/latest-call.json` and read the transcript and tool calls.
3. In Vercel, check logs around the call time for errors and for `Call ended: ... disconnection_reason: ...`.
4. In Retell, check the call’s disconnection reason and tool call results.

If you can share the **disconnection_reason** and any **error lines from Vercel** (or a redacted snippet of `latest-call.json`), we can narrow it down further.
