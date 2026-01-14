import type { Job } from "@/scrapers/types";
import type { AIMatchResult } from "./core/ai-matching.service";
import type { FallbackMatch } from "./core/fallback.service";
import type { JobMatch } from "./types";

/**
 * Calculate freshness tier for a job based on posting date
 */
export function calculateFreshnessTier(job: Job): string {
	const postedAt = job.posted_at ? new Date(job.posted_at) : new Date();
	const daysSincePosted =
		(Date.now() - postedAt.getTime()) / (1000 * 60 * 60 * 24);

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
	aiResults: AIMatchResult[],
): JobMatch[] {
	return aiResults.map((aiMatch, index) => ({
		job_index: index,
		job_hash: aiMatch.job.job_hash || "",
		job: aiMatch.job,
		match_score: aiMatch.unifiedScore.overall,
		match_reason: aiMatch.matchReason,
		confidence_score: aiMatch.unifiedScore.confidence,
		unifiedScore: aiMatch.unifiedScore, // Add unified scoring for transparency
		score_breakdown: {
			overall: aiMatch.unifiedScore.overall,
			eligibility: 0, // Not calculated for AI matches
			careerPath: aiMatch.unifiedScore.components.relevance, // Use relevance as proxy
			location: aiMatch.unifiedScore.components.timing, // Location contributes to timing
			workEnvironment: 0, // Not calculated for AI matches
			roleFit: aiMatch.unifiedScore.components.opportunity, // Career fit
			experienceLevel: aiMatch.unifiedScore.components.relevance, // Experience in relevance
			companyCulture: aiMatch.unifiedScore.components.quality, // Company quality
			skills: aiMatch.unifiedScore.components.relevance, // Skills in relevance
			timing: aiMatch.unifiedScore.components.timing,
		},
		method: "ai" as const,
		timestamp: new Date().toISOString(),
	}));
}

/**
 * Convert fallback match results to standard JobMatch format
 */
export function convertFallbackMatchesToJobMatches(
	fallbackResults: FallbackMatch[],
): JobMatch[] {
	return fallbackResults.map((fallbackMatch, index) => ({
		job_index: index,
		job_hash: fallbackMatch.job.job_hash || "",
		job: fallbackMatch.job,
		match_score: fallbackMatch.unifiedScore.overall,
		match_reason: fallbackMatch.matchReason,
		confidence_score: fallbackMatch.unifiedScore.confidence,
		unifiedScore: fallbackMatch.unifiedScore, // Add unified scoring for transparency
		score_breakdown: {
			overall: fallbackMatch.unifiedScore.overall,
			eligibility: 0, // Not calculated for fallback matches
			careerPath: fallbackMatch.unifiedScore.components.relevance, // Career alignment in relevance
			location: fallbackMatch.unifiedScore.components.timing, // Location contributes to timing
			workEnvironment: 0, // Not calculated for fallback matches
			roleFit: fallbackMatch.unifiedScore.components.opportunity, // Career opportunity
			experienceLevel: fallbackMatch.unifiedScore.components.relevance, // Experience in relevance
			companyCulture: fallbackMatch.unifiedScore.components.quality, // Company quality
			skills: fallbackMatch.unifiedScore.components.relevance, // Skills in relevance
			timing: fallbackMatch.unifiedScore.components.timing,
		},
		method: "fallback" as const,
		timestamp: new Date().toISOString(),
	}));
}
