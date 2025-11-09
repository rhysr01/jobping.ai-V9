import { z } from "zod";

// Comprehensive environment variable validation schema
const schema = z.object({
  // Core Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_URL: z.string().url().optional(),
  NEXT_PUBLIC_DOMAIN: z.string().optional(),
  VERCEL_URL: z.string().optional(),
  
  // Database (Supabase)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_ANON_KEY: z.string().min(20).optional(),
  
  // AI Services (OpenAI)
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  AI_TIMEOUT_MS: z.coerce.number().min(1000).max(60000).default(20000),
  AI_MAX_RETRIES: z.coerce.number().min(1).max(10).default(3),
  
  // Email (Resend)
  RESEND_API_KEY: z.string().startsWith('re_'),
  EMAIL_DOMAIN: z.string().default('getjobping.com'),
  
  // Payments (Stripe)
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),
  
  // Caching (Redis)
  REDIS_URL: z.string().url().optional(),
  CACHE_TTL_MS: z.coerce.number().min(60000).default(1800000),
  
  // Monitoring (Sentry)
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  
  // Security & Authentication
  INTERNAL_API_HMAC_SECRET: z.string().min(32),
  ADMIN_API_KEY: z.string().min(20).optional(),
  ADMIN_BASIC_USER: z.string().optional(),
  ADMIN_BASIC_PASS: z.string().optional(),
  SYSTEM_API_KEY: z.string().min(10),
  UNSUBSCRIBE_SECRET: z.string().min(20).optional(),
  
  // Job Matching Configuration
  FREE_JOBS_PER_USER: z.coerce.number().min(1).max(50).default(5),
  PREMIUM_JOBS_PER_USER: z.coerce.number().min(1).max(100).default(10),
  AI_MAX_CALLS_PER_USER: z.coerce.number().min(1).max(1000).default(100),
  MATCH_USERS_DISABLE_AI: z.enum(['true', 'false']).default('false'),
  USE_NEW_MATCHING: z.enum(['true', 'false']).default('true'),
  USE_ENHANCED_CACHE: z.enum(['true', 'false']).default('true'),
  
  // Scraping Configuration
  REED_API_KEY: z.string().optional(),
  ADZUNA_APP_ID: z.string().optional(),
  ADZUNA_APP_KEY: z.string().optional(),
  SCRAPING_BATCH_SIZE: z.coerce.number().min(1).max(50).default(3),
  MAX_PROCESSING_TIME: z.coerce.number().min(5000).max(30000).default(25000),
  REED_PAGE_DELAY_MS: z.coerce.number().min(0).max(20000).default(400),
  REED_PAGE_DELAY_JITTER_MS: z.coerce.number().min(0).max(20000).default(200),
  REED_BACKOFF_DELAY_MS: z.coerce.number().min(0).max(120000).default(6000),
  REED_RESULTS_PER_PAGE: z.coerce.number().min(1).max(100).default(50),
  REED_MAX_QUERIES_PER_LOCATION: z.coerce.number().min(1).max(50).default(6),
  ADZUNA_RESULTS_PER_PAGE: z.coerce.number().min(1).max(50).default(25),
  ADZUNA_MAX_DAYS_OLD: z.coerce.number().min(1).max(60).default(28),
  ADZUNA_PAGE_DELAY_MS: z.coerce.number().min(0).max(20000).default(800),
  ADZUNA_PAGE_DELAY_JITTER_MS: z.coerce.number().min(0).max(20000).default(200),
  ADZUNA_TIMEOUT_MS: z.coerce.number().min(1000).max(60000).default(15000),
  ADZUNA_MAX_PAGES: z.coerce.number().min(1).max(10).default(3),
  ADZUNA_MAX_QUERIES_PER_CITY: z.coerce.number().min(1).max(100).default(15),
  SCRAPER_CYCLE_JOB_TARGET: z.coerce.number().min(10).max(2000).default(300),
  ENABLE_SCRAPER_TELEMETRY: z.enum(['true', 'false']).default('false'),
  
  // Cleanup Configuration
  CLEANUP_MAX_AGE_DAYS: z.coerce.number().min(1).max(365).default(90),
  CLEANUP_BATCH_SIZE: z.coerce.number().min(1).max(1000).default(500),
  CLEANUP_MAX_DELETIONS: z.coerce.number().min(1).max(100000).default(10000),
  CLEANUP_SAFETY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.15),
  CLEANUP_BATCH_DELAY_MS: z.coerce.number().min(0).max(5000).default(250),
  CLEANUP_SECRET: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Legacy/Development
  SUPABASE_PROJECT_REF_DEV: z.string().min(4).optional(),
  SUPABASE_PAT_DEV_RW: z.string().min(10).optional(),
  SUPABASE_PROJECT_REF_PROD: z.string().min(4).optional(),
  SUPABASE_PAT_PROD_RO: z.string().min(10).optional(),
});

// Parse and validate environment variables
export const ENV = schema.parse(process.env);

// Type-safe environment variable access
export type Environment = z.infer<typeof schema>;

// Helper function to check if we're in production
export const isProduction = () => ENV.NODE_ENV === 'production';
export const isDevelopment = () => ENV.NODE_ENV === 'development';
export const isTest = () => ENV.NODE_ENV === 'test';

