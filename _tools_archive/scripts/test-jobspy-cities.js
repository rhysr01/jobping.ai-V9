#!/usr/bin/env node

/**
 * Test JobSpy Cities - Check which cities are geo/GDPR blocked
 *
 * Tests a small query for each city to see which ones work
 * and which are blocked by GDPR/geo restrictions
 */

require("dotenv").config({ path: ".env.local" });
const { spawnSync } = require("node:child_process");

function pickPythonCommand() {
	if (process.env.PYTHON) {
		return process.env.PYTHON;
	}
	// Try python3 first, then python
	try {
		const { execSync } = require("node:child_process");
		execSync("python3 --version", { stdio: "ignore" });
		return "python3";
	} catch (_e) {
		return "python";
	}
}

const pythonCmd = pickPythonCommand();

const CITIES = [
	// Priority cities (currently blocked)
	"Stockholm",
	"Copenhagen",
	"Vienna",
	"Prague",
	"Warsaw",
	"Belfast",
	// Other cities
	"London",
	"Manchester",
	"Birmingham",
	"Madrid",
	"Barcelona",
	"Berlin",
	"Hamburg",
	"Munich",
	"Amsterdam",
	"Brussels",
	"Paris",
	"Zurich",
	"Milan",
	"Rome",
	"Dublin",
];

const COUNTRY_MAP = {
	London: "united kingdom",
	Manchester: "united kingdom",
	Birmingham: "united kingdom",
	Belfast: "united kingdom",
	Dublin: "ireland",
	Paris: "france",
	Madrid: "spain",
	Barcelona: "spain",
	Berlin: "germany",
	Hamburg: "germany",
	Munich: "germany",
	Amsterdam: "netherlands",
	Brussels: "belgium",
	Zurich: "switzerland",
	Milan: "italy",
	Rome: "italy",
	Stockholm: "sweden",
	Copenhagen: "denmark",
	Vienna: "austria",
	Prague: "czech republic",
	Warsaw: "poland",
};

async function testCity(city) {
	const country = COUNTRY_MAP[city] || "europe";
	const testTerm = "graduate"; // Simple test term

	console.log(`\n🔍 Testing ${city}, ${country}...`);

	const py = spawnSync(
		pythonCmd,
		[
			"-c",
			`
from jobspy import scrape_jobs
import pandas as pd
import sys
try:
    df = scrape_jobs(
      site_name=['indeed'],
      search_term='${testTerm}',
      location='${city}',
      country_indeed='${country}',
      results_wanted=5,
      hours_old=720,
      distance=20
    )
    print(f"SUCCESS:{len(df)} rows")
    sys.exit(0)
except Exception as e:
    error_msg = str(e).lower()
    if '403' in error_msg or 'forbidden' in error_msg or 'gdpr' in error_msg or 'geoblocked' in error_msg:
        print(f"BLOCKED:{str(e)[:100]}")
        sys.exit(1)
    else:
        print(f"ERROR:{str(e)[:100]}")
        sys.exit(2)
`,
		],
		{
			encoding: "utf8",
			timeout: 30000, // 30 second timeout
			env: { ...process.env, PATH: process.env.PATH },
		},
	);

	const output = (py.stdout || "").trim();
	const stderr = (py.stderr || "").trim();

	if (py.status === 0 && output.startsWith("SUCCESS:")) {
		const rows = parseInt(output.split(":")[1], 10) || 0;
		return { status: "working", rows, error: null };
	} else if (py.status === 1 && output.startsWith("BLOCKED:")) {
		const error = output.split(":")[1] || stderr;
		return { status: "blocked", rows: 0, error };
	} else {
		const error = output.split(":")[1] || stderr || `Exit code: ${py.status}`;
		return { status: "error", rows: 0, error };
	}
}

async function main() {
	console.log("🧪 Testing JobSpy Cities for Geo/GDPR Restrictions\n");
	console.log("=".repeat(60));

	const results = {
		working: [],
		blocked: [],
		errors: [],
	};

	for (const city of CITIES) {
		const result = await testCity(city);

		if (result.status === "working") {
			console.log(`   ✅ ${city}: Working (${result.rows} rows found)`);
			results.working.push({ city, rows: result.rows });
		} else if (result.status === "blocked") {
			console.log(
				`   🚫 ${city}: BLOCKED (${result.error.substring(0, 50)}...)`,
			);
			results.blocked.push({ city, error: result.error });
		} else {
			console.log(`   ⚠️  ${city}: Error (${result.error.substring(0, 50)}...)`);
			results.errors.push({ city, error: result.error });
		}

		// Small delay between tests
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	console.log(`\n${"=".repeat(60)}`);
	console.log("\n📊 Summary:");
	console.log(`\n✅ Working Cities (${results.working.length}):`);
	results.working.forEach(({ city, rows }) => {
		console.log(`   - ${city} (${rows} rows)`);
	});

	console.log(`\n🚫 Blocked Cities (${results.blocked.length}):`);
	results.blocked.forEach(({ city }) => {
		console.log(`   - ${city}`);
	});

	if (results.errors.length > 0) {
		console.log(`\n⚠️  Error Cities (${results.errors.length}):`);
		results.errors.forEach(({ city, error }) => {
			console.log(`   - ${city}: ${error.substring(0, 60)}`);
		});
	}

	console.log(`\n💡 Recommendation:`);
	console.log(`   Focus on ${results.working.length} working cities:`);
	console.log(`   ${results.working.map((r) => r.city).join(", ")}`);
	console.log(`\n   Skip ${results.blocked.length} blocked cities:`);
	console.log(`   ${results.blocked.map((r) => r.city).join(", ")}`);

	// Generate config snippet
	console.log(`\n📝 Suggested City List:`);
	console.log(`   const WORKING_CITIES = [`);
	results.working.forEach(({ city }) => {
		console.log(`     '${city}',`);
	});
	console.log(`   ];`);
}

main().catch((error) => {
	console.error("❌ Test failed:", error);
	process.exit(1);
});
