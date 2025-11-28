/**
 * Application Constants
 * Shared constants used across the application
 * Moved from Utils/constants.ts to lib/ for consistency
 */

// HTTP Status Codes
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Client Errors  
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server Errors
  INTERNAL_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// Error Codes
export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_FIELDS: 'MISSING_FIELDS',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // Rate Limiting
  RATE_LIMITED: 'RATE_LIMITED',
  
  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // Job Matching (specific to domain)
  MATCHING_FAILED: 'MATCHING_FAILED',
  AI_TIMEOUT: 'AI_TIMEOUT',
  NO_JOBS_AVAILABLE: 'NO_JOBS_AVAILABLE',
} as const;

// Standard API Messages
export const API_MESSAGES = {
  // Success
  SUCCESS: 'Operation completed successfully',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',

  // Auth
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  INVALID_CREDENTIALS: 'Invalid credentials provided',
  
  // Validation
  VALIDATION_FAILED: 'Request validation failed',
  MISSING_REQUIRED_FIELDS: 'Required fields are missing',
  INVALID_DATA_FORMAT: 'Invalid data format provided',
  
  // Resources
  NOT_FOUND: 'Resource not found',
  ALREADY_EXISTS: 'Resource already exists',
  
  // Rate Limiting
  TOO_MANY_REQUESTS: 'Too many requests. Please try again later.',
  
  // System
  INTERNAL_ERROR: 'An internal server error occurred',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  
  // Job Matching
  MATCHING_SUCCESS: 'Job matching completed successfully',
  MATCHING_FAILED: 'Job matching failed',
  NO_MATCHES_FOUND: 'No suitable job matches found',
} as const;

// Environment helpers
export const ENV = {
  isDevelopment: () => process.env.NODE_ENV === 'development',
  isProduction: () => process.env.NODE_ENV === 'production', 
  isTest: () => process.env.NODE_ENV === 'test' || process.env.JOBPING_TEST_MODE === '1',
} as const;

// Timeouts (for async operations)
export const TIMEOUTS = {
  API_REQUEST: 30000, // 30 seconds
  DATABASE_QUERY: 10000, // 10 seconds  
  AI_MATCHING: 20000, // 20 seconds
  WEBHOOK_PROCESSING: 15000, // 15 seconds
  EMAIL_SEND: 10000, // 10 seconds
} as const;

// Type exports for TypeScript
export type HttpStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
export type ApiMessage = typeof API_MESSAGES[keyof typeof API_MESSAGES];

