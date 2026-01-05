import { NextResponse } from "next/server";
import { createSuccessResponse } from "@/lib/api-types";
import { AppError, asyncHandler } from "@/lib/errors";
import { getDatabaseClient } from "@/Utils/databasePool";

// Helper to get requestId from request
function getRequestId(): string {
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

// Cache for 1 minute (signups change frequently)
let cachedCount: number | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute

export const dynamic = "force-dynamic";
export const revalidate = 60; // 1 minute

export const GET = asyncHandler(async () => {
  const requestId = getRequestId();
  const now = Date.now();

  // Return cached count if still valid
  if (cachedCount !== null && now - lastFetch < CACHE_DURATION) {
    const successResponse = createSuccessResponse(
      {
        count: cachedCount,
        cached: true,
        cacheAge: Math.floor((now - lastFetch) / 1000), // seconds
      },
      undefined,
      requestId,
    );
    const response = NextResponse.json(successResponse, { status: 200 });
    response.headers.set("x-request-id", requestId);
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=120",
    );
    return response;
  }

  // Fetch fresh count
  const supabase = getDatabaseClient();

  const { count, error } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("active", true);

  if (error) {
    throw new AppError(
      "Failed to fetch signup count",
      500,
      "DATABASE_ERROR",
      error,
    );
  }

  cachedCount = count || 0;
  lastFetch = now;

  const successResponse = createSuccessResponse(
    {
      count: cachedCount,
      cached: false,
    },
    undefined,
    requestId,
  );

  const response = NextResponse.json(successResponse, { status: 200 });
  response.headers.set("x-request-id", requestId);
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=120",
  );
  return response;
});
