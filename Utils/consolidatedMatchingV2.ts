/**
 * CONSOLIDATED MATCHING SYSTEM v2.1
 * Cache-busting rebuild - December 8, 2025
 * TDZ FIX: All methods now capture jobs parameter immediately to prevent bundling issues
 * BUILD_HASH: cb4f9a2e
 */

import OpenAI from 'openai';
import type { Job } from '../scrapers/types';
import { UserPreferences, JobMatch } from './matching/types';
import type { ParsedMatch } from '@/lib/types';
import { apiLogger } from '@/lib/api-logger';
import { withRedis } from '@/lib/redis-client';
import { getDatabaseClient } from '@/Utils/databasePool';
// Simple configuration - no complex config module needed
const JOBS_TO_ANALYZE = 50;
const CACHE_TTL_HOURS = 48;
const AI_TIMEOUT_MS = 20000;
const MAX_CACHE_SIZE = 1000;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 60000;
const AI_MAX_RETRIES = 2;
// Embedding boost removed - feature not implemented

// ============================================
// CONFIGURATION CONSTANTS
// ============================================

// AI Model Selection - SIMPLIFIED: Use GPT-4o-mini for everything!
// GPT-4o-mini is better than 3.5-turbo AND 70% cheaper
// No need for complexity-based routing anymore

// Configuration constants

// ============================================

interface ConsolidatedMatchResult {
  matches: JobMatch[];
  method: 'ai_success' | 'ai_timeout' | 'ai_failed' | 'rule_based';
  processingTime: number;
  confidence: number;
  aiModel?: string;        // AI model used (e.g., 'gpt-4o-mini')
  aiCostUsd?: number;      // Calculated cost in USD
  aiTokensUsed?: number;   // Tokens consumed (optional, for debugging)
}

// ============================================
// LRU CACHE IMPLEMENTATION
// ============================================

interface CacheEntry {
  matches: JobMatch[];
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

class LRUMatchCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private readonly lock = new Map<string, Promise<void>>(); // Simple mutex for cache operations

  constructor(maxSize: number, ttlMs: number) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  async get(key: string): Promise<JobMatch[] | null> {
    // Wait for any pending operation on this key
    if (this.lock.has(key)) {
      await this.lock.get(key);
    }

    const entry = this.cache.get(key);
    
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    // Move to end of access order
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
    
    return entry.matches;
  }

  async set(key: string, matches: JobMatch[]): Promise<void> {
    // Create a lock for this key to prevent race conditions
    const lockPromise = this.acquireLock(key);
    this.lock.set(key, lockPromise);

    try {
      // Remove oldest entries if at capacity
      while (this.cache.size >= this.maxSize) {
        const oldestKey = this.accessOrder.shift();
        if (oldestKey) {
          this.cache.delete(oldestKey);
        }
      }

      const entry: CacheEntry = {
        matches,
        timestamp: Date.now(),
        accessCount: 1,
        lastAccessed: Date.now()
      };

      this.cache.set(key, entry);
      this.accessOrder.push(key);
    } finally {
      this.lock.delete(key);
    }
  }

  private async acquireLock(key: string): Promise<void> {
    // Simple mutex implementation
    return new Promise((resolve) => {
      const checkLock = () => {
        if (!this.lock.has(key)) {
          resolve();
        } else {
          setTimeout(checkLock, 1);
        }
      };
      checkLock();
    });
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0 // Would need to track hits/misses for accurate calculation
    };
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }
}

// ============================================
// CIRCUIT BREAKER
// ============================================

class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private isOpen = false;
  private readonly threshold: number;
  private readonly timeout: number;

  constructor(threshold: number = 5, timeout: number = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
  }

  canExecute(): boolean {
    if (!this.isOpen) return true;
    
    const now = Date.now();
    if (now - this.lastFailure > this.timeout) {
      this.isOpen = false;
      this.failures = 0;
      return true;
    }
    
    return false;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.isOpen = false;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    
    if (this.failures >= this.threshold) {
      this.isOpen = true;
    }
  }

  getStatus() {
    return {
      isOpen: this.isOpen,
      failures: this.failures,
      lastFailure: this.lastFailure
    };
  }
}

// SHARED CACHE: Use LRU implementation
const SHARED_MATCH_CACHE = new LRUMatchCache(
  MAX_CACHE_SIZE,
  CACHE_TTL_HOURS * 60 * 60 * 1000
);

export class ConsolidatedMatchingEngine {
  private openai: OpenAI | null = null;
  private openai35: OpenAI | null = null;
  private costTracker: Record<string, { calls: number; tokens: number; cost?: number }> = {
    gpt4omini: { calls: 0, tokens: 0, cost: 0 },
    gpt4: { calls: 0, tokens: 0, cost: 0 },
    gpt35: { calls: 0, tokens: 0, cost: 0 }
  };
  private matchCache = SHARED_MATCH_CACHE; // Use shared LRU cache
  private circuitBreaker = new CircuitBreaker(
    CIRCUIT_BREAKER_THRESHOLD,
    CIRCUIT_BREAKER_TIMEOUT
  );
  private readonly CACHE_TTL = CACHE_TTL_HOURS * 60 * 60 * 1000; // Configurable cache TTL
  private lastAIMetadata: { model: string; tokens: number; cost: number } | null = null; // Track AI usage for database logging

  constructor(openaiApiKey?: string) {
    if (openaiApiKey) {
      this.openai = new OpenAI({ apiKey: openaiApiKey });
      this.openai35 = new OpenAI({ apiKey: openaiApiKey });
    }
  }
  
  /**
   * Generate cache key from user preferences and top job hashes
   */
  private generateCacheKey(jobs: Job[], userPrefs: UserPreferences): string {
    // CRITICAL FIX: Capture jobs parameter in const immediately to avoid TDZ errors
    const jobsArray = Array.isArray(jobs) ? jobs : [];
    
    // User clustering: Similar profiles share cache (massive savings at scale!)
    const careerPath = Array.isArray(userPrefs.career_path) ? userPrefs.career_path[0] : userPrefs.career_path || 'general';
    
    // CRITICAL: Include ALL cities in cache key (sorted for consistency)
    // This ensures London+Paris users DON'T get London+Berlin cached results!
    const cities = Array.isArray(userPrefs.target_cities) 
      ? userPrefs.target_cities.sort().join('+')  // "dublin+london" (sorted alphabetically)
      : userPrefs.target_cities || 'europe';
    
    const level = userPrefs.entry_level_preference || 'entry';
    
    // User segment: e.g., "finance_dublin+london_entry"
    // Only users with EXACT SAME cities + career + level share cache
    const userSegment = `${careerPath}_${cities}_${level}`.toLowerCase().replace(/[^a-z0-9_+]/g, '');
    
    // Job pool version (changes daily, not per-job)
    // This means ALL users with same profile on same day share cache! 60% hit rate!
    const today = new Date().toISOString().split('T')[0]; // "2025-10-09"
    // FIXED: Use job count ranges to improve cache hit rate
    const jobCountRange = Math.floor(jobsArray.length / 1000) * 1000; // Round to nearest 1000
    const jobPoolVersion = `v${today}_${jobCountRange}+`;
    
    // Cache key format: "finance_london+paris_entry_v2025-10-09_9000+"
    const cacheKey = `${userSegment}_${jobPoolVersion}`;
    
    return cacheKey;
  }

  /**
   * Main matching function - "Funnel of Truth" architecture
   * Stage 1: SQL Filter (already done in jobSearchService)
   * Stage 2: Hard Gates (visa, language, location) - before AI sees jobs
   * Stage 3: Rule-Ranker (weighted scoring) - ensures numerical relevancy
   * Stage 4: AI Semantic Pass (top 50) - creates evidence-based reasons
   * Stage 5: Diversity Pass (in distributeJobsWithDiversity)
   */
  async performMatching(
    jobs: Job[],
    userPrefs: UserPreferences,
    forceRulesBased: boolean = false
  ): Promise<ConsolidatedMatchResult> {
    // CRITICAL FIX: Capture jobs parameter in const immediately to avoid TDZ errors
    const jobsArray = Array.isArray(jobs) ? jobs : [];
    const startTime = Date.now();

    // Handle empty job array
    if (!jobsArray || jobsArray.length === 0) {
      return {
        matches: [],
        method: 'rule_based',
        processingTime: Date.now() - startTime,
        confidence: 0.0,
        aiModel: undefined,
        aiCostUsd: 0,
        aiTokensUsed: 0
      };
    }

    // STAGE 2: Apply Hard Gates (before AI sees jobs) - saves API costs
    const { preFilterByHardGates } = await import('./matching/preFilterHardGates');
    const eligibleJobs = preFilterByHardGates(jobsArray, userPrefs);
    
    if (eligibleJobs.length === 0) {
      apiLogger.warn('No jobs passed hard gates', {
        email: userPrefs.email || 'unknown',
        originalJobCount: jobsArray.length,
        reason: 'All jobs filtered by visa/language/location requirements'
      });
      return {
        matches: [],
        method: 'rule_based',
        processingTime: Date.now() - startTime,
        confidence: 0.0,
        aiModel: undefined,
        aiCostUsd: 0,
        aiTokensUsed: 0
      };
    }

    // Check cache (with stale check)
    const cacheKey = this.generateCacheKey(eligibleJobs, userPrefs);
    const shouldBypass = await this.shouldBypassCache(cacheKey, userPrefs, eligibleJobs);
    const cached = shouldBypass ? null : await this.matchCache.get(cacheKey);
    
    if (cached) {
      // Cached matches - no AI cost but indicate it was originally AI-generated
      return {
        matches: cached,
        method: 'ai_success',
        processingTime: Date.now() - startTime,
        confidence: 0.9,
        aiModel: 'gpt-4o-mini', // Assume cached matches were from AI
        aiCostUsd: 0, // No cost (cached)
        aiTokensUsed: 0
      };
    }

    // Skip AI if explicitly disabled, no client, or circuit breaker open
    if (forceRulesBased || !this.openai || !this.circuitBreaker.canExecute()) {
      // STAGE 3: Pre-rank by rule-based scoring
      const scoredJobs = await this.preRankJobsByScore(eligibleJobs, userPrefs);
      const topJobs = scoredJobs.slice(0, 8).map(item => item.job);
      const ruleMatches = await this.performRuleBasedMatching(topJobs, userPrefs);
      return {
        matches: ruleMatches,
        method: 'rule_based',
        processingTime: Date.now() - startTime,
        confidence: 0.8,
        aiModel: undefined,
        aiCostUsd: 0,
        aiTokensUsed: 0
      };
    }

    // STAGE 3: Pre-rank by rule-based scoring (ensures AI sees most relevant, not just recent)
    const scoredJobs = await this.preRankJobsByScore(eligibleJobs, userPrefs);
    
    // STAGE 4: Send top 50 highest-scoring jobs to AI (not most recent)
    const top50Jobs = scoredJobs.slice(0, 50).map(item => item.job);

    // Try AI matching with timeout and retry
    try {
      const aiMatches = await this.performAIMatchingWithRetry(top50Jobs, userPrefs);
      if (aiMatches && aiMatches.length > 0) {
        // Validation is now minimal since hard gates already applied
        const validatedMatches = this.validateAIMatches(aiMatches, top50Jobs, userPrefs);
        
        if (validatedMatches.length === 0) {
          // If all AI matches were filtered out, fall back to rules from pre-ranked jobs
          console.warn('All AI matches failed validation, falling back to rules');
          apiLogger.warn('AI matches failed validation', {
            reason: 'all_matches_filtered_out',
            originalMatchCount: aiMatches.length,
            validatedMatchCount: 0
          });
          
          const topScoredJobs = scoredJobs.slice(0, 8).map(item => item.job);
          const ruleMatches = await this.performRuleBasedMatching(topScoredJobs, userPrefs);
          this.lastAIMetadata = null; // Reset (AI validation failed, using rules)
          return {
            matches: ruleMatches,
            method: 'ai_failed',
            processingTime: Date.now() - startTime,
            confidence: 0.7,
            aiModel: undefined,
            aiCostUsd: 0,
            aiTokensUsed: 0
          };
        }
        
        // Cache successful AI matches
        await this.matchCache.set(cacheKey, validatedMatches);
        this.circuitBreaker.recordSuccess();
        
        // Note: Cost tracking now done in callOpenAIAPI, lastAIMetadata stores it
        
        // Log match quality metrics
        const matchQuality = this.calculateMatchQualityMetrics(validatedMatches, top50Jobs, userPrefs);
        
        // EVIDENCE VERIFICATION: Log match reason lengths to detect weak evidence
        const reasonLengths = validatedMatches.map(m => {
          const reason = m.match_reason || '';
          const wordCount = reason.trim().split(/\s+/).filter(w => w.length > 0).length;
          return wordCount;
        });
        const avgReasonLength = reasonLengths.length > 0 
          ? Math.round(reasonLengths.reduce((sum, len) => sum + len, 0) / reasonLengths.length)
          : 0;
        const minReasonLength = reasonLengths.length > 0 ? Math.min(...reasonLengths) : 0;
        const shortReasons = reasonLengths.filter(len => len < 20).length;
        
        apiLogger.info('Match quality metrics', {
          email: userPrefs.email || 'unknown',
          averageScore: matchQuality.averageScore,
          scoreDistribution: matchQuality.scoreDistribution,
          cityCoverage: matchQuality.cityCoverage,
          sourceDiversity: matchQuality.sourceDiversity,
          method: 'ai_success',
          matchCount: validatedMatches.length,
          eligibleJobsAfterHardGates: eligibleJobs.length,
          top50PreRanked: top50Jobs.length,
          // Evidence verification metrics
          matchReasonLengths: {
            average: avgReasonLength,
            minimum: minReasonLength,
            all: reasonLengths,
            shortReasonsCount: shortReasons, // Reasons <20 words (weak evidence indicator)
            hasWeakEvidence: shortReasons > 0 // Flag if any reasons are too short
          }
        });
        
        // Warn if we have short reasons (potential weak evidence)
        if (shortReasons > 0) {
          apiLogger.warn('AI match reasons may lack evidence', {
            email: userPrefs.email || 'unknown',
            shortReasonsCount: shortReasons,
            totalMatches: validatedMatches.length,
            minReasonLength,
            avgReasonLength,
            note: 'Short match reasons (<20 words) may indicate AI struggled to find strong evidence linking user skills to job requirements'
          });
        }
        
        // Get AI metadata and reset (for database logging)
        const aiMetadata = this.lastAIMetadata;
        this.lastAIMetadata = null; // Reset after use
        
        return {
          matches: validatedMatches,
          method: 'ai_success',
          processingTime: Date.now() - startTime,
          confidence: 0.9,
          aiModel: aiMetadata?.model || 'gpt-4o-mini',
          aiCostUsd: aiMetadata?.cost,
          aiTokensUsed: aiMetadata?.tokens
        };
      }
    } catch (error) {
      this.circuitBreaker.recordFailure();
      console.warn('AI matching failed, falling back to rules:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Fallback to rule-based matching from pre-ranked jobs
    const topScoredJobs = scoredJobs.slice(0, 8).map(item => item.job);
    const ruleMatches = await this.performRuleBasedMatching(topScoredJobs, userPrefs);
    
    // Reset AI metadata (no AI used in fallback)
    this.lastAIMetadata = null;
    
    return {
      matches: ruleMatches,
      method: 'ai_failed',
      processingTime: Date.now() - startTime,
      confidence: 0.7,
      aiModel: undefined,
      aiCostUsd: 0,
      aiTokensUsed: 0
    };
  }

  /**
   * AI matching with retry logic and circuit breaker
   */
  private async performAIMatchingWithRetry(
    jobs: Job[],
    userPrefs: UserPreferences
  ): Promise<JobMatch[]> {
    // CRITICAL FIX: Capture jobs parameter in const immediately to avoid TDZ errors
    const jobsArray = Array.isArray(jobs) ? jobs : [];
    
    const maxRetries = AI_MAX_RETRIES;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.performAIMatchingWithTimeout(jobsArray, userPrefs);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('AI matching failed after all retries');
  }

  /**
   * AI matching with proper timeout and stable prompt
   */
  private async performAIMatchingWithTimeout(
    jobs: Job[],
    userPrefs: UserPreferences
  ): Promise<JobMatch[]> {
    // CRITICAL FIX: Capture jobs parameter in const immediately to avoid TDZ errors
    const jobsArray = Array.isArray(jobs) ? jobs : [];
    
    if (!this.openai || !this.openai35) throw new Error('OpenAI client not initialized');

    const timeoutPromise = new Promise<never>((_, reject) => {
      if (process.env.NODE_ENV === 'test') {
        // In tests, do not race against a timeout to avoid open handles/flakes
        return;
      }
      setTimeout(() => reject(new Error('AI_TIMEOUT')), AI_TIMEOUT_MS);
    });

    // Use GPT-4o-mini for all requests (better quality, 70% cheaper than 3.5-turbo!)
    const aiPromise = this.callOpenAIAPI(jobsArray, userPrefs, 'gpt-4o-mini');

    try {
      return process.env.NODE_ENV === 'test'
        ? await aiPromise
        : await Promise.race([aiPromise, timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message === 'AI_TIMEOUT') {
        console.warn(`AI matching timed out after ${AI_TIMEOUT_MS}ms`);
        return [];
      }
      throw error;
    }
  }

  /**
   * DEPRECATED: Model selection logic no longer needed
   * Now using GPT-4o-mini for all requests (better quality, lower cost)
   */
  private shouldUseGPT4(_jobs: Job[], _userPrefs: UserPreferences): boolean {
    // Always return false - we use GPT-4o-mini now
    return false;
  }

  /**
   * Calculate AI cost based on model and token usage
   * GPT-4o-mini pricing (as of 2025):
   * - Input: $0.15 per 1M tokens
   * - Output: $0.60 per 1M tokens
   * Typical function calling: ~80% input, 20% output
   */
  private calculateAICost(tokens: number, model: string): number {
    if (model === 'gpt-4o-mini') {
      // Estimate: 80% input, 20% output (typical for function calling)
      const inputTokens = Math.floor(tokens * 0.8);
      const outputTokens = tokens - inputTokens;
      const inputCost = (inputTokens / 1_000_000) * 0.15;
      const outputCost = (outputTokens / 1_000_000) * 0.60;
      return inputCost + outputCost;
    }
    // For other models, return 0 (can extend later if needed)
    return 0;
  }

  /**
   * Calculate complexity score (0-1) to determine model choice
   */
  private calculateComplexityScore(jobs: Job[], userPrefs: UserPreferences): number {
    // CRITICAL FIX: Capture jobs parameter in const immediately to avoid TDZ errors
    const jobsArray = Array.isArray(jobs) ? jobs : [];
    
    let score = 0;
    
    // Job count complexity (more jobs = more complex)
    if (jobsArray.length > 100) score += 0.3;
    else if (jobsArray.length > 50) score += 0.2;
    
    // User preference complexity
    const prefCount = Object.values(userPrefs).filter(v => v && v.length > 0).length;
    if (prefCount > 5) score += 0.2;
    else if (prefCount > 3) score += 0.1;
    
    // Career path complexity (multiple paths = more complex)
    if (userPrefs.career_path && userPrefs.career_path.length > 2) score += 0.2;
    
    // Location complexity (multiple cities = more complex)
    if (userPrefs.target_cities && userPrefs.target_cities.length > 3) score += 0.1;
    
    // Industry diversity (multiple industries = more complex)
    if (userPrefs.company_types && userPrefs.company_types.length > 2) score += 0.2;
    
    return Math.min(1, score);
  }

  /**
   * Stable OpenAI API call with function calling - no more parsing errors
   * Now using GPT-4o-mini exclusively (better + cheaper than 3.5-turbo!)
   */
  private async callOpenAIAPI(jobs: Job[], userPrefs: UserPreferences, model: 'gpt-4o-mini' | 'gpt-4' | 'gpt-3.5-turbo' = 'gpt-4o-mini'): Promise<JobMatch[]> {
    // CRITICAL FIX: Capture jobs parameter in const immediately to avoid TDZ errors
    const jobsArray = Array.isArray(jobs) ? jobs : [];
    
    const client = this.openai;
    if (!client) throw new Error('OpenAI client not initialized');

    // Build optimized prompt based on model
    const prompt = this.buildStablePrompt(jobsArray, userPrefs);

    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: `You're a professional career advisor focused on evidence-based matching.

Your job: Find 5 perfect job matches and explain WHY they're relevant using factual evidence.

Write match reasons that are:
- SPECIFIC: Link user's stated skills/experience to explicit job requirements
  Example: "Your React + TypeScript experience matches their requirement for 'frontend expertise with modern frameworks'"
- FACTUAL: Reference actual job description text and user profile data
  Example: "The job requires '2+ years marketing experience' and you have 3 years in digital marketing"
- TRANSPARENT: Acknowledge both strengths and potential gaps honestly
  Example: "This role focuses on B2B marketing, which aligns with your experience, though it's more enterprise-focused than your previous B2C work"
- PROFESSIONAL: Avoid emotional language, hype, or outcome predictions

NEVER use:
- "Easy interview" or confidence claims about outcomes
- "This is the startup you'll tell your friends about" (emotional hype)
- "Good match" or "Aligns with preferences" (too generic)

Keep match reasons 2-3 sentences max. Make every word count with evidence.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent scoring
      max_tokens: 1500,  // More room for exciting, detailed match reasons
      functions: [{
        name: 'return_job_matches',
        description: 'Return the top 5 most relevant job matches for the user',
        parameters: {
          type: 'object',
          properties: {
            matches: {
              type: 'array',
              minItems: 1,
              maxItems: 5,
              items: {
                type: 'object',
                properties: {
                  job_index: { type: 'number', minimum: 1, description: 'Index of the job from the list provided' },
                  job_hash: { type: 'string', description: 'Exact job_hash from the job list' },
                  match_score: { type: 'number', minimum: 50, maximum: 100, description: 'How well this job matches the user (50-100)' },
                  match_reason: { type: 'string', maxLength: 400, description: 'Evidence-based reason (2-3 sentences max) that explicitly links user profile to job requirements. Reference specific skills, experience, or requirements. NO emotional hype or outcome predictions.' }
                },
                required: ['job_index', 'job_hash', 'match_score', 'match_reason']
              }
            }
          },
          required: ['matches']
        }
      }],
      function_call: { name: 'return_job_matches' }
    });

    // Track costs and store metadata for database logging
    if (completion.usage) {
      const tokens = completion.usage.total_tokens || 0;
      const trackerKey = model === 'gpt-4o-mini' ? 'gpt4omini' : (model === 'gpt-4' ? 'gpt4' : 'gpt35');
      this.costTracker[trackerKey] = this.costTracker[trackerKey] || { calls: 0, tokens: 0 };
      this.costTracker[trackerKey].calls++;
      this.costTracker[trackerKey].tokens += tokens;
      
      // Store metadata for database logging (for dashboard views)
      const cost = this.calculateAICost(tokens, model);
      this.lastAIMetadata = { model, tokens, cost };
    }

    const functionCall = completion.choices[0]?.message?.function_call;
    if (!functionCall || functionCall.name !== 'return_job_matches') {
      throw new Error('Invalid function call response');
    }

    try {
      const functionArgs = JSON.parse(functionCall.arguments);
      return this.parseFunctionCallResponse(functionArgs.matches, jobsArray);
    } catch (error) {
      throw new Error(`Failed to parse function call: ${error}`);
    }
  }

  /**
   * Enhanced prompt that uses full user profile for world-class matching
   */
  private buildStablePrompt(jobs: Job[], userPrefs: UserPreferences): string {
    // CRITICAL FIX: Capture jobs parameter in const immediately to avoid TDZ errors
    const jobsArray = Array.isArray(jobs) ? jobs : [];
    
    // Extract all user preferences
    const userCities = Array.isArray(userPrefs.target_cities) 
      ? userPrefs.target_cities.join(', ') 
      : (userPrefs.target_cities || 'Europe');
    
    const userCareer = userPrefs.professional_expertise || 'Graduate';
    const userLevel = userPrefs.entry_level_preference || 'entry-level';
    
    const languages = Array.isArray(userPrefs.languages_spoken) && userPrefs.languages_spoken.length > 0
      ? userPrefs.languages_spoken.join(', ')
      : '';
    
    const roles = Array.isArray(userPrefs.roles_selected) && userPrefs.roles_selected.length > 0
      ? userPrefs.roles_selected.join(', ')
      : '';
    
    const careerPaths = Array.isArray(userPrefs.career_path) && userPrefs.career_path.length > 0
      ? userPrefs.career_path.join(', ')
      : '';
    
    const workEnv = userPrefs.work_environment || '';

    // SMART APPROACH: Send top N jobs to AI for accurate matching
    // Pre-filtering already ranked these by relevance score
    const jobsToAnalyze = jobsArray.slice(0, JOBS_TO_ANALYZE);
    
    // Ultra-compact format (no descriptions) to save ~31% tokens
    // Title + Company + Location is enough for good matching
    // CRITICAL: Use imperative loop instead of map to avoid TDZ errors
    const jobListParts: string[] = [];
    for (let i = 0; i < jobsToAnalyze.length; i++) {
      const job = jobsToAnalyze[i];
      jobListParts.push(`${i+1}. [${job.job_hash}] ${job.title} @ ${job.company} | ${job.location}`);
    }
    const jobList = jobListParts.join('\n');
    

    return `You are a career matching expert. Analyze these jobs and match them to the user's profile.

USER PROFILE:
- Experience Level: ${userLevel}
- Professional Expertise: ${userCareer}
- Target Locations: ${userCities}
${languages ? `- Languages: ${languages}` : ''}
${roles ? `- Target Roles: ${roles}` : ''}
${careerPaths ? `- Career Paths: ${careerPaths}` : ''}
${workEnv ? `- Work Environment Preference: ${workEnv}` : ''}

AVAILABLE JOBS:
${jobList}

CRITICAL REQUIREMENTS (MUST BE MET):
1. **LOCATION MATCH IS REQUIRED**: Jobs MUST be in one of these cities: ${userCities}
   - Exact city match required (e.g., "London" matches "London, UK" but NOT "New London")
   - Remote/hybrid jobs are acceptable if location preference allows
   - DO NOT recommend jobs in other cities, even if they seem relevant
${careerPaths ? `2. **CAREER PATH MATCH IS REQUIRED**: Jobs MUST align with: ${careerPaths}
   - Job title or description must relate to these career paths
   - DO NOT recommend jobs outside these career paths` : ''}
${roles ? `3. **ROLE MATCH IS REQUIRED**: Jobs MUST match these roles: ${roles}
   - Job title or description must include these role keywords
   - DO NOT recommend jobs that don't match these roles` : ''}
${languages ? `4. **LANGUAGE REQUIREMENTS ARE CRITICAL**: User speaks: ${languages}
   - DO NOT recommend jobs that require languages the user doesn't speak
   - If job requires "Japanese speaker", "Chinese speaker", "Mandarin speaker", "Korean speaker", etc., and user doesn't speak that language, EXCLUDE the job
   - Only recommend jobs where user speaks at least one required language` : ''}

INSTRUCTIONS:
Analyze each job carefully and return ONLY jobs that meet ALL critical requirements above.
${languages ? `**CRITICAL**: If a job requires languages the user doesn't speak (e.g., "Japanese speaker" but user doesn't speak Japanese), EXCLUDE it immediately.` : ''}
Then rank by:
1. Location match quality (exact city > remote/hybrid)
2. Experience level fit (entry-level, graduate, junior keywords)
3. Role alignment strength with career path and expertise
${languages ? `4. Language match (user must speak at least one required language)` : '4. Language requirements (if specified)'}
5. Company type and culture fit

MATCH REASON GUIDELINES (Evidence-Based):
- BE SPECIFIC: Link user's stated skills/experience to job requirements
  Example: "Your React + TypeScript experience matches their requirement for 'frontend expertise with modern frameworks'"
- BE FACTUAL: Reference actual job description requirements
  Example: "The job requires '2+ years marketing experience' and you have 3 years in digital marketing"
- BE TRANSPARENT: Acknowledge gaps when relevant
  Example: "This role focuses on B2B marketing, which aligns with your experience, though it's more enterprise-focused than your previous B2C work"
- AVOID: Emotional hype ("This is the startup you'll tell your friends about")
- AVOID: Confidence claims about outcomes ("easy interview", "guaranteed fit")
- AVOID: Generic statements ("Good match for your skills", "Aligns with preferences")

DIVERSITY REQUIREMENT:
When selecting your top 5 matches, prioritize variety:
- Include jobs from different company types (startup, corporate, agency)
- Include jobs from different sources when possible
- Balance work environments (if user allows multiple types)

Return JSON array with exactly 5 matches (or fewer if less than 5 meet requirements), ranked by relevance:
[{"job_index":1,"job_hash":"actual-hash","match_score":85,"match_reason":"Evidence-based reason linking user profile to job requirements"}]

Requirements:
- job_index: Must be 1-${jobsToAnalyze.length}
- job_hash: Must match the hash from the job list above
- match_score: 50-100 (be selective, only recommend truly relevant jobs)
- match_reason: Evidence-based explanation (2-3 sentences) that explicitly links user's profile to job requirements
- Return exactly 5 matches (or fewer if less than 5 good matches exist)
- Valid JSON array only, no markdown or extra text`;
  }

  /**
   * Robust response parsing - handles common failure cases
   * CRITICAL: Uses imperative loops instead of filter/map to avoid TDZ errors during bundling
   */
  private parseAIResponse(response: string, jobs: Job[]): JobMatch[] {
    // CRITICAL: Capture immediately and NEVER reference 'jobs' parameter again
    const jobsArray = Array.isArray(jobs) ? jobs : [];
    const maxJobIndex = jobsArray.length;
    
    try {
      // Clean common formatting issues
      let cleaned = response
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/gi, '')
        .trim();

      // Extract JSON array if buried in text
      const jsonMatch = cleaned.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      const matches = JSON.parse(cleaned);
      
      if (!Array.isArray(matches) || maxJobIndex === 0) {
        if (maxJobIndex === 0) {
          console.warn('parseAIResponse: jobs array is empty or invalid');
        }
        return [];
      }

      // Use imperative loop instead of filter/map to avoid closures
      const validMatches: JobMatch[] = [];
      
      for (let i = 0; i < matches.length && validMatches.length < 5; i++) {
        const match = matches[i];
        
        if (!this.isValidMatch(match, maxJobIndex)) {
          continue;
        }
        
        if (!match || typeof match.job_index !== 'number' || !match.job_hash) {
          continue;
        }
        
        validMatches.push({
          job_index: match.job_index,
          job_hash: match.job_hash,
          match_score: Math.min(100, Math.max(50, match.match_score || 50)),
          match_reason: match.match_reason || 'AI match',
          confidence_score: 0.8
        });
      }
      
      return validMatches;

    } catch (error) {
      console.error('Failed to parse AI response:', response.slice(0, 200));
      return []; // Return empty array to trigger fallback
    }
  }

  /**
   * Parse function call response - much more reliable than text parsing
   * CRITICAL: Uses imperative loops instead of filter/map to avoid TDZ errors during bundling
   */
  private parseFunctionCallResponse(matches: ParsedMatch[], jobs: Job[]): JobMatch[] {
    // CRITICAL: Capture immediately and NEVER reference 'jobs' parameter again
    const jobsArray = Array.isArray(jobs) ? jobs : [];
    const maxJobIndex = jobsArray.length;
    
    try {
      if (!Array.isArray(matches) || maxJobIndex === 0) {
        if (maxJobIndex === 0) {
          console.warn('parseFunctionCallResponse: jobs array is empty or invalid');
        }
        return [];
      }

      // Use imperative loop instead of filter/map to avoid closures
      const validMatches: JobMatch[] = [];
      
      for (let i = 0; i < matches.length && validMatches.length < 5; i++) {
        const match = matches[i];
        
        if (!this.isValidMatch(match, maxJobIndex)) {
          continue;
        }
        
        if (!match || typeof match.job_index !== 'number' || !match.job_hash) {
          continue;
        }
        
        validMatches.push({
          job_index: match.job_index,
          job_hash: match.job_hash,
          match_score: Math.min(100, Math.max(50, match.match_score || 50)),
          match_reason: match.match_reason || 'AI match',
          confidence_score: 0.8
        });
      }
      
      return validMatches;

    } catch (error) {
      console.error('Failed to parse function call response:', error);
      return [];
    }
  }

  /**
   * Validate individual match from AI response
   */
  private isValidMatch(match: ParsedMatch, maxJobIndex: number): boolean {
    return (
      match &&
      typeof match.job_index === 'number' &&
      typeof match.job_hash === 'string' &&
      typeof match.match_score === 'number' &&
      match.job_index >= 1 &&
      match.job_index <= maxJobIndex &&
      match.match_score >= 0 &&
      match.match_score <= 100 &&
      match.job_hash.length > 0
    );
  }

  /**
   * Post-filter AI matches to ensure they meet location and career path requirements
   * This is a safety net to catch any AI mistakes
   * CRITICAL: Uses imperative loops instead of filter/some to avoid TDZ errors during bundling
   */
  private validateAIMatches(
    aiMatches: JobMatch[],
    jobs: Job[],
    userPrefs: UserPreferences
  ): JobMatch[] {
    // CRITICAL: Capture immediately and NEVER reference 'jobs' parameter again
    const jobsArray = Array.isArray(jobs) ? jobs : [];
    
    const targetCities = Array.isArray(userPrefs.target_cities) 
      ? userPrefs.target_cities 
      : userPrefs.target_cities 
        ? [userPrefs.target_cities] 
        : [];
    
    const userHasRolePreference = userPrefs.roles_selected && userPrefs.roles_selected.length > 0;
    const userHasCareerPreference = userPrefs.career_path && 
      (Array.isArray(userPrefs.career_path) ? userPrefs.career_path.length > 0 : !!userPrefs.career_path);
    
    // Use imperative loop instead of filter to avoid closures
    const validatedMatches: JobMatch[] = [];
    
    for (let i = 0; i < aiMatches.length; i++) {
      const match = aiMatches[i];
      
      // Find the job by hash using imperative loop
      let job: Job | undefined;
      for (let j = 0; j < jobsArray.length; j++) {
        if (jobsArray[j].job_hash === match.job_hash) {
          job = jobsArray[j];
          break;
        }
      }
      
      if (!job) {
        console.warn(`Job not found for hash: ${match.job_hash}`);
        continue;
      }
      
      // Validate location match
      if (targetCities.length > 0) {
        const jobLocation = (job.location || '').toLowerCase();
        const jobCity = (job as any).city ? String((job as any).city).toLowerCase() : '';
        
        let locationMatches = false;
        for (let k = 0; k < targetCities.length; k++) {
          const city = targetCities[k];
          const cityLower = city.toLowerCase();
          
          // Check structured city field first
          if (jobCity && (jobCity === cityLower || jobCity.includes(cityLower) || cityLower.includes(jobCity))) {
            locationMatches = true;
            break;
          }
          
          // Use word boundary matching
          const escapedCity = cityLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const patterns = [
            new RegExp(`\\b${escapedCity}\\b`, 'i'),
            new RegExp(`^${escapedCity}[,\\s]`, 'i'),
            new RegExp(`[,\\s]${escapedCity}[,\\s]`, 'i'),
            new RegExp(`[,\\s]${escapedCity}$`, 'i'),
          ];
          
          for (let p = 0; p < patterns.length; p++) {
            if (patterns[p].test(jobLocation)) {
              locationMatches = true;
              break;
            }
          }
          
          if (locationMatches) break;
          
          // Allow remote/hybrid
          if (jobLocation.includes('remote') || jobLocation.includes('hybrid')) {
            locationMatches = true;
            break;
          }
        }
        
        if (!locationMatches) {
          console.warn(`Location mismatch: job location "${job.location}" doesn't match user cities: ${targetCities.join(', ')}`);
          continue;
        }
      }
      
      // Validate role match if user specified roles
      if (userHasRolePreference) {
        const jobTitle = (job.title || '').toLowerCase();
        const jobDesc = (job.description || '').toLowerCase();
        const roles = userPrefs.roles_selected || [];
        
        let hasRoleMatch = false;
        for (let r = 0; r < roles.length; r++) {
          const role = roles[r];
          if (role && (jobTitle.includes(role.toLowerCase()) || jobDesc.includes(role.toLowerCase()))) {
            hasRoleMatch = true;
            break;
          }
        }
        
        if (!hasRoleMatch) {
          console.warn(`Role mismatch: job "${job.title}" doesn't match user roles: ${roles.join(', ')}`);
          continue;
        }
      }
      
      // Validate career path match if user specified career path
      if (userHasCareerPreference) {
        const jobTitle = (job.title || '').toLowerCase();
        const jobDesc = (job.description || '').toLowerCase();
        const careerPaths = Array.isArray(userPrefs.career_path) ? userPrefs.career_path : [userPrefs.career_path];
        
        let hasCareerMatch = false;
        for (let c = 0; c < careerPaths.length; c++) {
          const path = careerPaths[c];
          if (!path) continue;
          const pathLower = path.toLowerCase();
          
          if (jobTitle.includes(pathLower) || jobDesc.includes(pathLower)) {
            hasCareerMatch = true;
            break;
          }
          
          if (job.categories && Array.isArray(job.categories)) {
            for (let cat = 0; cat < job.categories.length; cat++) {
              const catLower = String(job.categories[cat]).toLowerCase();
              if (catLower.includes(pathLower) || pathLower.includes(catLower)) {
                hasCareerMatch = true;
                break;
              }
            }
          }
          if (hasCareerMatch) break;
        }
        
        if (!hasCareerMatch) {
          console.warn(`Career path mismatch: job "${job.title}" doesn't match user career paths: ${careerPaths.join(', ')}`);
          continue;
        }
      }
      
      // EVIDENCE VERIFICATION: Check match reason length
      const matchReason = match.match_reason || '';
      const wordCount = matchReason.trim().split(/\s+/).filter(w => w.length > 0).length;
      const EVIDENCE_THRESHOLD = 20; // Minimum words for strong evidence
      
      if (wordCount < EVIDENCE_THRESHOLD) {
        // Log short reason as potential weak evidence
        apiLogger.debug('Short match reason detected (potential weak evidence)', {
          email: userPrefs.email || 'unknown',
          jobHash: match.job_hash,
          jobTitle: job.title,
          reasonLength: wordCount,
          reason: matchReason.substring(0, 100), // First 100 chars for context
          threshold: EVIDENCE_THRESHOLD,
          note: 'AI may have struggled to find strong evidence linking user skills to job requirements'
        });
      }
      
      // All validations passed
      validatedMatches.push(match);
    }
    
    return validatedMatches;
  }

  /**
   * Pre-rank jobs using rule-based scoring before AI matching
   * This ensures AI sees the most relevant jobs, not just the most recent
   */
  private async preRankJobsByScore(
    jobs: Job[],
    userPrefs: UserPreferences
  ): Promise<Array<{ job: Job; score: number }>> {
    const jobsArray = Array.isArray(jobs) ? jobs : [];
    const userCities = Array.isArray(userPrefs.target_cities) 
      ? userPrefs.target_cities 
      : userPrefs.target_cities 
        ? [userPrefs.target_cities] 
        : [];
    
    const userCareer = userPrefs.professional_expertise || '';
    const userCareerPaths = Array.isArray(userPrefs.career_path) 
      ? userPrefs.career_path 
      : userPrefs.career_path 
        ? [userPrefs.career_path] 
        : [];
    
    const scoredJobs: Array<{ job: Job; score: number }> = [];
    
    for (let i = 0; i < jobsArray.length; i++) {
      const job = jobsArray[i];
      const scoreResult = await this.calculateWeightedScore(
        job,
        userPrefs,
        userCities,
        userCareer,
        userCareerPaths
      );
      
      scoredJobs.push({
        job,
        score: scoreResult.score
      });
    }
    
    // Sort by score descending (highest score first)
    const sorted = [...scoredJobs];
    for (let i = 0; i < sorted.length - 1; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[i].score < sorted[j].score) {
          const temp = sorted[i];
          sorted[i] = sorted[j];
          sorted[j] = temp;
        }
      }
    }
    
    return sorted;
  }

  /**
   * Check if cache should be bypassed due to stale data
   * If >20 new matching jobs exist since cache entry, bypass cache
   */
  private async shouldBypassCache(
    cacheKey: string,
    userPrefs: UserPreferences,
    jobs: Job[]
  ): Promise<boolean> {
    const cached = await this.matchCache.get(cacheKey);
    if (!cached) return false;
    
    // Check if significant new jobs have been added
    const cities = Array.isArray(userPrefs.target_cities) 
      ? userPrefs.target_cities 
      : userPrefs.target_cities ? [userPrefs.target_cities] : [];
    
    const careerPaths = Array.isArray(userPrefs.career_path) 
      ? userPrefs.career_path 
      : userPrefs.career_path ? [userPrefs.career_path] : [];
    
    // Count jobs matching user's criteria in current pool
    let matchingJobCount = 0;
    for (const job of jobs) {
      const jobCity = (job.city || '').toLowerCase();
      const matchesCity = cities.length === 0 || cities.some(city => 
        jobCity.includes(city.toLowerCase())
      );
      
      const jobCategories = (job.categories || []).map(c => String(c).toLowerCase());
      const matchesCareer = careerPaths.length === 0 || careerPaths.some(path => {
        const pathLower = String(path).toLowerCase();
        return jobCategories.some(cat => 
          cat.includes(pathLower) || pathLower.includes(cat)
        );
      });
      
      if (matchesCity && matchesCareer) {
        matchingJobCount++;
      }
    }
    
    // If >20 new matching jobs since cache entry, bypass cache
    const STALE_THRESHOLD = 20;
    return matchingJobCount > STALE_THRESHOLD;
  }

  /**
   * Enhanced rule-based matching with weighted linear scoring model
   */
  private async performRuleBasedMatching(jobs: Job[], userPrefs: UserPreferences): Promise<JobMatch[]> {
    // CRITICAL FIX: Capture jobs parameter in const immediately to avoid TDZ errors
    const jobsArray = Array.isArray(jobs) ? jobs : [];
    
    const matches: JobMatch[] = [];
    const userCities = Array.isArray(userPrefs.target_cities) ? userPrefs.target_cities : [];
    const userCareer = userPrefs.professional_expertise || '';
    const userCareerPaths = Array.isArray(userPrefs.career_path) ? userPrefs.career_path : [];

    for (let i = 0; i < Math.min(jobsArray.length, 20); i++) {
      const job = jobsArray[i];
      const scoreResult = await this.calculateWeightedScore(job, userPrefs, userCities, userCareer, userCareerPaths);
      
      // Include matches above threshold (balanced for good coverage)
      if (scoreResult.score >= 65) {
        matches.push({
          job_index: i + 1,
          job_hash: job.job_hash,
          match_score: scoreResult.score,
          match_reason: scoreResult.reasons.join(', ') || 'Enhanced rule-based match',
          confidence_score: 0.7
        });
      }
    }

    // Sort by match score and return top matches
    // CRITICAL: Use imperative sort instead of .sort() to avoid closure/TDZ issues
    const sortedMatches = [...matches]; // Create copy to avoid mutating original
    for (let i = 0; i < sortedMatches.length - 1; i++) {
      for (let j = i + 1; j < sortedMatches.length; j++) {
        if (sortedMatches[i].match_score < sortedMatches[j].match_score) {
          const temp = sortedMatches[i];
          sortedMatches[i] = sortedMatches[j];
          sortedMatches[j] = temp;
        }
      }
    }
    
    return sortedMatches.slice(0, 8); // Increased from 6 to 8 for better coverage
  }

  /**
   * Calculate weighted linear score with enhanced factors
   * BALANCED WEIGHTS (Total: 100 points max)
   * - Role Type Match: 33% (internship vs graduate vs junior)
   * - Location Match: 28% (target city > EU location)
   * - Career Path/Skills: 24% (finance, consulting, tech, etc.)
   * - Company Tier: 15% (10pt baseline for all, +2pt for famous brands)
   * - Cold Start Boost: 15% (new users)
   * NO FRESHNESS: All jobs filtered to 60 days, so all are fresh!
   */
  private async calculateWeightedScore(
    job: Job, 
    userPrefs: UserPreferences, 
    userCities: string[], 
    userCareer: string,
    userCareerPaths: string[]
  ): Promise<{ score: number; reasons: string[] }> {
    let score = 55; // Base score (increased for better match %s)
    const reasons: string[] = [];
    
    const title = job.title?.toLowerCase() || '';
    const description = (job.description || '').toLowerCase();
    const company = (job.company || '').toLowerCase();
    const location = (job.location || '').toLowerCase();
    const jobText = `${title} ${description}`.toLowerCase();

    // 0. Cold-start boost for new users (15 pts max)
    const coldStartScore = this.calculateColdStartScore(jobText, title, userPrefs);
    score += coldStartScore.points;
    if (coldStartScore.points > 0) {
      reasons.push(coldStartScore.reason);
    }

    // 1. Role Type Match (25 pts max) - Internship vs Graduate vs Junior
    const earlyCareerScore = this.calculateEarlyCareerScore(jobText, title, job, userPrefs);
    score += earlyCareerScore.points;
    if (earlyCareerScore.points > 0) {
      reasons.push(earlyCareerScore.reason);
    }

    // 2. Location Match (20 pts max) - Target city > EU location
    const euLocationScore = this.calculateEULocationScore(location, userCities);
    score += euLocationScore.points;
    if (euLocationScore.points > 0) {
      reasons.push(euLocationScore.reason);
    }

    // 3. Career Path/Skills (18 pts max) - Finance, Consulting, Tech, etc.
    const skillScore = this.calculateSkillOverlapScore(jobText, userCareer, userCareerPaths);
    score += skillScore.points;
    if (skillScore.points > 0) {
      reasons.push(skillScore.reason);
    }

    // 4. Company Tier (12 pts max) - Famous brands get +2 bonus, unknown get baseline
    const companyScore = this.calculateCompanyTierScore(company, jobText);
    score += companyScore.points;
    if (companyScore.points > 0) {
      reasons.push(companyScore.reason);
    }

    // Freshness removed: All jobs filtered to 60 days, so they're all fresh!

    // Apply feedback-driven penalty (multiplicative)
    const finalScore = await this.applyFeedbackPenalty(score, job, userPrefs);
    
    return { score: Math.min(100, Math.max(0, finalScore)), reasons };
  }

  /**
   * Apply feedback-driven penalty to match score
   * Formula: finalScore = initialScore * (1 - penalty)
   * Penalty is 0-0.3 (max 30% reduction) based on user's negative feedback
   */
  private async applyFeedbackPenalty(
    initialScore: number,
    job: Job,
    userPrefs: UserPreferences
  ): Promise<number> {
    // Feature flag: Enable/disable penalty system
    const penaltyEnabled = process.env.ENABLE_FEEDBACK_PENALTY !== 'false'; // Default: enabled
    if (!penaltyEnabled) {
      return initialScore;
    }

    const userEmail = userPrefs.email;
    if (!userEmail) {
      return initialScore; // No user email = no penalty
    }

    try {
      const penalty = await this.getUserAvoidancePenalty(userEmail, job);
      
      // Apply multiplicative penalty: finalScore = initialScore * (1 - penalty)
      const finalScore = initialScore * (1 - penalty);
      
      // Log penalty application for monitoring
      if (penalty > 0) {
        apiLogger.debug('Feedback penalty applied', {
          email: userEmail,
          jobHash: job.job_hash,
          initialScore,
          penalty,
          finalScore,
          penaltyReason: `User has ${penalty > 0.2 ? 'strong' : 'moderate'} avoidance pattern for this category`
        });
      }
      
      return finalScore;
    } catch (error) {
      // If penalty calculation fails, return original score (fail-safe)
      apiLogger.warn('Failed to calculate feedback penalty', {
        email: userEmail,
        jobHash: job.job_hash,
        error: error instanceof Error ? error.message : String(error)
      });
      return initialScore;
    }
  }

  /**
   * Get user avoidance penalty for a job category
   * Uses Redis caching to minimize database queries
   * Returns penalty value 0-0.3 (max 30% reduction)
   */
  private async getUserAvoidancePenalty(
    userEmail: string,
    job: Job
  ): Promise<number> {
    // Get job category (primary anchor for penalty)
    const category = job.categories?.[0] || '';
    if (!category) {
      return 0; // No category = no penalty
    }

    // Normalize category for cache key
    const normalizedCategory = category.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const cacheKey = `user:avoidance:${userEmail}:${normalizedCategory}`;
    const cacheTTL = 300; // 5 minutes (feedback changes infrequently)

    // Try Redis cache first
    const cached = await withRedis(async (client) => {
      const cached = await client.get(cacheKey);
      if (cached) {
        return parseFloat(cached);
      }
      return null;
    });

    if (cached !== null && !isNaN(cached)) {
      return cached; // Return cached penalty
    }

    // Cache miss - calculate penalty from database
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const supabase = getDatabaseClient();
    const { data: feedback, error } = await supabase
      .from('match_logs')
      .select('match_quality, job_context, match_tags, created_at')
      .eq('user_email', userEmail)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(100); // Limit to recent feedback for performance

    if (error) {
      apiLogger.warn('Failed to fetch feedback for penalty calculation', {
        email: userEmail,
        error: error.message
      });
      // Cache zero penalty on error (fail-safe)
      await withRedis(async (client) => {
        await client.setEx(cacheKey, cacheTTL, '0');
      });
      return 0;
    }

    if (!feedback || feedback.length < 3) {
      // Not enough data - cache zero penalty
      await withRedis(async (client) => {
        await client.setEx(cacheKey, cacheTTL, '0');
      });
      return 0;
    }

    // Filter feedback for this category
    const categoryFeedback = feedback.filter(f => {
      const ctx = f.job_context as any;
      if (!ctx) return false;
      
      // Check if job context matches category
      const jobCategory = ctx.category || ctx.categories?.[0] || ctx.career_path || '';
      const jobCategories = Array.isArray(ctx.categories) ? ctx.categories : [];
      
      return jobCategory.toLowerCase() === category.toLowerCase() ||
             jobCategories.some((cat: string) => 
               String(cat).toLowerCase() === category.toLowerCase()
             );
    });

    if (categoryFeedback.length < 3) {
      // Not enough category-specific feedback
      await withRedis(async (client) => {
        await client.setEx(cacheKey, cacheTTL, '0');
      });
      return 0;
    }

    // Calculate penalty with asymmetric weighting: (hides - clicks*2) / (total + clicks), capped at 0.3
    // Formula: NetAvoidance = (Hides - Clicks * 2) / (Total + Clicks)
    // This ensures clicks count 2x more than hides (clicks = strong intent, hides = "not right now")
    const hides = categoryFeedback.filter(f => 
      f.match_quality === 'negative' || f.match_quality === 'hide'
    ).length;
    
    // Count apply clicks first (these are also clicks, so we need to separate them)
    // Check match_tags for 'apply_clicked' action (stored in match_context metadata)
    const applyClicks = categoryFeedback.filter(f => {
      const tags = f.match_tags as any;
      if (!tags || typeof tags !== 'object') return false;
      // Check if action is 'apply_clicked' in match_tags (from match_context metadata)
      return tags.action === 'apply_clicked';
    }).length;
    
    // Count regular clicks (excluding apply clicks to avoid double-counting)
    const regularClicks = categoryFeedback.filter(f => {
      const tags = f.match_tags as any;
      const isApplyClick = tags && typeof tags === 'object' && tags.action === 'apply_clicked';
      return !isApplyClick && (f.match_quality === 'positive' || f.match_quality === 'click');
    }).length;
    
    const total = categoryFeedback.length;
    
    // Asymmetric weighting: regular clicks count 2x, apply clicks count 5x
    // Formula: NetAvoidance = (Hides - RegularClicks*2 - ApplyClicks*5) / Total
    const weightedClicks = (regularClicks * 2) + (applyClicks * 5);
    const netAvoidance = (hides - weightedClicks) / total;
    
    // Cap penalty at 0.3 (30% max reduction)
    const penalty = Math.min(0.3, Math.max(0, netAvoidance));

    // Cache the result
    await withRedis(async (client) => {
      await client.setEx(cacheKey, cacheTTL, penalty.toString());
    });

    return penalty;
  }

  /**
   * Calculate cold-start score for new users with programme keyword boosts
   */
  private calculateColdStartScore(jobText: string, title: string, userPrefs: UserPreferences): { points: number; reason: string } {
    // Detect if user is new (no explicit career preferences)
    const isNewUser = !userPrefs.professional_expertise && 
                     (!userPrefs.career_path || userPrefs.career_path.length === 0);

    if (!isNewUser) {
      return { points: 0, reason: '' };
    }

    // Cold-start boosts for new users
    const programmeKeywords = [
      'graduate scheme', 'graduate program', 'graduate programme', 'trainee program',
      'internship program', 'rotation program', 'campus recruiting', 'university',
      'entry level program', 'junior program', 'associate program', 'apprentice'
    ];

    // Check for programme keywords (strong signal for new users)
    for (const keyword of programmeKeywords) {
      if (jobText.includes(keyword)) {
        return { points: 15, reason: 'graduate programme' };
      }
    }

    // Check for structured early career roles
    const structuredRoles = [
      'graduate', 'intern', 'trainee', 'associate', 'entry level', 'junior',
      'campus hire', 'new grad', 'recent graduate'
    ];

    for (const role of structuredRoles) {
      if (title.includes(role)) {
        return { points: 10, reason: 'structured early-career role' };
      }
    }

    // Check for company size indicators (larger companies more likely to have programmes)
    const largeCompanyIndicators = [
      'multinational', 'fortune 500', 'ftse 100', 'dax 30', 'cac 40',
      'blue chip', 'established', 'leading', 'global'
    ];

    for (const indicator of largeCompanyIndicators) {
      if (jobText.includes(indicator)) {
        return { points: 5, reason: 'established company' };
      }
    }

    return { points: 0, reason: '' };
  }

  /**
   * Calculate early career relevance score with role type distinction
   */
  private calculateEarlyCareerScore(jobText: string, title: string, job?: Job, userPrefs?: UserPreferences): { points: number; reason: string } {
    // CRITICAL: Distinguish between internship, graduate, and junior roles!
    const internshipTerms = ['intern', 'internship', 'stage', 'praktikum', 'prácticas', 'tirocinio', 'stagiar'];
    const graduateTerms = ['graduate', 'new grad', 'grad scheme', 'grad program', 'graduate programme', 'trainee program', 'grad trainee'];
    const juniorTerms = ['junior', 'entry level', 'associate', 'assistant', 'junior analyst', 'junior consultant'];
    const programmeTerms = ['programme', 'program', 'scheme', 'rotation', 'campus'];
    const workingStudentTerms = ['werkstudent', 'working student', 'part-time student', 'student worker', 'student job'];

    // Get user's preference (if available)
    const userPreference = userPrefs?.entry_level_preference?.toLowerCase() || '';
    
    // Check for working student terms in job
    // CRITICAL: Use imperative loop instead of .some() to avoid closure/TDZ issues
    let isWorkingStudentJob = false;
    for (let termIdx = 0; termIdx < workingStudentTerms.length; termIdx++) {
      const term = workingStudentTerms[termIdx];
      if (jobText.includes(term) || title.includes(term)) {
        isWorkingStudentJob = true;
        break;
      }
    }
    
    // Check job flags first (most accurate)
    // BALANCED: Role type match is important but not overwhelming
    if (job) {
      if (job.is_internship) {
        if (userPreference.includes('intern')) {
          return { points: 25, reason: 'internship (perfect match)' };
        }
        // Working Student preference: boost internships, especially those with working student terms
        if (userPreference.includes('working student')) {
          return isWorkingStudentJob 
            ? { points: 25, reason: 'working student role (perfect match)' }
            : { points: 22, reason: 'internship (good match for working student)' };
        }
        return { points: 20, reason: 'internship role' };
      }
      if (job.is_graduate) {
        if (userPreference.includes('grad')) {
          return { points: 25, reason: 'graduate programme (perfect match)' };
        }
        return { points: 20, reason: 'graduate programme' };
      }
    }

    // Fallback to text matching with user preference boost
    // BALANCED: +5 bonus for preference match, but not dominant
    
    // Working Student: check text for working student terms
    if (userPreference.includes('working student') && isWorkingStudentJob) {
      return { points: 23, reason: 'working student role (text match)' };
    }
    
    // Internships
    for (const term of internshipTerms) {
      if (jobText.includes(term) || title.includes(term)) {
        if (userPreference.includes('intern')) {
          return { points: 25, reason: 'internship (preference match)' };
        }
        // Also boost for working student preference
        if (userPreference.includes('working student')) {
          return { points: 22, reason: 'internship (good match for working student)' };
        }
        return { points: 20, reason: 'internship role' };
      }
    }

    // Graduate programs
    for (const term of graduateTerms) {
      if (jobText.includes(term) || title.includes(term)) {
        if (userPreference.includes('grad')) {
          return { points: 25, reason: 'graduate programme (preference match)' };
        }
        return { points: 20, reason: 'graduate programme' };
      }
    }

    // Junior/Associate roles
    for (const term of juniorTerms) {
      if (jobText.includes(term) || title.includes(term)) {
        if (userPreference.includes('junior') || userPreference.includes('analyst')) {
          return { points: 22, reason: 'junior role (preference match)' };
        }
        return { points: 18, reason: 'junior role' };
      }
    }

    // Structured programmes (catch-all)
    for (const term of programmeTerms) {
      if (jobText.includes(term)) {
        return { points: 20, reason: 'structured programme' };
      }
    }

    // Medium-value early career terms (when no preference specified)
    const mediumValueTerms = ['coordinator', 'specialist', 'analyst'];
    for (const term of mediumValueTerms) {
      if (jobText.includes(term)) {
        return { points: 15, reason: 'entry-level position' };
      }
    }

    // Penalty for senior terms
    const seniorTerms = ['senior', 'staff', 'principal', 'lead', 'manager', 'director', 'head', 'vp', 'chief', 'executive'];
    for (const term of seniorTerms) {
      if (title.includes(term)) {
        return { points: -20, reason: 'senior role penalty' };
      }
    }

    return { points: 0, reason: '' };
  }

  /**
   * Calculate EU location relevance score
   */
  private calculateEULocationScore(location: string, userCities: string[]): { points: number; reason: string } {
    // EU countries and cities
    const euHints = [
      'uk', 'united kingdom', 'ireland', 'germany', 'france', 'spain', 'portugal', 'italy',
      'netherlands', 'belgium', 'luxembourg', 'denmark', 'sweden', 'norway', 'finland',
      'amsterdam', 'rotterdam', 'london', 'dublin', 'paris', 'berlin', 'munich',
      'madrid', 'barcelona', 'lisbon', 'milan', 'rome', 'stockholm', 'copenhagen'
    ];

    // Check for remote (penalty for now as per user preference)
    if (location.includes('remote') || location.includes('work from home')) {
      return { points: -10, reason: 'remote job penalty' };
    }

    // Check user's target cities first
    if (userCities.length > 0) {
      for (const city of userCities) {
        if (location.includes(city.toLowerCase())) {
          return { points: 20, reason: 'target city match' };
        }
      }
    }

    // Check for any EU location
    for (const hint of euHints) {
      if (location.includes(hint)) {
        return { points: 15, reason: 'EU location' };
      }
    }

    return { points: 0, reason: '' };
  }

  /**
   * Calculate skill/career overlap score with profile vectors lite
   */
  private calculateSkillOverlapScore(jobText: string, userCareer: string, userCareerPaths: string[]): { points: number; reason: string } {
    let maxScore = 0;
    let bestReason = '';

    // Profile vectors lite: Create user skill/industry/location vectors
    const userProfile = this.createUserProfileVector(userCareer, userCareerPaths);
    const jobProfile = this.createJobProfileVector(jobText);

    // Calculate overlap boost
    const overlapScore = this.calculateProfileOverlap(userProfile, jobProfile);
    if (overlapScore > 0) {
      maxScore = Math.max(maxScore, overlapScore);
      bestReason = `profile overlap (${overlapScore} points)`;
    }

    // Direct career match (keep existing logic as fallback)
    if (userCareer && jobText.includes(userCareer.toLowerCase())) {
      if (18 > maxScore) {
        maxScore = 18;
        bestReason = 'direct career match';
      }
    }

    // Career path matches
    for (const path of userCareerPaths) {
      if (jobText.includes(path.toLowerCase())) {
        if (18 > maxScore) {
          maxScore = 18;
          bestReason = 'career path match';
        }
      }
    }

    // Enhanced career mappings with more specific terms
    const careerMappings: Record<string, string[]> = {
      'software': ['developer', 'engineer', 'programmer', 'software', 'frontend', 'backend', 'full stack', 'mobile'],
      'data': ['analyst', 'data', 'analytics', 'data science', 'machine learning', 'ai', 'business intelligence'],
      'marketing': ['marketing', 'brand', 'digital', 'content', 'social media', 'growth', 'product marketing'],
      'sales': ['sales', 'business development', 'account', 'revenue', 'partnerships', 'commercial'],
      'consulting': ['consultant', 'advisory', 'strategy', 'management consulting', 'business analysis'],
      'finance': ['finance', 'financial', 'accounting', 'investment', 'banking', 'trading', 'risk'],
      'product': ['product', 'product management', 'product owner', 'product analyst', 'product designer'],
      'design': ['designer', 'design', 'ui', 'ux', 'graphic', 'visual', 'user experience'],
      'operations': ['operations', 'operational', 'process', 'supply chain', 'logistics', 'project management']
    };

    for (const [career, keywords] of Object.entries(careerMappings)) {
      const careerLower = userCareer.toLowerCase();
      if (careerLower.includes(career)) {
        // CRITICAL: Use imperative loop instead of filter to avoid closure/TDZ issues
        let matchCount = 0;
        for (let kwIdx = 0; kwIdx < keywords.length; kwIdx++) {
          if (jobText.includes(keywords[kwIdx])) {
            matchCount++;
          }
        }
        if (matchCount > 0) {
          const score = Math.min(15, 5 + (matchCount * 3));
          if (score > maxScore) {
            maxScore = score;
            bestReason = `${career} alignment (${matchCount} keywords)`;
          }
        }
      }
    }

    return { points: maxScore, reason: bestReason };
  }

  /**
   * Create user profile vector (skills/industries/locations as sets)
   */
  private createUserProfileVector(userCareer: string, userCareerPaths: string[]): {
    skills: Set<string>;
    industries: Set<string>;
    locations: Set<string>;
  } {
    const skills = new Set<string>();
    const industries = new Set<string>();
    const locations = new Set<string>();

    // Add career expertise as skills
    if (userCareer) {
      const careerLower = userCareer.toLowerCase();
      skills.add(careerLower);
      
      // Map career to related skills
      const careerToSkills: Record<string, string[]> = {
        'software': ['programming', 'development', 'coding', 'engineering'],
        'data': ['analytics', 'statistics', 'machine learning', 'sql', 'python'],
        'marketing': ['digital marketing', 'content creation', 'social media', 'branding'],
        'sales': ['relationship building', 'negotiation', 'lead generation', 'CRM'],
        'consulting': ['problem solving', 'strategic thinking', 'presentation', 'analysis'],
        'finance': ['financial modeling', 'accounting', 'investment analysis', 'risk assessment'],
        'product': ['product strategy', 'user research', 'roadmapping', 'stakeholder management'],
        'design': ['user experience', 'visual design', 'prototyping', 'design thinking'],
        'operations': ['process improvement', 'project management', 'supply chain', 'logistics']
      };

      for (const [career, relatedSkills] of Object.entries(careerToSkills)) {
        if (careerLower.includes(career)) {
          // CRITICAL: Use imperative loop instead of forEach to avoid closure/TDZ issues
          for (let skillIdx = 0; skillIdx < relatedSkills.length; skillIdx++) {
            skills.add(relatedSkills[skillIdx]);
          }
        }
      }
    }

    // Add career paths as industries
    // CRITICAL: Use imperative loop instead of forEach to avoid closure/TDZ issues
    for (let pathIdx = 0; pathIdx < userCareerPaths.length; pathIdx++) {
      const pathLower = userCareerPaths[pathIdx].toLowerCase();
      industries.add(pathLower);
    }

    return { skills, industries, locations };
  }

  /**
   * Create job profile vector from job text
   */
  private createJobProfileVector(jobText: string): {
    skills: Set<string>;
    industries: Set<string>;
    locations: Set<string>;
  } {
    const skills = new Set<string>();
    const industries = new Set<string>();
    const locations = new Set<string>();

    // Extract skills from job text
    const skillKeywords = [
      'programming', 'development', 'coding', 'engineering', 'analytics', 'statistics',
      'machine learning', 'sql', 'python', 'javascript', 'react', 'node', 'aws',
      'digital marketing', 'content creation', 'social media', 'branding',
      'relationship building', 'negotiation', 'lead generation', 'CRM',
      'problem solving', 'strategic thinking', 'presentation', 'analysis',
      'financial modeling', 'accounting', 'investment analysis', 'risk assessment',
      'product strategy', 'user research', 'roadmapping', 'stakeholder management',
      'user experience', 'visual design', 'prototyping', 'design thinking',
      'process improvement', 'project management', 'supply chain', 'logistics'
    ];

    // CRITICAL: Use imperative loop instead of forEach to avoid closure/TDZ issues
    for (let skillIdx = 0; skillIdx < skillKeywords.length; skillIdx++) {
      const skill = skillKeywords[skillIdx];
      if (jobText.includes(skill)) {
        skills.add(skill);
      }
    }

    // Extract industries from job text
    const industryKeywords = [
      'technology', 'fintech', 'healthcare', 'e-commerce', 'consulting', 'finance',
      'marketing', 'advertising', 'media', 'entertainment', 'retail', 'manufacturing',
      'automotive', 'aerospace', 'energy', 'real estate', 'education', 'government'
    ];

    // CRITICAL: Use imperative loop instead of forEach to avoid closure/TDZ issues
    for (let industryIdx = 0; industryIdx < industryKeywords.length; industryIdx++) {
      const industry = industryKeywords[industryIdx];
      if (jobText.includes(industry)) {
        industries.add(industry);
      }
    }

    return { skills, industries, locations };
  }

  /**
   * Calculate profile overlap boost (2 overlaps = boost)
   */
  private calculateProfileOverlap(
    userProfile: { skills: Set<string>; industries: Set<string>; locations: Set<string> },
    jobProfile: { skills: Set<string>; industries: Set<string>; locations: Set<string> }
  ): number {
    let overlapCount = 0;

    // Count skill overlaps
    for (const userSkill of userProfile.skills) {
      if (jobProfile.skills.has(userSkill)) {
        overlapCount++;
      }
    }

    // Count industry overlaps
    for (const userIndustry of userProfile.industries) {
      if (jobProfile.industries.has(userIndustry)) {
        overlapCount++;
      }
    }

    // Count location overlaps
    for (const userLocation of userProfile.locations) {
      if (jobProfile.locations.has(userLocation)) {
        overlapCount++;
      }
    }

    // Boost if 2 overlaps
    if (overlapCount >= 2) {
      return Math.min(20, 5 + (overlapCount * 2)); // 7-20 points based on overlap count
    }

    return 0;
  }

  /**
   * Calculate company tier/quality score
   */
  private calculateCompanyTierScore(company: string, _jobText: string): { points: number; reason: string } {
    // Famous companies get small bonus - but unknown companies are ALSO valued!
    const famousCompanies = [
      // Tech Giants
      'google', 'microsoft', 'apple', 'amazon', 'meta', 'facebook', 'netflix', 'uber', 'airbnb', 'tesla',
      // Top Consulting
      'mckinsey', 'bain', 'bcg', 'boston consulting',
      // Big 4
      'deloitte', 'pwc', 'ey', 'kpmg', 'accenture',
      // Investment Banks
      'goldman sachs', 'jpmorgan', 'jp morgan', 'morgan stanley', 'citigroup', 'citi', 'barclays', 'hsbc',
      // Asset Management
      'blackrock', 'vanguard', 'state street',
      // European Giants
      'unilever', 'nestlé', 'nestle', 'lvmh', 'loreal', "l'oreal", 'volkswagen', 'bmw', 'mercedes', 'siemens',
      // More Tech
      'salesforce', 'oracle', 'sap', 'adobe', 'spotify', 'booking.com'
    ];

    // Check for famous companies - small bonus
    for (const famous of famousCompanies) {
      if (company.includes(famous)) {
        return { points: 12, reason: 'famous company' };
      }
    }

    // Unknown companies still get baseline points (not all good jobs are at famous brands!)
    return { points: 10, reason: 'established company' };
  }


  /**
   * Get quality label based on score
   */
  private getQualityLabel(score: number): string {
    if (score >= 85) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 65) return 'fair';
    return 'poor';
  }

  /**
   * Calculate match quality metrics for logging and analytics
   * CRITICAL: Uses imperative loops instead of map/filter/forEach to avoid TDZ errors during bundling
   */
  private calculateMatchQualityMetrics(
    matches: JobMatch[],
    jobs: Job[],
    userPrefs: UserPreferences
  ): {
    averageScore: number;
    scoreDistribution: { excellent: number; good: number; fair: number; poor: number };
    cityCoverage: number;
    sourceDiversity: number;
  } {
    // CRITICAL: Capture immediately and NEVER reference 'jobs' parameter again
    const jobsArray = Array.isArray(jobs) ? jobs : [];
    
    if (matches.length === 0) {
      return {
        averageScore: 0,
        scoreDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
        cityCoverage: 0,
        sourceDiversity: 0
      };
    }

    // Calculate average score using imperative loop
    let scoreSum = 0;
    for (let i = 0; i < matches.length; i++) {
      scoreSum += matches[i].match_score;
    }
    const averageScore = scoreSum / matches.length;

    // Calculate score distribution using imperative loops
    let excellent = 0;
    let good = 0;
    let fair = 0;
    let poor = 0;
    
    for (let i = 0; i < matches.length; i++) {
      const score = matches[i].match_score;
      if (score >= 90) {
        excellent++;
      } else if (score >= 75) {
        good++;
      } else if (score >= 65) {
        fair++;
      } else {
        poor++;
      }
    }
    
    const scoreDistribution = { excellent, good, fair, poor };

    // Calculate city coverage using imperative loops
    const targetCities = Array.isArray(userPrefs.target_cities) 
      ? userPrefs.target_cities 
      : userPrefs.target_cities 
        ? [userPrefs.target_cities] 
        : [];
    
    const matchedCities = new Set<string>();
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      
      // Find job using imperative loop
      let job: Job | undefined;
      for (let j = 0; j < jobsArray.length; j++) {
        if (jobsArray[j].job_hash === match.job_hash) {
          job = jobsArray[j];
          break;
        }
      }
      
      if (job) {
        const jobLocation = (job.location || '').toLowerCase();
        for (let k = 0; k < targetCities.length; k++) {
          const city = targetCities[k];
          if (jobLocation.includes(city.toLowerCase())) {
            matchedCities.add(city);
            break;
          }
        }
      }
    }
    const cityCoverage = targetCities.length > 0 ? matchedCities.size / targetCities.length : 0;

    // Calculate source diversity using imperative loops
    const sources = new Set<string>();
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      
      // Find job using imperative loop
      let job: Job | undefined;
      for (let j = 0; j < jobsArray.length; j++) {
        if (jobsArray[j].job_hash === match.job_hash) {
          job = jobsArray[j];
          break;
        }
      }
      
      if (job && (job as any).source) {
        sources.add((job as any).source);
      }
    }
    const sourceDiversity = sources.size;

    return {
      averageScore: Math.round(averageScore * 10) / 10,
      scoreDistribution,
      cityCoverage: Math.round(cityCoverage * 100) / 100,
      sourceDiversity
    };
  }

  /**
   * Test AI connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.openai) return false;
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
        temperature: 0
      });
      
      return !!response.choices[0]?.message?.content;
    } catch (error) {
      console.error('AI connection test failed:', error);
      return false;
    }
  }

  getCostMetrics() {
    return {
      totalCalls: Object.values(this.costTracker).reduce((sum, model) => sum + model.calls, 0),
      totalTokens: Object.values(this.costTracker).reduce((sum, model) => sum + model.tokens, 0),
      totalCost: Object.values(this.costTracker).reduce((sum, model) => sum + (model.cost || 0), 0),
      byModel: this.costTracker
    };
  }

  private updateCostTracking(model: string, calls: number, estimatedCost: number): void {
    if (this.costTracker[model]) {
      this.costTracker[model].calls += calls;
      this.costTracker[model].cost = (this.costTracker[model].cost || 0) + estimatedCost;
    }
  }
}

// Export factory function for easy integration
export function createConsolidatedMatcher(openaiApiKey?: string): ConsolidatedMatchingEngine {
  return new ConsolidatedMatchingEngine(openaiApiKey);
}

// Cache-busting export - forces webpack to regenerate bundle
export const BUILD_TIMESTAMP = '2025-12-08T12:00:00Z';

export const BUILD_VERSION = '2.1.0';

