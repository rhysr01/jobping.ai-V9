import { type NextRequest, NextResponse } from "next/server";
import { isRedisAvailable } from "@/lib/redis-client";
import { getDatabaseClient } from "@/Utils/databasePool";
import { apiLogger } from "@/lib/api-logger";

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

type HealthStatus = "healthy" | "degraded" | "unhealthy";

type ServiceCheck = {
	status: HealthStatus;
	message: string;
	latencyMs?: number;
	details?: Record<string, unknown>;
};

const HEALTH_SLO_MS = 100; // SLO: health checks should respond in <100ms

export async function GET(req: NextRequest) {
	const start = Date.now();
	const requestId = getRequestId(req);

	try {
		const [database, redis, openai, scraper] = await Promise.all([
			checkDatabase(),
			checkRedis(),
			checkOpenAI(),
			checkScraperHealth(),
		]);

		const environment = checkEnvironment();
		const services = { database, redis, openai, scraper };

		const duration = Date.now() - start;

		if (duration > HEALTH_SLO_MS) {
			apiLogger.warn(
				`Health check SLO violation: ${duration}ms > ${HEALTH_SLO_MS}ms target`,
			);
		}

		const overallStatus = deriveOverallStatus([
			environment.status as HealthStatus,
			...Object.values(services).map((service) => service.status),
		]);
		const ok = overallStatus === "healthy";

		// Health endpoint uses custom format for monitoring tools - keep format but add requestId
		const response = NextResponse.json(
			{
				ok,
				status: overallStatus,
				services,
				environment,
				uptimeSeconds: process.uptime(),
				responseTime: duration,
				timestamp: new Date().toISOString(),
				requestId,
				slo: {
					targetMs: HEALTH_SLO_MS,
					actualMs: duration,
					met: duration <= HEALTH_SLO_MS,
				},
			},
			{
				status: overallStatus === "unhealthy" ? 503 : 200,
			},
		);
		response.headers.set("x-request-id", requestId);
		return response;
	} catch (error) {
		apiLogger.error("Health check failed:", error as Error);
		const duration = Date.now() - start;
		const response = NextResponse.json(
			{
				ok: false,
				status: "unhealthy",
				error: "Health check failed",
				requestId,
				responseTime: duration,
				duration: duration,
				slo: {
					target: HEALTH_SLO_MS,
					actual: duration,
					met: duration <= HEALTH_SLO_MS,
				},
			},
			{ status: 503 },
		);
		response.headers.set("x-request-id", requestId);
		return response;
	}
}

async function checkDatabase(): Promise<ServiceCheck> {
	const started = Date.now();
	try {
		const supabase = getDatabaseClient();
		const { error } = await supabase.from("users").select("count").limit(1);

		if (error) {
			return {
				status: "unhealthy",
				message: "Database connection failed",
				details: { error: error.message },
			};
		}

		return {
			status: "healthy",
			message: "Database connection OK",
			latencyMs: Date.now() - started,
		};
	} catch (error) {
		return {
			status: "unhealthy",
			message:
				error instanceof Error ? error.message : "Unknown database error",
			details: { error },
		};
	}
}

function checkEnvironment(): {
	status: HealthStatus;
	message: string;
	missing: string[];
} {
	const requiredVars = [
		"NEXT_PUBLIC_SUPABASE_URL",
		"SUPABASE_SERVICE_ROLE_KEY",
		"OPENAI_API_KEY",
		"RESEND_API_KEY",
	];

	// Optional but recommended vars (will show as degraded if missing)
	const optionalVars = ["REDIS_URL", "POLAR_ACCESS_TOKEN"];

	const missing = requiredVars.filter((varName) => !process.env[varName]);
	const missingOptional = optionalVars.filter(
		(varName) => !process.env[varName],
	);

	if (missing.length > 0) {
		return {
			status: missing.length === requiredVars.length ? "unhealthy" : "degraded",
			message: `Missing required environment variables: ${missing.join(", ")}${missingOptional.length > 0 ? ` (optional: ${missingOptional.join(", ")})` : ""}`,
			missing: [...missing, ...missingOptional],
		};
	}

	if (missingOptional.length > 0) {
		return {
			status: "degraded",
			message: `All required variables present. Missing optional: ${missingOptional.join(", ")}`,
			missing: missingOptional,
		};
	}

	return {
		status: "healthy",
		message: "All required environment variables present",
		missing: [],
	};
}

async function checkRedis(): Promise<ServiceCheck> {
	if (!process.env.REDIS_URL) {
		return { status: "degraded", message: "REDIS_URL not configured" };
	}

	const started = Date.now();
	try {
		const available = await isRedisAvailable();
		return {
			status: available ? "healthy" : "degraded",
			message: available ? "Redis connection OK" : "Redis unavailable",
			latencyMs: Date.now() - started,
		};
	} catch (error) {
		return {
			status: "unhealthy",
			message:
				error instanceof Error ? error.message : "Redis connection failed",
			details: { error },
			latencyMs: Date.now() - started,
		};
	}
}

async function checkOpenAI(): Promise<ServiceCheck> {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		return { status: "degraded", message: "OPENAI_API_KEY not configured" };
	}

	const started = Date.now();
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 3000);

	try {
		const response = await fetch("https://api.openai.com/v1/models", {
			method: "GET",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			signal: controller.signal,
		});

		const latencyMs = Date.now() - started;

		if (!response.ok) {
			return {
				status: response.status >= 500 ? "unhealthy" : "degraded",
				message: `OpenAI API responded with status ${response.status}`,
				details: { statusText: response.statusText },
				latencyMs,
			};
		}

		return {
			status: "healthy",
			message: "OpenAI API reachable",
			latencyMs,
		};
	} catch (error) {
		return {
			status: "unhealthy",
			message: error instanceof Error ? error.message : "OpenAI check failed",
			details: { error },
		};
	} finally {
		clearTimeout(timeout);
	}
}

async function checkScraperHealth(): Promise<ServiceCheck> {
	const started = Date.now();
	try {
		const supabase = getDatabaseClient();

		// Check last job from each critical source
		const criticalSources = [
			"jobspy-indeed",
			"jobspy-internships",
			"adzuna",
			"reed",
		];
		const sourceStatus: Record<
			string,
			{ lastRun: string; hoursAgo: number; status: HealthStatus }
		> = {};

		let hasHealthySource = false;
		let hasStaleSource = false;
		let hasCriticalSource = false;

		for (const source of criticalSources) {
			const { data, error } = await supabase
				.from("jobs")
				.select("created_at")
				.eq("source", source)
				.order("created_at", { ascending: false })
				.limit(1);

			if (error) {
				sourceStatus[source] = {
					lastRun: "unknown",
					hoursAgo: Infinity,
					status: "unhealthy",
				};
				continue;
			}

			if (data && data.length > 0) {
				const lastJobTime = new Date(data[0].created_at);
				const hoursAgo =
					(Date.now() - lastJobTime.getTime()) / (1000 * 60 * 60);
				const daysAgo = hoursAgo / 24;

				let status: HealthStatus = "healthy";
				if (daysAgo > 7) {
					status = "unhealthy"; // Critical: source stale >7 days
					hasCriticalSource = true;
				} else if (daysAgo > 3) {
					status = "degraded"; // Warning: source stale >3 days
					hasStaleSource = true;
				} else {
					hasHealthySource = true;
				}

				sourceStatus[source] = {
					lastRun: lastJobTime.toISOString(),
					hoursAgo: Math.round(hoursAgo * 10) / 10,
					status,
				};
			} else {
				sourceStatus[source] = {
					lastRun: "never",
					hoursAgo: Infinity,
					status: "unhealthy",
				};
				hasCriticalSource = true;
			}
		}

		// Determine overall scraper health
		let overallStatus: HealthStatus = "healthy";
		let message = "All scrapers healthy";

		if (hasCriticalSource) {
			overallStatus = "unhealthy";
			message = "Critical scraper(s) stale >7 days";
		} else if (hasStaleSource) {
			overallStatus = "degraded";
			message = "Some scrapers stale >3 days";
		} else if (!hasHealthySource) {
			overallStatus = "unhealthy";
			message = "No healthy scrapers found";
		}

		return {
			status: overallStatus,
			message,
			latencyMs: Date.now() - started,
			details: {
				sources: sourceStatus,
				criticalSources: criticalSources.filter(
					(s) => sourceStatus[s]?.status === "unhealthy",
				),
				staleSources: criticalSources.filter(
					(s) => sourceStatus[s]?.status === "degraded",
				),
			},
		};
	} catch (error) {
		return {
			status: "degraded",
			message:
				error instanceof Error ? error.message : "Scraper health check failed",
			latencyMs: Date.now() - started,
			details: { error },
		};
	}
}

function deriveOverallStatus(statuses: HealthStatus[]): HealthStatus {
	if (statuses.includes("unhealthy")) {
		return "unhealthy";
	}

	if (statuses.includes("degraded")) {
		return "degraded";
	}

	return "healthy";
}
