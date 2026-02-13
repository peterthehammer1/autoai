import { Router } from 'express';
import { supabase } from '../config/database.js';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays, addDays } from 'date-fns';
import { nowEST, todayEST, weekStartEST, weekEndEST, monthStartEST, monthEndEST, daysAgoEST, formatDateEST } from '../utils/timezone.js';

const router = Router();

const VALID_PERIODS = ['day', 'week', 'month', 'custom'];
function validatePeriod(period) {
  return VALID_PERIODS.includes(period);
}

// In-memory cache
const cache = new Map();
function getCached(key, ttlMs) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < ttlMs) return entry.data;
  return null;
}
function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

/**
 * GET /api/analytics/overview
 * Dashboard overview stats
 */
router.get('/overview', async (req, res, next) => {
  try {
    const today = todayEST();
    const weekStart = weekStartEST();
    const weekEnd = weekEndEST();
    const monthStart = monthStartEST();
    const monthEnd = monthEndEST();

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
    if (!validatePeriod(period)) {
      return res.status(400).json({ error: 'Invalid period. Must be day, week, or month.' });
    }

    let startDate, endDate;
    const today = todayEST();

    switch (period) {
      case 'day':
        startDate = today;
        endDate = today;
        break;
      case 'week':
        startDate = daysAgoEST(7);
        endDate = today;
        break;
      case 'month':
        startDate = daysAgoEST(30);
        endDate = today;
        break;
      default:
        startDate = daysAgoEST(7);
        endDate = today;
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
    if (!validatePeriod(period)) {
      return res.status(400).json({ error: 'Invalid period. Must be day, week, or month.' });
    }

    const days = period === 'day' ? 1 : period === 'month' ? 30 : 7;
    const startDate = daysAgoEST(days);

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
    if (!validatePeriod(period)) {
      return res.status(400).json({ error: 'Invalid period. Must be day, week, or month.' });
    }

    const days = period === 'week' ? 7 : 30;
    const startDate = daysAgoEST(days);

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
    const targetDate = date || todayEST();

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

/**
 * GET /api/analytics/insights
 * AI-generated insights based on data patterns
 */
router.get('/insights', async (req, res, next) => {
  try {
    const cached = getCached('insights', 5 * 60 * 1000);
    if (cached) return res.json(cached);

    const today = nowEST();
    const todayStr = todayEST();
    const weekStart = weekStartEST();
    const weekEnd = weekEndEST();
    const lastWeekStart = format(subDays(startOfWeek(today), 7), 'yyyy-MM-dd');
    const lastWeekEnd = format(subDays(endOfWeek(today), 7), 'yyyy-MM-dd');
    const sixtyDaysAgo = format(subDays(today, 60), 'yyyy-MM-dd');
    const monthStartStr = format(startOfMonth(today), 'yyyy-MM-dd');
    const tomorrow = format(addDays(today, 1), 'yyyy-MM-dd');
    const tomorrowDay = format(addDays(today, 1), 'EEEE');

    // Batch all 13 queries in parallel
    const [
      thisWeekCallsRes,
      lastWeekCallsRes,
      recentCallsRes,
      thisWeekServicesRes,
      lastWeekServicesRes,
      bookedCallsRes,
      tomorrowApptsRes,
      newCustomersRes,
      staleCustomersRes,
      monthRevenueRes,
      callDurationsRes,
      positiveCallsRes,
      todayApptsRes,
    ] = await Promise.all([
      supabase.from('call_logs').select('*', { count: 'exact', head: true })
        .gte('started_at', `${weekStart}T00:00:00`).lte('started_at', `${weekEnd}T23:59:59`),
      supabase.from('call_logs').select('*', { count: 'exact', head: true })
        .gte('started_at', `${lastWeekStart}T00:00:00`).lte('started_at', `${lastWeekEnd}T23:59:59`),
      supabase.from('call_logs').select('started_at')
        .gte('started_at', `${lastWeekStart}T00:00:00`).limit(1000),
      supabase.from('appointment_services')
        .select('service_name, appointment:appointments!inner(scheduled_date)')
        .gte('appointment.scheduled_date', weekStart).lte('appointment.scheduled_date', weekEnd).limit(1000),
      supabase.from('appointment_services')
        .select('service_name, appointment:appointments!inner(scheduled_date)')
        .gte('appointment.scheduled_date', lastWeekStart).lte('appointment.scheduled_date', lastWeekEnd).limit(1000),
      supabase.from('call_logs').select('*', { count: 'exact', head: true })
        .gte('started_at', `${weekStart}T00:00:00`).lte('started_at', `${weekEnd}T23:59:59`).eq('outcome', 'booked'),
      supabase.from('appointments').select('*', { count: 'exact', head: true })
        .eq('scheduled_date', tomorrow).not('status', 'in', '("cancelled","no_show")'),
      supabase.from('customers').select('*', { count: 'exact', head: true })
        .gte('created_at', `${weekStart}T00:00:00`),
      supabase.from('customers').select('id')
        .lt('updated_at', `${sixtyDaysAgo}T00:00:00`).gt('total_visits', 0).limit(50),
      supabase.from('appointments').select('quoted_total')
        .gte('scheduled_date', monthStartStr).not('status', 'in', '("cancelled","no_show")').limit(1000),
      supabase.from('call_logs').select('duration_seconds')
        .gte('started_at', `${weekStart}T00:00:00`).not('duration_seconds', 'is', null).limit(1000),
      supabase.from('call_logs').select('*', { count: 'exact', head: true })
        .gte('started_at', `${weekStart}T00:00:00`).eq('sentiment', 'positive'),
      supabase.from('appointments').select('*', { count: 'exact', head: true })
        .eq('scheduled_date', todayStr).not('status', 'in', '("cancelled","no_show")'),
    ]);

    const thisWeekCalls = thisWeekCallsRes.count || 0;
    const lastWeekCalls = lastWeekCallsRes.count || 0;
    const recentCalls = recentCallsRes.data;
    const thisWeekServices = thisWeekServicesRes.data;
    const lastWeekServices = lastWeekServicesRes.data;
    const bookedCalls = bookedCallsRes.count || 0;
    const tomorrowAppointments = tomorrowApptsRes.count || 0;
    const newCustomers = newCustomersRes.count || 0;
    const staleCustomers = staleCustomersRes.data;
    const monthRevenue = monthRevenueRes.data;
    const callDurations = callDurationsRes.data;
    const positiveCalls = positiveCallsRes.count || 0;
    const todayAppts = todayApptsRes.count || 0;

    const insights = [];

    // 1. Call volume comparison
    if (lastWeekCalls > 0) {
      const callChange = Math.round(((thisWeekCalls - lastWeekCalls) / lastWeekCalls) * 100);
      if (callChange > 10) {
        insights.push({
          type: 'trend_up', category: 'calls', title: 'Call Volume Up',
          message: `Call volume is up ${callChange}% compared to last week`,
          value: `+${callChange}%`, priority: 'high'
        });
      } else if (callChange < -10) {
        insights.push({
          type: 'trend_down', category: 'calls', title: 'Call Volume Down',
          message: `Call volume is down ${Math.abs(callChange)}% compared to last week`,
          value: `${callChange}%`, priority: 'medium'
        });
      }
    }

    // 2. Peak call times
    if (recentCalls?.length > 5) {
      const byHour = {};
      const byDay = {};
      for (const call of recentCalls) {
        const d = new Date(call.started_at);
        const hour = d.getHours();
        const day = format(d, 'EEEE');
        byHour[hour] = (byHour[hour] || 0) + 1;
        byDay[day] = (byDay[day] || 0) + 1;
      }
      const peakHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];
      const peakDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
      if (peakHour && peakDay) {
        const hourNum = parseInt(peakHour[0]);
        const hourStr = hourNum === 0 ? '12 AM' : hourNum < 12 ? `${hourNum} AM` : hourNum === 12 ? '12 PM' : `${hourNum - 12} PM`;
        insights.push({
          type: 'info', category: 'patterns', title: 'Busiest Times',
          message: `${peakDay[0]}s at ${hourStr} are your busiest — plan staffing accordingly`,
          priority: 'medium'
        });
      }
    }

    // 3. Service trends
    if (thisWeekServices?.length > 0 && lastWeekServices?.length > 0) {
      const thisWeekCounts = {};
      const lastWeekCounts = {};
      for (const s of thisWeekServices) thisWeekCounts[s.service_name] = (thisWeekCounts[s.service_name] || 0) + 1;
      for (const s of lastWeekServices) lastWeekCounts[s.service_name] = (lastWeekCounts[s.service_name] || 0) + 1;
      let biggestIncrease = { service: null, change: 0 };
      for (const [service, count] of Object.entries(thisWeekCounts)) {
        const lastCount = lastWeekCounts[service] || 0;
        if (lastCount > 0) {
          const change = ((count - lastCount) / lastCount) * 100;
          if (change > biggestIncrease.change && count >= 2) biggestIncrease = { service, change: Math.round(change) };
        }
      }
      if (biggestIncrease.service && biggestIncrease.change > 20) {
        insights.push({
          type: 'trend_up', category: 'services', title: 'Trending Service',
          message: `${biggestIncrease.service} bookings up ${biggestIncrease.change}% this week`,
          value: `+${biggestIncrease.change}%`, priority: 'medium'
        });
      }
    }

    // 4. Conversion rate
    const conversionRate = thisWeekCalls > 0 ? Math.round((bookedCalls / thisWeekCalls) * 100) : 0;
    if (conversionRate >= 60) {
      insights.push({
        type: 'success', category: 'performance', title: 'High Conversion',
        message: `AI booking rate at ${conversionRate}% — excellent performance`,
        value: `${conversionRate}%`, priority: 'low'
      });
    } else if (conversionRate < 30 && thisWeekCalls > 5) {
      insights.push({
        type: 'warning', category: 'performance', title: 'Low Conversion',
        message: `Booking rate at ${conversionRate}% — review call transcripts for improvement opportunities`,
        value: `${conversionRate}%`, priority: 'high'
      });
    }

    // 5. Tomorrow's forecast
    if (tomorrowAppointments > 0) {
      insights.push({
        type: 'info', category: 'forecast', title: 'Tomorrow\'s Schedule',
        message: `${tomorrowAppointments} appointment${tomorrowAppointments > 1 ? 's' : ''} booked for ${tomorrowDay}`,
        value: tomorrowAppointments.toString(), priority: 'low'
      });
    }

    // 6. New customers
    if (newCustomers > 0) {
      insights.push({
        type: 'success', category: 'growth', title: 'New Customers',
        message: `${newCustomers} new customer${newCustomers > 1 ? 's' : ''} acquired this week`,
        value: newCustomers.toString(), priority: 'medium'
      });
    }

    // 7. Follow-up opportunities
    if (staleCustomers?.length > 5) {
      insights.push({
        type: 'action', category: 'retention', title: 'Follow-up Opportunity',
        message: `${staleCustomers.length} customers haven't visited in 60+ days — consider a re-engagement campaign`,
        value: staleCustomers.length.toString(), priority: 'medium'
      });
    }

    // 8. Monthly revenue
    const totalRevenue = monthRevenue?.reduce((sum, apt) => sum + (apt.quoted_total || 0), 0) || 0;
    if (totalRevenue > 0) {
      const formattedRevenue = totalRevenue >= 100000
        ? `$${(totalRevenue / 100000).toFixed(0)}K`
        : `$${(totalRevenue / 100).toFixed(0)}`;
      insights.push({
        type: 'success', category: 'revenue', title: 'Monthly Revenue',
        message: `${formattedRevenue} in booked services this month`,
        value: formattedRevenue, priority: 'low'
      });
    }

    // 9. Average call duration
    if (callDurations?.length > 5) {
      const avgDuration = Math.round(callDurations.reduce((sum, c) => sum + c.duration_seconds, 0) / callDurations.length);
      const minutes = Math.floor(avgDuration / 60);
      const seconds = avgDuration % 60;
      insights.push({
        type: 'info', category: 'efficiency', title: 'Avg Call Time',
        message: `Average call duration is ${minutes}m ${seconds}s — AI handles calls efficiently`,
        value: `${minutes}:${seconds.toString().padStart(2, '0')}`, priority: 'low'
      });
    }

    // 10. Positive sentiment rate
    if (thisWeekCalls > 5) {
      const sentimentRate = Math.round((positiveCalls / thisWeekCalls) * 100);
      if (sentimentRate >= 70) {
        insights.push({
          type: 'success', category: 'satisfaction', title: 'Customer Satisfaction',
          message: `${sentimentRate}% of calls have positive sentiment — customers love the service`,
          value: `${sentimentRate}%`, priority: 'low'
        });
      }
    }

    // 11. Today's workload
    if (todayAppts > 0) {
      insights.push({
        type: 'info', category: 'today', title: 'Today\'s Workload',
        message: `${todayAppts} appointment${todayAppts > 1 ? 's' : ''} scheduled for today — stay on track`,
        value: todayAppts.toString(), priority: 'medium'
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const result = {
      generated_at: new Date().toISOString(),
      insights: insights.slice(0, 6)
    };
    setCache('insights', result);
    res.json(result);

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/customer-health/:id
 * Customer health score and insights
 */
router.get('/customer-health/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get customer data
    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        id,
        first_name,
        last_name,
        created_at,
        total_visits,
        vehicles (
          id,
          year,
          make,
          model,
          mileage
        )
      `)
      .eq('id', id)
      .single();

    if (error || !customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get appointment history
    const { data: appointments } = await supabase
      .from('appointments')
      .select('scheduled_date, status, quoted_total')
      .eq('customer_id', id)
      .order('scheduled_date', { ascending: false });

    // Calculate health score components
    const today = nowEST();
    const scores = {
      recency: 0,     // 0-30 points: how recently they visited
      frequency: 0,   // 0-30 points: how often they visit
      value: 0,       // 0-20 points: total spend
      loyalty: 0,     // 0-20 points: customer tenure
    };

    // Recency score (last visit)
    const completedAppointments = appointments?.filter(a => 
      a.status === 'completed' || new Date(a.scheduled_date) < today
    ) || [];
    
    if (completedAppointments.length > 0) {
      const lastVisit = new Date(completedAppointments[0].scheduled_date);
      const daysSinceVisit = differenceInDays(today, lastVisit);
      
      if (daysSinceVisit <= 30) scores.recency = 30;
      else if (daysSinceVisit <= 60) scores.recency = 25;
      else if (daysSinceVisit <= 90) scores.recency = 20;
      else if (daysSinceVisit <= 180) scores.recency = 10;
      else scores.recency = 5;
    }

    // Frequency score (visits per year)
    const customerAge = differenceInDays(today, new Date(customer.created_at));
    const yearsAsCustomer = Math.max(customerAge / 365, 0.5);
    const visitsPerYear = (customer.total_visits || completedAppointments.length) / yearsAsCustomer;
    
    if (visitsPerYear >= 6) scores.frequency = 30;
    else if (visitsPerYear >= 4) scores.frequency = 25;
    else if (visitsPerYear >= 2) scores.frequency = 20;
    else if (visitsPerYear >= 1) scores.frequency = 15;
    else scores.frequency = 10;

    // Value score (total spend)
    const totalSpend = appointments?.reduce((sum, a) => sum + (a.quoted_total || 0), 0) || 0;
    
    if (totalSpend >= 5000) scores.value = 20;
    else if (totalSpend >= 2000) scores.value = 15;
    else if (totalSpend >= 1000) scores.value = 12;
    else if (totalSpend >= 500) scores.value = 8;
    else scores.value = 5;

    // Loyalty score (tenure)
    if (customerAge >= 730) scores.loyalty = 20;  // 2+ years
    else if (customerAge >= 365) scores.loyalty = 15;  // 1+ year
    else if (customerAge >= 180) scores.loyalty = 12;  // 6+ months
    else if (customerAge >= 90) scores.loyalty = 8;   // 3+ months
    else scores.loyalty = 5;

    const totalScore = scores.recency + scores.frequency + scores.value + scores.loyalty;

    // Determine health status
    let healthStatus, healthColor;
    const isNewCustomer = customerAge < 60 && (customer.total_visits || 0) <= 1;
    
    if (totalScore >= 80) {
      healthStatus = 'Excellent';
      healthColor = 'green';
    } else if (totalScore >= 60) {
      healthStatus = 'Good';
      healthColor = 'blue';
    } else if (totalScore >= 40) {
      healthStatus = 'Fair';
      healthColor = 'yellow';
    } else if (isNewCustomer) {
      // New customers with low scores aren't "at risk" - they're just getting started
      healthStatus = 'New';
      healthColor = 'purple';
    } else {
      healthStatus = 'At Risk';
      healthColor = 'red';
    }

    // Generate recommendations
    const recommendations = [];
    
    if (scores.recency < 15) {
      recommendations.push({
        type: 'action',
        message: 'Customer hasn\'t visited recently — consider a follow-up call or reminder'
      });
    }

    // Vehicle-based recommendations
    for (const vehicle of customer.vehicles || []) {
      const vehicleAge = today.getFullYear() - (vehicle.year || 2020);
      const mileage = vehicle.mileage || 0;

      if (mileage >= 80000 || vehicleAge >= 5) {
        recommendations.push({
          type: 'service',
          message: `${vehicle.year} ${vehicle.make} ${vehicle.model} may need major service — timing belt, transmission fluid, spark plugs`
        });
      } else if (mileage >= 50000) {
        recommendations.push({
          type: 'service',
          message: `${vehicle.year} ${vehicle.make} ${vehicle.model} due for brake inspection and fluid changes`
        });
      }
    }

    if (totalSpend < 500 && completedAppointments.length > 1) {
      recommendations.push({
        type: 'upsell',
        message: 'Low average ticket — opportunity to recommend additional services'
      });
    }

    res.json({
      customer_id: id,
      health_score: totalScore,
      health_status: healthStatus,
      health_color: healthColor,
      score_breakdown: scores,
      stats: {
        total_visits: customer.total_visits || completedAppointments.length,
        total_spend: totalSpend,
        customer_since: customer.created_at,
        last_visit: completedAppointments[0]?.scheduled_date || null,
        vehicles_count: customer.vehicles?.length || 0
      },
      recommendations: recommendations.slice(0, 3)
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/call-trends
 * Detailed call analytics with sentiment and hourly breakdown
 */
router.get('/call-trends', async (req, res, next) => {
  try {
    const { period = 'week', start, end } = req.query;
    if (!validatePeriod(period)) {
      return res.status(400).json({ error: 'Invalid period. Must be day, week, month, or custom.' });
    }
    if (period === 'custom') {
      if (!start || !end) return res.status(400).json({ error: 'Custom period requires start and end dates.' });
      const s = new Date(start), e = new Date(end);
      if (isNaN(s) || isNaN(e)) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      if (differenceInDays(e, s) > 365) return res.status(400).json({ error: 'Date range must be 365 days or less.' });
    }
    let startDate;
    if (period === 'custom') {
      startDate = start;
    } else {
      const days = period === 'day' ? 1 : period === 'month' ? 30 : 7;
      startDate = daysAgoEST(days);
    }

    // Get all calls for the period
    let callsQuery = supabase
      .from('call_logs')
      .select('started_at, duration_seconds, outcome, sentiment')
      .gte('started_at', `${startDate}T00:00:00`);
    if (period === 'custom' && end) callsQuery = callsQuery.lte('started_at', `${end}T23:59:59`);
    const { data: calls } = await callsQuery.order('started_at', { ascending: true });

    // Hourly heatmap data (24 hours x 7 days)
    const hourlyHeatmap = Array(7).fill(null).map(() => Array(24).fill(0));
    const sentimentByDay = {};
    const durationByDay = {};
    const outcomesByDay = {};

    for (const call of calls || []) {
      const d = new Date(call.started_at);
      const day = d.getDay(); // 0-6
      const hour = d.getHours();
      const dateStr = format(d, 'yyyy-MM-dd');

      // Heatmap
      hourlyHeatmap[day][hour]++;

      // Sentiment by day
      if (!sentimentByDay[dateStr]) {
        sentimentByDay[dateStr] = { positive: 0, neutral: 0, negative: 0 };
      }
      const sentiment = call.sentiment || 'neutral';
      if (sentimentByDay[dateStr][sentiment] !== undefined) {
        sentimentByDay[dateStr][sentiment]++;
      }

      // Duration by day
      if (!durationByDay[dateStr]) {
        durationByDay[dateStr] = { total: 0, count: 0 };
      }
      durationByDay[dateStr].total += call.duration_seconds || 0;
      durationByDay[dateStr].count++;

      // Outcomes by day
      if (!outcomesByDay[dateStr]) {
        outcomesByDay[dateStr] = {};
      }
      const outcome = call.outcome || 'unknown';
      outcomesByDay[dateStr][outcome] = (outcomesByDay[dateStr][outcome] || 0) + 1;
    }

    // Convert to chart-friendly format
    const sentimentTrend = Object.entries(sentimentByDay)
      .map(([date, sentiments]) => ({
        date,
        ...sentiments,
        total: sentiments.positive + sentiments.neutral + sentiments.negative
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const durationTrend = Object.entries(durationByDay)
      .map(([date, data]) => ({
        date,
        avg_duration: data.count > 0 ? Math.round(data.total / data.count) : 0,
        calls: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Find peak hours
    const hourTotals = Array(24).fill(0);
    for (const day of hourlyHeatmap) {
      for (let h = 0; h < 24; h++) {
        hourTotals[h] += day[h];
      }
    }
    const peakHour = hourTotals.indexOf(Math.max(...hourTotals));

    res.json({
      period,
      total_calls: calls?.length || 0,
      hourly_heatmap: hourlyHeatmap,
      day_labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      sentiment_trend: sentimentTrend,
      duration_trend: durationTrend,
      peak_hour: peakHour,
      peak_hour_label: peakHour === 0 ? '12 AM' : peakHour < 12 ? `${peakHour} AM` : peakHour === 12 ? '12 PM' : `${peakHour - 12} PM`
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/revenue
 * Revenue analytics with trends and breakdowns
 */
router.get('/revenue', async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    if (!validatePeriod(period)) {
      return res.status(400).json({ error: 'Invalid period. Must be day, week, or month.' });
    }
    const today = nowEST();
    const days = period === 'week' ? 7 : period === 'day' ? 1 : 30;
    const startDate = daysAgoEST(days);
    const prevStartDate = format(subDays(today, days * 2), 'yyyy-MM-dd');
    const prevEndDate = format(subDays(today, days + 1), 'yyyy-MM-dd');

    // Current period revenue
    const { data: currentAppointments } = await supabase
      .from('appointments')
      .select('scheduled_date, quoted_total, final_total, status')
      .gte('scheduled_date', startDate)
      .not('status', 'in', '("cancelled","no_show")');

    // Previous period revenue for comparison
    const { data: prevAppointments } = await supabase
      .from('appointments')
      .select('quoted_total, final_total')
      .gte('scheduled_date', prevStartDate)
      .lte('scheduled_date', prevEndDate)
      .not('status', 'in', '("cancelled","no_show")');

    // Revenue by service category
    const { data: serviceRevenue } = await supabase
      .from('appointment_services')
      .select(`
        service_name,
        quoted_price,
        final_price,
        service:services (
          category:service_categories (name)
        ),
        appointment:appointments!inner (scheduled_date, status)
      `)
      .gte('appointment.scheduled_date', startDate)
      .not('appointment.status', 'in', '("cancelled","no_show")');

    // Calculate totals
    const currentRevenue = currentAppointments?.reduce((sum, a) => sum + (a.final_total || a.quoted_total || 0), 0) || 0;
    const prevRevenue = prevAppointments?.reduce((sum, a) => sum + (a.final_total || a.quoted_total || 0), 0) || 0;
    const revenueChange = prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) : 0;

    // Average ticket value
    const avgTicket = currentAppointments?.length > 0 
      ? Math.round(currentRevenue / currentAppointments.length) 
      : 0;
    const prevAvgTicket = prevAppointments?.length > 0 
      ? Math.round(prevRevenue / prevAppointments.length) 
      : 0;
    const avgTicketChange = prevAvgTicket > 0 ? Math.round(((avgTicket - prevAvgTicket) / prevAvgTicket) * 100) : 0;

    // Revenue by day
    const revenueByDay = {};
    for (const apt of currentAppointments || []) {
      const date = apt.scheduled_date;
      if (!revenueByDay[date]) {
        revenueByDay[date] = { revenue: 0, appointments: 0 };
      }
      revenueByDay[date].revenue += apt.final_total || apt.quoted_total || 0;
      revenueByDay[date].appointments++;
    }

    const revenueTrend = Object.entries(revenueByDay)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Revenue by category
    const byCategory = {};
    for (const svc of serviceRevenue || []) {
      const categoryName = svc.service?.category?.name || 'Other';
      if (!byCategory[categoryName]) {
        byCategory[categoryName] = 0;
      }
      byCategory[categoryName] += svc.final_price || svc.quoted_price || 0;
    }

    const categoryBreakdown = Object.entries(byCategory)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    // Top services by revenue
    const byService = {};
    for (const svc of serviceRevenue || []) {
      if (!byService[svc.service_name]) {
        byService[svc.service_name] = { revenue: 0, count: 0 };
      }
      byService[svc.service_name].revenue += svc.final_price || svc.quoted_price || 0;
      byService[svc.service_name].count++;
    }

    const topServices = Object.entries(byService)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({
      period,
      current: {
        total_revenue: currentRevenue,
        appointments: currentAppointments?.length || 0,
        avg_ticket: avgTicket
      },
      comparison: {
        revenue_change: revenueChange,
        avg_ticket_change: avgTicketChange,
        prev_revenue: prevRevenue
      },
      revenue_trend: revenueTrend,
      by_category: categoryBreakdown,
      top_services: topServices
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/customers
 * Customer analytics with acquisition and health metrics
 */
router.get('/customers', async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    if (!validatePeriod(period)) {
      return res.status(400).json({ error: 'Invalid period. Must be day, week, or month.' });
    }
    const today = nowEST();
    const days = period === 'week' ? 7 : period === 'day' ? 1 : 30;
    const startDate = daysAgoEST(days);
    const prevStartDate = format(subDays(today, days * 2), 'yyyy-MM-dd');
    const prevEndDate = format(subDays(today, days + 1), 'yyyy-MM-dd');

    // New customers this period
    const { count: newCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${startDate}T00:00:00`);

    // New customers previous period
    const { count: prevNewCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${prevStartDate}T00:00:00`)
      .lte('created_at', `${prevEndDate}T23:59:59`);

    const newCustomerChange = prevNewCustomers > 0 
      ? Math.round(((newCustomers - prevNewCustomers) / prevNewCustomers) * 100) 
      : 0;

    // Total active customers (visited in last 90 days)
    const ninetyDaysAgo = format(subDays(today, 90), 'yyyy-MM-dd');
    const { count: activeCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .gte('last_visit_date', ninetyDaysAgo);

    // Total customers
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    // Customer acquisition trend
    const { data: customersByDate } = await supabase
      .from('customers')
      .select('created_at')
      .gte('created_at', `${startDate}T00:00:00`);

    const acquisitionByDay = {};
    for (const c of customersByDate || []) {
      const date = format(new Date(c.created_at), 'yyyy-MM-dd');
      acquisitionByDay[date] = (acquisitionByDay[date] || 0) + 1;
    }

    const acquisitionTrend = Object.entries(acquisitionByDay)
      .map(([date, count]) => ({ date, new_customers: count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top customers by spend
    const { data: topCustomers } = await supabase
      .from('customers')
      .select('id, first_name, last_name, total_visits, total_spent, last_visit_date')
      .order('total_spent', { ascending: false })
      .limit(10);

    // At-risk customers (no visit in 60+ days but have visited before)
    const sixtyDaysAgo = format(subDays(today, 60), 'yyyy-MM-dd');
    const { count: atRiskCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .lt('last_visit_date', sixtyDaysAgo)
      .gt('total_visits', 0);

    // Customer health distribution
    const { data: allCustomersHealth } = await supabase
      .from('customers')
      .select('total_visits, total_spent, last_visit_date, created_at')
      .gt('total_visits', 0);

    let healthDistribution = { excellent: 0, good: 0, fair: 0, new: 0, at_risk: 0 };
    
    for (const c of allCustomersHealth || []) {
      const daysSinceVisit = c.last_visit_date 
        ? differenceInDays(today, new Date(c.last_visit_date)) 
        : 999;
      const customerAge = differenceInDays(today, new Date(c.created_at));
      const visitsPerYear = customerAge > 0 ? (c.total_visits / (customerAge / 365)) : 0;
      const isNewCustomer = customerAge < 60 && (c.total_visits || 0) <= 1;
      
      // Simple health scoring
      let score = 0;
      if (daysSinceVisit <= 30) score += 30;
      else if (daysSinceVisit <= 60) score += 20;
      else if (daysSinceVisit <= 90) score += 10;
      
      if (visitsPerYear >= 4) score += 30;
      else if (visitsPerYear >= 2) score += 20;
      else if (visitsPerYear >= 1) score += 10;
      
      if ((c.total_spent || 0) >= 2000) score += 20;
      else if ((c.total_spent || 0) >= 1000) score += 15;
      else if ((c.total_spent || 0) >= 500) score += 10;

      if (score >= 60) healthDistribution.excellent++;
      else if (score >= 40) healthDistribution.good++;
      else if (score >= 20) healthDistribution.fair++;
      else if (isNewCustomer) healthDistribution.new++;
      else healthDistribution.at_risk++;
    }

    // Returning vs new (appointments this period)
    const { data: periodAppointments } = await supabase
      .from('appointments')
      .select('customer_id, customer:customers(total_visits)')
      .gte('scheduled_date', startDate)
      .not('status', 'in', '("cancelled","no_show")');

    let returningCount = 0;
    let newCount = 0;
    const seenCustomers = new Set();
    
    for (const apt of periodAppointments || []) {
      if (!seenCustomers.has(apt.customer_id)) {
        seenCustomers.add(apt.customer_id);
        if ((apt.customer?.total_visits || 0) > 1) {
          returningCount++;
        } else {
          newCount++;
        }
      }
    }

    const returningRate = (returningCount + newCount) > 0 
      ? Math.round((returningCount / (returningCount + newCount)) * 100) 
      : 0;

    res.json({
      period,
      summary: {
        total_customers: totalCustomers || 0,
        active_customers: activeCustomers || 0,
        new_customers: newCustomers || 0,
        new_customer_change: newCustomerChange,
        at_risk_customers: atRiskCustomers || 0,
        returning_rate: returningRate
      },
      health_distribution: healthDistribution,
      acquisition_trend: acquisitionTrend,
      top_customers: topCustomers?.map(c => ({
        id: c.id,
        name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
        visits: c.total_visits || 0,
        total_spent: c.total_spent || 0,
        last_visit: c.last_visit_date
      })) || []
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/recall-alerts
 * Vehicles with open recalls — cached 30 min
 */
router.get('/recall-alerts', async (req, res, next) => {
  try {
    const cached = getCached('recall-alerts', 30 * 60 * 1000);
    if (cached) return res.json(cached);

    // Get vehicles with VINs, joined to customers
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('id, vin, year, make, model, mileage, customer_id, customers (id, first_name, last_name)')
      .neq('vin', null)
      .limit(20);

    if (error) throw error;

    // Filter to valid 17-char VINs
    const validVehicles = (vehicles || []).filter(v => v.vin && v.vin.length === 17);

    if (validVehicles.length === 0) {
      const result = { alerts: [] };
      setCache('recall-alerts', result);
      return res.json(result);
    }

    const { getRecalls } = await import('../services/vehicle-databases.js');

    // Check recalls in parallel with 5s timeout per call
    const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
    const recallResults = await Promise.allSettled(
      validVehicles.map(v =>
        Promise.race([getRecalls(v.vin), timeout(5000)])
          .then(result => ({ vehicle: v, result }))
          .catch(() => ({ vehicle: v, result: null }))
      )
    );

    const alerts = [];
    for (const entry of recallResults) {
      const { vehicle: v, result } = entry.status === 'fulfilled' ? entry.value : { vehicle: null, result: null };
      if (!result?.success || !result.has_open_recalls) continue;
      alerts.push({
        customer_id: v.customer_id,
        customer_name: v.customers ? `${v.customers.first_name || ''} ${v.customers.last_name || ''}`.trim() : 'Unknown',
        vehicle_id: v.id,
        vehicle: `${v.year} ${v.make} ${v.model}`,
        recall_count: result.recall_count,
        recalls: result.recalls.slice(0, 3).map(r => ({
          component: r.component,
          summary: r.summary
        }))
      });
    }

    const result = { alerts };
    setCache('recall-alerts', result);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/comprehensive
 * All-in-one analytics endpoint for dashboard
 */
router.get('/comprehensive', async (req, res, next) => {
  try {
    const { period = 'week', start, end } = req.query;
    if (!validatePeriod(period)) {
      return res.status(400).json({ error: 'Invalid period. Must be day, week, month, or custom.' });
    }
    if (period === 'custom') {
      if (!start || !end) return res.status(400).json({ error: 'Custom period requires start and end dates.' });
      const s = new Date(start), e = new Date(end);
      if (isNaN(s) || isNaN(e)) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      if (differenceInDays(e, s) > 365) return res.status(400).json({ error: 'Date range must be 365 days or less.' });
    }

    const cacheKey = `comprehensive:${period}:${start || ''}:${end || ''}`;
    const cached = getCached(cacheKey, 2 * 60 * 1000);
    if (cached) return res.json(cached);

    const today = nowEST();
    const todayStr = todayEST();

    let startDate, days;
    if (period === 'custom') {
      startDate = start;
      days = differenceInDays(new Date(end), new Date(start));
    } else {
      days = period === 'week' ? 7 : period === 'day' ? 1 : 30;
      startDate = daysAgoEST(days);
    }
    const prevStartDate = period === 'custom'
      ? format(subDays(new Date(start), days), 'yyyy-MM-dd')
      : format(subDays(today, days * 2), 'yyyy-MM-dd');
    const prevEndDate = period === 'custom'
      ? format(subDays(new Date(start), 1), 'yyyy-MM-dd')
      : format(subDays(today, days + 1), 'yyyy-MM-dd');
    const monthStart = monthStartEST();

    const ninetyDaysAgo = format(subDays(today, 90), 'yyyy-MM-dd');
    const sixtyDaysAgo = format(subDays(today, 60), 'yyyy-MM-dd');

    const endFilter = period === 'custom' ? end : null;

    // Build current-period queries with optional end-date filter
    let callsQ = supabase.from('call_logs').select('id, outcome, sentiment, duration_seconds').gte('started_at', `${startDate}T00:00:00`);
    if (endFilter) callsQ = callsQ.lte('started_at', `${endFilter}T23:59:59`);

    let bookedQ = supabase.from('call_logs').select('id', { count: 'exact', head: true }).gte('started_at', `${startDate}T00:00:00`).eq('outcome', 'booked');
    if (endFilter) bookedQ = bookedQ.lte('started_at', `${endFilter}T23:59:59`);

    let apptsQ = supabase.from('appointments').select('scheduled_date, quoted_total, final_total, status').gte('scheduled_date', startDate).not('status', 'in', '("cancelled","no_show")');
    if (endFilter) apptsQ = apptsQ.lte('scheduled_date', endFilter);

    let newCustQ = supabase.from('customers').select('id', { count: 'exact', head: true }).gte('created_at', `${startDate}T00:00:00`);
    if (endFilter) newCustQ = newCustQ.lte('created_at', `${endFilter}T23:59:59`);

    let sentimentQ = supabase.from('call_logs').select('id', { count: 'exact', head: true }).gte('started_at', `${startDate}T00:00:00`).eq('sentiment', 'positive');
    if (endFilter) sentimentQ = sentimentQ.lte('started_at', `${endFilter}T23:59:59`);

    let svcRevQ = supabase.from('appointment_services').select(`
          service_name, quoted_price, final_price,
          service:services ( category:service_categories (name) ),
          appointment:appointments!inner (scheduled_date, status)
        `).gte('appointment.scheduled_date', startDate).not('appointment.status', 'in', '("cancelled","no_show")');
    if (endFilter) svcRevQ = svcRevQ.lte('appointment.scheduled_date', endFilter);

    let periodApptsQ = supabase.from('appointments').select('customer_id, customer:customers(total_visits)').gte('scheduled_date', startDate).not('status', 'in', '("cancelled","no_show")');
    if (endFilter) periodApptsQ = periodApptsQ.lte('scheduled_date', endFilter);

    // Parallel queries for performance
    const [
      callsResult,
      prevCallsResult,
      bookedCallsResult,
      appointmentsResult,
      prevAppointmentsResult,
      newCustomersResult,
      prevNewCustomersResult,
      sentimentResult,
      monthRevenueResult,
      todayApptsResult,
      serviceRevenueResult,
      topCustomersResult,
      allCustomersHealthResult,
      periodAppointmentsResult
    ] = await Promise.all([
      callsQ,
      supabase.from('call_logs').select('id', { count: 'exact', head: true })
        .gte('started_at', `${prevStartDate}T00:00:00`).lte('started_at', `${prevEndDate}T23:59:59`),
      bookedQ,
      apptsQ,
      supabase.from('appointments').select('quoted_total, final_total')
        .gte('scheduled_date', prevStartDate).lte('scheduled_date', prevEndDate)
        .not('status', 'in', '("cancelled","no_show")'),
      newCustQ,
      supabase.from('customers').select('id', { count: 'exact', head: true })
        .gte('created_at', `${prevStartDate}T00:00:00`).lte('created_at', `${prevEndDate}T23:59:59`),
      sentimentQ,
      supabase.from('appointments').select('quoted_total, final_total')
        .gte('scheduled_date', monthStart).not('status', 'in', '("cancelled","no_show")'),
      supabase.from('appointments').select('id', { count: 'exact', head: true })
        .eq('scheduled_date', todayStr).not('status', 'in', '("cancelled","no_show")'),
      svcRevQ,
      supabase.from('customers').select('id, first_name, last_name, total_visits, total_spent, last_visit_date')
        .order('total_spent', { ascending: false }).limit(10),
      supabase.from('customers').select('total_visits, total_spent, last_visit_date, created_at')
        .gt('total_visits', 0),
      periodApptsQ
    ]);

    const calls = callsResult.data || [];
    const totalCalls = calls.length;
    const prevCalls = prevCallsResult.count || 0;
    const bookedCalls = bookedCallsResult.count || 0;
    const positiveCalls = sentimentResult.count || 0;

    // Call metrics
    const callChange = prevCalls > 0 ? Math.round(((totalCalls - prevCalls) / prevCalls) * 100) : 0;
    const conversionRate = totalCalls > 0 ? Math.round((bookedCalls / totalCalls) * 100) : 0;
    const satisfactionRate = totalCalls > 0 ? Math.round((positiveCalls / totalCalls) * 100) : 0;
    
    const avgDuration = calls.length > 0 
      ? Math.round(calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / calls.length)
      : 0;

    // Outcome breakdown
    const outcomeBreakdown = {};
    for (const call of calls) {
      const outcome = call.outcome || 'unknown';
      outcomeBreakdown[outcome] = (outcomeBreakdown[outcome] || 0) + 1;
    }

    // Revenue metrics
    const currentAppts = appointmentsResult.data || [];
    const prevAppts = prevAppointmentsResult.data || [];
    const monthAppts = monthRevenueResult.data || [];

    const currentRevenue = currentAppts.reduce((sum, a) => sum + (a.final_total || a.quoted_total || 0), 0);
    const prevRevenue = prevAppts.reduce((sum, a) => sum + (a.final_total || a.quoted_total || 0), 0);
    const monthRevenue = monthAppts.reduce((sum, a) => sum + (a.final_total || a.quoted_total || 0), 0);
    const revenueChange = prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) : 0;

    const avgTicket = currentAppts.length > 0 ? Math.round(currentRevenue / currentAppts.length) : 0;

    // Revenue trend (daily breakdown)
    const revenueByDay = {};
    for (const apt of currentAppts) {
      const date = apt.scheduled_date;
      if (!revenueByDay[date]) {
        revenueByDay[date] = { revenue: 0, appointments: 0 };
      }
      revenueByDay[date].revenue += apt.final_total || apt.quoted_total || 0;
      revenueByDay[date].appointments++;
    }
    const revenueTrend = Object.entries(revenueByDay)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Revenue by category
    const serviceRevData = serviceRevenueResult.data || [];
    const byCategory = {};
    const byService = {};
    for (const svc of serviceRevData) {
      const categoryName = svc.service?.category?.name || 'Other';
      byCategory[categoryName] = (byCategory[categoryName] || 0) + (svc.final_price || svc.quoted_price || 0);

      if (!byService[svc.service_name]) {
        byService[svc.service_name] = { count: 0, revenue: 0 };
      }
      byService[svc.service_name].count++;
      byService[svc.service_name].revenue += svc.final_price || svc.quoted_price || 0;
    }
    const categoryBreakdown = Object.entries(byCategory)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    // Top services by count
    const topServices = Object.entries(byService)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Customer metrics
    const newCustomers = newCustomersResult.count || 0;
    const prevNewCustomers = prevNewCustomersResult.count || 0;
    const customerChange = prevNewCustomers > 0
      ? Math.round(((newCustomers - prevNewCustomers) / prevNewCustomers) * 100)
      : 0;

    // Top customers
    const topCustomers = (topCustomersResult.data || []).map(c => ({
      id: c.id,
      name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
      visits: c.total_visits || 0,
      total_spent: c.total_spent || 0,
      last_visit: c.last_visit_date
    }));

    // Health distribution
    const healthDistribution = { excellent: 0, good: 0, fair: 0, new: 0, at_risk: 0 };
    for (const c of allCustomersHealthResult.data || []) {
      const daysSinceVisit = c.last_visit_date
        ? differenceInDays(today, new Date(c.last_visit_date))
        : 999;
      const customerAge = differenceInDays(today, new Date(c.created_at));
      const visitsPerYear = customerAge > 0 ? (c.total_visits / (customerAge / 365)) : 0;
      const isNewCustomer = customerAge < 60 && (c.total_visits || 0) <= 1;

      let score = 0;
      if (daysSinceVisit <= 30) score += 30;
      else if (daysSinceVisit <= 60) score += 20;
      else if (daysSinceVisit <= 90) score += 10;

      if (visitsPerYear >= 4) score += 30;
      else if (visitsPerYear >= 2) score += 20;
      else if (visitsPerYear >= 1) score += 10;

      if ((c.total_spent || 0) >= 2000) score += 20;
      else if ((c.total_spent || 0) >= 1000) score += 15;
      else if ((c.total_spent || 0) >= 500) score += 10;

      if (score >= 60) healthDistribution.excellent++;
      else if (score >= 40) healthDistribution.good++;
      else if (score >= 20) healthDistribution.fair++;
      else if (isNewCustomer) healthDistribution.new++;
      else healthDistribution.at_risk++;
    }

    // Returning rate
    let returningCount = 0;
    let newCount = 0;
    const seenCustomers = new Set();
    for (const apt of periodAppointmentsResult.data || []) {
      if (!seenCustomers.has(apt.customer_id)) {
        seenCustomers.add(apt.customer_id);
        if ((apt.customer?.total_visits || 0) > 1) {
          returningCount++;
        } else {
          newCount++;
        }
      }
    }
    const returningRate = (returningCount + newCount) > 0
      ? Math.round((returningCount / (returningCount + newCount)) * 100)
      : 0;

    const result = {
      period,
      generated_at: new Date().toISOString(),
      calls: {
        total: totalCalls,
        change: callChange,
        conversion_rate: conversionRate,
        satisfaction_rate: satisfactionRate,
        avg_duration_seconds: avgDuration,
        booked: bookedCalls,
        by_outcome: outcomeBreakdown
      },
      revenue: {
        period_total: currentRevenue,
        month_total: monthRevenue,
        change: revenueChange,
        avg_ticket: avgTicket,
        appointments: currentAppts.length
      },
      revenue_trend: revenueTrend,
      by_category: categoryBreakdown,
      top_services: topServices,
      customers: {
        new: newCustomers,
        change: customerChange
      },
      top_customers: topCustomers,
      health_distribution: healthDistribution,
      returning_rate: returningRate,
      today: {
        appointments: todayApptsResult.count || 0
      }
    };
    setCache(cacheKey, result);
    res.json(result);

  } catch (error) {
    next(error);
  }
});

export default router;
