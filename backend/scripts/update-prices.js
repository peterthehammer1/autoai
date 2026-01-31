import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Service prices - single set price for each service (in dollars)
// These are realistic market prices for an auto service shop
const servicePrices = {
  // Oil & Fluids
  'Conventional Oil Change': { price: 40, voice: 'forty dollars' },
  'Synthetic Blend Oil Change': { price: 65, voice: 'sixty five dollars' },
  'Full Synthetic Oil Change': { price: 90, voice: 'ninety dollars' },
  'High Mileage Oil Change': { price: 75, voice: 'seventy five dollars' },
  'Diesel Oil Change': { price: 110, voice: 'one hundred ten dollars' },
  'Transmission Fluid Exchange': { price: 175, voice: 'one hundred seventy five dollars' },
  'Brake Fluid Flush': { price: 100, voice: 'one hundred dollars' },
  'Power Steering Fluid Flush': { price: 90, voice: 'ninety dollars' },
  
  // Tires & Wheels
  'Tire Rotation': { price: 35, voice: 'thirty five dollars' },
  'Tire Balance': { price: 60, voice: 'sixty dollars' },
  'Tire Rotation & Balance': { price: 80, voice: 'eighty dollars' },
  'Flat Tire Repair': { price: 30, voice: 'thirty dollars' },
  'Wheel Alignment - 2 Wheel': { price: 80, voice: 'eighty dollars' },
  'Wheel Alignment - 4 Wheel': { price: 110, voice: 'one hundred ten dollars' },
  'TPMS Sensor Service': { price: 50, voice: 'fifty dollars per sensor' },
  
  // Brakes
  'Brake Inspection': { price: 0, voice: 'free' },
  'Front Brake Pads': { price: 200, voice: 'two hundred dollars' },
  'Rear Brake Pads': { price: 200, voice: 'two hundred dollars' },
  'Front Brake Pads & Rotors': { price: 375, voice: 'three hundred seventy five dollars' },
  'Rear Brake Pads & Rotors': { price: 375, voice: 'three hundred seventy five dollars' },
  'Complete Brake Service': { price: 700, voice: 'seven hundred dollars' },
  
  // Battery & Electrical
  'Battery Test': { price: 0, voice: 'free' },
  'Battery Replacement': { price: 180, voice: 'one hundred eighty dollars' },
  'Alternator Test': { price: 0, voice: 'free with battery test' },
  'Alternator Replacement': { price: 425, voice: 'four hundred twenty five dollars' },
  'Starter Replacement': { price: 350, voice: 'three hundred fifty dollars' },
  'Electrical Diagnosis': { price: 125, voice: 'one hundred twenty five dollars' },
  
  // Engine & Transmission
  'Air Filter Replacement': { price: 40, voice: 'forty dollars' },
  'Cabin Air Filter': { price: 55, voice: 'fifty five dollars' },
  'Spark Plug Replacement - 4 Cyl': { price: 125, voice: 'one hundred twenty five dollars' },
  'Spark Plug Replacement - 6 Cyl': { price: 200, voice: 'two hundred dollars' },
  'Spark Plug Replacement - 8 Cyl': { price: 275, voice: 'two hundred seventy five dollars' },
  'Engine Tune-Up': { price: 275, voice: 'two hundred seventy five dollars' },
  'Timing Belt Replacement': { price: 700, voice: 'seven hundred dollars' },
  'Engine Repair': { price: 0, voice: 'quote after diagnosis' },
  'Transmission Repair': { price: 0, voice: 'quote after diagnosis' },
  
  // Heating & Cooling
  'A/C Performance Check': { price: 60, voice: 'sixty dollars' },
  'A/C Recharge': { price: 125, voice: 'one hundred twenty five dollars' },
  'A/C Repair': { price: 0, voice: 'starting at two hundred dollars' },
  'Coolant Flush': { price: 125, voice: 'one hundred twenty five dollars' },
  'Radiator Replacement': { price: 550, voice: 'five hundred fifty dollars' },
  'Thermostat Replacement': { price: 150, voice: 'one hundred fifty dollars' },
  'Water Pump Replacement': { price: 450, voice: 'four hundred fifty dollars' },
  'Heater Core Repair': { price: 750, voice: 'seven hundred fifty dollars' },
  
  // Inspection & Diagnostic
  'Check Engine Light Diagnosis': { price: 125, voice: 'one hundred twenty five dollars, applied to repair' },
  'Multi-Point Inspection': { price: 0, voice: 'free with service' },
  'Pre-Purchase Inspection': { price: 125, voice: 'one hundred twenty five dollars' },
  'Safety Inspection': { price: 65, voice: 'sixty five dollars' },
  'Emissions Test': { price: 40, voice: 'forty dollars' },
  
  // Scheduled Maintenance
  '15,000 KM Service': { price: 175, voice: 'one hundred seventy five dollars' },
  '30,000 KM Service': { price: 350, voice: 'three hundred fifty dollars' },
  '60,000 KM Service': { price: 525, voice: 'five hundred twenty five dollars' },
  '90,000 KM Service': { price: 725, voice: 'seven hundred twenty five dollars' },
  '120,000 KM Service': { price: 1000, voice: 'one thousand dollars' },
};

async function updatePrices() {
  console.log('Updating service prices to single set prices...\n');
  
  // Get all services
  const { data: services, error } = await supabase
    .from('services')
    .select('id, name, price_min, price_max, price_display');
  
  if (error) {
    console.error('Error fetching services:', error);
    return;
  }
  
  let updated = 0;
  let skipped = 0;
  
  for (const service of services) {
    const priceInfo = servicePrices[service.name];
    
    if (priceInfo) {
      const { error: updateError } = await supabase
        .from('services')
        .update({
          price_min: priceInfo.price,
          price_max: priceInfo.price, // Same as min for single price
          price_display: priceInfo.voice // Voice-friendly format
        })
        .eq('id', service.id);
      
      if (updateError) {
        console.error(`Error updating ${service.name}:`, updateError);
      } else {
        console.log(`✓ ${service.name}: ${priceInfo.voice}`);
        updated++;
      }
    } else {
      console.log(`? Skipping ${service.name} - not in price list`);
      skipped++;
    }
  }
  
  console.log(`\n✅ Updated ${updated} services`);
  console.log(`⏭️  Skipped ${skipped} services`);
  
  // Also update any appointment_services with the new prices (in cents)
  console.log('\nUpdating existing appointment quoted prices...');
  
  for (const [serviceName, priceInfo] of Object.entries(servicePrices)) {
    if (priceInfo.price > 0) {
      const priceInCents = priceInfo.price * 100;
      
      await supabase
        .from('appointment_services')
        .update({ quoted_price: priceInCents })
        .eq('service_name', serviceName);
    }
  }
  
  // Update appointment quoted_total
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, appointment_services(quoted_price)');
  
  for (const apt of appointments || []) {
    const total = apt.appointment_services.reduce((sum, s) => sum + (s.quoted_price || 0), 0);
    await supabase
      .from('appointments')
      .update({ quoted_total: total })
      .eq('id', apt.id);
  }
  
  console.log('✅ Appointment prices updated');
}

updatePrices().catch(console.error);
