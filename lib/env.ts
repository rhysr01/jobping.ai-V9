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
  OPENAI_API_KEY: z.string().refine(
    (val) => val.startsWith('sk-'),
    {
      message: `OPENAI_API_KEY must start with 'sk-'`
    }
  ),
  AI_TIMEOUT_MS: z.coerce.number().min(1000).max(60000).default(20000),
  AI_MAX_RETRIES: z.coerce.number().min(1).max(10).default(3),
  
  // Email (Resend)
  RESEND_API_KEY: z.string().startsWith('re_'),
  EMAIL_DOMAIN: z.string().default('getjobping.com'),
  
  // Payments (Polar)
  POLAR_ACCESS_TOKEN: z.string().min(20),
  POLAR_WEBHOOK_SECRET: z.string().optional(),
  POLAR_SUCCESS_URL: z.string().url().default('https://getjobping.com/success?checkout_id={CHECKOUT_ID}'),
  
  // Caching (Redis)
  REDIS_URL: z.string().url().optional(),
  CACHE_TTL_MS: z.coerce.number().min(60000).default(1800000),
  
  
  // Security & Authentication
  INTERNAL_API_HMAC_SECRET: z.string().min(32),
  ADMIN_API_KEY: z.string().min(20).optional(),
  ADMIN_BASIC_USER: z.string().optional(),
  ADMIN_BASIC_PASS: z.string().optional(),
  SYSTEM_API_KEY: z.string().min(10),
  UNSUBSCRIBE_SECRET: z.string().min(20).optional(),
  PREFERENCES_SECRET: z.string().min(32).optional(),
  EMAIL_VERIFICATION_SECRET: z.string().min(32).optional(),
  
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
// During build, some env vars might not be available, so we handle that gracefully
// Check if we're in a build context (Next.js build phase or Vercel build)
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                    process.env.NEXT_PHASE === 'phase-development-build' ||
                    process.env.NEXT_PHASE?.includes('build') ||
                    (process.env.VERCEL === '1' && process.env.CI === '1') ||
                    process.argv.includes('build') ||
                    process.argv.some(arg => arg.includes('next') && arg.includes('build'));

let ENV: z.infer<typeof schema>;

if (isBuildTime) {
  // During build, validate but be more lenient with API keys
  // Log what we're checking for debugging
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    console.log(`🔍 Build: OPENAI_API_KEY is set (${openaiKey.length} chars, starts with: ${openaiKey.substring(0, 5)}...)`);
    if (!openaiKey.startsWith('sk-')) {
      console.warn(`⚠️  Build: OPENAI_API_KEY doesn't start with 'sk-', but continuing build...`);
    }
  } else {
    console.warn('⚠️  Build: OPENAI_API_KEY not found, using placeholder for build validation');
  }
  
  // During build, create a build-safe environment with dummy values for API keys if missing
  // These are only needed at runtime, not during build
  const buildEnv = {
    ...process.env,
    // Only use dummy values if the real ones are missing or invalid
    OPENAI_API_KEY: (openaiKey && openaiKey.startsWith('sk-')) 
      ? openaiKey 
      : (openaiKey || 'sk-build-dummy-key-for-validation-only'),
    RESEND_API_KEY: (process.env.RESEND_API_KEY?.startsWith('re_')) 
      ? process.env.RESEND_API_KEY 
      : (process.env.RESEND_API_KEY || 're_build_dummy_key_for_validation_only'),
    POLAR_ACCESS_TOKEN: process.env.POLAR_ACCESS_TOKEN || 'build-dummy-token-for-validation-only',
    INTERNAL_API_HMAC_SECRET: process.env.INTERNAL_API_HMAC_SECRET || 'build-dummy-secret-32-chars-minimum-length-here',
    SYSTEM_API_KEY: process.env.SYSTEM_API_KEY || 'build-dummy-system-key-min-10-chars',
  };
  
  const buildResult = schema.safeParse(buildEnv);
    if (!buildResult.success) {
      // Even during build, critical vars like Supabase must be present
      const criticalPaths = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
      const hasCriticalErrors = buildResult.error.issues.some(err => 
        criticalPaths.includes(err.path.join('.'))
      );
    
    if (hasCriticalErrors) {
      console.error('❌ Critical environment variables missing during build');
      buildResult.error.issues.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw buildResult.error;
    }
    
    // For non-critical errors during build, show warnings but try to continue
      console.warn('⚠️  Some environment variables have validation issues during build:');
      buildResult.error.issues.forEach(err => {
        const path = err.path.join('.');
        const value = (buildEnv as Record<string, any>)[path];
        console.warn(`  - ${path}: ${err.message}`);
        console.warn(`    Value: ${value ? `'${String(value).substring(0, 20)}...'` : 'undefined'}`);
      });
    
    // Try to parse anyway with the build env (might work if format issues are minor)
    try {
      ENV = schema.parse(buildEnv);
    } catch (e) {
      console.error('❌ Build validation failed even with fallbacks');
      throw buildResult.error;
    }
  } else {
    ENV = buildResult.data;
  }
} else {
  // Runtime - strict validation with better error messages
  const parseResult = schema.safeParse(process.env);
  if (!parseResult.success) {
    console.error('❌ Environment variable validation failed:');
    parseResult.error.issues.forEach(err => {
      const path = err.path.join('.');
      const value = process.env[path];
      console.error(`  - ${path}: ${err.message}`);
      console.error(`    Current value: ${value ? `'${value.substring(0, 20)}...' (${value.length} chars)` : 'undefined/empty'}`);
    });
    throw parseResult.error;
  }
  ENV = parseResult.data;
}

export { ENV };

// Type-safe environment variable access
export type Environment = z.infer<typeof schema>;

// Helper function to check if we're in production
export const isProduction = () => ENV.NODE_ENV === 'production';
export const isDevelopment = () => ENV.NODE_ENV === 'development';
export const isTest = () => ENV.NODE_ENV === 'test';

