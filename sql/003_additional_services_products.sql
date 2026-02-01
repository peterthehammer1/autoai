-- Additional Services and Products for Upselling
-- Run this after the initial seed data

-- ============================================================================
-- ADDITIONAL SERVICE CATEGORIES
-- ============================================================================

INSERT INTO service_categories (name, description, sort_order) VALUES
('Quick Add-Ons', 'Quick services that can be added to any appointment', 9),
('Seasonal Services', 'Seasonal tire and weather-related services', 10),
('Appearance', 'Detailing and appearance services', 11)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- QUICK ADD-ON SERVICES (Easy upsells during appointments)
-- ============================================================================

INSERT INTO services (category_id, name, description, duration_minutes, price_min, price_max, price_display, required_bay_type, required_skill_level, is_popular, sort_order)
SELECT c.id, s.name, s.description, s.duration, s.price_min, s.price_max, s.price_display, s.bay_type::bay_type, s.skill::skill_level, s.popular, s.sort
FROM service_categories c
CROSS JOIN (VALUES
    ('Wiper Blade Replacement', 'Replace front wiper blades with premium blades', 15, 29.99, 49.99, '$30-50', 'express_lane', 'junior', true, 1),
    ('Rear Wiper Blade', 'Replace rear wiper blade', 10, 19.99, 29.99, '$20-30', 'express_lane', 'junior', false, 2),
    ('Headlight Bulb Replacement', 'Replace single headlight bulb', 20, 29.99, 79.99, '$30-80', 'express_lane', 'junior', true, 3),
    ('Tail Light Bulb Replacement', 'Replace tail light or brake light bulb', 15, 19.99, 39.99, '$20-40', 'express_lane', 'junior', false, 4),
    ('Headlight Restoration', 'Restore foggy/yellowed headlights to clear', 45, 79.99, 129.99, '$80-130', 'express_lane', 'junior', true, 5),
    ('Key Fob Battery', 'Replace key fob/remote battery', 5, 9.99, 19.99, '$10-20', 'express_lane', 'junior', true, 6),
    ('Windshield Chip Repair', 'Repair small windshield chip or crack', 30, 49.99, 79.99, '$50-80', 'express_lane', 'junior', false, 7),
    ('Serpentine Belt Replacement', 'Replace serpentine/drive belt', 45, 99.99, 179.99, '$100-180', 'general_service', 'intermediate', false, 8),
    ('Fuel System Cleaning', 'Fuel injector and intake cleaning service', 45, 99.99, 149.99, '$100-150', 'general_service', 'intermediate', true, 9),
    ('Throttle Body Cleaning', 'Clean throttle body for better response', 30, 79.99, 99.99, '$80-100', 'general_service', 'intermediate', false, 10)
) AS s(name, description, duration, price_min, price_max, price_display, bay_type, skill, popular, sort)
WHERE c.name = 'Quick Add-Ons';

-- ============================================================================
-- SEASONAL SERVICES
-- ============================================================================

INSERT INTO services (category_id, name, description, duration_minutes, price_min, price_max, price_display, required_bay_type, required_skill_level, is_popular, sort_order)
SELECT c.id, s.name, s.description, s.duration, s.price_min, s.price_max, s.price_display, s.bay_type::bay_type, s.skill::skill_level, s.popular, s.sort
FROM service_categories c
CROSS JOIN (VALUES
    ('Winter Tire Changeover', 'Swap summer tires for winter tires (tires on rims)', 30, 49.99, 69.99, '$50-70', 'general_service', 'junior', true, 1),
    ('Summer Tire Changeover', 'Swap winter tires for summer tires (tires on rims)', 30, 49.99, 69.99, '$50-70', 'general_service', 'junior', true, 2),
    ('Tire Changeover with Balance', 'Seasonal tire swap plus balancing all four', 60, 89.99, 119.99, '$90-120', 'general_service', 'junior', true, 3),
    ('Tire Mounting (New Tires)', 'Mount and balance new tires (per tire)', 20, 19.99, 29.99, '$20-30/tire', 'general_service', 'junior', false, 4),
    ('Seasonal Tire Storage', 'Store your off-season tires (per season)', 0, 79.99, 99.99, '$80-100/season', 'quick_service', 'junior', false, 5),
    ('Winter Vehicle Prep', 'Battery test, antifreeze check, wipers, lights inspection', 45, 49.99, 69.99, '$50-70', 'general_service', 'junior', true, 6),
    ('Summer Vehicle Prep', 'A/C check, coolant level, tire inspection', 45, 49.99, 69.99, '$50-70', 'general_service', 'junior', false, 7),
    ('Rust Proofing', 'Undercoating and rust protection treatment', 90, 149.99, 299.99, '$150-300', 'general_service', 'intermediate', false, 8)
) AS s(name, description, duration, price_min, price_max, price_display, bay_type, skill, popular, sort)
WHERE c.name = 'Seasonal Services';

-- ============================================================================
-- APPEARANCE/DETAILING SERVICES
-- ============================================================================

INSERT INTO services (category_id, name, description, duration_minutes, price_min, price_max, price_display, required_bay_type, required_skill_level, is_popular, sort_order)
SELECT c.id, s.name, s.description, s.duration, s.price_min, s.price_max, s.price_display, s.bay_type::bay_type, s.skill::skill_level, s.popular, s.sort
FROM service_categories c
CROSS JOIN (VALUES
    ('Express Interior Clean', 'Vacuum, wipe down, windows', 30, 39.99, 49.99, '$40-50', 'express_lane', 'junior', true, 1),
    ('Express Exterior Wash', 'Hand wash, dry, tire shine', 30, 29.99, 39.99, '$30-40', 'express_lane', 'junior', true, 2),
    ('Interior Detail', 'Deep clean interior, shampoo carpets, leather conditioning', 120, 149.99, 199.99, '$150-200', 'express_lane', 'junior', false, 3),
    ('Exterior Detail', 'Hand wash, clay bar, polish, wax', 180, 199.99, 299.99, '$200-300', 'express_lane', 'junior', false, 4),
    ('Full Detail Package', 'Complete interior and exterior detailing', 300, 299.99, 449.99, '$300-450', 'express_lane', 'junior', false, 5),
    ('Engine Bay Cleaning', 'Degrease and clean engine compartment', 60, 79.99, 129.99, '$80-130', 'express_lane', 'junior', false, 6),
    ('Odor Elimination', 'Deep clean and odor removal treatment', 60, 99.99, 149.99, '$100-150', 'express_lane', 'junior', false, 7),
    ('Paint Protection Film', 'Clear bra installation for front end', 240, 499.99, 1499.99, 'Starting at $500', 'express_lane', 'intermediate', false, 8),
    ('Ceramic Coating', 'Professional ceramic coating application', 480, 799.99, 1999.99, 'Starting at $800', 'express_lane', 'intermediate', false, 9)
) AS s(name, description, duration, price_min, price_max, price_display, bay_type, skill, popular, sort)
WHERE c.name = 'Appearance';

-- ============================================================================
-- SUSPENSION & STEERING (Add to existing if not present)
-- ============================================================================

INSERT INTO services (category_id, name, description, duration_minutes, price_min, price_max, price_display, required_bay_type, required_skill_level, is_popular, sort_order)
SELECT c.id, s.name, s.description, s.duration, s.price_min, s.price_max, s.price_display, s.bay_type::bay_type, s.skill::skill_level, s.popular, s.sort
FROM service_categories c
CROSS JOIN (VALUES
    ('Suspension Inspection', 'Inspect shocks, struts, and suspension components', 30, 0, 0, 'FREE with alignment', 'alignment', 'intermediate', false, 8),
    ('Front Strut Replacement', 'Replace front struts (pair)', 180, 399.99, 699.99, '$400-700', 'alignment', 'senior', false, 9),
    ('Rear Shock Replacement', 'Replace rear shocks (pair)', 120, 249.99, 449.99, '$250-450', 'alignment', 'intermediate', false, 10),
    ('CV Axle Replacement', 'Replace CV axle/half shaft', 120, 249.99, 449.99, '$250-450', 'general_service', 'intermediate', false, 11),
    ('Tie Rod Replacement', 'Replace inner or outer tie rod', 90, 149.99, 299.99, '$150-300', 'alignment', 'intermediate', false, 12),
    ('Ball Joint Replacement', 'Replace upper or lower ball joint', 120, 199.99, 399.99, '$200-400', 'alignment', 'senior', false, 13)
) AS s(name, description, duration, price_min, price_max, price_display, bay_type, skill, popular, sort)
WHERE c.name = 'Tires & Wheels';

-- ============================================================================
-- PRODUCTS TABLE (for upselling during appointments)
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2), -- wholesale cost for margin tracking
    sku VARCHAR(50),
    in_stock BOOLEAN DEFAULT true,
    stock_quantity INTEGER DEFAULT 0,
    is_popular BOOLEAN DEFAULT false,
    upsell_with_services TEXT[], -- service names this pairs well with
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, is_popular);

-- ============================================================================
-- PRODUCT SEED DATA
-- ============================================================================

INSERT INTO products (name, description, category, price, cost, is_popular, upsell_with_services, sort_order) VALUES
-- Wiper Blades & Visibility
('Premium Wiper Blades (Pair)', 'All-weather beam blades, fits most vehicles', 'Wipers & Visibility', 34.99, 15.00, true, ARRAY['Conventional Oil Change', 'Synthetic Blend Oil Change', 'Full Synthetic Oil Change', 'Multi-Point Inspection'], 1),
('Rear Wiper Blade', 'Replacement rear wiper blade', 'Wipers & Visibility', 19.99, 8.00, false, ARRAY['Wiper Blade Replacement'], 2),
('Rain-X Washer Fluid (Gallon)', 'Premium washer fluid with Rain-X', 'Wipers & Visibility', 8.99, 3.50, true, ARRAY['Conventional Oil Change', 'Winter Vehicle Prep'], 3),
('Headlight Restoration Kit', 'DIY headlight restoration kit', 'Wipers & Visibility', 24.99, 10.00, false, ARRAY['Headlight Restoration'], 4),

-- Filters & Fluids
('Premium Cabin Air Filter', 'HEPA-grade cabin air filter', 'Filters', 29.99, 12.00, true, ARRAY['Cabin Air Filter', 'A/C Recharge'], 5),
('Engine Air Filter - Standard', 'OEM-equivalent engine air filter', 'Filters', 24.99, 10.00, false, ARRAY['Air Filter Replacement'], 6),
('Engine Air Filter - Performance', 'High-flow performance air filter', 'Filters', 49.99, 22.00, false, ARRAY['Air Filter Replacement', 'Engine Tune-Up'], 7),
('Fuel System Cleaner', 'Techron fuel system cleaner additive', 'Additives', 12.99, 5.00, true, ARRAY['Conventional Oil Change', 'Fuel System Cleaning'], 8),
('Oil Treatment', 'Lucas Oil stabilizer treatment', 'Additives', 14.99, 6.00, false, ARRAY['High Mileage Oil Change'], 9),

-- Interior Accessories
('All-Weather Floor Mats (Set of 4)', 'Custom-fit rubber floor mats', 'Interior', 89.99, 40.00, true, ARRAY['Interior Detail', 'Full Detail Package'], 10),
('Trunk Liner Mat', 'Universal fit cargo area liner', 'Interior', 49.99, 20.00, false, ARRAY['Interior Detail'], 11),
('Air Freshener 3-Pack', 'Long-lasting car air fresheners', 'Interior', 9.99, 3.00, true, ARRAY['Interior Detail', 'Odor Elimination', 'Express Interior Clean'], 12),
('Leather Conditioning Kit', 'Leather cleaner and conditioner set', 'Interior', 29.99, 12.00, false, ARRAY['Interior Detail'], 13),
('Phone Mount - Magnetic', 'Dashboard magnetic phone holder', 'Interior', 19.99, 7.00, false, ARRAY['Multi-Point Inspection'], 14),
('USB Car Charger - Dual Port', 'Fast charging dual USB adapter', 'Interior', 14.99, 5.00, true, ARRAY['Battery Replacement'], 15),

-- Emergency & Safety
('Emergency Roadside Kit', 'Jumper cables, flashlight, first aid', 'Safety', 49.99, 20.00, true, ARRAY['Battery Replacement', 'Winter Vehicle Prep', 'Multi-Point Inspection'], 16),
('Tire Inflator - Portable', '12V portable tire inflator', 'Safety', 39.99, 15.00, true, ARRAY['Tire Rotation', 'Flat Tire Repair', 'TPMS Sensor Service'], 17),
('Tire Sealant Kit', 'Fix-a-Flat emergency tire sealant', 'Safety', 12.99, 5.00, false, ARRAY['Tire Rotation', 'Flat Tire Repair'], 18),
('Jumper Cables - Heavy Duty', '20ft heavy duty jumper cables', 'Safety', 34.99, 14.00, false, ARRAY['Battery Replacement', 'Battery Test'], 19),
('First Aid Kit - Auto', 'Compact automotive first aid kit', 'Safety', 19.99, 8.00, false, ARRAY['Emergency Roadside Kit'], 20),

-- Exterior Care
('Microfiber Wash Kit', 'Wash mitt, drying towel, and bucket', 'Exterior', 29.99, 12.00, false, ARRAY['Express Exterior Wash', 'Exterior Detail'], 21),
('Spray Wax', 'Quick detailer spray wax', 'Exterior', 14.99, 5.00, true, ARRAY['Express Exterior Wash', 'Exterior Detail'], 22),
('Tire Shine Spray', 'Long-lasting tire shine', 'Exterior', 9.99, 3.50, true, ARRAY['Express Exterior Wash', 'Tire Rotation'], 23),
('Bug & Tar Remover', 'Professional strength bug remover', 'Exterior', 12.99, 5.00, false, ARRAY['Exterior Detail'], 24),
('Touch-Up Paint Pen', 'Universal touch-up paint pen (clear)', 'Exterior', 14.99, 6.00, false, ARRAY['Exterior Detail'], 25),

-- Seasonal
('Winter Emergency Kit', 'Ice scraper, snow brush, hand warmers, blanket', 'Seasonal', 34.99, 14.00, true, ARRAY['Winter Vehicle Prep', 'Winter Tire Changeover'], 26),
('Windshield De-Icer Spray', 'Fast-acting ice melter spray', 'Seasonal', 7.99, 3.00, true, ARRAY['Winter Vehicle Prep', 'Wiper Blade Replacement'], 27),
('Sunshade - Universal', 'Foldable windshield sunshade', 'Seasonal', 19.99, 7.00, false, ARRAY['Summer Vehicle Prep', 'A/C Recharge'], 28),

-- Oil Upgrades (for suggesting premium during oil changes)
('Upgrade to Synthetic Blend', 'Upgrade from conventional to synthetic blend', 'Oil Upgrades', 20.00, 8.00, true, ARRAY['Conventional Oil Change'], 29),
('Upgrade to Full Synthetic', 'Upgrade from conventional to full synthetic', 'Oil Upgrades', 40.00, 18.00, true, ARRAY['Conventional Oil Change', 'Synthetic Blend Oil Change'], 30),
('High Mileage Additive Package', 'Special additives for 75K+ mile engines', 'Oil Upgrades', 15.00, 6.00, false, ARRAY['Conventional Oil Change', 'Synthetic Blend Oil Change', 'High Mileage Oil Change'], 31);

-- ============================================================================
-- UPDATE PROMPT TO KNOW ABOUT PRODUCTS
-- ============================================================================

-- Note: You'll need to update the AI agent prompt to include product upselling guidance

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 'Additional services and products added!' as status;

SELECT 'New Services by Category:' as info;
SELECT c.name as category, COUNT(s.id) as service_count
FROM service_categories c
LEFT JOIN services s ON s.category_id = c.id AND s.is_active = true
GROUP BY c.name, c.sort_order
ORDER BY c.sort_order;

SELECT 'Products by Category:' as info;
SELECT category, COUNT(*) as product_count, SUM(CASE WHEN is_popular THEN 1 ELSE 0 END) as popular_count
FROM products
WHERE is_active = true
GROUP BY category
ORDER BY category;
