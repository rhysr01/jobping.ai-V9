// Public stats API for landing page
// Returns active job count and other public metrics

import { type NextRequest, NextResponse } from "next/server";
import { createSuccessResponse } from "@/lib/api-types";
import { AppError, asyncHandler } from "@/lib/errors";
import { apiLogger } from "@/lib/api-logger";
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
interface StatsCache {
  activeJobs: number;
  activeJobsFormatted: string;
  internships: number;
  graduates: number;
  earlyCareer: number;
  weeklyNewJobs: number;
  weeklyNewJobsFormatted: string;
  totalUsers: number;
  totalUsersFormatted: string;
  lastUpdated: string;
}

let cachedStats: StatsCache | null = null;
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

  // Get active job count (using id for count-only query)
  const { count: activeJobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  if (jobsError) {
    apiLogger.error("Error fetching job stats", jobsError, {
      endpoint: "/api/stats",
      query: "activeJobs",
    });
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
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("is_internship", true);
  if (internshipsError) {
    apiLogger.warn("Error fetching internships count", internshipsError, {
      endpoint: "/api/stats",
      query: "internships",
    });
  }

  // Get graduate program count (with error handling)
  const { count: graduates, error: graduatesError } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("is_graduate", true);
  if (graduatesError) {
    apiLogger.warn("Error fetching graduates count", graduatesError, {
      endpoint: "/api/stats",
      query: "graduates",
    });
  }

  // Get early career count (entry-level roles that aren't internships or graduate programs)
  // Use try-catch for contains query which might fail
  let earlyCareer = 0;
  try {
    const { count, error: earlyCareerError } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .contains("categories", ["early-career"])
      .eq("is_internship", false)
      .eq("is_graduate", false);
    if (earlyCareerError) {
      apiLogger.warn("Error fetching early career count", earlyCareerError, {
        endpoint: "/api/stats",
        query: "earlyCareer",
      });
    } else {
      earlyCareer = count || 0;
    }
  } catch (error) {
    apiLogger.error("Error fetching early career count", error as Error, {
      endpoint: "/api/stats",
      query: "earlyCareer",
    });
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
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .gte("created_at", oneWeekAgoISO)
      .or("is_internship.eq.true,is_graduate.eq.true");
    if (weeklyError) {
      apiLogger.warn("Error fetching weekly new jobs", weeklyError, {
        endpoint: "/api/stats",
        query: "weeklyNewJobs",
      });
    } else {
      weeklyNewJobs = count || 0;
    }
  } catch (error) {
    apiLogger.error("Error fetching weekly new jobs", error as Error, {
      endpoint: "/api/stats",
      query: "weeklyNewJobs",
    });
    weeklyNewJobs = 0;
  }

  // Get user count for social proof (with error handling)
  const { count: totalUsers, error: usersError } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("active", true);
  if (usersError) {
    apiLogger.warn("Error fetching users count", usersError, {
      endpoint: "/api/stats",
      query: "totalUsers",
    });
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
