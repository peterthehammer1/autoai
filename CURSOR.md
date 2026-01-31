# Auto Service Booking System - Cursor AI Context

> **Use this file as context when working with Cursor AI.** Add it to your chat or reference it with @CURSOR.md

## Project Overview

AI-powered voice booking system for automotive service centers. Customers call, speak with "Alex" (Retell AI agent), and book appointments. Dashboard for staff to manage everything.

## Tech Stack

| Component | Technology | Status |
|-----------|------------|--------|
| Voice AI | Retell AI + Claude Haiku 4.5 | Config ready |
| Backend | Node.js + Express | ✅ Complete |
| Database | Supabase (PostgreSQL) | ✅ Schema + Seed ready |
| Frontend | React + Vite + shadcn/ui | ✅ Complete |
| SMS | Twilio | Endpoints ready |

## Project Structure

```
auto-service-booking/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express entry point
│   │   ├── config/
│   │   │   └── database.js       # Supabase client + phone helpers
│   │   └── routes/
│   │       ├── appointments.js   # CRUD + booking logic
│   │       ├── availability.js   # Slot availability engine
│   │       ├── customers.js      # Customer lookup + management
│   │       ├── services.js       # Service catalog
│   │       ├── analytics.js      # Dashboard stats
│   │       ├── webhooks.js       # Retell + Twilio webhooks
│   │       └── retell-functions.js # AI agent function endpoints
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.jsx              # React entry point
│   │   ├── App.jsx               # Routes + providers
│   │   ├── index.css             # Tailwind + shadcn/ui styles
│   │   ├── api/
│   │   │   └── index.js          # API service layer
│   │   ├── components/
│   │   │   ├── Layout.jsx        # Main layout with sidebar
│   │   │   └── ui/               # shadcn/ui components
│   │   ├── hooks/
│   │   │   └── use-toast.js      # Toast notifications
│   │   ├── lib/
│   │   │   └── utils.js          # Helpers (cn, formatters)
│   │   └── pages/
│   │       ├── Dashboard.jsx     # Overview + today's schedule
│   │       ├── Appointments.jsx  # List + calendar view
│   │       ├── AppointmentDetail.jsx # Single appointment
│   │       ├── Customers.jsx     # Customer lookup
│   │       ├── CustomerDetail.jsx # Customer profile
│   │       ├── CallLogs.jsx      # Call history + stats
│   │       ├── Analytics.jsx     # Charts + metrics
│   │       ├── Services.jsx      # Service catalog
│   │       └── Settings.jsx      # Business config
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── sql/
│   ├── 001_schema.sql            # Full database schema
│   └── 002_seed_data.sql         # Seed data + 60 days of slots
├── retell/
│   └── agent-prompt.md           # Voice agent personality + flows
├── README.md
└── CURSOR.md                     # This file
```

## Database Schema (Key Tables)

```sql
-- Business config (white-label settings)
business_config: id, name, phone, address, business_hours (JSONB), timezone

-- Capacity management
service_bays: id, name, bay_type (quick_service|general_service|alignment|diagnostic|heavy_repair)
technicians: id, first_name, last_name, skill_level, certifications[]
time_slots: id, slot_date, start_time, end_time, bay_id, is_available, appointment_id

-- Services
service_categories: id, name
services: id, name, duration_minutes, price_min, price_max, required_bay_type, is_popular

-- Customers
customers: id, phone, phone_normalized, first_name, last_name, email
vehicles: id, customer_id, year, make, model, mileage, is_primary

-- Appointments
appointments: id, customer_id, vehicle_id, scheduled_date, scheduled_time, 
              estimated_duration_minutes, bay_id, status, created_by
appointment_services: id, appointment_id, service_id, service_name, quoted_price

-- Analytics
call_logs: id, retell_call_id, phone_number, outcome, duration_seconds, transcript
```

## API Endpoints

### Retell Functions (POST /api/retell/*)
```
/lookup_customer     - {phone_number} → customer + vehicles
/get_services        - {category?, search?, mileage?} → services[]
/check_availability  - {service_ids, preferred_date?, preferred_time?} → slots[]
/book_appointment    - {customer_phone, service_ids, date, time, ...} → confirmation
/get_customer_appointments - {customer_phone, status?} → appointments[]
/modify_appointment  - {appointment_id, action: cancel|reschedule, ...}
```

### Dashboard API
```
GET  /api/appointments          - List with filters
GET  /api/appointments/today    - Today's schedule
POST /api/appointments          - Create
PATCH /api/appointments/:id     - Update status, reschedule

GET  /api/customers/lookup?phone=  - Find by phone
GET  /api/customers/:id            - Full profile

GET  /api/services              - List/filter
GET  /api/services/popular      - Quick picks

GET  /api/availability/check    - Find open slots
GET  /api/availability/day/:date - Calendar view

GET  /api/analytics/overview    - Dashboard cards
GET  /api/analytics/appointments - Booking trends
GET  /api/analytics/calls       - Call metrics
GET  /api/analytics/services    - Popular services
GET  /api/analytics/bay-utilization - Capacity
```

## Key Business Logic

### Availability Algorithm
1. Get services → calculate total duration
2. Determine required bay_type from services
3. Find bays matching that type
4. Query time_slots for available consecutive slots
5. Return formatted options for voice agent

### Booking Flow
1. Find/create customer by phone
2. Find/create vehicle
3. Get services, calculate duration
4. Find available bay at requested time
5. Create appointment
6. Mark time_slots as unavailable
7. Return confirmation for voice agent

### Time Slots
- Pre-generated for 60 days
- 30-minute increments
- Linked to specific bays
- ~25% pre-booked in seed data
- Automatically updated via triggers when appointments change

## Environment Variables

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
PORT=3001
TIMEZONE=America/Toronto
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx
NUCLEUS_API_KEY=xxx
```

## Frontend Requirements (TODO)

### Pages Needed
1. **Dashboard** - Overview stats, today's appointments
2. **Appointments** - List view with filters, calendar view
3. **Appointment Detail** - Full details, status updates
4. **Customers** - Search, profiles, vehicle management
5. **Services** - Catalog management
6. **Call Logs** - Transcripts, recordings, outcomes
7. **Analytics** - Charts for calls, bookings, revenue
8. **Settings** - Business hours, bay config

### UI Components (shadcn/ui)
- DataTable for lists
- Calendar for scheduling
- Cards for stats
- Dialog for quick actions
- Form components
- Charts (recharts)

### State Management
- React Query for API calls
- URL state for filters
- Local state for forms

## Common Tasks in Cursor

### "Add a new API endpoint"
1. Create route handler in appropriate file under `backend/src/routes/`
2. Add to Express router
3. Test with curl or Postman

### "Build a dashboard page"
1. Create component in `frontend/src/pages/`
2. Add route in App.jsx
3. Use React Query for data fetching
4. Style with Tailwind + shadcn/ui

### "Modify the database"
1. Create new migration in `sql/`
2. Run in Supabase SQL Editor
3. Update relevant backend routes
4. Update TypeScript types if using them

### "Change the voice agent behavior"
1. Edit `retell/agent-prompt.md`
2. Update in Retell dashboard
3. If adding new function, add endpoint in `retell-functions.js`

## Sample Data Reference

### Bay Types & Counts
- quick_service: 4 bays (Quick Lube 1-2, Express 1-2)
- general_service: 4 bays (Service Bay 1-4)
- alignment: 1 bay
- diagnostic: 1 bay
- heavy_repair: 2 bays

### Sample Customers (for testing)
- 555-234-5678: John Smith, 2021 Honda Accord
- 555-345-6789: Maria Garcia, 2022 Ford F-150
- 555-456-7890: Robert Johnson, 2020 Chevy Equinox

### Popular Services
- Full Synthetic Oil Change (45 min, $80-100)
- Tire Rotation (30 min, $30-40)
- Brake Inspection (FREE, 30 min)
- Wheel Alignment 4-Wheel (90 min, $100-130)
- Check Engine Light Diagnosis (60 min, $100-150)

## Debugging Tips

### API not connecting to Supabase
- Check SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
- Ensure service key (not anon key) for full access

### Availability returning no slots
- Check time_slots table has data for date range
- Verify bay_type matches service requirement
- Check is_available = true exists

### Booking fails
- Check all required fields (phone, service_ids, date, time)
- Verify slot is still available (concurrent booking check)
- Check bay_id assignment logic

## Quick Commands

```bash
# Start backend
cd backend && npm run dev

# Test API
curl http://localhost:3001/health
curl -X POST http://localhost:3001/api/retell/lookup_customer \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "555-234-5678"}'

# Start frontend (once built)
cd frontend && npm run dev
```
