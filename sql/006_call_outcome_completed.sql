-- Add 'completed' to call_outcome enum so webhook can set outcome for successful calls without a booking
-- Run this if your call_logs table uses the call_outcome enum and you get errors on outcome = 'completed'

-- Add 'completed' to call_outcome (run once; ignore error if value already exists)
ALTER TYPE call_outcome ADD VALUE 'completed';
