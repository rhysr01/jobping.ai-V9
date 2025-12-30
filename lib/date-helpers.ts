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

// DEPRECATED: Unused functions - kept for backward compatibility
// Consider removing if not needed in future versions
/**
 * @deprecated Not used in codebase - consider removing
 */
export function getDateHoursAgo(hours: number): Date {
	return new Date(Date.now() - hours * 60 * 60 * 1000);
}

/**
 * @deprecated Not used in codebase - consider removing
 */
export function getDateMinutesAgo(minutes: number): Date {
	return new Date(Date.now() - minutes * 60 * 1000);
}

/**
 * @deprecated Not used in codebase - consider removing
 */
export function toUTCString(date: Date): string {
	return date.toISOString();
}

/**
 * @deprecated Not used in codebase - consider removing
 */
export function isWithinDays(date: Date | string, days: number): boolean {
	const checkDate = typeof date === "string" ? new Date(date) : date;
	const cutoff = getDateDaysAgo(days);
	return checkDate >= cutoff;
}

/**
 * @deprecated Not used in codebase - consider removing
 */
export function getStartOfToday(): Date {
	const date = new Date();
	date.setUTCHours(0, 0, 0, 0);
	return date;
}

/**
 * @deprecated Not used in codebase - consider removing
 */
export function getEndOfToday(): Date {
	const date = new Date();
	date.setUTCHours(23, 59, 59, 999);
	return date;
}
