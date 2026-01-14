/**
 * Simplified Orchestration - Uses the new 3-service matching engine
 * Handles user/job fetching and match persistence
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { apiLogger } from "../../../../lib/api-logger";
import type { Job as ScrapersJob } from "@/scrapers/types";
import type { UserPreferences } from "../../../../utils/matching/types";
import type { MatchResult, User } from "./types";

/**
 * Fetch users and jobs - Real implementation
 */
export async function fetchUsersAndJobs(
	supabase: SupabaseClient,
	userCap: number,
	jobCap: number,
): Promise<{
	users: User[];
	jobs: ScrapersJob[];
	transformedUsers: Array<{ email?: string; preferences: UserPreferences }>;
	isSemanticAvailable: boolean;
}> {
	// Fetch free users who signed up but haven't been matched yet
	const { data: users, error: usersError } = await supabase
		.from("users")
		.select("*")
		.eq("subscription_tier", "free")
		.is("matched_at", null) // Not yet matched
		.limit(userCap);

	if (usersError) {
		throw new Error(`Failed to fetch users: ${usersError.message}`);
	}

	if (!users || users.length === 0) {
		throw new Error("No users found");
	}

	apiLogger.info("Fetched users for batch matching", {
		count: users.length,
	});

	// Fetch recent active jobs
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const { data: jobs, error: jobsError } = await supabase
		.from("jobs")
		.select("*")
		.eq("is_active", true)
		.eq("status", "active")
		.is("filtered_reason", null)
		.gte("created_at", thirtyDaysAgo.toISOString())
		.limit(jobCap);

	if (jobsError) {
		throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
	}

	if (!jobs || jobs.length === 0) {
		throw new Error("No active jobs to process");
	}

	apiLogger.info("Fetched jobs for batch matching", {
		count: jobs.length,
	});

	// Transform users to preferences format
	const transformedUsers = users.map((user: any) => ({
		email: user.email,
		preferences: {
			email: user.email,
			target_cities: user.target_cities || [],
			career_path: user.career_path ? [user.career_path] : [],
			entry_level_preference: user.entry_level_preference || "graduate, intern, junior",
			work_environment: user.work_environment,
			languages_spoken: user.languages_spoken || [],
			roles_selected: user.roles_selected || [],
			company_types: user.company_types || [],
			visa_status: user.visa_status,
			professional_expertise: user.career_path || "",
			subscription_tier: user.subscription_tier,
			career_keywords: user.career_keywords,
			industries: user.industries,
		} as UserPreferences,
	}));

	return {
		users,
		jobs: jobs as ScrapersJob[],
		transformedUsers,
		isSemanticAvailable: !!process.env.OPENAI_API_KEY,
	};
}

/**
 * Process users with simplified matching engine
 */
export async function processUsers(
	transformedUsers: Array<{ email?: string; preferences: UserPreferences }>,
	jobs: ScrapersJob[],
	supabase: SupabaseClient,
): Promise<MatchResult[]> {
	const { simplifiedMatchingEngine } = await import(
		"@/utils/matching/core/matching-engine"
	);
	const results: MatchResult[] = [];

	for (const userData of transformedUsers) {
		const userEmail = userData.email || "";

		try {
			apiLogger.info("Processing user for batch matching", {
				userEmail,
				jobsCount: jobs.length,
			});

			// Run matching
			const matchResult = await simplifiedMatchingEngine.findMatchesForUser(
				userData.preferences,
				jobs,
				{ useAI: true },
			);

			// Save matches to database
			if (matchResult.matches && matchResult.matches.length > 0) {
				const matchRecords = matchResult.matches.map((match: any) => ({
					user_email: userEmail,
					job_hash: match.job_hash,
					match_score: match.match_score,
					match_reason: match.match_reason,
					matched_at: new Date().toISOString(),
					created_at: new Date().toISOString(),
				}));

				const { error: saveError } = await supabase
					.from("matches")
					.upsert(matchRecords, { onConflict: "user_email,job_hash" });

				if (saveError) {
					apiLogger.error("Failed to save matches for user", saveError as Error, {
						userEmail,
						matchCount: matchResult.matches.length,
					});

					results.push({
						user: userEmail,
						success: false,
						matches: 0,
					});
				} else {
					// Mark user as matched
					await supabase
						.from("users")
						.update({ matched_at: new Date().toISOString() })
						.eq("email", userEmail);

					results.push({
						user: userEmail,
						success: true,
						matches: matchResult.matches.length,
					});

					apiLogger.info("User batch matching completed", {
						userEmail,
						matches: matchResult.matches.length,
						method: matchResult.method,
					});
				}
			} else {
				results.push({
					user: userEmail,
					success: false,
					matches: 0,
				});
			}
		} catch (error) {
			apiLogger.error("Error processing user", error as Error, {
				userEmail,
			});

			results.push({
				user: userEmail,
				success: false,
				matches: 0,
			});
		}
	}

	return results;
}

// Commented out unused function
/*
async function saveMatchToDatabase(
	supabase: SupabaseClient,
	userEmail: string,
	match: JobMatch
): Promise<void> {
	const { error } = await supabase.from("matches").upsert(
		{
			user_email: userEmail,
			job_hash: match.job.job_hash,
			match_score: match.match_score,
			confidence_score: match.confidence_score,
			match_reason: match.match_reason,
			score_breakdown: match.score_breakdown,
			method: match.method,
			created_at: new Date().toISOString(),
		},
		{
			onConflict: "user_email,job_hash",
		}
	);

	if (error) {
		throw new Error(`Failed to save match: ${error.message}`);
	}
}
*/

/**
 * Log match session for analytics
 */
export async function logMatchSession(
	supabase: SupabaseClient,
	sessionData: {
		user_email: string;
		total_jobs_processed: number;
		matches_found: number;
		method: string;
		processing_time: number;
		prefilter_stats: {
			filtered_count: number;
			match_level: string;
		};
	},
): Promise<void> {
	const { error } = await supabase.from("match_sessions").insert({
		user_email: sessionData.user_email,
		total_jobs_processed: sessionData.total_jobs_processed,
		matches_found: sessionData.matches_found,
		method: sessionData.method,
		processing_time: sessionData.processing_time,
		prefilter_stats: sessionData.prefilter_stats,
		created_at: new Date().toISOString(),
	});

	if (error) {
		apiLogger.warn("Failed to log match session", error);
	}
}
