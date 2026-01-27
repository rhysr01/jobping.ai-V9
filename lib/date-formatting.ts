/**
 * Date Formatting Utilities
 * Provides consistent, human-friendly date formatting across the app
 */

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

/**
 * Format date as "time ago" format (e.g., "2h ago", "3 days ago")
 * Falls back to short date if over 30 days ago
 */
export function formatTimeAgo(dateString: string | null | undefined): string {
	if (!dateString) return "Recently posted";

	try {
		const date = dayjs(dateString);
		const now = dayjs();
		const diffDays = now.diff(date, "day");

		if (diffDays === 0) {
			return "Today";
		} else if (diffDays === 1) {
			return "Yesterday";
		} else if (diffDays < 7) {
			return `${diffDays}d ago`;
		} else if (diffDays < 30) {
			const weeks = Math.floor(diffDays / 7);
			return `${weeks}w ago`;
		} else {
			return `${diffDays}d ago`;
		}
	} catch {
		return "Recently posted";
	}
}

/**
 * Format date as readable string (e.g., "Jan 27, 2026")
 */
export function formatDate(dateString: string | null | undefined): string {
	if (!dateString) return "Unknown date";

	try {
		return dayjs(dateString).format("MMM D, YYYY");
	} catch {
		return "Unknown date";
	}
}

/**
 * Calculate if job is "fresh" (posted within X days)
 * Returns true if posted within 3 days
 */
export function isFreshJob(
	dateString: string | null | undefined,
	daysThreshold = 3
): boolean {
	if (!dateString) return false;

	try {
		const date = dayjs(dateString);
		const now = dayjs();
		const diffDays = now.diff(date, "day");
		return diffDays <= daysThreshold;
	} catch {
		return false;
	}
}

