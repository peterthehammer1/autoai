/**
 * Input validation helpers for API endpoints.
 * Lightweight — no external dependencies.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidDate(str) {
  if (!DATE_RE.test(str)) return false;
  const d = new Date(str + 'T12:00:00');
  return !isNaN(d.getTime());
}

export function isValidTime(str) {
  return TIME_RE.test(str);
}

export function isValidPhone(str) {
  if (!str) return false;
  const digits = str.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function isValidUUID(str) {
  return typeof str === 'string' && UUID_RE.test(str);
}

export function isValidUUIDArray(arr) {
  return Array.isArray(arr) && arr.length > 0 && arr.every(isValidUUID);
}

export function isWeekday(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

export function isWithinBusinessHours(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const mins = h * 60 + m;
  return mins >= 7 * 60 && mins < 16 * 60; // 07:00 - 15:59
}

export function isValidEmail(str) {
  return typeof str === 'string' && EMAIL_RE.test(str);
}

/**
 * Clamp pagination params to safe bounds.
 */
export function clampPagination(limit, offset) {
  return {
    limit: Math.max(1, Math.min(parseInt(limit) || 50, 200)),
    offset: Math.max(0, Math.min(parseInt(offset) || 0, 100000)),
  };
}

/**
 * Check that a date is not in the past and within the booking window (60 days).
 */
export function isFutureDate(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr + 'T12:00:00');
  return date >= today;
}

export function isWithinBookingWindow(dateStr, maxDays = 60) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr + 'T12:00:00');
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + maxDays);
  return date <= maxDate;
}

/**
 * Returns a 400 response with a clear validation error message.
 */
export function validationError(res, message) {
  return res.status(400).json({ error: { message } });
}
