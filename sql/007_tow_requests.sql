-- Tow-in / towing service requests
-- Stores pickup location so the tow truck knows where to get the vehicle
-- Safe to run multiple times (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS tow_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    vehicle_id UUID REFERENCES vehicles(id),
    call_id VARCHAR(100),                    -- Retell call_id for reference

    -- Pickup location (where the car is / where tow truck goes)
    pickup_address_line1 VARCHAR(200) NOT NULL,
    pickup_address_line2 VARCHAR(200),
    pickup_city VARCHAR(100) NOT NULL,
    pickup_state VARCHAR(50) NOT NULL,
    pickup_zip VARCHAR(20) NOT NULL,
    pickup_notes TEXT,                      -- Cross street, landmark, etc.

    -- Request details
    status VARCHAR(30) DEFAULT 'requested', -- requested, dispatched, en_route, completed, cancelled
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tow_requests_customer ON tow_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_tow_requests_status ON tow_requests(status);
CREATE INDEX IF NOT EXISTS idx_tow_requests_requested ON tow_requests(requested_at);

COMMENT ON TABLE tow_requests IS 'Tow-in requests; pickup address for tow truck';
