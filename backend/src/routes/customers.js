import { Router } from 'express';
import { supabase, normalizePhone, formatPhone } from '../config/database.js';
import { isValidPhone, isValidEmail, isValidUUID, clampPagination, validationError } from '../middleware/validate.js';
import { todayEST } from '../utils/timezone.js';

const router = Router();

/**
 * GET /api/customers
 * List all customers
 */
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    const { limit, offset } = clampPagination(req.query.limit, req.query.offset);

    let query = supabase
      .from('customers')
      .select(`
        id,
        first_name,
        last_name,
        phone,
        email,
        total_visits,
        created_at,
        vehicles (id),
        customer_tags (tag:tags(id, name, color))
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Search by name or phone
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: customers, error, count } = await query;

    if (error) throw error;

    res.json({
      customers: customers.map(c => ({
        ...c,
        vehicle_count: c.vehicles?.length || 0,
        vehicles: undefined,
        tags: c.customer_tags?.map(ct => ct.tag).filter(Boolean) || [],
        customer_tags: undefined
      })),
      pagination: {
        total: count,
        limit,
        offset,
        has_more: (offset + customers.length) < count
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/customers/lookup
 * Look up a customer by phone number
 * Query params: phone
 */
router.get('/lookup', async (req, res, next) => {
  try {
    const { phone } = req.query;
    
    if (!phone) {
      return res.status(400).json({ 
        error: { message: 'Phone number is required' } 
      });
    }

    const normalizedPhone = normalizePhone(phone);
    
    // Look up customer with their vehicles
    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        id,
        phone,
        email,
        first_name,
        last_name,
        preferred_contact,
        total_visits,
        last_visit_date,
        notes,
        vehicles (
          id,
          year,
          make,
          model,
          trim,
          color,
          mileage,
          license_plate,
          vin,
          is_primary
        )
      `)
      .eq('phone_normalized', normalizedPhone)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    if (!customer) {
      return res.json({
        found: false,
        message: 'Customer not found',
        phone: formatPhone(phone)
      });
    }

    // Sort vehicles with primary first
    if (customer.vehicles) {
      customer.vehicles.sort((a, b) => b.is_primary - a.is_primary);
    }

    res.json({
      found: true,
      customer: {
        ...customer,
        phone_display: formatPhone(customer.phone),
        full_name: [customer.first_name, customer.last_name].filter(Boolean).join(' ')
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/customers/tags
 * List all tags
 */
router.get('/tags', async (req, res, next) => {
  try {
    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json({ tags });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/customers/tags
 * Create a new tag
 */
router.post('/tags', async (req, res, next) => {
  try {
    const { name, color } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return validationError(res, 'Tag name is required');
    }
    if (name.length > 50) {
      return validationError(res, 'Tag name must be 50 characters or less');
    }

    const { data: tag, error } = await supabase
      .from('tags')
      .insert({ name: name.trim(), color: color || 'blue' })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: { message: 'Tag already exists' } });
      }
      throw error;
    }

    res.status(201).json({ tag });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/customers
 * Create a new customer
 */
router.post('/', async (req, res, next) => {
  try {
    const { phone, email, first_name, last_name, preferred_contact } = req.body;
    
    if (!phone) {
      return validationError(res, 'Phone number is required');
    }
    if (!isValidPhone(phone)) {
      return validationError(res, 'Invalid phone number format');
    }
    if (email && !isValidEmail(email)) {
      return validationError(res, 'Invalid email format');
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        phone,
        email,
        first_name,
        last_name,
        preferred_contact: preferred_contact || 'phone'
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({ 
          error: { message: 'Customer with this phone number already exists' } 
        });
      }
      throw error;
    }

    res.status(201).json({ customer });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/customers/:id
 * Get customer by ID with full details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid customer ID');

    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        *,
        vehicles (*),
        appointments (
          id,
          scheduled_date,
          scheduled_time,
          status,
          appointment_services (
            service_name,
            quoted_price
          )
        ),
        customer_tags (tag:tags(*))
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: { message: 'Customer not found' } });
      }
      throw error;
    }

    // Transform customer_tags to flat tags array
    customer.tags = customer.customer_tags?.map(ct => ct.tag).filter(Boolean) || [];
    delete customer.customer_tags;

    res.json({ customer });

  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/customers/:id
 * Update customer details
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid customer ID');
    const { first_name, last_name, email, phone, preferred_contact, notes } = req.body;

    if (phone !== undefined && !isValidPhone(phone)) {
      return validationError(res, 'Invalid phone number format');
    }
    if (email !== undefined && email !== null && email !== '' && !isValidEmail(email)) {
      return validationError(res, 'Invalid email format');
    }

    const updates = {};
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) {
      updates.phone = phone;
      // phone_normalized is auto-generated by trigger
    }
    if (preferred_contact !== undefined) updates.preferred_contact = preferred_contact;
    if (notes !== undefined) updates.notes = notes;
    updates.updated_at = new Date().toISOString();

    const { data: customer, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: { message: 'Customer not found' } });
      }
      throw error;
    }

    res.json({ customer });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/customers/:id/tags
 * Assign a tag to a customer
 */
router.post('/:id/tags', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid customer ID');

    const { tag_id } = req.body;
    if (!tag_id || !isValidUUID(tag_id)) {
      return validationError(res, 'Valid tag_id is required');
    }

    const { error } = await supabase
      .from('customer_tags')
      .insert({ customer_id: id, tag_id });

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: { message: 'Tag already assigned' } });
      }
      throw error;
    }

    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/customers/:id/tags/:tagId
 * Remove a tag from a customer
 */
router.delete('/:id/tags/:tagId', async (req, res, next) => {
  try {
    const { id, tagId } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid customer ID');
    if (!isValidUUID(tagId)) return validationError(res, 'Invalid tag ID');

    const { error } = await supabase
      .from('customer_tags')
      .delete()
      .eq('customer_id', id)
      .eq('tag_id', tagId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/customers/:id/appointments
 * Get appointments for a customer
 */
router.get('/:id/appointments', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid customer ID');
    const { status } = req.query; // 'upcoming', 'past', 'all'

    let query = supabase
      .from('appointments')
      .select(`
        *,
        vehicle:vehicles (year, make, model, color),
        appointment_services (
          service_name,
          quoted_price,
          duration_minutes
        )
      `)
      .eq('customer_id', id)
      .is('deleted_at', null)
      .order('scheduled_date', { ascending: false })
      .order('scheduled_time', { ascending: false });

    // Filter by status
    const today = todayEST();
    if (status === 'upcoming') {
      query = query.gte('scheduled_date', today)
        .not('status', 'in', '("cancelled","no_show","completed")');
    } else if (status === 'past') {
      query = query.or(`scheduled_date.lt.${today},status.in.("completed","cancelled","no_show")`);
    }

    const { data: appointments, error } = await query;

    if (error) throw error;

    res.json({ appointments });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/customers/:id/calls
 * Get call history for a customer
 */
router.get('/:id/calls', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid customer ID');
    const { limit = 50 } = req.query;

    const { data: calls, error } = await supabase
      .from('call_logs')
      .select(`
        id,
        retell_call_id,
        phone_number,
        started_at,
        ended_at,
        duration_seconds,
        outcome,
        sentiment,
        intent_detected,
        transcript_summary,
        recording_url
      `)
      .eq('customer_id', id)
      .order('started_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({ calls: calls || [] });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/customers/:id/sms
 * Get SMS history for a customer
 */
router.get('/:id/sms', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid customer ID');
    const { limit = 50 } = req.query;

    const { data: messages, error } = await supabase
      .from('sms_logs')
      .select(`
        id,
        to_phone,
        from_phone,
        message_body,
        message_type,
        status,
        created_at,
        appointment_id
      `)
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({ messages: messages || [] });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/customers/:id/interactions
 * Get combined timeline of all customer interactions (calls + SMS)
 */
router.get('/:id/interactions', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid customer ID');
    const { limit = 50 } = req.query;

    // Fetch calls and SMS in parallel
    const [callsResult, smsResult] = await Promise.all([
      supabase
        .from('call_logs')
        .select(`
          id,
          phone_number,
          started_at,
          duration_seconds,
          outcome,
          sentiment,
          transcript_summary
        `)
        .eq('customer_id', id)
        .order('started_at', { ascending: false })
        .limit(parseInt(limit)),
      supabase
        .from('sms_logs')
        .select(`
          id,
          to_phone,
          message_body,
          message_type,
          status,
          created_at
        `)
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit))
    ]);

    if (callsResult.error) throw callsResult.error;
    if (smsResult.error) throw smsResult.error;

    // Combine and sort by date
    const interactions = [
      ...(callsResult.data || []).map(call => ({
        type: 'call',
        id: call.id,
        timestamp: call.started_at,
        summary: call.transcript_summary || `${call.outcome || 'Call'} - ${Math.round((call.duration_seconds || 0) / 60)}min`,
        outcome: call.outcome,
        sentiment: call.sentiment,
        duration_seconds: call.duration_seconds
      })),
      ...(smsResult.data || []).map(sms => ({
        type: 'sms',
        id: sms.id,
        timestamp: sms.created_at,
        summary: sms.message_body?.substring(0, 100) + (sms.message_body?.length > 100 ? '...' : ''),
        message_type: sms.message_type,
        status: sms.status
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
     .slice(0, parseInt(limit));

    res.json({ interactions });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/customers/:id/vehicles
 * Add a vehicle to a customer
 */
router.post('/:id/vehicles', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { year, make, model, trim, color, mileage, license_plate, vin, is_primary } = req.body;

    // If setting as primary, unset other primaries first
    if (is_primary) {
      await supabase
        .from('vehicles')
        .update({ is_primary: false })
        .eq('customer_id', id);
    }

    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .insert({
        customer_id: id,
        year,
        make,
        model,
        trim,
        color,
        mileage,
        mileage_updated_at: mileage ? new Date().toISOString() : null,
        license_plate,
        vin,
        is_primary: is_primary || false
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ vehicle });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/customers/:id/vehicles/:vehicleId/intelligence
 * Get vehicle intelligence (specs, recalls, maintenance) from VIN
 */
router.get('/:id/vehicles/:vehicleId/intelligence', async (req, res, next) => {
  try {
    const { id, vehicleId } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid customer ID');
    if (!isValidUUID(vehicleId)) return validationError(res, 'Invalid vehicle ID');

    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .select('id, vin, mileage, year, make, model')
      .eq('id', vehicleId)
      .eq('customer_id', id)
      .single();

    if (error || !vehicle) {
      return res.status(404).json({ error: { message: 'Vehicle not found' } });
    }

    if (!vehicle.vin || vehicle.vin.length !== 17) {
      return res.json({ success: false, error: 'No VIN on file' });
    }

    const vehicleDB = await import('../services/vehicle-databases.js');
    const result = await vehicleDB.getVehicleIntelligence(vehicle.vin, vehicle.mileage || null);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
