import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET() {
	try {
		const startTime = Date.now();

		// Check database connectivity
		const { data: dbHealth, error: dbError } = await supabase
			.from("users")
			.select("count", { count: "exact", head: true });

		const dbResponseTime = Date.now() - startTime;

		// Basic health check with enhanced metrics
		const health = {
			status: dbError ? "degraded" : "healthy",
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			version: "1.0.0",
			services: {
				database: {
					status: dbError ? "error" : "healthy",
					response_time_ms: dbResponseTime,
					user_count: dbHealth ? dbHealth : "unknown",
				},
				api: {
					status: "healthy",
					response_time_ms: Date.now() - startTime,
				},
			},
			environment: process.env.NODE_ENV,
		};

		const statusCode = dbError ? 207 : 200; // 207 = Multi-Status for partial failure

		return NextResponse.json(health, { status: statusCode });
	} catch (error) {
		return NextResponse.json(
			{
				status: "unhealthy",
				timestamp: new Date().toISOString(),
				error: "Health check failed",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 503 },
		);
	}
}

// Handle other methods
export async function POST() {
	return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
	return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
	return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
// Force Vercel redeploy
