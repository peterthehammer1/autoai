-- =============================================================================
-- DIAGNOSTIC: What's already set up in this database?
-- Run this in Supabase SQL Editor. Copy the result and share it.
-- Use it to decide which migration files (001–007) you still need to run.
--
-- If this query errors (e.g. "relation business_config does not exist"):
--   Run 001_schema.sql first, then 002_seed_data.sql, then run this again.
-- =============================================================================

SELECT
  migration_file,
  check_description,
  present,
  CASE WHEN present THEN 'SKIP (already applied)' ELSE 'RUN this migration' END AS action
FROM (
  -- 001_schema.sql (core tables)
  SELECT '001_schema.sql' AS migration_file, 'table: business_config' AS check_description,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_config') AS present
  UNION ALL
  SELECT '001_schema.sql', 'table: call_logs',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'call_logs')
  UNION ALL
  SELECT '001_schema.sql', 'table: appointments',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments')
  UNION ALL
  SELECT '001_schema.sql', 'table: customers',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers')
  UNION ALL
  SELECT '001_schema.sql', 'table: time_slots',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_slots')
  UNION ALL
  -- 002_seed_data.sql (only check if business_config exists to avoid error on fresh DB)
  SELECT '002_seed_data.sql', 'seed: business_config has row(s)',
    EXISTS (SELECT 1 FROM business_config LIMIT 1)
  UNION ALL
  -- 003_add_reminder_sent.sql
  SELECT '003_add_reminder_sent.sql', 'column: appointments.reminder_sent',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'reminder_sent')
  UNION ALL
  -- 004_sms_logs.sql
  SELECT '004_sms_logs.sql', 'table: sms_logs',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sms_logs')
  UNION ALL
  -- 005_email_logs.sql
  SELECT '005_email_logs.sql', 'table: email_logs',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_logs')
  UNION ALL
  -- 006_call_outcome_completed.sql (enum value)
  SELECT '006_call_outcome_completed.sql', 'enum: call_outcome has value ''completed''',
    EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'call_outcome' AND e.enumlabel = 'completed'
    )
  UNION ALL
  -- 007_tow_requests.sql
  SELECT '007_tow_requests.sql', 'table: tow_requests',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tow_requests')
) AS checks
ORDER BY migration_file, check_description;
