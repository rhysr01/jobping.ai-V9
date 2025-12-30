#!/usr/bin/env node

/**
 * Run all JobSpy scrapers locally
 * This allows you to ingest jobs while fixing GitHub Actions
 */

const { spawn } = require("node:child_process");
const _path = require("node:path");

const scrapers = [
	{ name: "JobSpy Main (Early-Career)", script: "scripts/jobspy-save.cjs" },
	{ name: "JobSpy Internships", script: "scripts/jobspy-internships-only.cjs" },
	{
		name: "JobSpy Career Path Roles",
		script: "scripts/jobspy-career-path-roles.cjs",
	},
];

async function runScraper(name, scriptPath) {
	return new Promise((resolve, reject) => {
		console.log(`\n${"=".repeat(60)}`);
		console.log(`🚀 Running: ${name}`);
		console.log(`${"=".repeat(60)}\n`);

		const proc = spawn("node", [scriptPath], {
			stdio: "inherit",
			env: { ...process.env, NODE_ENV: "production" },
			cwd: `${__dirname}/..`,
		});

		proc.on("close", (code) => {
			if (code === 0) {
				console.log(`\n✅ ${name} completed successfully\n`);
				resolve();
			} else {
				console.error(`\n❌ ${name} failed with code ${code}\n`);
				reject(new Error(`${name} failed`));
			}
		});

		proc.on("error", (error) => {
			console.error(`\n❌ Error running ${name}:`, error.message);
			reject(error);
		});
	});
}

async function main() {
	console.log("🎯 Starting JobSpy Local Ingestion");
	console.log("=====================================\n");

	for (const scraper of scrapers) {
		try {
			await runScraper(scraper.name, scraper.script);
		} catch (_error) {
			console.error(
				`⚠️  ${scraper.name} failed, continuing with next scraper...`,
			);
			// Continue with next scraper even if one fails
		}
	}

	console.log(`\n${"=".repeat(60)}`);
	console.log("🎉 All JobSpy scrapers complete!");
	console.log("=".repeat(60));
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
