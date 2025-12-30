/**
 * Zero-Match Monitoring Endpoint
 * Tracks zero-match incidents for monitoring and alerting
 */

import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { getDatabaseClient } from "@/Utils/databasePool";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
	try {
		const supabase = getDatabaseClient();

		// Get zero-match incidents from logs
		// For now, we'll check recent matching activity and flag potential issues

		// Get users who might have zero matches (users with no recent matches)
		const { data: usersWithoutMatches, error: usersError } = await supabase
			.from("users")
			.select("email, created_at, last_email_sent, target_cities, career_path")
			.eq("active", true)
			.is("last_email_sent", null)
			.gte(
				"created_at",
				new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
			) // Last 7 days
			.limit(50);

		if (usersError) {
			apiLogger.error(
				"Failed to fetch users without matches",
				usersError as Error,
			);
			return NextResponse.json(
				{ error: "Failed to fetch data" },
				{ status: 500 },
			);
		}

		// Get recent match statistics
		const { data: recentMatches, error: matchesError } = await supabase
			.from("matches")
			.select("user_email, created_at")
			.gte(
				"created_at",
				new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
			) // Last 24 hours
			.order("created_at", { ascending: false })
			.limit(1000);

		if (matchesError) {
			apiLogger.error("Failed to fetch recent matches", matchesError as Error);
		}

		// Calculate zero-match rate
		const uniqueUsersWithMatches = new Set(
			recentMatches?.map((m) => m.user_email) || [],
		);
		const totalActiveUsers = usersWithoutMatches?.length || 0;
		const usersWithMatches = uniqueUsersWithMatches.size;

		// Estimate zero-match rate (users created but no matches)
		const zeroMatchRate =
			totalActiveUsers > 0
				? ((totalActiveUsers - usersWithMatches) / totalActiveUsers) * 100
				: 0;

		// Get job supply stats
		const { count: activeJobs, error: jobsError } = await supabase
			.from("jobs")
			.select("*", { count: "exact", head: true })
			.eq("is_active", true);

		if (jobsError) {
			apiLogger.error("Failed to fetch job count", jobsError as Error);
		}

		return NextResponse.json({
			timestamp: new Date().toISOString(),
			zeroMatchRate: Math.round(zeroMatchRate * 100) / 100,
			metrics: {
				activeUsers: totalActiveUsers,
				usersWithMatches,
				usersWithoutMatches: totalActiveUsers - usersWithMatches,
				activeJobs: activeJobs || 0,
				recentMatchesCount: recentMatches?.length || 0,
			},
			status:
				zeroMatchRate < 1
					? "healthy"
					: zeroMatchRate < 5
						? "warning"
						: "critical",
			recommendations:
				zeroMatchRate >= 5
					? [
							"Check pre-filter thresholds - may be too strict",
							"Verify job supply - ensure JobSpy is running",
							"Review user preferences - may be too restrictive",
						]
					: [],
		});
	} catch (error) {
		apiLogger.error("Zero-match monitoring failed", error as Error);
		return NextResponse.json(
			{
				error: "Monitoring check failed",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
