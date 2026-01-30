-- SMS Logs table to track all outgoing messages
CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Message details
    to_phone VARCHAR(20) NOT NULL,
    from_phone VARCHAR(20) NOT NULL,
    message_body TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL, -- 'confirmation', 'reminder', 'custom'
    
    -- Twilio response
    twilio_sid VARCHAR(50),
    status VARCHAR(20) DEFAULT 'queued', -- queued, sent, delivered, failed
    error_message TEXT,
    
    -- Related records
    customer_id UUID REFERENCES customers(id),
    appointment_id UUID REFERENCES appointments(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_customer ON sms_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_type ON sms_logs(message_type);

-- Comment
COMMENT ON TABLE sms_logs IS 'Log of all SMS messages sent through the system';
