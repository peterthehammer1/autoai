# Retell AI Voice Agent Setup Guide

Complete guide to set up the AI voice agent for Premier Auto Service.

## Quick Start

```bash
# 1. Start the backend
cd backend && npm run dev

# 2. Test the functions locally
chmod +x retell/test-functions.sh
./retell/test-functions.sh

# 3. Expose to internet for Retell
npx ngrok http 3001

# 4. Create agent in Retell Dashboard with ngrok URL
```

---

## Part 1: Test Functions Locally

Before connecting to Retell, verify your API endpoints work:

### Start the Backend

```bash
cd backend
npm install
npm run dev
```

API runs at `http://localhost:3001`

### Run Test Script

```bash
chmod +x retell/test-functions.sh
./retell/test-functions.sh
```

### Manual Tests

```bash
# Health check
curl http://localhost:3001/health

# Lookup existing customer (John Smith)
curl -X POST http://localhost:3001/api/retell/lookup_customer \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "555-234-5678"}'

# Get popular services
curl -X POST http://localhost:3001/api/retell/get_services \
  -H "Content-Type: application/json" \
  -d '{}'

# Check availability
curl -X POST http://localhost:3001/api/retell/check_availability \
  -H "Content-Type: application/json" \
  -d '{"service_ids": ["SERVICE_ID"], "preferred_time": "morning"}'
```

---

## Part 2: Make API Publicly Accessible

Retell needs a public URL to call your functions. Options:

### Option A: ngrok (Fastest - Recommended for Testing)

```bash
# Install ngrok
npm install -g ngrok

# Or download from https://ngrok.com/download

# Expose your local server
npx ngrok http 3001
```

You'll get a URL like: `https://abc123.ngrok-free.app`

**Note**: Free ngrok URLs change every time you restart. For production, use a paid plan or deploy.

### Option B: Cloudflare Tunnel (Free, Stable)

```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared

# Create tunnel (one-time)
cloudflared tunnel login
cloudflared tunnel create auto-service

# Run tunnel
cloudflared tunnel run --url http://localhost:3001 auto-service
```

### Option C: Deploy to Railway (Production)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
cd backend
railway init
railway up
```

Railway gives you a permanent URL like: `https://auto-service-booking.up.railway.app`

### Option D: Deploy to Render

1. Push to GitHub
2. Go to [render.com](https://render.com)
3. New → Web Service
4. Connect your repo, select `backend` folder
5. Build Command: `npm install`
6. Start Command: `npm start`

---

## Part 3: Create Retell Agent

### Step 1: Create Account

1. Go to [retellai.com](https://www.retellai.com/)
2. Sign up / Log in
3. Go to Dashboard

### Step 2: Create New Agent

1. Click **"Create Agent"**
2. Configure:
   - **Name**: `Alex - Premier Auto Service`
   - **Voice**: Choose a professional voice (recommend: `eleven_turbo_v2` or similar)
   - **Language**: English (US)
   - **LLM**: Claude 3.5 Haiku (recommended for speed)

### Step 3: Set the System Prompt

Copy the entire contents of `retell/agent-prompt.md` into the **System Prompt** field.

### Step 4: Add Functions

Add each function with the settings from `retell/retell-config.json`:

#### Function 1: lookup_customer

| Field | Value |
|-------|-------|
| Name | `lookup_customer` |
| URL | `https://YOUR-URL/api/retell/lookup_customer` |
| Method | POST |
| Description | Look up a customer by their phone number to check if they are a returning customer and retrieve their vehicle information. |

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "phone_number": {
      "type": "string",
      "description": "The customer's phone number"
    }
  },
  "required": ["phone_number"]
}
```

#### Function 2: get_services

| Field | Value |
|-------|-------|
| Name | `get_services` |
| URL | `https://YOUR-URL/api/retell/get_services` |
| Method | POST |
| Description | Get available services. Use when customer asks what services are offered. |

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "category": {
      "type": "string",
      "description": "Filter by category"
    },
    "search": {
      "type": "string",
      "description": "Search term to find services"
    },
    "mileage": {
      "type": "integer",
      "description": "Vehicle mileage for recommendations"
    }
  },
  "required": []
}
```

#### Function 3: check_availability

| Field | Value |
|-------|-------|
| Name | `check_availability` |
| URL | `https://YOUR-URL/api/retell/check_availability` |
| Method | POST |
| Description | Check available appointment time slots for specific services. |

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "service_ids": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Service IDs to book"
    },
    "preferred_date": {
      "type": "string",
      "description": "Date in YYYY-MM-DD format"
    },
    "preferred_time": {
      "type": "string",
      "description": "'morning', 'afternoon', or 'HH:MM'"
    }
  },
  "required": ["service_ids"]
}
```

#### Function 4: book_appointment

| Field | Value |
|-------|-------|
| Name | `book_appointment` |
| URL | `https://YOUR-URL/api/retell/book_appointment` |
| Method | POST |
| Description | Book a confirmed appointment after customer confirms details. |

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "customer_phone": {"type": "string"},
    "customer_first_name": {"type": "string"},
    "customer_last_name": {"type": "string"},
    "vehicle_id": {"type": "string"},
    "vehicle_year": {"type": "integer"},
    "vehicle_make": {"type": "string"},
    "vehicle_model": {"type": "string"},
    "service_ids": {"type": "array", "items": {"type": "string"}},
    "appointment_date": {"type": "string"},
    "appointment_time": {"type": "string"},
    "loaner_requested": {"type": "boolean"},
    "shuttle_requested": {"type": "boolean"},
    "notes": {"type": "string"}
  },
  "required": ["customer_phone", "service_ids", "appointment_date", "appointment_time"]
}
```

#### Function 5: get_customer_appointments

| Field | Value |
|-------|-------|
| Name | `get_customer_appointments` |
| URL | `https://YOUR-URL/api/retell/get_customer_appointments` |
| Method | POST |
| Description | Get customer's existing appointments. |

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "customer_phone": {"type": "string"},
    "status": {"type": "string", "description": "'upcoming' or 'all'"}
  },
  "required": ["customer_phone"]
}
```

#### Function 6: modify_appointment

| Field | Value |
|-------|-------|
| Name | `modify_appointment` |
| URL | `https://YOUR-URL/api/retell/modify_appointment` |
| Method | POST |
| Description | Cancel or reschedule an existing appointment. |

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "appointment_id": {"type": "string"},
    "action": {"type": "string", "enum": ["cancel", "reschedule"]},
    "new_date": {"type": "string"},
    "new_time": {"type": "string"},
    "reason": {"type": "string"}
  },
  "required": ["appointment_id", "action"]
}
```

### Step 5: Configure Agent Settings

| Setting | Recommended Value |
|---------|-------------------|
| Interruption Sensitivity | Medium |
| Response Delay | Low (for natural conversation) |
| End Call on Silence | 10 seconds |
| Ambient Sound | Office (subtle) |

### Step 6: Get a Phone Number

1. In Retell Dashboard, go to **Phone Numbers**
2. Click **Buy Number** or **Import Number**
3. Assign it to your agent

---

## Part 4: Test the Agent

### Web Call (Free Testing)

1. In Retell Dashboard, open your agent
2. Click **"Test Agent"** button
3. Have a conversation to test all flows

### Test Scenarios

**Scenario 1: New Customer Booking**
- "Hi, I need an oil change"
- Provide name when asked
- Say vehicle info: "2020 Honda Civic"
- Pick a time: "Tomorrow morning"

**Scenario 2: Returning Customer**
- Call from a test phone number in your database (555-234-5678)
- Ask to book an appointment
- Confirm vehicle

**Scenario 3: Check Existing Appointment**
- "When is my next appointment?"
- "I need to reschedule"

**Scenario 4: Cancel**
- "I need to cancel my appointment"

---

## Part 5: Webhooks (Optional)

To track call events, configure webhooks:

### Retell Webhook Events

In Retell Dashboard → Settings → Webhooks:

| Event | URL |
|-------|-----|
| call_started | `https://YOUR-URL/api/webhooks/retell` |
| call_ended | `https://YOUR-URL/api/webhooks/retell` |
| call_analyzed | `https://YOUR-URL/api/webhooks/retell` |

The webhook handler in `backend/src/routes/webhooks.js` logs call data to the `call_logs` table.

---

## Troubleshooting

### "Function call failed"

1. Check your API is accessible from the internet
2. Test the URL directly: `curl https://YOUR-URL/health`
3. Check backend logs for errors
4. Verify the function URL in Retell matches exactly

### "No slots available"

1. Check `time_slots` table has data
2. Verify date is within 60 days
3. Check bay type matches service requirement

### Agent not responding naturally

1. Review the system prompt
2. Check function response `message` fields
3. Adjust interruption sensitivity

### Phone calls not connecting

1. Verify phone number is assigned to agent
2. Check Retell dashboard for errors
3. Ensure your plan includes phone calls

---

## Sample Test Data

Use these for testing:

| Customer | Phone | Vehicle |
|----------|-------|---------|
| John Smith | 555-234-5678 | 2021 Honda Accord |
| Maria Garcia | 555-345-6789 | 2022 Ford F-150 |
| Robert Johnson | 555-456-7890 | 2020 Chevy Equinox |

| Service | Duration | Price |
|---------|----------|-------|
| Full Synthetic Oil Change | 45 min | $80-100 |
| Tire Rotation | 30 min | $30-40 |
| Brake Inspection | 30 min | FREE |
| 4-Wheel Alignment | 90 min | $100-130 |

---

## Going Live Checklist

- [ ] Backend deployed to production URL
- [ ] Environment variables set (Supabase, etc.)
- [ ] All 6 functions added to Retell
- [ ] System prompt configured
- [ ] Test web calls working
- [ ] Phone number assigned
- [ ] Webhooks configured (optional)
- [ ] Test call from real phone
- [ ] Monitor call logs in dashboard

---

## Support

- **Retell Docs**: https://docs.retellai.com
- **Retell Discord**: Community support
- **This Project**: Check `backend/src/routes/retell-functions.js` for API implementation
