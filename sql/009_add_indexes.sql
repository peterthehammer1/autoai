-- 009: Add missing performance indexes + fix appointment trigger for rescheduling
-- Safe to run multiple times (all use IF NOT EXISTS)

-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_appointments_customer_date ON appointments(customer_id, scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_tech_date ON appointments(technician_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_bay_date ON appointments(bay_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_customer_date ON call_logs(customer_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_bays_type_active ON service_bays(bay_type, is_active);
CREATE INDEX IF NOT EXISTS idx_time_slots_appointment ON time_slots(appointment_id) WHERE is_available = false;

-- Fix appointment trigger: also fire on date/time/bay changes (not just status)
-- Previously, rescheduling (same status, different time) did not free/rebook slots via trigger
CREATE OR REPLACE FUNCTION appointment_slot_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- New appointment: book slots
        IF NEW.status NOT IN ('cancelled', 'no_show') THEN
            UPDATE time_slots
            SET is_available = false, appointment_id = NEW.id
            WHERE bay_id = NEW.bay_id
              AND slot_date = NEW.scheduled_date
              AND start_time >= NEW.scheduled_time
              AND start_time < NEW.estimated_end_time;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check if scheduling details or status changed
        IF OLD.status != NEW.status
           OR OLD.scheduled_date != NEW.scheduled_date
           OR OLD.scheduled_time != NEW.scheduled_time
           OR OLD.bay_id IS DISTINCT FROM NEW.bay_id
        THEN
            -- Free old slots
            UPDATE time_slots
            SET is_available = true, appointment_id = NULL
            WHERE appointment_id = OLD.id;

            -- Book new slots (unless cancelled/no_show)
            IF NEW.status NOT IN ('cancelled', 'no_show') THEN
                UPDATE time_slots
                SET is_available = false, appointment_id = NEW.id
                WHERE bay_id = NEW.bay_id
                  AND slot_date = NEW.scheduled_date
                  AND start_time >= NEW.scheduled_time
                  AND start_time < NEW.estimated_end_time;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
