#!/usr/bin/env node

const cron = require("node-cron");
const { spawn } = require("child_process");
const path = require("path");

// Load environment variables early (falls back gracefully if file missing)
try {
	const envPath = path.resolve(process.cwd(), ".env.local");
	require("dotenv").config({ path: envPath });
	console.log(`✅ Loaded environment variables from ${envPath}`);
} catch (error) {
	console.warn("⚠️  Could not load .env.local, relying on process env only");
}

const DEFAULT_COMMAND = "npx tsx scripts/generate_all_embeddings.ts";
const DEFAULT_SCHEDULE = "0 2 */3 * *"; // Every 3 days at 02:00 (roughly every 72h)
const DEFAULT_TIMEZONE = process.env.EMBEDDING_REFRESH_TZ || "UTC";

const refreshCommand = process.env.EMBEDDING_REFRESH_COMMAND || DEFAULT_COMMAND;
const refreshSchedule = process.env.EMBEDDING_REFRESH_CRON || DEFAULT_SCHEDULE;

let isRunning = false;

function runEmbeddingRefresh(trigger = "manual") {
	if (isRunning) {
		console.log(
			`⚠️  Embedding refresh already running, skipping triggered by ${trigger}`,
		);
		return Promise.resolve();
	}

	console.log(
		`\n🚀 Starting embedding refresh (${trigger}) at ${new Date().toISOString()}`,
	);
	console.log(`   • Command: ${refreshCommand}`);
	isRunning = true;

	return new Promise((resolve) => {
		const child = spawn(refreshCommand, {
			cwd: process.cwd(),
			env: process.env,
			shell: true,
			stdio: "inherit",
		});

		child.on("close", (code) => {
			isRunning = false;
			if (code === 0) {
				console.log(
					`✅ Embedding refresh complete at ${new Date().toISOString()}`,
				);
			} else {
				console.error(
					`❌ Embedding refresh failed with exit code ${code} at ${new Date().toISOString()}`,
				);
			}
			resolve();
		});

		child.on("error", (error) => {
			isRunning = false;
			console.error("❌ Failed to launch embedding refresh process:", error);
			resolve();
		});
	});
}

(async () => {
	if (process.argv.includes("--run-once")) {
		await runEmbeddingRefresh("run-once");
		process.exit(0);
	}

	console.log("📆 Scheduling embedding refresh job");
	console.log(`   • Cron schedule: ${refreshSchedule}`);
	console.log(`   • Timezone: ${DEFAULT_TIMEZONE}`);
	console.log(`   • Command: ${refreshCommand}`);
	console.log(
		"   • Use EMBEDDING_REFRESH_CRON / EMBEDDING_REFRESH_COMMAND env vars to customise",
	);

	// Run immediately on startup to capture any backlog
	await runEmbeddingRefresh("startup");

	cron.schedule(refreshSchedule, () => runEmbeddingRefresh("cron"), {
		timezone: DEFAULT_TIMEZONE,
	});
})();
