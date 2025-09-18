/**
 * Consolidated Matching Service
 * Main orchestrator for all matching logic
 * Extracted from jobMatching.ts for better organization
 */

import { Job } from '../../scrapers/types';
import { 
  UserPreferences, 
  NormalizedUserProfile, 
  MatchResult, 
  JobMatch,
  AiProvenance 
} from './types';
import { normalizeUserPreferences } from './normalizers';
import { AIMatchingService } from './ai-matching.service';
import { generateRobustFallbackMatches } from './rule-based-matcher.service';

// ================================
// CONSOLIDATED MATCHING ENGINE
// ================================

export class ConsolidatedMatchingEngine {
  private aiService: AIMatchingService;
  private fallbackEnabled: boolean;
  private aiEnabled: boolean;

  constructor() {
    this.aiService = new AIMatchingService();
    this.fallbackEnabled = true;
    this.aiEnabled = process.env.OPENAI_API_KEY ? true : false;
  }

  async performMatching(
    jobs: Job[], 
    userPrefs: UserPreferences,
    options: {
      maxResults?: number;
      enableAI?: boolean;
      enableFallback?: boolean;
      timeoutMs?: number;
    } = {}
  ): Promise<MatchResult[]> {
    const {
      maxResults = 50,
      enableAI = this.aiEnabled,
      enableFallback = this.fallbackEnabled,
      timeoutMs = 30000
    } = options;

    console.log(`🎯 Starting matching for ${userPrefs.email}`);
    console.log(`📊 Jobs: ${jobs.length}, AI: ${enableAI}, Fallback: ${enableFallback}`);

    try {
      // Normalize user preferences
      const normalizedUser = normalizeUserPreferences(userPrefs);
      
      // Try AI matching first if enabled
      if (enableAI) {
        try {
          const aiMatches = await this.performAIMatching(jobs, normalizedUser, timeoutMs);
          if (aiMatches.length > 0) {
            console.log(`🤖 AI matching found ${aiMatches.length} matches`);
            return this.limitResults(aiMatches, maxResults);
          }
        } catch (error) {
          console.warn('AI matching failed, falling back to rule-based:', error);
        }
      }

      // Fallback to rule-based matching
      if (enableFallback) {
        console.log('🔄 Using rule-based fallback matching');
        const fallbackMatches = generateRobustFallbackMatches(jobs, userPrefs);
        console.log(`📋 Rule-based matching found ${fallbackMatches.length} matches`);
        return this.limitResults(fallbackMatches, maxResults);
      }

      console.log('❌ No matching method available');
      return [];

    } catch (error) {
      console.error('Matching failed:', error);
      throw new Error(`Matching failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async performAIMatching(
    jobs: Job[], 
    userProfile: NormalizedUserProfile,
    timeoutMs: number
  ): Promise<MatchResult[]> {
    const startTime = Date.now();
    
    try {
      // Get AI matches
      const aiMatches = await this.aiService.performEnhancedAIMatching(jobs, userProfile);
      
      // Convert AI matches to MatchResult format
      const matchResults: MatchResult[] = aiMatches.map(aiMatch => {
        const job = jobs[aiMatch.job_index];
        if (!job) {
          throw new Error(`Job index ${aiMatch.job_index} out of range`);
        }

        const provenance: AiProvenance = {
          match_algorithm: 'ai',
          ai_model: 'gpt-4-turbo',
          ai_latency_ms: Date.now() - startTime,
          cache_hit: false
        };

        return {
          job,
          match_score: aiMatch.match_score,
          match_reason: aiMatch.match_reason,
          confidence_score: aiMatch.confidence_score,
          match_quality: this.getMatchQuality(aiMatch.match_score),
          score_breakdown: {
            overall: aiMatch.match_score,
            eligibility: 100, // AI handles eligibility
            location: 80,     // AI handles location
            experience: 80,   // AI handles experience
            skills: 80,       // AI handles skills
            company: 70,      // AI handles company
            timing: 70        // AI handles timing
          },
          provenance
        };
      });

      return matchResults;

    } catch (error) {
      console.error('AI matching failed:', error);
      throw error;
    }
  }

  private limitResults(matches: MatchResult[], maxResults: number): MatchResult[] {
    return matches.slice(0, maxResults);
  }

  private getMatchQuality(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'very good';
    if (score >= 70) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }

  // ================================
  // UTILITY METHODS
  // ================================

  async clearCache(): Promise<void> {
    // Clear AI matching cache
    // Note: AIMatchingCache.clear() is static, so we call it directly
    const { AIMatchingCache } = await import('./ai-matching.service');
    AIMatchingCache.clear();
  }

  getCacheStats(): { size: number; hitRate?: number } {
    // Get cache statistics
    const { AIMatchingCache } = require('./ai-matching.service');
    return {
      size: AIMatchingCache.size()
    };
  }

  setConfiguration(config: {
    aiEnabled?: boolean;
    fallbackEnabled?: boolean;
  }): void {
    if (config.aiEnabled !== undefined) {
      this.aiEnabled = config.aiEnabled;
    }
    if (config.fallbackEnabled !== undefined) {
      this.fallbackEnabled = config.fallbackEnabled;
    }
  }
}

// ================================
// FACTORY FUNCTION
// ================================

export function createConsolidatedMatcher(): ConsolidatedMatchingEngine {
  return new ConsolidatedMatchingEngine();
}

// ================================
// LEGACY COMPATIBILITY
// ================================

// Export the main function for backward compatibility
export async function performEnhancedAIMatching(
  jobs: Job[], 
  userPrefs: UserPreferences
): Promise<MatchResult[]> {
  const matcher = createConsolidatedMatcher();
  return matcher.performMatching(jobs, userPrefs);
}

// Export for backward compatibility with existing code
export { generateRobustFallbackMatches } from './rule-based-matcher.service';
export { normalizeUserPreferences } from './normalizers';
export { enrichJobData, calculateFreshnessTier } from './job-enrichment.service';
