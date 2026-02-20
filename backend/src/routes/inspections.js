import { Router } from 'express';
import { supabase } from '../config/database.js';
import { isValidUUID, validationError } from '../middleware/validate.js';
import { logger } from '../utils/logger.js';

const router = Router();

const VALID_CONDITIONS = ['not_inspected', 'good', 'fair', 'needs_attention', 'urgent'];
const VALID_STATUSES = ['in_progress', 'completed', 'sent'];

/**
 * POST /api/inspections
 * Create inspection from work order (copies template items)
 */
router.post('/', async (req, res, next) => {
  try {
    const { work_order_id, vehicle_id, technician_id, template_id } = req.body;

    if (!vehicle_id || !isValidUUID(vehicle_id)) {
      return validationError(res, 'Valid vehicle_id is required');
    }
    if (work_order_id && !isValidUUID(work_order_id)) {
      return validationError(res, 'Invalid work_order_id');
    }
    if (technician_id && !isValidUUID(technician_id)) {
      return validationError(res, 'Invalid technician_id');
    }

    // Check if WO already has an active inspection
    if (work_order_id) {
      const { data: existing } = await supabase
        .from('inspections')
        .select('id, status')
        .eq('work_order_id', work_order_id)
        .in('status', ['in_progress', 'completed', 'sent'])
        .limit(1)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({
          error: { message: `Work order already has an inspection (${existing.status})` },
          inspection_id: existing.id,
        });
      }
    }

    // Get template (default if not specified)
    let tplId = template_id;
    if (!tplId) {
      const { data: defaultTpl } = await supabase
        .from('inspection_templates')
        .select('id')
        .eq('is_default', true)
        .limit(1)
        .single();
      tplId = defaultTpl?.id;
    }

    if (!tplId) {
      return validationError(res, 'No inspection template found');
    }

    // Create inspection
    const { data: inspection, error } = await supabase
      .from('inspections')
      .insert({
        work_order_id: work_order_id || null,
        vehicle_id,
        technician_id: technician_id || null,
        template_id: tplId,
        status: 'in_progress',
      })
      .select('*')
      .single();

    if (error) throw error;

    // Copy template items into inspection_items
    const { data: tplItems } = await supabase
      .from('inspection_template_items')
      .select('category, item_name, sort_order')
      .eq('template_id', tplId)
      .order('sort_order');

    if (tplItems?.length) {
      const items = tplItems.map(t => ({
        inspection_id: inspection.id,
        category: t.category,
        item_name: t.item_name,
        condition: 'not_inspected',
        sort_order: t.sort_order,
      }));
      await supabase.from('inspection_items').insert(items);
    }

    // Re-fetch with items
    const { data: full } = await supabase
      .from('inspections')
      .select(`
        *,
        vehicle:vehicles(id, year, make, model, color, license_plate),
        technician:technicians(id, first_name, last_name),
        inspection_items(id, category, item_name, condition, notes, sort_order)
      `)
      .eq('id', inspection.id)
      .single();

    if (full?.inspection_items) {
      full.inspection_items.sort((a, b) => a.sort_order - b.sort_order);
    }

    res.status(201).json({ inspection: full });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/inspections
 * List inspections with filters
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, work_order_id, technician_id, vehicle_id } = req.query;

    let query = supabase
      .from('inspections')
      .select(`
        *,
        vehicle:vehicles(id, year, make, model),
        technician:technicians(id, first_name, last_name),
        work_order:work_orders(id, work_order_number, status)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (status) query = query.eq('status', status);
    if (work_order_id) query = query.eq('work_order_id', work_order_id);
    if (technician_id) query = query.eq('technician_id', technician_id);
    if (vehicle_id) query = query.eq('vehicle_id', vehicle_id);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ inspections: data || [] });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/inspections/:id
 * Full detail with items and photos
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid inspection ID');

    const { data: inspection, error } = await supabase
      .from('inspections')
      .select(`
        *,
        vehicle:vehicles(id, year, make, model, color, license_plate),
        technician:technicians(id, first_name, last_name),
        work_order:work_orders(id, work_order_number, status, customer_id)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: { message: 'Inspection not found' } });
      }
      throw error;
    }

    // Fetch items with photos
    const { data: items } = await supabase
      .from('inspection_items')
      .select(`
        id, category, item_name, condition, notes, sort_order,
        inspection_photos(id, photo_url, caption, sort_order)
      `)
      .eq('inspection_id', id)
      .order('sort_order');

    // Sort photos within each item
    for (const item of items || []) {
      if (item.inspection_photos) {
        item.inspection_photos.sort((a, b) => a.sort_order - b.sort_order);
      }
    }

    // Build summary counts
    const summary = { good: 0, fair: 0, needs_attention: 0, urgent: 0, not_inspected: 0 };
    for (const item of items || []) {
      if (summary[item.condition] !== undefined) summary[item.condition]++;
    }

    res.json({
      inspection: {
        ...inspection,
        inspection_items: items || [],
      },
      summary,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/inspections/:id
 * Update status (in_progress -> completed -> sent)
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid inspection ID');

    const { status, technician_id } = req.body;
    const updates = {};

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return validationError(res, `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
      }
      updates.status = status;
      if (status === 'completed') updates.completed_at = new Date().toISOString();
      if (status === 'sent') updates.sent_at = new Date().toISOString();
    }

    if (technician_id !== undefined) {
      if (technician_id && !isValidUUID(technician_id)) {
        return validationError(res, 'Invalid technician_id');
      }
      updates.technician_id = technician_id || null;
    }

    if (Object.keys(updates).length === 0) {
      return validationError(res, 'No valid fields to update');
    }

    const { data: updated, error } = await supabase
      .from('inspections')
      .update(updates)
      .eq('id', id)
      .select('*, work_order:work_orders(id, customer_id, work_order_number)')
      .single();

    if (error) throw error;

    // Send SMS when inspection is sent to customer
    if (status === 'sent' && updated.work_order?.customer_id) {
      try {
        const { ensurePortalToken, portalUrl } = await import('./portal.js');
        const { sendInspectionSMS } = await import('../services/sms.js');

        // Get customer + vehicle info
        const { data: customer } = await supabase
          .from('customers')
          .select('id, first_name, last_name, phone')
          .eq('id', updated.work_order.customer_id)
          .single();

        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('year, make, model')
          .eq('id', updated.vehicle_id)
          .single();

        if (customer?.phone) {
          // Build summary
          const { data: items } = await supabase
            .from('inspection_items')
            .select('condition')
            .eq('inspection_id', id);

          const summary = { good: 0, fair: 0, needs_attention: 0, urgent: 0 };
          for (const item of items || []) {
            if (summary[item.condition] !== undefined) summary[item.condition]++;
          }

          const token = await ensurePortalToken(customer.id);
          const vehicleDesc = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : null;

          await sendInspectionSMS({
            customerPhone: customer.phone,
            customerName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
            portalUrl: `${portalUrl(token)}/inspection/${id}`,
            vehicleDescription: vehicleDesc,
            summary,
            customerId: customer.id,
            workOrderId: updated.work_order?.id,
          });
        }
      } catch (smsErr) {
        logger.error('Inspection SMS failed (non-blocking)', { error: smsErr });
      }
    }

    res.json({ inspection: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/inspections/:id/items/:itemId
 * Update item condition + notes
 */
router.patch('/:id/items/:itemId', async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    if (!isValidUUID(id) || !isValidUUID(itemId)) {
      return validationError(res, 'Invalid ID format');
    }

    const { condition, notes } = req.body;
    const updates = {};

    if (condition) {
      if (!VALID_CONDITIONS.includes(condition)) {
        return validationError(res, `Invalid condition. Must be one of: ${VALID_CONDITIONS.join(', ')}`);
      }
      updates.condition = condition;
    }
    if (notes !== undefined) updates.notes = notes;

    const { data: item, error } = await supabase
      .from('inspection_items')
      .update(updates)
      .eq('id', itemId)
      .eq('inspection_id', id)
      .select('*')
      .single();

    if (error) throw error;

    res.json({ item });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/inspections/:id/items/batch
 * Batch update multiple items
 */
router.patch('/:id/items/batch', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid inspection ID');

    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return validationError(res, 'items array is required');
    }

    const results = [];
    for (const item of items) {
      if (!item.id || !isValidUUID(item.id)) continue;

      const updates = {};
      if (item.condition && VALID_CONDITIONS.includes(item.condition)) {
        updates.condition = item.condition;
      }
      if (item.notes !== undefined) updates.notes = item.notes;

      if (Object.keys(updates).length > 0) {
        const { data, error } = await supabase
          .from('inspection_items')
          .update(updates)
          .eq('id', item.id)
          .eq('inspection_id', id)
          .select('*')
          .single();

        if (!error && data) results.push(data);
      }
    }

    res.json({ items: results });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/inspections/:id/items/:itemId/upload-url
 * Generate signed upload URL for Supabase Storage
 */
router.post('/:id/items/:itemId/upload-url', async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    if (!isValidUUID(id) || !isValidUUID(itemId)) {
      return validationError(res, 'Invalid ID format');
    }

    const timestamp = Date.now();
    const path = `${id}/${itemId}/${timestamp}.jpg`;

    const { data, error } = await supabase.storage
      .from('inspections')
      .createSignedUploadUrl(path);

    if (error) throw error;

    // Build public URL for after upload
    const { data: publicUrlData } = supabase.storage
      .from('inspections')
      .getPublicUrl(path);

    res.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl: publicUrlData.publicUrl,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/inspections/:id/items/:itemId/photos
 * Register an uploaded photo
 */
router.post('/:id/items/:itemId/photos', async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    if (!isValidUUID(id) || !isValidUUID(itemId)) {
      return validationError(res, 'Invalid ID format');
    }

    const { photo_url, caption } = req.body;
    if (!photo_url) return validationError(res, 'photo_url is required');

    // Get next sort order
    const { data: lastPhoto } = await supabase
      .from('inspection_photos')
      .select('sort_order')
      .eq('inspection_item_id', itemId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: photo, error } = await supabase
      .from('inspection_photos')
      .insert({
        inspection_item_id: itemId,
        photo_url,
        caption: caption || null,
        sort_order: (lastPhoto?.sort_order || 0) + 1,
      })
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json({ photo });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/inspections/:id/items/:itemId/photos/:photoId
 * Remove a photo (also delete from storage)
 */
router.delete('/:id/items/:itemId/photos/:photoId', async (req, res, next) => {
  try {
    const { itemId, photoId } = req.params;
    if (!isValidUUID(photoId)) return validationError(res, 'Invalid photo ID');

    // Get photo URL to extract storage path
    const { data: photo } = await supabase
      .from('inspection_photos')
      .select('photo_url')
      .eq('id', photoId)
      .single();

    if (photo?.photo_url) {
      // Extract path from URL (after /inspections/)
      const match = photo.photo_url.match(/\/inspections\/(.+)$/);
      if (match) {
        await supabase.storage.from('inspections').remove([match[1]]);
      }
    }

    const { error } = await supabase
      .from('inspection_photos')
      .delete()
      .eq('id', photoId)
      .eq('inspection_item_id', itemId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/inspections/:id/add-to-estimate
 * Add red/yellow inspection items as WO line items
 */
router.post('/:id/add-to-estimate', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return validationError(res, 'Invalid inspection ID');

    const { item_ids } = req.body;
    if (!Array.isArray(item_ids) || item_ids.length === 0) {
      return validationError(res, 'item_ids array is required');
    }

    // Get inspection + WO
    const { data: inspection } = await supabase
      .from('inspections')
      .select('work_order_id')
      .eq('id', id)
      .single();

    if (!inspection?.work_order_id) {
      return validationError(res, 'Inspection has no linked work order');
    }

    // Get the inspection items
    const { data: inspItems } = await supabase
      .from('inspection_items')
      .select('id, item_name, notes, condition')
      .in('id', item_ids)
      .eq('inspection_id', id);

    if (!inspItems?.length) {
      return validationError(res, 'No matching inspection items found');
    }

    // Get current max sort_order in WO items
    const { data: lastItem } = await supabase
      .from('work_order_items')
      .select('sort_order')
      .eq('work_order_id', inspection.work_order_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    let sortOrder = (lastItem?.sort_order || 0) + 1;

    // Create WO line items
    const woItems = inspItems.map(item => {
      const desc = item.notes
        ? `${item.item_name} — ${item.notes}`
        : item.item_name;
      return {
        work_order_id: inspection.work_order_id,
        item_type: 'labor',
        description: desc,
        quantity: 1,
        unit_price_cents: 0,
        total_cents: 0,
        sort_order: sortOrder++,
      };
    });

    const { data: created, error } = await supabase
      .from('work_order_items')
      .insert(woItems)
      .select('*');

    if (error) throw error;

    res.status(201).json({
      items_added: created?.length || 0,
      work_order_id: inspection.work_order_id,
      items: created,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
