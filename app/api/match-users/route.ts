// app/api/match-users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { hmacVerify } from '@/Utils/security/hmac';
const HMAC_SECRET = process.env.INTERNAL_API_HMAC_SECRET;
import { SupabaseClient } from '@supabase/supabase-js';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import { getDatabaseClient } from '@/Utils/databasePool';
import * as Sentry from '@sentry/nextjs';
import {
  logMatchSession
} from '@/Utils/matching/logging.service';
import type { UserPreferences, JobMatch } from '@/Utils/matching/types';
import crypto from 'crypto';
import { createConsolidatedMatcher } from '@/Utils/consolidatedMatching';
import { 
  SEND_PLAN,
  MATCH_RULES
} from '@/Utils/sendConfiguration';
import { Job as ScrapersJob } from '@/scrapers/types';
import { getCategoryPriorityScore, jobMatchesUserCategories, WORK_TYPE_CATEGORIES, mapFormLabelToDatabase, getStudentSatisfactionScore } from '@/Utils/matching/categoryMapper';
import { semanticRetrievalService } from '@/Utils/matching/semanticRetrieval';
import { z } from 'zod';

// Zod validation schemas
const matchUsersRequestSchema = z.object({
  userLimit: z.coerce.number().min(1).max(100).default(50),
  jobLimit: z.coerce.number().min(100).max(50000).default(10000),
  forceRun: z.coerce.boolean().default(false),
  dryRun: z.coerce.boolean().default(false),
  // HMAC authentication - only required if HMAC_SECRET is set
  signature: HMAC_SECRET ? z.string().min(1, 'Authentication signature required') : z.string().optional(),
  timestamp: HMAC_SECRET ? z.coerce.number().min(1, 'Timestamp required') : z.coerce.number().optional()
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

// Environment flags and limits
const IS_TEST = process.env.NODE_ENV === 'test';
const IS_DEBUG = process.env.DEBUG_MATCHING === 'true' || IS_TEST;
const USER_LIMIT = IS_TEST ? 3 : 50;
const JOB_LIMIT = IS_TEST ? 300 : 10000; // Increased to handle full job catalog

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
    console.warn('Redis not available, proceeding without lock');
    return await fn();
  }

  const token = crypto.randomUUID();
  const lockKey = key;
  
  try {
    // Try to acquire lock
    const acquired = await redis.set(lockKey, token, { NX: true, EX: ttlSeconds });
    if (!acquired) {
      console.log(`Lock ${lockKey} already held, skipping operation`);
      return null;
    }

    console.log(`Acquired lock ${lockKey} for ${ttlSeconds}s`);
    return await fn();
  } finally {
    // Always try to release lock
    try {
      const currentToken = await redis.get(lockKey);
      if (currentToken === token) {
        await redis.del(lockKey);
        console.log(`Released lock ${lockKey}`);
      }
    } catch (error) {
      console.warn(`Failed to release lock ${lockKey}:`, error);
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

// Student satisfaction job distribution - prioritizes what students told us they want
const JOB_DISTRIBUTION = {
  free: {
    jobs_per_user: parseInt(process.env.FREE_JOBS_PER_USER || '10')
  },
  premium: {
    jobs_per_user: parseInt(process.env.PREMIUM_JOBS_PER_USER || '10')
  }
};

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
      console.log('Test mode: Skipping database schema validation');
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
      console.error('Database schema validation failed:', error.message);
      // Try to identify missing columns from error message
      const missingColumns = requiredColumns.filter(col => 
        error.message?.toLowerCase().includes(col.toLowerCase())
      );
      return { valid: false, missingColumns };
    }
    
    console.log('Database schema validation passed');
    return { valid: true };
  } catch (err) {
    console.error('Database schema validation error:', err);
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
  
  console.log(`Distributing jobs for ${userTier} user ${userId}. Total jobs: ${jobs.length}`);
  
  // Validate and clean job data
  const validJobs = jobs.filter(job => job.job_hash && job.title && job.company);
  
  // Get distribution limits based on user tier
  const config = JOB_DISTRIBUTION[userTier];
  const maxAllowed = SEND_PLAN[userTier].perSend;
  const targetCount = Math.min(config.jobs_per_user, maxAllowed);
  
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
  
  console.log(`Selected ${selectedJobs.length} jobs for ${userId} (${userTier} tier) in ${processingTime}ms`);
  
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

// Enhanced pre-filter jobs by user preferences with scoring AND feedback learning
async function preFilterJobsByUserPreferencesEnhanced(jobs: (ScrapersJob & { freshnessTier: string })[], user: UserPreferences): Promise<(ScrapersJob & { freshnessTier: string })[]> {
  // Get user's feedback history for personalized boosting
  let feedbackBoosts: Map<string, number> = new Map();
  
  try {
    const supabase = getDatabaseClient();
    const { data: feedback } = await supabase
      .from('user_feedback')
      .select('relevance_score, job_context')
      .eq('user_email', user.email)
      .gte('relevance_score', 4)  // Only highly-rated jobs
      .limit(10);
    
    if (feedback && feedback.length > 0) {
      // Extract patterns from highly-rated jobs
      feedback.forEach(f => {
        const ctx = f.job_context;
        if (!ctx) return;
        
        // If user loved jobs in Berlin, boost Berlin jobs
        if (ctx.location) {
          const city = ctx.location.toLowerCase();
          feedbackBoosts.set(`loc:${city}`, (feedbackBoosts.get(`loc:${city}`) || 0) + 10);
        }
        
        // If user loved startup jobs, boost startups
        if (ctx.company?.toLowerCase().includes('startup')) {
          feedbackBoosts.set('type:startup', (feedbackBoosts.get('type:startup') || 0) + 10);
        }
        
        // If user loved remote jobs, boost remote
        if (ctx.location?.toLowerCase().includes('remote')) {
          feedbackBoosts.set('env:remote', (feedbackBoosts.get('env:remote') || 0) + 15);
        }
      });
      
      if (feedbackBoosts.size > 0) {
        console.log(`Feedback boosts for ${user.email}:`, Object.fromEntries(feedbackBoosts));
      }
    }
  } catch (error) {
    console.warn('Failed to load feedback boosts:', error);
  }
  
  // NOW DO STANDARD PRE-FILTER LOGIC (same as legacy function)
  let filteredJobs = jobs;
  
  // HARD FILTER: Location is first priority - only show jobs from target cities or remote
  if (user.target_cities) {
    const targetCities = Array.isArray(user.target_cities) ? user.target_cities : [user.target_cities];
    
    if (targetCities.length > 0) {
      filteredJobs = jobs.filter(job => {
        const jobLocation = job.location.toLowerCase();
        const isRemote = jobLocation.includes('remote') || jobLocation.includes('work from home');
        
        // Accept if remote OR matches any target city
        if (isRemote) return true;
        
        return targetCities.some(city => city && matchesLocation(job.location, city));
      });
      
      console.log(`Location filter: ${jobs.length} -> ${filteredJobs.length} jobs (cities: ${targetCities.join(', ')})`);
    }
  }
  
  // Now score the location-filtered jobs
  const scoredJobs = filteredJobs.map(job => {
    let score = 0;
    const jobTitle = job.title.toLowerCase();
    const jobLocation = job.location.toLowerCase();
    const jobDesc = (job.description || '').toLowerCase();
    
    // Location preference scoring (bonus points for exact city vs remote)
    if (user.target_cities) {
      const targetCities = Array.isArray(user.target_cities) ? user.target_cities : [user.target_cities];
      const hasExactCityMatch = targetCities.some(city => city && matchesLocation(job.location, city));
      const isRemote = jobLocation.includes('remote');
      
      if (hasExactCityMatch) score += 50; // Exact city match gets bonus
      else if (isRemote) score += 30;     // Remote is good but less preferred
    }
    
    // Experience level scoring (high priority)
    if (user.entry_level_preference) {
      const experienceKeywords: Record<string, string[]> = {
        'entry': ['intern', 'internship', 'graduate', 'grad', 'entry', 'junior', 'trainee', 'associate'],
        'mid': ['analyst', 'specialist', 'coordinator', 'associate'],
        'senior': ['senior', 'lead', 'principal', 'manager', 'director']
      };
      
      const keywords = experienceKeywords[user.entry_level_preference as keyof typeof experienceKeywords] || experienceKeywords['entry'];
      const hasLevelMatch = keywords.some(keyword => jobTitle.includes(keyword));
      
      if (hasLevelMatch) score += 40; // Level match
      else score -= 15;                // Wrong level penalty
    }
    
    // Role/Career path scoring (medium priority) - handle string or array
    if (user.roles_selected) {
      const roles = Array.isArray(user.roles_selected) ? user.roles_selected : [user.roles_selected];
      const hasRoleMatch = roles.some(role => 
        role && (jobTitle.includes(role.toLowerCase()) || jobDesc.includes(role.toLowerCase()))
      );
      if (hasRoleMatch) score += 30;
    }
    
    // Language scoring (if specified) - handle string or array
    if (user.languages_spoken) {
      const languages = Array.isArray(user.languages_spoken) ? user.languages_spoken : [user.languages_spoken];
      const hasLanguageMatch = languages.some(lang => 
        lang && jobDesc.includes(lang.toLowerCase())
      );
      if (hasLanguageMatch) score += 10;
    }
    
    // Career path scoring (handle string or array)
    if (user.career_path) {
      const careerPaths = Array.isArray(user.career_path) ? user.career_path : [user.career_path];
      const hasCareerMatch = careerPaths.some(path => 
        path && (jobTitle.includes(path.toLowerCase()) || jobDesc.includes(path.toLowerCase()))
      );
      if (hasCareerMatch) score += 20;
    }
    
    // NEW: Apply feedback boosts (learned preferences)
    feedbackBoosts.forEach((boost, key) => {
      const [type, value] = key.split(':');
      
      if (type === 'loc' && jobLocation.includes(value)) {
        score += boost;
        if (IS_DEBUG) console.log(`   Boosted "${job.title}" by +${boost} (location: ${value})`);
      }
      if (type === 'type' && (jobTitle.includes(value) || jobDesc.includes(value))) {
        score += boost;
        if (IS_DEBUG) console.log(`  Boosted "${job.title}" by +${boost} (company type: ${value})`);
      }
      if (type === 'env' && jobLocation.includes(value)) {
        score += boost;
        if (IS_DEBUG) console.log(`   Boosted "${job.title}" by +${boost} (work env: ${value})`);
      }
    });
    
    return { job, score };
  });
  
  // Rest of function identical to legacy version
  // Sort by score, then ensure source diversity in top results
  const sortedJobs = scoredJobs
    .filter(item => item.score > 0) // Only jobs with some match
    .sort((a, b) => b.score - a.score);
  
  // Ensure source diversity in top 100 jobs sent to AI
  const diverseJobs: typeof sortedJobs[0][] = [];
  const sourceCount: Record<string, number> = {};
  const maxPerSource = MATCH_RULES.maxPerSource; // Max jobs from any single source in top results
  
  for (const item of sortedJobs) {
    const source = (item.job as any).source || 'unknown';
    const currentCount = sourceCount[source] || 0;
    
    if (currentCount < maxPerSource) {
      diverseJobs.push(item);
      sourceCount[source] = currentCount + 1;
    }
    
    if (diverseJobs.length >= 100) break; // Stop at 100 jobs
  }
  
  // Add remaining jobs if we don't have 100 yet
  if (diverseJobs.length < 100) {
    const remainingJobs = sortedJobs.filter(item => !diverseJobs.includes(item));
    diverseJobs.push(...remainingJobs.slice(0, 100 - diverseJobs.length));
  }
  
  const topJobs = diverseJobs.map(item => item.job);
  const sourceCounts = Object.entries(sourceCount).map(([s, c]) => `${s}:${c}`).join(', ');
  
  // Log job filtering results to Sentry breadcrumb instead of console
  Sentry.addBreadcrumb({
    message: 'Job filtering completed',
    level: 'info',
    data: {
      userEmail: user.email,
      originalCount: jobs.length,
      filteredCount: topJobs.length,
      sourceDistribution: sourceCounts,
      feedbackBoosted: feedbackBoosts.size > 0
    }
  });
  return topJobs;
}

// Initialize clients

// OpenAI client creation moved to ConsolidatedMatchingEngine

// Database query helper with timeout
async function queryWithTimeout<T>(
  queryPromise: Promise<any>,
  timeoutMs: number = 10000
): Promise<{ data: T | null; error: unknown }> {
  const timeoutPromise = new Promise<{ data: null; error: unknown }>((_, reject) => 
    setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs)
  );

  try {
    const result = await Promise.race([queryPromise, timeoutPromise]);
    return { data: result.data, error: result.error };
  } catch (error) {
    return { data: null, error };
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
      if (!hmacVerify(raw, sig, HMAC_SECRET)) {
        return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
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

    // Verify HMAC authentication if signature provided
    if (signature && HMAC_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', HMAC_SECRET)
        .update(`${userLimit}:${jobLimit}:${timestamp}`)
        .digest('hex');
      
      if (!crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )) {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
      }
    }
    const performanceTracker = trackPerformance();
  const reservationId = `batch_${Date.now()}`;
  const requestStartTime = Date.now();
  
  // Variables for function scope (some will be assigned in try block)
  
  // Stopwatch helper
  const t0 = Date.now(); 
  const lap = (s: string) => console.log(JSON.stringify({ evt:'perf', step:s, ms: Date.now()-t0 }));
  
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
    console.log(`Processing match-users request from IP: ${ip}`);
    
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
      console.error('Failed to fetch users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      console.log('No users found');
      return NextResponse.json({ message: 'No users found' });
    }

    console.log(`Found ${users.length} active users to process`);

    // Transform user data to match expected format
    const transformedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      preferences: {
        email: user.email,
        career_path: user.career_path ? [user.career_path] : [],
        work_environment: user.work_environment as 'remote' | 'hybrid' | 'on-site' | 'unclear' | undefined,
        entry_level_preference: user.entry_level_preference || 'entry',
        company_types: user.company_types || [],
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
    console.log(`Semantic search available: ${isSemanticAvailable}`);

    let jobs: any[] = [];

    if (isSemanticAvailable) {
      // Use semantic retrieval for better job matching
      console.log('Using semantic retrieval for job matching');
      
      // Get semantic candidates for each user (we'll use the first user's preferences as a sample)
      const sampleUser = transformedUsers[0];
      if (sampleUser) {
        const semanticJobs = await semanticRetrievalService.getSemanticCandidates(
          sampleUser.preferences as UserPreferences,
          200 // Get top 200 semantic matches
        );
        
        if (semanticJobs.length > 0) {
          jobs = semanticJobs;
          console.log(`Found ${semanticJobs.length} semantic job candidates`);
        }
      }
    }

    // Fallback to traditional keyword-based search if semantic search fails or returns no results
    if (jobs.length === 0) {
      console.log('Falling back to keyword-based job search');
      
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

      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('job_hash, title, company, location, description, source, created_at, original_posted_date, last_seen_at, status, job_url, is_active, is_graduate, is_internship, career_path, target_cities, skills')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(jobCap);

      if (jobsError) {
        console.error('Failed to fetch jobs:', jobsError);
        return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
      }

      jobs = jobsData || [];
    }

    const jobFetchTime = Date.now() - jobFetchStart;

    if (!jobs || jobs.length === 0) {
      console.log('No active jobs to process');
      return NextResponse.json({ message: 'No active jobs to process' });
    }

    console.log(`Found ${jobs.length} EU-based early career jobs from past 30 days in ${jobFetchTime}ms`);
    
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
      
      console.log(` Job Filtering Results:`);
       console.log(`   EU-based jobs: ${euJobs}/${jobs.length} (${Math.round(euJobs/jobs.length*100)}%)`);
       console.log(`   Early career jobs: ${earlyCareerJobs}/${jobs.length} (${Math.round(earlyCareerJobs/jobs.length*100)}%)`);
    }

    // Skip in-memory job reservations; Redis global lock already protects this run

    // Log overall job distribution
    console.log(`Total jobs fetched: ${jobs.length}`);

    // 3. Process each user in parallel
    let totalAIProcessingTime = 0;
    let totalTierDistributionTime = 0;
    
    const matcher = createConsolidatedMatcher(process.env.OPENAI_API_KEY);
    
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
        console.log(`Processing matches for ${user.email} (tier: ${user.subscription_tier || 'free'})`);
        
        // Use pre-loaded matches (NO QUERY!)
        const previousJobHashes = new Set<string>(); // Temporarily disabled
        console.log(`User ${user.email} has already received ${previousJobHashes.size} jobs`);
        
        // Filter out jobs the user has already received
        const unseenJobs = jobs.filter(job => !previousJobHashes.has(job.job_hash));
        console.log(`${unseenJobs.length} new jobs available for ${user.email} (${jobs.length - unseenJobs.length} already sent)`);
        
        // Pre-filter jobs to reduce AI processing load (with feedback learning)
        const preFilteredJobs = await preFilterJobsByUserPreferencesEnhanced(unseenJobs as any[], user as unknown as UserPreferences);
        
        // OPTIMIZED: Send top 50 pre-filtered jobs to AI (was 100/200)
        // This reduces token cost by 50% while maintaining match quality
        // Top 50 contains all perfect/great matches from pre-filtering
        const considered = preFilteredJobs.slice(0, 50);
        console.log(` Pre-filter results for ${user.email}: ${preFilteredJobs.length} jobs -> sending top 50 to AI`);
        
        // Log score distribution to validate we're keeping the best jobs
        if (preFilteredJobs.length >= 50) {
          const top10Scores = preFilteredJobs.slice(0, 10).map((j: any) => (j as any).score || 'N/A');
          const next40Scores = preFilteredJobs.slice(10, 50).map((j: any) => (j as any).score || 'N/A');
          console.log(`  Top 10 scores: ${top10Scores.join(', ')}`);
          console.log(`  Next 40 range: ${Math.max(...next40Scores.filter((s: any) => typeof s === 'number'))} - ${Math.min(...next40Scores.filter((s: any) => typeof s === 'number'))}`);
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
          console.log(` Running diversity check (method: ${result.method}, cached: ${result.method === 'ai_success' && aiMatchingTime < 100})`);

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
          
          console.log(` City diversity: ${matchedCities.size}/${targetCities.length} cities covered (${Array.from(matchedCities).join(', ')})`);
          
          // CITY DIVERSITY: Evenly distribute jobs across selected cities
          if (targetCities.length >= 2 && matches.length >= 3) {
            console.log(` Ensuring even city distribution for ${targetCities.length} target cities`);
            console.log(` Available jobs pool: ${distributedJobs.length} jobs`);
            
            // Calculate target distribution (3+2 for 2 cities, 2+2+1 for 3 cities, etc.)
            const jobsPerCity = Math.floor(5 / targetCities.length); // Base allocation
            const extraJobs = 5 % targetCities.length; // Extra jobs to distribute
            
            const cityAllocations = targetCities.map((city: string, index: number) => ({
              city,
              target: jobsPerCity + (index < extraJobs ? 1 : 0)
            }));
            
            console.log(` Target distribution: ${cityAllocations.map((c: { city: string; target: number }) => `${c.city}:${c.target}`).join(', ')}`);
            
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
              
              console.log(` ${allocation.city}: Found ${cityJobs.length} available jobs, need ${allocation.target}`);
              
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
                
                console.log(`   Added: ${job.title} (score: ${relevanceScore})`);
              });
            }
            
            // Only replace matches if we got enough jobs from all cities
            if (newMatches.length >= 3) {
              console.log(` Rebuilt ${newMatches.length} matches with city diversity`);
              matches = newMatches.slice(0, 5); // Ensure exactly 5
            } else {
              console.log(` Not enough jobs across all cities (${newMatches.length}), keeping original matches`);
            }
          } else {
            console.log(` City diversity check: ${targetCities.length} cities, need 3+ matches for diversity`);
          }
          
          // SOURCE DIVERSITY: Ensure matches include multiple job boards (preferred: at least 2)
          if (uniqueSources.size === 1 && distributedJobs.length > 10) {
            console.log(` All ${matches.length} matches from ${Array.from(uniqueSources)[0]}, adding diversity...`);
            
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
            console.log(`✅ Would save ${matchesWithEmail.length} matches for ${user.email}:`, 
              matchesWithEmail.map(m => ({ job_hash: m.job_hash, match_score: m.match_score }))
            );
          } catch (error) {
            console.error(`❌ Failed to save matches for ${user.email}:`, error);
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
        console.error(`Error processing user ${user.email}:`, userError);
        
        return { user: user.email, success: false, error: userError instanceof Error ? userError.message : 'Unknown error' };
      }
    });

    const results = await Promise.all(userPromises);

    const totalProcessingTime = Date.now() - performanceTracker.startTime;
    const performanceMetrics = performanceTracker.getMetrics();

    // Track production metrics for Datadog monitoring
    const requestDuration = Date.now() - requestStartTime;

    // Calculate error rate and alert if high
    const errorRate = performanceMetrics.errors > 0 
      ? (performanceMetrics.errors / performanceMetrics.totalRequests) * 100 
      : 0;
    
    if (errorRate > 10) {
      console.warn(` High error rate detected: ${errorRate.toFixed(2)}%`);
      Sentry.captureMessage(`High error rate: ${errorRate.toFixed(2)}%`, {
        level: 'warning',
        tags: { errorRate: errorRate.toFixed(2) }
      });
    }
    
    lap('done');
    return NextResponse.json({
      success: true,
      processed: users.length,
      matched: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      duration: Date.now() - startTime
    });
  });

  // Handle lock acquisition failure
  if (result === null) {
    return NextResponse.json({ error: 'Processing in progress' }, { status: 409 });
  }

  return result;

  } catch (error) {
    const requestDuration = Date.now() - startTime;
    console.error('Match-users processing error:', error);
    
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
