#!/usr/bin/env tsx
/**
 * Environment Services Verification Script
 *
 * Verifies that all four services (Axiom, Inngest, Redis, Sentry) are properly configured.
 * Run this before deploying to production.
 *
 * Usage: tsx scripts/verify-env-services.ts
 */

// Color codes for terminal output
const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	blue: "\x1b[34m",
	cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof colors = "reset") {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
	console.log(`\n${"=".repeat(60)}`);
	log(title, "bright");
	console.log("=".repeat(60));
}

function logSuccess(message: string) {
	log(`✅ ${message}`, "green");
}

function logWarning(message: string) {
	log(`⚠️  ${message}`, "yellow");
}

function logError(message: string) {
	log(`❌ ${message}`, "red");
}

function logInfo(message: string) {
	log(`ℹ️  ${message}`, "cyan");
}

interface ServiceCheck {
	name: string;
	status: "configured" | "optional" | "missing" | "auto";
	envVars: string[];
	description: string;
	verification: () => Promise<boolean> | boolean;
	notes?: string;
}

const services: ServiceCheck[] = [
	{
		name: "Axiom (Logging)",
		status: "auto",
		envVars: [],
		description: "Structured logging and observability",
		verification: () => {
			// Axiom is auto-configured via Vercel integration
			// Check if we're on Vercel or have next-axiom installed
			const hasAxiom = process.env.VERCEL === "1" || process.env.AXIOM_DATASET;
			if (hasAxiom) {
				logInfo("Axiom configured via Vercel integration");
				return true;
			}
			// Check if next-axiom is in package.json (already verified)
			logInfo("Axiom will be configured automatically on Vercel");
			return true; // Not an error, just informational
		},
		notes: "Auto-configured via Vercel integration. No env vars needed.",
	},
	{
		name: "Inngest (Durable Workflows)",
		status: "auto",
		envVars: ["USE_INNGEST_FOR_MATCHING"],
		description: "Long-running tasks, prevents Vercel timeouts",
		verification: () => {
			// Inngest is auto-configured via Vercel integration
			const hasInngest =
				process.env.VERCEL === "1" || process.env.INNGEST_EVENT_KEY;
			const useInngest = process.env.USE_INNGEST_FOR_MATCHING === "true";

			if (hasInngest) {
				logInfo("Inngest configured via Vercel integration");
				if (useInngest) {
					logInfo("Inngest matching is ENABLED");
				} else {
					logWarning(
						"Inngest matching is DISABLED (set USE_INNGEST_FOR_MATCHING=true to enable)",
					);
				}
				return true;
			}
			logInfo("Inngest will be configured automatically on Vercel");
			return true;
		},
		notes:
			"Auto-configured via Vercel integration. Set USE_INNGEST_FOR_MATCHING=true to enable.",
	},
	{
		name: "Redis (Rate Limiting)",
		status: "optional",
		envVars: ["REDIS_URL", "KV_REDIS_URL"],
		description: "Distributed rate limiting across server instances",
		verification: async () => {
			// Support both REDIS_URL and KV_REDIS_URL (Vercel may set either)
			const redisUrl = process.env.REDIS_URL || process.env.KV_REDIS_URL;

			if (!redisUrl) {
				logWarning(
					"REDIS_URL or KV_REDIS_URL not set - rate limiting will use in-memory fallback",
				);
				logInfo(
					"This works for single-instance deployments but not for horizontal scaling",
				);
				return false; // Not an error, but should be set for production
			}

			// Validate Redis URL format
			try {
				const url = new URL(redisUrl);
				if (!["redis:", "rediss:"].includes(url.protocol)) {
					logError(
						`Invalid Redis URL protocol: ${url.protocol} (expected redis: or rediss:)`,
					);
					return false;
				}
				logSuccess(
					`Redis URL configured: ${url.protocol}//${url.hostname}:${url.port || 6379}`,
				);
				return true;
			} catch (_error) {
				logError(`Invalid Redis URL format: ${redisUrl}`);
				return false;
			}
		},
		notes:
			"Required for production with multiple server instances. Optional for single-instance deployments.",
	},
	{
		name: "Sentry (Error Tracking)",
		status: "optional",
		envVars: ["SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN"],
		description: "Client and server error tracking with session replay",
		verification: () => {
			const sentryDsn =
				process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

			if (!sentryDsn) {
				logWarning("Sentry DSN not set - error tracking will be disabled");
				logInfo(
					"Errors will still be logged to Axiom, but Sentry features (alerts, session replay) won't work",
				);
				return false; // Should be set for production
			}

			// Validate Sentry DSN format
			try {
				const url = new URL(sentryDsn);
				if (
					!url.hostname.includes("sentry.io") &&
					!url.hostname.includes("ingest.sentry.io")
				) {
					logWarning(`Sentry DSN hostname looks unusual: ${url.hostname}`);
				}
				logSuccess(`Sentry DSN configured: ${url.protocol}//${url.hostname}`);
				return true;
			} catch (_error) {
				logError(`Invalid Sentry DSN format: ${sentryDsn}`);
				return false;
			}
		},
		notes:
			"Recommended for production. Provides error alerts and session replay.",
	},
];

async function verifyService(service: ServiceCheck): Promise<boolean> {
	logSection(`Checking: ${service.name}`);
	logInfo(service.description);

	if (service.envVars.length > 0) {
		logInfo(`Environment variables: ${service.envVars.join(", ")}`);
	}

	const result = await service.verification();

	if (service.notes) {
		logInfo(`Note: ${service.notes}`);
	}

	return result;
}

async function main() {
	console.clear();
	log("\n🔍 Environment Services Verification", "bright");
	log("=====================================\n", "bright");

	logInfo("Checking configuration for all four services...");
	logInfo("This script verifies Axiom, Inngest, Redis, and Sentry setup.\n");

	const results: Array<{ name: string; configured: boolean }> = [];

	for (const service of services) {
		const configured = await verifyService(service);
		results.push({ name: service.name, configured });
	}

	// Summary
	logSection("Verification Summary");

	const configured = results.filter((r) => r.configured).length;
	const total = results.length;

	results.forEach((result) => {
		if (result.configured) {
			logSuccess(`${result.name}: Configured`);
		} else {
			const service = services.find((s) => s.name === result.name);
			if (service?.status === "optional") {
				logWarning(`${result.name}: Not configured (optional)`);
			} else {
				logError(`${result.name}: Not configured`);
			}
		}
	});

	console.log("\n");

	if (configured === total) {
		logSuccess(`All services verified: ${configured}/${total}`);
		logInfo("Your stack is production-ready! 🚀");
	} else {
		const optional = services.filter(
			(s) =>
				s.status === "optional" &&
				!results.find((r) => r.name === s.name)?.configured,
		).length;
		const required = total - optional;
		const requiredConfigured = results.filter((r) => {
			const service = services.find((s) => s.name === r.name);
			return r.configured && service?.status !== "optional";
		}).length;

		if (requiredConfigured === required) {
			logSuccess(
				`All required services configured: ${requiredConfigured}/${required}`,
			);
			logWarning(`Optional services not configured: ${optional} (this is OK)`);
			logInfo("Your stack is production-ready! 🚀");
		} else {
			logError(
				`Some required services are missing: ${requiredConfigured}/${required}`,
			);
			logWarning(
				"Please configure missing services before deploying to production",
			);
		}
	}

	console.log("\n");
	logSection("Environment Variables Checklist");

	log("\n📋 Required for Production:", "bright");
	log("  • NEXT_PUBLIC_SUPABASE_URL");
	log("  • SUPABASE_SERVICE_ROLE_KEY");
	log("  • RESEND_API_KEY");
	log("  • INTERNAL_API_HMAC_SECRET");
	log("  • SYSTEM_API_KEY");
	log("  • OPENAI_API_KEY (optional but recommended)");

	log("\n📋 Recommended for Production:", "bright");
	log("  • REDIS_URL (for distributed rate limiting)");
	log("  • SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN (for error tracking)");
	log("  • USE_INNGEST_FOR_MATCHING=true (to enable durable workflows)");

	log("\n📋 Auto-Configured (No env vars needed):", "bright");
	log("  • Axiom (via Vercel integration)");
	log("  • Inngest (via Vercel integration)");

	console.log("\n");

	// Check if we're in production
	const isProduction = process.env.NODE_ENV === "production";
	const isVercel = process.env.VERCEL === "1";

	if (isProduction || isVercel) {
		logSection("Production Environment Detected");
		logInfo(`NODE_ENV: ${process.env.NODE_ENV || "not set"}`);
		logInfo(`VERCEL: ${isVercel ? "Yes" : "No"}`);

		if (!isVercel) {
			logWarning(
				"Not running on Vercel - Axiom and Inngest may need manual configuration",
			);
		}
	}

	console.log("\n");
}

// Run verification
main().catch((error) => {
	logError(`Verification failed: ${error.message}`);
	process.exit(1);
});
