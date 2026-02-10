/**
 * Structured JSON logger for production debugging.
 * Outputs JSON lines to stdout/stderr for easy parsing by log aggregators.
 * In development, falls back to readable console output.
 */

const IS_PROD = process.env.NODE_ENV === 'production';

function formatLog(level, message, meta = {}) {
  if (IS_PROD) {
    const entry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...meta
    };
    // Remove undefined values
    Object.keys(entry).forEach(k => entry[k] === undefined && delete entry[k]);
    return JSON.stringify(entry);
  }
  // Dev: readable format
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  info(message, meta) {
    console.log(formatLog('info', message, meta));
  },

  warn(message, meta) {
    console.warn(formatLog('warn', message, meta));
  },

  error(message, meta) {
    // Extract useful fields from Error objects
    if (meta?.error instanceof Error) {
      meta = {
        ...meta,
        error: meta.error.message,
        stack: meta.error.stack?.split('\n').slice(0, 5).join('\n')
      };
    }
    console.error(formatLog('error', message, meta));
  }
};
