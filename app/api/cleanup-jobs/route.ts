import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/Utils/databasePool";
import { getProductionRateLimiter } from "@/Utils/productionRateLimiter";

export async function POST(req: NextRequest) {
	// PRODUCTION: Rate limiting for cleanup endpoint (automation use)
	const rateLimitResult = await getProductionRateLimiter().middleware(
		req,
		"default",
		{
			windowMs: 5 * 60 * 1000, // 5 minutes
			maxRequests: 2, // Max 2 cleanup requests per 5 minutes
		},
	);
	if (rateLimitResult) {
		return rateLimitResult;
	}

	// Security: Check for API key
	const apiKey = req.headers.get("x-api-key");
	if (!apiKey || apiKey !== process.env.SCRAPE_API_KEY) {
		return NextResponse.json(
			{ error: "Unauthorized. Valid API key required." },
			{ status: 401 },
		);
	}

	try {
		const { daysThreshold = 7 } = await req.json();
		const supabase = getDatabaseClient();

		console.log(
			` Starting job cleanup for jobs not seen in ${daysThreshold} days`,
		);

		// Calculate the threshold date
		const thresholdDate = new Date();
		thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

		// Mark jobs as inactive if they haven't been seen recently
		const { data: inactiveJobs, error: updateError } = await supabase
			.from("jobs")
			.update({
				is_active: false,
				last_seen_at: new Date().toISOString(),
			})
			.eq("is_active", true)
			.lt("last_seen_at", thresholdDate.toISOString())
			.select("id, title, company, source, last_seen_at");

		if (updateError) {
			console.error(" Job cleanup failed:", updateError);
			return NextResponse.json(
				{ error: "Failed to update jobs", details: updateError.message },
				{ status: 500 },
			);
		}

		// Get count of jobs that were marked inactive
		const { count: totalInactive } = await supabase
			.from("jobs")
			.select("*", { count: "exact", head: true })
			.eq("is_active", false);

		// Get count of active jobs
		const { count: totalActive } = await supabase
			.from("jobs")
			.select("*", { count: "exact", head: true })
			.eq("is_active", true);

		console.log(
			` Job cleanup completed: ${inactiveJobs?.length || 0} jobs marked inactive`,
		);

		return NextResponse.json({
			success: true,
			timestamp: new Date().toISOString(),
			cleanup: {
				jobsMarkedInactive: inactiveJobs?.length || 0,
				thresholdDays: daysThreshold,
				thresholdDate: thresholdDate.toISOString(),
			},
			stats: {
				totalActive: totalActive || 0,
				totalInactive: totalInactive || 0,
				totalJobs: (totalActive || 0) + (totalInactive || 0),
			},
			sampleInactiveJobs: inactiveJobs?.slice(0, 5) || [],
		});
	} catch (error: unknown) {
		console.error(" Job cleanup error:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json(
			{ error: "Internal server error", details: errorMessage },
			{ status: 500 },
		);
	}
}

export async function GET() {
	const supabase = getDatabaseClient();

	try {
		// Get job statistics
		const { count: totalActive } = await supabase
			.from("jobs")
			.select("*", { count: "exact", head: true })
			.eq("is_active", true);

		const { count: totalInactive } = await supabase
			.from("jobs")
			.select("*", { count: "exact", head: true })
			.eq("is_active", false);

		// Get jobs by source
		const { data: sourceStats } = await supabase
			.from("jobs")
			.select("source, is_active")
			.eq("is_active", true);

		const sourceBreakdown =
			sourceStats?.reduce((acc: Record<string, number>, job) => {
				acc[job.source] = (acc[job.source] || 0) + 1;
				return acc;
			}, {}) || {};

		return NextResponse.json({
			message: "Job cleanup API active",
			endpoints: {
				POST: "Mark old jobs as inactive",
				GET: "Job statistics",
			},
			stats: {
				totalActive: totalActive || 0,
				totalInactive: totalInactive || 0,
				totalJobs: (totalActive || 0) + (totalInactive || 0),
				sourceBreakdown,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error: unknown) {
		console.error(" Job cleanup stats error:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json(
			{ error: "Failed to get job statistics", details: errorMessage },
			{ status: 500 },
		);
	}
}
