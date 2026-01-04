import { type NextRequest, NextResponse } from "next/server";
import { withAxiom } from "next-axiom";
import { z } from "zod";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-types";
import { AppError, asyncHandler } from "@/lib/errors";
import { logger } from "@/lib/monitoring";
import { verifyHMAC } from "@/Utils/auth/hmac";
import { getDatabaseClient } from "@/Utils/databasePool";
import { getProductionRateLimiter } from "@/Utils/productionRateLimiter";
import { apiLogger } from "@/lib/api-logger";

// Input validation schema
const userMatchesQuerySchema = z.object({
	email: z.string().email("Invalid email address"),
	limit: z.coerce.number().min(1).max(50).default(10),
	minScore: z.coerce.number().min(0).max(100).default(0),
	// Add HMAC signature for authentication
	signature: z.string().min(1, "Authentication signature required"),
	timestamp: z.coerce.number().min(1, "Timestamp required"),
});

// HMAC verification now handled by shared utility

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

export const GET = withAxiom(
	asyncHandler(async (req: NextRequest) => {
		// PRODUCTION: Rate limiting for user matches endpoint (configurable via env vars)
		const rateLimitResult = await getProductionRateLimiter().middleware(
			req,
			"user-matches",
		);
		if (rateLimitResult) {
			return rateLimitResult;
		}

		const requestId = getRequestId(req);
		const { searchParams } = new URL(req.url);

		// Parse and validate input
		const parseResult = userMatchesQuerySchema.safeParse({
			email: searchParams.get("email"),
			limit: searchParams.get("limit"),
			minScore: searchParams.get("minScore"),
			signature: searchParams.get("signature"),
			timestamp: searchParams.get("timestamp"),
		});

		if (!parseResult.success) {
			const errorResponse = createErrorResponse(
				"Invalid input parameters",
				"VALIDATION_ERROR",
				parseResult.error.issues,
				undefined,
				requestId,
			);
			const response = NextResponse.json(errorResponse, { status: 400 });
			response.headers.set("x-request-id", requestId);
			return response;
		}

		const { email, limit, minScore, signature, timestamp } = parseResult.data;

		// Verify authentication (mandatory in prod, optional in dev/test)
		const hmacResult = verifyHMAC(
			`${email}:${timestamp}`,
			signature,
			timestamp,
			5,
		);
		if (!hmacResult.isValid) {
			const errorResponse = createErrorResponse(
				"Authentication failed",
				"UNAUTHORIZED",
				hmacResult.error,
				undefined,
				requestId,
			);
			const response = NextResponse.json(errorResponse, { status: 401 });
			response.headers.set("x-request-id", requestId);
			return response;
		}

		// CRITICAL FIX: Normalize minScore from 0-100 range to 0-1 range
		// match_score is stored in 0-1 range in database (see signup route line 405)
		const normalizedMinScore = minScore > 1 ? minScore / 100 : minScore;

		// Log user matches request
		logger.info("User matches request", {
			metadata: { email, limit, minScore, normalizedMinScore },
		});

		const supabase = getDatabaseClient();

		// CRITICAL DEBUG: First check if matches exist at all (without join)
		// SECURITY: Only select needed fields, not all fields
		const { data: rawMatches, error: rawError } = await supabase
			.from("matches")
			.select("job_hash, match_score, user_email")
			.eq("user_email", email)
			.gte("match_score", normalizedMinScore)
			.limit(limit);

		if (process.env.NODE_ENV === "development") {
			apiLogger.info(`[USER-MATCHES] 🔍 Raw matches query (no join):`, {
				email,
				normalizedMinScore,
				rawMatchesCount: rawMatches?.length || 0,
				rawError: rawError ? rawError.message : null,
			});

			if (rawMatches && rawMatches.length > 0) {
				apiLogger.info(`[USER-MATCHES] 🔍 Sample raw match:`, {
					user_email: rawMatches[0].user_email,
					job_hash: rawMatches[0].job_hash,
					match_score: rawMatches[0].match_score,
				});
			}
		}

		// Get user matches with job details - with timeout
		// CRITICAL: Use normalized minScore for comparison
		// SECURITY: Only select fields that are actually used in the UI
		const queryPromise = supabase
			.from("matches")
			.select(`
      id,
      job_hash,
      match_score,
      match_reason,
      jobs (
        id,
        title,
        company,
        location,
        job_url,
        description,
        categories,
        work_environment
      )
    `)
			.eq("user_email", email)
			.gte("match_score", normalizedMinScore)
			.order("match_score", { ascending: false })
			.limit(limit);

		// Add 10 second timeout
		const timeoutPromise = new Promise((_, reject) =>
			setTimeout(() => reject(new Error("Query timeout")), 10000),
		);

		const { data: matches, error: matchesError } = (await Promise.race([
			queryPromise,
			timeoutPromise,
		])) as any;

		if (process.env.NODE_ENV === "development") {
			apiLogger.info(`[USER-MATCHES] 🔍 Query with join result:`, {
				email,
				matchesCount: matches?.length || 0,
				matchesError: matchesError ? matchesError.message : null,
				sampleMatch:
					matches && matches.length > 0
						? {
								hasJob: !!matches[0].jobs,
								jobHash: matches[0].job_hash,
								matchScore: matches[0].match_score,
							}
						: null,
			});
		}

		if (matchesError) {
			// Error already logged via logger.error below

			// Log error to Axiom
			logger.error("Failed to fetch user matches", {
				error: matchesError,
				component: "user-matches-api",
				metadata: { email, limit, minScore, normalizedMinScore },
			});

			throw new AppError(
				"Failed to fetch matches",
				500,
				"DATABASE_ERROR",
				matchesError,
			);
		}

		// Transform the data to a cleaner format
		// CRITICAL FIX: Filter out matches with null jobs (job_hash doesn't exist in jobs table)
		// This can happen if a job was deleted or filtered out after the match was created
		// SECURITY: Only include fields that are actually used in the UI
		const transformedMatches = (matches || [])
			.filter((match: any) => {
				const hasJob = match.jobs !== null && match.jobs !== undefined;
				if (!hasJob && match.job_hash) {
					logger.warn("Match has job_hash but no job data", {
						metadata: {
							email,
							job_hash: match.job_hash,
							match_score: match.match_score,
						},
					});
				}
				return hasJob;
			})
			.map((match: any) => ({
				id: match.id,
				match_score: match.match_score,
				match_reason: match.match_reason,
				job: match.jobs,
			}));

		// Log if we filtered out any matches with null jobs
		const nullJobCount = (matches || []).length - transformedMatches.length;
		if (nullJobCount > 0) {
			logger.debug("Filtered out matches with null jobs", {
				metadata: {
					email,
					nullJobCount,
					totalMatches: (matches || []).length,
					validMatches: transformedMatches.length,
				},
			});

			// CRITICAL DEBUG: Check if job_hashes exist in jobs table
			if (rawMatches && rawMatches.length > 0) {
				const jobHashes = rawMatches
					.map((m: any) => m.job_hash)
					.filter(Boolean);
				if (jobHashes.length > 0) {
					const { data: jobsCheck, error: jobsCheckError } = await supabase
						.from("jobs")
						.select("job_hash")
						.in("job_hash", jobHashes.slice(0, 10)); // Check first 10

					if (process.env.NODE_ENV === "development") {
						apiLogger.info(`[USER-MATCHES] 🔍 Jobs existence check:`, {
							jobHashesChecked: jobHashes.slice(0, 10).length,
							jobsFound: jobsCheck?.length || 0,
							jobsCheckError: jobsCheckError ? jobsCheckError.message : null,
						});
					}
				}
			}
		}

		const successResponse = createSuccessResponse(
			{
				// SECURITY: Removed user_email from response - client already knows their email
				total_matches: transformedMatches.length,
				matches: transformedMatches,
			},
			undefined,
			requestId,
		);

		const response = NextResponse.json(successResponse, { status: 200 });
		response.headers.set("x-request-id", requestId);
		return response;
	}),
);
