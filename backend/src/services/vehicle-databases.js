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
const API_TIMEOUT_MS = 3000;

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

    const data = await response.json();

    if (data.status === 'success' && data.data) {
      const d = data.data;
      const engine = Array.isArray(d.engine) ? d.engine[0] : d.engine;
      const fuel = Array.isArray(d.fuel) ? d.fuel[0] : d.fuel;

      return {
        success: true,
        vehicle: {
          vin: d.vin,
          year: d.year || d.basic?.year,
          make: d.make || d.basic?.make,
          model: d.model || d.basic?.model,
          trim: d.trim || d.basic?.trim,
          body_type: d.basic?.body_type,
          vehicle_type: d.basic?.vehicle_type,
          doors: d.basic?.doors,
          engine: {
            cylinders: engine?.cylinders?.[0]?.value || engine?.cylinders,
            size: engine?.engine_size?.[0]?.value || engine?.engine_size,
            description: engine?.engine_description || engine?.description,
            horsepower: engine?.horsepower?.find(h => h.unit === 'hp')?.value,
            torque: engine?.torque?.find(t => t.unit === 'lb.ft')?.value,
            fuel_type: fuel?.fuel_type
          },
          transmission: d.transmission?.description || d.transmission?.transmission_style,
          drive_type: d.drivetrain?.drive_type,
          fuel_economy: fuel ? {
            city_mpg: fuel.city_mpg?.[0]?.value,
            highway_mpg: fuel.highway_mpg?.[0]?.value,
            combined_mpg: fuel.combined_mpg?.[0]?.value
          } : null,
          msrp: d.price?.base_msrp || null,
          manufacturer: d.manufacturer?.manufacturer,
          plant_country: d.manufacturer?.country
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
            horsepower: engine.horsepower?.[0]?.value,
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
 * Runs VIN decode + recalls + maintenance + repair costs + market value in parallel
 */
export async function getVehicleIntelligence(vin, currentMileage = null) {
  const parallelCalls = [
    decodeVIN(vin),
    getRecalls(vin),
    currentMileage ? getNextService(vin, currentMileage) : getMaintenanceSchedule(vin),
    getRepairCosts(vin)
  ];

  if (currentMileage) {
    parallelCalls.push(getMarketValue(vin, currentMileage));
  }

  const [vinResult, recallsResult, maintenanceResult, repairCostsResult, marketValueResult] = await Promise.all(parallelCalls);

  // Fetch warranty if we got year/make/model from VIN decode
  let warrantyResult = { success: false };
  if (vinResult.success && vinResult.vehicle?.year && vinResult.vehicle?.make && vinResult.vehicle?.model) {
    warrantyResult = await getWarranty(vinResult.vehicle.year, vinResult.vehicle.make, vinResult.vehicle.model);
  }

  const intelligence = {
    success: true,
    vin,
    vehicle: vinResult.success ? vinResult.vehicle : null,
    recalls: recallsResult.success ? {
      has_open_recalls: recallsResult.has_open_recalls,
      count: recallsResult.recall_count,
      items: recallsResult.recalls?.slice(0, 3)
    } : null,
    maintenance: maintenanceResult.success ? maintenanceResult : null,
    warranty: warrantyResult.success ? warrantyResult.warranty : null,
    repair_costs: repairCostsResult?.success ? {
      count: repairCostsResult.repair_count,
      repairs: repairCostsResult.repairs?.slice(0, 10)
    } : null,
    market_value: marketValueResult?.success ? marketValueResult.valuations : null
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

  if (recallsResult.success && recallsResult.has_open_recalls) {
    summaryParts.push(`${recallsResult.recall_count} open recall${recallsResult.recall_count > 1 ? 's' : ''}`);
  }

  if (maintenanceResult.success && currentMileage && maintenanceResult.upcoming_services?.length > 0) {
    const nextService = maintenanceResult.upcoming_services[0];
    summaryParts.push(`next service due in ${nextService.miles_until.toLocaleString()} miles`);
  }

  if (maintenanceResult.success && !currentMileage && maintenanceResult.schedule?.intervals?.length > 0) {
    const intervalCount = maintenanceResult.schedule.intervals.length;
    summaryParts.push(`${intervalCount} maintenance intervals on file`);
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
  getRecalls,
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
