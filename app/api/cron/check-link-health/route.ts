/**
 * CRON ENDPOINT: Pre-check Link Health for Top Matches
 * Runs periodically to check link health for popular matches
 * This pre-caches results so bridge route is nearly instant for most users
 */

import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "../../../../lib/api-logger";
import { getDatabaseClient } from "../../../../utils/core/database-pool";
import type { LinkHealthResult } from "../../../../lib/link-health-types";


/**
 * Check link health with proper User-Agent and 403 handling
 * Same logic as bridge route
 */
async function checkLinkHealth(url: string): Promise<LinkHealthResult> {
	try {
		const response = await fetch(url, {
			method: "HEAD",
			redirect: "manual",
			signal: AbortSignal.timeout(5000), // 5s timeout
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.9",
				"Accept-Encoding": "gzip, deflate, br",
				DNT: "1",
				Connection: "keep-alive",
				"Upgrade-Insecure-Requests": "1",
			},
		});

		if (response.status === 404) {
			return {
				healthy: false,
				statusCode: 404,
				reason: "broken",
			};
		}

		if (response.status === 403) {
			return {
				healthy: true,
				statusCode: 403,
				reason: "blocked",
			};
		}

		if ([301, 302, 307, 308].includes(response.status)) {
			const location = response.headers.get("location") || "";
			const closedIndicators = [
				"closed",
				"expired",
				"filled",
				"no-longer",
				"not-found",
			];
			const isClosedPage = closedIndicators.some(
				(indicator) =>
					location.toLowerCase().includes(indicator) ||
					url.toLowerCase().includes(indicator),
			);

			if (isClosedPage) {
				return {
					healthy: false,
					statusCode: response.status,
					redirectUrl: location,
					reason: "redirected",
				};
			}

			return {
				healthy: true,
				statusCode: response.status,
				redirectUrl: location,
				reason: "healthy",
			};
		}

		if (response.status >= 200 && response.status < 300) {
			return {
				healthy: true,
				statusCode: response.status,
				reason: "healthy",
			};
		}

		return {
			healthy: true,
			statusCode: response.status,
			reason: "healthy",
		};
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			return {
				healthy: false,
				reason: "timeout",
			};
		}

		return {
			healthy: false,
			reason: "error",
		};
	}
}

export async function POST(request: NextRequest) {
	try {
		// Authentication check
		const authHeader = request.headers.get("authorization");
		const cronSecret = process.env.CRON_SECRET;
		const systemKey = process.env.SYSTEM_API_KEY;
		const apiKey = request.headers.get("x-api-key");

		const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
		const isSystemKey = systemKey && apiKey === systemKey;

		if (!isVercelCron && !isSystemKey) {
			apiLogger.warn("Unauthorized link health check attempt", {
				hasAuthHeader: !!authHeader,
				hasApiKey: !!apiKey,
			});
			return NextResponse.json(
				{ error: "Unauthorized: Invalid or missing authentication" },
				{ status: 401 },
			);
		}

		const supabase = getDatabaseClient();
		const startTime = Date.now();

		// Get top matches that need health checks:
		// 1. High match scores (likely to be clicked)
		// 2. Recent matches (within last 7 days)
		// 3. Not checked recently (or never checked)
		// 4. Active jobs only
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
		const oneDayAgo = new Date();
		oneDayAgo.setDate(oneDayAgo.getDate() - 1);

		const { data: matchesToCheck, error: fetchError } = await supabase
			.from("matches")
			.select(
				`
        id, job_hash, link_health_status, link_checked_at,
        jobs!inner (
          job_url, is_active
        )
      `,
			)
			.eq("jobs.is_active", true)
			.gte("match_score", 75) // Only check high-quality matches
			.gte("matched_at", sevenDaysAgo.toISOString())
			.or(
				`link_checked_at.is.null,link_checked_at.lt.${oneDayAgo.toISOString()}`,
			)
			.order("match_score", { ascending: false })
			.order("matched_at", { ascending: false })
			.limit(100); // Check 100 top matches per run

		if (fetchError) {
			apiLogger.error(
				"Failed to fetch matches for health check",
				fetchError as Error,
			);
			return NextResponse.json(
				{
					error: "Failed to fetch matches",
					details: fetchError.message,
				},
				{ status: 500 },
			);
		}

		if (!matchesToCheck || matchesToCheck.length === 0) {
			apiLogger.info("No matches need link health checks");
			return NextResponse.json({
				success: true,
				checked: 0,
				duration: Date.now() - startTime,
				message: "No matches need checking",
			});
		}

		apiLogger.info(
			`Checking link health for ${matchesToCheck.length} top matches`,
		);

		let checked = 0;
		let healthy = 0;
		let broken = 0;
		let errors = 0;

		// Process in batches to avoid overwhelming external servers
		const BATCH_SIZE = 10;
		for (let i = 0; i < matchesToCheck.length; i += BATCH_SIZE) {
			const batch = matchesToCheck.slice(i, i + BATCH_SIZE);

			// Process batch in parallel
			const batchPromises = batch.map(async (match: any) => {
				const jobUrl = match.jobs?.job_url;
				if (!jobUrl) {
					return { matchId: match.id, error: "No job URL" };
				}

				try {
					const healthResult = await checkLinkHealth(jobUrl);

					// Update match with health status
					await supabase
						.from("matches")
						.update({
							link_health_status: healthResult.reason,
							link_checked_at: new Date().toISOString(),
						})
						.eq("id", match.id);

					return {
						matchId: match.id,
						jobHash: match.job_hash,
						status: healthResult.reason,
						healthy: healthResult.healthy,
					};
				} catch (error) {
					apiLogger.error("Failed to check link health", error as Error, {
						matchId: match.id,
						jobHash: match.job_hash,
					});
					return { matchId: match.id, error: "Check failed" };
				}
			});

			const batchResults = await Promise.allSettled(batchPromises);

			for (const result of batchResults) {
				if (result.status === "fulfilled") {
					checked++;
					if (result.value.error) {
						errors++;
					} else if (result.value.healthy) {
						healthy++;
					} else {
						broken++;
					}
				} else {
					errors++;
				}
			}

			// Small delay between batches to be respectful to external servers
			if (i + BATCH_SIZE < matchesToCheck.length) {
				await new Promise((resolve) => setTimeout(resolve, 1000)); // 1s delay
			}
		}

		const duration = Date.now() - startTime;

		apiLogger.info("Link health check completed", {
			checked,
			healthy,
			broken,
			errors,
			duration,
		});

		return NextResponse.json({
			success: true,
			checked,
			healthy,
			broken,
			errors,
			duration,
		});
	} catch (error) {
		apiLogger.error("Link health check cron failed", error as Error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
