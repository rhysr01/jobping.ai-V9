/**
 * Holistic AI Scoring - AI-driven assessment of job-person fit
 * Replaced mechanical rule-based scoring with intelligent judgment
 * AI assesses: "Would this person actually succeed in this role?"
 */

import type { Job } from "@/scrapers/types";
import type { UserPreferences } from "../types";

// ============================================
// HOLISTIC AI SCORING
// ============================================

/**
 * Legacy function - kept for backward compatibility but deprecated
 * All scoring now happens in AI prompts for holistic assessment
 */
export async function calculateJobScore(
	_job: Job,
	_userPrefs: UserPreferences,
): Promise<{ score: number; reasons: string[] }> {
	// This function is deprecated - scoring is now done holistically by AI
	console.warn("calculateJobScore is deprecated - scoring happens in AI prompts");
	return { score: 50, reasons: ["AI holistic assessment - mechanical scoring removed"] };
}

/**
 * Calculate match quality metrics for logging and analytics
 * Used for monitoring AI performance and quality trends
 */
export function calculateMatchQualityMetrics(
	matches: any[],
	jobs: Job[],
	userPrefs: UserPreferences,
): {
	averageScore: number;
	scoreDistribution: Record<string, number>;
	cityCoverage: Record<string, number>;
	sourceDiversity: Record<string, number>;
	averageConfidence: number;
	qualityScore: number;
} {
	if (!matches || matches.length === 0) {
		return {
			averageScore: 0,
			scoreDistribution: {},
			cityCoverage: {},
			sourceDiversity: {},
			averageConfidence: 0,
			qualityScore: 0,
		};
	}

	const scores = matches.map((m) => m.match_score || 0);
	const confidences = matches.map((m) => m.confidence_score || 0.8);
	const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
	const averageConfidence = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;

	// Score distribution
	const scoreDistribution: Record<string, number> = {
		excellent: scores.filter((s) => s >= 90).length,
		good: scores.filter((s) => s >= 80 && s < 90).length,
		fair: scores.filter((s) => s >= 70 && s < 80).length,
		poor: scores.filter((s) => s >= 50 && s < 70).length,
		unacceptable: scores.filter((s) => s < 50).length,
	};

	// City coverage
	const cityCoverage: Record<string, number> = {};
	const targetCities = (Array.isArray(userPrefs.target_cities)
		? userPrefs.target_cities
		: userPrefs.target_cities ? [userPrefs.target_cities] : []
	).map(c => c.toLowerCase());

	targetCities.forEach((city) => {
		const cityMatches = matches.filter((match) => {
			const job = jobs.find((j) => j.job_hash === match.job_hash);
			return job && (
				(job.city || "").toLowerCase().includes(city) ||
				(job.location || "").toLowerCase().includes(city)
			);
		}).length;
		cityCoverage[city] = cityMatches;
	});

	// Source diversity (simplified)
	const sourceDiversity: Record<string, number> = {};
	matches.forEach((match) => {
		const job = jobs.find((j) => j.job_hash === match.job_hash);
		if (job) {
			const source = (job as any).source || "unknown";
			sourceDiversity[source] = (sourceDiversity[source] || 0) + 1;
		}
	});

	// Overall quality score (combines score and confidence)
	const qualityScore = averageScore * averageConfidence;

	return {
		averageScore: Math.round(averageScore * 100) / 100,
		scoreDistribution,
		cityCoverage,
		sourceDiversity,
		averageConfidence: Math.round(averageConfidence * 100) / 100,
		qualityScore: Math.round(qualityScore * 100) / 100,
	};
}
