/**
 * Main Route Handler - Orchestrates all matching logic
 */

import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { logger } from "@/lib/monitoring";
import { isHMACRequired } from "@/Utils/auth/hmac";
import { getDatabaseClient } from "@/Utils/databasePool";
import { withRedisLock } from "@/Utils/locks";
import { JobFetchError } from "@/Utils/matching/jobSearchService";
import { UserFetchError } from "@/Utils/matching/userBatchService";
import { getProductionRateLimiter } from "@/Utils/productionRateLimiter";
import { IS_DEBUG, IS_TEST, LOCK_KEY, USER_LIMIT } from "./config";
import { trackPerformance } from "./helpers";
import { fetchUsersAndJobs, processUsers } from "./orchestration";
import {
	checkSLO,
	formatErrorResponse,
	formatSuccessResponse,
} from "./response";
import type { MatchResult } from "./types";
import {
	matchUsersRequestSchema,
	validateDatabaseSchema,
	verifyHMACAuth,
	verifyHMACFromParams,
} from "./validation";

/**
 * Main match-users handler
 */
export async function matchUsersHandler(req: NextRequest) {
	const startTime = Date.now();
	const requestId = crypto.randomUUID();

	logger.info("API request", {
		endpoint: "/api/match-users",
		method: "POST",
		startTime: new Date().toISOString(),
		requestId,
	});

	try {
		// HMAC verification
		const HMAC_SECRET = process.env.INTERNAL_API_HMAC_SECRET;
		if (HMAC_SECRET) {
			const raw = await req.text();
			const sig = req.headers.get("x-jobping-signature");
			const timestampHeader = req.headers.get("x-jobping-timestamp");
			const timestamp = timestampHeader
				? parseInt(timestampHeader, 10)
				: Date.now();

			const hmacResult = verifyHMACAuth(raw, sig || "", timestamp);
			if (!hmacResult.isValid) {
				return NextResponse.json(
					{
						error: "Invalid signature",
						code: "INVALID_SIGNATURE",
						details: hmacResult.error,
					},
					{ status: 401 },
				);
			}

			req = new Request(req.url, {
				method: "POST",
				headers: req.headers,
				body: raw,
			}) as any;
		}

		// Parse and validate request body
		const body = await req.json();
		const parseResult = matchUsersRequestSchema.safeParse(body);

		if (!parseResult.success) {
			logger.warn("Invalid request parameters", {
				metadata: { errors: parseResult.error.issues },
			});

			return NextResponse.json(
				{
					error: "Invalid request parameters",
					details: parseResult.error.issues,
				},
				{ status: 400 },
			);
		}

		const { userLimit, jobLimit, signature, timestamp } = parseResult.data;

		// Verify HMAC from params if required
		if (isHMACRequired()) {
			const hmacResult = verifyHMACFromParams(
				userLimit,
				jobLimit,
				signature,
				timestamp,
			);
			if (!hmacResult.isValid) {
				return NextResponse.json(
					{
						error: "Authentication failed",
						details: hmacResult.error,
					},
					{ status: 401 },
				);
			}
		}

		const performanceTracker = trackPerformance();
		// Request start time tracking removed - using performanceTracker instead

		const t0 = Date.now();
		const lap = (s: string) => apiLogger.perf(s, Date.now() - t0);

		const ip =
			req.headers.get("x-forwarded-for") ||
			req.headers.get("x-real-ip") ||
			"unknown";

		// Rate limiting
		if (!IS_TEST) {
			const rateLimitResult = await getProductionRateLimiter().middleware(
				req,
				"match-users",
			);

			if (rateLimitResult) {
				return rateLimitResult;
			}
		}

		// Use Redis lock to prevent concurrent processing
		const lockKey = LOCK_KEY("global");
		const result = await withRedisLock(lockKey, 30, async () => {
			if (IS_DEBUG)
				apiLogger.debug(`Processing match-users request from IP: ${ip}`, {
					ip,
				});

			const userCap = IS_TEST ? Math.min(userLimit, USER_LIMIT) : userLimit;
			const jobCap = jobLimit;

			const supabase = getDatabaseClient();

			// Validate database schema
			const schemaValidation = await validateDatabaseSchema(supabase);
			if (!schemaValidation.valid) {
				return NextResponse.json(
					{
						error: "Database schema validation failed",
						message: "Required columns missing from jobs table",
						missingColumns: schemaValidation.missingColumns,
					},
					{ status: 500 },
				);
			}

			lap("fetch_users");

			// Fetch users and jobs
			let users, transformedUsers, jobs;
			try {
				const fetched = await fetchUsersAndJobs(supabase, userCap, jobCap);
				users = fetched.users;
				transformedUsers = fetched.transformedUsers;
				jobs = fetched.jobs;
				// Semantic availability tracked but not currently used in this handler
				// const isSemanticAvailable = fetched.isSemanticAvailable;
			} catch (error) {
				if (error instanceof UserFetchError) {
					return formatErrorResponse(error, "USER_FETCH_ERROR", 500);
				}
				if (error instanceof JobFetchError) {
					return formatErrorResponse(error, "JOB_FETCH_ERROR", 500);
				}
				if (error instanceof Error && error.message === "No users found") {
					if (IS_DEBUG) apiLogger.debug("No users found");
					return NextResponse.json({ message: "No users found" });
				}
				if (
					error instanceof Error &&
					error.message === "No active jobs to process"
				) {
					apiLogger.info("No active jobs to process");
					return NextResponse.json({ message: "No active jobs to process" });
				}
				apiLogger.error("Failed to fetch users or jobs", error as Error, {
					userCap,
					jobCap,
				});
				return formatErrorResponse(error, "FETCH_ERROR", 500);
			}

			lap("fetch_jobs");

			// Process users
			lap("process_users");
			const results: MatchResult[] = await processUsers(
				transformedUsers,
				jobs,
				supabase,
				startTime,
			);

			const totalProcessingTime = Date.now() - performanceTracker.startTime;
			const performanceMetrics = performanceTracker.getMetrics();

			// Check SLO
			checkSLO(totalProcessingTime, users.length, performanceMetrics);

			lap("done");

			return formatSuccessResponse(results, startTime, users.length);
		});

		// Handle lock acquisition failure
		if (result === null) {
			return NextResponse.json(
				{
					error: "Processing in progress",
					code: "PROCESSING_IN_PROGRESS",
				},
				{ status: 409 },
			);
		}

		return result;
	} catch (error) {
		const requestDuration = Date.now() - startTime;
		const errorInstance: Error =
			error instanceof Error ? error : new Error(String(error));
		apiLogger.error("Match-users processing error", errorInstance, {
			requestId,
			requestDuration,
		});

		logger.error("Match-users batch processing error", {
			error: errorInstance,
			component: "match-users",
			operation: "batch-processing",
			metadata: {
				endpoint: "match-users",
				requestId,
				processingTime: Date.now() - startTime,
				requestDuration: requestDuration,
			},
		});

		return formatErrorResponse(error, "INTERNAL_SERVER_ERROR", 500);
	}
}
