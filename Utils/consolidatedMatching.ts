/**
 * CONSOLIDATED MATCHING SYSTEM
 * Replacing all AI emergency fixes with a single, stable implementation
 * Built on existing Jobping codebase - no hallucinations
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import type { Job } from '../scrapers/types';
import { UserPreferences, JobMatch, AIMatchingCache } from './jobMatching';

// Consolidated AI timeout - reduced from 8s to 3s as recommended
const AI_TIMEOUT_MS = 3000;

interface ConsolidatedMatchResult {
  matches: JobMatch[];
  method: 'ai_success' | 'ai_timeout' | 'ai_failed' | 'rule_based';
  processingTime: number;
  confidence: number;
}

export class ConsolidatedMatchingEngine {
  private openai: OpenAI | null = null;

  constructor(openaiApiKey?: string) {
    if (openaiApiKey) {
      this.openai = new OpenAI({ apiKey: openaiApiKey });
    }
  }

  /**
   * Main matching function - tries AI first, falls back gracefully
   */
  async performMatching(
    jobs: any[],
    userPrefs: UserPreferences,
    forceRulesBased: boolean = false
  ): Promise<ConsolidatedMatchResult> {
    const startTime = Date.now();

    // Skip AI if explicitly disabled or no client available
    if (forceRulesBased || !this.openai) {
      const ruleMatches = this.performRuleBasedMatching(jobs, userPrefs);
      return {
        matches: ruleMatches,
        method: 'rule_based',
        processingTime: Date.now() - startTime,
        confidence: 0.8
      };
    }

    // Try AI matching with timeout
    try {
      const aiMatches = await this.performAIMatchingWithTimeout(jobs, userPrefs);
      if (aiMatches && aiMatches.length > 0) {
        return {
          matches: aiMatches,
          method: 'ai_success',
          processingTime: Date.now() - startTime,
          confidence: 0.9
        };
      }
    } catch (error) {
      console.warn('AI matching failed, falling back to rules:', error instanceof Error ? error.message : 'Unknown error');
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

  /**
   * AI matching with proper timeout and stable prompt
   */
  private async performAIMatchingWithTimeout(
    jobs: any[],
    userPrefs: UserPreferences
  ): Promise<JobMatch[]> {
    if (!this.openai) throw new Error('OpenAI client not initialized');

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI_TIMEOUT')), AI_TIMEOUT_MS);
    });

    const aiPromise = this.callOpenAIAPI(jobs, userPrefs);

    try {
      return await Promise.race([aiPromise, timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message === 'AI_TIMEOUT') {
        console.warn(`AI matching timed out after ${AI_TIMEOUT_MS}ms`);
        return [];
      }
      throw error;
    }
  }

  /**
   * Stable OpenAI API call with function calling - no more parsing errors
   */
  private async callOpenAIAPI(jobs: any[], userPrefs: UserPreferences): Promise<JobMatch[]> {
    if (!this.openai) throw new Error('OpenAI client not initialized');

    // Build stable prompt that doesn't break
    const prompt = this.buildStablePrompt(jobs, userPrefs);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You analyze jobs and return match scores using the provided function.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistency
      max_tokens: 500,   // Smaller limit to reduce costs
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
    });

    const functionCall = completion.choices[0]?.message?.function_call;
    if (!functionCall || functionCall.name !== 'return_job_matches') {
      throw new Error('Invalid function call response');
    }

    try {
      const functionArgs = JSON.parse(functionCall.arguments);
      return this.parseFunctionCallResponse(functionArgs.matches, jobs);
    } catch (error) {
      throw new Error(`Failed to parse function call: ${error}`);
    }
  }

  /**
   * Stable prompt that works consistently - no more emergency fixes
   */
  private buildStablePrompt(jobs: any[], userPrefs: UserPreferences): string {
    const userCities = Array.isArray(userPrefs.target_cities) 
      ? userPrefs.target_cities.join(', ') 
      : (userPrefs.target_cities || 'Europe');
    
    const userCareer = userPrefs.professional_expertise || 'Graduate';
    const userLevel = userPrefs.entry_level_preference || 'entry-level';

    const jobList = jobs.slice(0, 6).map((job, i) => 
      `${i+1}: ${job.title} at ${job.company} [${job.job_hash}]`
    ).join('\n');

    return `User seeks ${userLevel} ${userCareer} roles in ${userCities}.

Jobs:
${jobList}

Return JSON array with top 3 matches:
[{"job_index":1,"job_hash":"actual-hash","match_score":75,"match_reason":"Brief reason"}]

Requirements:
- job_index: 1-${jobs.length}
- match_score: 50-100
- Use actual job_hash from above
- Max 3 matches
- Valid JSON only`;
  }

  /**
   * Robust response parsing - handles common failure cases
   */
  private parseAIResponse(response: string, jobs: any[]): JobMatch[] {
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
      
      if (!Array.isArray(matches)) {
        throw new Error('Response is not an array');
      }

      // Validate and clean matches
      return matches
        .filter(match => this.isValidMatch(match, jobs.length))
        .slice(0, 5) // Max 5 matches
        .map(match => ({
          job_index: match.job_index,
          job_hash: match.job_hash,
          match_score: Math.min(100, Math.max(50, match.match_score)),
          match_reason: match.match_reason || 'AI match',
          match_quality: this.getQualityLabel(match.match_score),
          match_tags: 'ai-generated'
        }));

    } catch (error) {
      console.error('Failed to parse AI response:', response.slice(0, 200));
      return []; // Return empty array to trigger fallback
    }
  }

  /**
   * Parse function call response - much more reliable than text parsing
   */
  private parseFunctionCallResponse(matches: any[], jobs: any[]): JobMatch[] {
    try {
      if (!Array.isArray(matches)) {
        throw new Error('Response is not an array');
      }

      // Validate and clean matches
      return matches
        .filter(match => this.isValidMatch(match, jobs.length))
        .slice(0, 5) // Max 5 matches
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

  /**
   * Validate individual match from AI response
   */
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

  /**
   * Enhanced rule-based matching - builds on existing logic
   */
  private performRuleBasedMatching(jobs: any[], userPrefs: UserPreferences): JobMatch[] {
    const matches: JobMatch[] = [];
    const userCities = Array.isArray(userPrefs.target_cities) ? userPrefs.target_cities : [];
    const userCareer = userPrefs.professional_expertise || '';

    for (let i = 0; i < Math.min(jobs.length, 15); i++) {
      const job = jobs[i];
      let score = 50; // Base score
      const reasons: string[] = [];

      // Title analysis (most reliable signal)
      const title = job.title?.toLowerCase() || '';
      
      if (title.includes('junior') || title.includes('graduate') || title.includes('entry')) {
        score += 25;
        reasons.push('entry-level position');
      }
      
      if (title.includes('intern') || title.includes('trainee')) {
        score += 30;
        reasons.push('early-career role');
      }

      // Career path matching
      if (userCareer) {
        const careerLower = userCareer.toLowerCase();
        const jobText = `${title} ${job.description || ''}`.toLowerCase();
        
        if (jobText.includes(careerLower)) {
          score += 20;
          reasons.push('career match');
        }
        
        // Broader career matching with existing mappings
        const careerMappings: Record<string, string[]> = {
          'software': ['developer', 'engineer', 'programmer'],
          'data': ['analyst', 'data', 'analytics'],
          'marketing': ['marketing', 'brand', 'digital'],
          'sales': ['sales', 'business development'],
          'consulting': ['consultant', 'advisory']
        };
        
        for (const [career, keywords] of Object.entries(careerMappings)) {
          if (careerLower.includes(career) && keywords.some(kw => jobText.includes(kw))) {
            score += 15;
            reasons.push('career alignment');
            break;
          }
        }
      }

      // Location matching
      if (userCities.length > 0 && job.location) {
        const location = job.location.toLowerCase();
        if (userCities.some(city => location.includes(city.toLowerCase()))) {
          score += 15;
          reasons.push('location match');
        } else if (location.includes('remote') || location.includes('europe')) {
          score += 10;
          reasons.push('flexible location');
        }
      }

      // Freshness scoring
      if (job.created_at) {
        const daysOld = (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld < 7) {
          score += 10;
          reasons.push('recent posting');
        }
      }

      // Only include matches above threshold
      if (score >= 65) {
        matches.push({
          job_index: i + 1,
          job_hash: job.job_hash,
          match_score: score,
          match_reason: reasons.join(', ') || 'Rule-based match',
          match_quality: this.getQualityLabel(score),
          match_tags: 'rule-based'
        });
      }
    }

    // Sort by score and return top matches
    return matches
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 6);
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
   * Test AI connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.openai) return false;
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
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
}

// Export factory function for easy integration
export function createConsolidatedMatcher(openaiApiKey?: string): ConsolidatedMatchingEngine {
  return new ConsolidatedMatchingEngine(openaiApiKey);
}
