#!/usr/bin/env node

/**
 * Test JobSpy Sites Per City - Check which sites work for which cities
 *
 * Tests each site (indeed, glassdoor, google, zip_recruiter) for each city
 * to identify which sites are blocking which cities
 */

require("dotenv").config({ path: ".env.local" });
const { spawnSync } = require("node:child_process");

function pickPythonCommand() {
	if (process.env.PYTHON) {
		return process.env.PYTHON;
	}
	try {
		const { execSync } = require("node:child_process");
		execSync("python3 --version", { stdio: "ignore" });
		return "python3";
	} catch (_e) {
		return "python";
	}
}

const pythonCmd = pickPythonCommand();

const SITES = ["indeed", "glassdoor", "google", "zip_recruiter"];
const TEST_CITIES = [
	"Stockholm",
	"Copenhagen",
	"Vienna",
	"Prague",
	"Warsaw",
	"London",
	"Dublin",
];

const COUNTRY_MAP = {
	Stockholm: "sweden",
	Copenhagen: "denmark",
	Vienna: "austria",
	Prague: "czech republic",
	Warsaw: "poland",
	London: "united kingdom",
	Dublin: "ireland",
};

async function testSiteForCity(site, city) {
	const country = COUNTRY_MAP[city] || "europe";

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
      site_name=['${site}'],
      search_term='graduate',
      location='${city}',
      country_indeed='${country}',
      results_wanted=5,
      hours_old=720,
      distance=20
    )
    print(f"SUCCESS:{len(df)}")
    sys.exit(0)
except Exception as e:
    error_msg = str(e).lower()
    if '403' in error_msg or 'forbidden' in error_msg or 'gdpr' in error_msg or 'geoblocked' in error_msg:
        print(f"BLOCKED:{str(e)[:80]}")
        sys.exit(1)
    elif 'ziprecruiter' in error_msg and '403' in error_msg:
        print(f"ZIP_BLOCKED:{str(e)[:80]}")
        sys.exit(1)
    else:
        print(f"ERROR:{str(e)[:80]}")
        sys.exit(2)
`,
		],
		{
			encoding: "utf8",
			timeout: 30000,
			env: { ...process.env, PATH: process.env.PATH },
		},
	);

	const output = (py.stdout || "").trim();

	if (py.status === 0 && output.startsWith("SUCCESS:")) {
		const rows = parseInt(output.split(":")[1], 10) || 0;
		return { status: "working", rows };
	} else if (
		output.startsWith("BLOCKED:") ||
		output.startsWith("ZIP_BLOCKED:")
	) {
		return { status: "blocked", rows: 0 };
	} else {
		return { status: "error", rows: 0 };
	}
}

async function main() {
	console.log("🧪 Testing JobSpy Sites Per City\n");
	console.log("=".repeat(80));

	const results = {};

	for (const city of TEST_CITIES) {
		results[city] = {};
		console.log(`\n📍 ${city}:`);

		for (const site of SITES) {
			const result = await testSiteForCity(site, city);
			results[city][site] = result;

			const icon =
				result.status === "working"
					? "✅"
					: result.status === "blocked"
						? "🚫"
						: "⚠️";
			const status =
				result.status === "working"
					? `${result.rows} rows`
					: result.status === "blocked"
						? "BLOCKED"
						: "ERROR";

			console.log(`   ${icon} ${site.padEnd(15)}: ${status}`);

			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}

	console.log(`\n${"=".repeat(80)}`);
	console.log("\n📊 Summary by Site:");

	for (const site of SITES) {
		const working = TEST_CITIES.filter(
			(city) => results[city][site].status === "working",
		);
		const blocked = TEST_CITIES.filter(
			(city) => results[city][site].status === "blocked",
		);

		console.log(`\n${site}:`);
		console.log(
			`   ✅ Working: ${working.length}/${TEST_CITIES.length} cities`,
		);
		if (working.length > 0) {
			console.log(`      ${working.join(", ")}`);
		}
		if (blocked.length > 0) {
			console.log(
				`   🚫 Blocked: ${blocked.length}/${TEST_CITIES.length} cities`,
			);
			console.log(`      ${blocked.join(", ")}`);
		}
	}

	console.log(`\n💡 Recommendation:`);
	console.log(`   If ZipRecruiter is blocking many cities, consider:`);
	console.log(`   1. Remove 'zip_recruiter' from site_name list`);
	console.log(`   2. Or handle ZipRecruiter errors gracefully (already done)`);
	console.log(`   3. Focus on sites that work: indeed, glassdoor, google`);
}

main().catch((error) => {
	console.error("❌ Test failed:", error);
	process.exit(1);
});
