# Auto Service Booking System

AI-powered voice agent for automotive service appointment booking, with a full dashboard for management and analytics.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Customer      │────▶│   Retell AI     │────▶│   Backend API   │
│   Phone Call    │     │   Voice Agent   │     │   (Node.js)     │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌─────────────────┐              │
                        │    Dashboard    │◀─────────────┤
                        │    (React)      │              │
                        └─────────────────┘              ▼
                                                ┌─────────────────┐
                                                │    Supabase     │
                                                │   (PostgreSQL)  │
                                                └─────────────────┘
```

## Features

### Voice Agent (Retell AI)
- Natural conversation booking flow
- Customer lookup by phone number
- Vehicle recognition for returning customers
- Service recommendations based on mileage
- Real-time availability checking
- Appointment booking, rescheduling, cancellation
- Seamless transfer to human advisors

### Backend API
- RESTful API for all operations
- Retell function endpoints for AI agent
- Bay/technician capacity management
- Webhook handlers for call events
- SMS confirmations via Twilio

### Dashboard (Coming Soon)
- Appointment calendar and list views
- Customer and vehicle management
- Call logs with recordings and transcripts
- Analytics and reporting
- Service catalog management

## Tech Stack

| Component | Technology |
|-----------|------------|
| Voice AI | Retell AI |
| LLM | Claude Haiku 4.5 |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) |
| Frontend | React + Vite (coming) |
| SMS | Twilio |

## Quick Start

### 1. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run the schema file: `sql/001_schema.sql`
4. Run the seed data: `sql/002_seed_data.sql`
5. Copy your project URL and API keys

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

PORT=3001
NODE_ENV=development

TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+15551234567

RETELL_API_KEY=your-retell-key

TIMEZONE=America/Toronto
```

### 3. Install & Run

```bash
cd backend
npm install
npm run dev
```

API will be running at `http://localhost:3001`

### 4. Set Up Retell Agent

1. Create a new agent in [Retell Dashboard](https://dashboard.retellai.com)
2. Configure the LLM (Claude Haiku 4.5 recommended)
3. Add the agent prompt (see `retell/agent-prompt.md`)
4. Configure functions pointing to your API endpoints

## API Endpoints

### Retell Functions (for AI agent)

| Endpoint | Description |
|----------|-------------|
| `POST /api/retell/lookup_customer` | Find customer by phone |
| `POST /api/retell/get_services` | Get available services |
| `POST /api/retell/check_availability` | Check appointment slots |
| `POST /api/retell/book_appointment` | Book an appointment |
| `POST /api/retell/get_customer_appointments` | Get customer's appointments |
| `POST /api/retell/modify_appointment` | Cancel or reschedule |

### Dashboard API

| Endpoint | Description |
|----------|-------------|
| `GET /api/appointments` | List appointments |
| `GET /api/appointments/today` | Today's schedule |
| `POST /api/appointments` | Create appointment |
| `PATCH /api/appointments/:id` | Update appointment |
| `GET /api/customers/lookup?phone=` | Find customer |
| `GET /api/services` | List services |
| `GET /api/services/popular` | Popular services |
| `GET /api/availability/check` | Check availability |
| `GET /api/analytics/overview` | Dashboard stats |

### Webhooks

| Endpoint | Description |
|----------|-------------|
| `POST /api/webhooks/retell` | Retell call events |
| `POST /api/webhooks/twilio/sms` | Inbound SMS |

## Database Schema

### Core Tables

- **business_config** - White-label settings, hours, branding
- **service_bays** - Physical bays with type (quick_service, alignment, etc.)
- **technicians** - Staff with skills and certifications
- **services** - Service catalog with pricing and duration
- **customers** - Customer profiles
- **vehicles** - Customer vehicles
- **appointments** - Booked appointments
- **time_slots** - Pre-generated availability slots
- **call_logs** - AI call history and analytics

### Key Features

- **Capacity Management**: Time slots are pre-generated per bay, ensuring accurate availability
- **Bay Types**: Different services require different bay types (quick_service, alignment, diagnostic, heavy_repair)
- **Phone Normalization**: Automatic E.164 formatting for consistent lookups
- **Appointment Triggers**: Automatic slot booking when appointments are created

## Retell Function Configuration

When setting up functions in Retell, use these configurations:

### lookup_customer
```json
{
  "name": "lookup_customer",
  "url": "https://your-api.com/api/retell/lookup_customer",
  "method": "POST",
  "parameters": {
    "phone_number": {
      "type": "string",
      "description": "Customer phone number",
      "required": true
    }
  }
}
```

### check_availability
```json
{
  "name": "check_availability", 
  "url": "https://your-api.com/api/retell/check_availability",
  "method": "POST",
  "parameters": {
    "service_ids": {
      "type": "array",
      "description": "Service IDs to book",
      "required": true
    },
    "preferred_date": {
      "type": "string",
      "description": "Preferred date YYYY-MM-DD"
    },
    "preferred_time": {
      "type": "string",
      "description": "morning, afternoon, or HH:MM"
    }
  }
}
```

### book_appointment
```json
{
  "name": "book_appointment",
  "url": "https://your-api.com/api/retell/book_appointment", 
  "method": "POST",
  "parameters": {
    "customer_phone": { "type": "string", "required": true },
    "customer_first_name": { "type": "string" },
    "customer_last_name": { "type": "string" },
    "vehicle_year": { "type": "integer" },
    "vehicle_make": { "type": "string" },
    "vehicle_model": { "type": "string" },
    "vehicle_id": { "type": "string" },
    "service_ids": { "type": "array", "required": true },
    "appointment_date": { "type": "string", "required": true },
    "appointment_time": { "type": "string", "required": true },
    "loaner_requested": { "type": "boolean" },
    "shuttle_requested": { "type": "boolean" },
    "notes": { "type": "string" }
  }
}
```

## Pre-loaded Data

The seed script creates:

- **12 service bays** (4 quick service, 4 general, 1 alignment, 1 diagnostic, 2 heavy repair)
- **10 technicians** with various skill levels
- **40+ services** across 8 categories
- **8 sample customers** with vehicles
- **60 days of time slots** (~25% pre-booked to simulate real schedule
- **Sample appointments** and call logs

## Deployment

### Backend (Railway)

1. Push to GitHub
2. Connect repo to Railway
3. Add environment variables
4. Deploy

### Backend (Vercel)

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Add environment variables in dashboard

### Supabase

Already hosted - just keep your project running.

## Testing the API

### Check health
```bash
curl http://localhost:3001/health
```

### Look up customer
```bash
curl -X POST http://localhost:3001/api/retell/lookup_customer \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "555-234-5678"}'
```

### Get popular services
```bash
curl -X POST http://localhost:3001/api/retell/get_services \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Check availability
```bash
curl -X POST http://localhost:3001/api/retell/check_availability \
  -H "Content-Type: application/json" \
  -d '{
    "service_ids": ["SERVICE_ID_HERE"],
    "preferred_date": "2024-02-01",
    "preferred_time": "morning"
  }'
```

## Project Structure

```
auto-service-booking/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js       # Supabase client
│   │   ├── routes/
│   │   │   ├── appointments.js   # Appointment CRUD
│   │   │   ├── availability.js   # Slot availability
│   │   │   ├── customers.js      # Customer management
│   │   │   ├── services.js       # Service catalog
│   │   │   ├── analytics.js      # Dashboard analytics
│   │   │   ├── webhooks.js       # Retell/Twilio webhooks
│   │   │   └── retell-functions.js # AI agent functions
│   │   └── index.js              # Express app
│   ├── package.json
│   └── .env.example
├── sql/
│   ├── 001_schema.sql            # Database schema
│   └── 002_seed_data.sql         # Seed data + 60 days slots
├── retell/
│   └── agent-prompt.md           # Voice agent prompt
└── README.md
```

## Next Steps

1. **Dashboard**: Build React frontend with appointment views
2. **SMS Confirmations**: Complete Twilio integration
3. **Reminder Calls**: Outbound reminder system
4. **Multi-tenant**: Support multiple locations
5. **DMS Integration**: Connect to dealer management systems

## License

Proprietary - Nucleus AI Technologies Ltd.
