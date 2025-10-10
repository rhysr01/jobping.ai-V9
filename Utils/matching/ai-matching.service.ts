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
          model: 'gpt-4o-mini',
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
          temperature: 0.4, // Higher for more personality and WOW moments
          max_tokens: 2500, // More room for exciting match reasons
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

You're a friendly career advisor (not a corporate recruiter). 
Write match reasons that create a "WOW" moment:

✅ BE SPECIFIC: "You need React + TypeScript. This role uses both PLUS Next.js"
✅ BE PERSONAL: "Remember that remote role you rated 5⭐? This is similar but pays €10K more"
✅ BE CONFIDENT: "You're overqualified for this (which means easy interview)"
✅ BE EMOTIONAL: "This is the kind of startup you'll tell your friends about"

❌ DON'T: "Good match for your skills" (boring!)
❌ DON'T: "Aligns with your preferences" (corporate!)

For each match, return JSON with:
- job_index: Index in jobs array (0-based)
- match_score: 1-100
- match_reason: Exciting, specific, personal reason (2-3 sentences max)
- confidence_score: 0.0-1.0

Return ONLY valid JSON array, no other text.
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

  // NEW: Build user context WITH feedback learning AND CV insights
  private async buildUserContextWithFeedback(profile: NormalizedUserProfile): Promise<string> {
    // Get basic context
    const basicContext = this.buildUserContext(profile);
    
    // Get CV insights
    const cvInsights = await this.getCVInsights(profile.email);
    
    // Get feedback summary
    const feedbackSummary = await this.getFeedbackSummary(profile.email);
    
    let enhancedContext = basicContext;
    
    // Add CV insights if available
    if (cvInsights.length > 0) {
      enhancedContext += `

CV HIGHLIGHTS (use these for WOW factor):
${cvInsights.map((insight: string) => `- ${insight}`).join('\n')}
`;
    }
    
    // Add feedback insights if available
    if (feedbackSummary && feedbackSummary.total >= 3) {
      enhancedContext += `

LEARNED PREFERENCES (from ${feedbackSummary.total} ratings):
✅ USER LOVES:
  ${feedbackSummary.loved.map((item: string) => `- ${item}`).join('\n  ')}

❌ USER AVOIDS:
  ${feedbackSummary.disliked.map((item: string) => `- ${item}`).join('\n  ')}
`;
    }
    
    return enhancedContext;
  }

  // NEW: Get CV insights for WOW factor
  private async getCVInsights(userEmail: string): Promise<string[]> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Check if we have cached CV data
      const { data: cvCache } = await supabase
        .from('user_cv_data')
        .select('cv_data')
        .eq('user_email', userEmail)
        .single();
      
      if (cvCache && cvCache.cv_data) {
        const cvData = cvCache.cv_data as any;
        
        // Generate WOW insights from CV
        const insights: string[] = [];
        
        if (cvData.total_years_experience) {
          insights.push(`${cvData.total_years_experience} years experience`);
        }
        
        if (cvData.previous_companies && cvData.previous_companies.length > 0) {
          insights.push(`Worked at: ${cvData.previous_companies.slice(0, 2).join(', ')}`);
        }
        
        if (cvData.technical_skills && cvData.technical_skills.length > 0) {
          insights.push(`Skills: ${cvData.technical_skills.slice(0, 3).join(', ')}`);
        }
        
        if (cvData.unique_strengths && cvData.unique_strengths.length > 0) {
          insights.push(...cvData.unique_strengths.slice(0, 2));
        }
        
        return insights;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching CV insights:', error);
      return [];
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
        model: 'gpt-4o-mini',
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
      model: 'gpt-4o-mini',
      maxTokens: 4000,
      temperature: 0.7,
      timeout: 20000
    };
  }
}