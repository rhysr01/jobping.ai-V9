// Public stats API for landing page
// Returns active job count and other public metrics

import { type NextRequest, NextResponse } from "next/server";
import { createSuccessResponse } from "@/lib/api-types";
import { AppError, asyncHandler } from "@/lib/errors";
import { getDatabaseClient } from "@/Utils/databasePool";

// Helper to get requestId from request
function getRequestId(req: NextRequest): string {
	const headerVal = req.headers.get("x-request-id");
	if (headerVal && headerVal.length > 0) {
		return headerVal;
	}
	try {
		// eslint-disable-next-line
		const nodeCrypto = require("node:crypto");
		return nodeCrypto.randomUUID
			? nodeCrypto.randomUUID()
			: nodeCrypto.randomBytes(16).toString("hex");
	} catch {
		return Math.random().toString(36).slice(2) + Date.now().toString(36);
	}
}

// Cache stats for 1 hour
let cachedStats: any = null;
let lastFetch: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export const dynamic = "force-dynamic";
export const revalidate = 3600; // 1 hour

export const GET = asyncHandler(async (req: NextRequest) => {
	const requestId = getRequestId(req);
	const now = Date.now();

	// Return cached stats if still valid
	if (cachedStats && now - lastFetch < CACHE_DURATION) {
		const successResponse = createSuccessResponse(
			{
				...cachedStats,
				cached: true,
				cacheAge: Math.floor((now - lastFetch) / 1000 / 60), // minutes
			},
			undefined,
			requestId,
		);
		const response = NextResponse.json(successResponse, { status: 200 });
		response.headers.set("x-request-id", requestId);
		return response;
	}

	// Fetch fresh stats
	const supabase = getDatabaseClient();

	// Get active job count
	const { count: activeJobs, error: jobsError } = await supabase
		.from("jobs")
		.select("*", { count: "exact", head: true })
		.eq("is_active", true);

	if (jobsError) {
		console.error("Error fetching job stats:", jobsError);
		// Return cached stats if available, otherwise return safe defaults
		if (cachedStats) {
			return NextResponse.json(
				createSuccessResponse(
					{
						...cachedStats,
						cached: true,
						error: "Using cached data due to database error",
					},
					undefined,
					requestId,
				),
				{ status: 200 },
			);
		}
		throw new AppError(
			"Failed to fetch job stats",
			500,
			"DATABASE_ERROR",
			jobsError,
		);
	}

	// Get internship count (with error handling)
	const { count: internships, error: internshipsError } = await supabase
		.from("jobs")
		.select("*", { count: "exact", head: true })
		.eq("is_active", true)
		.eq("is_internship", true);
	if (internshipsError) {
		console.error("Error fetching internships count:", internshipsError);
	}

	// Get graduate program count (with error handling)
	const { count: graduates, error: graduatesError } = await supabase
		.from("jobs")
		.select("*", { count: "exact", head: true })
		.eq("is_active", true)
		.eq("is_graduate", true);
	if (graduatesError) {
		console.error("Error fetching graduates count:", graduatesError);
	}

	// Get early career count (entry-level roles that aren't internships or graduate programs)
	// Use try-catch for contains query which might fail
	let earlyCareer = 0;
	try {
		const { count, error: earlyCareerError } = await supabase
			.from("jobs")
			.select("*", { count: "exact", head: true })
			.eq("is_active", true)
			.contains("categories", ["early-career"])
			.eq("is_internship", false)
			.eq("is_graduate", false);
		if (earlyCareerError) {
			console.error("Error fetching early career count:", earlyCareerError);
		} else {
			earlyCareer = count || 0;
		}
	} catch (error) {
		console.error("Error fetching early career count:", error);
		earlyCareer = 0;
	}

	// Get weekly new jobs (jobs created in last 7 days, early-career only)
	const oneWeekAgo = new Date();
	oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
	const oneWeekAgoISO = oneWeekAgo.toISOString();

	// Count early-career jobs created in last week
	// This includes internships, graduate programs, and early-career categorized jobs
	let weeklyNewJobs = 0;
	try {
		const { count, error: weeklyError } = await supabase
			.from("jobs")
			.select("*", { count: "exact", head: true })
			.eq("is_active", true)
			.gte("created_at", oneWeekAgoISO)
			.or("is_internship.eq.true,is_graduate.eq.true");
		if (weeklyError) {
			console.error("Error fetching weekly new jobs:", weeklyError);
		} else {
			weeklyNewJobs = count || 0;
		}
	} catch (error) {
		console.error("Error fetching weekly new jobs:", error);
		weeklyNewJobs = 0;
	}

	// Get user count for social proof (with error handling)
	const { count: totalUsers, error: usersError } = await supabase
		.from("users")
		.select("*", { count: "exact", head: true })
		.eq("active", true);
	if (usersError) {
		console.error("Error fetching users count:", usersError);
	}

	// Format numbers with commas
	const formatNumber = (num: number) => {
		return num.toLocaleString("en-US");
	};

	cachedStats = {
		activeJobs: activeJobs || 0,
		activeJobsFormatted: formatNumber(activeJobs || 0),
		internships: internships || 0,
		graduates: graduates || 0,
		earlyCareer: earlyCareer || 0,
		weeklyNewJobs: weeklyNewJobs || 0,
		weeklyNewJobsFormatted: formatNumber(weeklyNewJobs || 0),
		totalUsers: totalUsers || 0,
		totalUsersFormatted: formatNumber(totalUsers || 0),
		lastUpdated: new Date().toISOString(),
	};

	lastFetch = now;

	const successResponse = createSuccessResponse(
		{
			...cachedStats,
			cached: false,
		},
		undefined,
		requestId,
	);

	const response = NextResponse.json(successResponse, { status: 200 });
	response.headers.set("x-request-id", requestId);
	return response;
});
