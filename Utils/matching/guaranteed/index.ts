/**
 * Guaranteed Match Engine - Main Orchestrator
 *
 * SINGLE-PASS architecture: No recursive loops, all penalties calculated in one pass
 * Ensures users never hit zero results, but maintains quality through transparent penalties
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { apiLogger } from "@/lib/api-logger";
import type { Job } from "@/scrapers/types";
import { calculateMatchScore } from "../rule-based-matcher.service";
import type { MatchResult, UserPreferences } from "../types";
import {
	type CustomScanResult,
	extractMissingCriteria,
	triggerCustomScan,
} from "./custom-scan";
import { getTargetCompaniesFromHistory } from "./historical-alerts";
import {
	calculateGuaranteedMatchScore,
	countRelaxationLevels,
	generateMatchReason,
} from "./single-pass-scoring";

export interface GuaranteedMatchResult {
	matches: MatchResult[];
	targetCompanies?: Array<{
		company: string;
		lastMatchedAt: string;
		matchCount: number;
		roles: string[];
	}>;
	customScan?: CustomScanResult;
	metadata: {
		relaxationLevel: number;
		usedHistorical: boolean;
		usedVisaRelaxation: boolean;
		totalScored: number;
	};
}

/**
 * SINGLE-PASS MATCHING: Score all jobs once with penalties, then filter
 */
async function getGuaranteedMatchesSinglePass(
	jobs: Job[],
	userPrefs: UserPreferences,
	minMatches: number,
): Promise<{
	matches: Array<
		MatchResult & { relaxationLevel: number; relaxationReason: string }
	>;
	metadata: {
		totalScored: number;
		relaxationLevels: Record<number, number>;
	};
}> {
	// Step 1: Score all jobs in ONE pass
	const scoredJobs = await Promise.all(
		jobs.map(async (job) => {
			try {
				// Get base score from existing engine
				const baseScoreResult = calculateMatchScore(job, userPrefs);

				// Apply relaxation penalties
				const guaranteedScore = calculateGuaranteedMatchScore(
					job,
					userPrefs,
					baseScoreResult.overall,
				);

				return {
					job,
					baseScore: baseScoreResult.overall,
					finalScore: guaranteedScore.finalScore,
					relaxationLevel: guaranteedScore.relaxationLevel,
					relaxationReason: guaranteedScore.relaxationReason,
					penalties: guaranteedScore.penalties,
					scoreBreakdown: baseScoreResult,
				};
			} catch (error) {
				apiLogger.warn("Error scoring job in guaranteed match", {
					jobHash: job.job_hash,
					error: (error as Error).message,
				});
				return null;
			}
		}),
	);

	// Filter out null results
	const validScoredJobs = scoredJobs.filter(
		(s): s is NonNullable<typeof s> => s !== null,
	);

	// Step 2: Filter by minimum score (50% floor)
	const eligibleJobs = validScoredJobs.filter((s) => s.finalScore >= 50);

	// Step 3: Sort by final score (highest first)
	eligibleJobs.sort((a, b) => b.finalScore - a.finalScore);

	// Step 4: Take top N matches (2x to have buffer)
	const matches = eligibleJobs.slice(0, minMatches * 2).map((scored) => ({
		job: scored.job,
		match_score: scored.finalScore,
		match_reason: generateMatchReason(
			scored.scoreBreakdown,
			scored.relaxationReason,
		),
		confidence_score: scored.baseScore / 100, // Normalize to 0-1
		match_quality:
			scored.finalScore >= 80
				? "high"
				: scored.finalScore >= 65
					? "medium"
					: "low",
		score_breakdown: scored.scoreBreakdown,
		provenance: {
			match_algorithm: "guaranteed_single_pass",
			relaxation_level: scored.relaxationLevel,
			base_score: scored.baseScore,
			final_score: scored.finalScore,
			penalties_applied: scored.penalties,
		} as any,
		relaxationLevel: scored.relaxationLevel,
		relaxationReason: scored.relaxationReason,
	}));

	return {
		matches: matches.slice(0, minMatches),
		metadata: {
			totalScored: validScoredJobs.length,
			relaxationLevels: countRelaxationLevels(matches),
		},
	};
}

/**
 * Track fallback match event for feedback loops
 */
async function trackFallbackMatch(
	supabase: SupabaseClient,
	event: {
		user_email: string;
		relaxation_level: number;
		relaxation_path: string[];
		original_preferences: UserPreferences;
		final_preferences: UserPreferences;
		matches_found: number;
		min_matches_required: number;
		missing_criteria?: any;
		timestamp: string;
	},
): Promise<void> {
	try {
		const { error } = await supabase.from("fallback_match_events").insert({
			user_email: event.user_email,
			relaxation_level: event.relaxation_level,
			relaxation_path: event.relaxation_path,
			original_preferences: event.original_preferences as any,
			final_preferences: event.final_preferences as any,
			matches_found: event.matches_found,
			min_matches_required: event.min_matches_required,
			missing_criteria: event.missing_criteria as any,
			timestamp: event.timestamp,
		});

		if (error) {
			apiLogger.warn("Failed to track fallback match event", {
				error: error.message,
				user_email: event.user_email,
			});
		}
	} catch (error) {
		apiLogger.warn("Error tracking fallback match event", {
			error: (error as Error).message,
			user_email: event.user_email,
		});
	}
}

/**
 * Main guaranteed matches function
 */
export async function getGuaranteedMatches(
	jobs: Job[],
	userPrefs: UserPreferences,
	supabase: SupabaseClient,
): Promise<GuaranteedMatchResult> {
	const tier = userPrefs.subscription_tier || "free";
	const minMatches = tier === "premium" ? 10 : 5;

	apiLogger.info("Starting guaranteed match engine", {
		email: userPrefs.email,
		tier,
		minMatches,
		totalJobs: jobs.length,
	});

	// SINGLE-PASS: Score all jobs once with penalties
	const result = await getGuaranteedMatchesSinglePass(
		jobs,
		userPrefs,
		minMatches,
	);

	// If we have enough matches, return them
	if (result.matches.length >= minMatches) {
		apiLogger.info("Guaranteed matches found", {
			email: userPrefs.email,
			matchesFound: result.matches.length,
			relaxationLevel: Math.max(
				...result.matches.map((m) => m.relaxationLevel),
			),
		});

		return {
			matches: result.matches,
			metadata: {
				relaxationLevel: Math.max(
					...result.matches.map((m) => m.relaxationLevel),
				),
				usedHistorical: false,
				usedVisaRelaxation: result.matches.some((m) => m.relaxationLevel >= 5),
				totalScored: result.metadata.totalScored,
			},
		};
	}

	// If < minMatches, get target companies (NOT active jobs)
	const targetCompanies = await getTargetCompaniesFromHistory(
		supabase,
		userPrefs,
	);

	// If still < minMatches after historical, trigger custom scan
	if (result.matches.length < minMatches) {
		const missingCriteria = extractMissingCriteria(userPrefs, result.matches);
		const customScan = await triggerCustomScan(
			supabase,
			userPrefs,
			missingCriteria,
		);

		// Track fallback event
		await trackFallbackMatch(supabase, {
			user_email: userPrefs.email,
			relaxation_level: 7, // Custom scan
			relaxation_path: ["exact", "relaxed", "custom_scan"],
			original_preferences: userPrefs,
			final_preferences: userPrefs, // No relaxation, just scan
			matches_found: result.matches.length,
			min_matches_required: minMatches,
			missing_criteria: missingCriteria,
			timestamp: new Date().toISOString(),
		});

		apiLogger.info("Custom scan triggered", {
			email: userPrefs.email,
			matchesFound: result.matches.length,
			scanId: customScan.scanId,
		});

		return {
			matches: result.matches, // Return what we have (even if < minMatches)
			targetCompanies: targetCompanies.targetCompanies,
			customScan,
			metadata: {
				relaxationLevel: 7,
				usedHistorical: targetCompanies.targetCompanies.length > 0,
				usedVisaRelaxation: false,
				totalScored: result.metadata.totalScored,
			},
		};
	}

	return {
		matches: result.matches,
		targetCompanies: targetCompanies.targetCompanies,
		metadata: {
			relaxationLevel: Math.max(
				...result.matches.map((m) => m.relaxationLevel),
			),
			usedHistorical: targetCompanies.targetCompanies.length > 0,
			usedVisaRelaxation: result.matches.some((m) => m.relaxationLevel >= 5),
			totalScored: result.metadata.totalScored,
		},
	};
}
