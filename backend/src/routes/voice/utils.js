import { supabase } from '../../config/database.js';
import { parseISO, format } from 'date-fns';
import { formatTime12Hour } from '../../utils/timezone.js';
import { logger } from '../../utils/logger.js';

// Skill level hierarchy for comparison (higher = more skilled)
const SKILL_RANK = { junior: 1, intermediate: 2, senior: 3, master: 4 };

// Bay type specialization hierarchy (higher = more specialized)
const BAY_TYPE_RANK = {
  express_lane: 1,
  quick_service: 2,
  general_service: 3,
  alignment: 4,
  diagnostic: 5,
  heavy_repair: 6,
};

/**
 * Determine the best bay type when multiple services require different bay types.
 * Uses the most specialized (highest rank) bay type needed.
 */
function getBestBayType(services) {
  let bestType = services[0]?.required_bay_type || 'general_service';
  let bestRank = BAY_TYPE_RANK[bestType] || 0;

  for (const svc of services) {
    const rank = BAY_TYPE_RANK[svc.required_bay_type] || 0;
    if (rank > bestRank) {
      bestRank = rank;
      bestType = svc.required_bay_type;
    }
  }
  return bestType;
}

/**
 * Determine the highest required skill level across a set of services.
 */
function getRequiredSkillLevel(services) {
  let best = 'junior';
  let bestRank = 1;

  for (const svc of services) {
    const rank = SKILL_RANK[svc.required_skill_level] || 1;
    if (rank > bestRank) {
      bestRank = rank;
      best = svc.required_skill_level;
    }
  }
  return best;
}

/**
 * Automatically assign the best available technician for an appointment.
 *
 * Logic:
 * 1. Find technicians assigned to the given bay
 * 2. Filter: working that day (technician_schedules)
 * 3. Filter: shift covers appointment time window
 * 4. Filter: skill_level >= required
 * 5. Filter: not already booked at that time (existing appointments)
 * 6. Pick best: prefer primary bay assignment, then closest skill match
 *
 * Returns technician_id or null if no technician available.
 */
async function assignTechnician({ bay_id, appointment_date, appointment_time, duration_minutes, required_skill_level }) {
  try {
    const requiredRank = SKILL_RANK[required_skill_level] || 1;

    // Parse appointment time window
    const [aptH, aptM] = appointment_time.split(':').map(Number);
    const aptStartMins = aptH * 60 + aptM;
    const aptEndMins = aptStartMins + (duration_minutes || 60);

    // Convert to day_of_week (0=Sunday, 1=Monday, ... 6=Saturday)
    const dateObj = parseISO(appointment_date);
    const dayOfWeek = dateObj.getDay(); // JS: 0=Sunday

    // 1. Find technician IDs assigned to this bay
    const { data: bayAssignments, error: baError } = await supabase
      .from('technician_bay_assignments')
      .select('technician_id, is_primary')
      .eq('bay_id', bay_id);

    if (baError) {
      logger.info('assignTechnician: bay assignment query error:', { data: baError.message });
      return null;
    }
    if (!bayAssignments || bayAssignments.length === 0) {
      logger.info('assignTechnician: No technicians assigned to bay', { data: bay_id });
      return null;
    }
    logger.info(`assignTechnician: Found ${bayAssignments.length} tech(s) assigned to bay ${bay_id}`);

    // 2. Fetch those technicians with sufficient skill
    const assignedTechIds = bayAssignments.map(ba => ba.technician_id);
    const { data: technicians, error: techError } = await supabase
      .from('technicians')
      .select('id, first_name, last_name, skill_level, is_active')
      .in('id', assignedTechIds)
      .eq('is_active', true);

    if (techError || !technicians || technicians.length === 0) {
      logger.info('assignTechnician: No active technicians found');
      return null;
    }

    // Filter by skill level
    const qualified = technicians.filter(t => (SKILL_RANK[t.skill_level] || 1) >= requiredRank);
    if (qualified.length === 0) {
      logger.info('assignTechnician: No technicians meet skill level', { data: required_skill_level });
      return null;
    }
    logger.info(`assignTechnician: ${qualified.length} qualified tech(s) for skill ${required_skill_level}`);

    // 3. Check schedules - which techs work this day and time
    const qualifiedIds = qualified.map(t => t.id);
    const { data: schedules, error: schError } = await supabase
      .from('technician_schedules')
      .select('technician_id, start_time, end_time')
      .in('technician_id', qualifiedIds)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true);

    if (schError || !schedules || schedules.length === 0) {
      logger.info('assignTechnician: No technicians scheduled for day_of_week', { data: dayOfWeek });
      return null;
    }

    // Filter by shift covering the appointment window
    const aptStartTime = `${String(aptH).padStart(2, '0')}:${String(aptM).padStart(2, '0')}:00`;
    const endH = Math.floor(aptEndMins / 60);
    const endMn = aptEndMins % 60;
    const aptEndTime = `${String(endH).padStart(2, '0')}:${String(endMn).padStart(2, '0')}:00`;

    const workingTechIds = schedules
      .filter(s => s.start_time <= aptStartTime && s.end_time >= aptEndTime)
      .map(s => s.technician_id);

    if (workingTechIds.length === 0) {
      logger.info(`assignTechnician: No technicians working ${aptStartTime}-${aptEndTime} on day ${dayOfWeek}`);
      return null;
    }
    logger.info(`assignTechnician: ${workingTechIds.length} tech(s) working during ${aptStartTime}-${aptEndTime}`);

    // 4. Check for conflicting appointments
    const { data: conflicts } = await supabase
      .from('appointments')
      .select('technician_id, scheduled_time, estimated_duration_minutes')
      .in('technician_id', workingTechIds)
      .eq('scheduled_date', appointment_date)
      .not('status', 'in', '("cancelled","no_show")');

    // Build set of busy technician IDs
    const busyTechIds = new Set();
    if (conflicts) {
      for (const conf of conflicts) {
        if (!conf.technician_id) continue;
        const [cH, cM] = conf.scheduled_time.split(':').map(Number);
        const confStart = cH * 60 + cM;
        const confEnd = confStart + (conf.estimated_duration_minutes || 60);

        if (aptStartMins < confEnd && aptEndMins > confStart) {
          busyTechIds.add(conf.technician_id);
        }
      }
    }

    // 5. Final available technicians
    const available = workingTechIds.filter(id => !busyTechIds.has(id));
    if (available.length === 0) {
      logger.info('assignTechnician: All qualified technicians are booked at this time');
      return null;
    }

    // 6. Pick best: prefer primary bay assignment, then closest skill match
    const candidates = available.map(techId => {
      const tech = qualified.find(t => t.id === techId);
      const ba = bayAssignments.find(b => b.technician_id === techId);
      return { techId, tech, isPrimary: ba?.is_primary || false };
    });

    candidates.sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      const aRank = SKILL_RANK[a.tech?.skill_level] || 1;
      const bRank = SKILL_RANK[b.tech?.skill_level] || 1;
      return aRank - bRank; // prefer least over-qualified
    });

    const chosen = candidates[0];
    logger.info(`assignTechnician: Assigned ${chosen.tech?.first_name} ${chosen.tech?.last_name} (${chosen.tech?.skill_level}) [${chosen.isPrimary ? 'primary' : 'secondary'} bay]`);
    return chosen.techId;

  } catch (err) {
    logger.error('assignTechnician error:', { error: err });
    return null; // Graceful fallback - don't block booking
  }
}

// Helper functions
function addMinutesToTime(timeStr, minutes) {
  const [hours, mins] = timeStr.split(':').map(Number);
  const totalMins = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMins / 60);
  const newMins = totalMins % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}:00`;
}

function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/** Format a date as "Wednesday, March 5th" — TTS-friendly with ordinal suffix */
function formatDateSpoken(date) {
  const dayName = format(date, 'EEEE');
  const monthName = format(date, 'MMMM');
  const dayOfMonth = parseInt(format(date, 'd'));
  return `${dayName}, ${monthName} ${dayOfMonth}${getOrdinalSuffix(dayOfMonth)}`;
}

export { SKILL_RANK, BAY_TYPE_RANK, getBestBayType, getRequiredSkillLevel, assignTechnician, addMinutesToTime, getOrdinalSuffix, formatDateSpoken, formatTime12Hour };
