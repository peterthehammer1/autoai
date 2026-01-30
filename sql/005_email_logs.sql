-- Create email_logs table for tracking sent emails
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    to_email VARCHAR(255) NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    body TEXT,
    email_type VARCHAR(50) NOT NULL, -- 'confirmation', 'reminder', 'custom'
    resend_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'queued', -- queued, sent, delivered, failed
    error_message TEXT,
    customer_id UUID REFERENCES customers(id),
    appointment_id UUID REFERENCES appointments(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_customer_id ON email_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_appointment_id ON email_logs(appointment_id);
