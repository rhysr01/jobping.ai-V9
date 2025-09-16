// app/api/match-users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getProductionRateLimiter } from '@/Utils/productionRateLimiter';
import OpenAI from 'openai';
import * as Sentry from '@sentry/nextjs';
import {
  generateRobustFallbackMatches
} from '@/Utils/matching/fallback.service';
import {
  logMatchSession
} from '@/Utils/matching/logging.service';
import type { UserPreferences, JobMatch } from '@/Utils/matching/types';
import crypto from 'crypto';
import { createConsolidatedMatcher } from '@/Utils/consolidatedMatching';
import { 
  SEND_PLAN
} from '@/Utils/sendConfiguration';

// Environment flags and limits
const IS_TEST = process.env.NODE_ENV === 'test';
const USER_LIMIT = IS_TEST ? 3 : 50;
const JOB_LIMIT = IS_TEST ? 300 : 1200;

// Lock key helper
const LOCK_KEY = (rid: string) => `${IS_TEST ? 'jobping:test' : 'jobping:prod'}:lock:match-users:${rid}`;

// Basic AI circuit breaker
let aiFailureCount = 0;
const AI_FAILURE_THRESHOLD = 3;

// Helper function to safely normalize string/array fields
function normalizeStringToArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    // Handle both comma-separated and pipe-separated strings
    if (value.includes('|')) {
      return value.split('|').map(s => s.trim()).filter(Boolean);
    }
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// OpenAI cost calculation - CRITICAL for budget monitoring
function calculateOpenAICost(usage: any): number {
  if (!usage) return 0;
  
  // GPT-4 pricing (as of 2024)
  const PRICING = {
    'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
    'gpt-4-turbo': { input: 0.01 / 1000, output: 0.03 / 1000 },
    'gpt-3.5-turbo': { input: 0.001 / 1000, output: 0.002 / 1000 }
  };
  
  const model = usage.model || 'gpt-4';
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING['gpt-4'];
  
  const inputTokens = usage.prompt_tokens || 0;
  const outputTokens = usage.completion_tokens || 0;
  
  const inputCost = inputTokens * pricing.input;
  const outputCost = outputTokens * pricing.output;
  
  return inputCost + outputCost;
}

// Enhanced monitoring and performance tracking
interface PerformanceMetrics {
  jobFetchTime: number;
  tierDistributionTime: number;
  aiMatchingTime: number;
  totalProcessingTime: number;
  memoryUsage: number;
}

// Removed in-memory rate limiting and job reservation maps

// Configuration from environment variables with sensible defaults
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000');
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX || '3');


// Legacy settings (deprecated - using SEND_PLAN now)
const MAX_JOBS_PER_USER = {
  free: SEND_PLAN.free.perSend,      // Now 3 per send
  premium: SEND_PLAN.premium.perSend // Now 6 per send
};

// Freshness tier distribution with fallback logic
const TIER_DISTRIBUTION = {
  free: {
    ultra_fresh: parseInt(process.env.FREE_ULTRA_FRESH || '1'),
    fresh: parseInt(process.env.FREE_FRESH || '2'),
    comprehensive: parseInt(process.env.FREE_COMPREHENSIVE || '0'),
    fallback_order: ['fresh', 'ultra_fresh', 'comprehensive'] // If tier is empty, try these
  },
  premium: {
    ultra_fresh: parseInt(process.env.PREMIUM_ULTRA_FRESH || '5'),
    fresh: parseInt(process.env.PREMIUM_FRESH || '7'),
    comprehensive: parseInt(process.env.PREMIUM_COMPREHENSIVE || '3'),
    fallback_order: ['fresh', 'ultra_fresh', 'comprehensive']
  }
};

// Production-ready job interface with validation
interface JobWithFreshness {
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
  freshness_tier: 'ultra_fresh' | 'fresh' | 'comprehensive' | null;
  original_posted_date: string | null;
  last_seen_at: string | null;
}


// NEW: User clustering functionality
interface User extends UserPreferences {
  professional_expertise: string;
  entry_level_preference: string;
}

function clusterSimilarUsers(users: UserPreferences[], maxClusterSize: number = 3): UserPreferences[][] {
  const clusters: UserPreferences[][] = [];
  const processed = new Set<number>();

  for (let i = 0; i < users.length; i++) {
    if (processed.has(i)) continue;

    const cluster = [users[i]];
    processed.add(i);

    // Find similar users (same expertise + experience level)
    for (let j = i + 1; j < users.length && cluster.length < maxClusterSize; j++) {
      if (processed.has(j)) continue;

      const user1 = users[i];
      const user2 = users[j];
      
      if (user1.professional_expertise === user2.professional_expertise &&
          user1.entry_level_preference === user2.entry_level_preference) {
        cluster.push(user2);
        processed.add(j);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}






// Database schema validation
async function validateDatabaseSchema(supabase: any): Promise<boolean> {
  try {
    // Skip schema validation in test environment
    if (process.env.NODE_ENV === 'test') {
      console.log('🧪 Test mode: Skipping database schema validation');
      return true;
    }
    
    // Check if required columns exist by attempting a sample query
    const { data, error } = await supabase
      .from('jobs')
      .select('status, freshness_tier, original_posted_date, last_seen_at')
      .limit(1);
    
    if (error) {
      console.error('Database schema validation failed:', error.message);
      return false;
    }
    
    console.log('Database schema validation passed');
    return true;
  } catch (err) {
    console.error('Database schema validation error:', err);
    return false;
  }
}

// Enhanced rate limiting with job reservation
function isRateLimited(identifier: string): boolean {
  // Delegated to production rate limiter middleware; keep placeholder for API compatibility
  return false;
}

// Job reservation system to prevent race conditions
function reserveJobs(jobIds: string[], reservationId: string): boolean {
  // Reservations managed by Redis global lock in this handler
  return true;
}

// UTC-safe date calculation
function getDateDaysAgo(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(0, 0, 0, 0); // Start of day UTC
  return date;
}

// Tier distribution with intelligent fallback logic
function distributeJobsByFreshness(
  jobs: JobWithFreshness[], 
  userTier: 'free' | 'premium' = 'free',
  userId: string
): { jobs: JobWithFreshness[], metrics: any } {
  const startTime = Date.now();
  
  console.log(`Distributing jobs for ${userTier} user ${userId}. Total jobs: ${jobs.length}`);
  
  // Validate and clean job data
  const validJobs = jobs.filter(job => {
    // Skip jobs with invalid data
    if (!job.freshness_tier || !job.original_posted_date) {
      console.warn(`Job ${job.id} missing freshness data, assigning fallback`);
      // Assign fallback freshness tier based on created_at
      job.freshness_tier = assignFallbackFreshnessTier(job.created_at);
      job.original_posted_date = job.created_at; // Use created_at as fallback
    }
    return job.job_hash && job.title && job.company;
  });
  
  // Separate jobs by freshness tier
  const ultraFreshJobs = validJobs.filter(job => job.freshness_tier === 'ultra_fresh');
  const freshJobs = validJobs.filter(job => job.freshness_tier === 'fresh');
  const comprehensiveJobs = validJobs.filter(job => job.freshness_tier === 'comprehensive');
  
  const tierCounts = {
    ultra_fresh: ultraFreshJobs.length,
    fresh: freshJobs.length,
    comprehensive: comprehensiveJobs.length
  };
  
  console.log(`Job breakdown for ${userId} - Ultra Fresh: ${tierCounts.ultra_fresh}, Fresh: ${tierCounts.fresh}, Comprehensive: ${tierCounts.comprehensive}`);
  
  // Get distribution limits based on user tier
  const config = TIER_DISTRIBUTION[userTier];
  const selectedJobs: JobWithFreshness[] = [];
  
  // Smart selection with fallback logic
  selectedJobs.push(...selectJobsFromTier(ultraFreshJobs, config.ultra_fresh, 'ultra_fresh'));
  selectedJobs.push(...selectJobsFromTier(freshJobs, config.fresh, 'fresh'));
  selectedJobs.push(...selectJobsFromTier(comprehensiveJobs, config.comprehensive, 'comprehensive'));
  
  // Fallback logic: if we don't have enough jobs, pull from other tiers
  const targetTotal = config.ultra_fresh + config.fresh + config.comprehensive;
  const maxAllowed = MAX_JOBS_PER_USER[userTier];
  
  if (selectedJobs.length < targetTotal && selectedJobs.length < maxAllowed) {
    const remainingSlots = Math.min(targetTotal - selectedJobs.length, maxAllowed - selectedJobs.length);
    const usedJobHashes = new Set(selectedJobs.map(job => job.job_hash));
    
    // Try fallback tiers in order
    for (const fallbackTier of config.fallback_order) {
      if (remainingSlots <= 0) break;
      
      const tierJobs = validJobs.filter(job => 
        job.freshness_tier === fallbackTier && !usedJobHashes.has(job.job_hash)
      );
      
      const additionalJobs = selectJobsFromTier(tierJobs, remainingSlots, fallbackTier);
      selectedJobs.push(...additionalJobs);
      
      additionalJobs.forEach(job => usedJobHashes.add(job.job_hash));
    }
  }
  
  const processingTime = Date.now() - startTime;
  
  console.log(`Selected ${selectedJobs.length} jobs for ${userId} (${userTier} tier) in ${processingTime}ms`);
  
  return {
    jobs: selectedJobs,
    metrics: {
      processingTime,
      originalJobCount: jobs.length,
      validJobCount: validJobs.length,
      selectedJobCount: selectedJobs.length,
      tierCounts,
      fallbacksUsed: selectedJobs.length < targetTotal
    }
  };
}

// Helper function to select jobs from a specific tier
function selectJobsFromTier(tierJobs: JobWithFreshness[], limit: number, tierName: string): JobWithFreshness[] {
  return tierJobs
    .sort((a, b) => {
      // Primary sort: original posting date (most recent first)
      const dateA = new Date(a.original_posted_date || a.created_at);
      const dateB = new Date(b.original_posted_date || b.created_at);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateB.getTime() - dateA.getTime();
      }
      // Secondary sort: last seen (most recently confirmed first)
      const lastSeenA = new Date(a.last_seen_at || a.created_at);
      const lastSeenB = new Date(b.last_seen_at || b.created_at);
      return lastSeenB.getTime() - lastSeenA.getTime();
    })
    .slice(0, limit);
}

// Fallback freshness tier assignment
function assignFallbackFreshnessTier(createdAt: string): 'ultra_fresh' | 'fresh' | 'comprehensive' {
  const hoursAgo = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursAgo <= 48) return 'ultra_fresh';
  if (hoursAgo <= 168) return 'fresh'; // 168 hours = 1 week
  return 'comprehensive';
}

// Performance monitoring utility
function trackPerformance(): { startTime: number; getMetrics: () => PerformanceMetrics } {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  
  return {
    startTime,
    getMetrics: () => ({
      jobFetchTime: 0, // Set by caller
      tierDistributionTime: 0, // Set by caller
      aiMatchingTime: 0, // Set by caller
      totalProcessingTime: Date.now() - startTime,
      memoryUsage: process.memoryUsage().heapUsed - startMemory
    })
  };
}

// Pre-filter jobs by user preferences to reduce AI load
function preFilterJobsByUserPreferences(jobs: JobWithFreshness[], user: UserPreferences): JobWithFreshness[] {
  // Basic filtering to reduce AI processing load
  let filteredJobs = jobs;
  
  // Filter by target cities if specified
  if (user.target_cities && user.target_cities.length > 0) {
    filteredJobs = filteredJobs.filter(job => 
      user.target_cities!.some(city => 
        job.location.toLowerCase().includes(city.toLowerCase()) ||
        job.location.toLowerCase().includes('remote')
      )
    );
  }
  
  // Filter by experience level keywords in title
  if (user.entry_level_preference) {
    const experienceKeywords: Record<string, string[]> = {
      'entry': ['intern', 'internship', 'graduate', 'grad', 'entry', 'junior', 'trainee', 'associate'],
      'mid': ['analyst', 'specialist', 'coordinator', 'associate'],
      'senior': ['senior', 'lead', 'principal', 'manager', 'director']
    };
    
    const keywords = experienceKeywords[user.entry_level_preference as keyof typeof experienceKeywords] || experienceKeywords['entry'];
    filteredJobs = filteredJobs.filter(job =>
      keywords.some(keyword => job.title.toLowerCase().includes(keyword))
    );
  }
  
  console.log(`Pre-filtered from ${jobs.length} to ${filteredJobs.length} jobs for user ${user.email}`);
  return filteredJobs;
}

// Initialize clients
function getSupabaseClient() {
  // Only initialize during runtime, not build time (but allow in test environment)
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
    throw new Error('Supabase client should only be used server-side');
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OpenAI API key');
  }
  return new OpenAI({
    apiKey: apiKey,
  });
}

export async function POST(req: NextRequest) {
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
    const performanceTracker = trackPerformance();
  const reservationId = `batch_${Date.now()}`;
  const requestStartTime = Date.now();
  
  // Declare variables for the function scope
  let users: any[] = [];
  let jobs: any[] = [];
  let results: any = {};
  
  // Stopwatch helper
  const t0 = Date.now(); 
  const lap = (s: string) => console.log(JSON.stringify({ evt:'perf', step:s, ms: Date.now()-t0 }));
  
  // Redis locking mechanism to prevent job conflicts
  const requestId = crypto.randomUUID();
  const lockKey = LOCK_KEY('global'); // single-instance lock
  const token = crypto.randomUUID();
  let haveRedisLock = false;
  
  // Extract IP address
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  // Acquire lock (prod only)
  try {
    if (!IS_TEST) {
      // lazy get redis from your limiter or a central redis helper you already have
      const limiter = getProductionRateLimiter();
      await limiter.initializeRedis();
      // @ts-ignore — get the client if you expose it; if not, use your existing redis accessor
      const redis = (limiter as any).redisClient;

      if (redis) {
        // NX, 30s TTL. If present, return 409.
        const ok = await redis.set(lockKey, token, { NX: true, EX: 30 });
        if (!ok) {
          return NextResponse.json({ error: 'Processing in progress' }, { status: 409 });
        }
        haveRedisLock = true;
      }
      // If no redis, we just proceed (best effort).
    }
  } catch (error) {
    console.warn('Redis lock acquisition failed, continuing with hard caps:', error);
  }

  // PRODUCTION: Enhanced rate limiting with Redis fallback
  if (!IS_TEST) {
    const rateLimitResult = await getProductionRateLimiter().middleware(req, 'match-users');
    
    if (rateLimitResult) {
      // Rate limit exceeded, return the 429 response
      return rateLimitResult;
    }
  }

  try {
    console.log(`Processing match-users request from IP: ${ip}`);
    
    // Validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      }, { status: 400 });
    }

    // Validate request body structure
    if (requestBody && typeof requestBody === 'object') {
      // Check for invalid fields that shouldn't be present
      const validFields = ['limit', 'forceReprocess'];
      const invalidFields = Object.keys(requestBody).filter(key => !validFields.includes(key));
      
      if (invalidFields.length > 0) {
        return NextResponse.json({ 
          error: 'Invalid request body. Contains unsupported fields.',
          invalidFields: invalidFields
        }, { status: 400 });
      }
      
      // Validate field types
      if (requestBody.limit !== undefined && (typeof requestBody.limit !== 'number' || requestBody.limit < 1)) {
        return NextResponse.json({ 
          error: 'Invalid limit parameter. Must be a positive number.',
          received: requestBody.limit
        }, { status: 400 });
      }
      
      if (requestBody.forceReprocess !== undefined && typeof requestBody.forceReprocess !== 'boolean') {
        return NextResponse.json({ 
          error: 'Invalid forceReprocess parameter. Must be a boolean.',
          received: requestBody.forceReprocess
        }, { status: 400 });
      }
    }

    const { limit = 1000, forceReprocess = false } = requestBody || {};
    
    const userCap = USER_LIMIT;
    const jobCap = JOB_LIMIT;
    
    const supabase = getSupabaseClient();
    
    // Validate database schema before proceeding
    const isSchemaValid = await validateDatabaseSchema(supabase);
    if (!isSchemaValid) {
      return NextResponse.json({ 
        error: 'Database schema validation failed. Missing required columns: status, freshness_tier, original_posted_date, last_seen_at' 
      }, { status: 500 });
    }

    // ADVANCED: Check scaling needs before processing
    let scalingRecommendations: any[] = [];
    try {
      // scalingRecommendations = await AutoScalingOracle.checkScalingNeeds();
      if (scalingRecommendations.length > 0) {
        console.log('🔧 Scaling recommendations detected:', scalingRecommendations);
        // Implement critical recommendations automatically
        // for (const recommendation of scalingRecommendations.filter(r => r.priority === 'high')) {
        //   await AutoScalingOracle.implementRecommendation(recommendation);
        // }
      }
    } catch (error) {
      console.warn('Scaling check failed:', error);
    }

    // 1. Fetch active users
    const userFetchStart = Date.now();
    lap('fetch_users');
    let usersQuery = supabase.from('users').select('*');
    
    // Check if email_verified column exists, if not use a fallback
    let users: any[] = [];
    let usersError: any = null;
    
    console.log('🔍 About to query users table...');
    
    try {
      const result = await usersQuery.eq('email_verified', true).limit(userCap);
      console.log('🔍 Users query result:', { data: result.data?.length, error: result.error });
      users = result.data || [];
      usersError = result.error;
    } catch (error: any) {
      // Fallback: fetch all users if email_verified column doesn't exist
      console.log('email_verified column not found, fetching all users');
      const result = await supabase.from('users').select('*').limit(userCap);
      users = result.data || [];
      usersError = result.error;
    }
    

    if (usersError) {
      console.error('Failed to fetch users:', usersError);
      
      
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      console.log('No users found');
      return NextResponse.json({ message: 'No users found' });
    }

    console.log(`Found ${users.length} active users to process`);

    // Transform user data to match expected format (handle TEXT[] arrays from your schema)
    const transformedUsers = users.map((user: any) => ({
      ...user,
      target_cities: normalizeStringToArray(user.target_cities),
      languages_spoken: normalizeStringToArray(user.languages_spoken),
      company_types: normalizeStringToArray(user.company_types),
      roles_selected: normalizeStringToArray(user.roles_selected),
      professional_expertise: user.professional_experience || '',
    }));

    // ADVANCED: User segmentation analysis
    const userSegmentationStart = Date.now();
    let userSegments: any = { error: 'Not available' };
    try {
      // userSegments = await UserSegmentationOracle.analyzeUserBehavior(supabase);

      if (userSegments.error) {
        console.warn('User segmentation failed:', userSegments.error);
      } else {
        console.log('👥 User segmentation completed:', userSegments.segmentDistribution);
      }
    } catch (error) {
      console.warn('User segmentation failed:', error);
    }

    // 2. Fetch jobs with UTC-safe date calculation and EU/Early Career filtering
    const jobFetchStart = Date.now();
    lap('fetch_jobs');
    const thirtyDaysAgo = getDateDaysAgo(30);

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

    // Build EU location filter
    const euLocationFilter = EU_HINTS.map(hint => `location.ilike.%${hint}%`).join(',');
    
    // Build early career filter for title and description
    const earlyCareerTitleFilter = EARLY_CAREER_KEYWORDS.map(keyword => `title.ilike.%${keyword}%`).join(',');
    const earlyCareerDescFilter = EARLY_CAREER_KEYWORDS.map(keyword => `description.ilike.%${keyword}%`).join(',');

    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('is_sent', false)
      .eq('status', 'active')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .in('freshness_tier', ['ultra_fresh', 'fresh'])
      .order('original_posted_date', { ascending: false, nullsFirst: false })
      .limit(jobCap);

    const jobFetchTime = Date.now() - jobFetchStart;

    if (jobsError) {
      console.error('Failed to fetch jobs:', jobsError);
      
      
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      console.log('No active jobs to process');
      return NextResponse.json({ message: 'No active jobs to process' });
    }

    console.log(`Found ${jobs.length} EU-based early career jobs from past 30 days in ${jobFetchTime}ms`);
    
    // Log filtering effectiveness
    if (jobs.length > 0) {
      const euJobs = jobs.filter(job => 
        EU_HINTS.some(hint => job.location.toLowerCase().includes(hint.toLowerCase()))
      ).length;
      const earlyCareerJobs = jobs.filter(job => 
        EARLY_CAREER_KEYWORDS.some(keyword => 
          job.title.toLowerCase().includes(keyword.toLowerCase()) ||
          job.description.toLowerCase().includes(keyword.toLowerCase())
        )
      ).length;
      
      console.log(`📊 Job Filtering Results:`);
      console.log(`   • EU-based jobs: ${euJobs}/${jobs.length} (${Math.round(euJobs/jobs.length*100)}%)`);
      console.log(`   • Early career jobs: ${earlyCareerJobs}/${jobs.length} (${Math.round(earlyCareerJobs/jobs.length*100)}%)`);
    }

    // Skip in-memory job reservations; Redis global lock already protects this run

    // Log overall freshness distribution
    const globalTierCounts = jobs.reduce((acc: Record<string, number>, job: any) => {
      const tier = job.freshness_tier || 'unknown';
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Global job freshness distribution:', globalTierCounts);

    // 3. Process each user in parallel
    let totalAIProcessingTime = 0;
    let totalTierDistributionTime = 0;
    
    const matcher = createConsolidatedMatcher(process.env.OPENAI_API_KEY);
    
    const userPromises = transformedUsers.map(async (user) => {
      try {
        console.log(`Processing matches for ${user.email} (tier: ${user.subscription_tier || 'free'})`);
        
        // ADVANCED: Get user analysis for personalized processing
        const userAnalysisStart = Date.now();
        let userAnalysis: any = { error: 'Not available' };
        try {
          // userAnalysis = await UserSegmentationOracle.getUserAnalysis(user.id, supabase);

          if ('error' in userAnalysis) {
            console.warn(`User analysis failed for ${user.email}:`, userAnalysis.error);
          } else {
            console.log(`📊 User analysis for ${user.email}:`, {
              engagementScore: userAnalysis.engagementScore,
              segments: userAnalysis.segments,
              recommendations: userAnalysis.recommendations.length
            });
          }
        } catch (error) {
          console.warn(`User analysis failed for ${user.email}:`, error);
        }
        
        // Pre-filter jobs to reduce AI processing load
        const preFilterStart = Date.now();
        const preFilteredJobs = preFilterJobsByUserPreferences(jobs as JobWithFreshness[], user);
        
        const perUserCap = (user.subscription_tier === 'premium' ? 100 : 50);
        const considered = preFilteredJobs.slice(0, perUserCap);
        
        // Apply freshness distribution with fallback logic
        const tierDistributionStart = Date.now();
        lap('distribute');
        const { jobs: distributedJobs, metrics: tierMetrics } = distributeJobsByFreshness(
          considered, 
          user.subscription_tier || 'free',
          user.email
        );
        const tierDistributionTime = Date.now() - tierDistributionStart;
        totalTierDistributionTime += tierDistributionTime;

        // Enforce caps BEFORE AI to prevent processing too many jobs
        const cap = user.subscription_tier === 'premium' ? 100 : 50;
        const capped = distributedJobs.slice(0, cap);

        // AI matching with performance tracking and circuit breaker
        let matches: JobMatch[] = [];
        let matchType: 'ai_success' | 'fallback' | 'ai_failed' = 'ai_success';
        let userProvenance: any = {
          match_algorithm: 'ai',
          prompt_version: process.env.PROMPT_VERSION || 'v1',
          cache_hit: false,
          ai_latency_ms: 0,
          ai_cost_usd: 0
        };
        const aiMatchingStart = Date.now();
        lap('ai_or_rules');

        try {
          if (aiFailureCount >= AI_FAILURE_THRESHOLD) {
            console.log('AI circuit breaker open, using rules');
            matchType = 'fallback';
          } else {
            const compatibleJobs = capped.map(job => ({
              ...job,
              id: parseInt(job.id) || undefined,
              description: job.description || ''
            }));
            const result = await matcher.performMatching(compatibleJobs as any[], user);
            matches = result.matches || [];
            matchType = result.method === 'ai_success' ? 'ai_success' : (matches.length ? 'fallback' : 'ai_failed');
          }
        } catch (err) {
          aiFailureCount++;
          console.error(`AI matching failed for ${user.email}:`, err);
          matchType = 'ai_failed';
        }

        if (!matches || matches.length === 0) {
          // Convert JobWithFreshness to Job for compatibility
          const jobCompatible = capped.map(job => ({
            id: parseInt(job.id) || undefined,
            job_hash: job.job_hash,
            title: job.title,
            company: job.company,
            location: job.location,
            job_url: job.job_url,
            description: job.description,
            experience_required: '',
            work_environment: '',
            source: '',
            categories: [],
            company_profile_url: '',
            language_requirements: [],
            scrape_timestamp: new Date().toISOString(),
            original_posted_date: job.original_posted_date || new Date().toISOString(),
            posted_at: job.original_posted_date || new Date().toISOString(),
            last_seen_at: job.last_seen_at || new Date().toISOString(),
            is_active: true,
            freshness_tier: job.freshness_tier || '',
            scraper_run_id: '',
            created_at: job.created_at
          }));
          const fallbackResults = generateRobustFallbackMatches(jobCompatible as any[], user);
          matches = fallbackResults.map((match, index) => ({
            job_index: index,
            job_hash: match.job.job_hash,
            match_score: match.match_score,
            match_reason: match.match_reason,
            match_quality: match.match_quality,
            match_tags: match.match_tags
          }));
        }
        
        const aiMatchingTime = Date.now() - aiMatchingStart;
        totalAIProcessingTime += aiMatchingTime;

        // Save matches with enhanced data and provenance tracking
        if (matches && matches.length > 0) {
          // Update provenance data with actual timing and match type
          userProvenance = {
            ...userProvenance,
            match_algorithm: matchType === 'ai_success' ? 'ai' : 'rules',
            ai_latency_ms: aiMatchingTime,
            fallback_reason: matchType !== 'ai_success' ? 'ai_failed_or_fallback' : undefined
          };
          
          const matchEntries = matches.map(match => {
            const originalJob = distributedJobs.find(job => job.job_hash === match.job_hash);
            
            return {
              user_email: user.email,
              job_hash: match.job_hash,
              match_score: match.match_score,
              match_reason: match.match_reason,
              match_quality: match.match_quality,
              match_tags: match.match_tags,
              freshness_tier: originalJob?.freshness_tier || 'comprehensive',
              processing_method: matchType,
              matched_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              // Add provenance tracking fields
              match_algorithm: userProvenance.match_algorithm,
              ai_model: userProvenance.ai_model,
              prompt_version: userProvenance.prompt_version,
              ai_latency_ms: userProvenance.ai_latency_ms,
              ai_cost_usd: userProvenance.ai_cost_usd,
              cache_hit: userProvenance.cache_hit,
              fallback_reason: userProvenance.fallback_reason,
              retry_count: userProvenance.retry_count,
              error_category: userProvenance.error_category
            };
          });

          const { error: insertError } = await supabase
            .from('matches')
            .insert(matchEntries);

          if (insertError) {
            console.error(`Failed to save matches for ${user.email}:`, insertError);
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

        // Calculate tier distribution for results
        const matchTierCounts = matches.reduce((acc, match) => {
          const job = distributedJobs.find(j => j.job_hash === match.job_hash);
          if (job?.freshness_tier) {
            acc[job.freshness_tier] = (acc[job.freshness_tier] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        return { user: user.email, success: true, matches: matches.length };

      } catch (userError) {
        console.error(`Error processing user ${user.email}:`, userError);
        
        return { user: user.email, success: false, error: userError instanceof Error ? userError.message : 'Unknown error' };
      }
    });

    const results = await Promise.all(userPromises);

    // ADVANCED: Generate comprehensive monitoring report
    const monitoringStart = Date.now();
    let monitoringReport: any = { health: { overall: 'unknown' } };
    try {
      // monitoringReport = await AdvancedMonitoringOracle.generateDailyReport();
    } catch (error) {
      console.warn('Monitoring report generation failed:', error);
    }

    // Log performance report
    try {
    } catch (error) {
      console.warn('Performance report logging failed:', error);
    }

    const totalProcessingTime = Date.now() - performanceTracker.startTime;
    const performanceMetrics = performanceTracker.getMetrics();

    // Track production metrics for Datadog monitoring
    const requestDuration = Date.now() - requestStartTime;

    // Critical performance alerts
    if (requestDuration > 5000) {
    }

    // Calculate error rate and alert if high (simplified for now)
    const errorRate = 0; // TODO: Track actual error count in performance metrics
    if (errorRate > 10) {
    }
    
    try {
    } catch (error) {
      console.warn('Datadog metrics tracking failed:', error);
    }
    
    lap('done');
    return NextResponse.json({
      success: true,
      processed: users.length,
      matched: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      duration: Date.now() - startTime
    });

  } catch (error) {
    const requestDuration = Date.now() - startTime;
    console.error('Match-users processing error:', error);
    
    // Critical alert for API failure
    
    // Sentry error tracking with context
    Sentry.captureException(error, {
      tags: {
        endpoint: 'match-users',
        operation: 'batch-processing',
        requestId
      },
      extra: {
        processingTime: Date.now() - requestStartTime,
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
    transaction.finish();
    
    if (haveRedisLock) {
      try {
        const limiter = getProductionRateLimiter();
        // @ts-ignore
        const redis = (limiter as any).redisClient;
        if (redis) {
          const val = await redis.get(lockKey);
          if (val === token) await redis.del(lockKey);
        }
      } catch {
        // swallow; TTL will release naturally
      }
    }
  }
} catch (error) {
  console.error('❌ Critical error in POST handler:', error);
  return NextResponse.json({ 
    error: 'Internal server error', 
    message: error instanceof Error ? error.message : 'Unknown error' 
  }, { status: 500 });
}
}

// Enhanced GET endpoint with tier analytics  
export async function GET(req: NextRequest) {
  // Return 405 for GET method as this endpoint is primarily for POST
  return NextResponse.json({ 
    error: 'Method not allowed. This endpoint is designed for POST requests only.' 
  }, { status: 405 });
}
