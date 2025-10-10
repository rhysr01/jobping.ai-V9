/**
 * AI Matching Service
 * Extracted from jobMatching.ts for better organization
 */

import OpenAI from 'openai';
import { Job, FreshnessTier } from '../../scrapers/types';
import { 
  EnrichedJob, 
  NormalizedUserProfile, 
  JobMatch, 
  AiProvenance 
} from './types';
import { enrichJobData, calculateFreshnessTier } from './job-enrichment.service';
import { timeout } from './normalizers';

// ================================
// AI MATCHING CACHE SYSTEM
// ================================

interface LRUCacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
}

class LRUCache<K, V> {
  private cache = new Map<K, LRUCacheEntry<V>>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number, ttlMs: number) {
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    entry.accessCount++;
    return entry.value;
  }

  set(key: K, value: V): void {
    const now = Date.now();
    
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      value,
      timestamp: now,
      accessCount: 1
    });
  }

  private evictLeastUsed(): void {
    let leastUsedKey: K | undefined;
    let leastUsedCount = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < leastUsedCount) {
        leastUsedCount = entry.accessCount;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey !== undefined) {
      this.cache.delete(leastUsedKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export class AIMatchingCache {
  private static cache = new LRUCache<string, any[]>(10000, 1000 * 60 * 30); // 10k entries, 30 minutes TTL

  static get(key: string): any[] | undefined {
    return this.cache.get(key);
  }

  static set(key: string, value: any[]): void {
    this.cache.set(key, value);
  }

  static clear(): void {
    this.cache.clear();
  }

  static size(): number {
    return this.cache.size();
  }
}

// ================================
// AI MATCHING SERVICE
// ================================

export class AIMatchingService {
  private openai: OpenAI;
  private cache: AIMatchingCache;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
    this.cache = AIMatchingCache;
  }

  async performEnhancedAIMatching(
    jobs: Job[], 
    userPrefs: NormalizedUserProfile
  ): Promise<JobMatch[]> {
    const startTime = Date.now();
    
    try {
      // Check cache first (with feedback-aware key)
      const cacheKey = await this.generateCacheKey(jobs, userPrefs);
      const cachedResult = AIMatchingCache.get(cacheKey);
      
      if (cachedResult) {
        console.log('🎯 Cache hit for AI matching');
        return cachedResult;
      }

      // Enrich jobs with additional data
      const enrichedJobs = jobs.map(job => enrichJobData(job));
      
      // Build prompt (with feedback learning)
      const prompt = await this.buildMatchingPrompt(enrichedJobs, userPrefs);
      
      // Call OpenAI with timeout
      const response = await Promise.race([
        this.openai.chat.completions.create({
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert job matching AI. Analyze jobs and return JSON matches.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
        timeout<OpenAI.Chat.Completions.ChatCompletion>(20000, 'AI matching timeout')
      ]);

      // Parse and validate response
      const matches = this.parseAndValidateMatches(
        response.choices[0]?.message?.content || '',
        jobs
      );

      // Cache result
      AIMatchingCache.set(cacheKey, matches);

      const latency = Date.now() - startTime;
      console.log(`🤖 AI matching completed in ${latency}ms, found ${matches.length} matches`);

      return matches;

    } catch (error) {
      console.error('AI matching failed:', error);
      throw new Error(`AI matching failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateCacheKey(jobs: Job[], userPrefs: NormalizedUserProfile): Promise<string> {
    const jobHashes = jobs.map(j => j.job_hash).sort().join(',');
    
    // Include feedback count in cache key
    let feedbackFingerprint = 'no-feedback';
    try {
      const summary = await this.getFeedbackSummary(userPrefs.email);
      if (summary && summary.total >= 3) {
        // Include feedback count and positive ratio in cache key
        feedbackFingerprint = `fb${summary.total}-pos${summary.positive}`;
      }
    } catch {
      // Ignore errors, use default
    }
    
    const userKey = `${userPrefs.email}-${userPrefs.careerFocus}-${feedbackFingerprint}`;
    return `ai-match:${userKey}:${jobHashes}`;
  }

  private async buildMatchingPrompt(jobs: EnrichedJob[], userProfile: NormalizedUserProfile): Promise<string> {
    const userContext = await this.buildUserContextWithFeedback(userProfile);
    const jobsContext = this.buildJobsContext(jobs);
    
    return `
${userContext}

${jobsContext}

Analyze each job and return a JSON array of matches. For each match, provide:
- job_index: Index in the jobs array (0-based)
- match_score: Score from 1-100
- match_reason: Brief explanation
- confidence_score: Confidence from 0.0-1.0

Return only valid JSON, no other text.
`;
  }

  private buildUserContext(profile: NormalizedUserProfile): string {
    return `
USER PROFILE:
- Email: ${profile.email}
- Career Focus: ${profile.careerFocus || 'Not specified'}
- Target Cities: ${profile.target_cities?.join(', ') || 'Not specified'}
- Languages: ${profile.languages_spoken?.join(', ') || 'Not specified'}
- Work Environment: ${profile.work_environment || 'flexible'}
- Experience Level: ${profile.entry_level_preference || 'entry'}
- Start Date: ${profile.start_date || 'flexible'}
- Company Types: ${profile.company_types?.join(', ') || 'Not specified'}
- Roles: ${profile.roles_selected?.join(', ') || 'Not specified'}
`;
  }

  // NEW: Build user context WITH feedback learning
  private async buildUserContextWithFeedback(profile: NormalizedUserProfile): Promise<string> {
    // Get basic context
    const basicContext = this.buildUserContext(profile);
    
    // Try to get feedback summary
    try {
      const feedbackSummary = await this.getFeedbackSummary(profile.email);
      
      if (!feedbackSummary || feedbackSummary.total < 3) {
        // Not enough feedback, return basic context
        return basicContext;
      }
      
      // Add feedback insights
      return `${basicContext}

LEARNED PREFERENCES (from ${feedbackSummary.total} ratings):
✅ USER LOVES:
  ${feedbackSummary.loved.map((item: string) => `- ${item}`).join('\n  ')}

❌ USER AVOIDS:
  ${feedbackSummary.disliked.map((item: string) => `- ${item}`).join('\n  ')}

MATCHING STRATEGY:
- Prioritize jobs similar to their top-rated matches
- Avoid patterns that led to low ratings
- User has rated ${feedbackSummary.positive}/${feedbackSummary.total} jobs positively (${Math.round(feedbackSummary.positive/feedbackSummary.total*100)}%)
`;
    } catch (error) {
      console.warn('Failed to get feedback summary, using basic context:', error);
      return basicContext;
    }
  }

  // NEW: Fetch and analyze user feedback
  private async getFeedbackSummary(userEmail: string): Promise<any> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Get last 20 feedback entries
      const { data: feedback, error } = await supabase
        .from('user_feedback')
        .select('verdict, relevance_score, job_context')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error || !feedback || feedback.length === 0) {
        return null;
      }
      
      // Analyze patterns
      const positive = feedback.filter(f => f.relevance_score >= 4);
      const negative = feedback.filter(f => f.relevance_score <= 2);
      
      // Extract what they loved (top 3 things from 5-star jobs)
      const loved: string[] = [];
      positive.slice(0, 5).forEach(f => {
        const ctx = f.job_context;
        if (ctx?.location) loved.push(`${ctx.location} location`);
        if (ctx?.company) loved.push(`${ctx.company}-type companies`);
      });
      
      // Extract what they disliked (top 3 things from 1-2 star jobs)
      const disliked: string[] = [];
      negative.slice(0, 5).forEach(f => {
        const ctx = f.job_context;
        if (ctx?.location) disliked.push(`${ctx.location} location`);
        if (ctx?.title?.toLowerCase().includes('senior')) disliked.push('Senior roles');
      });
      
      return {
        total: feedback.length,
        positive: positive.length,
        negative: negative.length,
        loved: [...new Set(loved)].slice(0, 3),  // Dedupe, top 3
        disliked: [...new Set(disliked)].slice(0, 3)
      };
    } catch (error) {
      console.error('Error fetching feedback:', error);
      return null;
    }
  }

  private buildJobsContext(jobs: EnrichedJob[]): string {
    return jobs.map((job, index) => `
JOB ${index}:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Description: ${job.description?.substring(0, 500)}...
- Categories: ${job.categories?.join(', ')}
- Experience Level: ${job.experienceLevel}
- Remote Flexibility: ${job.remoteFlexibility}/10
- Market Demand: ${job.marketDemand}/10
`).join('\n');
  }

  parseAndValidateMatches(response: string, jobs: Job[]): JobMatch[] {
    try {
      // Clean up response
      const cleanedResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const matches = JSON.parse(cleanedResponse);
      
      if (!Array.isArray(matches)) {
        throw new Error('Response is not an array');
      }

      return matches
        .filter(match => 
          typeof match.job_index === 'number' &&
          match.job_index >= 0 &&
          match.job_index < jobs.length &&
          typeof match.match_score === 'number' &&
          match.match_score >= 1 &&
          match.match_score <= 100
        )
        .map(match => ({
          job_index: match.job_index,
          job_hash: jobs[match.job_index].job_hash,
          match_score: match.match_score,
          match_reason: match.match_reason || 'AI match',
          confidence_score: match.confidence_score || 0.8
        }));

    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('Invalid AI response format');
    }
  }

  convertToRobustMatches(aiMatches: any[], user: NormalizedUserProfile, jobs: Job[]): any[] {
    return aiMatches
      .filter(match => match.job_index >= 0 && match.job_index < jobs.length)
      .map(match => ({
          job: jobs[match.job_index],
        match_score: match.match_score,
        match_reason: match.match_reason,
        confidence_score: match.confidence_score
      }))
      .sort((a, b) => b.match_score - a.match_score);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  getStats(): any {
    return {
      model: 'gpt-4-turbo',
      maxTokens: 4000,
      temperature: 0.7,
      timeout: 20000
    };
  }
}