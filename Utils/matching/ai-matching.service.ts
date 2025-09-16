/**
 * AI matching service with OpenAI integration
 * Extracted from the massive jobMatching.ts file
 */

import OpenAI from 'openai';
import type { Job, UserPreferences, JobMatch, EnrichedJob, NormalizedUserProfile } from './types';
// Import job enrichment functions
const { enrichJobData, normalizeUserPreferences } = require('./job-enrichment.service');

// ---------- AI Matching Cache ----------
export class AIMatchingCache {
  private cache = new Map<string, { value: any; expiry: number }>();
  private maxSize = 1000;

  get(key: string): any {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  set(key: string, value: any, ttl: number = 3600000): void { // 1 hour default
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// ---------- AI Matching Service ----------
export class AIMatchingService {
  private openai: OpenAI | null = null;
  private cache: AIMatchingCache;
  private costTracker = {
    gpt4: { calls: 0, tokens: 0, cost: 0 },
    gpt35: { calls: 0, tokens: 0, cost: 0 }
  };

  constructor(apiKey?: string) {
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
    }
    this.cache = new AIMatchingCache();
  }

  async performEnhancedAIMatching(
    jobs: Job[], 
    userPrefs: UserPreferences, 
    openai?: OpenAI
  ): Promise<{ matches: JobMatch[] }> {
    const client = openai || this.openai;
    if (!client) {
      throw new Error('OpenAI client not available');
    }

    const startTime = Date.now();
    
    try {
      // Enrich jobs and user profile
      const enrichedJobs = jobs.slice(0, 20).map(job => enrichJobData(job));
      const userProfile = normalizeUserPreferences(userPrefs);
      
      // Build prompt
      const prompt = this.buildMatchingPrompt(enrichedJobs, userProfile);
      
      // Make API call with timeout
      const completion = await Promise.race([
        client.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a job matching expert. Analyze jobs and return the best matches using the provided function.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 1000,
          functions: [{
            name: 'return_job_matches',
            description: 'Return job matches in structured format',
            parameters: {
              type: 'object',
              properties: {
                matches: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      job_index: { type: 'number', minimum: 1 },
                      job_hash: { type: 'string' },
                      match_score: { type: 'number', minimum: 50, maximum: 100 },
                      match_reason: { type: 'string', maxLength: 200 }
                    },
                    required: ['job_index', 'job_hash', 'match_score', 'match_reason']
                  }
                }
              },
              required: ['matches']
            }
          }],
          function_call: { name: 'return_job_matches' }
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('AI_TIMEOUT')), 20000)
        )
      ]);

      // Track costs
      this.trackCost(completion.usage, 'gpt-4');

      const functionCall = completion.choices[0]?.message?.function_call;
      if (!functionCall || functionCall.name !== 'return_job_matches') {
        throw new Error('Invalid function call response');
      }

      const functionArgs = JSON.parse(functionCall.arguments);
      const matches = this.parseFunctionCallResponse(functionArgs.matches, jobs);
      
      return { matches };
      
    } catch (error) {
      if (error instanceof Error && error.message === 'AI_TIMEOUT') {
        console.warn('AI matching timed out after 20s');
        return { matches: [] };
      }
      throw error;
    }
  }

  private buildMatchingPrompt(jobs: EnrichedJob[], userProfile: NormalizedUserProfile): string {
    const userCities = userProfile.target_cities.join(', ') || 'Europe';
    const userCareer = userProfile.professional_expertise || 'Graduate';
    const userLevel = userProfile.entry_level_preference || 'entry-level';

    const jobList = jobs.slice(0, 10).map((job, i) => 
      `${i+1}: ${job.title} at ${job.company} [${job.job_hash}]`
    ).join('\n');

    return `User seeks ${userLevel} ${userCareer} roles in ${userCities}.

Jobs:
${jobList}

Return JSON array with top 5 matches:
[{"job_index":1,"job_hash":"actual-hash","match_score":75,"match_reason":"Brief reason"}]

Requirements:
- job_index: 1-${jobs.length}
- match_score: 50-100
- Use actual job_hash from above
- Max 5 matches
- Valid JSON only`;
  }

  private parseFunctionCallResponse(matches: any[], jobs: Job[]): JobMatch[] {
    try {
      if (!Array.isArray(matches)) {
        throw new Error('Response is not an array');
      }

      return matches
        .filter(match => this.isValidMatch(match, jobs.length))
        .slice(0, 5)
        .map(match => ({
          job_index: match.job_index,
          job_hash: match.job_hash,
          match_score: Math.min(100, Math.max(50, match.match_score)),
          match_reason: match.match_reason || 'AI match',
          match_quality: this.getQualityLabel(match.match_score),
          match_tags: 'ai-generated'
        }));

    } catch (error) {
      console.error('Failed to parse function call response:', error);
      return [];
    }
  }

  private isValidMatch(match: any, maxJobIndex: number): boolean {
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

  private getQualityLabel(score: number): string {
    if (score >= 85) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 65) return 'fair';
    return 'poor';
  }

  private trackCost(usage: any, model: 'gpt-4' | 'gpt-3.5-turbo'): void {
    if (!usage) return;
    
    const key = model === 'gpt-4' ? 'gpt4' : 'gpt35';
    this.costTracker[key].calls++;
    this.costTracker[key].tokens += usage.total_tokens || 0;
    
    // Rough cost calculation (approximate)
    const costPerToken = model === 'gpt-4' ? 0.00003 : 0.000002;
    this.costTracker[key].cost += (usage.total_tokens || 0) * costPerToken;
  }

  getCostSummary() {
    return this.costTracker;
  }
}