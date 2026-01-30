-- Add reminder_sent column to appointments table
-- This tracks whether the 24-hour reminder SMS has been sent

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying of pending reminders
CREATE INDEX IF NOT EXISTS idx_appointments_reminder 
ON appointments(scheduled_date, status, reminder_sent) 
WHERE status IN ('scheduled', 'confirmed');

-- Comment for documentation
COMMENT ON COLUMN appointments.reminder_sent IS 'Whether the 24-hour SMS reminder has been sent';
