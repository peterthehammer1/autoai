-- ============================================================================
-- EXPANDED SERVICES - Additional common auto service center offerings
-- ============================================================================

-- Add new service categories if needed
INSERT INTO service_categories (name, description, sort_order) VALUES
('Steering & Suspension', 'Steering components and suspension services', 12),
('Exhaust System', 'Muffler, exhaust pipe, and catalytic converter services', 13),
('Engine Services', 'Tune-ups, timing belts, and engine maintenance', 14),
('Emissions & Inspections', 'Emissions testing and state inspections', 15),
('Lighting & Visibility', 'Headlights, fog lights, and visibility upgrades', 16)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- STEERING & SUSPENSION SERVICES
-- ============================================================================

INSERT INTO services (category_id, name, description, duration_minutes, price_min, price_max, price_display, required_bay_type, required_skill_level, is_popular, sort_order)
SELECT c.id, s.name, s.description, s.duration, s.price_min, s.price_max, s.price_display, s.bay_type::bay_type, s.skill::skill_level, s.popular, s.sort
FROM service_categories c
CROSS JOIN (VALUES
    ('Power Steering Flush', 'Complete power steering fluid replacement', 45, 89.99, 119.99, '$90-120', 'general_service', 'intermediate', false, 1),
    ('Power Steering Pump Replacement', 'Replace faulty power steering pump', 180, 299.99, 599.99, '$300-600', 'general_service', 'senior', false, 2),
    ('Steering Rack Replacement', 'Replace steering rack assembly', 240, 699.99, 1299.99, '$700-1300', 'alignment', 'senior', false, 3),
    ('Wheel Bearing Replacement', 'Replace worn wheel bearing (per wheel)', 120, 199.99, 399.99, '$200-400', 'general_service', 'intermediate', false, 4),
    ('Sway Bar Link Replacement', 'Replace sway bar end links', 60, 99.99, 199.99, '$100-200', 'general_service', 'intermediate', false, 5),
    ('Control Arm Replacement', 'Replace upper or lower control arm', 150, 249.99, 499.99, '$250-500', 'alignment', 'senior', false, 6),
    ('Bushing Replacement', 'Replace worn suspension bushings', 120, 149.99, 349.99, '$150-350', 'alignment', 'intermediate', false, 7)
) AS s(name, description, duration, price_min, price_max, price_display, bay_type, skill, popular, sort)
WHERE c.name = 'Steering & Suspension'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- EXHAUST SYSTEM SERVICES
-- ============================================================================

INSERT INTO services (category_id, name, description, duration_minutes, price_min, price_max, price_display, required_bay_type, required_skill_level, is_popular, sort_order)
SELECT c.id, s.name, s.description, s.duration, s.price_min, s.price_max, s.price_display, s.bay_type::bay_type, s.skill::skill_level, s.popular, s.sort
FROM service_categories c
CROSS JOIN (VALUES
    ('Exhaust Inspection', 'Inspect exhaust system for leaks and damage', 30, 0, 0, 'FREE', 'general_service', 'junior', false, 1),
    ('Muffler Replacement', 'Replace worn or damaged muffler', 90, 149.99, 349.99, '$150-350', 'general_service', 'intermediate', false, 2),
    ('Exhaust Pipe Repair', 'Repair or replace exhaust pipe section', 60, 99.99, 249.99, '$100-250', 'general_service', 'intermediate', false, 3),
    ('Catalytic Converter Replacement', 'Replace catalytic converter', 120, 599.99, 1999.99, '$600-2000', 'general_service', 'senior', false, 4),
    ('Oxygen Sensor Replacement', 'Replace O2 sensor', 60, 149.99, 299.99, '$150-300', 'general_service', 'intermediate', false, 5),
    ('Exhaust Manifold Repair', 'Repair or replace exhaust manifold', 180, 299.99, 699.99, '$300-700', 'general_service', 'senior', false, 6),
    ('Flex Pipe Replacement', 'Replace flexible exhaust pipe', 60, 149.99, 299.99, '$150-300', 'general_service', 'intermediate', false, 7)
) AS s(name, description, duration, price_min, price_max, price_display, bay_type, skill, popular, sort)
WHERE c.name = 'Exhaust System'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ENGINE SERVICES
-- ============================================================================

INSERT INTO services (category_id, name, description, duration_minutes, price_min, price_max, price_display, required_bay_type, required_skill_level, is_popular, sort_order)
SELECT c.id, s.name, s.description, s.duration, s.price_min, s.price_max, s.price_display, s.bay_type::bay_type, s.skill::skill_level, s.popular, s.sort
FROM service_categories c
CROSS JOIN (VALUES
    ('Spark Plug Replacement', 'Replace spark plugs (4-cylinder)', 60, 99.99, 199.99, '$100-200', 'general_service', 'intermediate', true, 1),
    ('Spark Plug Replacement (V6/V8)', 'Replace spark plugs (6+ cylinder)', 120, 149.99, 349.99, '$150-350', 'general_service', 'intermediate', false, 2),
    ('Ignition Coil Replacement', 'Replace faulty ignition coil', 60, 99.99, 249.99, '$100-250', 'general_service', 'intermediate', false, 3),
    ('Timing Belt Replacement', 'Replace timing belt and tensioner', 300, 499.99, 999.99, '$500-1000', 'general_service', 'senior', false, 4),
    ('Timing Chain Replacement', 'Replace timing chain and guides', 360, 699.99, 1499.99, '$700-1500', 'general_service', 'senior', false, 5),
    ('Water Pump Replacement', 'Replace engine water pump', 180, 249.99, 499.99, '$250-500', 'general_service', 'intermediate', false, 6),
    ('Thermostat Replacement', 'Replace engine thermostat', 60, 99.99, 199.99, '$100-200', 'general_service', 'intermediate', false, 7),
    ('Radiator Replacement', 'Replace radiator', 120, 299.99, 599.99, '$300-600', 'general_service', 'intermediate', false, 8),
    ('Radiator Hose Replacement', 'Replace upper or lower radiator hose', 45, 79.99, 149.99, '$80-150', 'general_service', 'junior', false, 9),
    ('Heater Hose Replacement', 'Replace heater hoses', 60, 89.99, 179.99, '$90-180', 'general_service', 'junior', false, 10),
    ('Engine Air Filter', 'Replace engine air filter', 15, 29.99, 59.99, '$30-60', 'quick_service', 'junior', true, 11),
    ('Cabin Air Filter', 'Replace cabin air filter', 15, 39.99, 69.99, '$40-70', 'quick_service', 'junior', true, 12),
    ('PCV Valve Replacement', 'Replace PCV valve', 30, 49.99, 99.99, '$50-100', 'general_service', 'junior', false, 13),
    ('Valve Cover Gasket', 'Replace valve cover gasket', 120, 149.99, 349.99, '$150-350', 'general_service', 'intermediate', false, 14),
    ('Intake Manifold Gasket', 'Replace intake manifold gasket', 180, 249.99, 499.99, '$250-500', 'general_service', 'senior', false, 15),
    ('Motor Mount Replacement', 'Replace engine or transmission mount', 120, 199.99, 399.99, '$200-400', 'general_service', 'intermediate', false, 16),
    ('Drive Belt Replacement', 'Replace serpentine/accessory belt', 45, 89.99, 149.99, '$90-150', 'general_service', 'junior', false, 17),
    ('Belt Tensioner Replacement', 'Replace belt tensioner', 60, 129.99, 249.99, '$130-250', 'general_service', 'intermediate', false, 18)
) AS s(name, description, duration, price_min, price_max, price_display, bay_type, skill, popular, sort)
WHERE c.name = 'Engine Services'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- EMISSIONS & INSPECTIONS
-- ============================================================================

INSERT INTO services (category_id, name, description, duration_minutes, price_min, price_max, price_display, required_bay_type, required_skill_level, is_popular, sort_order)
SELECT c.id, s.name, s.description, s.duration, s.price_min, s.price_max, s.price_display, s.bay_type::bay_type, s.skill::skill_level, s.popular, s.sort
FROM service_categories c
CROSS JOIN (VALUES
    ('Emissions Test', 'Ontario Drive Clean emissions test', 30, 29.99, 35.00, '$30-35', 'general_service', 'junior', true, 1),
    ('Safety Inspection', 'Ontario safety standards inspection', 60, 79.99, 99.99, '$80-100', 'general_service', 'intermediate', true, 2),
    ('Out of Province Inspection', 'Inspection for vehicles from other provinces', 90, 149.99, 199.99, '$150-200', 'general_service', 'intermediate', false, 3),
    ('Used Vehicle Inspection', 'Complete pre-purchase inspection', 60, 99.99, 149.99, '$100-150', 'general_service', 'intermediate', true, 4),
    ('Fleet Inspection', 'Commercial fleet vehicle inspection', 45, 69.99, 99.99, '$70-100', 'general_service', 'intermediate', false, 5),
    ('Lease Return Inspection', 'Pre-lease return inspection', 45, 79.99, 99.99, '$80-100', 'general_service', 'intermediate', false, 6)
) AS s(name, description, duration, price_min, price_max, price_display, bay_type, skill, popular, sort)
WHERE c.name = 'Emissions & Inspections'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- LIGHTING & VISIBILITY (Add to existing Quick Add-Ons or create category)
-- ============================================================================

INSERT INTO services (category_id, name, description, duration_minutes, price_min, price_max, price_display, required_bay_type, required_skill_level, is_popular, sort_order)
SELECT c.id, s.name, s.description, s.duration, s.price_min, s.price_max, s.price_display, s.bay_type::bay_type, s.skill::skill_level, s.popular, s.sort
FROM service_categories c
CROSS JOIN (VALUES
    ('Fog Light Bulb Replacement', 'Replace fog light bulb', 30, 39.99, 79.99, '$40-80', 'express_lane', 'junior', false, 20),
    ('Turn Signal Bulb Replacement', 'Replace turn signal bulb', 15, 19.99, 39.99, '$20-40', 'express_lane', 'junior', false, 21),
    ('Interior Light Replacement', 'Replace dome light or map light bulb', 15, 14.99, 29.99, '$15-30', 'express_lane', 'junior', false, 22),
    ('License Plate Light Replacement', 'Replace license plate light bulb', 15, 14.99, 29.99, '$15-30', 'express_lane', 'junior', false, 23),
    ('LED Headlight Upgrade', 'Upgrade to LED headlight bulbs', 30, 149.99, 299.99, '$150-300', 'express_lane', 'junior', false, 24),
    ('HID Bulb Replacement', 'Replace HID/Xenon headlight bulb', 45, 99.99, 199.99, '$100-200', 'express_lane', 'intermediate', false, 25)
) AS s(name, description, duration, price_min, price_max, price_display, bay_type, skill, popular, sort)
WHERE c.name = 'Quick Add-Ons'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ADDITIONAL HEATING & COOLING SERVICES
-- ============================================================================

INSERT INTO services (category_id, name, description, duration_minutes, price_min, price_max, price_display, required_bay_type, required_skill_level, is_popular, sort_order)
SELECT c.id, s.name, s.description, s.duration, s.price_min, s.price_max, s.price_display, s.bay_type::bay_type, s.skill::skill_level, s.popular, s.sort
FROM service_categories c
CROSS JOIN (VALUES
    ('A/C Compressor Replacement', 'Replace A/C compressor', 240, 599.99, 1199.99, '$600-1200', 'general_service', 'senior', false, 10),
    ('A/C Condenser Replacement', 'Replace A/C condenser', 180, 399.99, 799.99, '$400-800', 'general_service', 'intermediate', false, 11),
    ('A/C Evaporator Replacement', 'Replace A/C evaporator core', 360, 599.99, 1299.99, '$600-1300', 'general_service', 'senior', false, 12),
    ('Heater Core Replacement', 'Replace heater core', 360, 499.99, 999.99, '$500-1000', 'general_service', 'senior', false, 13),
    ('Blower Motor Replacement', 'Replace HVAC blower motor', 90, 199.99, 399.99, '$200-400', 'general_service', 'intermediate', false, 14),
    ('A/C Leak Detection', 'Locate A/C system refrigerant leak', 60, 79.99, 129.99, '$80-130', 'general_service', 'intermediate', false, 15),
    ('Cabin Temperature Sensor', 'Replace cabin temperature sensor', 45, 89.99, 179.99, '$90-180', 'general_service', 'intermediate', false, 16)
) AS s(name, description, duration, price_min, price_max, price_display, bay_type, skill, popular, sort)
WHERE c.name = 'Heating & Cooling'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ADDITIONAL BATTERY & ELECTRICAL SERVICES
-- ============================================================================

INSERT INTO services (category_id, name, description, duration_minutes, price_min, price_max, price_display, required_bay_type, required_skill_level, is_popular, sort_order)
SELECT c.id, s.name, s.description, s.duration, s.price_min, s.price_max, s.price_display, s.bay_type::bay_type, s.skill::skill_level, s.popular, s.sort
FROM service_categories c
CROSS JOIN (VALUES
    ('Starter Replacement', 'Replace starter motor', 120, 249.99, 499.99, '$250-500', 'general_service', 'intermediate', false, 10),
    ('Battery Terminal Cleaning', 'Clean and protect battery terminals', 15, 19.99, 29.99, '$20-30', 'quick_service', 'junior', false, 11),
    ('Battery Cable Replacement', 'Replace battery cables', 45, 79.99, 149.99, '$80-150', 'general_service', 'junior', false, 12),
    ('Fuse Replacement', 'Diagnose and replace blown fuse', 30, 29.99, 79.99, '$30-80', 'quick_service', 'junior', false, 13),
    ('Window Motor Replacement', 'Replace power window motor', 90, 199.99, 349.99, '$200-350', 'general_service', 'intermediate', false, 14),
    ('Door Lock Actuator Replacement', 'Replace power door lock actuator', 90, 179.99, 349.99, '$180-350', 'general_service', 'intermediate', false, 15),
    ('Horn Replacement', 'Replace vehicle horn', 30, 49.99, 99.99, '$50-100', 'general_service', 'junior', false, 16),
    ('Backup Camera Installation', 'Install aftermarket backup camera', 120, 199.99, 399.99, '$200-400', 'general_service', 'intermediate', false, 17),
    ('Dash Cam Installation', 'Install dash camera', 60, 79.99, 149.99, '$80-150', 'general_service', 'junior', false, 18)
) AS s(name, description, duration, price_min, price_max, price_display, bay_type, skill, popular, sort)
WHERE c.name = 'Battery & Electrical'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ADDITIONAL BRAKE SERVICES
-- ============================================================================

INSERT INTO services (category_id, name, description, duration_minutes, price_min, price_max, price_display, required_bay_type, required_skill_level, is_popular, sort_order)
SELECT c.id, s.name, s.description, s.duration, s.price_min, s.price_max, s.price_display, s.bay_type::bay_type, s.skill::skill_level, s.popular, s.sort
FROM service_categories c
CROSS JOIN (VALUES
    ('Rear Brake Pads & Rotors', 'Replace rear brake pads and rotors', 90, 299.99, 499.99, '$300-500', 'general_service', 'intermediate', false, 10),
    ('Brake Caliper Replacement', 'Replace brake caliper', 90, 199.99, 399.99, '$200-400', 'general_service', 'intermediate', false, 11),
    ('Brake Line Replacement', 'Replace brake line', 60, 149.99, 299.99, '$150-300', 'general_service', 'intermediate', false, 12),
    ('Parking Brake Adjustment', 'Adjust parking brake cable', 30, 49.99, 79.99, '$50-80', 'general_service', 'junior', false, 13),
    ('Parking Brake Cable Replacement', 'Replace parking brake cable', 90, 149.99, 299.99, '$150-300', 'general_service', 'intermediate', false, 14),
    ('ABS Sensor Replacement', 'Replace ABS wheel speed sensor', 60, 149.99, 299.99, '$150-300', 'general_service', 'intermediate', false, 15),
    ('Brake Rotor Resurfacing', 'Machine/resurface brake rotors', 60, 79.99, 149.99, '$80-150', 'general_service', 'intermediate', false, 16)
) AS s(name, description, duration, price_min, price_max, price_display, bay_type, skill, popular, sort)
WHERE c.name = 'Brakes'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SUMMARY OUTPUT
-- ============================================================================

SELECT 'Services by Category (after expansion):' as info;
SELECT 
    c.name as category,
    COUNT(s.id) as service_count
FROM service_categories c
LEFT JOIN services s ON s.category_id = c.id AND s.is_active = true
GROUP BY c.name, c.sort_order
ORDER BY c.sort_order;
