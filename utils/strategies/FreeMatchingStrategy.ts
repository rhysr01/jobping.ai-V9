// File: /utils/strategies/FreeMatchingStrategy.ts
// Purpose: Simple matching strategy for free tier users (1-step form)
// Free users provide: email, name, cities, career only
// Result: 5 matches

import { apiLogger } from "../../lib/api-logger";
import { getDatabaseClient } from "../core/database-pool";
import { simplifiedMatchingEngine } from "../matching/core/matching-engine";
import type { JobWithMetadata } from "../../lib/types/job";
import { FORM_TO_DATABASE_MAPPING } from "../matching/categoryMapper";

export interface FreeUserPreferences {
	email: string;
	target_cities: string[];
	career_path: string | null;
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
			const cityMatch = userPrefs.target_cities.some(
				(city) => job.city?.toLowerCase() === city.toLowerCase(),
			);

			// IMPROVED: Strict career path matching for free tier
			// Only match jobs that have the exact career path category
			const careerMatch = !userPrefs.career_path || // If no career specified, include all
				!job.categories || job.categories.length === 0 || // or if job has no categories, include
				job.categories.some((cat) => {
					const catLower = cat.toLowerCase();
					// Handle both array and string career_path formats
					if (Array.isArray(userPrefs.career_path)) {
						return userPrefs.career_path.some(userCareer => {
							// Map user career path to database category and check exact match
							const dbCategory = FORM_TO_DATABASE_MAPPING[userCareer] || userCareer;
							return catLower === dbCategory.toLowerCase();
						});
					} else if (userPrefs.career_path) {
						// Map user career path to database category and check exact match
						const dbCategory = FORM_TO_DATABASE_MAPPING[userPrefs.career_path] || userPrefs.career_path;
						return catLower === dbCategory.toLowerCase();
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
			const fallbackFiltered = jobs.filter(
				(job) =>
					userPrefs.target_cities.some(
						(city) => job.city?.toLowerCase().includes(city.toLowerCase()),
					),
			);

			if (fallbackFiltered.length > 0) {
				apiLogger.info("[FREE] Using fallback (city-only filter)", {
					email: userPrefs.email,
					jobsInFallback: fallbackFiltered.length,
				});

				return await rankAndReturnMatches(
					userPrefs,
					fallbackFiltered,
					"free_fallback",
					startTime,
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
): Promise<MatchingResult> {
	try {
		// Use simplified matching engine with free tier configuration
		const matchResult = await simplifiedMatchingEngine.findMatchesForFreeUser(
			{
				email: userPrefs.email,
				target_cities: userPrefs.target_cities,
				career_path: userPrefs.career_path || [],
				entry_level_preference: userPrefs.entry_level_preference || "graduate, intern, junior",
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
			.slice(0, 5) // FREE: Always 5 matches max
			.map((m: any) => ({
				...m.job,
				match_score: m.match_score,
				match_reason: m.match_reason,
			}));

		apiLogger.info("[FREE] Ranking complete", {
			email: userPrefs.email,
			inputJobs: jobs.length,
			outputMatches: matches.length,
			method: method,
			duration: Date.now() - startTime,
		});

		// Save matches to database
		const supabase = getDatabaseClient();
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
			const { error: saveError } = await supabase
				.from("matches")
				.upsert(matchesToSave, { onConflict: "user_email,job_hash" })
				.select();

			if (saveError) {
				apiLogger.error("[FREE] Failed to save matches", saveError as Error, {
					email: userPrefs.email,
					matchCount: matchesToSave.length,
				});
			} else {
				apiLogger.info("[FREE] Matches saved", {
					email: userPrefs.email,
					count: matchesToSave.length,
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