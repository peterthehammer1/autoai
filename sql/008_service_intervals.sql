-- Add recommended service intervals (time-based) to services table
-- This complements the existing mileage_interval column

-- Add days_interval column if not exists
ALTER TABLE services ADD COLUMN IF NOT EXISTS days_interval INTEGER;

-- Update common services with recommended time intervals (in days)
-- Oil Changes: 6 months (180 days) or mileage, whichever comes first
UPDATE services SET days_interval = 180 WHERE name ILIKE '%oil change%';

-- Tire Rotation: 6 months (180 days)
UPDATE services SET days_interval = 180 WHERE name ILIKE '%tire rotation%';

-- Brake Fluid Flush: 2 years (730 days)
UPDATE services SET days_interval = 730 WHERE name ILIKE '%brake fluid%';

-- Transmission Fluid: 2-3 years (900 days)
UPDATE services SET days_interval = 900 WHERE name ILIKE '%transmission fluid%';

-- Coolant Flush: 2 years (730 days)
UPDATE services SET days_interval = 730 WHERE name ILIKE '%coolant%';

-- Power Steering Fluid: 2 years (730 days)
UPDATE services SET days_interval = 730 WHERE name ILIKE '%power steering%';

-- Air Filters: 1 year (365 days)
UPDATE services SET days_interval = 365 WHERE name ILIKE '%air filter%';

-- Spark Plugs: 2-3 years (900 days)
UPDATE services SET days_interval = 900 WHERE name ILIKE '%spark plug%';

-- Timing Belt: 5 years (1825 days) - but usually mileage-based
UPDATE services SET days_interval = 1825 WHERE name ILIKE '%timing belt%';

-- Battery: 3-4 years (1095 days)
UPDATE services SET days_interval = 1095 WHERE name ILIKE '%battery%' AND name NOT ILIKE '%test%';

-- Wiper Blades: 1 year (365 days)
UPDATE services SET days_interval = 365 WHERE name ILIKE '%wiper%';

-- Wheel Alignment: 1 year (365 days)
UPDATE services SET days_interval = 365 WHERE name ILIKE '%alignment%';

-- Comment: Services without intervals (inspections, diagnostics, repairs) don't need them
-- They are done as-needed, not on a schedule
