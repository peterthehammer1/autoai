import { supabase, normalizePhone } from '../../../config/database.js';
import { format, parseISO, addDays } from 'date-fns';
import { nowEST, todayEST } from '../../../utils/timezone.js';
import { logger } from '../../../utils/logger.js';
import { getBestBayType, addMinutesToTime, getOrdinalSuffix, formatTime12Hour, getShopClosures } from '../utils.js';

/**
 * POST /api/voice/check_availability
 * Find open slots. Accepts either service_ids (UUIDs from get_services) OR a
 * keyword (e.g. "oil change", "60k service"); keyword path resolves to a
 * service ID server-side to skip the get_services round-trip.
 */
export default async function checkAvailability(req, res) {
  try {
    logger.info('check_availability received:', { data: JSON.stringify(req.body) });

    const body = req.body.args || req.body;
    let service_ids = req.body.service_ids || body.service_ids;
    const keyword = req.body.keyword || body.keyword || body.search;
    const preferred_date = req.body.preferred_date || body.preferred_date;
    const preferred_time = req.body.preferred_time || body.preferred_time;
    const days_to_check = req.body.days_to_check || body.days_to_check || 7;
    let customer_phone = req.body.customer_phone || body.customer_phone;
    const isTemplateVar = (val) => typeof val === 'string' && (val.includes('{{') || val.includes('}}'));
    if (isTemplateVar(customer_phone)) customer_phone = null;

    // Keyword fallback: if caller passed a keyword instead of service_ids, look it up here
    // (Dynasty pattern — collapses the get_services → check_availability chain into one tool call).
    let resolved_from_keyword = null;
    if ((!service_ids || (Array.isArray(service_ids) && service_ids.length === 0)) && keyword) {
      const kw = String(keyword).toLowerCase().trim();
      const isOilChangeGeneric = /\boil\s*change\b/.test(kw) && !/(synthetic|blend|conventional|full)/.test(kw);
      // Mileage-package synonyms — DB names are "30,000 KM Service" etc.; ILIKE
      // doesn't match "60k" / "sixty thousand" directly. Normalize here.
      let searchTerm = kw;
      if (isOilChangeGeneric) searchTerm = 'synthetic blend oil change';
      else if (/\b(30k|thirty thousand|30000)\b/.test(kw)) searchTerm = '30,000 KM';
      else if (/\b(60k|sixty thousand|60000)\b/.test(kw) || /\bmajor service\b/.test(kw) || /\bfull service\b/.test(kw)) searchTerm = '60,000 KM';
      else if (/\b(90k|ninety thousand|90000)\b/.test(kw)) searchTerm = '90,000 KM';
      const { data: matches } = await supabase
        .from('services')
        .select('id, name, duration_minutes, required_bay_type')
        .eq('is_active', true)
        // Double-quote for PostgREST comma-safety — values like "60,000 KM"
        // contain commas that otherwise get parsed as filter separators.
        .or(`name.ilike."%${searchTerm}%",description.ilike."%${searchTerm}%"`)
        .limit(5);
      if (matches && matches.length > 0) {
        service_ids = [matches[0].id];
        resolved_from_keyword = { keyword: searchTerm, service_name: matches[0].name };
        logger.info('check_availability keyword resolved:', { data: resolved_from_keyword });
      }
    }

    if (!service_ids || (Array.isArray(service_ids) && service_ids.length === 0)) {
      logger.info('No service_ids found and no keyword match');
      return res.json({
        success: false,
        available: false,
        error: 'missing_service_ids',
        recovery: 'Pass either service_ids (UUIDs from get_services) OR a keyword like "synthetic blend oil change" / "alignment" / "tire rotation". Do NOT retry with the same empty arguments.',
        message: 'Please let me know what service you need so I can check availability.'
      });
    }

    const serviceIdList = Array.isArray(service_ids) ? service_ids : [service_ids];
    logger.info('Looking for services:', { data: serviceIdList });

    const { data: services, error: serviceError } = await supabase
      .from('services')
      .select('id, name, duration_minutes, required_bay_type')
      .in('id', serviceIdList);

    logger.info('Services found:', { data: { count: services?.length, error: serviceError } });

    if (serviceError || !services || services.length === 0) {
      return res.json({
        success: false,
        available: false,
        message: 'I couldn\'t find those services. Could you tell me what service you need?'
      });
    }

    const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
    const primaryBayType = getBestBayType(services);

    const { data: bays } = await supabase
      .from('service_bays')
      .select('id')
      .eq('is_active', true)
      .eq('bay_type', primaryBayType);

    if (!bays || bays.length === 0) {
      return res.json({
        success: false,
        available: false,
        message: 'I\'m sorry, we don\'t have the right equipment available for that service currently.'
      });
    }

    const bayIds = bays.map(b => b.id);
    const hasSpecificDate = !!preferred_date;

    const today = nowEST();
    const todayDateStr = format(today, 'yyyy-MM-dd');
    let startDate = today;
    if (preferred_date && preferred_date > todayDateStr) {
      startDate = parseISO(preferred_date);
    }

    const searchDays = hasSpecificDate ? 5 : (parseInt(days_to_check, 10) || 7);
    const endDate = addDays(startDate, searchDays);

    // Business hours: Mon-Fri 7am-4pm
    let timeStart = '07:00';
    let timeEnd = '16:00';
    if (preferred_time) {
      const timeLower = preferred_time.toLowerCase().trim();
      if (timeLower === 'morning' || timeLower === 'am') {
        timeEnd = '12:00';
      } else if (timeLower === 'afternoon' || timeLower === 'pm') {
        timeStart = '12:00';
      } else if (timeLower === 'early morning') {
        timeEnd = '09:00';
      } else if (timeLower === 'late afternoon') {
        timeStart = '14:00';
      } else {
        const timeMatch = timeLower.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
        if (timeMatch) {
          let hour = parseInt(timeMatch[1], 10);
          const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const ampm = timeMatch[3];
          if (ampm === 'pm' && hour < 12) hour += 12;
          if (ampm === 'am' && hour === 12) hour = 0;
          const specificTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
          if (timeLower.includes('after') || timeLower.includes('from') || timeLower.includes('no earlier')) {
            timeStart = specificTime;
          } else if (timeLower.includes('before') || timeLower.includes('by') || timeLower.includes('no later')) {
            timeEnd = specificTime;
          } else {
            const startHour = Math.max(hour - 1, 7);
            timeStart = `${String(startHour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
            const endHour = Math.min(hour + 2, 16);
            timeEnd = `${String(endHour).padStart(2, '0')}:00`;
          }
        }
      }
      if (timeStart < '07:00') timeStart = '07:00';
      if (timeEnd > '16:00') timeEnd = '16:00';
      if (timeStart >= timeEnd) timeStart = '07:00';
    }

    const weekdayDates = [];
    let d = new Date(startDate);
    const end = new Date(endDate);
    while (d <= end) {
      const day = d.getDay();
      if (day >= 1 && day <= 5) weekdayDates.push(format(d, 'yyyy-MM-dd'));
      d = addDays(d, 1);
    }

    if (weekdayDates.length === 0) {
      return res.json({
        success: true,
        available: false,
        slots: [],
        message: 'We\'re closed on weekends. Our service department is open Monday through Friday, 7 AM to 4 PM. Would you like a weekday instead?'
      });
    }

    // Filter out shop-closure dates. If the exact requested date is closed,
    // short-circuit with a friendly message so Amber can explain.
    const closureMap = await getShopClosures(weekdayDates);
    if (preferred_date && closureMap.has(preferred_date)) {
      const closure = closureMap.get(preferred_date);
      return res.json({
        success: true,
        available: false,
        requested_date_closed: true,
        closed_reason: 'shop_closure',
        closure_reason: closure.reason,
        message: `We're closed on ${format(parseISO(preferred_date), 'EEEE, MMMM do')} — ${closure.spoken_reason || closure.reason}. Want to try a different day?`
      });
    }
    const openWeekdayDates = weekdayDates.filter(ds => !closureMap.has(ds));
    if (openWeekdayDates.length === 0) {
      return res.json({
        success: true,
        available: false,
        slots: [],
        message: 'All the days I checked are closed for holidays or scheduled closures. Want to try a different range?'
      });
    }

    const { data: rawSlots, error: slotError } = await supabase
      .from('time_slots')
      .select('slot_date, start_time, bay_id')
      .in('bay_id', bayIds)
      .eq('is_available', true)
      .in('slot_date', openWeekdayDates)
      .gte('start_time', timeStart)
      .lt('start_time', timeEnd)
      .order('slot_date')
      .order('start_time')
      .limit(200);

    if (slotError) throw slotError;
    const slots = rawSlots || [];

    const slotsNeeded = Math.ceil(totalDuration / 30);
    const availableWindows = [];
    const slotsByDateBay = {};
    for (const slot of slots) {
      const key = `${slot.slot_date}_${slot.bay_id}`;
      if (!slotsByDateBay[key]) slotsByDateBay[key] = [];
      slotsByDateBay[key].push(slot);
    }

    const now = nowEST();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const todayStr = todayEST();

    // Scan enough windows to give the agent real choice across the day.
    const MAX_OPTIONS = 60;
    let foundEnough = false;

    for (const [key, baySlots] of Object.entries(slotsByDateBay)) {
      if (foundEnough) break;
      const [slotDate] = key.split('_');
      baySlots.sort((a, b) => a.start_time.localeCompare(b.start_time));

      for (let i = 0; i <= baySlots.length - slotsNeeded; i++) {
        if (foundEnough) break;
        const slotTime = baySlots[i].start_time;
        const [slotHour, slotMinute] = slotTime.split(':').map(Number);
        const slotMinutes = slotHour * 60 + slotMinute;

        if (slotDate === todayStr) {
          const currentMinutes = currentHour * 60 + currentMinute + 30;
          if (slotMinutes <= currentMinutes) continue;
        }
        if (slotMinutes + totalDuration > 16 * 60) continue;

        let consecutive = true;
        for (let j = 1; j < slotsNeeded; j++) {
          const expected = addMinutesToTime(baySlots[i + j - 1].start_time, 30);
          if (baySlots[i + j].start_time !== expected) { consecutive = false; break; }
        }

        if (consecutive) {
          availableWindows.push({
            date: slotDate,
            time: baySlots[i].start_time.slice(0, 5),
            bay_id: baySlots[i].bay_id
          });
          if (availableWindows.length >= MAX_OPTIONS) foundEnough = true;
        }
      }
    }

    // Dedup by (date, time). Return up to 10 unique slots.
    const uniqueSlots = [];
    const seen = new Set();
    for (const slot of availableWindows) {
      const key = `${slot.date}_${slot.time}`;
      if (!seen.has(key)) { seen.add(key); uniqueSlots.push(slot); }
      if (uniqueSlots.length >= 10) break;
    }

    const requestedDay = preferred_date ? new Date(preferred_date + 'T12:00:00').getDay() : null;
    const isWeekendRequest = requestedDay === 0 || requestedDay === 6;

    if (uniqueSlots.length === 0) {
      const daysFromNow = preferred_date ? Math.ceil((startDate - today) / (1000 * 60 * 60 * 24)) : 0;
      let message;
      if (isWeekendRequest) {
        message = `We're closed on weekends. Our service department is open Monday through Friday, 7 AM to 4 PM. Would you like a weekday instead?`;
      } else if (daysFromNow > 45) {
        message = `Our schedule isn't open that far out yet. Would you like to try a date within the next month or so?`;
      } else if (preferred_time) {
        message = `I don't have any ${preferred_time} openings around that date. Would you like to try a different time of day or another date?`;
      } else {
        message = `I don't have any openings around that date. Would you like to try a different date?`;
      }
      return res.json({ success: true, available: false, slots: [], message });
    }

    // Format for voice.
    const formattedSlots = uniqueSlots.map(s => {
      const date = parseISO(s.date);
      const dayName = format(date, 'EEEE');
      const dayOfMonth = format(date, 'd');
      const monthName = format(date, 'MMMM');
      const ordinal = getOrdinalSuffix(parseInt(dayOfMonth));
      return {
        ...s,
        formatted: `${dayName}, ${monthName} ${dayOfMonth}${ordinal} at ${formatTime12Hour(s.time)}`,
        day_name: dayName,
        date_formatted: `${monthName} ${dayOfMonth}${ordinal}`,
        time_formatted: formatTime12Hour(s.time),
        spoken_date: `${dayName} the ${dayOfMonth}${ordinal}`,
      };
    });

    // Voice message: lead with ONE slot, offer mid + late alternatives if the
    // day has more. Prompt rule tells Amber to open with the first and hold
    // alternatives in reserve — returning a sample gives her real material.
    const primary = formattedSlots[0];
    const laterSameDay = formattedSlots.filter(s => s.date === primary.date && s.time > primary.time);
    let alternativeDescriptors = [];
    if (laterSameDay.length >= 2) {
      const mid = laterSameDay[Math.floor(laterSameDay.length / 2)];
      const late = laterSameDay[laterSameDay.length - 1];
      alternativeDescriptors = [mid.time_formatted, late.time_formatted];
    } else if (laterSameDay.length === 1) {
      alternativeDescriptors = [laterSameDay[0].time_formatted];
    }
    let message = `I've got ${primary.formatted} — does that work?`;
    if (alternativeDescriptors.length > 0) {
      message += ` Other options today: ${alternativeDescriptors.join(' or ')}.`;
    }

    // Look up any existing appointments the caller already has on the offered dates.
    let existingOnDate = [];
    if (customer_phone) {
      const offerDates = [...new Set(formattedSlots.map(s => s.date))];
      const normalizedPhone = normalizePhone(customer_phone);
      const { data: existingCustomer } = await supabase
        .from('customers').select('id').eq('phone_normalized', normalizedPhone).single();
      if (existingCustomer) {
        const { data: existingApts } = await supabase
          .from('appointments')
          .select(`id, scheduled_date, scheduled_time, appointment_services (service_name)`)
          .eq('customer_id', existingCustomer.id)
          .in('scheduled_date', offerDates)
          .not('status', 'in', '("cancelled","completed","no_show")');
        if (existingApts?.length) {
          existingOnDate = existingApts.map(apt => ({
            date: apt.scheduled_date,
            time: apt.scheduled_time.slice(0, 5),
            services: apt.appointment_services.map(s => s.service_name).join(', ')
          }));
        }
      }
    }

    // Did we hit the caller's exact requested time? Only meaningful for
    // specific HH:MM. Fuzzy terms leave it null.
    let requested_time_matched = null;
    if (preferred_time) {
      const t = preferred_time.toLowerCase().trim();
      const exactMatch = t.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/);
      if (exactMatch) {
        let hour = parseInt(exactMatch[1], 10);
        const min = exactMatch[2] ? parseInt(exactMatch[2], 10) : 0;
        const ampm = exactMatch[3];
        if (ampm === 'pm' && hour < 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
        const normalized = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        requested_time_matched = formattedSlots.some(s => s.time === normalized);
      }
    }

    res.json({
      success: true,
      available: true,
      requested_date_closed: isWeekendRequest || false,
      closed_reason: isWeekendRequest ? 'weekend' : null,
      requested_time: preferred_time || null,
      requested_time_matched,
      slots: formattedSlots,
      service_ids: services.map(s => s.id),
      services: services.map(s => s.name),
      resolved_from_keyword,
      total_duration_minutes: totalDuration,
      existing_appointments_on_date: existingOnDate,
      message: isWeekendRequest
        ? `We're closed on weekends. Our service department is open Monday through Friday. The closest I have is ${primary.formatted}${alternativeDescriptors.length > 0 ? `, or ${alternativeDescriptors[0]}` : ''}. Would that work?`
        : message
    });

  } catch (error) {
    logger.error('check_availability error:', { error });
    res.json({
      success: false,
      available: false,
      message: 'Sorry, I had trouble checking availability. Let me try again.'
    });
  }
}
