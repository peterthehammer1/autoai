import { Router } from 'express';
import { supabase } from '../config/database.js';
import { format, addDays, parseISO, isAfter, isBefore, setHours, setMinutes } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { isValidDate, isValidUUID, validationError } from '../middleware/validate.js';
import { nowEST, todayEST } from '../utils/timezone.js';

const router = Router();

/**
 * GET /api/availability/check
 * Check available time slots for given services
 * Query params: 
 *   - service_ids: comma-separated service IDs
 *   - date: preferred date (YYYY-MM-DD)
 *   - time_preference: 'morning', 'afternoon', 'anytime' or specific time 'HH:MM'
 *   - days_to_check: number of days to search (default 7)
 */
router.get('/check', async (req, res, next) => {
  try {
    const { 
      service_ids, 
      date, 
      time_preference = 'anytime',
      days_to_check = 7 
    } = req.query;

    if (!service_ids) {
      return validationError(res, 'service_ids is required');
    }

    const serviceIdList = service_ids.split(',').map(id => id.trim());
    if (!serviceIdList.every(id => isValidUUID(id))) {
      return validationError(res, 'service_ids must be valid UUIDs');
    }
    if (date && !isValidDate(date)) {
      return validationError(res, 'Invalid date format. Use YYYY-MM-DD');
    }

    // Get services to determine total duration and required bay types
    const { data: services, error: serviceError } = await supabase
      .from('services')
      .select('id, name, duration_minutes, required_bay_type, price_display')
      .in('id', serviceIdList);

    if (serviceError) throw serviceError;

    if (!services || services.length === 0) {
      return res.status(400).json({ 
        error: { message: 'No valid services found' } 
      });
    }

    // Calculate total duration (services done sequentially in same bay)
    const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
    
    // Get unique bay types needed
    const requiredBayTypes = [...new Set(services.map(s => s.required_bay_type))];
    
    // If multiple bay types needed, use most restrictive (assume heavy_repair handles all)
    // In reality, you might need to split appointments, but for MVP we simplify
    const primaryBayType = requiredBayTypes.includes('heavy_repair') ? 'heavy_repair' :
                          requiredBayTypes.includes('diagnostic') ? 'diagnostic' :
                          requiredBayTypes.includes('alignment') ? 'alignment' :
                          requiredBayTypes.includes('general_service') ? 'general_service' :
                          requiredBayTypes[0] || 'general_service';

    // Determine date range
    const startDate = date ? parseISO(date) : nowEST();
    const endDate = addDays(startDate, parseInt(days_to_check, 10));

    // Service department hours: Mon-Fri 7am-4pm only (no evenings, no weekends)
    let timeFilter = { start: '07:00', end: '16:00' };
    if (time_preference === 'morning') {
      timeFilter = { start: '07:00', end: '12:00' };
    } else if (time_preference === 'afternoon') {
      timeFilter = { start: '12:00', end: '16:00' };
    } else if (/^\d{2}:\d{2}$/.test(time_preference)) {
      // Specific time requested - look for slots within 2 hours (cap at 4pm close)
      const [hours, mins] = time_preference.split(':').map(Number);
      const startHour = Math.max(7, hours - 1);
      const endHour = Math.min(16, hours + 2);
      timeFilter = { 
        start: `${String(startHour).padStart(2, '0')}:00`,
        end: `${String(endHour).padStart(2, '0')}:00`
      };
    }

    // Number of consecutive slots needed (each slot is 30 minutes)
    const slotsNeeded = Math.ceil(totalDuration / 30);

    // Get bays that can handle this service type
    const { data: compatibleBays, error: bayError } = await supabase
      .from('service_bays')
      .select('id, name, bay_type')
      .eq('is_active', true)
      .eq('bay_type', primaryBayType);

    if (bayError) throw bayError;

    if (!compatibleBays || compatibleBays.length === 0) {
      return res.json({
        available: false,
        message: `No bays available for ${primaryBayType} services`,
        services,
        total_duration_minutes: totalDuration
      });
    }

    const bayIds = compatibleBays.map(b => b.id);

    // Query available slots
    const { data: slots, error: slotError } = await supabase
      .from('time_slots')
      .select('id, slot_date, start_time, end_time, bay_id, is_available')
      .in('bay_id', bayIds)
      .eq('is_available', true)
      .gte('slot_date', format(startDate, 'yyyy-MM-dd'))
      .lte('slot_date', format(endDate, 'yyyy-MM-dd'))
      .gte('start_time', timeFilter.start)
      .lt('start_time', timeFilter.end)
      .order('slot_date')
      .order('start_time')
      .order('bay_id');

    if (slotError) throw slotError;

    // Service department: weekdays only (no Saturday or Sunday)
    const isWeekday = (dateStr) => {
      const d = new Date(dateStr + 'T12:00:00');
      const day = d.getDay(); // 0=Sun, 6=Sat
      return day >= 1 && day <= 5;
    };
    const weekdaySlots = (slots || []).filter(s => isWeekday(s.slot_date));

    // Group slots by date and bay, then find consecutive available slots
    const availableAppointments = [];
    const slotsByDateBay = {};

    for (const slot of weekdaySlots) {
      const key = `${slot.slot_date}_${slot.bay_id}`;
      if (!slotsByDateBay[key]) {
        slotsByDateBay[key] = [];
      }
      slotsByDateBay[key].push(slot);
    }

    // Find valid appointment windows
    for (const [key, baySlots] of Object.entries(slotsByDateBay)) {
      const [slotDate, bayId] = key.split('_');
      const bay = compatibleBays.find(b => b.id === bayId);
      
      // Sort by time
      baySlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
      
      // Find consecutive slot sequences
      for (let i = 0; i <= baySlots.length - slotsNeeded; i++) {
        let consecutive = true;
        let currentTime = baySlots[i].start_time;
        
        for (let j = 0; j < slotsNeeded; j++) {
          if (i + j >= baySlots.length) {
            consecutive = false;
            break;
          }
          
          const slot = baySlots[i + j];
          
          // Check if this slot is the expected time
          if (j > 0) {
            const expectedTime = addMinutesToTime(currentTime, 30);
            if (slot.start_time !== expectedTime) {
              consecutive = false;
              break;
            }
          }
          currentTime = slot.start_time;
        }
        
        if (consecutive) {
          const startSlot = baySlots[i];
          const endSlot = baySlots[i + slotsNeeded - 1];
          
          availableAppointments.push({
            date: slotDate,
            start_time: startSlot.start_time.slice(0, 5),
            end_time: endSlot.end_time.slice(0, 5),
            bay_id: bayId,
            bay_name: bay.name,
            bay_type: bay.bay_type,
            slot_ids: baySlots.slice(i, i + slotsNeeded).map(s => s.id)
          });
        }
      }
    }

    // Sort by date and time
    availableAppointments.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.start_time.localeCompare(b.start_time);
    });

    // Deduplicate by date/time (different bays might offer same time)
    const uniqueTimes = [];
    const seenTimes = new Set();
    
    for (const apt of availableAppointments) {
      const key = `${apt.date}_${apt.start_time}`;
      if (!seenTimes.has(key)) {
        seenTimes.add(key);
        uniqueTimes.push(apt);
      }
    }

    // Limit results and format response
    const limitedResults = uniqueTimes.slice(0, 10);

    // Format for voice agent (natural language)
    const formattedSlots = limitedResults.map(apt => {
      const date = parseISO(apt.date);
      const dayName = format(date, 'EEEE');
      const monthDay = format(date, 'MMMM d');
      const time = formatTime12Hour(apt.start_time);
      
      return {
        ...apt,
        formatted: `${dayName}, ${monthDay} at ${time}`,
        formatted_short: `${format(date, 'EEE MMM d')} at ${time}`
      };
    });

    res.json({
      available: formattedSlots.length > 0,
      slots: formattedSlots,
      services,
      total_duration_minutes: totalDuration,
      slots_needed: slotsNeeded,
      search_criteria: {
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        time_preference,
        bay_type: primaryBayType
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/availability/day/:date
 * Get all availability for a specific day (for calendar view)
 */
router.get('/day/:date', async (req, res, next) => {
  try {
    const { date } = req.params;

    const { data: slots, error } = await supabase
      .from('time_slots')
      .select(`
        id,
        start_time,
        end_time,
        is_available,
        blocked_reason,
        appointment_id,
        bay:service_bays (
          id,
          name,
          bay_type
        )
      `)
      .eq('slot_date', date)
      .order('start_time')
      .order('bay_id');

    if (error) throw error;

    // Group by bay
    const byBay = {};
    for (const slot of slots) {
      const bayId = slot.bay.id;
      if (!byBay[bayId]) {
        byBay[bayId] = {
          bay: slot.bay,
          slots: []
        };
      }
      byBay[bayId].slots.push({
        id: slot.id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_available: slot.is_available,
        blocked_reason: slot.blocked_reason,
        appointment_id: slot.appointment_id
      });
    }

    res.json({
      date,
      bays: Object.values(byBay),
      summary: {
        total_slots: slots.length,
        available: slots.filter(s => s.is_available).length,
        booked: slots.filter(s => !s.is_available && s.appointment_id).length,
        blocked: slots.filter(s => !s.is_available && s.blocked_reason).length
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/availability/next
 * Get next available slot for a service type (quick booking)
 */
router.get('/next', async (req, res, next) => {
  try {
    const { service_id, bay_type } = req.query;

    let targetBayType = bay_type;

    // If service_id provided, get its bay type
    if (service_id) {
      const { data: service } = await supabase
        .from('services')
        .select('required_bay_type, duration_minutes')
        .eq('id', service_id)
        .single();
      
      if (service) {
        targetBayType = service.required_bay_type;
      }
    }

    // Get compatible bays
    let bayQuery = supabase
      .from('service_bays')
      .select('id')
      .eq('is_active', true);
    
    if (targetBayType) {
      bayQuery = bayQuery.eq('bay_type', targetBayType);
    }

    const { data: bays } = await bayQuery;
    const bayIds = bays?.map(b => b.id) || [];

    if (bayIds.length === 0) {
      return res.json({ available: false, message: 'No compatible bays found' });
    }

    // Find next available slot (service department: Mon-Fri 7am-4pm only)
    const today = todayEST();
    const isWeekday = (dateStr) => {
      const d = new Date(dateStr + 'T12:00:00');
      const day = d.getDay();
      return day >= 1 && day <= 5;
    };

    const { data: slots } = await supabase
      .from('time_slots')
      .select('slot_date, start_time, bay_id')
      .in('bay_id', bayIds)
      .eq('is_available', true)
      .gte('slot_date', today)
      .lt('start_time', '16:00')
      .order('slot_date')
      .order('start_time')
      .limit(200);

    const nextSlot = (slots || []).find(s => isWeekday(s.slot_date));

    if (!nextSlot) {
      return res.json({ available: false, message: 'No availability in the next 60 days' });
    }

    const date = parseISO(nextSlot.slot_date);
    
    res.json({
      available: true,
      next_slot: {
        date: nextSlot.slot_date,
        time: nextSlot.start_time.slice(0, 5),
        formatted: `${format(date, 'EEEE, MMMM d')} at ${formatTime12Hour(nextSlot.start_time)}`
      }
    });

  } catch (error) {
    next(error);
  }
});

// Helper function to add minutes to a time string
function addMinutesToTime(timeStr, minutes) {
  const [hours, mins] = timeStr.split(':').map(Number);
  const totalMins = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMins / 60);
  const newMins = totalMins % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}:00`;
}

// Helper function to format time in 12-hour format
function formatTime12Hour(timeStr) {
  const [hours, mins] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(mins).padStart(2, '0')} ${period}`;
}

export default router;
