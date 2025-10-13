/**
 * Date manipulation helpers
 * Consolidated from duplicate implementations across the codebase
 */

/**
 * Gets a date N days ago at midnight UTC
 */
export function getDateDaysAgo(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/**
 * Gets a date N hours ago
 */
export function getDateHoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

/**
 * Gets a date N minutes ago
 */
export function getDateMinutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

/**
 * Formats a date to ISO string in UTC
 */
export function toUTCString(date: Date): string {
  return date.toISOString();
}

/**
 * Checks if a date is within the last N days
 */
export function isWithinDays(date: Date | string, days: number): boolean {
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  const cutoff = getDateDaysAgo(days);
  return checkDate >= cutoff;
}

/**
 * Gets the start of today in UTC
 */
export function getStartOfToday(): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/**
 * Gets the end of today in UTC
 */
export function getEndOfToday(): Date {
  const date = new Date();
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

