import type { Job } from "@/scrapers/types";
import type { JobMatch } from "./types";
import type { AIMatchResult } from "./core/ai-matching.service";
import type { FallbackMatch } from "./core/fallback.service";

/**
 * Calculate freshness tier for a job based on posting date
 */
export function calculateFreshnessTier(job: Job): string {
	const postedAt = job.posted_at ? new Date(job.posted_at) : new Date();
	const daysSincePosted = (Date.now() - postedAt.getTime()) / (1000 * 60 * 60 * 24);

	if (daysSincePosted <= 1) return "hot";
	if (daysSincePosted <= 3) return "fresh";
	if (daysSincePosted <= 7) return "recent";
	if (daysSincePosted <= 14) return "week-old";
	return "older";
}

/**
 * Convert AI match results to standard JobMatch format
 */
export function convertAIMatchesToJobMatches(
	aiResults: AIMatchResult[]
): JobMatch[] {
	return aiResults.map((aiMatch, index) => ({
		job_index: index,
		job_hash: aiMatch.job.job_hash || "",
		job: aiMatch.job,
		match_score: aiMatch.matchScore,
		match_reason: aiMatch.matchReason,
		confidence_score: aiMatch.confidenceScore,
		score_breakdown: {
			overall: aiMatch.scoreBreakdown.overall,
			eligibility: 0, // Not calculated for AI matches
			careerPath: 0, // Not calculated for AI matches
			location: aiMatch.scoreBreakdown.location,
			workEnvironment: 0, // Not calculated for AI matches
			roleFit: 0, // Not calculated for AI matches
			experienceLevel: aiMatch.scoreBreakdown.experience,
			companyCulture: aiMatch.scoreBreakdown.company,
			skills: aiMatch.scoreBreakdown.skills,
			timing: 0, // Not calculated for AI matches
		},
		method: "ai" as const,
		timestamp: new Date().toISOString(),
	}));
}

/**
 * Convert fallback match results to standard JobMatch format
 */
export function convertFallbackMatchesToJobMatches(
	fallbackResults: FallbackMatch[]
): JobMatch[] {
	return fallbackResults.map((fallbackMatch, index) => ({
		job_index: index,
		job_hash: fallbackMatch.job.job_hash || "",
		job: fallbackMatch.job,
		match_score: fallbackMatch.matchScore,
		match_reason: fallbackMatch.matchReason,
		confidence_score: fallbackMatch.confidenceScore,
		score_breakdown: {
			overall: fallbackMatch.matchScore,
			eligibility: 0, // Not calculated for fallback matches
			careerPath: 0, // Not calculated for fallback matches
			location: fallbackMatch.scoreBreakdown.location,
			workEnvironment: 0, // Not calculated for fallback matches
			roleFit: 0, // Not calculated for fallback matches
			experienceLevel: fallbackMatch.scoreBreakdown.experience,
			companyCulture: 0, // Not calculated for fallback matches
			skills: fallbackMatch.scoreBreakdown.skills,
			timing: fallbackMatch.scoreBreakdown.recency,
		},
		method: "fallback" as const,
		timestamp: new Date().toISOString(),
	}));
}