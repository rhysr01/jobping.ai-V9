#!/usr/bin/env node

/**
 * Diagnostic script to test scrapers and identify issues
 * Run: node scripts/test-scrapers-diagnostic.cjs
 */

require("dotenv").config({ path: ".env.local" });
const { execSync } = require("node:child_process");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
	process.env.SUPABASE_SERVICE_ROLE_KEY ||
	process.env.SUPABASE_ANON_KEY ||
	process.env.SUPABASE_KEY;

console.log("🔍 JobPing Scraper Diagnostic Tool\n");
console.log("=".repeat(50));

// Check environment
console.log("\n📋 Environment Check:");
console.log(`  ✅ Node.js: ${process.version}`);
console.log(`  ✅ Supabase URL: ${SUPABASE_URL ? "Set" : "❌ Missing"}`);
console.log(`  ✅ Supabase Key: ${SUPABASE_KEY ? "Set" : "❌ Missing"}`);

// Check Python
try {
	const pythonVersion = execSync("python3 --version", {
		encoding: "utf8",
	}).trim();
	console.log(`  ✅ Python: ${pythonVersion}`);
} catch (_e) {
	console.log(`  ❌ Python: Not found`);
}

// Check JobSpy
try {
	execSync('python3 -c "import jobspy"', { encoding: "utf8", stdio: "ignore" });
	console.log(`  ✅ JobSpy: Installed`);
} catch (_e) {
	console.log(`  ❌ JobSpy: Not installed (run: pip install python-jobspy)`);
}

// Check API Keys
console.log("\n🔑 API Keys Check:");
const apiKeys = {
	ADZUNA_APP_ID: process.env.ADZUNA_APP_ID,
	ADZUNA_APP_KEY: process.env.ADZUNA_APP_KEY,
	REED_API_KEY: process.env.REED_API_KEY,
	CAREERJET_API_KEY: process.env.CAREERJET_API_KEY,
};

Object.entries(apiKeys).forEach(([key, value]) => {
	console.log(`  ${value ? "✅" : "❌"} ${key}: ${value ? "Set" : "Missing"}`);
});

// Check script files
console.log("\n📁 Script Files Check:");
const scripts = [
	"scripts/jobspy-save.cjs",
	"scripts/jobspy-internships-only.cjs",
	"scripts/jobspy-career-path-roles.cjs",
	"scrapers/wrappers/jobspy-wrapper.cjs",
	"scrapers/careerjet.cjs",
];

const fs = require("node:fs");
scripts.forEach((script) => {
	const exists = fs.existsSync(script);
	console.log(
		`  ${exists ? "✅" : "❌"} ${script}: ${exists ? "Exists" : "Missing"}`,
	);
});

// Test database connection
async function testDatabase() {
	console.log("\n🗄️  Database Connection Test:");
	if (SUPABASE_URL && SUPABASE_KEY) {
		try {
			const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
			const { data, error } = await supabase
				.from("jobs")
				.select("id", { count: "exact", head: true })
				.limit(1);

			if (error) {
				console.log(`  ❌ Connection failed: ${error.message}`);
			} else {
				console.log(`  ✅ Database connection successful`);
			}
		} catch (e) {
			console.log(`  ❌ Connection error: ${e.message}`);
		}
	} else {
		console.log(`  ⚠️  Skipped (missing credentials)`);
	}

	// Check recent job counts
	console.log("\n📊 Recent Job Activity (Last 7 Days):");
	if (SUPABASE_URL && SUPABASE_KEY) {
		try {
			const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
			const { data, error } = await supabase
				.from("jobs")
				.select("source, created_at")
				.gte(
					"created_at",
					new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
				);

			if (!error && data) {
				const counts = {};
				data.forEach((job) => {
					counts[job.source] = (counts[job.source] || 0) + 1;
				});

				Object.entries(counts)
					.sort((a, b) => b[1] - a[1])
					.forEach(([source, count]) => {
						console.log(`  ${source}: ${count} jobs`);
					});

				if (Object.keys(counts).length === 0) {
					console.log(`  ⚠️  No jobs found in last 7 days`);
				}
			}
		} catch (e) {
			console.log(`  ❌ Error: ${e.message}`);
		}
	}
}

// Run async tests
testDatabase()
	.then(() => {
		console.log(`\n${"=".repeat(50)}`);
		console.log("\n✅ Diagnostic complete!");
		console.log("\n💡 Next steps:");
		console.log("  1. Fix any ❌ issues above");
		console.log("  2. Test scrapers individually:");
		console.log("     - node scrapers/wrappers/jobspy-wrapper.cjs");
		console.log("     - node scripts/jobspy-internships-only.cjs");
		console.log("     - node scripts/jobspy-career-path-roles.cjs");
		console.log("     - node scrapers/careerjet.cjs");
		console.log("  3. Check GitHub Actions logs for runtime errors");
	})
	.catch((err) => {
		console.error("Error:", err.message);
	});
