// app/api/match-users/route.ts
import { NextRequest, NextResponse } from 'next/server';
const HMAC_SECRET = process.env.INTERNAL_API_HMAC_SECRET;
import { verifyHMAC, isHMACRequired } from '@/Utils/auth/hmac';
import { SupabaseClient } from '@supabase/supabase-js';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { getDatabaseClient } from '@/Utils/databasePool';
import * as Sentry from '@sentry/nextjs';
import {
  logMatchSession
} from '@/Utils/matching/logging.service';
import type { UserPreferences, JobMatch } from '@/Utils/matching/types';
import { apiLogger } from '@/lib/api-logger';
import { createConsolidatedMatcher } from '@/Utils/consolidatedMatching';
import { 
  SEND_PLAN,
  MATCH_RULES
} from '@/Utils/sendConfiguration';
import { Job as ScrapersJob } from '@/scrapers/types';
import { getCategoryPriorityScore, jobMatchesUserCategories, WORK_TYPE_CATEGORIES, mapFormLabelToDatabase, getStudentSatisfactionScore, getDatabaseCategoriesForForm } from '@/Utils/matching/categoryMapper';
import { semanticRetrievalService } from '@/Utils/matching/semanticRetrieval';
import { preFilterJobsByUserPreferencesEnhanced } from '@/Utils/matching/preFilterJobs';
import { integratedMatchingService } from '@/Utils/matching/integrated-matching.service';
import { batchMatchingProcessor } from '@/Utils/matching/batch-processor.service';
import { distributeJobsWithDiversity, getDistributionStats } from '@/Utils/matching/jobDistribution';
import { z } from 'zod';

// Zod validation schemas
const matchUsersRequestSchema = z.object({
  userLimit: z.coerce.number().min(1).max(100).default(50),
  jobLimit: z.coerce.number().min(100).max(50000).default(10000),
  forceRun: z.coerce.boolean().default(false),
  dryRun: z.coerce.boolean().default(false),
  // HMAC authentication - only required if HMAC_SECRET is set
  signature: isHMACRequired() ? z.string().min(1, 'Authentication signature required') : z.string().optional(),
  timestamp: isHMACRequired() ? z.coerce.number().min(1, 'Timestamp required') : z.coerce.number().optional()
});

const userPreferencesSchema = z.object({
  target_cities: z.array(z.string()).optional(),
  roles_selected: z.array(z.string()).optional(),
  subscription_tier: z.enum(['free', 'premium']).default('free'),
  email_verified: z.boolean().default(false)
});

// Import centralized type definitions
import type { MatchMetrics, MatchProvenance } from '@/lib/types';
import { getDateDaysAgo } from '@/lib/date-helpers';
import { Database } from '@/lib/database.types';

type User = Database['public']['Tables']['users']['Row'];

const HEALTH_SLO_MS = 100; // SLO: health checks should respond in <100ms
const MATCH_SLO_MS = 2000; // SLO: match-users endpoint should respond in <2s

// Environment flags and limits
const IS_TEST = process.env.NODE_ENV === 'test';
const IS_DEBUG = process.env.DEBUG_MATCHING === 'true' || IS_TEST;
// Use config values instead of hardcoded limits
const USER_LIMIT = IS_TEST ? 3 : 50; // Keep test limit for safety
const JOB_LIMIT = IS_TEST ? 300 : 10000; // Keep test limit for safety

// Lock key helper
const LOCK_KEY = (rid: string) => `${IS_TEST ? 'jobping:test' : 'jobping:prod'}:lock:match-users:${rid}`;

// Redis locking helper with guaranteed release
async function withRedisLock<T>(
  key: string, 
  ttlSeconds: number, 
  fn: () => Promise<T>
): Promise<T | null> {
  const limiter = getProductionRateLimiter();
  await limiter.initializeRedis();
  const redis = (limiter as any).redisClient;
  
  if (!redis) {
    apiLogger.warn('Redis not available, proceeding without lock');
    return await fn();
  }

  const token = crypto.randomUUID();
  const lockKey = key;
  
  try {
    // Try to acquire lock
    const acquired = await redis.set(lockKey, token, { NX: true, EX: ttlSeconds });
    if (!acquired) {
      apiLogger.debug(`Lock ${lockKey} already held, skipping operation`, { lockKey });
      return null;
    }

    apiLogger.debug(`Acquired lock ${lockKey} for ${ttlSeconds}s`, { lockKey, ttlSeconds });
    return await fn();
  } finally {
    // Always try to release lock
    try {
      const currentToken = await redis.get(lockKey);
      if (currentToken === token) {
        await redis.del(lockKey);
        apiLogger.debug(`Released lock ${lockKey}`, { lockKey });
      }
    } catch (error) {
      apiLogger.warn(`Failed to release lock ${lockKey}`, { lockKey, error: error instanceof Error ? error.message : String(error) });
      // TTL will release it naturally
    }
  }
}

// Enhanced monitoring and performance tracking
interface PerformanceMetrics {
  jobFetchTime: number;
  tierDistributionTime: number;
  aiMatchingTime: number;
  totalProcessingTime: number;
  memoryUsage: number;
  errors: number;
  totalRequests: number;
}

// Rate limiting and job caps managed by production middleware and SEND_PLAN

// Use SEND_PLAN config instead of separate JOB_DISTRIBUTION
// This consolidates all job distribution logic in one place

// Production-ready job interface with validation
interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  job_url: string;
  description: string;
  created_at: string;
  job_hash: string;
  is_sent: boolean;
  status: string;
  original_posted_date: string | null;
  last_seen_at: string | null;
}


// User interface extensions (simplified)







// Database schema validation
async function validateDatabaseSchema(supabase: SupabaseClient): Promise<{ valid: boolean; missingColumns?: string[] }> {
  try {
    // Skip schema validation in test environment
    if (process.env.NODE_ENV === 'test') {
      apiLogger.debug('Test mode: Skipping database schema validation');
      return { valid: true };
    }
    
    // Check if required columns exist by attempting a sample query with timeout
    const requiredColumns = ['status', 'original_posted_date', 'last_seen_at'];
    const queryPromise = supabase
      .from('jobs')
      .select(requiredColumns.join(', '))
      .limit(1);
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    );
    
    const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    if (error) {
      apiLogger.error('Database schema validation failed', error as Error, { requiredColumns });
      // Try to identify missing columns from error message
      const missingColumns = requiredColumns.filter(col => 
        error.message?.toLowerCase().includes(col.toLowerCase())
      );
      return { valid: false, missingColumns };
    }
    
    apiLogger.debug('Database schema validation passed');
    return { valid: true };
  } catch (err) {
    apiLogger.error('Database schema validation error', err as Error);
    return { valid: false, missingColumns: ['status', 'original_posted_date', 'last_seen_at'] };
  }
}

// Rate limiting handled by production rate limiter middleware

// Job reservations managed by Redis global lock

// Date helper moved to centralized lib/date-helpers.ts

// Student satisfaction job distribution - prioritizes what students told us they want
function distributeJobs(
  jobs: ScrapersJob[],
  userTier: 'free' | 'premium' = 'free',
  userId: string,
  userCareerPath?: string,
  userFormValues?: string[],
  userWorkEnvironment?: string,
  userEntryLevel?: string,
  userCompanyTypes?: string[]
): { jobs: ScrapersJob[], metrics: MatchMetrics } {
  const startTime = Date.now();
  
  // Log job distribution to Sentry breadcrumb
  Sentry.addBreadcrumb({
    message: 'Job distribution started',
    level: 'debug',
    data: { userTier, userId, totalJobs: jobs.length }
  });
  
  // Validate and clean job data
  const validJobs = jobs.filter(job => job.job_hash && job.title && job.company);
  
  // Get distribution limits based on user tier
  const config = SEND_PLAN[userTier];
  const targetCount = config.perSend;
  
  // Select jobs for maximum student satisfaction
  // Simple approach: give students what they told us they want
  const selectedJobs = validJobs
    .sort((a, b) => {
      // Primary sort: User preference satisfaction (most important for happiness)
      const satisfactionScoreA = getStudentSatisfactionScore(
        a.categories || [],
        userFormValues || []
      );
      const satisfactionScoreB = getStudentSatisfactionScore(
        b.categories || [],
        userFormValues || []
      );
      if (satisfactionScoreA !== satisfactionScoreB) {
        return satisfactionScoreB - satisfactionScoreA;
      }

      // Secondary sort: User career path alignment (if they specified one)
      const userDatabaseCategory = userCareerPath ? mapFormLabelToDatabase(userCareerPath) : null;
      const userPrefersAllCategories = !userCareerPath || userCareerPath === 'Not Sure Yet / General';

      let categoryMatchA = 0;
      let categoryMatchB = 0;

      if (userDatabaseCategory && userDatabaseCategory !== 'all-categories') {
        categoryMatchA = a.categories?.includes(userDatabaseCategory) ? 1 : 0;
        categoryMatchB = b.categories?.includes(userDatabaseCategory) ? 1 : 0;
      } else if (userPrefersAllCategories) {
        categoryMatchA = a.categories?.filter(cat => WORK_TYPE_CATEGORIES.includes(cat)).length || 0;
        categoryMatchB = b.categories?.filter(cat => WORK_TYPE_CATEGORIES.includes(cat)).length || 0;
      }

      if (categoryMatchA !== categoryMatchB) {
        return categoryMatchB - categoryMatchA;
      }

      // Tertiary sort: Student-critical data completeness (what they care about)
      const studentCriticalA =
        (a.city ? 1 : 0) +                    // Location data (they need to know where)
        (a.work_environment ? 1 : 0) +        // Work environment preference
        (a.experience_required ? 1 : 0) +     // Experience level clarity
        0; // Early career relevance (removed - properties don't exist)

      const studentCriticalB =
        (b.city ? 1 : 0) +
        (b.work_environment ? 1 : 0) +
        (b.experience_required ? 1 : 0) +
        0; // Early career relevance (removed - properties don't exist)

      if (studentCriticalA !== studentCriticalB) {
        return studentCriticalB - studentCriticalA;
      }

      // Quaternary sort: Job quality indicators (better info = happier students)
      const qualityA = (a.title?.length || 0) + (a.company?.length || 0) + (a.description?.length || 0);
      const qualityB = (b.title?.length || 0) + (b.company?.length || 0) + (b.description?.length || 0);
      if (qualityA !== qualityB) {
        return qualityB - qualityA;
      }

      // Quinary sort: recency (newer jobs feel more relevant)
      const dateA = new Date(a.original_posted_date || a.created_at);
      const dateB = new Date(b.original_posted_date || b.created_at);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, targetCount);
  
  const processingTime = Date.now() - startTime;
  
  // Log job selection completion to Sentry breadcrumb
  Sentry.addBreadcrumb({
    message: 'Job selection completed',
    level: 'debug',
    data: { userId, userTier, selectedCount: selectedJobs.length, processingTime }
  });
  
  return {
    jobs: selectedJobs,
    metrics: {
      totalJobs: jobs.length,
      distributedJobs: selectedJobs.length,
      processingTime,
      originalJobCount: jobs.length,
      validJobCount: validJobs.length,
      selectedJobCount: selectedJobs.length,
      tierDistribution: { [userTier]: selectedJobs.length }
    }
  };
}



// Performance monitoring utility
function trackPerformance(): { startTime: number; startMemory: number; getMetrics: () => PerformanceMetrics } {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  
  return {
    startTime,
    startMemory,
    getMetrics: () => ({
      jobFetchTime: 0, // Set by caller
      tierDistributionTime: 0, // Set by caller
      aiMatchingTime: 0, // Set by caller
      totalProcessingTime: Date.now() - startTime,
      memoryUsage: process.memoryUsage().heapUsed - startMemory,
      errors: 0, // Set by caller
      totalRequests: 1 // Default to 1 request
    })
  };
}

/**
 * Smart location matching that handles variations like:
 * - "11ème Arrondissement, Paris" matches "Paris"
 * - "Putney Heath, South West London" matches "London"
 * - "Paris, Île-de-France, France" matches "Paris"
 */
function matchesLocation(jobLocation: string, targetCity: string): boolean {
  const jobLoc = jobLocation.toLowerCase();
  const target = targetCity.toLowerCase();
  
  // Direct substring match (most common)
  if (jobLoc.includes(target)) return true;
  
  // Handle common variations for major European cities
  const locationVariations: Record<string, string[]> = {
    'london': ['london', 'greater london', 'central london', 'north london', 'south london', 'east london', 'west london', 'city of london'],
    'paris': ['paris', 'arrondissement', 'ile-de-france', 'île-de-france'],
   'dublin': ['dublin', 'county dublin', 'baile Átha Cliath'],
    'amsterdam': ['amsterdam', 'noord-holland', 'north holland'],
    'berlin': ['berlin', 'brandenburg'],
    'madrid': ['madrid', 'comunidad de madrid'],
    'barcelona': ['barcelona', 'catalunya', 'catalonia'],
    'milan': ['milan', 'milano', 'lombardy', 'lombardia'],
    'rome': ['rome', 'roma', 'lazio'],
    'brussels': ['brussels', 'bruxelles', 'brussel', 'brussels-capital'],
    'lisbon': ['lisbon', 'lisboa'],
   'copenhagen': ['copenhagen', 'københavn', 'capital region'],
    'stockholm': ['stockholm', 'stockholms län'],
    'oslo': ['oslo'],
    'helsinki': ['helsinki', 'uusimaa'],
    'vienna': ['vienna', 'wien'],
    'zurich': ['zurich', 'zürich'],
    'munich': ['munich', 'münchen', 'bavaria'],
    'frankfurt': ['frankfurt', 'hesse', 'hessen']
  };
  
  const variations = locationVariations[target] || [target];
  return variations.some(variant => jobLoc.includes(variant));
}

// Enhanced pre-filter jobs function moved to Utils/matching/preFilterJobs.ts
// Imported above for backward compatibility

// Initialize clients

// OpenAI client creation moved to ConsolidatedMatchingEngine

// Database query helper with timeout
async function queryWithTimeout<T>(
  queryPromise: Promise<any>,
  timeoutMs: number = 10000
): Promise<{ data: T | null; error: { code: string; message: string; details?: unknown } | null }> {
  const timeoutPromise = new Promise<{ data: null; error: unknown }>((_, reject) => 
    setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs)
  );

  try {
    const result = await Promise.race([queryPromise, timeoutPromise]);
    if (result.error) {
      return { 
        data: null, 
        error: { 
          code: 'QUERY_ERROR', 
          message: 'Database query failed', 
          details: result.error 
        } 
      };
    }
    return { data: result.data, error: null };
  } catch (error) {
    return { 
      data: null, 
      error: { 
        code: 'QUERY_TIMEOUT', 
        message: `Query timeout after ${timeoutMs}ms`,
        details: error 
      } 
    };
  }
}

const matchUsersHandler = async (req: NextRequest) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  // Start Sentry transaction for performance monitoring
  const transaction = (Sentry as any).startTransaction?.({
    name: 'match-users-api',
    op: 'api.request',
    tags: {
      endpoint: 'match-users',
      requestId
    }
  });
  
  // Sentry context for API monitoring
  Sentry.setContext('api', {
    endpoint: '/api/match-users',
    method: 'POST',
    startTime: new Date().toISOString(),
    requestId
  });

  try {
    // Optional HMAC verification (no-op if secret not set)
    if (HMAC_SECRET) {
      const raw = await req.text();
      const sig = req.headers.get('x-jobping-signature');
      const timestampHeader = req.headers.get('x-jobping-timestamp');
      const timestamp = timestampHeader ? parseInt(timestampHeader) : Date.now();
      
      const hmacResult = verifyHMAC(raw, sig || '', timestamp);
      if (!hmacResult.isValid) {
        return NextResponse.json({ 
          error: 'Invalid signature',
          code: 'INVALID_SIGNATURE',
          details: hmacResult.error
        }, { status: 401 });
      }
      // Reconstruct request since body was consumed
      req = new Request(req.url, { method: 'POST', headers: req.headers, body: raw }) as any;
    }

    // Parse and validate request body
    const body = await req.json();
    const parseResult = matchUsersRequestSchema.safeParse(body);
    
    if (!parseResult.success) {
      Sentry.addBreadcrumb({
        message: 'Invalid request parameters',
        level: 'warning',
        data: { errors: parseResult.error.issues }
      });
      
      return NextResponse.json({ 
        error: 'Invalid request parameters',
        details: parseResult.error.issues 
      }, { status: 400 });
    }

    const { userLimit, jobLimit, forceRun, dryRun, signature, timestamp } = parseResult.data;

    // Verify HMAC authentication (mandatory in prod, optional in dev/test)
    const hmacResult = verifyHMAC(`${userLimit}:${jobLimit}:${timestamp}`, signature || '', timestamp || 0);
    if (!hmacResult.isValid) {
      return NextResponse.json({ 
        error: 'Authentication failed', 
        details: hmacResult.error 
      }, { status: 401 });
    }
    const performanceTracker = trackPerformance();
  const reservationId = `batch_${Date.now()}`;
  const requestStartTime = Date.now();
  
  // Variables for function scope (some will be assigned in try block)
  
  // Stopwatch helper - uses structured logger
  const t0 = Date.now(); 
  const lap = (s: string) => apiLogger.perf(s, Date.now() - t0);
  
  // Extract IP address
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';

  // PRODUCTION: Enhanced rate limiting with Redis fallback
  if (!IS_TEST) {
    const rateLimitResult = await getProductionRateLimiter().middleware(req, 'match-users');
    
    if (rateLimitResult) {
      // Rate limit exceeded, return the 429 response
      return rateLimitResult;
    }
  }

  // Use Redis lock to prevent concurrent processing
  const lockKey = LOCK_KEY('global');
  const result = await withRedisLock(lockKey, 30, async () => {
    if (IS_DEBUG) apiLogger.debug(`Processing match-users request from IP: ${ip}`, { ip });
    
    // Use validated Zod schema values from the first parsing
    const userCap = IS_TEST ? Math.min(userLimit, USER_LIMIT) : userLimit;
    const jobCap = jobLimit;
    
    const supabase = getDatabaseClient();
    
    // Validate database schema before proceeding
    const schemaValidation = await validateDatabaseSchema(supabase);
    if (!schemaValidation.valid) {
      return NextResponse.json({ 
        error: 'Database schema validation failed',
        message: 'Required columns missing from jobs table',
        missingColumns: schemaValidation.missingColumns
      }, { status: 500 });
    }

    // 1. Fetch and transform active users using service
    const _userFetchStart = Date.now();
    lap('fetch_users');
    
    let users: User[];
    try {
      // Get active users directly from database
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .limit(userCap);
      
      if (usersError) {
        throw usersError;
      }
      users = usersData || [];
    } catch (error: any) {
      apiLogger.error('Failed to fetch users', error as Error, { userCap });
      return NextResponse.json({ 
        error: 'Failed to fetch users',
        code: 'USER_FETCH_ERROR',
        details: error 
      }, { status: 500 });
    }

    if (!users || users.length === 0) {
      if (IS_DEBUG) apiLogger.debug('No users found');
      return NextResponse.json({ message: 'No users found' });
    }

    // Log user count to Sentry breadcrumb (no console spam)
    Sentry.addBreadcrumb({
      message: 'Active users found',
      level: 'info',
      data: { userCount: users.length }
    });

    // Transform user data to match expected format
    // CRITICAL: Include ALL user preferences from signup form (target_cities, roles_selected, etc.)
    const transformedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      preferences: {
        email: user.email,
        // CRITICAL FIELDS FROM SIGNUP FORM - these were missing!
        target_cities: Array.isArray(user.target_cities) ? user.target_cities : (user.target_cities ? [user.target_cities] : []),
        roles_selected: Array.isArray(user.roles_selected) ? user.roles_selected : (user.roles_selected ? [user.roles_selected] : []),
        languages_spoken: Array.isArray(user.languages_spoken) ? user.languages_spoken : (user.languages_spoken ? [user.languages_spoken] : []),
        career_path: user.career_path ? [user.career_path] : [],
        work_environment: user.work_environment as 'remote' | 'hybrid' | 'on-site' | 'unclear' | undefined,
        entry_level_preference: user.entry_level_preference || 'entry',
        company_types: user.company_types || [],
        professional_expertise: user.professional_expertise || user.career_path || undefined,
        // Legacy fields (kept for compatibility)
        location_preference: 'any',
        salary_expectations: 'any',
        remote_preference: 'any',
        visa_sponsorship: false,
        graduate_scheme: false,
        internship: false,
        work_authorization: 'any'
      } as UserPreferences,
      subscription_tier: (user.subscription_active ? 'premium' : 'free') as 'free' | 'premium',
      created_at: user.created_at,
      last_email_sent: user.last_email_sent,
      is_active: user.active
    }));

    // 2. Fetch active jobs for accuracy-focused matching
    const jobFetchStart = Date.now();
    lap('fetch_jobs');

    // Check if semantic search is available
    const isSemanticAvailable = await semanticRetrievalService.isSemanticSearchAvailable();
    apiLogger.debug(`Semantic search available: ${isSemanticAvailable}`, { isSemanticAvailable });

    let jobs: any[] = [];

    // NOTE: Semantic search is disabled for batch processing because it requires per-user queries
    // Instead, we use keyword-based search and let preFilterJobs handle filtering
    // This is more efficient for batch processing multiple users
    if (false && isSemanticAvailable && transformedUsers.length === 1) {
      // Only use semantic search for single-user requests (not batch)
      apiLogger.info('Using semantic retrieval for single-user matching');
      
      const user = transformedUsers[0];
      if (user) {
        const semanticJobs = await semanticRetrievalService.getSemanticCandidates(
          user.preferences as UserPreferences,
          200 // Get top 200 semantic matches
        );
        
        if (semanticJobs.length > 0) {
          jobs = semanticJobs;
          apiLogger.info(`Found ${semanticJobs.length} semantic job candidates`, { count: semanticJobs.length });
        }
      }
    }

    // Fallback to traditional keyword-based search if semantic search fails or returns no results
    if (jobs.length === 0) {
      apiLogger.info('Using optimized database filtering for job search');
      
      // OPTIMIZATION: Collect all unique cities and career paths from users
      // Then fetch jobs matching ANY of these combinations at database level
      // This reduces data transfer significantly (e.g., 1200 → 200 jobs)
      const allCities = new Set<string>();
      const allCareerPaths = new Set<string>();
      
      transformedUsers.forEach(user => {
        if (user.preferences.target_cities) {
          user.preferences.target_cities.forEach(city => allCities.add(city));
        }
        if (user.preferences.career_path) {
          user.preferences.career_path.forEach(path => {
            // Map form value to database category
            const dbCategories = getDatabaseCategoriesForForm(path);
            dbCategories.forEach(cat => allCareerPaths.add(cat));
          });
        }
      });
      
      // Build optimized query using database indexes
      let query = supabase
        .from('jobs')
        .select('job_hash, title, company, location, description, source, created_at, original_posted_date, last_seen_at, status, job_url, is_active, is_graduate, is_internship, categories, city, country, skills')
        .eq('is_active', true);
      
      // OPTIMIZATION: Filter by cities at database level (uses idx_jobs_city index)
      if (allCities.size > 0 && allCities.size <= 50) { // Only if reasonable number of cities
        const citiesArray = Array.from(allCities);
        query = query.in('city', citiesArray);
        apiLogger.debug(`Filtering by ${citiesArray.length} cities at DB level`, { cities: citiesArray.slice(0, 5) });
      }
      
      // OPTIMIZATION: Filter by categories at database level (uses idx_jobs_categories GIN index)
      if (allCareerPaths.size > 0 && allCareerPaths.size <= 20) { // Only if reasonable number of categories
        const categoriesArray = Array.from(allCareerPaths);
        query = query.overlaps('categories', categoriesArray);
        apiLogger.debug(`Filtering by ${categoriesArray.length} categories at DB level`, { categories: categoriesArray.slice(0, 5) });
      }
      
      query = query.order('created_at', { ascending: false }).limit(jobCap);
      
      const { data: jobsData, error: jobsError } = await query;
      
      if (jobsError) {
        apiLogger.error('Failed to fetch jobs', jobsError as Error, { userCap, jobCap });
        return NextResponse.json({ 
          error: 'Failed to fetch jobs',
          code: 'JOB_FETCH_ERROR',
          details: jobsError 
        }, { status: 500 });
      }

      jobs = jobsData || [];
      apiLogger.info(`Fetched ${jobs.length} jobs using optimized database filtering`, { 
        citiesFiltered: allCities.size,
        categoriesFiltered: allCareerPaths.size,
        jobsReturned: jobs.length
      });
    }

    const jobFetchTime = Date.now() - jobFetchStart;

    if (!jobs || jobs.length === 0) {
      apiLogger.info('No active jobs to process');
      return NextResponse.json({ message: 'No active jobs to process' });
    }

    // Log job fetch results to Sentry breadcrumb
    Sentry.addBreadcrumb({
      message: 'Jobs fetched successfully',
      level: 'info',
      data: { jobCount: jobs.length, fetchTime: jobFetchTime }
    });
    
    // Log filtering effectiveness
    if (jobs.length > 0) {
      // EU location hints for filtering
      const EU_HINTS = [
        "UK","United Kingdom","Ireland","Germany","France","Spain","Portugal","Italy",
        "Netherlands","Belgium","Luxembourg","Denmark","Sweden","Norway","Finland",
        "Iceland","Poland","Czech","Austria","Switzerland","Hungary","Greece",
        "Romania","Bulgaria","Croatia","Slovenia","Slovakia","Estonia","Latvia",
        "Lithuania","Amsterdam","Rotterdam","Eindhoven","London","Dublin","Paris",
        "Berlin","Munich","Frankfurt","Zurich","Stockholm","Copenhagen","Oslo",
        "Helsinki","Madrid","Barcelona","Lisbon","Milan","Rome","Athens","Warsaw",
        "Prague","Vienna","Budapest","Bucharest","Tallinn","Riga","Vilnius",
        "Brussels","Luxembourg City"
      ];

      // Early career keywords for filtering
      const EARLY_CAREER_KEYWORDS = [
        "graduate","new grad","entry level","intern","internship","apprentice",
        "early career","junior","campus","working student","associate","assistant"
      ];

      const euJobs = jobs.filter(job => 
        EU_HINTS.some((hint: string) => job.location.toLowerCase().includes(hint.toLowerCase()))
      ).length;
      const earlyCareerJobs = jobs.filter(job => 
        EARLY_CAREER_KEYWORDS.some((keyword: string) => 
          job.title.toLowerCase().includes(keyword.toLowerCase()) ||
          job.description.toLowerCase().includes(keyword.toLowerCase())
        )
      ).length;
      
      apiLogger.debug('Job filtering results', {
        totalJobs: jobs.length,
        euJobs,
        euPercentage: Math.round(euJobs/jobs.length*100),
        earlyCareerJobs,
        earlyCareerPercentage: Math.round(earlyCareerJobs/jobs.length*100)
      });
    }

    // Skip in-memory job reservations; Redis global lock already protects this run

    // Log overall job distribution
    // Log total jobs to Sentry breadcrumb
    Sentry.addBreadcrumb({
      message: 'Total jobs processed',
      level: 'debug',
      data: { totalJobs: jobs.length }
    });

    // 3. Process users with batch optimization when beneficial
    let totalAIProcessingTime = 0;
    let totalTierDistributionTime = 0;
    
    const matcher = createConsolidatedMatcher(process.env.OPENAI_API_KEY);
    
    // ============================================
    // BATCH PROCESSING OPTIMIZATION
    // Use batch processing when we have 5+ users to group similar users
    // This reduces AI calls by sharing matches across similar profiles
    // ============================================
    const USE_BATCH_PROCESSING = transformedUsers.length >= 5 && 
                                 process.env.ENABLE_BATCH_MATCHING !== 'false';
    
    let results: Array<{ user: string; success: boolean; matches?: number; error?: string }>;
    
    if (USE_BATCH_PROCESSING) {
      apiLogger.info(`Using batch processing for ${transformedUsers.length} users`, { userCount: transformedUsers.length });
      
      // Prepare users for batch processing
      const usersForBatch = transformedUsers.map(user => ({
        email: user.email || '',
        preferences: user.preferences as UserPreferences
      }));
      
      // Use batch processor
      const batchStartTime = Date.now();
      const batchResults = await batchMatchingProcessor.processBatch(
        usersForBatch,
        jobs as any[],
        {
          useEmbeddings: await semanticRetrievalService.isSemanticSearchAvailable(),
          maxBatchSize: 10
        }
      );
      
      totalAIProcessingTime = Date.now() - batchStartTime;
      
      // Convert batch results to expected format
      results = transformedUsers.map(user => {
        const batchResult = batchResults.get(user.email || '');
        if (batchResult) {
          return {
            user: user.email || '',
            success: true,
            matches: batchResult.matches.length
          };
        }
        return {
          user: user.email || '',
          success: false,
          error: 'No matches found'
        };
      });
    } else {
      // Fall back to individual processing for small groups
      apiLogger.info(`Using individual processing for ${transformedUsers.length} users`, { userCount: transformedUsers.length });
      
      // ============================================
      // OPTIMIZATION: Batch fetch all user matches (fixes N+1 query bomb!)
      // Before: 50 users = 100 queries (2 per user) = 8 seconds wasted
      // After: 50 users = 1 query = instant!
      // ============================================
      // Batch fetch previous matches using service (prevents N+1 queries)
      const allUserEmails = transformedUsers.map(u => u.email);
      // const matchesByUser = await userMatchingService.getPreviousMatchesForUsers(allUserEmails);
      const matchesByUser = {}; // Temporarily disabled
      // ============================================
      
      const userPromises = transformedUsers.map(async (user) => {
      try {
        // Use pre-loaded matches (NO QUERY!)
        const previousJobHashes = new Set<string>(); // Temporarily disabled
        
        // Filter out jobs the user has already received
        const unseenJobs = jobs.filter(job => !previousJobHashes.has(job.job_hash));
        
        // Pre-filter jobs to reduce AI processing load (with feedback learning)
        const preFilteredJobs = await preFilterJobsByUserPreferencesEnhanced(unseenJobs as any[], user as unknown as UserPreferences);
        
        // OPTIMIZED: Send top 50 pre-filtered jobs to AI (was 100/200)
        // This reduces token cost by 50% while maintaining match quality
        // Top 50 contains all perfect/great matches from pre-filtering
        const considered = preFilteredJobs.slice(0, 50);
        // Log pre-filter results to Sentry breadcrumb
        Sentry.addBreadcrumb({
          message: 'Pre-filter results',
          level: 'debug',
          data: {
            userEmail: user.email,
            totalJobs: preFilteredJobs.length,
            sendingToAI: 50
          }
        });
        
        // Log score distribution to Sentry breadcrumb for observability
        if (preFilteredJobs.length >= 50) {
          const top10Scores = preFilteredJobs.slice(0, 10).map((j: any) => (j as any).score || 'N/A');
          const next40Scores = preFilteredJobs.slice(10, 50).map((j: any) => (j as any).score || 'N/A');
          
          Sentry.addBreadcrumb({
            message: 'Job score distribution analysis',
            level: 'debug',
            data: {
              userEmail: user.email,
              totalJobs: preFilteredJobs.length,
              top10Scores: top10Scores.filter((s: any) => typeof s === 'number'),
              next40Range: {
                max: Math.max(...next40Scores.filter((s: any) => typeof s === 'number')),
                min: Math.min(...next40Scores.filter((s: any) => typeof s === 'number'))
              }
            }
          });
        }
        
        // Apply simple job distribution
        const distributionStart = Date.now();
        lap('distribute');
        // Get user form values for student satisfaction scoring
        const userFormValues = user.preferences.career_path && user.preferences.career_path.length > 0
          ? user.preferences.career_path.map(path => mapFormLabelToDatabase(path))
          : undefined;

        const { jobs: distributedJobs, metrics: distributionMetrics } = distributeJobs(
          considered,
          user.subscription_tier || 'free',
          user.email || '',
          user.preferences.career_path && user.preferences.career_path.length > 0 ? user.preferences.career_path[0] : undefined,
          userFormValues,
          user.preferences.work_environment || undefined,
          user.preferences.entry_level_preference || undefined,
          user.preferences.company_types || undefined
        );
        const distributionTime = Date.now() - distributionStart;
        totalTierDistributionTime += distributionTime;

        // AI will pick best 5 from these top 50 pre-filtered & distributed jobs
        const capped = distributedJobs.slice(0, 50);

        // AI matching with performance tracking and circuit breaker
        let matches: JobMatch[] = [];
        let matchType: 'ai_success' | 'fallback' | 'ai_failed' = 'ai_success';
        let userProvenance: MatchProvenance = {
          match_algorithm: 'ai',
          cache_hit: false,
          ai_latency_ms: 0,
          ai_cost_usd: 0
        };
        const aiMatchingStart = Date.now();
        lap('ai_or_rules');

        // Use the consolidated matching engine
        // Cast to Job[] for the matching engine
        const jobsForMatching = distributedJobs as any[];
        const result = await matcher.performMatching(
          jobsForMatching,
          user as unknown as UserPreferences,
          process.env.MATCH_USERS_DISABLE_AI === 'true' // Force rules in tests
        );

        matches = result.matches;
        matchType = result.method === 'ai_success' ? 'ai_success' : 
                   result.method === 'rule_based' ? 'fallback' : 'ai_failed';
        
        const aiMatchingTime = Date.now() - aiMatchingStart;
        totalAIProcessingTime += aiMatchingTime;

        // DISTRIBUTION: Ensure source diversity and city balance AFTER AI matching
        if (matches && matches.length > 0) {
          // Get full job data for matched jobs
          const matchedJobsRaw = matches.map(m => {
            const job = distributedJobs.find(j => j.job_hash === m.job_hash);
            return job ? {
              ...job,
              match_score: m.match_score,
              match_reason: m.match_reason,
            } : null;
          }).filter(j => j !== null);

          // Get user's target cities
          const targetCities = user.preferences.target_cities || [];
          const targetCount = Math.min(5, matchedJobsRaw.length); // Standard is 5 jobs per email

          // Apply distribution
          const distributedMatchedJobs = distributeJobsWithDiversity(matchedJobsRaw as any[], {
            targetCount,
            targetCities,
            maxPerSource: Math.ceil(targetCount / 3), // Max 1/3 from any source
            ensureCityBalance: true
          });

          // Log distribution stats
          const stats = getDistributionStats(distributedMatchedJobs);
          apiLogger.info('Job distribution stats after AI matching', { 
            email: user.email,
            sourceDistribution: stats.sourceDistribution,
            cityDistribution: stats.cityDistribution,
            totalJobs: stats.totalJobs
          });

          // Rebuild matches array with distributed jobs
          matches = distributedMatchedJobs
            .filter(job => job.job_hash) // Filter out jobs without job_hash
            .map((job, idx) => ({
              job_index: idx + 1,
              job_hash: job.job_hash!,
              match_score: job.match_score || 85,
              match_reason: job.match_reason || 'AI match',
              confidence_score: 0.85
            }));
        }

        // Update performance metrics with actual timing
        performanceTracker.getMetrics = () => ({
          jobFetchTime: jobFetchTime,
          tierDistributionTime: totalTierDistributionTime,
          aiMatchingTime: totalAIProcessingTime,
          totalProcessingTime: Date.now() - performanceTracker.startTime,
          memoryUsage: process.memoryUsage().heapUsed - performanceTracker.startMemory,
          errors: 0, // Set by caller
          totalRequests: 1 // Default to 1 request
        });

        // DIVERSITY: Ensure matches include multiple job boards AND multiple cities
        // This runs EVEN for cached results to ensure city distribution!
        if (matches && matches.length >= 3) {
          apiLogger.debug(`Running diversity check`, { 
            method: result.method, 
            cached: result.method === 'ai_success' && aiMatchingTime < 100 
          });

          const matchedJobs = matches.map(m => {
            const job = distributedJobs.find(j => j.job_hash === m.job_hash);
            return job ? { ...m, source: (job as any).source, location: job.location } : m;
          });
          
          // Check current source diversity
          const sources = matchedJobs.map(m => (m as any).source).filter(Boolean);
          const uniqueSources = new Set(sources);
          
          // Check current city diversity
          const targetCities = ['any']; // Temporarily disabled
          const matchedCities = new Set(
            matchedJobs.map(m => {
              const loc = (m as any).location?.toLowerCase() || '';
              // Find which target city this job matches
              return targetCities.find((city: string) => city && loc.includes(city.toLowerCase()));
            }).filter(Boolean)
          );
          
          apiLogger.debug(`City diversity coverage`, {
            citiesCovered: matchedCities.size,
            totalCities: targetCities.length,
            cities: Array.from(matchedCities)
          });
          
          // CITY DIVERSITY: Evenly distribute jobs across selected cities
          if (targetCities.length >= 2 && matches.length >= 3) {
            apiLogger.debug(`Ensuring even city distribution`, {
              targetCities: targetCities.length,
              availableJobs: distributedJobs.length
            });
            
            // Calculate target distribution (3+2 for 2 cities, 2+2+1 for 3 cities, etc.)
            const jobsPerCity = Math.floor(5 / targetCities.length); // Base allocation
            const extraJobs = 5 % targetCities.length; // Extra jobs to distribute
            
            const cityAllocations = targetCities.map((city: string, index: number) => ({
              city,
              target: jobsPerCity + (index < extraJobs ? 1 : 0)
            }));
            
            apiLogger.debug(`City allocation targets`, {
              allocations: cityAllocations.map((c: { city: string; target: number }) => ({ city: c.city, target: c.target }))
            });
            
            // Rebuild matches with even city distribution + relevance scoring
            const newMatches: JobMatch[] = [];
            
            // Helper: Score job relevance based on user preferences
            const scoreJobRelevance = (job: ScrapersJob & { freshnessTier: string }): number => {
              let score = 50; // Base score
              const jobTitle = job.title.toLowerCase();
              const jobDesc = (job.description || '').toLowerCase();
              
              // Role/Career path match (HIGH priority - prevents finance guy getting sales jobs)
              if (user.preferences.career_path && user.preferences.career_path.length > 0) {
                const roles = user.preferences.career_path;
                const hasRoleMatch = roles.some((role: string) => 
                  role && (jobTitle.includes(role.toLowerCase()) || jobDesc.includes(role.toLowerCase()))
                );
                if (hasRoleMatch) score += 30;
                else score -= 20; // Penalty for role mismatch
              }
              
              if (user.preferences.career_path && user.preferences.career_path.length > 0) {
                const careerPaths = user.preferences.career_path;
                const hasCareerMatch = careerPaths.some((path: string) => 
                  path && (jobTitle.includes(path.toLowerCase()) || jobDesc.includes(path.toLowerCase()))
                );
                if (hasCareerMatch) score += 20;
              }
              
              // Experience level match
              if (user.preferences.entry_level_preference) {
                const entryKeywords = ['intern', 'internship', 'graduate', 'grad', 'entry', 'junior', 'trainee', 'associate'];
                const seniorKeywords = ['senior', 'lead', 'principal', 'manager', 'director', 'head'];
                
                const isEntryLevel = entryKeywords.some(kw => jobTitle.includes(kw));
                const isSenior = seniorKeywords.some(kw => jobTitle.includes(kw));
                
                if (user.preferences.entry_level_preference.toLowerCase().includes('entry') && isEntryLevel) score += 15;
                if (user.preferences.entry_level_preference.toLowerCase().includes('entry') && isSenior) score -= 30; // Strong penalty
              }
              
              return score;
            };
            
            for (const allocation of cityAllocations) {
              // Get all jobs from this city
              const cityJobs = distributedJobs.filter(job => {
                const loc = job.location.toLowerCase();
                return loc.includes(allocation.city.toLowerCase()) &&
                       !newMatches.some(m => m.job_hash === job.job_hash);
              });
              
              apiLogger.debug(`City job allocation`, {
                city: allocation.city,
                availableJobs: cityJobs.length,
                targetJobs: allocation.target
              });
              
              // Score and sort by relevance (MOST relevant first)
              const scoredCityJobs = cityJobs
                .map(job => ({ job: { ...job, freshnessTier: 'unknown' }, relevanceScore: scoreJobRelevance({ ...job, freshnessTier: 'unknown' }) }))
                .sort((a, b) => b.relevanceScore - a.relevanceScore);
              
              // Take the top N MOST RELEVANT jobs for this city
              const jobsToAdd = scoredCityJobs.slice(0, allocation.target);
              
              jobsToAdd.forEach(({ job, relevanceScore }, idx) => {
                newMatches.push({
                  job_index: newMatches.length + 1,
                  job_hash: job.job_hash,
                  match_score: relevanceScore,
                  match_reason: `Top ${idx + 1} match in ${allocation.city} (relevance: ${relevanceScore})`,
                  confidence_score: 0.85
                });
                
                apiLogger.debug(`Added job to city matches`, {
                  city: allocation.city,
                  jobTitle: job.title,
                  relevanceScore
                });
              });
            }
            
            // Only replace matches if we got enough jobs from all cities
            if (newMatches.length >= 3) {
              apiLogger.info(`Rebuilt ${newMatches.length} matches with city diversity`, { matchCount: newMatches.length });
              matches = newMatches.slice(0, 5); // Ensure exactly 5
            } else {
              apiLogger.debug(`Not enough jobs across all cities`, { matchCount: newMatches.length });
            }
          } else {
            apiLogger.debug(`City diversity check skipped`, { cityCount: targetCities.length });
          }
          
          // SOURCE DIVERSITY: Ensure matches include multiple job boards (preferred: at least 2)
          if (uniqueSources.size === 1 && distributedJobs.length > 10) {
            apiLogger.debug(`Adding source diversity`, {
              currentSource: Array.from(uniqueSources)[0],
              matchCount: matches.length
            });
            
            // Find jobs from OTHER sources in our pre-filtered pool
            const primarySource = Array.from(uniqueSources)[0];
            const alternativeSources = distributedJobs.filter(j => (j as any).source !== primarySource);
            
            if (alternativeSources.length > 0) {
              // Replace the LOWEST scoring match with a job from a different source
              const lowestScoreIndex = matches.length - 1; // Last match has lowest score
              const alternativeJob = alternativeSources[0];
              
              matches[lowestScoreIndex] = {
                job_index: matches.length,
                job_hash: alternativeJob.job_hash,
                match_score: matches[lowestScoreIndex].match_score - 5, // Slightly lower score
                match_reason: `Alternative source: ${alternativeJob.title} at ${alternativeJob.company}`,
                confidence_score: 0.75
              };
              
              // Log diversity improvement to Sentry breadcrumb
              Sentry.addBreadcrumb({
                message: 'Added alternative job for diversity',
                level: 'debug',
                data: {
                  userEmail: user.email,
                  source: (alternativeJob as any).source,
                  jobTitle: alternativeJob.title
                }
              });
            }
          }
          
          // Log final diversity
          const finalSources = matches.map(m => {
            const job = distributedJobs.find(j => j.job_hash === m.job_hash);
            return (job as any)?.source;
          }).filter(Boolean);
          const finalUniqueSources = new Set(finalSources);
          
          const finalCities = matches.map(m => {
            const job = distributedJobs.find(j => j.job_hash === m.job_hash);
            const loc = job?.location?.toLowerCase() || '';
            return targetCities.find((city: string) => city && loc.includes(city.toLowerCase()));
          }).filter(Boolean);
          const finalUniqueCities = new Set(finalCities);
          
          // Log final diversity to Sentry breadcrumb
          Sentry.addBreadcrumb({
            message: 'Final diversity achieved',
            level: 'debug',
            data: {
              userEmail: user.email,
              sourceCount: finalUniqueSources.size,
              sources: Array.from(finalUniqueSources),
              cityCount: finalUniqueCities.size,
              cities: Array.from(finalUniqueCities)
            }
          });
        }

        // Save matches using service with provenance tracking
        if (matches && matches.length > 0) {
          // Prepare provenance data with actual timing and match type
          const finalProvenance = {
            match_algorithm: matchType === 'ai_success' ? 'ai' : 'rules',
            ai_latency_ms: aiMatchingTime,
            cache_hit: userProvenance.cache_hit || false,
            fallback_reason: matchType !== 'ai_success' ? 'ai_failed_or_fallback' : undefined
          };
          
          // Add user email to matches for service
          const matchesWithEmail = matches.map(m => ({ ...m, user_email: user.email }));
          
          try {
            // NOTE: Match saving temporarily disabled - matches are logged for debugging
            apiLogger.debug(`Would save matches for user`, {
              userEmail: user.email,
              matchCount: matchesWithEmail.length,
              matches: matchesWithEmail.map(m => ({ job_hash: m.job_hash, match_score: m.match_score }))
            });
          } catch (error) {
            apiLogger.error(`Failed to save matches for user`, error as Error, { userEmail: user.email });
          }
        }

        // Enhanced logging
        lap('persist');
        await logMatchSession(
          user.email,
          matchType,
          matches.length,
          {
            processingTimeMs: Date.now() - startTime,
            aiModel: 'gpt-4'
          }
        );

        // Calculate match distribution for results
        const matchCounts = matches.length;

        return { user: user.email, success: true, matches: matches.length };

      } catch (userError) {
        apiLogger.error(`Error processing user`, userError as Error, { userEmail: user.email });
        
        return { user: user.email, success: false, error: userError instanceof Error ? userError.message : 'Unknown error' };
      }
    });
    
    results = await Promise.all(userPromises);
    }
    
    const totalProcessingTime = Date.now() - performanceTracker.startTime;
    const performanceMetrics = performanceTracker.getMetrics();

    // SLO check: warn if match-users exceeds target (<2s)
    if (totalProcessingTime > MATCH_SLO_MS) {
      apiLogger.warn(`Match-users SLO violation`, {
        duration: totalProcessingTime,
        target: MATCH_SLO_MS,
        processed: users.length
      });
      Sentry.addBreadcrumb({
        message: 'Match-users SLO violation',
        level: 'warning',
        data: {
          duration: totalProcessingTime,
          target: MATCH_SLO_MS,
          processed: users.length
        }
      });
    }

    // Track production metrics for Datadog monitoring
    const requestDuration = Date.now() - requestStartTime;

    // Calculate error rate and alert if high
    const errorRate = performanceMetrics.errors > 0 
      ? (performanceMetrics.errors / performanceMetrics.totalRequests) * 100 
      : 0;
    
    if (errorRate > 10) {
      apiLogger.warn(`High error rate detected`, { errorRate: errorRate.toFixed(2) });
      Sentry.captureMessage(`High error rate: ${errorRate.toFixed(2)}%`, {
        level: 'warning',
        tags: { errorRate: errorRate.toFixed(2) }
      });
    }
    
    lap('done');
    
    // Summary breadcrumb for the entire request with comprehensive metrics
    const successfulResults = results.filter(r => r.success);
    
    Sentry.addBreadcrumb({
      message: 'Match-users request completed',
      level: 'info',
      data: {
        processed: users.length,
        matched: successfulResults.length,
        failed: results.filter(r => !r.success).length,
        duration: Date.now() - startTime,
        errorRate: errorRate
      }
    });
    
    return NextResponse.json({
      success: true,
      processed: users.length,
      matched: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      duration: Date.now() - startTime,
      slo: {
        target: MATCH_SLO_MS,
        actual: Date.now() - startTime,
        met: (Date.now() - startTime) <= MATCH_SLO_MS
      }
    });
  });

  // Handle lock acquisition failure
  if (result === null) {
    return NextResponse.json({ 
      error: 'Processing in progress',
      code: 'PROCESSING_IN_PROGRESS' 
    }, { status: 409 });
  }

  return result;

  } catch (error) {
    const requestDuration = Date.now() - startTime;
    apiLogger.error('Match-users processing error', error as Error, { requestId, requestDuration });
    
    // Sentry error tracking with context
    Sentry.captureException(error, {
      tags: {
        endpoint: 'match-users',
        operation: 'batch-processing',
        requestId
      },
      extra: {
        processingTime: Date.now() - startTime,
        requestDuration,
        requestId
      }
    });
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    // Complete Sentry transaction
    if (transaction) {
      transaction.finish();
    }
  }
};

// Export with auth wrapper
export const POST = matchUsersHandler;

// Enhanced GET endpoint with tier analytics  
export async function GET(req: NextRequest) {
  // Return 405 for GET method as this endpoint is primarily for POST
  return NextResponse.json({ 
    error: 'Method not allowed. This endpoint is designed for POST requests only.' 
  }, { status: 405 });
}
