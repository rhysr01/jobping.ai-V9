/**
 * Pilot Smoke Test
 *
 * Lightweight end-to-end readiness check for JobPing.
 * Validates health endpoint, scraper freshness, matching throughput,
 * email delivery cadence, and queue health. Generates a markdown report.
 *
 * Usage:
 *   JOBPING_TEST_MODE=1 NODE_ENV=test npx tsx scripts/pilot-smoke.ts --base https://staging.jobping.ai
 *
 * Environment:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional overrides:
 *   PILOT_BASE_URL / NEXT_PUBLIC_URL / --base for the API base URL
 *   PILOT_REPORT_PATH to customize report file (default: PILOT_SMOKE.md)
 */

import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SmokeStatus = "PASS" | "WARN" | "FAIL";

interface SmokeResult {
	name: string;
	status: SmokeStatus;
	durationMs: number;
	message: string;
	details?: Record<string, unknown>;
	critical?: boolean;
}

interface SmokeContext {
	baseUrl: string;
	supabase?: SupabaseClient;
	reportPath: string;
}

const REPORT_FILENAME = process.env.PILOT_REPORT_PATH || "PILOT_SMOKE.md";

const color = {
	green: (text: string) => `\x1b[32m${text}\x1b[0m`,
	yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
	red: (text: string) => `\x1b[31m${text}\x1b[0m`,
	gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
	bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
	cyanBright: (text: string) => `\x1b[96m${text}\x1b[0m`,
	redBright: (text: string) => `\x1b[91m${text}\x1b[0m`,
	yellowBright: (text: string) => `\x1b[93m${text}\x1b[0m`,
	greenBright: (text: string) => `\x1b[92m${text}\x1b[0m`,
};

async function main() {
	const ctx = await buildContext();
	const results: SmokeResult[] = [];

	console.log(
		color.cyanBright(
			`\n🚀 JobPing Pilot Smoke Test\n   Base URL: ${ctx.baseUrl}\n`,
		),
	);

	const tests: Array<{
		name: string;
		critical?: boolean;
		run: (context: SmokeContext) => Promise<SmokeResult>;
	}> = [
		{ name: "System Health", critical: true, run: runHealthCheck },
		{ name: "Scraper Freshness", critical: true, run: runScraperCheck },
		{ name: "Matching Throughput", critical: true, run: runMatchingCheck },
		{ name: "Email Delivery", critical: true, run: runEmailCheck },
		{ name: "Queue Health", run: runQueueCheck },
	];

	for (const test of tests) {
		const timer = performance.now();
		try {
			const result = await test.run(ctx);
			result.durationMs = performance.now() - timer;
			result.critical = test.critical ?? false;
			results.push(result);
			logResult(result);
		} catch (error) {
			const failure: SmokeResult = {
				name: test.name,
				status: "FAIL",
				durationMs: performance.now() - timer,
				message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
				details: { stack: error instanceof Error ? error.stack : error },
				critical: test.critical ?? false,
			};
			results.push(failure);
			logResult(failure);
		}
	}

	await emitReport(results, ctx);
	summarize(results);

	const shouldFail = results.some(
		(result) => result.status === "FAIL" && (result.critical ?? false),
	);

	process.exit(shouldFail ? 1 : 0);
}

async function buildContext(): Promise<SmokeContext> {
	const baseUrlArgIndex = process.argv.indexOf("--base");
	const baseUrl =
		(baseUrlArgIndex !== -1 ? process.argv[baseUrlArgIndex + 1] : undefined) ||
		process.env.PILOT_BASE_URL ||
		process.env.NEXT_PUBLIC_URL ||
		"http://localhost:3000";

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	const context: SmokeContext = {
		baseUrl,
		reportPath: path.resolve(process.cwd(), REPORT_FILENAME),
	};

	if (supabaseUrl && supabaseKey) {
		context.supabase = createClient(supabaseUrl, supabaseKey, {
			auth: { autoRefreshToken: false, persistSession: false },
		});
	} else {
		console.warn(
			color.yellow(
				"⚠️  Supabase credentials missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY); data checks will be downgraded.",
			),
		);
	}

	return context;
}

async function runHealthCheck(ctx: SmokeContext): Promise<SmokeResult> {
	const url = new URL("/api/health", ctx.baseUrl).toString();

	try {
		const response = await fetch(url, { method: "GET" });
		const body = await response.json().catch(() => null);

		if (!response.ok) {
			return {
				name: "System Health",
				status: "FAIL",
				durationMs: 0,
				message: `Health endpoint returned ${response.status}`,
				details: { body },
			};
		}

		const requiredHeaders = [
			"strict-transport-security",
			"x-frame-options",
			"x-content-type-options",
			"referrer-policy",
			"permissions-policy",
		];

		const missingHeaders = requiredHeaders.filter(
			(header) => !response.headers.has(header),
		);
		if (missingHeaders.length > 0) {
			return {
				name: "System Health",
				status: "FAIL",
				durationMs: 0,
				message: `Security headers missing: ${missingHeaders.join(", ")}`,
				details: { headers: Object.fromEntries(response.headers.entries()) },
			};
		}

		const services = (body?.services ?? {}) as Record<
			string,
			{ status?: string }
		>;
		const failingServices = Object.entries(services)
			.filter(([, value]) => value?.status && value.status !== "healthy")
			.map(([key, value]) => ({ name: key, status: value?.status, value }));

		if (!body?.ok || body?.status === "unhealthy") {
			return {
				name: "System Health",
				status: "FAIL",
				durationMs: 0,
				message: "Health endpoint reported unhealthy status",
				details: { services, body },
			};
		}

		if (failingServices.length > 0) {
			return {
				name: "System Health",
				status: "WARN",
				durationMs: 0,
				message: `Some dependency checks degraded: ${failingServices
					.map((svc) => `${svc.name}=${svc.status}`)
					.join(", ")}`,
				details: { services, body },
			};
		}

		return {
			name: "System Health",
			status: "PASS",
			durationMs: 0,
			message: `All services healthy (latency ${body?.responseTime ?? "n/a"}ms)`,
			details: { services, body },
		};
	} catch (error) {
		return {
			name: "System Health",
			status: "FAIL",
			durationMs: 0,
			message: `Request failed: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}

async function runScraperCheck(ctx: SmokeContext): Promise<SmokeResult> {
	if (!ctx.supabase) {
		return {
			name: "Scraper Freshness",
			status: "WARN",
			durationMs: 0,
			message: "Supabase credentials missing; cannot verify scraper metrics",
		};
	}

	const supabase = ctx.supabase;
	const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

	const { count: totalJobs, error: totalError } = await supabase
		.from("jobs")
		.select("*", { count: "exact", head: true });

	if (totalError) {
		return {
			name: "Scraper Freshness",
			status: "FAIL",
			durationMs: 0,
			message: `Failed to query jobs table: ${totalError.message}`,
			details: { error: totalError },
		};
	}

	const { count: recentJobs, error: recentError } = await supabase
		.from("jobs")
		.select("*", { count: "exact", head: true })
		.gte("created_at", since);

	if (recentError) {
		return {
			name: "Scraper Freshness",
			status: "FAIL",
			durationMs: 0,
			message: `Failed to query recent jobs: ${recentError.message}`,
			details: { error: recentError },
		};
	}

	const status: SmokeStatus = recentJobs && recentJobs > 0 ? "PASS" : "WARN";

	return {
		name: "Scraper Freshness",
		status,
		durationMs: 0,
		message:
			status === "PASS"
				? `Jobs healthy (${recentJobs} new / ${totalJobs} total last 24h)`
				: "No recent jobs in last 24h — check scraper automation",
		details: { totalJobs, recentJobs, since },
	};
}

async function runMatchingCheck(ctx: SmokeContext): Promise<SmokeResult> {
	if (!ctx.supabase) {
		return {
			name: "Matching Throughput",
			status: "WARN",
			durationMs: 0,
			message: "Supabase credentials missing; cannot verify matches",
		};
	}

	const supabase = ctx.supabase;
	const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

	const { count: recentMatches, error } = await supabase
		.from("matches")
		.select("*", { count: "exact", head: true })
		.gte("matched_at", since);

	if (error) {
		return {
			name: "Matching Throughput",
			status: "FAIL",
			durationMs: 0,
			message: `Failed to query matches: ${error.message}`,
			details: { error },
		};
	}

	if (!recentMatches || recentMatches === 0) {
		return {
			name: "Matching Throughput",
			status: "WARN",
			durationMs: 0,
			message: "No matches generated in last 7 days",
			details: { recentMatches, since },
		};
	}

	return {
		name: "Matching Throughput",
		status: "PASS",
		durationMs: 0,
		message: `${recentMatches} matches generated over last 7 days`,
		details: { recentMatches, since },
	};
}

async function runEmailCheck(ctx: SmokeContext): Promise<SmokeResult> {
	if (!ctx.supabase) {
		return {
			name: "Email Delivery",
			status: "WARN",
			durationMs: 0,
			message: "Supabase credentials missing; cannot verify email ledger",
		};
	}

	const supabase = ctx.supabase;
	const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

	const { count: sentEmails, error } = await supabase
		.from("email_send_ledger")
		.select("*", { count: "exact", head: true })
		.gte("sent_at", since);

	if (error) {
		return {
			name: "Email Delivery",
			status: "FAIL",
			durationMs: 0,
			message: `Failed to query email ledger: ${error.message}`,
			details: { error },
		};
	}

	if (!sentEmails || sentEmails === 0) {
		return {
			name: "Email Delivery",
			status: "WARN",
			durationMs: 0,
			message: "No emails sent in last 7 days",
			details: { sentEmails, since },
		};
	}

	return {
		name: "Email Delivery",
		status: "PASS",
		durationMs: 0,
		message: `${sentEmails} emails sent over last 7 days`,
		details: { sentEmails, since },
	};
}

async function runQueueCheck(ctx: SmokeContext): Promise<SmokeResult> {
	if (!ctx.supabase) {
		return {
			name: "Queue Health",
			status: "WARN",
			durationMs: 0,
			message: "Supabase credentials missing; cannot inspect job queue",
		};
	}

	const supabase = ctx.supabase;
	const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

	const { data, error } = await supabase
		.from("job_queue")
		.select("status")
		.gte("created_at", since);

	if (error) {
		return {
			name: "Queue Health",
			status: "FAIL",
			durationMs: 0,
			message: `Failed to query job queue: ${error.message}`,
			details: { error },
		};
	}

	const stats = {
		pending: data?.filter((item) => item.status === "pending").length ?? 0,
		processing:
			data?.filter((item) => item.status === "processing").length ?? 0,
		failed: data?.filter((item) => item.status === "failed").length ?? 0,
		completed: data?.filter((item) => item.status === "completed").length ?? 0,
	};

	if (stats.failed > 10) {
		return {
			name: "Queue Health",
			status: "WARN",
			durationMs: 0,
			message: `${stats.failed} failed jobs detected in last 24h`,
			details: stats,
		};
	}

	return {
		name: "Queue Health",
		status: "PASS",
		durationMs: 0,
		message: `Queue healthy: ${stats.completed} completed / ${stats.failed} failed (24h)`,
		details: stats,
	};
}

function logResult(result: SmokeResult) {
	const icon =
		result.status === "PASS"
			? color.green("✔")
			: result.status === "WARN"
				? color.yellow("⚠")
				: color.red("✖");

	console.log(`${icon} ${color.bold(result.name)} — ${result.message}`);
}

async function emitReport(results: SmokeResult[], ctx: SmokeContext) {
	const lines: string[] = [];

	lines.push(`# JobPing Pilot Smoke Report`);
	lines.push("");
	lines.push(`- Generated: ${new Date().toISOString()}`);
	lines.push(`- Base URL: ${ctx.baseUrl}`);
	lines.push("");
	lines.push("| Check | Status | Message |");
	lines.push("|-------|--------|---------|");

	for (const result of results) {
		lines.push(
			`| ${result.name} | ${result.status} | ${result.message.replace(/\|/g, "\\|")} |`,
		);
	}

	lines.push("");
	lines.push("## Details");
	lines.push("");

	for (const result of results) {
		lines.push(`### ${result.name}`);
		lines.push(`- Status: ${result.status}`);
		lines.push(`- Message: ${result.message}`);
		lines.push(`- Duration: ${result.durationMs.toFixed(0)}ms`);
		if (result.details) {
			lines.push("");
			lines.push("```json");
			lines.push(JSON.stringify(result.details, null, 2));
			lines.push("```");
		}
		lines.push("");
	}

	await fs.promises.writeFile(ctx.reportPath, lines.join("\n"), "utf-8");

	console.log(
		color.gray(
			`\n📝 Report written to ${path.relative(process.cwd(), ctx.reportPath)}\n`,
		),
	);
}

function summarize(results: SmokeResult[]) {
	const passes = results.filter((result) => result.status === "PASS").length;
	const warns = results.filter((result) => result.status === "WARN").length;
	const fails = results.filter((result) => result.status === "FAIL").length;

	const summary =
		fails > 0
			? color.redBright("Pilot readiness: FAIL")
			: warns > 0
				? color.yellowBright("Pilot readiness: WARN")
				: color.greenBright("Pilot readiness: PASS");

	console.log(summary);
	console.log(
		color.gray(`Summary — Pass: ${passes} · Warn: ${warns} · Fail: ${fails}\n`),
	);
}

void main();
