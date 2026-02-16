-- P3-2: Customer Portal — magic-link tokens
-- Run in Supabase SQL Editor

-- Add portal token columns to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_token VARCHAR(64) UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_token_expires_at TIMESTAMPTZ;

-- Partial index for fast token lookups (only rows with a token)
CREATE INDEX IF NOT EXISTS idx_customers_portal_token
  ON customers(portal_token)
  WHERE portal_token IS NOT NULL;
