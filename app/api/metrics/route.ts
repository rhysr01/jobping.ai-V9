import { type NextRequest, NextResponse } from "next/server";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-types";
import { asyncHandler } from "@/lib/errors";
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

const HOURS_LIMIT = 168;

function parseHours(value: string | null): number {
	if (!value) return 24;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return 24;
	return Math.min(parsed, HOURS_LIMIT);
}

export const GET = asyncHandler(async (request: NextRequest) => {
	const requestId = getRequestId(request);
	const systemKey = process.env.SYSTEM_API_KEY;
	if (!systemKey) {
		const errorResponse = createErrorResponse(
			"SYSTEM_API_KEY not configured",
			"CONFIGURATION_ERROR",
			undefined,
			undefined,
			requestId,
		);
		const response = NextResponse.json(errorResponse, { status: 500 });
		response.headers.set("x-request-id", requestId);
		return response;
	}

	const providedKey = request.headers.get("x-api-key");
	if (providedKey !== systemKey) {
		const errorResponse = createErrorResponse(
			"Unauthorized: Invalid or missing API key",
			"UNAUTHORIZED",
			undefined,
			undefined,
			requestId,
		);
		const response = NextResponse.json(errorResponse, { status: 401 });
		response.headers.set("x-request-id", requestId);
		return response;
	}

	const hours = parseHours(request.nextUrl.searchParams.get("hours"));
	const supabase = getDatabaseClient();
	const now = new Date();
	const endIso = now.toISOString();
	const startIso = new Date(
		now.getTime() - hours * 60 * 60 * 1000,
	).toISOString();

	const [usersResult, jobsResult, matchesResult, emailsResult] =
		await Promise.all([
			supabase
				.from("users")
				.select("id", { count: "exact", head: true })
				.eq("subscription_active", true),
			supabase
				.from("jobs")
				.select("job_hash", { count: "exact", head: true })
				.gte("created_at", startIso),
			supabase
				.from("matches")
				.select("id", { count: "exact", head: true })
				.gte("created_at", startIso),
			supabase
				.from("users")
				.select("email_count")
				.not("email_count", "is", null),
		]);

	if (usersResult.error) throw usersResult.error;
	if (jobsResult.error) throw jobsResult.error;
	if (matchesResult.error) throw matchesResult.error;
	if (emailsResult.error) throw emailsResult.error;

	const activeUsers = usersResult.count ?? 0;
	const jobsScraped = jobsResult.count ?? 0;
	const matchesGenerated = matchesResult.count ?? 0;
	const emailsSent = (emailsResult.data || []).reduce(
		(sum, row) => sum + (row.email_count ?? 0),
		0,
	);

	const successResponse = createSuccessResponse(
		{
			current: {
				activeUsers,
				jobsScraped,
				matchesGenerated,
				emailsSent,
				errorRate: 0,
				averageResponseTime: 0,
			},
			historical: [
				{
					timestamp: startIso,
					activeUsers,
					jobsScraped,
					matchesGenerated,
					emailsSent,
					errorRate: 0,
					averageResponseTime: 0,
				},
			],
			timeRange: {
				start: startIso,
				end: endIso,
				hours,
			},
		},
		undefined,
		requestId,
	);

	const response = NextResponse.json(successResponse, { status: 200 });
	response.headers.set("x-request-id", requestId);
	return response;
});
