/**
 * Fallback Matching Service for JobPing Matching System
 * 
 * This service provides rule-based job matching as a fallback when AI matching fails,
 * ensuring users always receive job recommendations.
 */

import { Job, UserPreferences, MatchResult } from './types';
import { MATCHING_CONFIG } from '../config/matching';
import { ScoringService } from './scoring.service';

export class FallbackMatchingService {
  private config: typeof MATCHING_CONFIG;
  private scoringService: ScoringService;

  constructor(
    scoringService: ScoringService,
    config = MATCHING_CONFIG
  ) {
    this.config = config;
    this.scoringService = scoringService;
  }

  /**
   * Generate robust fallback matches using rule-based logic
   */
  generateRobustFallbackMatches(
    jobs: Job[],
    userPrefs: UserPreferences
  ): MatchResult[] {
    console.log(`🧠 Using robust fallback for ${userPrefs.email}`);
    
    // Score all jobs for the user
    const scoredJobs = this.scoringService.scoreJobsForUser(jobs, userPrefs);
    
    // Categorize matches
    const { confident, promising } = this.scoringService.categorizeMatches(scoredJobs);
    
    // Ensure minimum matches per user
    const tierQuota = this.config.fallback.maxMatches;
    let finalMatches = confident;
    
    // Backfill with promising matches if needed
    if (finalMatches.length < tierQuota && promising.length > 0) {
      const needed = tierQuota - finalMatches.length;
      const backfill = promising.slice(0, needed);
      finalMatches = [...finalMatches, ...backfill];
    }
    
    // If still not enough, add more jobs with lower scores
    if (finalMatches.length < tierQuota) {
      const remainingJobs = scoredJobs.filter(job => 
        !finalMatches.some(match => match.job.id === job.job.id)
      );
      
      const additionalNeeded = tierQuota - finalMatches.length;
      const additional = remainingJobs.slice(0, additionalNeeded);
      finalMatches = [...finalMatches, ...additional];
    }
    
    // Ensure diversity in results
    const diverseMatches = this.ensureDiversity(finalMatches, userPrefs);
    
    return diverseMatches.slice(0, tierQuota);
  }

  /**
   * Ensure diversity in match results
   */
  private ensureDiversity(matches: MatchResult[], userPrefs: UserPreferences): MatchResult[] {
    const diverse: MatchResult[] = [];
    const seenCompanies = new Set<string>();
    const seenLocations = new Set<string>();
    
    for (const match of matches) {
      const company = match.job.company.toLowerCase();
      const location = match.job.location?.[0]?.toLowerCase() || 'unknown';
      
      // Prefer diverse companies and locations
      const companyDiversity = !seenCompanies.has(company);
      const locationDiversity = !seenLocations.has(location);
      
      if (companyDiversity || locationDiversity) {
        diverse.push(match);
        seenCompanies.add(company);
        seenLocations.add(location);
      }
    }
    
    // Add remaining matches if we still have space
    for (const match of matches) {
      if (diverse.length >= this.config.fallback.maxMatches) break;
      
      const company = match.job.company.toLowerCase();
      const location = match.job.location?.[0]?.toLowerCase() || 'unknown';
      
      if (!seenCompanies.has(company) || !seenLocations.has(location)) {
        diverse.push(match);
        seenCompanies.add(company);
        seenLocations.add(location);
      }
    }
    
    return diverse;
  }

  /**
   * Generate matches based on specific criteria
   */
  generateMatchesByCriteria(
    jobs: Job[],
    userPrefs: UserPreferences,
    criteria: {
      careerPath?: boolean;
      location?: boolean;
      freshness?: boolean;
      maxResults?: number;
    }
  ): MatchResult[] {
    const scoredJobs = this.scoringService.scoreJobsForUser(jobs, userPrefs);
    let filteredJobs = scoredJobs;
    
    // Filter by career path match
    if (criteria.careerPath) {
      filteredJobs = filteredJobs.filter(job => 
        job.scoreBreakdown.careerPath >= 70
      );
    }
    
    // Filter by location match
    if (criteria.location) {
      filteredJobs = filteredJobs.filter(job => 
        job.scoreBreakdown.location >= 70
      );
    }
    
    // Filter by freshness
    if (criteria.freshness) {
      filteredJobs = filteredJobs.filter(job => 
        job.scoreBreakdown.freshness >= 70
      );
    }
    
    const maxResults = criteria.maxResults || this.config.fallback.maxMatches;
    return filteredJobs.slice(0, maxResults);
  }

  /**
   * Generate emergency fallback matches (when everything else fails)
   */
  generateEmergencyFallbackMatches(
    jobs: Job[],
    userPrefs: UserPreferences
  ): MatchResult[] {
    console.log(`🚨 Using emergency fallback for ${userPrefs.email}`);
    
    // Get recent jobs regardless of score
    const recentJobs = jobs
      .filter(job => {
        if (!job.created_at) return true;
        const daysOld = (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysOld <= 30; // Last 30 days
      })
      .slice(0, this.config.fallback.maxMatches);
    
    // Create basic match results
    const emergencyMatches: MatchResult[] = recentJobs.map(job => {
      const scoreBreakdown = this.scoringService.calculateMatchScore(job, userPrefs);
      const explanation = this.scoringService.generateMatchExplanation(job, scoreBreakdown, userPrefs);
      
      return {
        job,
        match_score: Math.max(scoreBreakdown.overall, 30), // Minimum score
        match_reason: 'Recent opportunity',
        match_quality: 'fair',
        match_tags: explanation.tags,
        confidence_score: 0.5, // Low confidence
        scoreBreakdown
      };
    });
    
    return emergencyMatches;
  }

  /**
   * Get fallback statistics
   */
  getStats(): {
    maxMatches: number;
    lowConfidenceThreshold: number;
    diversityFactor: number;
    freshnessWeight: number;
  } {
    return {
      maxMatches: this.config.fallback.maxMatches,
      lowConfidenceThreshold: this.config.fallback.lowConfidenceThreshold,
      diversityFactor: this.config.fallback.diversityFactor,
      freshnessWeight: this.config.fallback.freshnessWeight
    };
  }

  /**
   * Check if fallback should be used
   */
  shouldUseFallback(
    aiMatches: MatchResult[],
    userPrefs: UserPreferences
  ): boolean {
    // Use fallback if no AI matches or very low confidence
    if (aiMatches.length === 0) return true;
    
    const avgConfidence = aiMatches.reduce((sum, match) => 
      sum + match.confidence_score, 0
    ) / aiMatches.length;
    
    return avgConfidence < this.config.fallback.lowConfidenceThreshold;
  }
}
