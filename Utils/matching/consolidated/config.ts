/**
 * Configuration constants for consolidated matching system
 */

// AI matching available for all users - same quality for everyone
export const JOBS_TO_ANALYZE_FREE = 100; // Free users get same AI quality as premium
export const JOBS_TO_ANALYZE_PREMIUM = 100; // Premium: 100 jobs (deeper, more exhaustive)
export const CACHE_TTL_HOURS = 48;
export const AI_TIMEOUT_MS = 20000;
export const MAX_CACHE_SIZE = 1000;
export const CIRCUIT_BREAKER_THRESHOLD = 5;
export const CIRCUIT_BREAKER_TIMEOUT = 60000;
export const AI_MAX_RETRIES = 2;
