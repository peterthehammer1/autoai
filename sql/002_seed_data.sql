-- Auto Service Booking System - Seed Data
-- Large Auto Service Center Configuration

-- ============================================================================
-- BUSINESS CONFIGURATION
-- ============================================================================

INSERT INTO business_config (
    name, phone, email, 
    address_line1, city, state, zip,
    timezone, primary_color, secondary_color,
    slot_duration_minutes, booking_lead_time_hours, booking_window_days
) VALUES (
    'Premier Auto Service Center',
    '(555) 123-4567',
    'service@premierauto.com',
    '1250 Industrial Boulevard',
    'Automotive City', 'ON', 'N2N 3P4',
    'America/Toronto',
    '#1e3a5f', '#3b82f6',
    30, 2, 60
);

-- ============================================================================
-- SERVICE BAYS (12 bays for a large center)
-- ============================================================================

INSERT INTO service_bays (name, bay_type, description, sort_order) VALUES
-- Quick Service (4 bays)
('Quick Lube 1', 'quick_service', 'Oil changes, filters, fluid top-offs', 1),
('Quick Lube 2', 'quick_service', 'Oil changes, filters, fluid top-offs', 2),
('Express 1', 'express_lane', 'Walk-in services, wipers, bulbs', 3),
('Express 2', 'express_lane', 'Walk-in services, wipers, bulbs', 4),

-- General Service (4 bays)
('Service Bay 1', 'general_service', 'Brakes, tires, batteries, general maintenance', 5),
('Service Bay 2', 'general_service', 'Brakes, tires, batteries, general maintenance', 6),
('Service Bay 3', 'general_service', 'Brakes, tires, batteries, general maintenance', 7),
('Service Bay 4', 'general_service', 'Brakes, tires, batteries, general maintenance', 8),

-- Specialty Bays (4 bays)
('Alignment Bay', 'alignment', 'Wheel alignment and suspension', 9),
('Diagnostic Bay', 'diagnostic', 'Computer diagnostics, electrical', 10),
('Heavy Repair 1', 'heavy_repair', 'Engine, transmission, major repairs', 11),
('Heavy Repair 2', 'heavy_repair', 'Engine, transmission, major repairs', 12);

-- ============================================================================
-- TECHNICIANS (10 technicians)
-- ============================================================================

INSERT INTO technicians (employee_id, first_name, last_name, email, phone, skill_level, certifications) VALUES
('TECH001', 'Mike', 'Rodriguez', 'mike.r@premierauto.com', '555-0101', 'master', ARRAY['ASE Master', 'Toyota Certified', 'Honda Certified']),
('TECH002', 'Sarah', 'Chen', 'sarah.c@premierauto.com', '555-0102', 'senior', ARRAY['ASE A1-A8', 'Brake Specialist']),
('TECH003', 'James', 'Williams', 'james.w@premierauto.com', '555-0103', 'senior', ARRAY['ASE A1-A8', 'Alignment Specialist']),
('TECH004', 'Emily', 'Martinez', 'emily.m@premierauto.com', '555-0104', 'intermediate', ARRAY['ASE A1-A4', 'Oil Tech Certified']),
('TECH005', 'David', 'Thompson', 'david.t@premierauto.com', '555-0105', 'intermediate', ARRAY['ASE A1-A4']),
('TECH006', 'Lisa', 'Anderson', 'lisa.a@premierauto.com', '555-0106', 'senior', ARRAY['ASE A1-A8', 'Electrical Specialist']),
('TECH007', 'Robert', 'Taylor', 'robert.t@premierauto.com', '555-0107', 'master', ARRAY['ASE Master', 'Transmission Specialist']),
('TECH008', 'Jennifer', 'Brown', 'jennifer.b@premierauto.com', '555-0108', 'intermediate', ARRAY['ASE A1-A4']),
('TECH009', 'Chris', 'Davis', 'chris.d@premierauto.com', '555-0109', 'junior', ARRAY['ASE A1']),
('TECH010', 'Amanda', 'Wilson', 'amanda.w@premierauto.com', '555-0110', 'junior', ARRAY['ASE A1']);

-- ============================================================================
-- TECHNICIAN-BAY ASSIGNMENTS
-- ============================================================================

-- Quick service techs
INSERT INTO technician_bay_assignments (technician_id, bay_id, is_primary)
SELECT t.id, b.id, true
FROM technicians t, service_bays b
WHERE t.employee_id IN ('TECH004', 'TECH005', 'TECH009', 'TECH010')
AND b.bay_type IN ('quick_service', 'express_lane');

-- General service techs
INSERT INTO technician_bay_assignments (technician_id, bay_id, is_primary)
SELECT t.id, b.id, true
FROM technicians t, service_bays b
WHERE t.employee_id IN ('TECH002', 'TECH005', 'TECH008')
AND b.bay_type = 'general_service';

-- Alignment specialist
INSERT INTO technician_bay_assignments (technician_id, bay_id, is_primary)
SELECT t.id, b.id, true
FROM technicians t, service_bays b
WHERE t.employee_id = 'TECH003'
AND b.bay_type = 'alignment';

-- Diagnostic specialist
INSERT INTO technician_bay_assignments (technician_id, bay_id, is_primary)
SELECT t.id, b.id, true
FROM technicians t, service_bays b
WHERE t.employee_id = 'TECH006'
AND b.bay_type = 'diagnostic';

-- Heavy repair (masters)
INSERT INTO technician_bay_assignments (technician_id, bay_id, is_primary)
SELECT t.id, b.id, true
FROM technicians t, service_bays b
WHERE t.employee_id IN ('TECH001', 'TECH007')
AND b.bay_type = 'heavy_repair';

-- ============================================================================
-- TECHNICIAN SCHEDULES (Mon-Fri 7-6, Sat 8-4)
-- ============================================================================

-- Monday through Friday (days 1-5)
INSERT INTO technician_schedules (technician_id, day_of_week, start_time, end_time)
SELECT t.id, d.day, '07:00'::TIME, '18:00'::TIME
FROM technicians t
CROSS JOIN (SELECT generate_series(1, 5) as day) d
WHERE t.employee_id IN ('TECH001', 'TECH002', 'TECH003', 'TECH004', 'TECH005', 'TECH006', 'TECH007', 'TECH008');

-- Saturday (day 6) - reduced staff
INSERT INTO technician_schedules (technician_id, day_of_week, start_time, end_time)
SELECT t.id, 6, '08:00'::TIME, '16:00'::TIME
FROM technicians t
WHERE t.employee_id IN ('TECH001', 'TECH004', 'TECH006', 'TECH009');

-- Junior techs work different hours
INSERT INTO technician_schedules (technician_id, day_of_week, start_time, end_time)
SELECT t.id, d.day, '08:00'::TIME, '17:00'::TIME
FROM technicians t
CROSS JOIN (SELECT generate_series(1, 5) as day) d
WHERE t.employee_id IN ('TECH009', 'TECH010');

-- ============================================================================
-- SERVICE CATEGORIES
-- ============================================================================

INSERT INTO service_categories (name, description, sort_order) VALUES
('Oil & Fluids', 'Oil changes, fluid services, and filters', 1),
('Tires & Wheels', 'Tire services, rotation, and alignment', 2),
('Brakes', 'Brake inspection, pads, rotors, and fluid', 3),
('Battery & Electrical', 'Battery, alternator, and electrical systems', 4),
('Engine & Transmission', 'Engine maintenance and transmission services', 5),
('Heating & Cooling', 'A/C, heating, and coolant services', 6),
('Inspection & Diagnostic', 'Vehicle inspections and diagnostics', 7),
('Scheduled Maintenance', 'Manufacturer recommended services', 8);

-- ============================================================================
-- SERVICES
-- ============================================================================

-- Oil & Fluids
INSERT INTO services (category_id, name, description, duration_minutes, price_min, price_max, price_display, required_bay_type, required_skill_level, is_popular, mileage_interval, sort_order)
SELECT c.id, s.name, s.description, s.duration, s.price_min, s.price_max, s.price_display, s.bay_type::bay_type, s.skill::skill_level, s.popular, s.mileage, s.sort
FROM service_categories c
CROSS JOIN (VALUES
    ('Conventional Oil Change', 'Up to 5 quarts conventional oil, new filter, fluid top-off', 30, 39.99, 54.99, '$39-55', 'quick_service', 'junior', true, 5000, 1),
    ('Synthetic Blend Oil Change', 'Up to 5 quarts synthetic blend oil, premium filter', 30, 59.99, 74.99, '$60-75', 'quick_service', 'junior', true, 7500, 2),
    ('Full Synthetic Oil Change', 'Up to 5 quarts full synthetic oil, premium filter', 45, 79.99, 99.99, '$80-100', 'quick_service', 'junior', true, 10000, 3),
    ('High Mileage Oil Change', 'Synthetic blend for vehicles over 75K miles', 45, 69.99, 84.99, '$70-85', 'quick_service', 'junior', false, 5000, 4),
    ('Diesel Oil Change', 'Diesel engine oil and filter service', 60, 89.99, 129.99, '$90-130', 'general_service', 'intermediate', false, 7500, 5),
    ('Transmission Fluid Exchange', 'Complete transmission fluid replacement', 60, 149.99, 199.99, '$150-200', 'general_service', 'intermediate', false, 50000, 6),
    ('Brake Fluid Flush', 'Complete brake fluid replacement', 45, 89.99, 119.99, '$90-120', 'general_service', 'intermediate', false, 30000, 7),
    ('Power Steering Fluid Flush', 'Complete power steering fluid replacement', 45, 79.99, 99.99, '$80-100', 'general_service', 'intermediate', false, 50000, 8)
) AS s(name, description, duration, price_min, price_max, price_display, bay_type, skill, popular, mileage, sort)
WHERE c.name = 'Oil & Fluids';

-- Tires & Wheels
INSERT INTO services (category_id, name, description, duration_minutes, price_min, price_max, price_display, required_bay_type, required_skill_level, is_popular, sort_order)
SELECT c.id, s.name, s.description, s.duration, s.price_min, s.price_max, s.price_display, s.bay_type::bay_type, s.skill::skill_level, s.popular, s.sort
FROM service_categories c
CROSS JOIN (VALUES
    ('Tire Rotation', 'Rotate tires for even wear', 30, 29.99, 39.99, '$30-40', 'quick_service', 'junior', true, 1),
    ('Tire Balance', 'Balance all four wheels', 45, 49.99, 69.99, '$50-70', 'general_service', 'junior', false, 2),
    ('Tire Rotation & Balance', 'Rotation plus balancing all four', 60, 69.99, 89.99, '$70-90', 'general_service', 'junior', true, 3),
    ('Flat Tire Repair', 'Patch or plug tire repair', 30, 25.99, 35.99, '$26-36', 'general_service', 'junior', false, 4),
    ('Wheel Alignment - 2 Wheel', 'Front or rear wheel alignment', 60, 69.99, 89.99, '$70-90', 'alignment', 'intermediate', false, 5),
    ('Wheel Alignment - 4 Wheel', 'Full four-wheel alignment', 90, 99.99, 129.99, '$100-130', 'alignment', 'intermediate', true, 6),
    ('TPMS Sensor Service', 'Tire pressure monitoring system service', 30, 39.99, 79.99, '$40-80 per sensor', 'general_service', 'intermediate', false, 7)
) AS s(name, description, duration, price_min, price_max, price_display, bay_type, skill, popular, sort)
WHERE c.name = 'Tires & Wheels';

-- Brakes
INSERT INTO services (category_id, name, description, duration_minutes, price_min, price_max, price_display, required_bay_type, required_skill_level, is_popular, sort_order)
SELECT c.id, s.name, s.description, s.duration, s.price_min, s.price_max, s.price_display, s.bay_type::bay_type, s.skill::skill_level, s.popular, s.sort
FROM service_categories c
CROSS JOIN (VALUES
    ('Brake Inspection', 'Visual inspection of brake system', 30, 0, 0, 'FREE', 'general_service', 'junior', true, 1),
    ('Front Brake Pads', 'Replace front brake pads', 90, 149.99, 249.99, '$150-250', 'general_service', 'intermediate', true, 2),
    ('Rear Brake Pads', 'Replace rear brake pads', 90, 149.99, 249.99, '$150-250', 'general_service', 'intermediate', true, 3),
    ('Front Brake Pads & Rotors', 'Replace front pads and resurface/replace rotors', 120, 299.99, 449.99, '$300-450', 'general_service', 'intermediate', false, 4),
    ('Rear Brake Pads & Rotors', 'Replace rear pads and resurface/replace rotors', 120, 299.99, 449.99, '$300-450', 'general_service', 'intermediate', false, 5),
    ('Complete Brake Service', 'All four wheels - pads and rotors', 180, 549.99, 799.99, '$550-800', 'general_service', 'senior', false, 6)
) AS s(name, description, duration, price_min, price_max, price_display, bay_type, skill, popular, sort)
WHERE c.name = 'Brakes';

-- Battery & Electrical
INSERT INTO services (category_id, name, description, duration_minutes, price_min, price_max, price_display, required_bay_type, required_skill_level, is_popular, sort_order)
SELECT c.id, s.name, s.description, s.duration, s.price_min, s.price_max, s.price_display, s.bay_type::bay_type, s.skill::skill_level, s.popular, s.sort
FROM service_categories c
CROSS JOIN (VALUES
    ('Battery Test', 'Test battery and charging system', 15, 0, 0, 'FREE', 'express_lane', 'junior', true, 1),
    ('Battery Replacement', 'Install new battery', 30, 129.99, 249.99, '$130-250', 'express_lane', 'junior', true, 2),
    ('Alternator Test', 'Test alternator output', 30, 0, 0, 'FREE with battery test', 'express_lane', 'junior', false, 3),
    ('Alternator Replacement', 'Replace alternator', 120, 299.99, 549.99, '$300-550', 'general_service', 'intermediate', false, 4),
    ('Starter Replacement', 'Replace starter motor', 120, 249.99, 449.99, '$250-450', 'general_service', 'intermediate', false, 5),
    ('Electrical Diagnosis', 'Diagnose electrical issues', 60, 99.99, 149.99, '$100-150', 'diagnostic', 'senior', false, 6)
) AS s(name, description, duration, price_min, price_max, price_display, bay_type, skill, popular, sort)
WHERE c.name = 'Battery & Electrical';

-- Engine & Transmission
INSERT INTO services (category_id, name, description, duration_minutes, price_min, price_max, price_display, required_bay_type, required_skill_level, is_popular, sort_order, requires_diagnosis)
SELECT c.id, s.name, s.description, s.duration, s.price_min, s.price_max, s.price_display, s.bay_type::bay_type, s.skill::skill_level, s.popular, s.sort, s.diag
FROM service_categories c
CROSS JOIN (VALUES
    ('Air Filter Replacement', 'Replace engine air filter', 15, 29.99, 49.99, '$30-50', 'quick_service', 'junior', true, 1, false),
    ('Cabin Air Filter', 'Replace cabin/HVAC filter', 15, 39.99, 69.99, '$40-70', 'quick_service', 'junior', true, 2, false),
    ('Spark Plug Replacement - 4 Cyl', 'Replace spark plugs (4 cylinder)', 60, 99.99, 149.99, '$100-150', 'general_service', 'intermediate', false, 3, false),
    ('Spark Plug Replacement - 6 Cyl', 'Replace spark plugs (6 cylinder)', 90, 149.99, 249.99, '$150-250', 'general_service', 'intermediate', false, 4, false),
    ('Spark Plug Replacement - 8 Cyl', 'Replace spark plugs (8 cylinder)', 120, 199.99, 349.99, '$200-350', 'general_service', 'senior', false, 5, false),
    ('Engine Tune-Up', 'Comprehensive engine tune-up', 120, 199.99, 349.99, '$200-350', 'general_service', 'senior', false, 6, false),
    ('Timing Belt Replacement', 'Replace timing belt', 240, 499.99, 899.99, '$500-900', 'heavy_repair', 'master', false, 7, true),
    ('Engine Repair', 'Engine repair - diagnosis required', 240, 499.99, 2499.99, 'Quote after diagnosis', 'heavy_repair', 'master', false, 8, true),
    ('Transmission Repair', 'Transmission repair - diagnosis required', 240, 999.99, 3999.99, 'Quote after diagnosis', 'heavy_repair', 'master', false, 9, true)
) AS s(name, description, duration, price_min, price_max, price_display, bay_type, skill, popular, sort, diag)
WHERE c.name = 'Engine & Transmission';

-- Heating & Cooling
INSERT INTO services (category_id, name, description, duration_minutes, price_min, price_max, price_display, required_bay_type, required_skill_level, is_popular, sort_order)
SELECT c.id, s.name, s.description, s.duration, s.price_min, s.price_max, s.price_display, s.bay_type::bay_type, s.skill::skill_level, s.popular, s.sort
FROM service_categories c
CROSS JOIN (VALUES
    ('A/C Performance Check', 'Check A/C system performance', 30, 49.99, 69.99, '$50-70', 'general_service', 'intermediate', true, 1),
    ('A/C Recharge', 'Evacuate and recharge A/C system', 60, 99.99, 149.99, '$100-150', 'general_service', 'intermediate', true, 2),
    ('A/C Repair', 'Diagnose and repair A/C system', 120, 199.99, 799.99, 'Starting at $200', 'general_service', 'senior', false, 3),
    ('Coolant Flush', 'Complete cooling system flush', 60, 99.99, 149.99, '$100-150', 'general_service', 'intermediate', true, 4),
    ('Radiator Replacement', 'Replace radiator', 180, 399.99, 699.99, '$400-700', 'general_service', 'senior', false, 5),
    ('Thermostat Replacement', 'Replace thermostat', 60, 99.99, 199.99, '$100-200', 'general_service', 'intermediate', false, 6),
    ('Water Pump Replacement', 'Replace water pump', 180, 299.99, 599.99, '$300-600', 'general_service', 'senior', false, 7),
    ('Heater Core Repair', 'Heater core diagnosis and repair', 240, 499.99, 999.99, '$500-1000', 'heavy_repair', 'senior', false, 8)
) AS s(name, description, duration, price_min, price_max, price_display, bay_type, skill, popular, sort)
WHERE c.name = 'Heating & Cooling';

-- Inspection & Diagnostic
INSERT INTO services (category_id, name, description, duration_minutes, price_min, price_max, price_display, required_bay_type, required_skill_level, is_popular, sort_order)
SELECT c.id, s.name, s.description, s.duration, s.price_min, s.price_max, s.price_display, s.bay_type::bay_type, s.skill::skill_level, s.popular, s.sort
FROM service_categories c
CROSS JOIN (VALUES
    ('Check Engine Light Diagnosis', 'Diagnose check engine light codes', 60, 99.99, 149.99, '$100-150 (applied to repair)', 'diagnostic', 'senior', true, 1),
    ('Multi-Point Inspection', 'Comprehensive vehicle inspection', 45, 0, 0, 'FREE with service', 'general_service', 'junior', true, 2),
    ('Pre-Purchase Inspection', 'Inspection for used car purchase', 60, 99.99, 149.99, '$100-150', 'diagnostic', 'senior', false, 3),
    ('Safety Inspection', 'Provincial safety inspection', 45, 49.99, 79.99, '$50-80', 'general_service', 'intermediate', true, 4),
    ('Emissions Test', 'Emissions/smog test', 30, 29.99, 49.99, '$30-50', 'diagnostic', 'intermediate', false, 5)
) AS s(name, description, duration, price_min, price_max, price_display, bay_type, skill, popular, sort)
WHERE c.name = 'Inspection & Diagnostic';

-- Scheduled Maintenance
INSERT INTO services (category_id, name, description, duration_minutes, price_min, price_max, price_display, required_bay_type, required_skill_level, is_popular, mileage_interval, sort_order)
SELECT c.id, s.name, s.description, s.duration, s.price_min, s.price_max, s.price_display, s.bay_type::bay_type, s.skill::skill_level, s.popular, s.mileage, s.sort
FROM service_categories c
CROSS JOIN (VALUES
    ('15,000 KM Service', 'Oil change, tire rotation, inspection', 60, 149.99, 199.99, '$150-200', 'general_service', 'intermediate', false, 15000, 1),
    ('30,000 KM Service', 'Comprehensive 30K maintenance package', 120, 299.99, 399.99, '$300-400', 'general_service', 'intermediate', true, 30000, 2),
    ('60,000 KM Service', 'Major 60K maintenance package', 180, 449.99, 599.99, '$450-600', 'general_service', 'senior', true, 60000, 3),
    ('90,000 KM Service', 'Complete 90K maintenance package', 240, 599.99, 849.99, '$600-850', 'general_service', 'senior', true, 90000, 4),
    ('120,000 KM Service', 'Major service including timing belt check', 300, 799.99, 1199.99, '$800-1200', 'heavy_repair', 'master', false, 120000, 5)
) AS s(name, description, duration, price_min, price_max, price_display, bay_type, skill, popular, mileage, sort)
WHERE c.name = 'Scheduled Maintenance';

-- ============================================================================
-- SAMPLE CUSTOMERS
-- ============================================================================

INSERT INTO customers (phone, first_name, last_name, email, preferred_contact, total_visits, marketing_opt_in) VALUES
('555-234-5678', 'John', 'Smith', 'john.smith@email.com', 'text', 5, true),
('555-345-6789', 'Maria', 'Garcia', 'maria.g@email.com', 'email', 3, true),
('555-456-7890', 'Robert', 'Johnson', 'rjohnson@email.com', 'phone', 8, false),
('555-567-8901', 'Sarah', 'Williams', 'sarah.w@email.com', 'text', 2, true),
('555-678-9012', 'Michael', 'Brown', 'mbrown@email.com', 'phone', 12, true),
('555-789-0123', 'Jennifer', 'Davis', 'jdavis@email.com', 'email', 1, false),
('555-890-1234', 'David', 'Miller', 'david.miller@email.com', 'text', 6, true),
('555-901-2345', 'Lisa', 'Wilson', 'lwilson@email.com', 'phone', 4, true);

-- ============================================================================
-- SAMPLE VEHICLES
-- ============================================================================

INSERT INTO vehicles (customer_id, year, make, model, trim, color, mileage, license_plate, is_primary)
SELECT c.id, v.year, v.make, v.model, v.trim, v.color, v.mileage, v.plate, v.is_primary
FROM customers c
JOIN (VALUES
    ('555-234-5678', 2021, 'Honda', 'Accord', 'EX-L', 'White', 45000, 'ABC 1234', true),
    ('555-234-5678', 2019, 'Toyota', 'RAV4', 'XLE', 'Silver', 62000, 'DEF 5678', false),
    ('555-345-6789', 2022, 'Ford', 'F-150', 'XLT', 'Blue', 28000, 'GHI 9012', true),
    ('555-456-7890', 2020, 'Chevrolet', 'Equinox', 'LT', 'Black', 55000, 'JKL 3456', true),
    ('555-567-8901', 2023, 'Hyundai', 'Tucson', 'SEL', 'Red', 12000, 'MNO 7890', true),
    ('555-678-9012', 2018, 'BMW', '328i', 'Sport', 'Gray', 78000, 'PQR 1234', true),
    ('555-789-0123', 2021, 'Mazda', 'CX-5', 'Touring', 'Blue', 35000, 'STU 5678', true),
    ('555-890-1234', 2019, 'Nissan', 'Altima', 'SV', 'White', 48000, 'VWX 9012', true),
    ('555-901-2345', 2020, 'Jeep', 'Grand Cherokee', 'Limited', 'Black', 42000, 'YZA 3456', true)
) AS v(phone, year, make, model, trim, color, mileage, plate, is_primary)
ON c.phone = v.phone;

-- ============================================================================
-- GENERATE TIME SLOTS FOR NEXT 60 DAYS
-- ============================================================================

-- This creates 30-minute slots for each bay during business hours
-- Monday-Friday: 7:00 AM - 6:00 PM (22 slots per day)
-- Saturday: 8:00 AM - 4:00 PM (16 slots per day)
-- Sunday: Closed

INSERT INTO time_slots (slot_date, start_time, end_time, bay_id, is_available)
SELECT 
    d.date,
    t.slot_time,
    t.slot_time + INTERVAL '30 minutes',
    b.id,
    -- Randomly make some slots unavailable to simulate existing bookings (about 25% booked)
    CASE 
        WHEN random() < 0.25 AND d.date < CURRENT_DATE + INTERVAL '30 days' THEN false
        WHEN random() < 0.15 AND d.date >= CURRENT_DATE + INTERVAL '30 days' THEN false
        ELSE true
    END
FROM 
    -- Generate dates for next 60 days
    generate_series(
        CURRENT_DATE + INTERVAL '1 day',
        CURRENT_DATE + INTERVAL '60 days',
        INTERVAL '1 day'
    ) AS d(date)
CROSS JOIN 
    -- Generate time slots based on day of week
    (
        SELECT slot_time::TIME
        FROM generate_series(
            '07:00'::TIME,
            '17:30'::TIME,
            INTERVAL '30 minutes'
        ) AS slot_time
    ) AS t
CROSS JOIN 
    service_bays b
WHERE 
    b.is_active = true
    AND (
        -- Monday-Friday: 7:00 - 18:00
        (EXTRACT(DOW FROM d.date) BETWEEN 1 AND 5 AND t.slot_time >= '07:00' AND t.slot_time < '18:00')
        OR
        -- Saturday: 8:00 - 16:00
        (EXTRACT(DOW FROM d.date) = 6 AND t.slot_time >= '08:00' AND t.slot_time < '16:00')
    )
    -- Exclude Sundays
    AND EXTRACT(DOW FROM d.date) != 0;

-- Block lunch slots (12:00-13:00) for some bays to simulate real schedule
UPDATE time_slots
SET is_available = false, blocked_reason = 'lunch'
WHERE start_time >= '12:00' AND start_time < '13:00'
AND bay_id IN (
    SELECT id FROM service_bays WHERE bay_type IN ('general_service', 'heavy_repair')
)
AND random() < 0.5; -- 50% of these are blocked for lunch

-- ============================================================================
-- CREATE SOME SAMPLE APPOINTMENTS (for realism)
-- ============================================================================

-- Insert a few upcoming appointments
WITH upcoming_slots AS (
    SELECT ts.id, ts.slot_date, ts.start_time, ts.bay_id,
           ROW_NUMBER() OVER (ORDER BY random()) as rn
    FROM time_slots ts
    WHERE ts.is_available = false 
    AND ts.appointment_id IS NULL
    AND ts.slot_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
    AND ts.blocked_reason IS NULL
    LIMIT 15
),
sample_appointments AS (
    INSERT INTO appointments (
        customer_id, vehicle_id, scheduled_date, scheduled_time,
        estimated_duration_minutes, bay_id, status, created_by
    )
    SELECT 
        v.customer_id,
        v.id,
        us.slot_date,
        us.start_time,
        CASE (us.rn % 5)
            WHEN 0 THEN 30
            WHEN 1 THEN 60
            WHEN 2 THEN 90
            WHEN 3 THEN 45
            ELSE 30
        END,
        us.bay_id,
        CASE 
            WHEN us.slot_date = CURRENT_DATE THEN 'confirmed'
            ELSE 'scheduled'
        END,
        CASE WHEN random() < 0.7 THEN 'ai_agent' ELSE 'phone' END
    FROM upcoming_slots us
    CROSS JOIN LATERAL (
        SELECT id, customer_id FROM vehicles ORDER BY random() LIMIT 1
    ) v
    WHERE us.rn <= 10
    RETURNING id, bay_id, scheduled_date, scheduled_time, estimated_duration_minutes
)
UPDATE time_slots ts
SET appointment_id = sa.id, is_available = false
FROM sample_appointments sa
WHERE ts.bay_id = sa.bay_id
AND ts.slot_date = sa.scheduled_date
AND ts.start_time >= sa.scheduled_time
AND ts.start_time < (sa.scheduled_time + (sa.estimated_duration_minutes || ' minutes')::INTERVAL);

-- ============================================================================
-- ADD APPOINTMENT SERVICES TO SAMPLE APPOINTMENTS
-- ============================================================================

INSERT INTO appointment_services (appointment_id, service_id, service_name, quoted_price, duration_minutes)
SELECT 
    a.id,
    s.id,
    s.name,
    s.price_min + (random() * (s.price_max - s.price_min)),
    s.duration_minutes
FROM appointments a
CROSS JOIN LATERAL (
    SELECT id, name, price_min, price_max, duration_minutes 
    FROM services 
    WHERE is_active = true AND is_popular = true
    ORDER BY random() 
    LIMIT 1
) s
WHERE NOT EXISTS (
    SELECT 1 FROM appointment_services WHERE appointment_id = a.id
);

-- ============================================================================
-- SAMPLE CALL LOGS
-- ============================================================================

INSERT INTO call_logs (
    retell_call_id, phone_number, phone_normalized, customer_id,
    started_at, ended_at, duration_seconds, outcome, sentiment
)
SELECT 
    'call_' || gen_random_uuid()::text,
    c.phone,
    c.phone_normalized,
    c.id,
    NOW() - (random() * INTERVAL '7 days'),
    NOW() - (random() * INTERVAL '7 days') + (random() * INTERVAL '5 minutes'),
    (random() * 300)::INTEGER + 60,
    (ARRAY['booked', 'booked', 'booked', 'inquiry', 'transferred'])[floor(random() * 5 + 1)],
    (ARRAY['positive', 'positive', 'neutral', 'neutral', 'negative'])[floor(random() * 5 + 1)]
FROM customers c
ORDER BY random()
LIMIT 20;

-- Show summary
SELECT 'Schema and seed data created successfully!' as status;
SELECT 'Service Bays:' as entity, COUNT(*) as count FROM service_bays
UNION ALL SELECT 'Technicians:', COUNT(*) FROM technicians
UNION ALL SELECT 'Services:', COUNT(*) FROM services
UNION ALL SELECT 'Customers:', COUNT(*) FROM customers  
UNION ALL SELECT 'Vehicles:', COUNT(*) FROM vehicles
UNION ALL SELECT 'Time Slots (next 60 days):', COUNT(*) FROM time_slots
UNION ALL SELECT 'Available Slots:', COUNT(*) FROM time_slots WHERE is_available = true
UNION ALL SELECT 'Sample Appointments:', COUNT(*) FROM appointments;
