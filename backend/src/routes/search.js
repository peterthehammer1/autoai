import { Router } from 'express';
import { supabase } from '../config/database.js';
import { format } from 'date-fns';

const router = Router();

/**
 * GET /api/search?q=term&limit=10
 * Global search across customers, appointments, and services
 */
router.get('/', async (req, res, next) => {
  try {
    const { q, limit = '10' } = req.query;
    const maxResults = Math.min(parseInt(limit) || 10, 25);

    if (!q || q.length < 2) {
      return res.json({ results: { customers: [], appointments: [], services: [] }, total: 0 });
    }

    const term = `%${q}%`;

    // Search in parallel
    const [customersRes, servicesRes] = await Promise.all([
      supabase
        .from('customers')
        .select('id, first_name, last_name, phone, email')
        .or(`first_name.ilike.${term},last_name.ilike.${term},phone.ilike.${term},email.ilike.${term}`)
        .limit(maxResults),
      supabase
        .from('services')
        .select('id, name, description, price_min')
        .eq('is_active', true)
        .or(`name.ilike.${term},description.ilike.${term}`)
        .limit(maxResults),
    ]);

    // Format customers
    const customers = (customersRes.data || []).map(c => ({
      id: c.id,
      type: 'customer',
      title: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
      subtitle: c.phone || c.email || '',
      href: `/customers/${c.id}`,
    }));

    // Search appointments via matching customer IDs
    const customerIds = (customersRes.data || []).map(c => c.id);
    let appointmentResults = [];

    if (customerIds.length > 0) {
      const { data: appts } = await supabase
        .from('appointments')
        .select(`
          id, scheduled_date, scheduled_time, status,
          customer:customers(first_name, last_name),
          appointment_services(service_name)
        `)
        .in('customer_id', customerIds)
        .is('deleted_at', null)
        .order('scheduled_date', { ascending: false })
        .limit(maxResults);

      appointmentResults = (appts || []).map(a => {
        const name = a.customer ? `${a.customer.first_name || ''} ${a.customer.last_name || ''}`.trim() : 'Unknown';
        const service = a.appointment_services?.[0]?.service_name || 'Service';
        const dateStr = a.scheduled_date ? format(new Date(a.scheduled_date), 'MMM d') : '';
        const timeStr = a.scheduled_time ? formatTime12(a.scheduled_time) : '';
        return {
          id: a.id,
          type: 'appointment',
          title: `${name} - ${service}`,
          subtitle: `${dateStr} at ${timeStr} - ${(a.status || '').replace('_', ' ')}`,
          href: `/appointments/${a.id}`,
        };
      });
    }

    // Format services
    const services = (servicesRes.data || []).map(s => ({
      id: s.id,
      type: 'service',
      title: s.name,
      subtitle: s.price_min ? `$${(s.price_min / 100).toFixed(2)}` : '',
      href: `/services/${s.id}`,
    }));

    // Search work orders by WO number or customer
    let workOrderResults = [];
    const woNumberMatch = q.match(/^wo[-\s]?(\d+)$/i);

    if (woNumberMatch) {
      const woNum = parseInt(woNumberMatch[1]) - 1000;
      if (woNum > 0) {
        const { data: wos } = await supabase
          .from('work_orders')
          .select('id, work_order_number, status, total_cents, customer:customers(first_name, last_name)')
          .eq('work_order_number', woNum)
          .neq('status', 'void')
          .limit(5);

        workOrderResults = (wos || []).map(w => {
          const name = w.customer ? `${w.customer.first_name || ''} ${w.customer.last_name || ''}`.trim() : '';
          return {
            id: w.id,
            type: 'work_order',
            title: `WO-${1000 + w.work_order_number}${name ? ` - ${name}` : ''}`,
            subtitle: `${(w.status || '').replace('_', ' ')} - $${w.total_cents?.toFixed(2) || '0.00'}`,
            href: `/work-orders/${w.id}`,
          };
        });
      }
    } else if (customerIds.length > 0) {
      const { data: wos } = await supabase
        .from('work_orders')
        .select('id, work_order_number, status, total_cents, customer:customers(first_name, last_name)')
        .in('customer_id', customerIds)
        .neq('status', 'void')
        .order('created_at', { ascending: false })
        .limit(maxResults);

      workOrderResults = (wos || []).map(w => {
        const name = w.customer ? `${w.customer.first_name || ''} ${w.customer.last_name || ''}`.trim() : '';
        return {
          id: w.id,
          type: 'work_order',
          title: `WO-${1000 + w.work_order_number}${name ? ` - ${name}` : ''}`,
          subtitle: `${(w.status || '').replace('_', ' ')} - $${w.total_cents?.toFixed(2) || '0.00'}`,
          href: `/work-orders/${w.id}`,
        };
      });
    }

    const total = customers.length + appointmentResults.length + services.length + workOrderResults.length;

    res.json({
      results: {
        customers,
        appointments: appointmentResults,
        services,
        work_orders: workOrderResults,
      },
      total,
    });
  } catch (error) {
    next(error);
  }
});

function formatTime12(timeStr) {
  const [hours, mins] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(mins).padStart(2, '0')} ${period}`;
}

export default router;
