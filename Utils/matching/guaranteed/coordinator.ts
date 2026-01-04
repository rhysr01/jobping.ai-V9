/**
 * Premium Matching Coordinator
 * Orchestrates the entire matching flow with guaranteed fallbacks
 * Single-pass, no double distribution, location-aware
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { apiLogger } from "@/lib/api-logger";
import type { Job } from "@/scrapers/types";
import { createConsolidatedMatcher } from "@/Utils/consolidatedMatchingV2";
import { distributeJobsWithDiversity } from "../jobDistribution";
import type { UserPreferences } from "../types";
import { extractMissingCriteria, triggerCustomScan } from "./custom-scan";
import { getTargetCompaniesFromHistory } from "./historical-alerts";
import { getGuaranteedMatches } from "./index";
// import { calculateLocationExpansion } from "./location-proximity"; // Kept for future use

export interface CoordinatedMatchResult {
	matches: Array<{
		job: Job;
		match_score: number;
		match_reason: string;
		relaxationLevel?: number;
	}>;
	targetCompanies: Array<{
		company: string;
		lastMatchedAt: string;
		matchCount: number;
		roles: string[];
	}>;
	customScan: {
		scanId: string;
		estimatedTime: string;
		message: string;
	} | null;
	metadata: {
		matchingMethod: "ai_success" | "guaranteed_fallback" | "custom_scan";
		relaxationLevel: number;
		locationExpansion: "exact" | "country" | "region" | "remote";
		totalJobsScored: number;
	};
}

/**
 * Combine and deduplicate matches
 */
function combineAndDeduplicate(
	standardMatches: Array<{
		job_hash: string;
		match_score: number;
		match_reason: string;
	}>,
	guaranteedMatches: Array<{
		job: Job;
		match_score: number;
		match_reason: string;
		relaxationLevel?: number;
	}>,
): Array<{
	job: Job;
	match_score: number;
	match_reason: string;
	relaxationLevel?: number;
}> {
	const seen = new Set<string>();
	const combined: Array<{
		job: Job;
		match_score: number;
		match_reason: string;
		relaxationLevel?: number;
	}> = [];

	// Create a map of guaranteed matches by job_hash for quick lookup
	const guaranteedMap = new Map<
		string,
		{
			job: Job;
			match_score: number;
			match_reason: string;
			relaxationLevel?: number;
		}
	>();
	guaranteedMatches.forEach((gm) => {
		guaranteedMap.set(gm.job.job_hash, gm);
	});

	// Add standard matches first (higher priority)
	standardMatches.forEach((m) => {
		if (!seen.has(m.job_hash)) {
			seen.add(m.job_hash);
			const guaranteedMatch = guaranteedMap.get(m.job_hash);
			if (guaranteedMatch) {
				// Use standard match score but keep guaranteed metadata
				combined.push({
					job: guaranteedMatch.job,
					match_score: m.match_score, // Prefer standard score
					match_reason: m.match_reason,
					relaxationLevel: 0, // Standard matches have no relaxation
				});
			}
		}
	});

	// Add guaranteed matches that weren't in standard
	guaranteedMatches.forEach((gm) => {
		if (!seen.has(gm.job.job_hash)) {
			seen.add(gm.job.job_hash);
			combined.push({
				job: gm.job,
				match_score: gm.match_score,
				match_reason: gm.match_reason,
				relaxationLevel: gm.relaxationLevel,
			});
		}
	});

	return combined;
}

/**
 * PREMIUM MATCHING FUNNEL (Cost-Optimized)
 *
 * This coordinator implements a cost-optimized funnel that minimizes expensive AI calls
 * while ensuring premium users always get high-quality matches.
 *
 * Stage 1: SQL Filtering (Postgres Index)
 *   - Cost: $0
 *   - Filters: city, categories, is_active, status, filtered_reason
 *   - Goal: Reduce job pool by ~90% using database indexes
 *   - Location: app/api/signup/route.ts (lines 305-325)
 *
 * Stage 2: AI Matching (LLM)
 *   - Cost: ~$0.001-0.01 per user (gpt-4o-mini)
 *   - Input: Top 20-50 pre-ranked jobs (from Stage 1)
 *   - Method: Semantic fit ranking via OpenAI API
 *   - Goal: Rank jobs by semantic relevance to user preferences
 *   - Location: Utils/matching/consolidated/engine.ts
 *   - Fallback: Rule-based matching if AI fails/timeouts
 *
 * Stage 3: Guaranteed Fallback (Rule-based)
 *   - Cost: $0 (in-memory scoring)
 *   - Method: Location expansion + criteria relaxation
 *   - Triggers: If < 10 matches after Stage 2
 *   - Goal: Guarantee 10 matches minimum using rule-based expansion
 *   - Location: Utils/matching/guaranteed/index.ts
 *   - Features: Relaxation levels (0-10+), location proximity, visa confidence
 *
 * Stage 4: Custom Scan (Background Job)
 *   - Cost: Medium (background processing)
 *   - Trigger: Still < 10 matches after Stage 3
 *   - Method: Historical company matching + broader search
 *   - Goal: Find matches in related fields/locations
 *   - Location: Utils/matching/guaranteed/custom-scan.ts
 *
 * Stage 5: Diversity Pass (Distribution)
 *   - Cost: $0 (in-memory algorithm)
 *   - Method: distributeJobsWithDiversity
 *   - Goal: Ensure variety in company types, locations, roles
 *   - Location: Utils/matching/jobDistribution.ts
 *
 * Cost Hierarchy (Lowest to Highest):
 *   1. SQL Filtering: $0
 *   2. Rule-based Matching: $0
 *   3. Diversity Pass: $0
 *   4. Guaranteed Fallback: $0
 *   5. Custom Scan: Medium (background)
 *   6. AI Matching: High (~$0.001-0.01 per user)
 *
 * Optimization Strategy:
 *   - AI only runs on pre-filtered, pre-ranked jobs (Stage 1 output)
 *   - Guaranteed fallback uses rule-based logic (no AI cost)
 *   - Custom scan only triggers if absolutely necessary
 *   - All stages are single-pass (no double distribution)
 */

/**
 * Main coordinator function
 * Orchestrates matching with guaranteed fallbacks
 *
 * @param allJobs - Jobs pre-filtered by SQL (Stage 1 output)
 * @param userPrefs - User preferences for matching
 * @param supabase - Database client for guaranteed matching
 * @param distributionOptions - Optional distribution settings
 * @returns Coordinated match result with metadata
 */
export async function coordinatePremiumMatching(
	allJobs: Job[],
	userPrefs: UserPreferences,
	supabase: SupabaseClient,
	distributionOptions?: {
		targetCount: number;
		targetCities: string[];
		targetWorkEnvironments: string[];
	},
): Promise<CoordinatedMatchResult> {
	const startTime = Date.now();
	const tier = userPrefs.subscription_tier || "premium";
	const minMatches = tier === "premium" ? 10 : 5;

	apiLogger.info("Starting premium matching coordination", {
		email: userPrefs.email,
		totalJobs: allJobs.length,
		minMatches,
	});

	// Step 1: Calculate location expansion (proximity-aware)
	// const _locationExpansion = calculateLocationExpansion(
	// 	userPrefs.target_cities || [],
	// 	userPrefs.work_environment,
	// );

	// Step 2: Attempt standard matching (AI + Rule-based)
	const matcher = createConsolidatedMatcher(process.env.OPENAI_API_KEY);
	const matchResult = await matcher.performMatching(allJobs, userPrefs);

	let finalMatches = matchResult.matches.map((m) => ({
		job_hash: m.job_hash,
		match_score: m.match_score,
		match_reason: m.match_reason,
	}));

	let matchingMethod: "ai_success" | "guaranteed_fallback" | "custom_scan" =
		matchResult.method === "ai_success" ? "ai_success" : "guaranteed_fallback";
	let relaxationLevel = 0;
	let locationExpansionLevel: "exact" | "country" | "region" | "remote" =
		"exact";

	// EARLY EXIT: If we have way more than needed, skip expensive guaranteed matching
	// Cost Control: Saves on LLM latency and API costs when user already has great matches
	const EXTREME_SUCCESS_THRESHOLD = minMatches * 5; // 50 for premium, 25 for free
	if (finalMatches.length >= EXTREME_SUCCESS_THRESHOLD) {
		apiLogger.info(
			"Extreme success - skipping guaranteed matching (early exit)",
			{
				email: userPrefs.email,
				matchesFound: finalMatches.length,
				threshold: EXTREME_SUCCESS_THRESHOLD,
				minMatches,
			},
		);

		// Use top matches directly, skip guaranteed fallback
		finalMatches = finalMatches.slice(0, minMatches * 2); // Take 2x for distribution

		// Skip to Step 4: Distribution pass (skip Step 3: guaranteed matching)
	} else if (finalMatches.length < minMatches) {
		// Step 3: If < minMatches, trigger guaranteed matching
		apiLogger.info("Insufficient matches, triggering guaranteed matching", {
			email: userPrefs.email,
			currentMatches: finalMatches.length,
			minRequired: minMatches,
		});

		const guaranteedResult = await getGuaranteedMatches(
			allJobs, // Use all jobs (guaranteed engine handles location expansion)
			userPrefs,
			supabase,
		);

		// Find full job data for standard matches
		// const _standardMatchesWithJobs = finalMatches
		// 	.map((m) => {
		// 		const job = allJobs.find((j) => j.job_hash === m.job_hash);
		// 		if (!job) return null;
		// 		return {
		// 			job,
		// 			match_score: m.match_score,
		// 			match_reason: m.match_reason,
		// 			relaxationLevel: 0, // Standard matches have no relaxation
		// 		};
		// 	})
		// 	.filter((m): m is NonNullable<typeof m> => m !== null);

		// Combine standard + guaranteed matches (deduplicate)
		const combined = combineAndDeduplicate(
			finalMatches,
			guaranteedResult.matches.map((m) => ({
				job: m.job,
				match_score: m.match_score,
				match_reason: m.match_reason,
				relaxationLevel: (m as any).relaxationLevel || 0,
			})),
		);

		// Sort by match score (highest first)
		combined.sort((a, b) => b.match_score - a.match_score);

		finalMatches = combined
			.map((m) => ({
				job_hash: m.job.job_hash,
				match_score: m.match_score,
				match_reason: m.match_reason,
			}))
			.slice(0, minMatches * 2); // Take 2x for distribution
		relaxationLevel = guaranteedResult.metadata.relaxationLevel;
		matchingMethod = "guaranteed_fallback";

		// Determine location expansion level from guaranteed result
		if (relaxationLevel >= 6) {
			locationExpansionLevel = "region";
		} else if (relaxationLevel >= 1) {
			locationExpansionLevel = "country";
		}
	}

	// Step 4: Distribution pass (single pass, with relaxed rules if needed)
	let distributedJobs: Array<{
		job: Job;
		match_score: number;
		match_reason: string;
	}> = [];

	if (distributionOptions && finalMatches.length > 0) {
		// Convert matches to jobs with scores
		const jobsWithScores = finalMatches
			.map((m) => {
				const job = allJobs.find((j) => j.job_hash === m.job_hash);
				if (!job) return null;
				return {
					job,
					match_score: m.match_score,
					match_reason: m.match_reason,
				};
			})
			.filter((j): j is NonNullable<typeof j> => j !== null);

		// Distribution with relaxed rules if we have few matches
		const shouldRelaxDistribution =
			jobsWithScores.length < distributionOptions.targetCount * 1.5;

		const distributed = distributeJobsWithDiversity(
			jobsWithScores as any[],
			{
				targetCount: distributionOptions.targetCount,
				targetCities: distributionOptions.targetCities,
				maxPerSource: shouldRelaxDistribution
					? Math.ceil(distributionOptions.targetCount / 2) // Relaxed: allow 50% from one source
					: Math.ceil(distributionOptions.targetCount / 3), // Strict: max 33% from one source
				ensureCityBalance: !shouldRelaxDistribution, // Relax city balance if few matches
				targetWorkEnvironments: distributionOptions.targetWorkEnvironments,
				ensureWorkEnvironmentBalance:
					distributionOptions.targetWorkEnvironments.length > 0 &&
					!shouldRelaxDistribution,
				relaxed: shouldRelaxDistribution, // Pass relaxed flag
			} as any,
		);
		// Convert JobWithSource[] to expected format
		distributedJobs = distributed.map((dj: any) => {
			// Handle both JobWithSource format and our format
			if (dj.job) {
				return {
					job: dj.job,
					match_score: dj.match_score || 0,
					match_reason: dj.match_reason || "",
				};
			}
			// If it's already in our format, return as-is
			return dj;
		});

		// If distribution still empty, use top matches directly (no distribution)
		if (distributedJobs.length === 0 && jobsWithScores.length > 0) {
			distributedJobs = jobsWithScores.slice(0, distributionOptions.targetCount);

			apiLogger.warn(
				"Distribution returned empty, using top matches directly",
				{
					email: userPrefs.email,
					matchesUsed: distributedJobs.length,
				},
			);
		}
	} else {
		// No distribution options - use matches directly
		distributedJobs = finalMatches.slice(0, minMatches).map((m) => {
			const job = allJobs.find((j) => j.job_hash === m.job_hash);
			if (!job) throw new Error(`Job not found: ${m.job_hash}`);
			return {
				job,
				match_score: m.match_score,
				match_reason: m.match_reason,
			};
		});
	}

	// Step 5: If still < minMatches, get target companies and trigger custom scan
	let targetCompanies: Array<{
		company: string;
		lastMatchedAt: string;
		matchCount: number;
		roles: string[];
	}> = [];
	let customScan: {
		scanId: string;
		estimatedTime: string;
		message: string;
	} | null = null;

	if (distributedJobs.length < minMatches) {
		apiLogger.info("Still insufficient matches, fetching target companies", {
			email: userPrefs.email,
			currentMatches: distributedJobs.length,
			minRequired: minMatches,
		});

		// Get target companies (non-blocking)
		const targetCompaniesResult = await getTargetCompaniesFromHistory(
			supabase,
			userPrefs,
		);
		targetCompanies = targetCompaniesResult.targetCompanies || [];

		// Trigger custom scan (non-blocking)
		const missingCriteria = extractMissingCriteria(
			userPrefs,
			distributedJobs.map((dj) => ({ job: dj.job })),
		);
		customScan = await triggerCustomScan(supabase, userPrefs, missingCriteria);

		matchingMethod = "custom_scan";
		relaxationLevel = 7;
	}

	const processingTime = Date.now() - startTime;
	apiLogger.info("Premium matching coordination complete", {
		email: userPrefs.email,
		matchesFound: distributedJobs.length,
		targetCompanies: targetCompanies.length,
		customScanTriggered: !!customScan,
		processingTime,
		matchingMethod,
		relaxationLevel,
	});

	return {
		matches: distributedJobs.map((dj) => ({
			job: dj.job,
			match_score: dj.match_score,
			match_reason: dj.match_reason,
			relaxationLevel: (dj as any).relaxationLevel,
		})),
		targetCompanies,
		customScan,
		metadata: {
			matchingMethod,
			relaxationLevel,
			locationExpansion: locationExpansionLevel,
			totalJobsScored: allJobs.length,
		},
	};
}
