import { Router } from 'express';
import { supabase } from '../config/database.js';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays, addDays } from 'date-fns';

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

/**
 * GET /api/analytics/insights
 * AI-generated insights based on data patterns
 */
router.get('/insights', async (req, res, next) => {
  try {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(today), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(today), 'yyyy-MM-dd');
    const lastWeekStart = format(subDays(startOfWeek(today), 7), 'yyyy-MM-dd');
    const lastWeekEnd = format(subDays(endOfWeek(today), 7), 'yyyy-MM-dd');
    
    const insights = [];

    // 1. Call volume comparison (this week vs last week)
    const { count: thisWeekCalls } = await supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', `${weekStart}T00:00:00`)
      .lte('started_at', `${weekEnd}T23:59:59`);

    const { count: lastWeekCalls } = await supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', `${lastWeekStart}T00:00:00`)
      .lte('started_at', `${lastWeekEnd}T23:59:59`);

    if (lastWeekCalls > 0) {
      const callChange = Math.round(((thisWeekCalls - lastWeekCalls) / lastWeekCalls) * 100);
      if (callChange > 10) {
        insights.push({
          type: 'trend_up',
          category: 'calls',
          title: 'Call Volume Up',
          message: `Call volume is up ${callChange}% compared to last week`,
          value: `+${callChange}%`,
          priority: 'high'
        });
      } else if (callChange < -10) {
        insights.push({
          type: 'trend_down',
          category: 'calls',
          title: 'Call Volume Down',
          message: `Call volume is down ${Math.abs(callChange)}% compared to last week`,
          value: `${callChange}%`,
          priority: 'medium'
        });
      }
    }

    // 2. Peak call times
    const { data: recentCalls } = await supabase
      .from('call_logs')
      .select('started_at')
      .gte('started_at', `${lastWeekStart}T00:00:00`);

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
          type: 'info',
          category: 'patterns',
          title: 'Busiest Times',
          message: `${peakDay[0]}s at ${hourStr} are your busiest — plan staffing accordingly`,
          priority: 'medium'
        });
      }
    }

    // 3. Service trends
    const { data: thisWeekServices } = await supabase
      .from('appointment_services')
      .select('service_name, appointment:appointments!inner(scheduled_date)')
      .gte('appointment.scheduled_date', weekStart)
      .lte('appointment.scheduled_date', weekEnd);

    const { data: lastWeekServices } = await supabase
      .from('appointment_services')
      .select('service_name, appointment:appointments!inner(scheduled_date)')
      .gte('appointment.scheduled_date', lastWeekStart)
      .lte('appointment.scheduled_date', lastWeekEnd);

    if (thisWeekServices?.length > 0 && lastWeekServices?.length > 0) {
      const thisWeekCounts = {};
      const lastWeekCounts = {};
      
      for (const s of thisWeekServices) {
        thisWeekCounts[s.service_name] = (thisWeekCounts[s.service_name] || 0) + 1;
      }
      for (const s of lastWeekServices) {
        lastWeekCounts[s.service_name] = (lastWeekCounts[s.service_name] || 0) + 1;
      }

      // Find trending service
      let biggestIncrease = { service: null, change: 0 };
      for (const [service, count] of Object.entries(thisWeekCounts)) {
        const lastCount = lastWeekCounts[service] || 0;
        if (lastCount > 0) {
          const change = ((count - lastCount) / lastCount) * 100;
          if (change > biggestIncrease.change && count >= 2) {
            biggestIncrease = { service, change: Math.round(change) };
          }
        }
      }

      if (biggestIncrease.service && biggestIncrease.change > 20) {
        insights.push({
          type: 'trend_up',
          category: 'services',
          title: 'Trending Service',
          message: `${biggestIncrease.service} bookings up ${biggestIncrease.change}% this week`,
          value: `+${biggestIncrease.change}%`,
          priority: 'medium'
        });
      }
    }

    // 4. Conversion rate insight
    const { count: bookedCalls } = await supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .gte('started_at', `${weekStart}T00:00:00`)
      .lte('started_at', `${weekEnd}T23:59:59`)
      .eq('outcome', 'booked');

    const conversionRate = thisWeekCalls > 0 ? Math.round((bookedCalls / thisWeekCalls) * 100) : 0;
    
    if (conversionRate >= 60) {
      insights.push({
        type: 'success',
        category: 'performance',
        title: 'High Conversion',
        message: `AI booking rate at ${conversionRate}% — excellent performance`,
        value: `${conversionRate}%`,
        priority: 'low'
      });
    } else if (conversionRate < 30 && thisWeekCalls > 5) {
      insights.push({
        type: 'warning',
        category: 'performance',
        title: 'Low Conversion',
        message: `Booking rate at ${conversionRate}% — review call transcripts for improvement opportunities`,
        value: `${conversionRate}%`,
        priority: 'high'
      });
    }

    // 5. Tomorrow's forecast
    const tomorrow = format(addDays(today, 1), 'yyyy-MM-dd');
    const tomorrowDay = format(addDays(today, 1), 'EEEE');
    
    const { count: tomorrowAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('scheduled_date', tomorrow)
      .not('status', 'in', '("cancelled","no_show")');

    if (tomorrowAppointments > 0) {
      insights.push({
        type: 'info',
        category: 'forecast',
        title: 'Tomorrow\'s Schedule',
        message: `${tomorrowAppointments} appointment${tomorrowAppointments > 1 ? 's' : ''} booked for ${tomorrowDay}`,
        value: tomorrowAppointments.toString(),
        priority: 'low'
      });
    }

    // 6. New customers
    const { count: newCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${weekStart}T00:00:00`);

    if (newCustomers > 0) {
      insights.push({
        type: 'success',
        category: 'growth',
        title: 'New Customers',
        message: `${newCustomers} new customer${newCustomers > 1 ? 's' : ''} acquired this week`,
        value: newCustomers.toString(),
        priority: 'medium'
      });
    }

    // 7. Follow-up opportunities (customers who visited but haven't returned in 60+ days)
    const sixtyDaysAgo = format(subDays(today, 60), 'yyyy-MM-dd');
    const { data: staleCustomers } = await supabase
      .from('customers')
      .select('id')
      .lt('updated_at', `${sixtyDaysAgo}T00:00:00`)
      .gt('total_visits', 0)
      .limit(50);

    if (staleCustomers?.length > 5) {
      insights.push({
        type: 'action',
        category: 'retention',
        title: 'Follow-up Opportunity',
        message: `${staleCustomers.length} customers haven't visited in 60+ days — consider a re-engagement campaign`,
        value: staleCustomers.length.toString(),
        priority: 'medium'
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    res.json({
      generated_at: new Date().toISOString(),
      insights: insights.slice(0, 6) // Return top 6 insights
    });

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
    const today = new Date();
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
    if (totalScore >= 80) {
      healthStatus = 'Excellent';
      healthColor = 'green';
    } else if (totalScore >= 60) {
      healthStatus = 'Good';
      healthColor = 'blue';
    } else if (totalScore >= 40) {
      healthStatus = 'Fair';
      healthColor = 'yellow';
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
    const { period = 'week' } = req.query;
    const days = period === 'day' ? 1 : period === 'month' ? 30 : 7;
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

    // Get all calls for the period
    const { data: calls } = await supabase
      .from('call_logs')
      .select('started_at, duration_seconds, outcome, sentiment')
      .gte('started_at', `${startDate}T00:00:00`)
      .order('started_at', { ascending: true });

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

export default router;
