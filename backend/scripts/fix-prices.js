/**
 * Fix appointment prices to match actual service prices
 * Run with: node backend/scripts/fix-prices.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixPrices() {
  console.log('Fixing appointment prices...\n');

  // Get all appointments with their services
  const { data: appointments, error: aptError } = await supabase
    .from('appointments')
    .select(`
      id,
      quoted_total,
      appointment_services (
        service_id,
        service_name,
        quoted_price
      )
    `);

  if (aptError) {
    console.error('Error fetching appointments:', aptError);
    return;
  }

  // Get all services with their prices
  const { data: services, error: svcError } = await supabase
    .from('services')
    .select('id, name, price_min, price_max');

  if (svcError) {
    console.error('Error fetching services:', svcError);
    return;
  }

  // Create a price lookup map
  const priceMap = {};
  services.forEach(s => {
    priceMap[s.id] = {
      name: s.name,
      price_min: s.price_min || 0,
      price_max: s.price_max || 0
    };
  });

  console.log(`Found ${appointments.length} appointments to check\n`);

  let updated = 0;
  let updatedServices = 0;

  for (const apt of appointments) {
    let totalPrice = 0;
    const serviceUpdates = [];

    for (const aptService of apt.appointment_services || []) {
      const serviceInfo = priceMap[aptService.service_id];
      if (serviceInfo) {
        // Use a price between min and max (slightly randomized for realism)
        const minPrice = serviceInfo.price_min * 100; // Convert to cents
        const maxPrice = serviceInfo.price_max * 100;
        const price = Math.round(minPrice + Math.random() * (maxPrice - minPrice) * 0.3);
        
        totalPrice += price;
        
        // Update the appointment_service record with correct price
        if (aptService.quoted_price !== price) {
          serviceUpdates.push({
            service_id: aptService.service_id,
            price: price
          });
        }
      }
    }

    // Update appointment_services with correct prices
    for (const update of serviceUpdates) {
      await supabase
        .from('appointment_services')
        .update({ quoted_price: update.price })
        .eq('appointment_id', apt.id)
        .eq('service_id', update.service_id);
      updatedServices++;
    }

    // Update the appointment total if it's significantly different
    if (totalPrice > 0 && Math.abs(apt.quoted_total - totalPrice) > 100) {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ quoted_total: totalPrice })
        .eq('id', apt.id);

      if (!updateError) {
        const oldPrice = (apt.quoted_total / 100).toFixed(2);
        const newPrice = (totalPrice / 100).toFixed(2);
        const services = apt.appointment_services?.map(s => s.service_name).join(', ') || 'Unknown';
        console.log(`✓ ${services}: $${oldPrice} → $${newPrice}`);
        updated++;
      }
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Updated ${updated} appointment totals`);
  console.log(`Updated ${updatedServices} service prices`);
  console.log('$'.repeat(50));
}

fixPrices().catch(console.error);
