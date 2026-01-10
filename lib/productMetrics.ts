/**
 * Product Metrics Configuration
 *
 * Defines the core product limits and metrics used across the application
 */

// Free tier limits
export const FREE_ROLES_PER_SEND = 5;
export const SIGNUP_INITIAL_ROLES = 10;

// Premium tier limits
export const PREMIUM_SENDS_PER_WEEK = 1;
export const PREMIUM_SEND_DAYS_LABEL = "weekly";
export const PREMIUM_ROLES_PER_WEEK = 50;
export const PREMIUM_ROLES_PER_MONTH = 200;

// Cache and performance metrics
export const AI_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const MATCHING_TIMEOUT_MS = 20 * 1000; // 20 seconds

// Rate limiting
export const FREE_REQUESTS_PER_HOUR = 10;
export const PREMIUM_REQUESTS_PER_HOUR = 100;

// Email delivery metrics
export const EMAIL_DELIVERY_TIMEOUT_MS = 30 * 1000; // 30 seconds
export const EMAIL_RETRY_ATTEMPTS = 3;
