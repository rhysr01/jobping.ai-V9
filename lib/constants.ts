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
		SQL: 1000, // 1 second - Deep Database Query
		GEO: 1500, // 1.5 seconds - Location Perimeter Expansion
		AI: 2500, // 2.5 seconds - Real-time Source Scraping
		SCORE: 1000, // 1 second - Semantic Alignment
	} as const,
	MATCHING_MIN_DELAY_MS: 1500, // Minimum 1.5 seconds to show animation (builds trust)
	MATCHING_CELEBRATION_MS: 2000, // 2 seconds - celebration phase before matching starts

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
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
	// Success codes
	OK: 200,
	CREATED: 201,
	NO_CONTENT: 204,

	// Client error codes
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	TOO_MANY_REQUESTS: 429,

	// Server error codes
	INTERNAL_ERROR: 500,
	BAD_GATEWAY: 502,
	SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

/**
 * Error Codes
 */
export const ERROR_CODES = {
	// Authentication errors
	UNAUTHORIZED: "UNAUTHORIZED",
	FORBIDDEN: "FORBIDDEN",
	INVALID_TOKEN: "INVALID_TOKEN",

	// Validation errors
	VALIDATION_ERROR: "VALIDATION_ERROR",
	MISSING_FIELDS: "MISSING_FIELDS",
	INVALID_FORMAT: "INVALID_FORMAT",

	// Resource errors
	NOT_FOUND: "NOT_FOUND",
	ALREADY_EXISTS: "ALREADY_EXISTS",

	// System errors
	INTERNAL_ERROR: "INTERNAL_ERROR",
	SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
	DATABASE_ERROR: "DATABASE_ERROR",

	// Rate limiting
	RATE_LIMITED: "RATE_LIMITED",

	// Matching-specific errors
	MATCHING_FAILED: "MATCHING_FAILED",
	AI_TIMEOUT: "AI_TIMEOUT",
	NO_JOBS_AVAILABLE: "NO_JOBS_AVAILABLE",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
