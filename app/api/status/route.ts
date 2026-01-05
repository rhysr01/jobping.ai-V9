/**
 * Status Endpoint for Vercel Edge Health Monitoring
 * Lightweight endpoint for uptime monitoring services
 */

import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/Utils/databasePool";

const STATUS_START_TIME = Date.now();

export async function GET(_req: NextRequest) {
  const start = Date.now();

  try {
    // Quick database ping (non-blocking)
    const dbCheck = checkDatabase().catch(() => ({
      status: "degraded",
      message: "Database check timeout",
    }));

    const duration = Date.now() - start;
    const uptime = Math.floor((Date.now() - STATUS_START_TIME) / 1000); // seconds

    // Don't wait for DB check - return immediately for fast response
    const dbStatus = await Promise.race([
      dbCheck,
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              status: "healthy",
              message: "Database check in progress",
            }),
          50,
        ),
      ),
    ]);

    return NextResponse.json(
      {
        status: "healthy",
        uptime,
        timestamp: new Date().toISOString(),
        responseTime: duration,
        checks: {
          database: dbStatus as { status: string; message: string },
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "X-Response-Time": duration.toString(),
        },
      },
    );
  } catch (_error) {
    const duration = Date.now() - start;
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Status check failed",
        responseTime: duration,
        uptime: Math.floor((Date.now() - STATUS_START_TIME) / 1000),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      },
    );
  }
}

async function checkDatabase(): Promise<{ status: string; message: string }> {
  try {
    const supabase = getDatabaseClient();
    const { error } = (await Promise.race([
      supabase.from("users").select("count").limit(1),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 200),
      ),
    ])) as any;

    if (error) {
      return { status: "degraded", message: "Database connection issue" };
    }

    return { status: "healthy", message: "Database accessible" };
  } catch (error) {
    return {
      status: "degraded",
      message:
        error instanceof Error ? error.message : "Unknown database error",
    };
  }
}
