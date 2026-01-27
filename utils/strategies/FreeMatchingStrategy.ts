// File: /utils/strategies/FreeMatchingStrategy.ts
// Purpose: Simple matching strategy for free tier users (1-step form)
// Free users provide: email, name, cities, career only
// Result: 5 matches

import { apiLogger } from "../../lib/api-logger";
import type { JobWithMetadata } from "../../lib/types/job";
import { simplifiedMatchingEngine } from "../matching/core/matching-engine";
import { getDatabaseClient } from "../core/database-pool";

export interface FreeUserPreferences {
	email: string;
	target_cities: string[];
	career_path: string | string[] | null;
	visa_status?: string;
	entry_level_preference?: string;
	subscription_tier: "free";
}

export interface MatchingResult {
	matches: JobWithMetadata[];
	matchCount: number;
	method: string;
	duration: number;
}

/**
 * Free Matching Strategy
 *
 * Simple matching for free tier:
 * - Uses: cities + career path only
 * - Ignores: skills, industries, company size, etc (not provided by free users)
 * - Result: 5 matches
 * - Logic: Light AI ranking on filtered results
 */
export async function runFreeMatching(
	userPrefs: FreeUserPreferences,
	jobs: JobWithMetadata[],
	maxMatches: number = 5,
): Promise<MatchingResult> {
	const startTime = Date.now();

	try {
		apiLogger.info("[FREE] Starting free tier matching", {
			email: userPrefs.email,
			cities: userPrefs.target_cities,
			careerPath: userPrefs.career_path,
			jobsAvailable: jobs.length,
		});

		if (!jobs || jobs.length === 0) {
			apiLogger.warn("[FREE] No jobs available for matching", {
				email: userPrefs.email,
				cities: userPrefs.target_cities,
			});
			return {
				matches: [],
				matchCount: 0,
				method: "no_jobs_available",
				duration: Date.now() - startTime,
			};
		}

	// STAGE 1: Pre-filter by cities and career (simple)
	// This is the KEY difference from premium - we filter AGGRESSIVELY because
	// free users haven't provided skills, industries, company size, etc.
	const preFiltered = jobs.filter((job) => {
	const cityMatch = userPrefs.target_cities.some((city) => {
		// All job cities are normalized to form values via migration
		// Use exact case-insensitive match
		if (!job.city) return true; // Include jobs with NULL city
		return job.city.toLowerCase() === city.toLowerCase();
	});

		// IMPROVED: Strict career path matching for free tier
		// Only match jobs that have the exact career path category
		// Note: Categories are stored as JSON arrays in the database
		const careerMatch =
		!userPrefs.career_path || // If no career specified, include all
		!job.categories ||
		job.categories.length === 0 || // or if job has no categories, include
		job.categories.some((cat) => {
			const catLower = cat.toLowerCase();
			// Handle both array and string career_path formats
			// Long form categories are used everywhere now (e.g., "finance-investment")
			if (Array.isArray(userPrefs.career_path)) {
				return userPrefs.career_path.some((userCareer) => {
					// Direct comparison - userCareer IS database category
					return catLower === userCareer.toLowerCase();
				});
			} else if (userPrefs.career_path) {
				// Direct comparison - form value IS database category
				return catLower === userPrefs.career_path.toLowerCase();
			}
			return false; // No career path specified
		});

			return cityMatch && careerMatch;
		});

		apiLogger.info("[FREE] Pre-filtered jobs", {
			email: userPrefs.email,
			original: jobs.length,
			afterPreFilter: preFiltered.length,
		});

	if (preFiltered.length === 0) {
		apiLogger.warn("[FREE] No jobs after pre-filtering", {
			email: userPrefs.email,
			reason: "No jobs match cities and career",
		});

		// Fallback: Try broader search if pre-filter too strict
		// Cities are normalized in database, use exact matching
		const fallbackFiltered = jobs.filter((job) =>
			userPrefs.target_cities.some((city) => {
				if (!job.city) return true; // Include jobs with NULL city
				return job.city.toLowerCase() === city.toLowerCase();
			}),
		);

		if (fallbackFiltered.length > 0) {
			apiLogger.info("[FREE] Using fallback (city-only filter)", {
				email: userPrefs.email,
				jobsInFallback: fallbackFiltered.length,
				reason: "Career filter too strict, falling back to location-based matching",
			});

			return await rankAndReturnMatches(
				userPrefs,
				fallbackFiltered,
				"free_fallback",
				startTime,
				maxMatches,
			);
		}

		return {
			matches: [],
			matchCount: 0,
			method: "no_jobs_after_filter",
			duration: Date.now() - startTime,
		};
	}

		// STAGE 2: Light AI ranking (use simplified matching engine)
		// For free tier, we use lighter AI because:
		// 1. User hasn't provided much data (just cities + career)
		// 2. We want fast results (no heavy processing)
		// 3. 5 matches is small, doesn't need complex ranking
				return await rankAndReturnMatches(
					userPrefs,
					preFiltered,
					"free_ai_ranked",
					startTime,
					maxMatches,
				);
	} catch (error) {
		apiLogger.error("[FREE] Matching error", error as Error, {
			email: userPrefs.email,
		});
		throw error;
	}
}

/**
 * Rank jobs using AI and return top 5 matches
 */
async function rankAndReturnMatches(
	userPrefs: FreeUserPreferences,
	jobs: JobWithMetadata[],
	method: string,
	startTime: number,
	maxMatches: number,
): Promise<MatchingResult> {
	try {
		// Use simplified matching engine with free tier configuration
		const matchResult = await simplifiedMatchingEngine.findMatchesForFreeUser(
			{
				email: userPrefs.email,
				target_cities: userPrefs.target_cities,
				career_path: userPrefs.career_path || [],
				entry_level_preference:
					userPrefs.entry_level_preference || "graduate, intern, junior",
				visa_status: userPrefs.visa_status,
				// Free users don't provide these:
				languages_spoken: [],
				roles_selected: [],
				work_environment: undefined,
				skills: [],
				industries: [],
				company_size_preference: "any",
				career_keywords: null,
				subscription_tier: "free" as const,
			} as any,
			jobs as any,
		);

	const matches = (matchResult?.matches || [])
		.slice(0, maxMatches) // FREE: Use configurable match count
		.map((m: any) => {
			// Handle both formats: m.job (nested) and m directly (flat)
			const jobData = m.job || m;
			if (!jobData) {
				apiLogger.warn("[FREE] Match missing job data", {
					email: userPrefs.email,
					match: m,
				});
				return null;
			}
			return {
				...jobData,
				match_score: m.match_score || 0,
				match_reason: m.match_reason || "Matched",
			};
		})
		.filter(Boolean); // Remove null entries

		// If no matches found, try fallback with just city filter (more lenient)
		if (matches.length === 0 && jobs.length > 0) {
			apiLogger.warn("[FREE] No matches from AI, using raw job list as fallback", {
				email: userPrefs.email,
				availableJobs: jobs.length,
				method: method,
			});

			// Take first 5 jobs as fallback
			const fallbackMatches = jobs.slice(0, maxMatches).map((job: any) => ({
				...job,
				match_score: 0.5,
				match_reason: "Matching temporarily unavailable - showing available opportunities",
			}));

			apiLogger.info("[FREE] Using fallback job list", {
				email: userPrefs.email,
				fallbackMatches: fallbackMatches.length,
			});

			return {
				matches: fallbackMatches,
				matchCount: fallbackMatches.length,
				method: "free_fallback_jobs",
				duration: Date.now() - startTime,
			};
		}

		apiLogger.info("[FREE] Ranking complete", {
			email: userPrefs.email,
			inputJobs: jobs.length,
			outputMatches: matches.length,
			method: method,
			duration: Date.now() - startTime,
		});

	// Save matches to database
	const matchesToSave = matches.map((m: any) => ({
		user_email: userPrefs.email,
		job_hash: String(m.job_hash),
		match_score: Number((m.match_score || 0) / 100),
		match_reason: String(m.match_reason || "Matched"),
		matched_at: new Date().toISOString(),
		created_at: new Date().toISOString(),
		match_algorithm: method,
	}));

	if (matchesToSave.length > 0) {
		try {
			const supabase = getDatabaseClient();
			const { data, error } = await supabase
				.from("matches")
				.insert(matchesToSave);

			if (error) {
				apiLogger.error("[FREE] Failed to save matches to database", error as Error, {
					email: userPrefs.email,
					matchCount: matchesToSave.length,
					errorCode: error.code,
				});
			} else {
				apiLogger.info("[FREE] Successfully saved matches to database", {
					email: userPrefs.email,
					count: matchesToSave.length,
					insertedRows: data?.length || 0,
				});
			}
		} catch (err) {
			apiLogger.error("[FREE] Error saving matches", err as Error, {
				email: userPrefs.email,
				matchCount: matchesToSave.length,
			});
		}
	}

		return {
			matches,
			matchCount: matches.length,
			method: method,
			duration: Date.now() - startTime,
		};
	} catch (error) {
		apiLogger.error("[FREE] Ranking error", error as Error, {
			email: userPrefs.email,
		});
		throw error;
	}
}
