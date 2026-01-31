/**
 * Fix prices for today and tomorrow's appointments
 * Run with: node backend/scripts/fix-today-prices.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { format, addDays } from 'date-fns';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixTodayPrices() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  console.log(`Fixing prices for ${today} and ${tomorrow}...\n`);

  // Get services with their actual prices
  const { data: services } = await supabase
    .from('services')
    .select('id, name, price_min, price_max');

  const priceMap = {};
  services.forEach(s => {
    // Store prices in cents
    priceMap[s.id] = {
      name: s.name,
      min: Math.round((s.price_min || 0) * 100),
      max: Math.round((s.price_max || 0) * 100)
    };
  });

  // Get today and tomorrow appointments
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id,
      scheduled_date,
      quoted_total,
      appointment_services (
        id,
        service_id,
        service_name,
        quoted_price
      )
    `)
    .in('scheduled_date', [today, tomorrow]);

  console.log(`Found ${appointments?.length || 0} appointments\n`);

  for (const apt of appointments || []) {
    let totalCents = 0;

    for (const svc of apt.appointment_services || []) {
      const priceInfo = priceMap[svc.service_id];
      if (priceInfo) {
        // Use price near the minimum (realistic)
        const priceCents = priceInfo.min + Math.round(Math.random() * (priceInfo.max - priceInfo.min) * 0.2);
        totalCents += priceCents;

        // Update the service price
        await supabase
          .from('appointment_services')
          .update({ quoted_price: priceCents })
          .eq('id', svc.id);
      }
    }

    if (totalCents > 0) {
      // Update appointment total
      await supabase
        .from('appointments')
        .update({ quoted_total: totalCents })
        .eq('id', apt.id);

      const services = apt.appointment_services?.map(s => s.service_name).join(', ');
      console.log(`✓ ${apt.scheduled_date} | ${services}: $${(totalCents / 100).toFixed(2)}`);
    }
  }

  console.log('\nDone!');
}

fixTodayPrices().catch(console.error);
