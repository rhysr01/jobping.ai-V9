/**
 * Global Constants - Centralized Configuration
 *
 * This file houses all magic numbers, timeout durations, and brand colors
 * to eliminate hardcoded values throughout the codebase.
 *
 * Strategy: Replace all hardcoded values with imports from this file.
 */

/**
 * Timing Constants (milliseconds)
 */
export const TIMING = {
	// API & Request Timeouts
	API_TIMEOUT_MS: 30000, // 30 seconds - generous but safe for matching API
	API_QUERY_TIMEOUT_MS: 10000, // 10 seconds - database query timeout
	AI_TIMEOUT_MS: 20000, // 20 seconds - AI matching timeout (from env, but default here)

	// UI Delays & Animations
	REDIRECT_DELAY_MS: 2000, // 2 seconds - delay before redirect after success
	SUCCESS_MESSAGE_DURATION_MS: 2000, // 2 seconds - how long to show success message
	ANIMATION_DURATION_MS: 1000, // 1 second - standard animation duration
	TOAST_DURATION_MS: 3000, // 3 seconds - toast notification duration

	// Form & Interaction Delays
	DEBOUNCE_DELAY_MS: 300, // 300ms - form input debounce
	JOB_COUNT_FETCH_DELAY_MS: 300, // 300ms - delay before fetching job count
	CLICK_RESET_DELAY_MS: 2000, // 2 seconds - reset clicked state after action

	// Matching Progress Stages (for GuaranteedMatchingProgress)
	MATCHING_STAGES: {
		SQL: 2000, // 2 seconds - Deep Database Query
		GEO: 3000, // 3 seconds - Location Perimeter Expansion
		AI: 4000, // 4 seconds - Real-time Source Scraping
		SCORE: 2000, // 2 seconds - Semantic Alignment
	} as const,
	MATCHING_MIN_DELAY_MS: 2000, // Minimum 2 seconds to show animation (builds trust)

	// Map & UI Interactions
	MAP_SELECTION_HIGHLIGHT_MS: 1000, // 1 second - city selection highlight duration
	MAP_TOOLTIP_DELAY_MS: 2000, // 2 seconds - tooltip display duration on touch
	MAP_SHAKE_DURATION_MS: 450, // 450ms - shake animation when max selections reached

	// Ghost Matches
	GHOST_MATCHES_DELAY_MS: 2000, // 2 seconds - delay before fetching ghost matches

	// Session & Expiration
	SESSION_EXPIRED_REDIRECT_MS: 3000, // 3 seconds - delay before redirect on expired session
	FORM_PERSISTENCE_SHOW_MS: 10000, // 10 seconds - show "Resume Signup" prompt

	// Rate Limiting & Delays
	RATE_LIMIT_DELAY_MS: 1000, // 1 second - delay between rate-limited requests
	BATCH_PROCESSING_DELAY_MS: 100, // 100ms - delay between batch operations
	LINK_HEALTH_CHECK_DELAY_MS: 1000, // 1 second - delay between link health checks

	// Cache & TTL
	STATS_CACHE_DURATION_MS: 60 * 60 * 1000, // 1 hour - stats cache duration
	MATCHING_CACHE_TTL_MS: 30 * 60 * 1000, // 30 minutes - matching cache TTL
} as const;

/**
 * Brand Colors (Hex Codes)
 *
 * These are the actual brand colors used throughout the app.
 * Replace hardcoded hex codes and Tailwind classes with these constants.
 */
export const COLORS = {
	BRAND: {
		// Primary brand colors (indigo/purple gradient)
		500: "#6366F1", // indigo-500 - Primary brand color
		600: "#7C3AED", // purple-600 - Secondary brand color
		700: "#8B5CF6", // purple-500 - Tertiary brand color

		// Extended brand palette
		300: "#A78BFA", // purple-300 - Lighter accent
		400: "#C084FC", // purple-400 - Medium accent

		// RGB values for rgba() usage
		RGB: {
			500: "99, 102, 241", // indigo-500 RGB
			600: "124, 58, 237", // purple-600 RGB
			700: "139, 111, 246", // purple-500 RGB
		},
	},

	// Semantic colors
	SUCCESS: {
		400: "#34D399", // emerald-400
		500: "#10B981", // emerald-500
		RGB: {
			400: "52, 211, 153",
			500: "16, 185, 129",
		},
	},

	ERROR: {
		400: "#F87171", // red-400
		500: "#EF4444", // red-500
		RGB: {
			400: "248, 113, 113",
			500: "239, 68, 68",
		},
	},

	WARNING: {
		400: "#FBBF24", // amber-400
		500: "#F59E0B", // amber-500
		RGB: {
			400: "251, 191, 36",
			500: "245, 158, 11",
		},
	},
} as const;

/**
 * UI Constants
 */
export const UI = {
	// Map dimensions
	MAP_VIEWBOX: {
		WIDTH: 1000,
		HEIGHT: 800,
	},

	// Touch target sizes (accessibility)
	MIN_TOUCH_TARGET_SIZE: 44, // 44px minimum for touch targets (WCAG)

	// Animation durations (seconds)
	ANIMATION: {
		FAST: 0.2,
		NORMAL: 0.3,
		SLOW: 0.5,
		VERY_SLOW: 1.0,
	},

	// Z-index layers
	Z_INDEX: {
		BASE: 0,
		DROPDOWN: 100,
		STICKY: 200,
		MODAL: 300,
		TOAST: 400,
		TOOLTIP: 500,
	},
} as const;

/**
 * Business Logic Constants
 */
export const BUSINESS = {
	// Matching limits
	MAX_CITY_SELECTIONS: 3,
	FREE_ROLES_PER_SEND: 5,
	PREMIUM_ROLES_PER_WEEK: 15,

	// Form validation
	MAX_CAREER_KEYWORDS_LENGTH: 200,

	// Job limits
	MAX_JOBS_PER_BATCH: 1000,
	MAX_JOBS_FOR_MATCHING: 2000,
} as const;

/**
 * Type helpers for constants
 */
export type TimingConfig = typeof TIMING;
export type ColorsConfig = typeof COLORS;
export type UIConfig = typeof UI;
export type BusinessConfig = typeof BUSINESS;
