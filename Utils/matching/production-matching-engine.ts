/**
 * PRODUCTION-READY MATCHING ENGINE
 * Fixed critical issues: memory leaks, race conditions, error handling, monitoring
 */

import OpenAI from 'openai';
import type { Job } from '../scrapers/types';
import { UserPreferences, JobMatch } from './types';

// ============================================
// CONFIGURATION & CONSTANTS
// ============================================

interface MatchingConfig {
  maxCacheSize: number;
  cacheTTLMs: number;
  aiTimeoutMs: number;
  maxRetries: number;
  costLimitDaily: number;
  costLimitPerUser: number;
  jobsToAnalyze: number;
}

const PRODUCTION_CONFIG: MatchingConfig = {
  maxCacheSize: 1000, // Max 1000 cache entries
  cacheTTLMs: 2 * 60 * 60 * 1000, // 2 hours
  aiTimeoutMs: 15000, // 15 seconds
  maxRetries: 2,
  costLimitDaily: 50, // $50/day limit
  costLimitPerUser: 5, // $5/user/day limit
  jobsToAnalyze: 50
};

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
  private hitCount = 0;
  private missCount = 0;

  constructor(maxSize: number, ttlMs: number) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): JobMatch[] | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.missCount++;
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hitCount++;
    
    // Move to end of access order
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
    
    return entry.matches;
  }

  set(key: string, matches: JobMatch[]): void {
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
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0,
      hitCount: this.hitCount,
      missCount: this.missCount
    };
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.hitCount = 0;
    this.missCount = 0;
  }
}

// ============================================
// COST TRACKER WITH LIMITS
// ============================================

interface CostEntry {
  daily: number;
  perUser: Record<string, number>;
  lastReset: string;
}

class CostTracker {
  private costs = new Map<string, CostEntry>();
  private readonly dailyLimit: number;
  private readonly perUserLimit: number;

  constructor(dailyLimit: number, perUserLimit: number) {
    this.dailyLimit = dailyLimit;
    this.perUserLimit = perUserLimit;
  }

  canMakeCall(userId: string, estimatedCost: number): { allowed: boolean; reason?: string } {
    const today = new Date().toISOString().split('T')[0];
    const entry = this.costs.get(today) || { daily: 0, perUser: {}, lastReset: today };
    
    // Check daily limit
    if (entry.daily + estimatedCost > this.dailyLimit) {
      return { allowed: false, reason: 'Daily cost limit exceeded' };
    }
    
    // Check per-user limit
    const userCost = entry.perUser[userId] || 0;
    if (userCost + estimatedCost > this.perUserLimit) {
      return { allowed: false, reason: 'Per-user cost limit exceeded' };
    }
    
    return { allowed: true };
  }

  recordCall(userId: string, cost: number): void {
    const today = new Date().toISOString().split('T')[0];
    const entry = this.costs.get(today) || { daily: 0, perUser: {}, lastReset: today };
    
    entry.daily += cost;
    entry.perUser[userId] = (entry.perUser[userId] || 0) + cost;
    entry.lastReset = today;
    
    this.costs.set(today, entry);
  }

  getDailyCost(): number {
    const today = new Date().toISOString().split('T')[0];
    const entry = this.costs.get(today);
    return entry?.daily || 0;
  }
}

// ============================================
// PRODUCTION MATCHING ENGINE
// ============================================

interface MatchingResult {
  matches: JobMatch[];
  method: 'ai_success' | 'ai_timeout' | 'ai_failed' | 'rule_based' | 'cache_hit';
  processingTime: number;
  confidence: number;
  cost?: number;
  cacheHit?: boolean;
}

export class ProductionMatchingEngine {
  private openai: OpenAI | null = null;
  private cache: LRUMatchCache;
  private costTracker: CostTracker;
  private config: MatchingConfig;
  private circuitBreaker = {
    failures: 0,
    lastFailure: 0,
    isOpen: false,
    threshold: 5,
    timeout: 60000 // 1 minute
  };

  constructor(config: MatchingConfig = PRODUCTION_CONFIG) {
    this.config = config;
    this.cache = new LRUMatchCache(config.maxCacheSize, config.cacheTTLMs);
    this.costTracker = new CostTracker(config.costLimitDaily, config.costLimitPerUser);
    
    this.initializeOpenAI();
  }

  private initializeOpenAI(): void {
    try {
      const apiKey = process.env.OPEN_API_KEY;
      if (!apiKey) {
        console.warn('OpenAI API key not found, AI matching disabled');
        return;
      }
      
      this.openai = new OpenAI({ apiKey });
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error);
    }
  }

  private generateCacheKey(jobs: Job[], userPrefs: UserPreferences): string {
    // Use job hashes for efficiency
    const jobHashes = jobs.map(j => j.job_hash).sort().join(',');
    
    // Create a simple hash of user preferences
    const prefHash = this.hashObject(userPrefs);
    
    return `match:${jobHashes}:${prefHash}`;
  }

  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private checkCircuitBreaker(): boolean {
    if (!this.circuitBreaker.isOpen) return true;
    
    const now = Date.now();
    if (now - this.circuitBreaker.lastFailure > this.circuitBreaker.timeout) {
      this.circuitBreaker.isOpen = false;
      this.circuitBreaker.failures = 0;
      return true;
    }
    
    return false;
  }

  private recordFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailure = Date.now();
    
    if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
      this.circuitBreaker.isOpen = true;
      console.warn('Circuit breaker opened due to repeated failures');
    }
  }

  private recordSuccess(): void {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.isOpen = false;
  }

  async performMatching(
    jobs: Job[],
    userPrefs: UserPreferences,
    userId: string,
    forceRulesBased: boolean = false
  ): Promise<MatchingResult> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(jobs, userPrefs);
      const cachedMatches = this.cache.get(cacheKey);
      
      if (cachedMatches) {
        return {
          matches: cachedMatches,
          method: 'cache_hit',
          processingTime: Date.now() - startTime,
          confidence: 0.9,
          cacheHit: true
        };
      }

      // Skip AI if disabled, no client, or circuit breaker open
      if (forceRulesBased || !this.openai || !this.checkCircuitBreaker()) {
        const ruleMatches = this.performRuleBasedMatching(jobs, userPrefs);
        return {
          matches: ruleMatches,
          method: 'rule_based',
          processingTime: Date.now() - startTime,
          confidence: 0.8
        };
      }

      // Check cost limits
      const estimatedCost = 0.02; // Estimated cost per AI call
      const costCheck = this.costTracker.canMakeCall(userId, estimatedCost);
      if (!costCheck.allowed) {
        console.warn(`AI call blocked: ${costCheck.reason}`);
        const ruleMatches = this.performRuleBasedMatching(jobs, userPrefs);
        return {
          matches: ruleMatches,
          method: 'rule_based',
          processingTime: Date.now() - startTime,
          confidence: 0.8
        };
      }

      // Try AI matching with timeout and retries
      const aiMatches = await this.performAIMatchingWithRetry(jobs, userPrefs);
      
      if (aiMatches && aiMatches.length > 0) {
        // Cache successful AI matches
        this.cache.set(cacheKey, aiMatches);
        this.costTracker.recordCall(userId, estimatedCost);
        this.recordSuccess();
        
        return {
          matches: aiMatches,
          method: 'ai_success',
          processingTime: Date.now() - startTime,
          confidence: 0.9,
          cost: estimatedCost
        };
      }
    } catch (error) {
      console.error('AI matching failed:', error);
      this.recordFailure();
    }

    // Fallback to rule-based matching
    const ruleMatches = this.performRuleBasedMatching(jobs, userPrefs);
    return {
      matches: ruleMatches,
      method: 'ai_failed',
      processingTime: Date.now() - startTime,
      confidence: 0.7
    };
  }

  private async performAIMatchingWithRetry(
    jobs: Job[],
    userPrefs: UserPreferences
  ): Promise<JobMatch[]> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.performAIMatchingWithTimeout(jobs, userPrefs);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.config.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.warn(`AI matching attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }

  private async performAIMatchingWithTimeout(
    jobs: Job[],
    userPrefs: UserPreferences
  ): Promise<JobMatch[]> {
    if (!this.openai) throw new Error('OpenAI client not initialized');

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI_TIMEOUT')), this.config.aiTimeoutMs);
    });

    const aiPromise = this.callOpenAIAPI(jobs, userPrefs);

    try {
      return await Promise.race([aiPromise, timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message === 'AI_TIMEOUT') {
        throw new Error('AI matching timed out');
      }
      throw error;
    }
  }

  private async callOpenAIAPI(jobs: Job[], userPrefs: UserPreferences): Promise<JobMatch[]> {
    if (!this.openai) throw new Error('OpenAI client not initialized');

    // Pre-filter jobs for efficiency
    const jobsToAnalyze = jobs.slice(0, this.config.jobsToAnalyze);
    
    const prompt = this.buildOptimizedPrompt(jobsToAnalyze, userPrefs);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You're a career advisor. Find 5 perfect job matches and explain WHY they're exciting. Be specific, personal, and confident. Keep reasons 2-3 sentences max.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 1500,
      functions: [{
        name: 'return_job_matches',
        description: 'Return the top 5 most relevant job matches',
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
                  job_index: { type: 'number', minimum: 1 },
                  job_hash: { type: 'string' },
                  match_score: { type: 'number', minimum: 50, maximum: 100 },
                  match_reason: { type: 'string', maxLength: 400 }
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

    const functionCall = completion.choices[0]?.message?.function_call;
    if (!functionCall || functionCall.name !== 'return_job_matches') {
      throw new Error('Invalid function call response');
    }

    const functionArgs = JSON.parse(functionCall.arguments);
    return this.validateAndTransformMatches(functionArgs.matches, jobsToAnalyze);
  }

  private buildOptimizedPrompt(jobs: Job[], userPrefs: UserPreferences): string {
    const jobList = jobs.map((job, index) => 
      `${index + 1}. ${job.title} at ${job.company} (${job.location}) - ${job.job_hash}`
    ).join('\n');

    return `Find 5 perfect matches for this user:

USER PREFERENCES:
- Cities: ${userPrefs.target_cities?.join(', ') || 'Any'}
- Career Path: ${userPrefs.career_path || 'Any'}
- Languages: ${userPrefs.languages?.join(', ') || 'Any'}

AVAILABLE JOBS:
${jobList}

Return matches with exciting, specific reasons.`;
  }

  private validateAndTransformMatches(aiMatches: any[], jobs: Job[]): JobMatch[] {
    const validMatches: JobMatch[] = [];
    
    for (const match of aiMatches) {
      if (!match.job_index || !match.job_hash || !match.match_score || !match.match_reason) {
        continue;
      }
      
      const jobIndex = match.job_index - 1;
      if (jobIndex < 0 || jobIndex >= jobs.length) {
        continue;
      }
      
      const job = jobs[jobIndex];
      if (job.job_hash !== match.job_hash) {
        continue;
      }
      
      validMatches.push({
        job_hash: match.job_hash,
        match_score: Math.min(100, Math.max(50, match.match_score)),
        match_reason: match.match_reason.substring(0, 400),
        job: job
      });
    }
    
    return validMatches.slice(0, 5); // Ensure max 5 matches
  }

  private performRuleBasedMatching(jobs: Job[], userPrefs: UserPreferences): JobMatch[] {
    // Simplified rule-based matching
    const matches: JobMatch[] = [];
    
    for (const job of jobs.slice(0, 5)) {
      let score = 50; // Base score
      
      // Location matching
      if (userPrefs.target_cities?.includes(job.location)) {
        score += 20;
      }
      
      // Career path matching (simplified)
      if (userPrefs.career_path && job.title.toLowerCase().includes(userPrefs.career_path.toLowerCase())) {
        score += 15;
      }
      
      if (score >= 50) {
        matches.push({
          job_hash: job.job_hash,
          match_score: Math.min(100, score),
          match_reason: `Good match based on location and role requirements`,
          job: job
        });
      }
    }
    
    return matches;
  }

  // Public methods for monitoring
  getCacheStats() {
    return this.cache.getStats();
  }

  getCostStats() {
    return {
      dailyCost: this.costTracker.getDailyCost(),
      dailyLimit: this.config.costLimitDaily,
      perUserLimit: this.config.costLimitPerUser
    };
  }

  getCircuitBreakerStatus() {
    return {
      isOpen: this.circuitBreaker.isOpen,
      failures: this.circuitBreaker.failures,
      lastFailure: this.circuitBreaker.lastFailure
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let _matchingEngine: ProductionMatchingEngine | null = null;

export function getProductionMatchingEngine(): ProductionMatchingEngine {
  if (!_matchingEngine) {
    _matchingEngine = new ProductionMatchingEngine();
  }
  return _matchingEngine;
}

export function resetMatchingEngine(): void {
  _matchingEngine = null;
}
