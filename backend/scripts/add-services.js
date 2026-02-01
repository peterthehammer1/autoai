import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function addServices() {
  console.log('Adding new service categories and services...\n');

  // 1. Add new service categories
  const categories = [
    { name: 'Steering & Suspension', description: 'Steering components and suspension services', sort_order: 12 },
    { name: 'Exhaust System', description: 'Muffler, exhaust pipe, and catalytic converter services', sort_order: 13 },
    { name: 'Engine Services', description: 'Tune-ups, timing belts, and engine maintenance', sort_order: 14 },
    { name: 'Emissions & Inspections', description: 'Emissions testing and state inspections', sort_order: 15 }
  ];

  for (const cat of categories) {
    // Check if exists first
    const { data: existing } = await supabase
      .from('service_categories')
      .select('id')
      .eq('name', cat.name)
      .single();
    
    if (existing) {
      console.log(`✓ Category exists: ${cat.name}`);
      continue;
    }

    const { error } = await supabase
      .from('service_categories')
      .insert(cat);
    if (error) console.log(`Category ${cat.name}:`, error.message);
    else console.log(`✓ Category added: ${cat.name}`);
  }

  // 2. Get category IDs
  const { data: catData } = await supabase
    .from('service_categories')
    .select('id, name');
  
  const catMap = {};
  catData.forEach(c => catMap[c.name] = c.id);

  // 3. Define new services
  const newServices = [
    // Steering & Suspension
    { category: 'Steering & Suspension', name: 'Power Steering Flush', description: 'Complete power steering fluid replacement', duration_minutes: 45, price_min: 89.99, price_max: 119.99, price_display: '$90-120' },
    { category: 'Steering & Suspension', name: 'Wheel Bearing Replacement', description: 'Replace worn wheel bearing (per wheel)', duration_minutes: 120, price_min: 199.99, price_max: 399.99, price_display: '$200-400' },
    { category: 'Steering & Suspension', name: 'Sway Bar Link Replacement', description: 'Replace sway bar end links', duration_minutes: 60, price_min: 99.99, price_max: 199.99, price_display: '$100-200' },
    { category: 'Steering & Suspension', name: 'Control Arm Replacement', description: 'Replace upper or lower control arm', duration_minutes: 150, price_min: 249.99, price_max: 499.99, price_display: '$250-500' },
    { category: 'Steering & Suspension', name: 'Front Strut Replacement', description: 'Replace front struts (pair)', duration_minutes: 180, price_min: 399.99, price_max: 699.99, price_display: '$400-700' },
    { category: 'Steering & Suspension', name: 'Rear Shock Replacement', description: 'Replace rear shocks (pair)', duration_minutes: 120, price_min: 249.99, price_max: 449.99, price_display: '$250-450' },

    // Exhaust System
    { category: 'Exhaust System', name: 'Exhaust Inspection', description: 'Inspect exhaust system for leaks and damage', duration_minutes: 30, price_min: 0, price_max: 0, price_display: 'FREE' },
    { category: 'Exhaust System', name: 'Muffler Replacement', description: 'Replace worn or damaged muffler', duration_minutes: 90, price_min: 149.99, price_max: 349.99, price_display: '$150-350' },
    { category: 'Exhaust System', name: 'Catalytic Converter Replacement', description: 'Replace catalytic converter', duration_minutes: 120, price_min: 599.99, price_max: 1999.99, price_display: '$600-2000' },
    { category: 'Exhaust System', name: 'Oxygen Sensor Replacement', description: 'Replace O2 sensor', duration_minutes: 60, price_min: 149.99, price_max: 299.99, price_display: '$150-300' },
    { category: 'Exhaust System', name: 'Exhaust Pipe Repair', description: 'Repair or replace exhaust pipe section', duration_minutes: 60, price_min: 99.99, price_max: 249.99, price_display: '$100-250' },

    // Engine Services
    { category: 'Engine Services', name: 'Spark Plug Replacement', description: 'Replace spark plugs (4-cylinder)', duration_minutes: 60, price_min: 99.99, price_max: 199.99, price_display: '$100-200', is_popular: true },
    { category: 'Engine Services', name: 'Spark Plug Replacement (V6/V8)', description: 'Replace spark plugs (6+ cylinder)', duration_minutes: 120, price_min: 149.99, price_max: 349.99, price_display: '$150-350' },
    { category: 'Engine Services', name: 'Ignition Coil Replacement', description: 'Replace faulty ignition coil', duration_minutes: 60, price_min: 99.99, price_max: 249.99, price_display: '$100-250' },
    { category: 'Engine Services', name: 'Timing Belt Replacement', description: 'Replace timing belt and tensioner', duration_minutes: 300, price_min: 499.99, price_max: 999.99, price_display: '$500-1000' },
    { category: 'Engine Services', name: 'Water Pump Replacement', description: 'Replace engine water pump', duration_minutes: 180, price_min: 249.99, price_max: 499.99, price_display: '$250-500' },
    { category: 'Engine Services', name: 'Thermostat Replacement', description: 'Replace engine thermostat', duration_minutes: 60, price_min: 99.99, price_max: 199.99, price_display: '$100-200' },
    { category: 'Engine Services', name: 'Radiator Replacement', description: 'Replace radiator', duration_minutes: 120, price_min: 299.99, price_max: 599.99, price_display: '$300-600' },
    { category: 'Engine Services', name: 'Engine Air Filter', description: 'Replace engine air filter', duration_minutes: 15, price_min: 29.99, price_max: 59.99, price_display: '$30-60', is_popular: true },
    { category: 'Engine Services', name: 'Cabin Air Filter', description: 'Replace cabin air filter', duration_minutes: 15, price_min: 39.99, price_max: 69.99, price_display: '$40-70', is_popular: true },
    { category: 'Engine Services', name: 'Valve Cover Gasket', description: 'Replace valve cover gasket', duration_minutes: 120, price_min: 149.99, price_max: 349.99, price_display: '$150-350' },
    { category: 'Engine Services', name: 'Motor Mount Replacement', description: 'Replace engine or transmission mount', duration_minutes: 120, price_min: 199.99, price_max: 399.99, price_display: '$200-400' },

    // Emissions & Inspections
    { category: 'Emissions & Inspections', name: 'Emissions Test', description: 'Ontario Drive Clean emissions test', duration_minutes: 30, price_min: 29.99, price_max: 35.00, price_display: '$30-35', is_popular: true },
    { category: 'Emissions & Inspections', name: 'Safety Inspection', description: 'Ontario safety standards inspection', duration_minutes: 60, price_min: 79.99, price_max: 99.99, price_display: '$80-100', is_popular: true },
    { category: 'Emissions & Inspections', name: 'Out of Province Inspection', description: 'Inspection for vehicles from other provinces', duration_minutes: 90, price_min: 149.99, price_max: 199.99, price_display: '$150-200' },
    { category: 'Emissions & Inspections', name: 'Fleet Inspection', description: 'Commercial fleet vehicle inspection', duration_minutes: 45, price_min: 69.99, price_max: 99.99, price_display: '$70-100' },
    { category: 'Emissions & Inspections', name: 'Lease Return Inspection', description: 'Pre-lease return inspection', duration_minutes: 45, price_min: 79.99, price_max: 99.99, price_display: '$80-100' },

    // Additional Heating & Cooling
    { category: 'Heating & Cooling', name: 'A/C Compressor Replacement', description: 'Replace A/C compressor', duration_minutes: 240, price_min: 599.99, price_max: 1199.99, price_display: '$600-1200' },
    { category: 'Heating & Cooling', name: 'Heater Core Replacement', description: 'Replace heater core', duration_minutes: 360, price_min: 499.99, price_max: 999.99, price_display: '$500-1000' },
    { category: 'Heating & Cooling', name: 'Blower Motor Replacement', description: 'Replace HVAC blower motor', duration_minutes: 90, price_min: 199.99, price_max: 399.99, price_display: '$200-400' },
    { category: 'Heating & Cooling', name: 'A/C Leak Detection', description: 'Locate A/C system refrigerant leak', duration_minutes: 60, price_min: 79.99, price_max: 129.99, price_display: '$80-130' },

    // Additional Battery & Electrical
    { category: 'Battery & Electrical', name: 'Starter Replacement', description: 'Replace starter motor', duration_minutes: 120, price_min: 249.99, price_max: 499.99, price_display: '$250-500' },
    { category: 'Battery & Electrical', name: 'Battery Terminal Cleaning', description: 'Clean and protect battery terminals', duration_minutes: 15, price_min: 19.99, price_max: 29.99, price_display: '$20-30' },
    { category: 'Battery & Electrical', name: 'Window Motor Replacement', description: 'Replace power window motor', duration_minutes: 90, price_min: 199.99, price_max: 349.99, price_display: '$200-350' },
    { category: 'Battery & Electrical', name: 'Door Lock Actuator Replacement', description: 'Replace power door lock actuator', duration_minutes: 90, price_min: 179.99, price_max: 349.99, price_display: '$180-350' },

    // Additional Brake Services
    { category: 'Brakes', name: 'Rear Brake Pads & Rotors', description: 'Replace rear brake pads and rotors', duration_minutes: 90, price_min: 299.99, price_max: 499.99, price_display: '$300-500' },
    { category: 'Brakes', name: 'Brake Caliper Replacement', description: 'Replace brake caliper', duration_minutes: 90, price_min: 199.99, price_max: 399.99, price_display: '$200-400' },
    { category: 'Brakes', name: 'ABS Sensor Replacement', description: 'Replace ABS wheel speed sensor', duration_minutes: 60, price_min: 149.99, price_max: 299.99, price_display: '$150-300' },

    // Additional Quick Add-Ons
    { category: 'Quick Add-Ons', name: 'Fog Light Bulb Replacement', description: 'Replace fog light bulb', duration_minutes: 30, price_min: 39.99, price_max: 79.99, price_display: '$40-80' },
    { category: 'Quick Add-Ons', name: 'Turn Signal Bulb Replacement', description: 'Replace turn signal bulb', duration_minutes: 15, price_min: 19.99, price_max: 39.99, price_display: '$20-40' },
    { category: 'Quick Add-Ons', name: 'Interior Light Replacement', description: 'Replace dome light or map light bulb', duration_minutes: 15, price_min: 14.99, price_max: 29.99, price_display: '$15-30' }
  ];

  // 4. Insert services
  console.log('\nAdding services...');
  let added = 0, skipped = 0;
  
  for (const svc of newServices) {
    const categoryId = catMap[svc.category];
    if (!categoryId) {
      console.log(`⚠ Category not found: ${svc.category}`);
      continue;
    }

    // Check if service already exists
    const { data: existing } = await supabase
      .from('services')
      .select('id')
      .eq('name', svc.name)
      .single();

    if (existing) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('services')
      .insert({
        category_id: categoryId,
        name: svc.name,
        description: svc.description,
        duration_minutes: svc.duration_minutes,
        price_min: svc.price_min,
        price_max: svc.price_max,
        price_display: svc.price_display,
        is_popular: svc.is_popular || false,
        is_active: true
      });

    if (error) {
      console.log(`✗ ${svc.name}:`, error.message);
    } else {
      added++;
    }
  }

  console.log(`\n✅ Added ${added} new services (${skipped} already existed)`);

  // 5. Show summary
  const { data: summary } = await supabase
    .from('service_categories')
    .select('name, services(count)')
    .order('sort_order');

  console.log('\nService Summary:');
  summary.forEach(c => {
    console.log(`  ${c.name}: ${c.services[0]?.count || 0} services`);
  });
}

addServices().catch(console.error);
