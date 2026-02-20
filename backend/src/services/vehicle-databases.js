/**
 * Vehicle Databases API Integration
 * https://vehicledatabases.com/docs/
 *
 * Provides vehicle specs, maintenance, recalls, warranty, repair costs,
 * market value, plate decode, owner's manuals, and YMMT specifications
 */

import { logger } from '../utils/logger.js';

const VEHICLE_DB_API_KEY = process.env.VEHICLE_DATABASES_API_KEY;
const BASE_URL = 'https://api.vehicledatabases.com';
const API_TIMEOUT_MS = 6000;

// VIN year code lookup (10th character -> model year)
const VIN_YEAR_MAP = {
  'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014,
  'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019,
  'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024,
  'S': 2025, 'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029, 'Y': 2030,
  '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005,
  '6': 2006, '7': 2007, '8': 2008, '9': 2009
};

/**
 * Decode model year from VIN 10th character (always works, no API needed)
 */
export function decodeVINYear(vin) {
  if (!vin || vin.length !== 17) return null;
  const yearChar = vin.charAt(9).toUpperCase();
  return VIN_YEAR_MAP[yearChar] || null;
}

/**
 * Fetch with timeout helper
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Decode a VIN using the Advanced VIN Decode endpoint
 * Returns full specs: year, make, model, trim, engine, MSRP, fuel economy, etc.
 */
export async function decodeVIN(vin) {
  if (!VEHICLE_DB_API_KEY) {
    return { success: false, error: 'API not configured' };
  }

  if (!vin || vin.length !== 17) {
    return { success: false, error: 'Invalid VIN - must be 17 characters' };
  }

  try {
    const response = await fetchWithTimeout(`${BASE_URL}/advanced-vin-decode/v2/${vin}`, {
      headers: { 'x-authkey': VEHICLE_DB_API_KEY }
    });

    if (!response.ok) {
      logger.error('[VehicleDB] VIN decode HTTP error', { status: response.status, vin });
      const errBody = await response.text().catch(() => '');
      return { success: false, error: `HTTP ${response.status}: ${errBody.substring(0, 200)}` };
    }

    const data = await response.json();

    if (data.status === 'success' && data.data) {
      const d = data.data;

      // Advanced VIN Decode v2 structure:
      // - Top-level: vin, year, make, model, trim, price, vehicle, transmission
      // - dimensions[]: array of {key: data} objects — engine (hp/torque/size), fuel, mpg
      // - specifications[]: array of {key: data} objects — engine (type/config), fuel (type), mpg (EPA)

      // Extract named entries from dimensions[] and specifications[] arrays
      const dims = {};
      if (Array.isArray(d.dimensions)) {
        for (const entry of d.dimensions) {
          const key = Object.keys(entry)[0];
          if (key) dims[key] = entry[key];
        }
      }
      const specs = {};
      if (Array.isArray(d.specifications)) {
        for (const entry of d.specifications) {
          const key = Object.keys(entry)[0];
          if (key) specs[key] = entry[key];
        }
      }

      // dimensions.engine is array of [{engine_size: [...]}, {horsepower: [...]}, {torque: [...]}]
      const dimEngine = {};
      if (Array.isArray(dims.engine)) {
        for (const item of dims.engine) {
          Object.assign(dimEngine, item);
        }
      }

      // specifications.engine is flat: {type, displacement, compressor, drivetype, cam_type, ...}
      const specEngine = specs.engine || {};
      // specifications.fuel is flat: {type, grade}
      const specFuel = specs.fuel || {};
      // specifications.mpg is flat: {epa_city_economy, epa_hwy_economy, epa_combined_economy}
      const specMpg = specs.mpg || {};

      // Parse embedded recalls
      const recalls = (d.recalls || []).map(recall => ({
        campaign_id: recall.campaign_id,
        recall_date: recall.description?.date,
        component: recall.description?.component,
        summary: recall.description?.summary,
        consequences: recall.description?.consequences,
        remedy: recall.description?.remedy
      }));

      // Parse embedded warranties
      const warranties = (d.warranties || []).map(w => ({
        type: w.type,
        months: w.months ? parseInt(w.months, 10) : null,
        miles: w.miles ? w.miles.replace(/,/g, '') : null
      }));

      // Parse embedded maintenance schedule
      const maintenanceIntervals = (d.maintenance || []).map(item => {
        const mileage = typeof item.mileage === 'number'
          ? item.mileage
          : parseInt(String(item.mileage).replace(/,/g, ''), 10);
        // Embedded format uses conditions[].description[] for service lists
        const services = [];
        if (Array.isArray(item.conditions)) {
          for (const cond of item.conditions) {
            if (Array.isArray(cond.description)) {
              for (const svc of cond.description) {
                if (svc && !svc.startsWith('"') && !services.includes(svc)) {
                  services.push(svc);
                }
              }
            }
          }
        }
        return { mileage_miles: mileage, services };
      });

      const servicesByType = {};
      maintenanceIntervals.forEach(interval => {
        interval.services.forEach(service => {
          const serviceLower = service.toLowerCase();
          if (!servicesByType[serviceLower]) {
            servicesByType[serviceLower] = [];
          }
          servicesByType[serviceLower].push({ mileage_miles: interval.mileage_miles });
        });
      });

      return {
        success: true,
        vehicle: {
          vin: d.vin,
          year: d.year,
          make: d.make,
          model: d.model,
          trim: d.trim,
          body_type: d.vehicle?.body_type,
          vehicle_type: d.vehicle?.epa_classification,
          doors: d.vehicle?.doors,
          engine: {
            type: specEngine.type || specEngine.cylinders_configuration,
            cylinders: specEngine.cylinders_configuration,
            size: dimEngine.engine_size?.[0]?.value || specEngine.displacement,
            compressor: specEngine.compressor,
            horsepower: dimEngine.horsepower?.find(h => h.unit === 'hp')?.value,
            torque: dimEngine.torque?.find(t => t.unit === 'lb.ft')?.value,
            fuel_type: specFuel.type,
            fuel_grade: specFuel.grade,
            drive_type: specEngine.drivetype
          },
          transmission: d.transmission?.description || d.transmission?.type,
          drive_type: specEngine.drivetype,
          fuel_economy: {
            city_mpg: specMpg.epa_city_economy || null,
            highway_mpg: specMpg.epa_hwy_economy || null,
            combined_mpg: specMpg.epa_combined_economy || null
          },
          msrp: d.price?.base_msrp || null,
          summary: d.summary || null
        },
        recalls,
        has_open_recalls: recalls.length > 0,
        recall_count: recalls.length,
        warranties,
        maintenance: {
          intervals: maintenanceIntervals,
          services_by_type: servicesByType,
          interval_count: maintenanceIntervals.length
        },
        safety_ratings: d.safety_ratings || [],
        features: d.standard_features || [],
        colors: {
          exterior: (d.exterior_colors || []).map(c => ({
            name: c.description || c.generic_name,
            hex: c.hex_value,
            type: c.color_type
          })),
          interior: (d.interior_colors || []).map(c => ({
            name: c.description || c.generic_name,
            hex: c.hex_value
          }))
        }
      };
    }

    // Fallback: at minimum decode the year from VIN
    const fallbackYear = decodeVINYear(vin);
    if (fallbackYear) {
      return {
        success: true,
        partial: true,
        vehicle: { vin, year: fallbackYear, make: null, model: null, trim: null }
      };
    }

    return { success: false, error: data.message || 'VIN decode failed' };
  } catch (error) {
    logger.error('[VehicleDB] VIN decode error', { error: error.message });
    // Always return year from VIN even if API fails
    const fallbackYear = decodeVINYear(vin);
    if (fallbackYear) {
      return {
        success: true,
        partial: true,
        vehicle: { vin, year: fallbackYear, make: null, model: null, trim: null }
      };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Get OEM maintenance schedule for a vehicle by VIN
 */
export async function getMaintenanceSchedule(vin) {
  if (!VEHICLE_DB_API_KEY) {
    return { success: false, error: 'API not configured' };
  }

  if (!vin || vin.length !== 17) {
    return { success: false, error: 'Invalid VIN - must be 17 characters' };
  }

  try {
    const response = await fetchWithTimeout(`${BASE_URL}/vehicle-maintenance/v4/${vin}`, {
      headers: { 'x-authkey': VEHICLE_DB_API_KEY }
    });

    const data = await response.json();

    if (data.status === 'success' && data.data) {
      const schedule = {
        vin: data.data.vin,
        year: data.data.year,
        make: data.data.make,
        model: data.data.model,
        trim: data.data.trim,
        intervals: (data.data.maintenance || []).map(item => ({
          mileage_miles: item.mileage?.miles,
          mileage_km: item.mileage?.km,
          services: item.service_items || []
        }))
      };

      const servicesByType = {};
      schedule.intervals.forEach(interval => {
        interval.services.forEach(service => {
          const serviceLower = service.toLowerCase();
          if (!servicesByType[serviceLower]) {
            servicesByType[serviceLower] = [];
          }
          servicesByType[serviceLower].push({
            mileage_miles: interval.mileage_miles,
            mileage_km: interval.mileage_km
          });
        });
      });

      return {
        success: true,
        schedule,
        services_by_type: servicesByType
      };
    }

    return { success: false, error: data.message || 'Maintenance lookup failed' };
  } catch (error) {
    logger.error('[VehicleDB] Maintenance schedule error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get OEM maintenance schedule by Year/Make/Model (no VIN needed)
 * Fallback when caller doesn't have VIN
 */
export async function getMaintenanceByYMM(year, make, model) {
  if (!VEHICLE_DB_API_KEY) {
    return { success: false, error: 'API not configured' };
  }

  if (!year || !make || !model) {
    return { success: false, error: 'Year, make, and model are required' };
  }

  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/vehicle-maintenance/${year}/${encodeURIComponent(make)}/${encodeURIComponent(model)}`,
      { headers: { 'x-authkey': VEHICLE_DB_API_KEY } }
    );

    const data = await response.json();

    if (data.status === 'success' && data.data) {
      const schedule = {
        year: data.data.year,
        make: data.data.make,
        model: data.data.model,
        intervals: (data.data.maintenance || []).map(item => ({
          mileage_miles: typeof item.mileage === 'number' ? item.mileage : parseInt(item.mileage, 10),
          services: item.normal?.menus || item.service_items || []
        }))
      };

      const servicesByType = {};
      schedule.intervals.forEach(interval => {
        interval.services.forEach(service => {
          const serviceLower = service.toLowerCase();
          if (!servicesByType[serviceLower]) {
            servicesByType[serviceLower] = [];
          }
          servicesByType[serviceLower].push({
            mileage_miles: interval.mileage_miles
          });
        });
      });

      return {
        success: true,
        schedule,
        services_by_type: servicesByType
      };
    }

    return { success: false, error: data.message || 'Maintenance by YMM lookup failed' };
  } catch (error) {
    logger.error('[VehicleDB] Maintenance by YMM error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get open recalls for a vehicle by VIN
 */
export async function getRecalls(vin) {
  if (!VEHICLE_DB_API_KEY) {
    return { success: false, error: 'API not configured' };
  }

  if (!vin || vin.length !== 17) {
    return { success: false, error: 'Invalid VIN - must be 17 characters' };
  }

  try {
    const response = await fetchWithTimeout(`${BASE_URL}/vehicle-recalls/${vin}`, {
      headers: { 'x-authkey': VEHICLE_DB_API_KEY }
    });

    const data = await response.json();

    if (data.status === 'success' && data.data) {
      const recalls = (data.data.recall || []).map(recall => ({
        campaign_id: recall.campaign_id,
        recall_date: recall.recall_date,
        component: recall.component_affected,
        summary: recall.summary,
        consequences: recall.consequences,
        remedy: recall.remedy,
        manufacturer: recall.manufacturer_name
      }));

      return {
        success: true,
        vehicle: {
          vin: data.data.vin,
          year: data.data.year,
          make: data.data.make,
          model: data.data.model
        },
        recalls,
        has_open_recalls: recalls.length > 0,
        recall_count: recalls.length
      };
    }

    return { success: false, error: data.message || 'Recall lookup failed' };
  } catch (error) {
    logger.error('[VehicleDB] Recalls error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get Transport Canada recalls by make/model/year
 * Free government API — no API key required
 * Returns Canadian-specific recall campaigns (separate from NHTSA/US recalls)
 */
const TC_RECALL_BASE = 'http://data.tc.gc.ca/v1.3/api/eng/vehicle-recall-database';

export async function getCanadianRecalls(year, make, model) {
  if (!year || !make || !model) {
    return { success: false, error: 'Year, make, and model are required' };
  }

  try {
    const encodedMake = encodeURIComponent(make.toUpperCase());
    const encodedModel = encodeURIComponent(model.toUpperCase());

    // Step 1: Search for recall numbers by make/model/year
    const searchUrl = `${TC_RECALL_BASE}/recall/make-name/${encodedMake}/model-name/${encodedModel}/year-range/${year}-${year}?format=json`;
    const searchResponse = await fetchWithTimeout(searchUrl, {}, 5000);
    const searchData = await searchResponse.json();

    const resultSet = searchData?.ResultSet || [];
    if (resultSet.length === 0) {
      return {
        success: true,
        source: 'Transport Canada',
        vehicle: { year, make, model },
        recalls: [],
        has_open_recalls: false,
        recall_count: 0
      };
    }

    // Extract recall numbers
    const recallNumbers = resultSet.map(record => {
      const fields = {};
      for (const field of record) {
        fields[field.Name] = field.Value?.Literal;
      }
      return fields['Recall number'];
    }).filter(Boolean);

    // Step 2: Fetch details for each recall (limit to 5 to avoid excessive calls)
    const detailPromises = recallNumbers.slice(0, 5).map(async (recallNum) => {
      try {
        const detailUrl = `${TC_RECALL_BASE}/recall-summary/recall-number/${recallNum}?format=json`;
        const detailResponse = await fetchWithTimeout(detailUrl, {}, 5000);
        const detailData = await detailResponse.json();

        const details = detailData?.ResultSet || [];
        if (details.length === 0) return null;

        // Parse the field array into a flat object
        const fields = {};
        for (const field of details[0]) {
          fields[field.Name] = field.Value?.Literal;
        }

        return {
          recall_number: fields.RECALL_NUMBER_NUM,
          manufacturer_recall_number: fields.MANUFACTURER_RECALL_NO_TXT,
          recall_date: fields.RECALL_DATE_DTE?.split(' ')[0] || null,
          system_type: fields.SYSTEM_TYPE_ETXT,
          category: fields.CATEGORY_ETXT,
          units_affected: fields.UNIT_AFFECTED_NBR ? parseInt(fields.UNIT_AFFECTED_NBR, 10) : null,
          description: fields.COMMENT_ETXT,
          notification_type: fields.NOTIFICATION_TYPE_ETXT
        };
      } catch {
        return null;
      }
    });

    const recalls = (await Promise.all(detailPromises)).filter(Boolean);

    return {
      success: true,
      source: 'Transport Canada',
      vehicle: { year, make, model },
      recalls,
      has_open_recalls: recalls.length > 0,
      recall_count: recalls.length
    };
  } catch (error) {
    logger.error('[TransportCanada] Recalls error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get warranty information for a vehicle
 */
export async function getWarranty(year, make, model) {
  if (!VEHICLE_DB_API_KEY) {
    return { success: false, error: 'API not configured' };
  }

  if (!year || !make || !model) {
    return { success: false, error: 'Year, make, and model are required' };
  }

  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/vehicle-warranty/${year}/${encodeURIComponent(make)}/${encodeURIComponent(model)}`,
      { headers: { 'x-authkey': VEHICLE_DB_API_KEY } }
    );

    const data = await response.json();

    if (data.status === 'success' && data.data?.warranty) {
      return {
        success: true,
        vehicle: { year: data.data.year, make: data.data.make, model: data.data.model },
        warranty: data.data.warranty
      };
    }

    return { success: false, error: data.message || 'Warranty lookup failed' };
  } catch (error) {
    logger.error('[VehicleDB] Warranty error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get common repair costs for a vehicle by VIN
 * Returns parts and labor costs for common repairs (dealer vs independent shop)
 */
export async function getRepairCosts(vin) {
  if (!VEHICLE_DB_API_KEY) {
    return { success: false, error: 'API not configured' };
  }

  if (!vin || vin.length !== 17) {
    return { success: false, error: 'Invalid VIN - must be 17 characters' };
  }

  try {
    const response = await fetchWithTimeout(`${BASE_URL}/vehicle-repairs/v2/${vin}`, {
      headers: { 'x-authkey': VEHICLE_DB_API_KEY }
    });

    const data = await response.json();

    if (data.status === 'success' && data.data) {
      const repairs = (data.data.repair || []).map(repair => {
        const dealer = repair.costs?.dealer || [];
        const independent = repair.costs?.independent || [];
        return {
          title: repair.title,
          description: repair.description !== 'N/A' ? repair.description : null,
          dealer_costs: dealer.map(c => ({ type: c.name, avg: c.average, low: c.low, high: c.high })),
          independent_costs: independent.map(c => ({ type: c.name, avg: c.average, low: c.low, high: c.high }))
        };
      });

      return {
        success: true,
        vehicle: {
          vin: data.data.vin,
          year: data.data.year,
          make: data.data.make,
          model: data.data.model
        },
        currency: data.data.currency || 'USD',
        repairs,
        repair_count: repairs.length
      };
    }

    return { success: false, error: data.message || 'Repair costs lookup failed' };
  } catch (error) {
    logger.error('[VehicleDB] Repair costs error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get maintenance cost estimates by mileage interval for a vehicle
 * Returns itemized parts, labor, and total costs at each service interval
 */
export async function getRepairEstimates(vin) {
  if (!VEHICLE_DB_API_KEY) {
    return { success: false, error: 'API not configured' };
  }

  if (!vin || vin.length !== 17) {
    return { success: false, error: 'Invalid VIN - must be 17 characters' };
  }

  try {
    const response = await fetchWithTimeout(`${BASE_URL}/repair-estimates/${vin}`, {
      headers: { 'x-authkey': VEHICLE_DB_API_KEY }
    });

    const data = await response.json();

    if (data.status === 'success' && data.data) {
      const intervals = (data.data.data || []).map(interval => ({
        mileage: parseInt(interval.mileage, 10),
        items: (interval.items || []).map(item => ({
          parts: (item.parts || []).map(p => ({ service: p.type, cost: p.total_cost })),
          labor: (item.labor || []).map(l => ({ service: l.type, hours: l.time_required_hours })),
          totals: (item.total || []).map(t => ({ service: t.type, cost: t.total_cost }))
        }))
      }));

      return {
        success: true,
        vehicle: {
          year: data.data.year,
          make: data.data.make,
          model: data.data.model,
          trim: data.data.trim
        },
        intervals,
        interval_count: intervals.length
      };
    }

    return { success: false, error: data.message || 'Repair estimates lookup failed' };
  } catch (error) {
    logger.error('[VehicleDB] Repair estimates error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get market value for a vehicle by VIN
 * Returns trade-in, private party, and dealer retail values by condition
 */
export async function getMarketValue(vin, mileage = null, state = null) {
  if (!VEHICLE_DB_API_KEY) {
    return { success: false, error: 'API not configured' };
  }

  if (!vin || vin.length !== 17) {
    return { success: false, error: 'Invalid VIN - must be 17 characters' };
  }

  try {
    let url = `${BASE_URL}/market-value/v2/${vin}`;
    const params = [];
    if (mileage) params.push(`mileage=${mileage}`);
    if (state) params.push(`state=${encodeURIComponent(state)}`);
    if (params.length) url += `?${params.join('&')}`;

    const response = await fetchWithTimeout(url, {
      headers: { 'x-authkey': VEHICLE_DB_API_KEY }
    });

    const data = await response.json();

    if (data.status === 'success' && data.data) {
      const valuations = (data.data.market_value?.market_value_data || []).map(entry => ({
        trim: entry.trim,
        values: (entry['market value'] || []).map(v => ({
          condition: v.Condition,
          trade_in: v['Trade-In'],
          private_party: v['Private Party'],
          dealer_retail: v['Dealer Retail']
        }))
      }));

      return {
        success: true,
        vehicle: {
          vin: data.data.intro?.vin,
          year: data.data.basic?.year,
          make: data.data.basic?.make,
          model: data.data.basic?.model,
          trim: data.data.basic?.trim,
          state: data.data.basic?.state,
          mileage: data.data.basic?.mileage
        },
        valuations,
        has_values: valuations.length > 0
      };
    }

    return { success: false, error: data.message || 'Market value lookup failed' };
  } catch (error) {
    logger.error('[VehicleDB] Market value error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Decode a US license plate to get VIN and vehicle info
 */
export async function decodePlate(plate, state) {
  if (!VEHICLE_DB_API_KEY) {
    return { success: false, error: 'API not configured' };
  }

  if (!plate || !state) {
    return { success: false, error: 'License plate and state are required' };
  }

  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/license-decode/${encodeURIComponent(plate)}/${encodeURIComponent(state)}`,
      { headers: { 'x-authkey': VEHICLE_DB_API_KEY } }
    );

    const data = await response.json();

    if (data.status === 'success' && data.data) {
      return {
        success: true,
        vin: data.data.intro?.vin,
        plate: data.data.intro?.license,
        state: data.data.intro?.state,
        vehicle: {
          year: data.data.basic?.year,
          make: data.data.basic?.make,
          model: data.data.basic?.model
        }
      };
    }

    return { success: false, error: data.message || 'Plate decode failed' };
  } catch (error) {
    logger.error('[VehicleDB] Plate decode error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get owner's manual PDF link for a vehicle by VIN
 */
export async function getOwnerManual(vin) {
  if (!VEHICLE_DB_API_KEY) {
    return { success: false, error: 'API not configured' };
  }

  if (!vin || vin.length !== 17) {
    return { success: false, error: 'Invalid VIN - must be 17 characters' };
  }

  try {
    const response = await fetchWithTimeout(`${BASE_URL}/owner-manual/${vin}`, {
      headers: { 'x-authkey': VEHICLE_DB_API_KEY }
    });

    const data = await response.json();

    if (data.status === 'success' && data.data) {
      return {
        success: true,
        vehicle: {
          year: data.data.year,
          make: data.data.make,
          model: data.data.model
        },
        manual_url: data.data.path || null
      };
    }

    return { success: false, error: data.message || 'Owner manual lookup failed' };
  } catch (error) {
    logger.error('[VehicleDB] Owner manual error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get vehicle specifications by Year/Make/Model/Trim (no VIN needed)
 */
export async function getSpecsByYMMT(year, make, model, trim) {
  if (!VEHICLE_DB_API_KEY) {
    return { success: false, error: 'API not configured' };
  }

  if (!year || !make || !model) {
    return { success: false, error: 'Year, make, and model are required' };
  }

  try {
    let url = `${BASE_URL}/ymm-specs/v3/${year}/${encodeURIComponent(make)}/${encodeURIComponent(model)}`;
    if (trim) url += `/${encodeURIComponent(trim)}`;

    const response = await fetchWithTimeout(url, {
      headers: { 'x-authkey': VEHICLE_DB_API_KEY }
    });

    const data = await response.json();

    if (data.status === 'success' && data.data) {
      const d = data.data;
      const engine = Array.isArray(d.engine) ? d.engine[0] : d.engine;

      return {
        success: true,
        vehicle: {
          year: d.year,
          make: d.make,
          model: d.model,
          trim: d.trim,
          msrp: d.price?.base_msrp || null,
          currency: d.price?.currency || 'USD',
          engine: engine ? {
            size: engine.engine_size?.[0]?.value,
            horsepower: engine.horsepower?.find(h => h.unit === 'hp')?.value,
            cylinders: engine.cylinders?.[0]?.value || engine.cylinders
          } : null,
          transmission: d.transmission ? {
            type: d.transmission.type,
            speeds: d.transmission.number_of_speeds
          } : null
        }
      };
    }

    return { success: false, error: data.message || 'YMMT specs lookup failed' };
  } catch (error) {
    logger.error('[VehicleDB] YMMT specs error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get next recommended service based on current mileage
 */
export async function getNextService(vin, currentMileage) {
  const maintenanceResult = await getMaintenanceSchedule(vin);

  if (!maintenanceResult.success) {
    return maintenanceResult;
  }

  const { schedule } = maintenanceResult;

  const upcomingIntervals = schedule.intervals
    .filter(interval => interval.mileage_miles > currentMileage)
    .slice(0, 3);

  const overdueIntervals = schedule.intervals
    .filter(interval => interval.mileage_miles <= currentMileage)
    .slice(-2);

  return {
    success: true,
    vehicle: {
      year: schedule.year,
      make: schedule.make,
      model: schedule.model,
      trim: schedule.trim
    },
    current_mileage: currentMileage,
    upcoming_services: upcomingIntervals.map(interval => ({
      at_mileage: interval.mileage_miles,
      miles_until: interval.mileage_miles - currentMileage,
      services: interval.services
    })),
    recently_due: overdueIntervals.map(interval => ({
      at_mileage: interval.mileage_miles,
      miles_overdue: currentMileage - interval.mileage_miles,
      services: interval.services
    }))
  };
}

/**
 * Check if a specific service is due based on mileage
 */
export async function isServiceDue(vin, currentMileage, serviceType) {
  const maintenanceResult = await getMaintenanceSchedule(vin);

  if (!maintenanceResult.success) {
    return maintenanceResult;
  }

  const { services_by_type, schedule } = maintenanceResult;
  const searchTerm = serviceType.toLowerCase();

  let matchedService = null;
  let matchedIntervals = [];

  for (const [serviceName, intervals] of Object.entries(services_by_type)) {
    if (serviceName.includes(searchTerm) || searchTerm.includes(serviceName.split(' ')[0])) {
      matchedService = serviceName;
      matchedIntervals = intervals;
      break;
    }
  }

  if (!matchedService) {
    return {
      success: true,
      found: false,
      message: `No OEM schedule found for "${serviceType}" on this vehicle`
    };
  }

  const typicalInterval = matchedIntervals[0]?.mileage_miles || 0;

  const lastServiceMileage = Math.floor(currentMileage / typicalInterval) * typicalInterval;
  const nextServiceMileage = lastServiceMileage + typicalInterval;
  const milesUntilDue = nextServiceMileage - currentMileage;
  const isDue = milesUntilDue <= 1000;
  const isOverdue = milesUntilDue < 0;

  return {
    success: true,
    found: true,
    service: matchedService,
    vehicle: {
      year: schedule.year,
      make: schedule.make,
      model: schedule.model
    },
    interval_miles: typicalInterval,
    current_mileage: currentMileage,
    next_due_at: nextServiceMileage,
    miles_until_due: milesUntilDue,
    is_due: isDue,
    is_overdue: isOverdue,
    recommendation: isOverdue
      ? `This service is overdue by about ${Math.abs(milesUntilDue).toLocaleString()} miles`
      : isDue
        ? `This service is due soon - within ${milesUntilDue.toLocaleString()} miles`
        : `This service is not due yet - next service at ${nextServiceMileage.toLocaleString()} miles`
  };
}

/**
 * Get combined vehicle intelligence for voice agent
 * Optimized: uses embedded data from VIN decode (recalls, warranties, maintenance)
 * Only makes 1-3 API calls instead of 6
 */
export async function getVehicleIntelligence(vin, currentMileage = null) {
  // VIN decode returns embedded recalls, warranties, and maintenance — no separate calls needed
  // Only repair costs and market value require separate API calls
  const parallelCalls = [
    decodeVIN(vin),
    getRepairCosts(vin)
  ];

  if (currentMileage) {
    parallelCalls.push(getMarketValue(vin, currentMileage));
  }

  const [vinResult, repairCostsResult, marketValueResult] = await Promise.all(parallelCalls);

  // Fetch Transport Canada recalls in parallel (needs make/model/year from VIN decode)
  let canadianRecallsResult = { success: false };
  if (vinResult.success && vinResult.vehicle?.year && vinResult.vehicle?.make && vinResult.vehicle?.model) {
    // Fire and don't block — merge later
    canadianRecallsResult = await getCanadianRecalls(
      vinResult.vehicle.year, vinResult.vehicle.make, vinResult.vehicle.model
    ).catch(() => ({ success: false }));
  }

  // Use embedded data from VIN decode (no extra API calls for US recalls/warranties/maintenance)
  const embeddedRecalls = (vinResult.success ? vinResult.recalls : null) || [];
  const canadianRecalls = (canadianRecallsResult.success ? canadianRecallsResult.recalls : null) || [];

  // Merge US (NHTSA) + Canadian (Transport Canada) recalls, deduplicating by description similarity
  const allRecalls = [...embeddedRecalls];
  for (const caRecall of canadianRecalls) {
    const isDuplicate = allRecalls.some(usRecall => {
      const usDesc = (usRecall.summary || usRecall.description || '').toLowerCase();
      const caDesc = (caRecall.description || '').toLowerCase();
      return usRecall.component?.toLowerCase() === caRecall.system_type?.toLowerCase()
        || (usDesc.length > 20 && caDesc.length > 20 && usDesc.substring(0, 40) === caDesc.substring(0, 40));
    });
    if (!isDuplicate) {
      allRecalls.push({
        campaign_id: caRecall.recall_number,
        recall_date: caRecall.recall_date,
        component: caRecall.system_type,
        summary: caRecall.description,
        source: 'Transport Canada'
      });
    }
  }

  const hasRecalls = allRecalls.length > 0;
  const embeddedWarranties = (vinResult.success ? vinResult.warranties : null) || [];
  const embeddedMaintenance = vinResult.success ? vinResult.maintenance : null;

  // Compute upcoming/overdue services if mileage provided
  let maintenanceInfo = null;
  if (embeddedMaintenance?.intervals?.length > 0) {
    if (currentMileage) {
      const upcoming = embeddedMaintenance.intervals
        .filter(i => i.mileage_miles > currentMileage)
        .slice(0, 3)
        .map(i => ({
          at_mileage: i.mileage_miles,
          miles_until: i.mileage_miles - currentMileage,
          services: i.services
        }));
      const recentlyDue = embeddedMaintenance.intervals
        .filter(i => i.mileage_miles <= currentMileage)
        .slice(-2)
        .map(i => ({
          at_mileage: i.mileage_miles,
          miles_overdue: currentMileage - i.mileage_miles,
          services: i.services
        }));
      maintenanceInfo = {
        success: true,
        current_mileage: currentMileage,
        upcoming_services: upcoming,
        recently_due: recentlyDue,
        schedule: { intervals: embeddedMaintenance.intervals }
      };
    } else {
      maintenanceInfo = {
        success: true,
        schedule: { intervals: embeddedMaintenance.intervals },
        services_by_type: embeddedMaintenance.services_by_type
      };
    }
  }

  const intelligence = {
    success: true,
    vin,
    vehicle: vinResult.success ? vinResult.vehicle : null,
    recalls: hasRecalls ? {
      has_open_recalls: true,
      count: allRecalls.length,
      items: allRecalls.slice(0, 5)
    } : (vinResult.success ? { has_open_recalls: false, count: 0, items: [] } : null),
    maintenance: maintenanceInfo,
    warranty: embeddedWarranties.length > 0 ? embeddedWarranties : null,
    repair_costs: repairCostsResult?.success ? {
      count: repairCostsResult.repair_count,
      repairs: repairCostsResult.repairs?.slice(0, 10)
    } : null,
    market_value: marketValueResult?.success ? marketValueResult.valuations : null,
    features: vinResult.success ? vinResult.features : null,
    colors: vinResult.success ? vinResult.colors : null
  };

  // Build voice-friendly summary
  const summaryParts = [];

  if (vinResult.success && vinResult.vehicle?.make) {
    const v = vinResult.vehicle;
    let desc = `${v.year} ${v.make} ${v.model}`;
    if (v.trim) desc += ` ${v.trim}`;
    if (v.engine?.horsepower) desc += `, ${v.engine.horsepower} hp`;
    summaryParts.push(desc);
  }

  if (hasRecalls) {
    summaryParts.push(`${allRecalls.length} open recall${allRecalls.length > 1 ? 's' : ''}`);
  }

  if (maintenanceInfo?.upcoming_services?.length > 0) {
    const nextService = maintenanceInfo.upcoming_services[0];
    summaryParts.push(`next service due in ${nextService.miles_until.toLocaleString()} miles`);
  } else if (maintenanceInfo?.schedule?.intervals?.length > 0 && !currentMileage) {
    summaryParts.push(`${maintenanceInfo.schedule.intervals.length} maintenance intervals on file`);
  }

  if (repairCostsResult?.success && repairCostsResult.repair_count > 0) {
    summaryParts.push(`${repairCostsResult.repair_count} repair cost estimates available`);
  }

  intelligence.summary = summaryParts.join(' | ');

  return intelligence;
}

export default {
  decodeVIN,
  decodeVINYear,
  getMaintenanceSchedule,
  getMaintenanceByYMM,
  getRecalls,
  getCanadianRecalls,
  getWarranty,
  getRepairCosts,
  getRepairEstimates,
  getMarketValue,
  decodePlate,
  getOwnerManual,
  getSpecsByYMMT,
  getNextService,
  isServiceDue,
  getVehicleIntelligence
};
