import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { verifySecureToken } from "@/Utils/auth/secureTokens";
import { getDatabaseClient } from "@/Utils/databasePool";

export const dynamic = "force-dynamic";

interface LinkHealthResult {
	healthy: boolean;
	statusCode?: number;
	redirectUrl?: string;
	reason: "healthy" | "broken" | "redirected" | "blocked" | "timeout" | "error";
}

/**
 * Check link health with proper User-Agent and 403 handling
 * Secret Sauce: Mimic real browser to avoid instant 403s from bot-blockers
 */
async function checkLinkHealth(url: string): Promise<LinkHealthResult> {
	try {
		const response = await fetch(url, {
			method: "HEAD",
			redirect: "manual", // Don't auto-follow redirects
			signal: AbortSignal.timeout(5000), // 5s timeout - never hang
			headers: {
				// Mimic real browser to avoid 403s
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

		// 404 = definitely broken
		if (response.status === 404) {
			return {
				healthy: false,
				statusCode: 404,
				reason: "broken",
			};
		}

		// 403 = security block, but not necessarily broken
		// Secret Sauce: If 403 but not 404, assume it's a bot-blocker and proceed
		if (response.status === 403) {
			return {
				healthy: true, // Assume healthy, just blocked by security
				statusCode: 403,
				reason: "blocked",
			};
		}

		// 302/301 = redirect (might be "Job Closed" page)
		if ([301, 302, 307, 308].includes(response.status)) {
			const location = response.headers.get("location") || "";

			// Check if redirect goes to "job closed" page
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

			// Otherwise, it's just a redirect (probably fine)
			return {
				healthy: true,
				statusCode: response.status,
				redirectUrl: location,
				reason: "healthy",
			};
		}

		// 200-299 = healthy
		if (response.status >= 200 && response.status < 300) {
			return {
				healthy: true,
				statusCode: response.status,
				reason: "healthy",
			};
		}

		// Unknown status = assume healthy (don't block user)
		return {
			healthy: true,
			statusCode: response.status,
			reason: "healthy",
		};
	} catch (error) {
		// Network error or timeout = assume broken
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

/**
 * Find similar matches based on job snapshot
 * Uses company, categories, and work_environment from snapshot
 */
async function findSimilarMatches(
	supabase: any,
	email: string,
	currentJobHash: string,
	snapshot: any,
	limit: number = 2,
) {
	try {
		// Build query based on snapshot data
		let query = supabase
			.from("matches")
			.select(
				`
        *,
        jobs!inner (
          id, title, company, location, job_url, job_hash, 
          categories, work_environment, is_active
        )
      `,
			)
			.eq("user_email", email)
			.neq("job_hash", currentJobHash)
			.eq("jobs.is_active", true)
			.order("match_score", { ascending: false })
			.limit(limit);

		// Filter by same company if available
		if (snapshot?.company) {
			query = query.eq("jobs.company", snapshot.company);
		}

		const { data, error } = await query;

		if (error || !data || data.length === 0) {
			// Fallback: Just get any active matches
			const { data: fallback } = await supabase
				.from("matches")
				.select(
					`
          *,
          jobs!inner (
            id, title, company, location, job_url, job_hash, 
            categories, work_environment, is_active
          )
        `,
				)
				.eq("user_email", email)
				.neq("job_hash", currentJobHash)
				.eq("jobs.is_active", true)
				.order("match_score", { ascending: false })
				.limit(limit);

			return fallback || [];
		}

		return data;
	} catch (error) {
		apiLogger.error("Failed to find similar matches", error as Error);
		return [];
	}
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ jobHash: string }> },
) {
	// Performance tracking removed - not currently used
	const { searchParams } = new URL(request.url);
	const email = searchParams.get("email");
	const token = searchParams.get("token");
	const { jobHash } = await params;

	// Validation
	if (!jobHash || !email) {
		return NextResponse.json(
			{ error: "Missing required parameters" },
			{ status: 400 },
		);
	}

	// Verify token (reuse match_evidence token logic)
	if (token) {
		const verification = verifySecureToken(email, token, "match_evidence");
		if (!verification.valid) {
			return NextResponse.json(
				{ error: verification.reason || "Invalid or expired token" },
				{ status: 401 },
			);
		}
	}

	const supabase = getDatabaseClient();

	// Fetch match with job data
	const { data: match, error: matchError } = await supabase
		.from("matches")
		.select(
			`
      *,
      jobs!inner (
        id, title, company, location, description, job_url, job_hash,
        categories, work_environment, is_active
      )
    `,
		)
		.eq("job_hash", jobHash)
		.eq("user_email", email)
		.order("matched_at", { ascending: false })
		.limit(1)
		.single();

	if (matchError || !match) {
		apiLogger.warn("Match not found for bridge route", {
			jobHash,
			email,
			error: matchError?.message,
		});
		return NextResponse.json({ error: "Match not found" }, { status: 404 });
	}

	const job = match.jobs;
	const jobUrl = job.job_url || "";

	if (!jobUrl) {
		return NextResponse.json(
			{ error: "No application URL available" },
			{ status: 400 },
		);
	}

	// CRITICAL: Save job snapshot if not already saved
	if (!match.job_snapshot && job) {
		const snapshot = {
			title: job.title,
			company: job.company,
			location: job.location,
			description: job.description
				? job.description
						.replace(/<[^>]+>/g, "")
						.substring(0, 500) // Clean HTML, max 500 chars
				: null,
			categories: job.categories,
			work_environment: job.work_environment,
			snapshot_created_at: new Date().toISOString(),
		};

		// Save snapshot (non-blocking)
		Promise.resolve(
			supabase
				.from("matches")
				.update({ job_snapshot: snapshot })
				.eq("id", match.id),
		)
			.then(() => {
				apiLogger.debug("Job snapshot saved", { jobHash, email });
			})
		.catch((error: Error) => {
			apiLogger.error("Failed to save job snapshot", error as Error);
		});
	}

	// PERFORMANCE OPTIMIZATION: Check cache first before HEAD request
	// If link was checked within last 24 hours, use cached result
	let healthResult: LinkHealthResult;
	const cacheAgeHours = match.link_checked_at
		? (Date.now() - new Date(match.link_checked_at).getTime()) /
			(1000 * 60 * 60)
		: Infinity;

	if (
		match.link_health_status &&
		match.link_health_status !== "unknown" &&
		cacheAgeHours < 24
	) {
		// Use cached result - instant redirect!
		apiLogger.debug("Using cached link health", {
			jobHash,
			status: match.link_health_status,
			cacheAgeHours: cacheAgeHours.toFixed(1),
		});

		healthResult = {
			healthy:
				match.link_health_status === "healthy" ||
				match.link_health_status === "blocked", // 403 is treated as healthy
			reason: match.link_health_status as LinkHealthResult["reason"],
		};
	} else {
		// Cache is stale or missing - do HEAD request
		apiLogger.debug("Cache miss or stale, checking link health", {
			jobHash,
			cacheAgeHours: cacheAgeHours.toFixed(1),
			status: match.link_health_status,
		});

		healthResult = await checkLinkHealth(jobUrl);

		// Update link health status in database (non-blocking)
		Promise.resolve(
			supabase
				.from("matches")
				.update({
					link_health_status: healthResult.reason,
					link_checked_at: new Date().toISOString(),
				})
				.eq("id", match.id),
		)
			.then(() => {
				apiLogger.debug("Link health status updated", {
					jobHash,
					status: healthResult.reason,
				});
			})
		.catch((error: Error) => {
			apiLogger.error("Failed to update link health", error as Error);
		});
	}

	// Track outbound click (for attribution/affiliate future)
	const clickData = {
		user_email: email,
		job_hash: jobHash,
		action: "apply_clicked",
		source: "bridge_route",
		link_health: healthResult.reason,
		timestamp: new Date().toISOString(),
	};

	// Log to match_logs for attribution tracking
	Promise.resolve(
		supabase.from("match_logs").insert({
			user_email: email,
			job_hash: jobHash,
			match_tags: clickData,
			feedback_type: "click",
			verdict: "positive",
		}),
	)
		.then(() => {
			apiLogger.debug("Outbound click tracked", { jobHash, email });
		})
	.catch((error: Error) => {
		apiLogger.error("Failed to track outbound click", error as Error);
	});

	// Handle broken/redirected links
	if (!healthResult.healthy && healthResult.reason !== "blocked") {
		// Find similar matches
		const snapshot = match.job_snapshot || {
			company: job.company,
			categories: job.categories,
			work_environment: job.work_environment,
		};

		const similarMatches = await findSimilarMatches(
			supabase,
			email,
			jobHash,
			snapshot,
			2,
		);

		// Return JSON with similar matches (frontend will render "Job Closed" UI)
		return NextResponse.json(
			{
				error: "This job is no longer available",
				reason: healthResult.reason,
				originalJob: {
					title: job.title,
					company: job.company,
					location: job.location,
				},
				similarMatches: similarMatches.map((m: any) => ({
					job_hash: m.job_hash,
					title: m.jobs?.title,
					company: m.jobs?.company,
					location: m.jobs?.location,
					job_url: m.jobs?.job_url,
					match_score: m.match_score,
					match_reason: m.match_reason,
				})),
				message: "Here are similar opportunities we found for you:",
			},
			{ status: 200 }, // 200 = success, but with error data
		);
	}

	// Link is healthy - redirect with tracking
	// Redirect to external job board
	return NextResponse.redirect(jobUrl, {
		status: 302,
		headers: {
			// Track redirect in response headers for analytics
			"X-JobPing-Redirect": "true",
			"X-JobPing-JobHash": jobHash,
			"X-JobPing-LinkHealth": healthResult.reason,
		},
	});
}
