/**
 * RUNTIME CONFIGURATION
 * Centralized configuration management for production settings
 */

// ============================================
// MATCHING ENGINE CONFIG
// ============================================

export const MATCHING_CONFIG = {
  // Cache settings
  CACHE_TTL_HOURS: 48,
  MAX_CACHE_SIZE: 1000,
  
  // AI settings
  AI_TIMEOUT_MS: 20000,
  AI_MAX_RETRIES: 2,
  JOBS_TO_ANALYZE: 50,
  
  // Cost limits
  AI_MAX_DAILY_COST: 50,
  AI_MAX_COST_PER_USER: 5,
  
  // Circuit breaker
  CIRCUIT_BREAKER_THRESHOLD: 5,
  CIRCUIT_BREAKER_TIMEOUT: 60000
} as const;

// ============================================
// DATABASE CONFIG
// ============================================

export const DATABASE_CONFIG = {
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  QUERY_TIMEOUT_MS: 10000,
  
  // Connection settings
  MAX_CONNECTIONS: 10,
  CONNECTION_TIMEOUT_MS: 10000
} as const;

// ============================================
// API CONFIG
// ============================================

export const API_CONFIG = {
  // Rate limiting (requests per window)
  RATE_LIMITS: {
    GENERAL: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
    AUTH: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
    MATCHING: { windowMs: 60 * 1000, maxRequests: 5 },
    EMAIL: { windowMs: 60 * 1000, maxRequests: 3 },
    ADMIN: { windowMs: 60 * 1000, maxRequests: 20 }
  },
  
  // Timeouts
  REQUEST_TIMEOUT_MS: 30000,
  HEALTH_CHECK_TIMEOUT_MS: 5000
} as const;

// ============================================
// EMAIL CONFIG
// ============================================

export const EMAIL_CONFIG = {
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  
  // Queue settings
  BATCH_SIZE: 50,
  PROCESSING_INTERVAL_MS: 5000,
  
  // Templates
  FROM_ADDRESS: 'JobPing <noreply@getjobping.com>',
  REPLY_TO: 'hello@getjobping.com'
} as const;

// ============================================
// MONITORING CONFIG
// ============================================

export const MONITORING_CONFIG = {
  // Health check intervals
  HEALTH_CHECK_INTERVAL_MS: 30000,
  
  // Metrics retention
  METRICS_RETENTION_MS: 24 * 60 * 60 * 1000, // 24 hours
  
  // Alert thresholds
  ERROR_RATE_THRESHOLD: 0.05, // 5%
  MEMORY_USAGE_THRESHOLD: 0.85, // 85%
  RESPONSE_TIME_THRESHOLD: 5000 // 5 seconds
} as const;

// ============================================
// ENVIRONMENT HELPERS
// ============================================

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

// ============================================
// VALIDATION HELPERS
// ============================================

export function validateRequiredEnvVars(): { valid: boolean; missing: string[] } {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPEN_API_KEY',
    'RESEND_API_KEY'
  ];
  
  const missing = required.filter(varName => !process.env[varName]);
  
  return {
    valid: missing.length === 0,
    missing
  };
}

// ============================================
// CONFIGURATION GETTERS
// ============================================

export function getMatchingConfig() {
  return MATCHING_CONFIG;
}

export function getDatabaseConfig() {
  return DATABASE_CONFIG;
}

export function getApiConfig() {
  return API_CONFIG;
}

export function getEmailConfig() {
  return EMAIL_CONFIG;
}

export function getMonitoringConfig() {
  return MONITORING_CONFIG;
}
