-- 010: Atomic slot booking functions to prevent double-booking race conditions
-- book_appointment_slots: Locks rows with FOR UPDATE, checks availability, then books
-- free_appointment_slots: Releases all slots for an appointment

CREATE OR REPLACE FUNCTION book_appointment_slots(
    p_bay_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_duration_minutes INTEGER,
    p_appointment_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_slots_needed INTEGER;
    v_available_count INTEGER;
    v_slot_times TIME[];
    v_i INTEGER;
BEGIN
    v_slots_needed := CEIL(p_duration_minutes / 30.0);

    -- Build array of required slot start times
    v_slot_times := ARRAY[]::TIME[];
    FOR v_i IN 0..(v_slots_needed - 1) LOOP
        v_slot_times := array_append(v_slot_times, p_start_time + (v_i * INTERVAL '30 minutes'));
    END LOOP;

    -- Lock matching rows first (FOR UPDATE prevents concurrent booking),
    -- then count them separately (FOR UPDATE can't be used with aggregates)
    PERFORM id
    FROM time_slots
    WHERE bay_id = p_bay_id
      AND slot_date = p_date
      AND start_time = ANY(v_slot_times)
      AND is_available = true
    FOR UPDATE;

    SELECT COUNT(*) INTO v_available_count
    FROM time_slots
    WHERE bay_id = p_bay_id
      AND slot_date = p_date
      AND start_time = ANY(v_slot_times)
      AND is_available = true;

    IF v_available_count < v_slots_needed THEN
        RETURN jsonb_build_object('success', false, 'error', 'slots_unavailable',
            'needed', v_slots_needed, 'available', v_available_count);
    END IF;

    -- Mark slots as booked
    UPDATE time_slots
    SET is_available = false, appointment_id = p_appointment_id
    WHERE bay_id = p_bay_id
      AND slot_date = p_date
      AND start_time = ANY(v_slot_times)
      AND is_available = true;

    RETURN jsonb_build_object('success', true, 'slots_booked', v_slots_needed);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION free_appointment_slots(p_appointment_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE time_slots
    SET is_available = true, appointment_id = NULL
    WHERE appointment_id = p_appointment_id;
END;
$$ LANGUAGE plpgsql;
