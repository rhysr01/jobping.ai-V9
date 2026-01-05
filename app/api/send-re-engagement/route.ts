/**
 * RE-ENGAGEMENT EMAIL ENDPOINT
 * Sends re-engagement emails to inactive users
 */

import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/Utils/auth/withAuth";
import {
  getReEngagementStats,
  sendReEngagementEmails,
} from "@/Utils/email/reEngagementService";
import { getProductionRateLimiter } from "@/Utils/productionRateLimiter";
import { apiLogger } from "@/lib/api-logger";

async function handleSendReEngagement(req: NextRequest) {
  // Rate limiting for re-engagement emails
  let rateLimitResult: NextResponse | null = null;
  try {
    const limiter: any = getProductionRateLimiter();
    if (limiter && typeof limiter.middleware === "function") {
      rateLimitResult = await limiter.middleware(req, "send-re-engagement");
    }
  } catch {
    // In tests or degraded mode, skip rate limiting
    rateLimitResult = null;
  }
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    apiLogger.info(" Starting re-engagement email process...");

    const result = await sendReEngagementEmails();

    apiLogger.info(
      ` Re-engagement complete: ${result.emailsSent} emails sent, ${result.errors.length} errors`,
    );

    return NextResponse.json({
      success: result.success,
      message: "Re-engagement email process completed",
      emailsSent: result.emailsSent,
      errors: result.errors,
    });
  } catch (error) {
    apiLogger.error(" Re-engagement email process failed:", error as Error);
    return NextResponse.json(
      {
        error: "Re-engagement email process failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

async function handleGetReEngagementStats(_req: NextRequest) {
  try {
    const stats = await getReEngagementStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    apiLogger.error(" Failed to get re-engagement stats:", error as Error);
    return NextResponse.json(
      {
        error: "Failed to get re-engagement stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Apply auth middleware
export const POST = withAuth(handleSendReEngagement, {
  requireSystemKey: true,
  allowedMethods: ["POST"],
});

export const GET = withAuth(handleGetReEngagementStats, {
  requireSystemKey: true,
  allowedMethods: ["GET"],
});
