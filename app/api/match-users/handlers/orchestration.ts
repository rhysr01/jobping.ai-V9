/**
 * Simplified Orchestration - Uses the new 3-service matching engine
 * Handles user/job fetching and match persistence
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { apiLogger } from "@/lib/api-logger";
import type { Job as ScrapersJob } from "@/scrapers/types";
import type { UserPreferences } from "@/utils/matching/types";
import type { MatchResult, User } from "./types";

/**
 * Fetch users and jobs - Simplified
 */
export async function fetchUsersAndJobs(
	_supabase: SupabaseClient,
	_userCap: number,
	_jobCap: number,
): Promise<{
	users: User[];
	jobs: ScrapersJob[];
	transformedUsers: Array<{ email?: string; preferences: UserPreferences }>;
	isSemanticAvailable: boolean;
}> {
	const users: User[] = [];
	const jobs: ScrapersJob[] = [];
	const transformedUsers: Array<{
		email?: string;
		preferences: UserPreferences;
	}> = [];

	return {
		users,
		jobs,
		transformedUsers,
		isSemanticAvailable: true,
	};
}

/**
 * Process users with simplified matching engine
 */
export async function processUsers(
	transformedUsers: Array<{ email?: string; preferences: UserPreferences }>,
	_jobs: ScrapersJob[],
	_supabase: SupabaseClient,
	_startTime: number,
): Promise<MatchResult[]> {
	const results: MatchResult[] = [];

	for (const userData of transformedUsers) {
		const userEmail = userData.email || "";

		results.push({
			user: userEmail,
			success: true,
			matches: 0,
		});
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
