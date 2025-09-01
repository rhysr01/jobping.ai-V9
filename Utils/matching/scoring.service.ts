/**
 * Scoring Service for JobPing Matching System
 * 
 * This service handles all scoring calculations for job-user matching,
 * including eligibility, career path, location, and freshness scoring.
 */

import { Job, UserPreferences, MatchScore, MatchResult, ScoringContext } from './types';
import { MATCHING_CONFIG, getConfig } from '../config/matching';
// Import from the original jobMatching file since these aren't exported yet
import { 
  normalizeCategoriesForRead, 
  reqFirst, 
  toStringArray,
  cats
} from '../jobMatching';

// Local implementation of normalizeToString since it's not exported
function normalizeToString(value: any): string {
  if (Array.isArray(value)) {
    return value.join('|');
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
}
import { applyHardGates } from './validators';

export class ScoringService {
  private config: typeof MATCHING_CONFIG;

  constructor(config = MATCHING_CONFIG) {
    this.config = config;
  }

  /**
   * Calculate comprehensive match score for a job-user pair
   */
  calculateMatchScore(job: Job, userPrefs: UserPreferences): MatchScore {
    const categories = normalizeToString(job.categories);
    const tags = normalizeCategoriesForRead(categories);
    
    // Eligibility score (35% weight)
    const eligibilityScore = this.calculateEligibilityScore(tags);
    
    // Career path match (30% weight)
    const careerPathScore = this.calculateCareerPathScore(tags, userPrefs);
    
    // Location fit (20% weight)
    const locationScore = this.calculateLocationScore(tags, userPrefs);
    
    // Freshness (15% weight)
    const freshnessScore = this.calculateFreshnessScore(job);
    
    // Calculate weighted overall score
    const weights = this.config.scoring.weights;
    const overallScore = Math.round(
      (eligibilityScore * weights.eligibility) +
      (careerPathScore * weights.careerPath) +
      (locationScore * weights.location) +
      (freshnessScore * weights.freshness)
    );
    
    return {
      overall: overallScore,
      eligibility: eligibilityScore,
      careerPath: careerPathScore,
      location: locationScore,
      freshness: freshnessScore,
      confidence: 1.0 // Will be adjusted by confidence handling
    };
  }

  /**
   * Calculate eligibility score based on job categories
   */
  private calculateEligibilityScore(tags: string[]): number {
    if (tags.includes('early-career')) {
      return 100;
    } else if (tags.includes('eligibility:uncertain')) {
      return 70;
    }
    return 0;
  }

  /**
   * Calculate career path match score
   */
  private calculateCareerPathScore(tags: string[], userPrefs: UserPreferences): number {
    const jobCareerPath = tags.find(tag => tag.startsWith('career:'))?.replace('career:', '');
    const userCareerPath = reqFirst(Array.isArray(userPrefs.career_path) ? userPrefs.career_path : [userPrefs.career_path || '']);
    
    if (jobCareerPath && userCareerPath) {
      if (jobCareerPath === userCareerPath) {
        return 100;
      } else if (jobCareerPath !== 'unknown') {
        return 70; // Related career path
      } else {
        return 40; // Unknown career path
      }
    } else if (jobCareerPath === 'unknown') {
      return 40;
    }
    
    return 0;
  }

  /**
   * Calculate location fit score
   */
  private calculateLocationScore(tags: string[], userPrefs: UserPreferences): number {
    const jobLocation = tags.find(tag => tag.startsWith('loc:'))?.replace('loc:', '');
    const userCities = toStringArray(userPrefs.target_cities);
    
    if (jobLocation && userCities.length > 0) {
      if (userCities.some((city: string) => 
        jobLocation.includes(city.toLowerCase().replace(/\s+/g, '-'))
      )) {
        return 100; // Exact city match
      } else if (jobLocation.startsWith('eu-')) {
        return 75; // EU remote
      } else if (jobLocation === 'unknown') {
        return 50; // Unknown location
      } else {
        return 0; // Non-EU location
      }
    } else if (jobLocation === 'unknown') {
      return 50;
    }
    
    return 0;
  }

  /**
   * Calculate freshness score based on job posting date
   */
  private calculateFreshnessScore(job: Job): number {
    if (!job.posted_at) {
      return 40; // Default for jobs without posting date
    }

    const postedAt = new Date(job.posted_at);
    const now = new Date();
    const daysDiff = (now.getTime() - postedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff < 1) {
      return 100; // <24h
    } else if (daysDiff < 3) {
      return 90; // 1-3d
    } else if (daysDiff < 7) {
      return 70; // 3-7d
    } else {
      return 40; // >7d
    }
  }

  /**
   * Calculate confidence score for a match
   */
  calculateConfidenceScore(job: Job, userPrefs: UserPreferences): number {
    const categories = normalizeToString(job.categories);
    const tags = cats(categories);
    
    let confidence = 1.0;
    
    // Subtract 0.1 per missing key signal
    if (tags.includes('eligibility:uncertain')) {
      confidence -= 0.1;
    }
    
    const jobCareerPath = tags.find(tag => tag.startsWith('career:'))?.replace('career:', '');
    if (jobCareerPath === 'unknown') {
      confidence -= 0.1;
    }
    
    const jobLocation = tags.find(tag => tag.startsWith('loc:'))?.replace('loc:', '');
    if (jobLocation === 'unknown') {
      confidence -= 0.1;
    }
    
    // Floor at 0.5
    return Math.max(0.5, confidence);
  }

  /**
   * Generate match explanation and tags
   */
  generateMatchExplanation(
    job: Job,
    scoreBreakdown: MatchScore,
    userPrefs: UserPreferences
  ): { reason: string; tags: string } {
    const categories = normalizeToString(job.categories);
    const tags = cats(categories);
    
    // Find top 2 signals
    const signals = [];
    
    if (scoreBreakdown.eligibility >= 70) {
      signals.push('Early-career');
    }
    
    const jobCareerPath = tags.find(tag => tag.startsWith('career:'))?.replace('career:', '');
    if (scoreBreakdown.careerPath >= 70 && jobCareerPath && jobCareerPath !== 'unknown') {
      signals.push(jobCareerPath.charAt(0).toUpperCase() + jobCareerPath.slice(1));
    }
    
    const jobLocation = tags.find(tag => tag.startsWith('loc:'))?.replace('loc:', '');
    if (scoreBreakdown.location >= 70 && jobLocation && jobLocation !== 'unknown') {
      signals.push(jobLocation.replace('-', ' '));
    }
    
    // Generate reason
    let reason = '';
    if (signals.length >= 2) {
      reason = `${signals[0]} + ${signals[1]} match`;
    } else if (signals.length === 1) {
      reason = `${signals[0]} match`;
    } else {
      reason = 'Potential match';
    }
    
    // Add location if available
    if (jobLocation && jobLocation !== 'unknown') {
      reason += ` in ${jobLocation.replace('-', ' ')}`;
    }
    
    // Add explanation for unknowns
    const unknowns = [];
    if (tags.includes('eligibility:uncertain')) {
      unknowns.push('eligibility unclear');
    }
    if (jobLocation === 'unknown') {
      unknowns.push('location unclear');
    }
    if (jobCareerPath === 'unknown') {
      unknowns.push('career path unclear');
    }
    
    if (unknowns.length > 0) {
      reason += `; kept due to strong early-career signal`;
    }
    
    // Generate match tags
    const matchTags = {
      eligibility: tags.includes('early-career') ? 'early-career' : 'uncertain',
      career_path: jobCareerPath || 'unknown',
      loc: jobLocation || 'unknown',
      freshness: scoreBreakdown.freshness >= 90 ? 'fresh' : scoreBreakdown.freshness >= 70 ? 'recent' : 'older',
      confidence: scoreBreakdown.confidence
    };
    
    return {
      reason,
      tags: JSON.stringify(matchTags)
    };
  }

  /**
   * Categorize matches by confidence level
   */
  categorizeMatches(matches: MatchResult[]): {
    confident: MatchResult[];
    promising: MatchResult[];
  } {
    const confident: MatchResult[] = [];
    const promising: MatchResult[] = [];
    
    for (const match of matches) {
      if (match.confidence_score >= 0.7) {
        confident.push(match);
      } else if (match.confidence_score >= 0.5) {
        promising.push(match);
      }
    }
    
    return { confident, promising };
  }

  /**
   * Apply hard gates and calculate score for a job-user pair
   */
  evaluateJobUserPair(job: Job, userPrefs: UserPreferences): {
    eligible: boolean;
    score?: MatchScore;
    confidence?: number;
    explanation?: { reason: string; tags: string };
    gateResult: { passed: boolean; reason: string };
  } {
    // Apply hard gates first
    const gateResult = applyHardGates(job, userPrefs);
    
    if (!gateResult.passed) {
      return {
        eligible: false,
        gateResult
      };
    }
    
    // Calculate scores
    const score = this.calculateMatchScore(job, userPrefs);
    const confidence = this.calculateConfidenceScore(job, userPrefs);
    const explanation = this.generateMatchExplanation(job, score, userPrefs);
    
    // Determine eligibility based on minimum score
    const eligible = score.overall >= this.config.scoring.thresholds.minimum;
    
    return {
      eligible,
      score,
      confidence,
      explanation,
      gateResult
    };
  }

  /**
   * Score multiple jobs for a user
   */
  scoreJobsForUser(jobs: Job[], userPrefs: UserPreferences): MatchResult[] {
    const results: MatchResult[] = [];
    
    for (const job of jobs) {
      const evaluation = this.evaluateJobUserPair(job, userPrefs);
      
      if (evaluation.eligible && evaluation.score && evaluation.confidence && evaluation.explanation) {
        results.push({
          job,
          match_score: evaluation.score.overall,
          match_reason: evaluation.explanation.reason,
          match_quality: this.getQualityLabel(evaluation.score.overall),
          match_tags: evaluation.explanation.tags,
          confidence_score: evaluation.confidence,
          scoreBreakdown: evaluation.score
        });
      }
    }
    
    // Sort by score descending
    return results.sort((a, b) => b.match_score - a.match_score);
  }

  /**
   * Get quality label for a score
   */
  private getQualityLabel(score: number): string {
    const thresholds = this.config.scoring.thresholds;
    
    if (score >= thresholds.excellent) return 'excellent';
    if (score >= thresholds.good) return 'good';
    if (score >= thresholds.fair) return 'fair';
    return 'poor';
  }

  /**
   * Get scoring context for debugging
   */
  getScoringContext(job: Job, userPrefs: UserPreferences): ScoringContext {
    return {
      job,
      user: userPrefs,
      weights: this.config.scoring.weights,
      thresholds: this.config.scoring.thresholds
    };
  }
}
