/**
 * Vehicle Databases API Integration
 * https://vehicledatabases.com/docs/
 *
 * Provides vehicle maintenance schedules, recalls, and VIN decoding
 */

import { logger } from '../utils/logger.js';

const VEHICLE_DB_API_KEY = process.env.VEHICLE_DATABASES_API_KEY;
const BASE_URL = 'https://api.vehicledatabases.com';

/**
 * Decode a VIN to get vehicle specifications
 * @param {string} vin - 17-character VIN
 * @returns {Object} Vehicle specs (year, make, model, trim, engine, etc.)
 */
export async function decodeVIN(vin) {
  if (!VEHICLE_DB_API_KEY) {
    logger.info('[VehicleDB] API key not configured');
    return { success: false, error: 'API not configured' };
  }

  if (!vin || vin.length !== 17) {
    return { success: false, error: 'Invalid VIN - must be 17 characters' };
  }

  try {
    const response = await fetch(`${BASE_URL}/vin-decode/${vin}`, {
      headers: { 'x-authkey': VEHICLE_DB_API_KEY }
    });

    const data = await response.json();

    if (data.status === 'success' && data.data) {
      return {
        success: true,
        vehicle: {
          vin: data.data.intro?.vin,
          year: data.data.basic?.year,
          make: data.data.basic?.make,
          model: data.data.basic?.model,
          trim: data.data.basic?.trim,
          body_type: data.data.basic?.body_type,
          vehicle_type: data.data.basic?.vehicle_type,
          doors: data.data.basic?.doors,
          engine: {
            cylinders: data.data.engine?.cylinders,
            size: data.data.engine?.engine_size,
            description: data.data.engine?.engine_description,
            fuel_type: data.data.fuel?.fuel_type
          },
          transmission: data.data.transmission?.transmission_style,
          drive_type: data.data.drivetrain?.drive_type,
          manufacturer: data.data.manufacturer?.manufacturer,
          plant_country: data.data.manufacturer?.country
        }
      };
    }

    return { success: false, error: data.message || 'VIN decode failed' };
  } catch (error) {
    logger.error('[VehicleDB] VIN decode error', { error });
    return { success: false, error: error.message };
  }
}

/**
 * Get OEM maintenance schedule for a vehicle by VIN
 * @param {string} vin - 17-character VIN
 * @returns {Object} Maintenance schedule with mileage intervals
 */
export async function getMaintenanceSchedule(vin) {
  if (!VEHICLE_DB_API_KEY) {
    logger.info('[VehicleDB] API key not configured');
    return { success: false, error: 'API not configured' };
  }

  if (!vin || vin.length !== 17) {
    return { success: false, error: 'Invalid VIN - must be 17 characters' };
  }

  try {
    const response = await fetch(`${BASE_URL}/vehicle-maintenance/v4/${vin}`, {
      headers: { 'x-authkey': VEHICLE_DB_API_KEY }
    });

    const data = await response.json();

    if (data.status === 'success' && data.data) {
      // Transform the maintenance data into a more usable format
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

      // Create a lookup by service type for easy querying
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
    logger.error('[VehicleDB] Maintenance schedule error', { error });
    return { success: false, error: error.message };
  }
}

/**
 * Get open recalls for a vehicle by VIN
 * @param {string} vin - 17-character VIN
 * @returns {Object} List of open recalls with details
 */
export async function getRecalls(vin) {
  if (!VEHICLE_DB_API_KEY) {
    logger.info('[VehicleDB] API key not configured');
    return { success: false, error: 'API not configured' };
  }

  if (!vin || vin.length !== 17) {
    return { success: false, error: 'Invalid VIN - must be 17 characters' };
  }

  try {
    const response = await fetch(`${BASE_URL}/vehicle-recalls/${vin}`, {
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
    logger.error('[VehicleDB] Recalls error', { error });
    return { success: false, error: error.message };
  }
}

/**
 * Get next recommended service based on current mileage
 * @param {string} vin - 17-character VIN
 * @param {number} currentMileage - Current vehicle mileage
 * @returns {Object} Next recommended services
 */
export async function getNextService(vin, currentMileage) {
  const maintenanceResult = await getMaintenanceSchedule(vin);
  
  if (!maintenanceResult.success) {
    return maintenanceResult;
  }

  const { schedule } = maintenanceResult;
  
  // Find the next maintenance interval after current mileage
  const upcomingIntervals = schedule.intervals
    .filter(interval => interval.mileage_miles > currentMileage)
    .slice(0, 3); // Get next 3 intervals

  // Find overdue services (intervals we've passed)
  const overdueIntervals = schedule.intervals
    .filter(interval => interval.mileage_miles <= currentMileage)
    .slice(-2); // Get last 2 passed intervals

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
 * @param {string} vin - 17-character VIN
 * @param {number} currentMileage - Current vehicle mileage
 * @param {string} serviceType - Type of service to check (e.g., "oil change", "air filter")
 * @returns {Object} Service due status
 */
export async function isServiceDue(vin, currentMileage, serviceType) {
  const maintenanceResult = await getMaintenanceSchedule(vin);
  
  if (!maintenanceResult.success) {
    return maintenanceResult;
  }

  const { services_by_type, schedule } = maintenanceResult;
  const searchTerm = serviceType.toLowerCase();
  
  // Find matching services
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

  // Find the interval this service is typically done at
  const typicalInterval = matchedIntervals[0]?.mileage_miles || 0;
  
  // Calculate if due
  const lastServiceMileage = Math.floor(currentMileage / typicalInterval) * typicalInterval;
  const nextServiceMileage = lastServiceMileage + typicalInterval;
  const milesUntilDue = nextServiceMileage - currentMileage;
  const isDue = milesUntilDue <= 1000; // Due if within 1000 miles
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
 * Get a summary of vehicle info for voice agent
 * Combines VIN decode + recalls + maintenance into a concise summary
 * @param {string} vin - 17-character VIN
 * @param {number} currentMileage - Optional current mileage
 * @returns {Object} Combined vehicle intelligence
 */
export async function getVehicleIntelligence(vin, currentMileage = null) {
  // Run all lookups in parallel
  const [vinResult, recallsResult, maintenanceResult] = await Promise.all([
    decodeVIN(vin),
    getRecalls(vin),
    currentMileage ? getNextService(vin, currentMileage) : getMaintenanceSchedule(vin)
  ]);

  const intelligence = {
    success: true,
    vin,
    vehicle: vinResult.success ? vinResult.vehicle : null,
    recalls: recallsResult.success ? {
      has_open_recalls: recallsResult.has_open_recalls,
      count: recallsResult.recall_count,
      items: recallsResult.recalls?.slice(0, 3) // Limit to 3 most recent
    } : null,
    maintenance: maintenanceResult.success ? maintenanceResult : null
  };

  // Build voice-friendly summary
  const summaryParts = [];
  
  if (vinResult.success) {
    summaryParts.push(`${vinResult.vehicle.year} ${vinResult.vehicle.make} ${vinResult.vehicle.model}`);
  }
  
  if (recallsResult.success && recallsResult.has_open_recalls) {
    summaryParts.push(`${recallsResult.recall_count} open recall${recallsResult.recall_count > 1 ? 's' : ''}`);
  }
  
  if (maintenanceResult.success && currentMileage && maintenanceResult.upcoming_services?.length > 0) {
    const nextService = maintenanceResult.upcoming_services[0];
    summaryParts.push(`next service due in ${nextService.miles_until.toLocaleString()} miles`);
  }

  intelligence.summary = summaryParts.join(' | ');
  
  return intelligence;
}

export default {
  decodeVIN,
  getMaintenanceSchedule,
  getRecalls,
  getNextService,
  isServiceDue,
  getVehicleIntelligence
};
