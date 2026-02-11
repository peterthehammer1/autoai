-- SMS Conversations table for multi-step SMS flows (e.g. reschedule slot selection)
CREATE TABLE IF NOT EXISTS sms_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    phone VARCHAR(20) NOT NULL,
    state VARCHAR(50) NOT NULL,           -- 'awaiting_reschedule_choice'
    context JSONB NOT NULL DEFAULT '{}',  -- { appointment_id, service_ids, duration_minutes, slots: [...] }
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_conversations_phone ON sms_conversations(phone) WHERE expires_at > NOW();

-- Add direction column to sms_logs for tracking inbound messages
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS direction VARCHAR(10) DEFAULT 'outbound';
