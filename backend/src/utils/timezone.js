/**
 * Timezone utilities — all business logic dates in EST (America/New_York).
 *
 * On Vercel, new Date() returns UTC. These helpers ensure "today",
 * "this week", etc. always reflect Eastern Time.
 */

import { toZonedTime } from 'date-fns-tz';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, subDays } from 'date-fns';

export const TZ = 'America/New_York';

/** Current time in EST */
export function nowEST() {
  return toZonedTime(new Date(), TZ);
}

/** Today's date string in EST (YYYY-MM-DD) */
export function todayEST() {
  return format(nowEST(), 'yyyy-MM-dd');
}

/** Format a date as YYYY-MM-DD in EST */
export function formatDateEST(date) {
  return format(date, 'yyyy-MM-dd');
}

/** Start of the current week (Sunday) in EST, as YYYY-MM-DD */
export function weekStartEST() {
  return format(startOfWeek(nowEST()), 'yyyy-MM-dd');
}

/** End of the current week (Saturday) in EST, as YYYY-MM-DD */
export function weekEndEST() {
  return format(endOfWeek(nowEST()), 'yyyy-MM-dd');
}

/** Start of the current month in EST, as YYYY-MM-DD */
export function monthStartEST() {
  return format(startOfMonth(nowEST()), 'yyyy-MM-dd');
}

/** End of the current month in EST, as YYYY-MM-DD */
export function monthEndEST() {
  return format(endOfMonth(nowEST()), 'yyyy-MM-dd');
}

/** N days ago from today EST, as YYYY-MM-DD */
export function daysAgoEST(n) {
  return format(subDays(nowEST(), n), 'yyyy-MM-dd');
}

/** N days from today EST, as YYYY-MM-DD */
export function daysFromNowEST(n) {
  return format(addDays(nowEST(), n), 'yyyy-MM-dd');
}

/** Format "HH:MM" or "HH:MM:SS" to 12-hour display (e.g. "2:30 PM" or "2 PM") */
export function formatTime12Hour(timeStr) {
  const [hours, mins] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return mins === 0 ? `${hour12} ${period}` : `${hour12}:${String(mins).padStart(2, '0')} ${period}`;
}
