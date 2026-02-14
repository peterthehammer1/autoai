import { Router } from 'express';
import { supabase } from '../config/database.js';
import { isValidUUID, validationError } from '../middleware/validate.js';

const router = Router();

/**
 * GET /api/services
 * Get all services, optionally filtered
 * Query params: category, search, popular, mileage
 */
router.get('/', async (req, res, next) => {
  try {
    const { category, search, popular, mileage } = req.query;

    let query = supabase
      .from('services')
      .select(`
        id,
        name,
        description,
        duration_minutes,
        price_min,
        price_max,
        price_display,
        required_bay_type,
        is_popular,
        mileage_interval,
        requires_diagnosis,
        category:service_categories (
          id,
          name
        )
      `)
      .eq('is_active', true)
      .order('sort_order');

    // Filter by category
    if (category) {
      const { data: categoryData } = await supabase
        .from('service_categories')
        .select('id')
        .ilike('name', `%${category}%`)
        .single();
      
      if (categoryData) {
        query = query.eq('category_id', categoryData.id);
      }
    }

    // Filter popular only
    if (popular === 'true') {
      query = query.eq('is_popular', true);
    }

    // Search by name
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: services, error } = await query;

    if (error) throw error;

    // If mileage provided, add recommendations
    let recommendations = [];
    if (mileage) {
      const mileageNum = parseInt(mileage, 10);
      
      // Find services due based on mileage
      const { data: recServices } = await supabase
        .from('services')
        .select('id, name, mileage_interval, description, price_display')
        .eq('is_active', true)
        .not('mileage_interval', 'is', null);

      if (recServices) {
        recommendations = recServices.filter(s => {
          const interval = s.mileage_interval;
          // Recommend if within 5000km of interval
          const remainder = mileageNum % interval;
          return remainder <= 5000 || (interval - remainder) <= 5000;
        }).map(s => ({
          ...s,
          reason: `Recommended at ${s.mileage_interval.toLocaleString()} km intervals`
        }));
      }
    }

    res.json({ 
      services,
      recommendations,
      count: services.length
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/services
 * Create a new service
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, duration_minutes, description, price_min, price_max, price_display, category_id, required_bay_type, is_popular, sort_order } = req.body;

    if (!name || !duration_minutes) {
      return validationError(res, 'name and duration_minutes are required');
    }

    if (category_id && !isValidUUID(category_id)) {
      return validationError(res, 'Invalid category_id');
    }

    const insert = {
      name,
      duration_minutes: parseInt(duration_minutes, 10),
      ...(description != null && { description }),
      ...(price_min != null && { price_min: parseInt(price_min, 10) }),
      ...(price_max != null && { price_max: parseInt(price_max, 10) }),
      ...(price_display != null && { price_display }),
      ...(category_id && { category_id }),
      ...(required_bay_type != null && { required_bay_type }),
      ...(is_popular != null && { is_popular }),
      ...(sort_order != null && { sort_order: parseInt(sort_order, 10) }),
    };

    const { data: service, error } = await supabase
      .from('services')
      .insert(insert)
      .select(`
        *,
        category:service_categories (
          id,
          name
        )
      `)
      .single();

    if (error) throw error;

    res.status(201).json({ service });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/services/:id
 * Update an existing service
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return validationError(res, 'Invalid service ID');
    }

    const allowed = ['name', 'description', 'duration_minutes', 'price_min', 'price_max', 'price_display', 'category_id', 'required_bay_type', 'is_popular', 'is_active', 'sort_order'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return validationError(res, 'No valid fields to update');
    }

    if (updates.category_id && !isValidUUID(updates.category_id)) {
      return validationError(res, 'Invalid category_id');
    }

    if (updates.duration_minutes != null) {
      updates.duration_minutes = parseInt(updates.duration_minutes, 10);
    }
    if (updates.price_min != null) {
      updates.price_min = parseInt(updates.price_min, 10);
    }
    if (updates.price_max != null) {
      updates.price_max = parseInt(updates.price_max, 10);
    }

    const { data: service, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        category:service_categories (
          id,
          name
        )
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: { message: 'Service not found' } });
      }
      throw error;
    }

    res.json({ service });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/services/categories
 * Get all service categories
 */
router.get('/categories', async (req, res, next) => {
  try {
    const { data: categories, error } = await supabase
      .from('service_categories')
      .select(`
        id,
        name,
        description,
        services:services (count)
      `)
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;

    res.json({ categories });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/services/popular
 * Get popular services (for quick suggestions)
 */
router.get('/popular', async (req, res, next) => {
  try {
    const { data: services, error } = await supabase
      .from('services')
      .select(`
        id,
        name,
        description,
        duration_minutes,
        price_display,
        required_bay_type
      `)
      .eq('is_active', true)
      .eq('is_popular', true)
      .order('sort_order')
      .limit(10);

    if (error) throw error;

    res.json({ services });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/services/:id
 * Get a single service by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: service, error } = await supabase
      .from('services')
      .select(`
        *,
        category:service_categories (
          id,
          name
        ),
        addons:service_addons (
          discount_percent,
          addon:services!service_addons_addon_service_id_fkey (
            id,
            name,
            duration_minutes,
            price_display
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: { message: 'Service not found' } });
      }
      throw error;
    }

    res.json({ service });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/services/search/:term
 * Search services by name or description
 */
router.get('/search/:term', async (req, res, next) => {
  try {
    const { term } = req.params;

    const { data: services, error } = await supabase
      .from('services')
      .select(`
        id,
        name,
        description,
        duration_minutes,
        price_display,
        is_popular
      `)
      .eq('is_active', true)
      .or(`name.ilike.%${term}%,description.ilike.%${term}%`)
      .order('is_popular', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json({ services, count: services.length });

  } catch (error) {
    next(error);
  }
});

export default router;
