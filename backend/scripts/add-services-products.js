// Script to add additional services and products
// Run with: node scripts/add-services-products.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  console.log('Adding additional services and products...\n');

  // ============================================================================
  // ADD NEW SERVICE CATEGORIES
  // ============================================================================
  
  console.log('1. Adding service categories...');
  
  const { data: existingCategories } = await supabase
    .from('service_categories')
    .select('name');
  
  const existingNames = existingCategories?.map(c => c.name) || [];
  
  const newCategories = [
    { name: 'Quick Add-Ons', description: 'Quick services that can be added to any appointment', sort_order: 9 },
    { name: 'Seasonal Services', description: 'Seasonal tire and weather-related services', sort_order: 10 },
    { name: 'Appearance', description: 'Detailing and appearance services', sort_order: 11 }
  ].filter(c => !existingNames.includes(c.name));

  if (newCategories.length > 0) {
    const { error: catError } = await supabase
      .from('service_categories')
      .insert(newCategories);
    if (catError) console.error('Category error:', catError);
    else console.log(`   Added ${newCategories.length} categories`);
  } else {
    console.log('   Categories already exist');
  }

  // Get all categories for reference
  const { data: categories } = await supabase
    .from('service_categories')
    .select('id, name');
  
  const categoryMap = {};
  categories.forEach(c => categoryMap[c.name] = c.id);

  // ============================================================================
  // ADD QUICK ADD-ON SERVICES
  // ============================================================================
  
  console.log('2. Adding Quick Add-On services...');
  
  const quickAddOns = [
    { name: 'Wiper Blade Replacement', description: 'Replace front wiper blades with premium blades', duration_minutes: 15, price_min: 29.99, price_max: 49.99, price_display: '$30-50', required_bay_type: 'express_lane', required_skill_level: 'junior', is_popular: true, sort_order: 1 },
    { name: 'Rear Wiper Blade', description: 'Replace rear wiper blade', duration_minutes: 10, price_min: 19.99, price_max: 29.99, price_display: '$20-30', required_bay_type: 'express_lane', required_skill_level: 'junior', is_popular: false, sort_order: 2 },
    { name: 'Headlight Bulb Replacement', description: 'Replace single headlight bulb', duration_minutes: 20, price_min: 29.99, price_max: 79.99, price_display: '$30-80', required_bay_type: 'express_lane', required_skill_level: 'junior', is_popular: true, sort_order: 3 },
    { name: 'Tail Light Bulb Replacement', description: 'Replace tail light or brake light bulb', duration_minutes: 15, price_min: 19.99, price_max: 39.99, price_display: '$20-40', required_bay_type: 'express_lane', required_skill_level: 'junior', is_popular: false, sort_order: 4 },
    { name: 'Headlight Restoration', description: 'Restore foggy/yellowed headlights to clear', duration_minutes: 45, price_min: 79.99, price_max: 129.99, price_display: '$80-130', required_bay_type: 'express_lane', required_skill_level: 'junior', is_popular: true, sort_order: 5 },
    { name: 'Key Fob Battery', description: 'Replace key fob/remote battery', duration_minutes: 5, price_min: 9.99, price_max: 19.99, price_display: '$10-20', required_bay_type: 'express_lane', required_skill_level: 'junior', is_popular: true, sort_order: 6 },
    { name: 'Windshield Chip Repair', description: 'Repair small windshield chip or crack', duration_minutes: 30, price_min: 49.99, price_max: 79.99, price_display: '$50-80', required_bay_type: 'express_lane', required_skill_level: 'junior', is_popular: false, sort_order: 7 },
    { name: 'Serpentine Belt Replacement', description: 'Replace serpentine/drive belt', duration_minutes: 45, price_min: 99.99, price_max: 179.99, price_display: '$100-180', required_bay_type: 'general_service', required_skill_level: 'intermediate', is_popular: false, sort_order: 8 },
    { name: 'Fuel System Cleaning', description: 'Fuel injector and intake cleaning service', duration_minutes: 45, price_min: 99.99, price_max: 149.99, price_display: '$100-150', required_bay_type: 'general_service', required_skill_level: 'intermediate', is_popular: true, sort_order: 9 },
    { name: 'Throttle Body Cleaning', description: 'Clean throttle body for better response', duration_minutes: 30, price_min: 79.99, price_max: 99.99, price_display: '$80-100', required_bay_type: 'general_service', required_skill_level: 'intermediate', is_popular: false, sort_order: 10 }
  ];

  if (categoryMap['Quick Add-Ons']) {
    // Check which services already exist
    const { data: existing } = await supabase.from('services').select('name');
    const existingNames = existing?.map(s => s.name) || [];
    
    const newServices = quickAddOns
      .filter(s => !existingNames.includes(s.name))
      .map(s => ({ ...s, category_id: categoryMap['Quick Add-Ons'] }));
    
    if (newServices.length > 0) {
      const { error } = await supabase.from('services').insert(newServices);
      if (error) console.error('Quick Add-On error:', error);
      else console.log(`   Added ${newServices.length} Quick Add-On services`);
    } else {
      console.log('   Quick Add-On services already exist');
    }
  }

  // ============================================================================
  // ADD SEASONAL SERVICES
  // ============================================================================
  
  console.log('3. Adding Seasonal services...');
  
  const seasonalServices = [
    { name: 'Winter Tire Changeover', description: 'Swap summer tires for winter tires (tires on rims)', duration_minutes: 30, price_min: 49.99, price_max: 69.99, price_display: '$50-70', required_bay_type: 'general_service', required_skill_level: 'junior', is_popular: true, sort_order: 1 },
    { name: 'Summer Tire Changeover', description: 'Swap winter tires for summer tires (tires on rims)', duration_minutes: 30, price_min: 49.99, price_max: 69.99, price_display: '$50-70', required_bay_type: 'general_service', required_skill_level: 'junior', is_popular: true, sort_order: 2 },
    { name: 'Tire Changeover with Balance', description: 'Seasonal tire swap plus balancing all four', duration_minutes: 60, price_min: 89.99, price_max: 119.99, price_display: '$90-120', required_bay_type: 'general_service', required_skill_level: 'junior', is_popular: true, sort_order: 3 },
    { name: 'Tire Mounting (New Tires)', description: 'Mount and balance new tires (per tire)', duration_minutes: 20, price_min: 19.99, price_max: 29.99, price_display: '$20-30/tire', required_bay_type: 'general_service', required_skill_level: 'junior', is_popular: false, sort_order: 4 },
    { name: 'Seasonal Tire Storage', description: 'Store your off-season tires (per season)', duration_minutes: 15, price_min: 79.99, price_max: 99.99, price_display: '$80-100/season', required_bay_type: 'quick_service', required_skill_level: 'junior', is_popular: false, sort_order: 5 },
    { name: 'Winter Vehicle Prep', description: 'Battery test, antifreeze check, wipers, lights inspection', duration_minutes: 45, price_min: 49.99, price_max: 69.99, price_display: '$50-70', required_bay_type: 'general_service', required_skill_level: 'junior', is_popular: true, sort_order: 6 },
    { name: 'Summer Vehicle Prep', description: 'A/C check, coolant level, tire inspection', duration_minutes: 45, price_min: 49.99, price_max: 69.99, price_display: '$50-70', required_bay_type: 'general_service', required_skill_level: 'junior', is_popular: false, sort_order: 7 },
    { name: 'Rust Proofing', description: 'Undercoating and rust protection treatment', duration_minutes: 90, price_min: 149.99, price_max: 299.99, price_display: '$150-300', required_bay_type: 'general_service', required_skill_level: 'intermediate', is_popular: false, sort_order: 8 }
  ];

  if (categoryMap['Seasonal Services']) {
    const { data: existing } = await supabase.from('services').select('name');
    const existingNames = existing?.map(s => s.name) || [];
    
    const newServices = seasonalServices
      .filter(s => !existingNames.includes(s.name))
      .map(s => ({ ...s, category_id: categoryMap['Seasonal Services'] }));
    
    if (newServices.length > 0) {
      const { error } = await supabase.from('services').insert(newServices);
      if (error) console.error('Seasonal error:', error);
      else console.log(`   Added ${newServices.length} Seasonal services`);
    } else {
      console.log('   Seasonal services already exist');
    }
  }

  // ============================================================================
  // ADD APPEARANCE/DETAILING SERVICES
  // ============================================================================
  
  console.log('4. Adding Appearance/Detailing services...');
  
  const appearanceServices = [
    { name: 'Express Interior Clean', description: 'Vacuum, wipe down, windows', duration_minutes: 30, price_min: 39.99, price_max: 49.99, price_display: '$40-50', required_bay_type: 'express_lane', required_skill_level: 'junior', is_popular: true, sort_order: 1 },
    { name: 'Express Exterior Wash', description: 'Hand wash, dry, tire shine', duration_minutes: 30, price_min: 29.99, price_max: 39.99, price_display: '$30-40', required_bay_type: 'express_lane', required_skill_level: 'junior', is_popular: true, sort_order: 2 },
    { name: 'Interior Detail', description: 'Deep clean interior, shampoo carpets, leather conditioning', duration_minutes: 120, price_min: 149.99, price_max: 199.99, price_display: '$150-200', required_bay_type: 'express_lane', required_skill_level: 'junior', is_popular: false, sort_order: 3 },
    { name: 'Exterior Detail', description: 'Hand wash, clay bar, polish, wax', duration_minutes: 180, price_min: 199.99, price_max: 299.99, price_display: '$200-300', required_bay_type: 'express_lane', required_skill_level: 'junior', is_popular: false, sort_order: 4 },
    { name: 'Full Detail Package', description: 'Complete interior and exterior detailing', duration_minutes: 300, price_min: 299.99, price_max: 449.99, price_display: '$300-450', required_bay_type: 'express_lane', required_skill_level: 'junior', is_popular: false, sort_order: 5 },
    { name: 'Engine Bay Cleaning', description: 'Degrease and clean engine compartment', duration_minutes: 60, price_min: 79.99, price_max: 129.99, price_display: '$80-130', required_bay_type: 'express_lane', required_skill_level: 'junior', is_popular: false, sort_order: 6 },
    { name: 'Odor Elimination', description: 'Deep clean and odor removal treatment', duration_minutes: 60, price_min: 99.99, price_max: 149.99, price_display: '$100-150', required_bay_type: 'express_lane', required_skill_level: 'junior', is_popular: false, sort_order: 7 }
  ];

  if (categoryMap['Appearance']) {
    const { data: existing } = await supabase.from('services').select('name');
    const existingNames = existing?.map(s => s.name) || [];
    
    const newServices = appearanceServices
      .filter(s => !existingNames.includes(s.name))
      .map(s => ({ ...s, category_id: categoryMap['Appearance'] }));
    
    if (newServices.length > 0) {
      const { error } = await supabase.from('services').insert(newServices);
      if (error) console.error('Appearance error:', error);
      else console.log(`   Added ${newServices.length} Appearance services`);
    } else {
      console.log('   Appearance services already exist');
    }
  }

  // ============================================================================
  // CREATE PRODUCTS TABLE (via raw SQL)
  // ============================================================================
  
  console.log('5. Creating products table...');
  
  // Create products table using rpc if available, otherwise skip
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      category VARCHAR(50) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      is_popular BOOLEAN DEFAULT false,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  
  // Try to execute raw SQL via the SQL endpoint
  const { error: sqlError } = await supabase.rpc('exec_sql', { sql: createTableSQL }).single();
  if (sqlError && !sqlError.message.includes('already exists')) {
    console.log('   Note: Could not create products table via RPC. Will try direct insert.');
  }
  
  // ============================================================================
  // ADD PRODUCTS
  // ============================================================================
  
  console.log('6. Adding products for upselling...');
  
  const products = [
    // Wipers & Visibility
    { name: 'Premium Wiper Blades (Pair)', description: 'All-weather beam blades, fits most vehicles', category: 'Wipers & Visibility', price: 34.99, is_popular: true, sort_order: 1 },
    { name: 'Rear Wiper Blade', description: 'Replacement rear wiper blade', category: 'Wipers & Visibility', price: 19.99, is_popular: false, sort_order: 2 },
    { name: 'Rain-X Washer Fluid (Gallon)', description: 'Premium washer fluid with Rain-X', category: 'Wipers & Visibility', price: 8.99, is_popular: true, sort_order: 3 },
    
    // Filters
    { name: 'Premium Cabin Air Filter', description: 'HEPA-grade cabin air filter', category: 'Filters', price: 29.99, is_popular: true, sort_order: 4 },
    { name: 'Engine Air Filter - Standard', description: 'OEM-equivalent engine air filter', category: 'Filters', price: 24.99, is_popular: false, sort_order: 5 },
    { name: 'Engine Air Filter - Performance', description: 'High-flow performance air filter', category: 'Filters', price: 49.99, is_popular: false, sort_order: 6 },
    
    // Additives
    { name: 'Fuel System Cleaner', description: 'Techron fuel system cleaner additive', category: 'Additives', price: 12.99, is_popular: true, sort_order: 7 },
    { name: 'Oil Treatment', description: 'Lucas Oil stabilizer treatment', category: 'Additives', price: 14.99, is_popular: false, sort_order: 8 },
    
    // Interior
    { name: 'All-Weather Floor Mats (Set of 4)', description: 'Custom-fit rubber floor mats', category: 'Interior', price: 89.99, is_popular: true, sort_order: 9 },
    { name: 'Air Freshener 3-Pack', description: 'Long-lasting car air fresheners', category: 'Interior', price: 9.99, is_popular: true, sort_order: 10 },
    { name: 'USB Car Charger - Dual Port', description: 'Fast charging dual USB adapter', category: 'Interior', price: 14.99, is_popular: true, sort_order: 11 },
    { name: 'Phone Mount - Magnetic', description: 'Dashboard magnetic phone holder', category: 'Interior', price: 19.99, is_popular: false, sort_order: 12 },
    
    // Safety
    { name: 'Emergency Roadside Kit', description: 'Jumper cables, flashlight, first aid', category: 'Safety', price: 49.99, is_popular: true, sort_order: 13 },
    { name: 'Tire Inflator - Portable', description: '12V portable tire inflator', category: 'Safety', price: 39.99, is_popular: true, sort_order: 14 },
    { name: 'Tire Sealant Kit', description: 'Fix-a-Flat emergency tire sealant', category: 'Safety', price: 12.99, is_popular: false, sort_order: 15 },
    { name: 'Jumper Cables - Heavy Duty', description: '20ft heavy duty jumper cables', category: 'Safety', price: 34.99, is_popular: false, sort_order: 16 },
    
    // Exterior
    { name: 'Spray Wax', description: 'Quick detailer spray wax', category: 'Exterior', price: 14.99, is_popular: true, sort_order: 17 },
    { name: 'Tire Shine Spray', description: 'Long-lasting tire shine', category: 'Exterior', price: 9.99, is_popular: true, sort_order: 18 },
    
    // Seasonal
    { name: 'Winter Emergency Kit', description: 'Ice scraper, snow brush, hand warmers, blanket', category: 'Seasonal', price: 34.99, is_popular: true, sort_order: 19 },
    { name: 'Windshield De-Icer Spray', description: 'Fast-acting ice melter spray', category: 'Seasonal', price: 7.99, is_popular: true, sort_order: 20 },
    { name: 'Sunshade - Universal', description: 'Foldable windshield sunshade', category: 'Seasonal', price: 19.99, is_popular: false, sort_order: 21 },
    
    // Oil Upgrades
    { name: 'Upgrade to Synthetic Blend', description: 'Upgrade from conventional to synthetic blend oil', category: 'Oil Upgrades', price: 20.00, is_popular: true, sort_order: 22 },
    { name: 'Upgrade to Full Synthetic', description: 'Upgrade from conventional to full synthetic oil', category: 'Oil Upgrades', price: 40.00, is_popular: true, sort_order: 23 },
    { name: 'High Mileage Additive Package', description: 'Special additives for 75K+ mile engines', category: 'Oil Upgrades', price: 15.00, is_popular: false, sort_order: 24 }
  ];

  // Try to insert products - if table doesn't exist, we'll need to create it
  const { error: prodError } = await supabase
    .from('products')
    .upsert(products, { onConflict: 'name' });
  
  if (prodError) {
    if (prodError.message.includes('does not exist')) {
      console.log('   Products table does not exist. Please create it first using the SQL file.');
      console.log('   Run this SQL in Supabase dashboard:');
      console.log(`
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_popular BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
      `);
    } else {
      console.error('Product error:', prodError);
    }
  } else {
    console.log(`   Added ${products.length} products`);
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  
  const { data: serviceCount } = await supabase
    .from('services')
    .select('id', { count: 'exact' });
  
  const { data: categoryCount } = await supabase
    .from('service_categories')
    .select('id', { count: 'exact' });

  console.log(`Total service categories: ${categoryCount?.length || 0}`);
  console.log(`Total services: ${serviceCount?.length || 0}`);
  
  // List services by category
  const { data: servicesByCategory } = await supabase
    .from('services')
    .select('category_id, name')
    .eq('is_active', true);
  
  const { data: allCategories } = await supabase
    .from('service_categories')
    .select('id, name, sort_order')
    .order('sort_order');
  
  console.log('\nServices by category:');
  for (const cat of allCategories || []) {
    const count = servicesByCategory?.filter(s => s.category_id === cat.id).length || 0;
    console.log(`  ${cat.name}: ${count} services`);
  }
  
  console.log('\nDone!');
}

main().catch(console.error);
