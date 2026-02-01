# Retell Dashboard Checklist – Point to Correct Backend

The backend that has the **new code** (NUCLEUS_API_KEY, /api/voice, template-var handling) is the **autoai** project. It’s served at **www.alignedai.dev** (and autoai-nu.vercel.app).

You need to point Retell at this backend. Do this **in the Retell dashboard** (we can’t change it from the repo).

---

## 1. Agent → Webhook Settings

**Agent Level Webhook URL:** set to

```
https://www.alignedai.dev/api/webhooks/voice
```

(Post-call events: call_started, call_ended, call_analyzed.)

---

## 2. Phone Number → Inbound Call Agent

**Add an inbound webhook** (checkbox on) and set the URL to:

```
https://www.alignedai.dev/api/webhooks/voice/inbound
```

(This runs before the call and sets {{customer_phone}}, etc.)

---

## 3. Agent → Functions (custom tools)

Each function URL must use the **same base**. Replace any old base (e.g. `backend-jade-eight-75.vercel.app`) with:

**Base URL:** `https://www.alignedai.dev/api/voice/`

So each tool URL should look like:

- `https://www.alignedai.dev/api/voice/get_services`
- `https://www.alignedai.dev/api/voice/check_availability`
- `https://www.alignedai.dev/api/voice/book_appointment`
- `https://www.alignedai.dev/api/voice/get_customer_appointments`
- `https://www.alignedai.dev/api/voice/modify_appointment`
- `https://www.alignedai.dev/api/voice/send_confirmation`
- `https://www.alignedai.dev/api/voice/submit_tow_request`

(Exact list is in `retell/retell-config.json`; you can copy from there if your dashboard supports import.)

---

## Done

After saving in Retell, the next test call will hit the correct backend and booking should work (real {{customer_phone}}, etc.).
