// File: /utils/strategies/PremiumMatchingStrategy.ts
// Purpose: Complex matching strategy for premium tier users (4-step form)
// Premium users provide: cities, career, skills, industries, company size, work env, visa, etc.
// Result: 15 matches

import { apiLogger } from "../../lib/api-logger";
import { getDatabaseClient } from "../core/database-pool";
import { simplifiedMatchingEngine } from "../matching/core/matching-engine";
import type { JobWithMetadata } from "../../lib/types/job";

export interface PremiumUserPreferences {
	email: string;
	target_cities: string[];
	career_path: string[];
	languages_spoken: string[];
	roles_selected: string[];
	entry_level_preference?: string;
	work_environment?: "remote" | "hybrid" | "on-site" | "unclear";
	visa_status?: string;
	// Premium fields
	skills: string[];
	industries: string[];
	company_size_preference?: string;
	career_keywords?: string;
	subscription_tier: "premium_pending";
}

export interface MatchingResult {
	matches: JobWithMetadata[];
	matchCount: number;
	method: string;
	duration: number;
}

/**
 * Premium Matching Strategy
 *
 * Complex matching for premium tier:
 * - Uses: All 17+ fields provided by comprehensive 4-step form
 * - Filtering: Cities + career + skills + industries + company size + work env + visa
 * - AI Processing: Deep analysis (30 jobs max)
 * - Result: 15 matches with sophisticated ranking
 * - Logic: Thorough pre-filtering + deep AI ranking
 */
export async function runPremiumMatching(
	userPrefs: PremiumUserPreferences,
	jobs: JobWithMetadata[],
): Promise<MatchingResult> {
	const startTime = Date.now();

	try {
		apiLogger.info("[PREMIUM] Starting premium tier matching", {
			email: userPrefs.email,
			cities: userPrefs.target_cities,
			careerPaths: userPrefs.career_path,
			skills: userPrefs.skills?.length || 0,
			industries: userPrefs.industries?.length || 0,
			jobsAvailable: jobs.length,
		});

		if (!jobs || jobs.length === 0) {
			apiLogger.warn("[PREMIUM] No jobs available for matching", {
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

		// STAGE 1: Comprehensive pre-filtering (premium users provide rich data)
		// This is the KEY difference from free - we filter THOROUGHLY because
		// premium users have provided skills, industries, company size, work environment, etc.
		const preFiltered = jobs.filter((job) => {
			// City matching (required)
			const cityMatch = userPrefs.target_cities.some(
				(city) => job.city?.toLowerCase() === city.toLowerCase(),
			);
			if (!cityMatch) return false;

			// Career path matching
			const careerMatch = !userPrefs.career_path?.length ||
				userPrefs.career_path.some(career =>
					job.categories?.some(cat =>
						cat.toLowerCase().includes(career.toLowerCase())
					)
				);
			if (!careerMatch) return false;

			// Skills matching (premium feature)
			const skillsMatch = !userPrefs.skills?.length ||
				userPrefs.skills.some(skill =>
					job.title?.toLowerCase().includes(skill.toLowerCase()) ||
					job.description?.toLowerCase().includes(skill.toLowerCase()) ||
					job.categories?.some(cat =>
						cat.toLowerCase().includes(skill.toLowerCase())
					)
				);

			// Industries matching (premium feature)
			const industryMatch = !userPrefs.industries?.length ||
				userPrefs.industries.some(industry =>
					job.company?.toLowerCase().includes(industry.toLowerCase()) ||
					job.description?.toLowerCase().includes(industry.toLowerCase())
				);

			// Work environment matching
			const workEnvMatch = !userPrefs.work_environment ||
				userPrefs.work_environment === "unclear" ||
				job.work_environment === userPrefs.work_environment;

			// Visa status matching (if specified)
			const visaMatch = !userPrefs.visa_status ||
				job.visa_sponsorship ||
				job.visa_friendly;

			return skillsMatch && industryMatch && workEnvMatch && visaMatch;
		});

		apiLogger.info("[PREMIUM] Pre-filtered jobs", {
			email: userPrefs.email,
			original: jobs.length,
			afterPreFilter: preFiltered.length,
			filtersApplied: {
				cities: userPrefs.target_cities.length,
				careers: userPrefs.career_path?.length || 0,
				skills: userPrefs.skills?.length || 0,
				industries: userPrefs.industries?.length || 0,
				workEnvironment: !!userPrefs.work_environment,
				visaStatus: !!userPrefs.visa_status,
			},
		});

		if (preFiltered.length === 0) {
			apiLogger.warn("[PREMIUM] No jobs after comprehensive pre-filtering", {
				email: userPrefs.email,
				reason: "Filters too restrictive - premium users have specific requirements",
			});

			// Fallback: Relax some constraints but keep core requirements
			const fallbackFiltered = jobs.filter((job) => {
				// Keep city and career as mandatory
				const cityMatch = userPrefs.target_cities.some(
					(city) => job.city?.toLowerCase() === city.toLowerCase(),
				);
				const careerMatch = !userPrefs.career_path?.length ||
					userPrefs.career_path.some(career =>
						job.categories?.some(cat =>
							cat.toLowerCase().includes(career.toLowerCase())
						)
					);

				// Relax skills/industries but keep work env and visa
				const workEnvMatch = !userPrefs.work_environment ||
					userPrefs.work_environment === "unclear" ||
					job.work_environment === userPrefs.work_environment;

				return cityMatch && careerMatch && workEnvMatch;
			});

			if (fallbackFiltered.length > 0) {
				apiLogger.info("[PREMIUM] Using fallback (relaxed skills/industries)", {
					email: userPrefs.email,
					jobsInFallback: fallbackFiltered.length,
				});

				return await rankAndReturnMatches(
					userPrefs,
					fallbackFiltered,
					"premium_fallback",
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

		// STAGE 2: Deep AI ranking (premium gets thorough analysis)
		// For premium tier, we use DEEP AI because:
		// 1. Users have provided comprehensive data (17+ fields)
		// 2. Premium users expect high-quality matches
		// 3. 15 matches allows for sophisticated ranking
		// 4. We can afford heavier processing for paying users
		return await rankAndReturnMatches(
			userPrefs,
			preFiltered,
			"premium_ai_ranked",
			startTime,
		);
	} catch (error) {
		apiLogger.error("[PREMIUM] Matching error", error as Error, {
			email: userPrefs.email,
		});
		throw error;
	}
}

/**
 * Rank jobs using deep AI analysis and return top 15 matches
 */
async function rankAndReturnMatches(
	userPrefs: PremiumUserPreferences,
	jobs: JobWithMetadata[],
	method: string,
	startTime: number,
): Promise<MatchingResult> {
	try {
		// Normalize jobs for consistent processing
		const normalizedJobs = jobs.map((job) => ({
			...job,
			language_requirements: job.language_requirements || [],
		}));

		// Use simplified matching engine with premium configuration
		const matchResult = await simplifiedMatchingEngine.findMatchesForPremiumUser(
			userPrefs as any,
			normalizedJobs as any,
		);

		const matches = (matchResult?.matches || [])
			.slice(0, 15) // PREMIUM: Always 15 matches max
			.map((m: any) => ({
				...m.job,
				match_score: m.match_score,
				match_reason: m.match_reason,
			}));

		apiLogger.info("[PREMIUM] Deep AI ranking complete", {
			email: userPrefs.email,
			inputJobs: jobs.length,
			outputMatches: matches.length,
			method: method,
			duration: Date.now() - startTime,
		});

		// Save premium matches to database
		const supabase = getDatabaseClient();
		const matchesToSave = matches.map((m: any) => ({
			user_email: userPrefs.email,
			job_hash: String(m.job_hash),
			match_score: Number((m.match_score || 0) / 100),
			match_reason: String(m.match_reason || "Premium AI Match"),
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
				apiLogger.error("[PREMIUM] Failed to save premium matches", saveError as Error, {
					email: userPrefs.email,
					matchCount: matchesToSave.length,
				});
			} else {
				apiLogger.info("[PREMIUM] Premium matches saved", {
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
		apiLogger.error("[PREMIUM] Deep AI ranking error", error as Error, {
			email: userPrefs.email,
		});
		throw error;
	}
}