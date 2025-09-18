/**
 * Comprehensive Zod Validation Schemas for JobPing API
 * Ensures all input data is properly validated and sanitized
 */

import { z } from 'zod';

// Common validation patterns
const emailSchema = z.string().email('Invalid email format').max(255, 'Email too long');
const urlSchema = z.string().url('Invalid URL format').max(2048, 'URL too long');
const uuidSchema = z.string().uuid('Invalid UUID format');
const timestampSchema = z.string().datetime('Invalid timestamp format');

// Career path validation
const careerPathSchema = z.enum([
  'strategy',
  'data-analytics', 
  'retail-luxury',
  'sales',
  'marketing',
  'finance',
  'operations',
  'product',
  'tech',
  'sustainability',
  'entrepreneurship',
  'unsure',
  'unknown'
]);

// Work environment validation
const workEnvironmentSchema = z.enum(['remote', 'hybrid', 'on-site', 'no-preference']);

// Visa status validation
const visaStatusSchema = z.enum(['eu-citizen', 'non-eu-visa-required', 'non-eu-no-visa']);

// Entry level preference validation
const entryLevelSchema = z.enum(['entry', 'mid', 'senior', 'any']);

// User Registration Schema (Tally Webhook)
export const TallyWebhookSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  eventType: z.literal('FORM_RESPONSE'),
  createdAt: timestampSchema,
  formId: z.string().min(1, 'Form ID is required'),
  responseId: z.string().min(1, 'Response ID is required'),
  data: z.object({
    fields: z.array(z.object({
      key: z.string().min(1, 'Field key is required'),
      label: z.string().min(1, 'Field label is required'),
      type: z.string().min(1, 'Field type is required'),
      value: z.union([z.string(), z.array(z.string()), z.null()]).optional()
    })).min(1, 'At least one field is required')
  }).optional()
});

// User Preferences Schema
export const UserPreferencesSchema = z.object({
  email: emailSchema,
  full_name: z.string().min(1, 'Full name is required').max(255, 'Name too long'),
  professional_expertise: z.string().min(1, 'Professional expertise is required').max(500, 'Description too long'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  work_environment: workEnvironmentSchema,
  visa_status: visaStatusSchema,
  entry_level_preference: entryLevelSchema,
  career_path: z.array(careerPathSchema).min(1, 'At least one career path is required').max(3, 'Too many career paths'),
  target_cities: z.array(z.string().min(1, 'City name is required').max(100, 'City name too long')).min(1, 'At least one target city is required').max(10, 'Too many target cities'),
  languages_spoken: z.array(z.string().min(1, 'Language is required').max(50, 'Language name too long')).min(1, 'At least one language is required').max(10, 'Too many languages'),
  company_types: z.array(z.string().min(1, 'Company type is required').max(100, 'Company type too long')).min(1, 'At least one company type is required').max(10, 'Too many company types'),
  roles_selected: z.array(z.string().min(1, 'Role is required').max(100, 'Role name too long')).min(1, 'At least one role is required').max(10, 'Too many roles')
});

// Job Matching Request Schema
export const JobMatchingRequestSchema = z.object({
  user: UserPreferencesSchema,
  testMode: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  forceReprocess: z.boolean().optional()
});

// Email Verification Schema
export const EmailVerificationSchema = z.object({
  email: emailSchema,
  token: z.string().min(1, 'Verification token is required').max(255, 'Token too long')
});

// Email Test Schema
export const EmailTestSchema = z.object({
  to: emailSchema,
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject too long'),
  body: z.string().min(1, 'Body is required').max(10000, 'Body too long')
});

// Stripe Checkout Session Schema
export const StripeCheckoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  successUrl: urlSchema,
  cancelUrl: urlSchema,
  customerEmail: emailSchema.optional()
});

// Webhook Stripe Schema
export const StripeWebhookSchema = z.object({
  id: z.string().min(1, 'Event ID is required'),
  type: z.string().min(1, 'Event type is required'),
  data: z.object({
    object: z.record(z.string(), z.any()) // Stripe event data is complex, validate at field level
  }),
  created: z.number().int().positive('Invalid timestamp')
});

// Job Scraping Request Schema
export const JobScrapingRequestSchema = z.object({
  source: z.enum(['greenhouse', 'lever', 'workday', 'jooble', 'rapidapi-internships', 'serp-api']),
  location: z.string().min(1, 'Location is required').max(100, 'Location too long').optional(),
  keywords: z.array(z.string().max(100, 'Keyword too long')).max(10, 'Too many keywords').optional(),
  maxPages: z.number().int().min(1).max(50).optional(),
  testMode: z.boolean().optional()
});

// User Feedback Schema
export const UserFeedbackSchema = z.object({
  email: emailSchema,
  feedback_type: z.enum(['positive', 'negative', 'neutral']),
  job_hash: z.string().min(1, 'Job hash is required').max(255, 'Job hash too long'),
  comment: z.string().max(1000, 'Comment too long').optional(),
  rating: z.number().int().min(1).max(5).optional()
});

// Implicit Tracking Schema
export const ImplicitTrackingSchema = z.object({
  email: emailSchema,
  signals: z.array(z.object({
    signal_type: z.enum(['click', 'view', 'apply', 'save', 'share']),
    job_hash: z.string().min(1, 'Job hash is required').max(255, 'Job hash too long'),
    timestamp: timestampSchema,
    metadata: z.record(z.string(), z.any()).optional()
  })).min(1, 'At least one signal is required').max(100, 'Too many signals')
});

// Admin Operations Schema
export const AdminOperationSchema = z.object({
  operation: z.enum(['cleanup-jobs', 'reset-rate-limits', 'backup-database', 'health-check']),
  parameters: z.record(z.string(), z.any()).optional(),
  adminToken: z.string().min(1, 'Admin token is required')
});

// Pagination Schema
export const PaginationSchema = z.object({
  page: z.number().int().min(1).max(1000).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  sortBy: z.string().max(50, 'Sort field too long').optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

// Search Filters Schema
export const SearchFiltersSchema = z.object({
  career_path: z.array(careerPathSchema).optional(),
  location: z.array(z.string().max(100)).optional(),
  work_environment: z.array(workEnvironmentSchema).optional(),
  company_types: z.array(z.string().max(100)).optional(),
  experience_level: z.array(entryLevelSchema).optional(),
  date_range: z.object({
    start: timestampSchema,
    end: timestampSchema
  }).optional()
});

// API Response Schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  timestamp: timestampSchema.optional()
});

// Error Response Schema
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string().min(1, 'Error message is required'),
  message: z.string().optional(),
  code: z.string().optional(),
  timestamp: timestampSchema.optional()
});

// Success Response Schema
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string().optional(),
  timestamp: timestampSchema.optional()
});

// Rate Limit Response Schema
export const RateLimitResponseSchema = z.object({
  success: z.literal(false),
  error: z.literal('Rate limit exceeded'),
  message: z.string(),
  retryAfter: z.number().int().positive().optional(),
  timestamp: timestampSchema.optional()
});

// Validation helper functions
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Validation failed: ${errorMessages.join(', ')}`);
    }
    throw error;
  }
}

export function validateInputSafe<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors: errorMessages };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

// Sanitization helpers
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, ''); // Basic XSS prevention
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Only allow https URLs in production
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
      throw new Error('Only HTTPS URLs are allowed in production');
    }
    return parsed.toString();
  } catch {
    throw new Error('Invalid URL format');
  }
}

// Export all schemas for easy importing
export const ValidationSchemas = {
  TallyWebhook: TallyWebhookSchema,
  UserPreferences: UserPreferencesSchema,
  JobMatchingRequest: JobMatchingRequestSchema,
  EmailVerification: EmailVerificationSchema,
  EmailTest: EmailTestSchema,
  StripeCheckout: StripeCheckoutSchema,
  StripeWebhook: StripeWebhookSchema,
  JobScrapingRequest: JobScrapingRequestSchema,
  UserFeedback: UserFeedbackSchema,
  ImplicitTracking: ImplicitTrackingSchema,
  AdminOperation: AdminOperationSchema,
  Pagination: PaginationSchema,
  SearchFilters: SearchFiltersSchema,
  ApiResponse: ApiResponseSchema,
  ErrorResponse: ErrorResponseSchema,
  SuccessResponse: SuccessResponseSchema,
  RateLimitResponse: RateLimitResponseSchema
} as const;
