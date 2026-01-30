import { Router } from 'express';
import { supabase } from '../config/database.js';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const router = Router();

/**
 * GET /api/analytics/overview
 * Dashboard overview stats
 */
router.get('/overview', async (req, res, next) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    // Today's appointments
    const { count: todayAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('scheduled_date', today)
      .not('status', 'in', '("cancelled","no_show")');

    // This week's appointments
    const { count: weekAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('scheduled_date', weekStart)
      .lte('scheduled_date', weekEnd)
      .not('status', 'in', '("cancelled","no_show")');

    // Calls today
    const { count: todayCalls } = await supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', `${today}T00:00:00`)
      .lte('started_at', `${today}T23:59:59`);

    // Bookings by AI this week
    const { count: aiBookings } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('scheduled_date', weekStart)
      .lte('scheduled_date', weekEnd)
      .eq('created_by', 'ai_agent')
      .not('status', 'eq', 'cancelled');

    // Conversion rate (booked calls / total calls this week)
    const { count: weekCalls } = await supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', `${weekStart}T00:00:00`)
      .lte('started_at', `${weekEnd}T23:59:59`);

    const { count: bookedCalls } = await supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', `${weekStart}T00:00:00`)
      .lte('started_at', `${weekEnd}T23:59:59`)
      .eq('outcome', 'booked');

    const conversionRate = weekCalls > 0 
      ? Math.round((bookedCalls / weekCalls) * 100) 
      : 0;

    // Revenue booked this month
    const { data: monthRevenue } = await supabase
      .from('appointments')
      .select('quoted_total')
      .gte('scheduled_date', monthStart)
      .lte('scheduled_date', monthEnd)
      .not('status', 'in', '("cancelled","no_show")');

    const totalRevenue = monthRevenue?.reduce((sum, apt) => sum + (apt.quoted_total || 0), 0) || 0;

    res.json({
      today: {
        appointments: todayAppointments || 0,
        calls: todayCalls || 0
      },
      week: {
        appointments: weekAppointments || 0,
        calls: weekCalls || 0,
        ai_bookings: aiBookings || 0,
        conversion_rate: conversionRate
      },
      month: {
        revenue_booked: totalRevenue
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/appointments
 * Appointment analytics
 */
router.get('/appointments', async (req, res, next) => {
  try {
    const { period = 'week' } = req.query;

    let startDate, endDate;
    const now = new Date();

    switch (period) {
      case 'day':
        startDate = format(now, 'yyyy-MM-dd');
        endDate = startDate;
        break;
      case 'week':
        startDate = format(subDays(now, 7), 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
        break;
      case 'month':
        startDate = format(subDays(now, 30), 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
        break;
      default:
        startDate = format(subDays(now, 7), 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
    }

    // Get appointments by status
    const { data: appointments } = await supabase
      .from('appointments')
      .select('scheduled_date, status, created_by, quoted_total')
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate);

    // Aggregate by date
    const byDate = {};
    const byStatus = {};
    const bySource = { ai_agent: 0, dashboard: 0, phone: 0, web: 0 };

    for (const apt of appointments || []) {
      // By date
      if (!byDate[apt.scheduled_date]) {
        byDate[apt.scheduled_date] = { total: 0, completed: 0, cancelled: 0 };
      }
      byDate[apt.scheduled_date].total++;
      if (apt.status === 'completed') byDate[apt.scheduled_date].completed++;
      if (apt.status === 'cancelled' || apt.status === 'no_show') byDate[apt.scheduled_date].cancelled++;

      // By status
      byStatus[apt.status] = (byStatus[apt.status] || 0) + 1;

      // By source
      if (bySource[apt.created_by] !== undefined) {
        bySource[apt.created_by]++;
      }
    }

    // Convert to array for charts
    const dailyData = Object.entries(byDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      period,
      start_date: startDate,
      end_date: endDate,
      summary: {
        total: appointments?.length || 0,
        by_status: byStatus,
        by_source: bySource
      },
      daily: dailyData
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/calls
 * Call analytics
 */
router.get('/calls', async (req, res, next) => {
  try {
    const { period = 'week' } = req.query;

    const days = period === 'day' ? 1 : period === 'month' ? 30 : 7;
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

    const { data: calls } = await supabase
      .from('call_logs')
      .select('started_at, duration_seconds, outcome, sentiment')
      .gte('started_at', `${startDate}T00:00:00`);

    // Aggregate
    const byOutcome = {};
    const bySentiment = {};
    const byHour = {};
    let totalDuration = 0;

    for (const call of calls || []) {
      // By outcome
      byOutcome[call.outcome || 'unknown'] = (byOutcome[call.outcome || 'unknown'] || 0) + 1;

      // By sentiment
      bySentiment[call.sentiment || 'neutral'] = (bySentiment[call.sentiment || 'neutral'] || 0) + 1;

      // By hour
      if (call.started_at) {
        const hour = new Date(call.started_at).getHours();
        byHour[hour] = (byHour[hour] || 0) + 1;
      }

      // Duration
      totalDuration += call.duration_seconds || 0;
    }

    // Average duration
    const avgDuration = calls?.length > 0 
      ? Math.round(totalDuration / calls.length) 
      : 0;

    // Peak hours
    const peakHours = Object.entries(byHour)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    res.json({
      period,
      summary: {
        total_calls: calls?.length || 0,
        avg_duration_seconds: avgDuration,
        by_outcome: byOutcome,
        by_sentiment: bySentiment
      },
      peak_hours: peakHours,
      by_hour: byHour
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/services
 * Service popularity analytics
 */
router.get('/services', async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;

    const days = period === 'week' ? 7 : 30;
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

    const { data: services } = await supabase
      .from('appointment_services')
      .select(`
        service_name,
        quoted_price,
        appointment:appointments!inner (
          scheduled_date,
          status
        )
      `)
      .gte('appointment.scheduled_date', startDate)
      .not('appointment.status', 'eq', 'cancelled');

    // Aggregate by service
    const byService = {};

    for (const svc of services || []) {
      if (!byService[svc.service_name]) {
        byService[svc.service_name] = { count: 0, revenue: 0 };
      }
      byService[svc.service_name].count++;
      byService[svc.service_name].revenue += svc.quoted_price || 0;
    }

    // Convert to array and sort by count
    const popular = Object.entries(byService)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      period,
      services: popular,
      total_services_booked: services?.length || 0
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/bay-utilization
 * Bay/capacity utilization
 */
router.get('/bay-utilization', async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');

    // Get all bays
    const { data: bays } = await supabase
      .from('service_bays')
      .select('id, name, bay_type')
      .eq('is_active', true);

    // Get slots for the day
    const { data: slots } = await supabase
      .from('time_slots')
      .select('bay_id, is_available')
      .eq('slot_date', targetDate);

    // Calculate utilization per bay
    const utilization = bays?.map(bay => {
      const baySlots = slots?.filter(s => s.bay_id === bay.id) || [];
      const bookedSlots = baySlots.filter(s => !s.is_available);
      
      return {
        bay_id: bay.id,
        bay_name: bay.name,
        bay_type: bay.bay_type,
        total_slots: baySlots.length,
        booked_slots: bookedSlots.length,
        utilization_percent: baySlots.length > 0 
          ? Math.round((bookedSlots.length / baySlots.length) * 100) 
          : 0
      };
    }) || [];

    // Overall utilization
    const totalSlots = slots?.length || 0;
    const bookedSlots = slots?.filter(s => !s.is_available).length || 0;

    res.json({
      date: targetDate,
      overall: {
        total_slots: totalSlots,
        booked_slots: bookedSlots,
        utilization_percent: totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0
      },
      by_bay: utilization
    });

  } catch (error) {
    next(error);
  }
});

export default router;
