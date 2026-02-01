import { Router } from 'express';
import { supabase } from '../config/database.js';
import { format, parseISO } from 'date-fns';

const router = Router();

/**
 * GET /api/call-center/calls
 * Get all calls with full details for the call center dashboard
 */
router.get('/calls', async (req, res, next) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      phone,
      outcome,
      sentiment,
      start_date,
      end_date
    } = req.query;

    let query = supabase
      .from('call_logs')
      .select(`
        id,
        retell_call_id,
        phone_number,
        direction,
        started_at,
        ended_at,
        duration_seconds,
        outcome,
        transcript,
        transcript_summary,
        recording_url,
        sentiment,
        intent_detected,
        customer_id,
        appointment_id,
        customers (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        appointments (
          id,
          scheduled_date,
          scheduled_time,
          status
        )
      `, { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (phone) {
      query = query.ilike('phone_number', `%${phone}%`);
    }
    if (outcome) {
      query = query.eq('outcome', outcome);
    }
    if (sentiment) {
      query = query.eq('sentiment', sentiment);
    }
    if (start_date) {
      query = query.gte('started_at', start_date);
    }
    if (end_date) {
      query = query.lte('started_at', end_date);
    }

    const { data: calls, error, count } = await query;

    if (error) throw error;

    // Format the response (include date/time of call for full call records)
    const formattedCalls = calls.map(call => {
      const started = call.started_at ? parseISO(call.started_at) : null;
      return {
      id: call.id,
      retell_call_id: call.retell_call_id,
      phone_number: call.phone_number,
      direction: call.direction,
      started_at: call.started_at,
      ended_at: call.ended_at,
      call_date: started ? format(started, 'yyyy-MM-dd') : null,
      call_time: started ? format(started, 'h:mm a') : null,
      duration_seconds: call.duration_seconds,
      duration_formatted: formatDuration(call.duration_seconds),
      outcome: call.outcome,
      sentiment: call.sentiment,
      intent: call.intent_detected,
      summary: call.transcript_summary,
      transcript: call.transcript,
      recording_url: call.recording_url,
      customer: call.customers ? {
        id: call.customers.id,
        name: `${call.customers.first_name || ''} ${call.customers.last_name || ''}`.trim() || 'Unknown',
        email: call.customers.email,
        phone: call.customers.phone
      } : null,
      appointment: call.appointments ? {
        id: call.appointments.id,
        date: call.appointments.scheduled_date,
        time: call.appointments.scheduled_time,
        status: call.appointments.status
      } : null
    };
    });

    res.json({
      success: true,
      calls: formattedCalls,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: offset + calls.length < count
      }
    });

  } catch (error) {
    console.error('Get calls error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/call-center/calls/:id
 * Get a single call with full details
 */
router.get('/calls/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: call, error } = await supabase
      .from('call_logs')
      .select(`
        *,
        customers (
          id,
          first_name,
          last_name,
          email,
          phone,
          total_visits,
          vehicles (
            id,
            year,
            make,
            model
          )
        ),
        appointments (
          id,
          scheduled_date,
          scheduled_time,
          status,
          notes,
          appointment_services (
            services (
              name,
              price_min
            )
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found' });
    }

    res.json({
      success: true,
      call: {
        ...call,
        duration_formatted: formatDuration(call.duration_seconds),
        customer: call.customers ? {
          id: call.customers.id,
          name: `${call.customers.first_name || ''} ${call.customers.last_name || ''}`.trim(),
          email: call.customers.email,
          phone: call.customers.phone,
          total_visits: call.customers.total_visits,
          vehicles: call.customers.vehicles
        } : null
      }
    });

  } catch (error) {
    console.error('Get call error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/call-center/stats
 * Get call center statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    // Default to last 7 days
    const endDate = end_date || new Date().toISOString();
    const startDate = start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get call counts by outcome
    const { data: outcomeCounts } = await supabase
      .from('call_logs')
      .select('outcome')
      .gte('started_at', startDate)
      .lte('started_at', endDate);

    // Get call counts by sentiment
    const { data: sentimentCounts } = await supabase
      .from('call_logs')
      .select('sentiment')
      .gte('started_at', startDate)
      .lte('started_at', endDate);

    // Get average duration
    const { data: durationData } = await supabase
      .from('call_logs')
      .select('duration_seconds')
      .gte('started_at', startDate)
      .lte('started_at', endDate)
      .not('duration_seconds', 'is', null);

    // Calculate stats
    const totalCalls = outcomeCounts?.length || 0;
    const outcomes = {};
    outcomeCounts?.forEach(c => {
      outcomes[c.outcome || 'unknown'] = (outcomes[c.outcome || 'unknown'] || 0) + 1;
    });

    const sentiments = {};
    sentimentCounts?.forEach(c => {
      sentiments[c.sentiment || 'unknown'] = (sentiments[c.sentiment || 'unknown'] || 0) + 1;
    });

    const avgDuration = durationData?.length 
      ? Math.round(durationData.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / durationData.length)
      : 0;

    // Get daily call counts
    const { data: dailyCalls } = await supabase
      .from('call_logs')
      .select('started_at')
      .gte('started_at', startDate)
      .lte('started_at', endDate)
      .order('started_at', { ascending: true });

    // Group by date
    const dailyStats = {};
    dailyCalls?.forEach(c => {
      const date = c.started_at?.split('T')[0];
      if (date) {
        dailyStats[date] = (dailyStats[date] || 0) + 1;
      }
    });

    res.json({
      success: true,
      stats: {
        period: { start: startDate, end: endDate },
        total_calls: totalCalls,
        outcomes,
        sentiments,
        average_duration_seconds: avgDuration,
        average_duration_formatted: formatDuration(avgDuration),
        booking_rate: totalCalls > 0 ? Math.round((outcomes.booked || 0) / totalCalls * 100) : 0,
        daily_calls: dailyStats
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/call-center/customers/:id/calls
 * Get all calls for a specific customer
 */
router.get('/customers/:id/calls', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 20 } = req.query;

    const { data: calls, error } = await supabase
      .from('call_logs')
      .select(`
        id,
        retell_call_id,
        phone_number,
        started_at,
        duration_seconds,
        outcome,
        sentiment,
        transcript_summary,
        recording_url,
        appointments (
          id,
          scheduled_date,
          scheduled_time
        )
      `)
      .eq('customer_id', id)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({
      success: true,
      calls: calls.map(c => ({
        ...c,
        duration_formatted: formatDuration(c.duration_seconds)
      }))
    });

  } catch (error) {
    console.error('Get customer calls error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/call-center/recent
 * Get recent calls for quick view
 */
router.get('/recent', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const { data: calls, error } = await supabase
      .from('call_logs')
      .select(`
        id,
        phone_number,
        started_at,
        duration_seconds,
        outcome,
        sentiment,
        transcript_summary,
        customers (
          first_name,
          last_name
        )
      `)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({
      success: true,
      calls: calls.map(c => ({
        id: c.id,
        phone: c.phone_number,
        customer_name: c.customers 
          ? `${c.customers.first_name || ''} ${c.customers.last_name || ''}`.trim() 
          : 'Unknown',
        started_at: c.started_at,
        duration: formatDuration(c.duration_seconds),
        outcome: c.outcome,
        sentiment: c.sentiment,
        summary: c.transcript_summary
      }))
    });

  } catch (error) {
    console.error('Get recent calls error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to format duration
function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default router;
