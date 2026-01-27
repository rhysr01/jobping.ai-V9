/**
 * SignupMatchingService - Consolidated Matching Logic for Both Free & Premium Signup
 *
 * This service eliminates code duplication between /api/signup and /api/signup/free routes.
 * It provides a single source of truth for all signup matching logic with tier-aware configurations.
 *
 * Key Features:
 * - Prevents race conditions via idempotency checks
 * - Tier-specific matching (5 matches for free, 15 for premium)
 * - Job freshness handling (free: 30 days, premium: 7 days)
 * - Comprehensive logging and error handling
 */

import { randomUUID } from "crypto";
import { apiLogger } from "../../lib/api-logger";
import { getDatabaseClient } from "../core/database-pool";
import type { JobMatch, UserPreferences } from "../matching/types";
import {
	type FreeUserPreferences,
	runFreeMatching,
} from "../strategies/FreeMatchingStrategy";
import {
	type PremiumUserPreferences,
	runPremiumMatching,
} from "../strategies/PremiumMatchingStrategy";

export type SubscriptionTier = "free" | "premium_pending";

export interface MatchingConfig {
	tier: SubscriptionTier;
	maxMatches: number;
	jobFreshnessDays: number;
	useAI: boolean;
	maxJobsForAI: number;
	fallbackThreshold: number;
	includePrefilterScore: boolean;
	maxJobsToFetch: number; // CRITICAL: Prevent fetching massive job pools
}

export interface MatchingResult {
	success: boolean;
	matchCount: number;
	matches: JobMatch[];
	processingTime: number;
	method: "ai" | "fallback" | "idempotent";
	error?: string;
}

/**
 * Centralized tier configurations - no more magic numbers scattered across routes
 */
const TIER_CONFIGS: Record<SubscriptionTier, MatchingConfig> = {
	free: {
		tier: "free",
		maxMatches: 5, // Free users get 5 matches
		jobFreshnessDays: 30, // Free users get 30-day old jobs
		useAI: true,
		maxJobsForAI: 20,
		fallbackThreshold: 3,
		includePrefilterScore: true,
		maxJobsToFetch: 5000, // Prevent massive DB scans for free tier
	},
	premium_pending: {
		tier: "premium_pending",
		maxMatches: 15, // Premium users get 15 matches
		jobFreshnessDays: 7, // Premium users get 7-day old jobs
		useAI: true,
		maxJobsForAI: 30,
		fallbackThreshold: 5,
		includePrefilterScore: true,
		maxJobsToFetch: 10000, // Premium gets fresher jobs, so larger pool ok
	},
};

export class SignupMatchingService {
	/**
	 * Get tier-specific matching configuration
	 */
	static getConfig(tier: SubscriptionTier): MatchingConfig {
		const config = TIER_CONFIGS[tier];
		if (!config) {
			throw new Error(`Invalid subscription tier: ${tier}`);
		}
		return config;
	}

	/**
	 * Main matching method - delegates to appropriate strategy based on tier
	 */
	static async runMatching(
		userPrefs: UserPreferences,
		config: MatchingConfig,
		requestId?: string,
	): Promise<MatchingResult> {
		const startTime = Date.now();
		const email = userPrefs.email;
		const requestIdStr = requestId || randomUUID();

		try {
			apiLogger.info(
				`[${config.tier.toUpperCase()}] Starting signup matching`,
				{
					email,
					requestId: requestIdStr,
					tier: config.tier,
					maxMatches: config.maxMatches,
					jobFreshnessDays: config.jobFreshnessDays,
				},
			);

			// STEP 1: IDEMPOTENCY CHECK - Prevent race conditions
			const existingMatchesResult =
				await SignupMatchingService.checkExistingMatches(email, config.tier);
			if (existingMatchesResult) {
				const processingTime = Date.now() - startTime;
				apiLogger.info(
					`[${config.tier.toUpperCase()}] Idempotent match found`,
					{
						email,
						requestId: requestIdStr,
						existingCount: existingMatchesResult.matchCount,
						processingTime,
					},
				);
				return {
					success: true,
					matchCount: existingMatchesResult.matchCount,
					matches: [],
					processingTime,
					method: "idempotent",
				};
			}

			// STEP 2: FETCH JOBS - Tier-aware job selection
			const jobs = await SignupMatchingService.fetchJobsForTier(config);
			if (jobs.length === 0) {
				apiLogger.warn(
					`[${config.tier.toUpperCase()}] No jobs available for matching`,
					{
						email,
						requestId: requestIdStr,
						tier: config.tier,
					},
				);
				return {
					success: false,
					matchCount: 0,
					matches: [],
					processingTime: Date.now() - startTime,
					method: "ai",
					error: "NO_JOBS_AVAILABLE",
				};
			}

			apiLogger.info(
				`[${config.tier.toUpperCase()}] Fetched jobs for matching`,
				{
					email,
					requestId: requestIdStr,
					jobCount: jobs.length,
					tier: config.tier,
				},
			);

			// STEP 3: DELEGATE TO APPROPRIATE STRATEGY
			let strategyResult: {
				matches: any[];
				matchCount: number;
				method: string;
				duration: number;
			};

			if (config.tier === "free") {
				// Use Free Matching Strategy
				const freePrefs: FreeUserPreferences = {
					email: userPrefs.email,
					target_cities: userPrefs.target_cities || [],
					career_path: userPrefs.career_path?.[0] || null,
					visa_status: userPrefs.visa_status,
					entry_level_preference: userPrefs.entry_level_preference,
					subscription_tier: "free",
				};

				strategyResult = await runFreeMatching(freePrefs, jobs, config.maxMatches);
			} else {
				// Use Premium Matching Strategy
				const premiumPrefs: PremiumUserPreferences = {
					email: userPrefs.email,
					target_cities: userPrefs.target_cities || [],
					career_path: userPrefs.career_path || [],
					languages_spoken: userPrefs.languages_spoken || [],
					roles_selected: userPrefs.roles_selected || [],
					entry_level_preference: userPrefs.entry_level_preference,
					work_environment: userPrefs.work_environment,
					visa_status: userPrefs.visa_status,
					skills: userPrefs.skills || [],
					industries: userPrefs.industries || [],
					company_size_preference: userPrefs.company_size_preference,
					career_keywords: userPrefs.career_keywords,
					subscription_tier: "premium_pending",
				};

				strategyResult = await runPremiumMatching(premiumPrefs, jobs, config.maxMatches);
			}

			const processingTime = Date.now() - startTime;

			apiLogger.info(
				`[${config.tier.toUpperCase()}] Strategy matching completed`,
				{
					email,
					requestId: requestIdStr,
					tier: config.tier,
					totalJobsProcessed: jobs.length,
					matchesFound: strategyResult.matchCount,
					processingTime,
					method: strategyResult.method,
				},
			);

			return {
				success: true,
				matchCount: strategyResult.matchCount,
				matches: strategyResult.matches,
				processingTime,
				method: strategyResult.method as "ai" | "fallback" | "idempotent",
			};
		} catch (error) {
			const processingTime = Date.now() - startTime;
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			apiLogger.error(
				`[${config.tier.toUpperCase()}] Matching failed catastrophically`,
				error as Error,
				{
					email,
					requestId: requestIdStr,
					tier: config.tier,
					processingTime,
					error: errorMessage,
				},
			);

			return {
				success: false,
				matchCount: 0,
				matches: [],
				processingTime,
				method: "ai",
				error: errorMessage,
			};
		}
	}

	/**
	 * Check if user already has matches (idempotency)
	 */
	private static async checkExistingMatches(
		email: string,
		tier: SubscriptionTier,
	): Promise<{ matchCount: number } | null> {
		try {
			const supabase = getDatabaseClient();

			// Check if matches already exist
			const { data: existingMatches } = await supabase
				.from("matches")
				.select("job_hash")
				.eq("user_email", email)
				.limit(1);

			if (existingMatches && existingMatches.length > 0) {
				// Get actual count
				const { count: matchCount } = await supabase
					.from("matches")
					.select("id", { count: "exact", head: true })
					.eq("user_email", email);

				return { matchCount: matchCount || 0 };
			}

			return null; // No existing matches
		} catch (error) {
			apiLogger.warn(
				`[${tier.toUpperCase()}] Failed to check existing matches, proceeding with matching`,
				{
					email,
					error: error instanceof Error ? error.message : String(error),
				},
			);
			return null; // Proceed with matching on error
		}
	}

	/**
	 * Fetch jobs based on tier-specific freshness requirements
	 * CRITICAL: Database-level limit prevents massive job pool bloat
	 * FIX: Handle null posted_at values using or() to prevent 500 errors
	 */
	private static async fetchJobsForTier(
		config: MatchingConfig,
	): Promise<any[]> {
		const supabase = getDatabaseClient();
		const freshnessDate = new Date();
		freshnessDate.setDate(freshnessDate.getDate() - config.jobFreshnessDays);

		const { data: jobs } = await supabase
			.from("jobs")
			.select(`
				id, job_hash, title, company, location, city, country, job_url, description,
				experience_required, work_environment, source, categories, company_profile_url,
				language_requirements, scrape_timestamp, original_posted_date, posted_at,
				last_seen_at, is_active, scraper_run_id, created_at, is_internship, is_graduate,
				visa_friendly, status, filtered_reason, salary_min, salary_max, visa_sponsorship
			`)
			.eq("is_active", true)
			.eq("status", "active")
			.is("filtered_reason", null)
			.or(`posted_at.gte.${freshnessDate.toISOString()},posted_at.is.null`)
			.order("created_at", { ascending: false })
			.limit(config.maxJobsToFetch); // PRODUCTION FIX: Prevent massive DB scans

		return jobs || [];
	}
}

/**
 * USAGE EXAMPLES:
 *
 * // In /api/signup/route.ts (premium):
 * import { SignupMatchingService } from "@/utils/services/SignupMatchingService";
 *
 * const matchingConfig = SignupMatchingService.getConfig("premium_pending");
 * const result = await SignupMatchingService.runMatching(userPrefs, matchingConfig);
 * const matchesCount = result.matchCount;
 *
 * // In /api/signup/free/route.ts (free):
 * const matchingConfig = SignupMatchingService.getConfig("free");
 * const result = await SignupMatchingService.runMatching(userPrefs, matchingConfig);
 * const matchesCount = result.matchCount;
 */
