-- 011: Add soft-delete support for appointments
-- Preserves failed booking attempts for audit trail instead of hard-deleting

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient filtering of non-deleted appointments
CREATE INDEX IF NOT EXISTS idx_appointments_deleted_at ON appointments(deleted_at) WHERE deleted_at IS NULL;

-- Add 'booking_failed' as a valid status for failed atomic booking rollbacks
COMMENT ON COLUMN appointments.deleted_at IS 'Soft-delete timestamp. Non-null means record is logically deleted.';
