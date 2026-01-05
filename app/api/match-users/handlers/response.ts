/**
 * Response Domain - Response formatting and error handling
 */

import { NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { logger } from "@/lib/monitoring";
import { MATCH_SLO_MS } from "./config";
import type { MatchResult, PerformanceMetrics } from "./types";

/**
 * Format success response
 */
export function formatSuccessResponse(
  results: MatchResult[],
  startTime: number,
  usersProcessed: number,
): NextResponse {
  const successfulResults = results.filter((r) => r.success);
  const totalProcessingTime = Date.now() - startTime;

  logger.info("Match-users request completed", {
    metadata: {
      processed: usersProcessed,
      matched: successfulResults.length,
      failed: results.filter((r) => !r.success).length,
      duration: totalProcessingTime,
    },
  });

  return NextResponse.json({
    success: true,
    processed: usersProcessed,
    matched: successfulResults.length,
    failed: results.filter((r) => !r.success).length,
    duration: totalProcessingTime,
    slo: {
      target: MATCH_SLO_MS,
      actual: totalProcessingTime,
      met: totalProcessingTime <= MATCH_SLO_MS,
    },
  });
}

/**
 * Format error response
 */
export function formatErrorResponse(
  error: unknown,
  code: string,
  status: number = 500,
): NextResponse {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";

  return NextResponse.json(
    {
      error: errorMessage,
      code,
      details: error instanceof Error ? error.stack : error,
    },
    { status },
  );
}

/**
 * Check SLO and log warnings
 */
export function checkSLO(
  totalProcessingTime: number,
  usersProcessed: number,
  performanceMetrics: PerformanceMetrics,
): void {
  if (totalProcessingTime > MATCH_SLO_MS) {
    apiLogger.warn(`Match-users SLO violation`, {
      duration: totalProcessingTime,
      target: MATCH_SLO_MS,
      processed: usersProcessed,
    });
    logger.warn("Match-users SLO violation", {
      metadata: {
        duration: totalProcessingTime,
        target: MATCH_SLO_MS,
        processed: usersProcessed,
      },
    });
  }

  const errorRate =
    performanceMetrics.errors > 0
      ? (performanceMetrics.errors / performanceMetrics.totalRequests) * 100
      : 0;

  if (errorRate > 10) {
    apiLogger.warn(`High error rate detected`, {
      errorRate: errorRate.toFixed(2),
    });
    logger.warn(`High error rate: ${errorRate.toFixed(2)}%`);
  }
}
