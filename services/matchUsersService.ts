import { NextResponse } from "next/server";
import { logger } from "../lib/monitoring";
import { apiLogger } from "../lib/api-logger";
import { getDatabaseClient } from "../utils/core/database-pool";
import { withRedisLock } from "../utils/core/locks";
import { getProductionRateLimiter } from "../utils/production-rate-limiter";
import { trackPerformance } from "../app/api/match-users/handlers/helpers";
import { fetchUsersAndJobs, processUsers } from "../app/api/match-users/handlers/orchestration";
import { validateDatabaseSchema } from "../app/api/match-users/handlers/validation";
import { checkSLO } from "../app/api/match-users/handlers/response";
import { formatErrorResponse, formatSuccessResponse, formatProcessingInProgressResponse } from "../utils/api-responses";
import type { MatchResult } from "../app/api/match-users/handlers/types";
import { isHMACRequired } from "../utils/authentication/hmac";
import { verifyHMACFromParams } from "../app/api/match-users/handlers/validation";

export interface MatchUsersParams {
	userLimit: number;
	jobLimit: number;
	signature?: string;
	timestamp?: number;
	ip: string;
	requestId: string;
}

export class MatchUsersService {
	static async processMatchUsersRequest(
		params: MatchUsersParams,
	): Promise<NextResponse> {
		const { userLimit, jobLimit, signature, timestamp, ip, requestId } = params;
		const startTime = Date.now();

		logger.info("Processing match-users request", {
			endpoint: "/api/match-users",
			method: "POST",
			startTime: new Date().toISOString(),
			requestId,
		});

		try {
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
			const lap = (s: string) => apiLogger.perf(s, Date.now() - startTime);

			// Rate limiting
			if (process.env.NODE_ENV !== "test") {
				const rateLimitResult = await getProductionRateLimiter().middleware(
					{ headers: new Headers({ "x-forwarded-for": ip }) } as any,
					"match-users",
				);

				if (rateLimitResult) {
					return rateLimitResult;
				}
			}

			// Use Redis lock to prevent concurrent processing
			const lockKey = `match-users:global`;
			const result = await withRedisLock(lockKey, 30, async () => {
				if (process.env.IS_DEBUG)
					apiLogger.debug(`Processing match-users request from IP: ${ip}`, {
						ip,
					});

				const userCap = process.env.NODE_ENV === "test" ? Math.min(userLimit, 50) : userLimit;
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
				} catch (error) {
					if (error instanceof Error) {
						if (error.message === "No users found") {
							if (process.env.IS_DEBUG) apiLogger.debug("No users found");
							return NextResponse.json({ message: "No users found" });
						}
						if (error.message === "No active jobs to process") {
							apiLogger.info("No active jobs to process");
							return NextResponse.json({ message: "No active jobs to process" });
						}
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
				return formatProcessingInProgressResponse();
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
}

export const matchUsersService = MatchUsersService;