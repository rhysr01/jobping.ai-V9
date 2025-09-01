/**
 * Matcher Orchestrator for JobPing Matching System
 * 
 * This orchestrator coordinates all matching services (AI, Fallback, Scoring)
 * and provides a unified interface for job matching operations.
 */

import OpenAI from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';
import { Job, UserPreferences, MatchResult, MatchingResult } from './types';
import { MATCHING_CONFIG, getConfig } from '../config/matching';
import { ScoringService } from './scoring.service';
import { AIMatchingService } from './ai-matching.service';
import { FallbackMatchingService } from './fallback.service';

export class MatcherOrchestrator {
  private config: typeof MATCHING_CONFIG;
  private scoringService: ScoringService;
  private aiService: AIMatchingService;
  private fallbackService: FallbackMatchingService;

  constructor(
    private openai: OpenAI,
    private supabase: SupabaseClient,
    config = MATCHING_CONFIG
  ) {
    this.config = config;
    this.scoringService = new ScoringService(config);
    this.aiService = new AIMatchingService(openai, config);
    this.fallbackService = new FallbackMatchingService(this.scoringService, config);
  }

  /**
   * Generate matches for a single user
   */
  async generateMatchesForUser(
    user: UserPreferences,
    jobs: Job[]
  ): Promise<MatchingResult> {
    // Input validation
    if (!user || !user.email) {
      throw new Error('Invalid user: email is required');
    }
    
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return {
        user: user.email,
        matches: [],
        matchCount: 0,
        aiSuccess: false,
        fallbackUsed: false,
        processingTime: 0,
        errors: ['No jobs available for matching']
      };
    }
    const startTime = Date.now();
    const envConfig = getConfig();
    
    try {
      console.log(`🎯 Generating matches for ${user.email}`);
      
      // Apply user and job caps
      const cappedJobs = jobs.slice(0, envConfig.jobCap);
      const maxMatches = envConfig.perUserCap;
      
      // Try AI matching first
      let matches: MatchResult[] = [];
      let aiSuccess = false;
      let fallbackUsed = false;
      
      try {
        matches = await this.aiService.performEnhancedMatching(cappedJobs, user);
        aiSuccess = true;
        console.log(`✅ AI matching successful for ${user.email}: ${matches.length} matches`);
      } catch (error) {
        console.error(`❌ AI matching failed for ${user.email}:`, error);
        aiSuccess = false;
      }
      
      // Use fallback if AI failed or produced insufficient matches
      if (!aiSuccess || matches.length === 0) {
        console.log(`🔄 Using fallback matching for ${user.email}`);
        matches = this.fallbackService.generateRobustFallbackMatches(cappedJobs, user);
        fallbackUsed = true;
      }
      
      // Limit matches to user cap
      matches = matches.slice(0, maxMatches);
      
      // Log match session
      await this.logMatchSession(user.email, aiSuccess ? 'ai_success' : 'fallback', cappedJobs.length, matches.length);
      
      const processingTime = Date.now() - startTime;
      
      return {
        user: user.email,
        matches,
        matchCount: matches.length,
        aiSuccess,
        fallbackUsed,
        processingTime,
      };
      
    } catch (error) {
      console.error(`❌ Matching failed for ${user.email}:`, error);
      
      // Emergency fallback
      const emergencyMatches = this.fallbackService.generateEmergencyFallbackMatches(jobs, user);
      
      const processingTime = Date.now() - startTime;
      
      return {
        user: user.email,
        matches: emergencyMatches,
        matchCount: emergencyMatches.length,
        aiSuccess: false,
        fallbackUsed: true,
        processingTime,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Generate matches for multiple users
   */
  async generateMatchesForUsers(
    users: UserPreferences[],
    jobs: Job[]
  ): Promise<Map<string, MatchResult[]>> {
    const results = new Map<string, MatchResult[]>();
    const envConfig = getConfig();
    
    // Apply user cap
    const cappedUsers = users.slice(0, envConfig.userCap);
    
    console.log(`🎯 Generating matches for ${cappedUsers.length} users`);
    
    for (const user of cappedUsers) {
      try {
        const result = await this.generateMatchesForUser(user, jobs);
        results.set(user.email, result.matches);
        
        console.log(`✅ Generated ${result.matches.length} matches for ${user.email} (${result.processingTime}ms)`);
      } catch (error) {
        console.error(`❌ Failed to generate matches for ${user.email}:`, error);
        results.set(user.email, []);
      }
    }
    
    return results;
  }

  /**
   * Generate matches with specific strategy
   */
  async generateMatchesWithStrategy(
    user: UserPreferences,
    jobs: Job[],
    strategy: 'ai_only' | 'fallback_only' | 'hybrid'
  ): Promise<MatchingResult> {
    const startTime = Date.now();
    
    try {
      let matches: MatchResult[] = [];
      let aiSuccess = false;
      let fallbackUsed = false;
      
      switch (strategy) {
        case 'ai_only':
          try {
            matches = await this.aiService.performEnhancedMatching(jobs, user);
            aiSuccess = true;
          } catch (error) {
            console.error('AI-only strategy failed:', error);
            throw error;
          }
          break;
          
        case 'fallback_only':
          matches = this.fallbackService.generateRobustFallbackMatches(jobs, user);
          fallbackUsed = true;
          break;
          
        case 'hybrid':
          // Try AI first, fallback if needed
          try {
            matches = await this.aiService.performEnhancedMatching(jobs, user);
            aiSuccess = true;
          } catch (error) {
            console.error('AI failed in hybrid strategy, using fallback:', error);
            matches = this.fallbackService.generateRobustFallbackMatches(jobs, user);
            fallbackUsed = true;
          }
          break;
      }
      
      const processingTime = Date.now() - startTime;
      
      return {
        user: user.email,
        matches,
        matchCount: matches.length,
        aiSuccess,
        fallbackUsed,
        processingTime,
      };
      
    } catch (error) {
      console.error(`❌ Strategy-based matching failed for ${user.email}:`, error);
      
      const processingTime = Date.now() - startTime;
      
      return {
        user: user.email,
        matches: [],
        matchCount: 0,
        aiSuccess: false,
        fallbackUsed: false,
        processingTime,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Test all matching components
   */
  async testMatchingComponents(): Promise<{
    aiConnection: boolean;
    scoringService: boolean;
    fallbackService: boolean;
    config: boolean;
  }> {
    const results = {
      aiConnection: false,
      scoringService: false,
      fallbackService: false,
      config: false
    };
    
    try {
      // Test AI connection
      results.aiConnection = await this.aiService.testConnection();
    } catch (error) {
      console.error('AI connection test failed:', error);
    }
    
    try {
      // Test scoring service
      const testJob = {
        id: 'test',
        job_hash: 'test-hash',
        title: 'Test Job',
        company: 'Test Company',
        job_url: 'https://example.com',
        location: 'Test City',
        description: 'Test description',
        experience_required: 'entry-level',
        work_environment: 'remote',
        source: 'test',
        categories: ['early-career'],
        company_profile_url: '',
        language_requirements: [],
        scrape_timestamp: new Date().toISOString(),
        original_posted_date: new Date().toISOString(),
        posted_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
      };
      
      const testUser = {
        email: 'test@example.com',
        career_path: 'tech',
        target_cities: ['Test City']
      };
      
      const score = this.scoringService.calculateMatchScore(testJob, testUser);
      results.scoringService = score.overall >= 0;
    } catch (error) {
      console.error('Scoring service test failed:', error);
    }
    
    try {
      // Test fallback service
      const stats = this.fallbackService.getStats();
      results.fallbackService = stats.maxMatches > 0;
    } catch (error) {
      console.error('Fallback service test failed:', error);
    }
    
    try {
      // Test configuration
      const configValidation = this.validateConfig();
      results.config = configValidation.valid;
    } catch (error) {
      console.error('Configuration test failed:', error);
    }
    
    return results;
  }

  /**
   * Get orchestrator statistics
   */
  getStats(): {
    config: typeof MATCHING_CONFIG;
    aiStats: ReturnType<AIMatchingService['getStats']>;
    fallbackStats: ReturnType<FallbackMatchingService['getStats']>;
  } {
    return {
      config: this.config,
      aiStats: this.aiService.getStats(),
      fallbackStats: this.fallbackService.getStats()
    };
  }

  /**
   * Validate configuration
   */
  private validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate scoring weights sum to 1
    const weightSum = Object.values(this.config.scoring.weights).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(weightSum - 1) > 0.01) {
      errors.push(`Scoring weights must sum to 1.0, got ${weightSum}`);
    }
    
    // Validate thresholds
    if (this.config.scoring.thresholds.confident <= this.config.scoring.thresholds.minimum) {
      errors.push('Confident threshold must be greater than minimum threshold');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Log match session to database
   */
  private async logMatchSession(
    userEmail: string,
    matchType: 'ai_success' | 'fallback' | 'ai_failed',
    jobCount: number,
    matchCount: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.supabase.from('match_logs').insert({
        user_email: userEmail,
        match_type: matchType,
        job_count: jobCount,
        match_count: matchCount,
        error_message: errorMessage,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log match session:', error);
    }
  }
}
