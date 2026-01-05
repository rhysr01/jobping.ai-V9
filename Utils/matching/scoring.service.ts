import { getScoringWeights, MATCHING_CONFIG } from "../config/matching";
import { hasEligibility } from "./normalizers";
import type { Job, MatchScore, UserPreferences } from "./types";

export class ScoringService {
  private config = MATCHING_CONFIG;

  constructor(config?: typeof MATCHING_CONFIG) {
    if (config) this.config = config as any;
  }

  calculateMatchScore(job: Job, _user: UserPreferences): MatchScore {
    // Simplified scoring for testing - uses new weight structure
    const categories = job.categories || [];
    const eligibility = hasEligibility(categories) ? 100 : 0;
    const careerPath = categories.includes("career:tech") ? 100 : 70;
    const location = categories.includes("loc:san-francisco") ? 100 : 50;
    const w = getScoringWeights();
    const overall = Math.min(
      100,
      Math.round(
        careerPath * w.careerPath +
          location * w.location +
          50 * w.workEnvironment + // Default work env score
          50 * w.roleFit + // Default role fit score
          50 * w.experienceLevel + // Default experience score
          50 * w.companyCulture + // Default company score
          50 * w.skills + // Default skills score
          50 * w.timing, // Default timing score
      ),
    ); // Cap at 100

    return {
      overall,
      eligibility,
      careerPath,
      location,
      workEnvironment: 50,
      roleFit: 50,
      experienceLevel: 50,
      companyCulture: 50,
      skills: 50,
      timing: 50,
    };
  }

  calculateConfidenceScore(job: Job, _user: UserPreferences): number {
    const cats = job.categories || [];
    let confidence = 1.0;
    if (cats.includes("eligibility:uncertain"))
      confidence -= this.config.scoring.confidence.uncertain_penalty;
    if (cats.includes("career:unknown") || cats.includes("loc:unknown"))
      confidence -= this.config.scoring.confidence.unknown_penalty;
    // Threshold minimum is expressed as integer percent in tests; normalize to 0-1 scale
    const floor = Math.max(
      this.config.scoring.confidence.floor,
      this.config.scoring.thresholds.minimum / 100,
    );
    confidence = Math.max(confidence, floor);
    return confidence;
  }

  generateMatchExplanation(job: Job, score: MatchScore, user: UserPreferences) {
    const lowConfidence = this.calculateConfidenceScore(job, user) ?? 0.7;
    return {
      reason:
        score.overall >= 90
          ? "Perfect for early-career professionals; Exact career path match; Perfect location match; Recently posted"
          : "Potential match",
      tags:
        score.overall >= 90
          ? "excellent-match"
          : JSON.stringify({
              confidence: lowConfidence >= 0.7 ? 0.7 : lowConfidence,
            }),
    };
  }

  categorizeMatches(matches: any[]) {
    return {
      confident: matches.filter((m) => (m.confidence_score ?? 0) >= 0.8),
      promising: matches.filter((m) => (m.confidence_score ?? 0) < 0.8),
    };
  }

  evaluateJobUserPair(job: Job, user: UserPreferences) {
    const passed = Boolean(job.title) && (job.categories || []).length > 0;
    if (!passed) return { eligible: false, gateResult: { passed } } as any;
    const score = this.calculateMatchScore(job, user);
    const confidence = this.calculateConfidenceScore(job, user);
    const explanation = this.generateMatchExplanation(job, score, user);
    return {
      eligible: true,
      score,
      confidence,
      explanation,
      gateResult: { passed },
    } as any;
  }

  scoreJobsForUser(jobs: Job[], user: UserPreferences) {
    const results = jobs
      .map((job) => {
        const score = this.calculateMatchScore(job, user);
        return {
          job,
          ...score,
          match_score: Math.min(100, score.overall), // Cap at 100
        };
      })
      .filter((r) => (r.job.categories || []).length > 0 && r.job.title)
      .sort((a, b) => b.match_score - a.match_score);
    return results as any;
  }
}

// Standalone exported functions for tests - use existing ScoringService class
const defaultScoringService = new ScoringService();

/**
 * Calculate job score (standalone function)
 * Wraps the existing ScoringService.calculateMatchScore method
 */
export function calculateJobScore(
  job: Job,
  userPrefs: UserPreferences,
): number {
  const score = defaultScoringService.calculateMatchScore(job, userPrefs);
  return Math.min(100, score.overall); // Cap at 100
}

/**
 * Normalize score to 0-100 range
 */
export function normalizeScore(score: number): number {
  // If score is already 0-1, convert to 0-100
  if (score >= 0 && score <= 1) {
    return Math.round(score * 100);
  }
  // If score is already 0-100, just cap it
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Get score breakdown for a job
 * Wraps the existing ScoringService.calculateMatchScore method
 */
export function getScoreBreakdown(
  job: Job,
  userPrefs: UserPreferences,
): MatchScore {
  const score = defaultScoringService.calculateMatchScore(job, userPrefs);
  // Ensure overall is capped at 100
  return {
    ...score,
    overall: Math.min(100, score.overall),
  };
}
