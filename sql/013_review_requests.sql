-- P3-5: Reputation Management — review_requests + settings tables
-- Run in Supabase SQL Editor

-- Review requests tracking table
CREATE TABLE review_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    appointment_id UUID REFERENCES appointments(id),
    channel VARCHAR(20) DEFAULT 'sms',
    review_type VARCHAR(20) DEFAULT 'google',       -- google | internal_feedback
    review_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending',            -- pending, sent, clicked, completed, skipped, failed
    skip_reason VARCHAR(100),                        -- no_phone, opted_out, already_sent, no_review_url
    sent_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    rating INTEGER,
    sms_log_id UUID REFERENCES sms_logs(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_review_requests_customer ON review_requests(customer_id);
CREATE INDEX idx_review_requests_appointment ON review_requests(appointment_id);
CREATE INDEX idx_review_requests_status ON review_requests(status);
CREATE INDEX idx_review_requests_sent_at ON review_requests(sent_at DESC);

-- Reusable key-value settings table
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
    ('review_google_url', ''),
    ('review_auto_send', 'true'),
    ('review_delay_hours', '0'),
    ('review_dedup_days', '30')
ON CONFLICT (key) DO NOTHING;
