import { Router } from 'express';
import { supabase } from '../config/database.js';
import { format, addDays } from 'date-fns';
import { sendReminderSMS } from '../services/sms.js';
import { nowEST, daysFromNowEST } from '../utils/timezone.js';

const router = Router();

/**
 * POST /api/reminders/send-24h
 * Send 24-hour appointment reminders
 * This endpoint should be called by a cron job daily around 9am
 */
router.post('/send-24h', async (req, res, next) => {
  try {
    // Get tomorrow's date
    const tomorrowDate = daysFromNowEST(1);
    
    console.log(`[Reminders] Checking for appointments on ${tomorrowDate}`);

    // Get all appointments for tomorrow that haven't been reminded
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_date,
        scheduled_time,
        reminder_sent_at,
        customer:customers (
          id,
          first_name,
          phone
        ),
        vehicle:vehicles (
          year,
          make,
          model
        ),
        appointment_services (
          service_name
        )
      `)
      .eq('scheduled_date', tomorrowDate)
      .in('status', ['scheduled', 'confirmed'])
      .is('reminder_sent_at', null);

    if (error) throw error;

    if (!appointments || appointments.length === 0) {
      console.log('[Reminders] No appointments to remind');
      return res.json({ 
        success: true, 
        message: 'No appointments need reminders',
        sent: 0 
      });
    }

    console.log(`[Reminders] Found ${appointments.length} appointments to remind`);

    const results = [];
    
    for (const apt of appointments) {
      if (!apt.customer?.phone) {
        console.log(`[Reminders] Skipping appointment ${apt.id} - no phone number`);
        continue;
      }

      const services = apt.appointment_services?.map(s => s.service_name).join(', ') || 'Service';
      const vehicleDescription = apt.vehicle 
        ? `${apt.vehicle.year} ${apt.vehicle.make} ${apt.vehicle.model}` 
        : null;

      // Send the reminder SMS
      const smsResult = await sendReminderSMS({
        customerPhone: apt.customer.phone,
        customerName: apt.customer.first_name,
        appointmentDate: apt.scheduled_date,
        appointmentTime: apt.scheduled_time,
        services,
        vehicleDescription,
        customerId: apt.customer.id,
        appointmentId: apt.id
      });

      // Mark as reminded with timestamp
      if (smsResult.success) {
        await supabase
          .from('appointments')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', apt.id);
      }

      results.push({
        appointmentId: apt.id,
        customerName: apt.customer.first_name,
        success: smsResult.success,
        error: smsResult.error
      });
    }

    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      message: `Sent ${successCount}/${results.length} reminders`,
      sent: successCount,
      total: results.length,
      results
    });

  } catch (error) {
    console.error('[Reminders] Error:', error);
    next(error);
  }
});

/**
 * GET /api/reminders/pending
 * Get list of appointments that will be reminded tomorrow
 */
router.get('/pending', async (req, res, next) => {
  try {
    const tomorrowDate = daysFromNowEST(1);

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_date,
        scheduled_time,
        reminder_sent_at,
        customer:customers (
          first_name,
          last_name,
          phone
        )
      `)
      .eq('scheduled_date', tomorrowDate)
      .in('status', ['scheduled', 'confirmed'])
      .is('reminder_sent_at', null);

    if (error) throw error;

    res.json({
      date: tomorrowDate,
      count: appointments?.length || 0,
      appointments: appointments || []
    });

  } catch (error) {
    next(error);
  }
});

export default router;
