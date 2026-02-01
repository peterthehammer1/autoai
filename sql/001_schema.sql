-- Auto Service Booking System - Database Schema
-- Designed for large auto service centers with multiple bays and technicians

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CONFIGURATION TABLES
-- ============================================================================

-- Business Configuration (white-label settings)
CREATE TABLE business_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    timezone VARCHAR(50) DEFAULT 'America/Toronto',
    logo_url VARCHAR(500),
    primary_color VARCHAR(7) DEFAULT '#1e40af',
    secondary_color VARCHAR(7) DEFAULT '#3b82f6',
    -- Business hours: Service department Mon-Fri 7am-4pm only (no weekends, no evenings)
    business_hours JSONB DEFAULT '{
        "monday": {"open": "07:00", "close": "16:00", "closed": false},
        "tuesday": {"open": "07:00", "close": "16:00", "closed": false},
        "wednesday": {"open": "07:00", "close": "16:00", "closed": false},
        "thursday": {"open": "07:00", "close": "16:00", "closed": false},
        "friday": {"open": "07:00", "close": "16:00", "closed": false},
        "saturday": {"open": null, "close": null, "closed": true},
        "sunday": {"open": null, "close": null, "closed": true}
    }'::jsonb,
    slot_duration_minutes INTEGER DEFAULT 30, -- Base slot size
    booking_lead_time_hours INTEGER DEFAULT 2, -- Minimum hours before appointment
    booking_window_days INTEGER DEFAULT 60, -- How far out customers can book
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SERVICE BAYS & TECHNICIANS
-- ============================================================================

-- Service Bay Types
CREATE TYPE bay_type AS ENUM (
    'quick_service',      -- Oil changes, filters, wipers
    'general_service',    -- Brakes, tires, batteries
    'alignment',          -- Wheel alignment (specialized equipment)
    'diagnostic',         -- Check engine, electrical
    'heavy_repair',       -- Engine, transmission work
    'express_lane'        -- No appointment needed, but can be scheduled
);

-- Service Bays
CREATE TABLE service_bays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,            -- "Bay 1", "Quick Lube 1", "Alignment Bay"
    bay_type bay_type NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Technician Skill Levels
CREATE TYPE skill_level AS ENUM ('junior', 'intermediate', 'senior', 'master');

-- Technicians
CREATE TABLE technicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(20) UNIQUE,       -- Internal employee number
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    skill_level skill_level DEFAULT 'intermediate',
    hourly_rate DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    hire_date DATE,
    certifications TEXT[],                -- ASE certifications, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Technician-Bay Assignments (which technicians can work which bays)
CREATE TABLE technician_bay_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID REFERENCES technicians(id) ON DELETE CASCADE,
    bay_id UUID REFERENCES service_bays(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,     -- Primary bay assignment
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(technician_id, bay_id)
);

-- Technician Schedules (weekly recurring schedule)
CREATE TABLE technician_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID REFERENCES technicians(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(technician_id, day_of_week)
);

-- Technician Time Off / Exceptions
CREATE TABLE technician_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID REFERENCES technicians(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    start_time TIME,                      -- NULL means all day
    end_time TIME,
    reason VARCHAR(100),                  -- vacation, sick, training
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SERVICES
-- ============================================================================

-- Service Categories
CREATE TABLE service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Services
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES service_categories(id),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    price_min DECIMAL(10,2),
    price_max DECIMAL(10,2),
    price_display VARCHAR(100),           -- "Starting at $49" or "$49-79"
    required_bay_type bay_type,           -- Which bay type can perform this
    required_skill_level skill_level DEFAULT 'junior',
    is_popular BOOLEAN DEFAULT false,     -- Show in quick picks
    is_active BOOLEAN DEFAULT true,
    requires_diagnosis BOOLEAN DEFAULT false,
    mileage_interval INTEGER,             -- Recommended every X miles
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service Add-ons (upsells)
CREATE TABLE service_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    addon_service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    discount_percent DECIMAL(5,2) DEFAULT 0, -- Discount when bundled
    sort_order INTEGER DEFAULT 0,
    UNIQUE(service_id, addon_service_id)
);

-- ============================================================================
-- CUSTOMERS & VEHICLES
-- ============================================================================

-- Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    phone_normalized VARCHAR(20) NOT NULL, -- E.164 format for matching
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    preferred_contact VARCHAR(20) DEFAULT 'phone', -- phone, email, text
    marketing_opt_in BOOLEAN DEFAULT false,
    notes TEXT,
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    last_visit_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(phone_normalized)
);

-- Vehicles
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    year INTEGER,
    make VARCHAR(50),
    model VARCHAR(100),
    trim VARCHAR(50),
    engine VARCHAR(50),
    vin VARCHAR(17),
    license_plate VARCHAR(20),
    color VARCHAR(30),
    mileage INTEGER,
    mileage_updated_at TIMESTAMPTZ,
    is_primary BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicle Service History (for reference, populated from completed appointments)
CREATE TABLE vehicle_service_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id),
    appointment_id UUID,                  -- Link to appointment if available
    service_date DATE NOT NULL,
    mileage_at_service INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- APPOINTMENTS & SCHEDULING
-- ============================================================================

-- Appointment Status
CREATE TYPE appointment_status AS ENUM (
    'scheduled',      -- Booked, awaiting confirmation
    'confirmed',      -- Customer confirmed
    'checked_in',     -- Customer arrived
    'in_progress',    -- Work started
    'completed',      -- Work finished
    'cancelled',      -- Cancelled by customer or shop
    'no_show'         -- Customer didn't show
);

-- Appointments
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    vehicle_id UUID REFERENCES vehicles(id),
    
    -- Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    estimated_duration_minutes INTEGER NOT NULL,
    estimated_end_time TIME GENERATED ALWAYS AS (
        scheduled_time + (estimated_duration_minutes || ' minutes')::INTERVAL
    ) STORED,
    
    -- Assignment
    bay_id UUID REFERENCES service_bays(id),
    technician_id UUID REFERENCES technicians(id),
    
    -- Status
    status appointment_status DEFAULT 'scheduled',
    
    -- Customer requests
    loaner_requested BOOLEAN DEFAULT false,
    shuttle_requested BOOLEAN DEFAULT false,
    waiter BOOLEAN DEFAULT false,         -- Customer waiting on site
    customer_notes TEXT,
    
    -- Internal
    internal_notes TEXT,
    quoted_total DECIMAL(10,2),
    final_total DECIMAL(10,2),
    
    -- Tracking
    created_by VARCHAR(50) DEFAULT 'ai_agent', -- ai_agent, dashboard, phone, web
    call_id VARCHAR(100),                 -- Nucleus call ID
    confirmation_sent_at TIMESTAMPTZ,
    reminder_sent_at TIMESTAMPTZ,
    checked_in_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointment Services (services included in appointment)
CREATE TABLE appointment_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id),
    service_name VARCHAR(150),            -- Denormalized for history
    quoted_price DECIMAL(10,2),
    final_price DECIMAL(10,2),
    duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TIME SLOTS & AVAILABILITY
-- ============================================================================

-- Pre-generated time slots for efficient availability queries
-- This table is populated by a scheduled job for the booking window
CREATE TABLE time_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    bay_id UUID REFERENCES service_bays(id) ON DELETE CASCADE,
    
    -- Availability
    is_available BOOLEAN DEFAULT true,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    
    -- Blocking
    blocked_reason VARCHAR(100),          -- lunch, meeting, maintenance, holiday
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Composite unique constraint
    UNIQUE(slot_date, start_time, bay_id)
);

-- Create index for fast availability queries
CREATE INDEX idx_time_slots_availability 
ON time_slots(slot_date, is_available, bay_id) 
WHERE is_available = true;

CREATE INDEX idx_time_slots_date_bay 
ON time_slots(slot_date, bay_id);

-- ============================================================================
-- CALL LOGS & ANALYTICS
-- ============================================================================

-- Call Outcomes
CREATE TYPE call_outcome AS ENUM (
    'booked',           -- Appointment was booked
    'rescheduled',      -- Existing appointment rescheduled
    'cancelled',        -- Appointment cancelled
    'inquiry',          -- Information only, no booking
    'transferred',      -- Transferred to human
    'abandoned',        -- Caller hung up
    'voicemail',        -- Left voicemail
    'wrong_number',     -- Wrong number/not for service
    'callback_requested' -- Customer requested callback
);

-- Call Logs
CREATE TABLE call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retell_call_id VARCHAR(100) UNIQUE,
    
    -- Call details
    phone_number VARCHAR(20),
    phone_normalized VARCHAR(20),
    customer_id UUID REFERENCES customers(id),
    direction VARCHAR(10) DEFAULT 'inbound', -- inbound, outbound
    
    -- Timing
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Outcome
    outcome call_outcome,
    appointment_id UUID REFERENCES appointments(id),
    
    -- Content
    transcript TEXT,
    transcript_summary TEXT,
    recording_url VARCHAR(500),
    
    -- Analysis
    sentiment VARCHAR(20),                -- positive, neutral, negative
    intent_detected VARCHAR(50),          -- book, reschedule, cancel, inquiry
    services_discussed TEXT[],
    
    -- Metadata
    agent_id VARCHAR(100),                -- Nucleus agent ID
    llm_model VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_logs_phone ON call_logs(phone_normalized);
CREATE INDEX idx_call_logs_date ON call_logs(started_at);

-- ============================================================================
-- ANALYTICS VIEWS
-- ============================================================================

-- Daily appointment summary view
CREATE VIEW v_daily_appointments AS
SELECT 
    scheduled_date,
    COUNT(*) as total_appointments,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
    COUNT(*) FILTER (WHERE status = 'no_show') as no_shows,
    COUNT(*) FILTER (WHERE created_by = 'ai_agent') as booked_by_ai,
    SUM(final_total) as revenue
FROM appointments
GROUP BY scheduled_date;

-- Bay utilization view
CREATE VIEW v_bay_utilization AS
SELECT 
    sb.id as bay_id,
    sb.name as bay_name,
    sb.bay_type,
    ts.slot_date,
    COUNT(*) as total_slots,
    COUNT(*) FILTER (WHERE ts.is_available = false) as booked_slots,
    ROUND(
        COUNT(*) FILTER (WHERE ts.is_available = false)::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 1
    ) as utilization_percent
FROM service_bays sb
JOIN time_slots ts ON ts.bay_id = sb.id
WHERE sb.is_active = true
GROUP BY sb.id, sb.name, sb.bay_type, ts.slot_date;

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to normalize phone numbers to E.164
CREATE OR REPLACE FUNCTION normalize_phone(phone VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    cleaned VARCHAR;
BEGIN
    -- Remove all non-numeric characters
    cleaned := regexp_replace(phone, '[^0-9]', '', 'g');
    
    -- If 10 digits, assume North American and add +1
    IF length(cleaned) = 10 THEN
        RETURN '+1' || cleaned;
    -- If 11 digits starting with 1, add +
    ELSIF length(cleaned) = 11 AND cleaned LIKE '1%' THEN
        RETURN '+' || cleaned;
    -- Otherwise return as-is with +
    ELSE
        RETURN '+' || cleaned;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-normalize phone on customer insert/update
CREATE OR REPLACE FUNCTION customer_phone_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.phone_normalized := normalize_phone(NEW.phone);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customer_phone
BEFORE INSERT OR UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION customer_phone_trigger();

-- Trigger to update time slot when appointment is booked
CREATE OR REPLACE FUNCTION appointment_slot_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- When appointment is created or updated, mark slots as unavailable
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
        -- Free up old slots if rescheduling
        IF TG_OP = 'UPDATE' THEN
            UPDATE time_slots 
            SET is_available = true, appointment_id = NULL
            WHERE appointment_id = OLD.id;
        END IF;
        
        -- Book new slots (if not cancelled)
        IF NEW.status NOT IN ('cancelled', 'no_show') THEN
            UPDATE time_slots
            SET is_available = false, appointment_id = NEW.id
            WHERE bay_id = NEW.bay_id
              AND slot_date = NEW.scheduled_date
              AND start_time >= NEW.scheduled_time
              AND start_time < NEW.estimated_end_time;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_appointment_slots
AFTER INSERT OR UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION appointment_slot_trigger();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_appointments_updated
BEFORE UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_vehicles_updated
BEFORE UPDATE ON vehicles
FOR EACH ROW EXECUTE FUNCTION update_timestamp();
