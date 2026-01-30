import { Router } from 'express';
import { supabase } from '../config/database.js';

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
