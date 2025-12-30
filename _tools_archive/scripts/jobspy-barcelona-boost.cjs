#!/usr/bin/env node
// BARCELONA BOOST + More Internships for Dublin/Brussels

require("dotenv").config({ path: ".env.local" });
const { spawnSync } = require("node:child_process");
const { createClient } = require("@supabase/supabase-js");

const PYTHON = "/opt/homebrew/opt/python@3.11/bin/python3.11";

function getSupabase() {
	const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) throw new Error("Missing SUPABASE env vars");
	return createClient(url, key, { auth: { persistSession: false } });
}

function _hashJob(title, company, location) {
	const normalized = `${title || ""}-${company || ""}-${location || ""}`
		.toLowerCase()
		.replace(/\s+/g, "-");
	let hash = 0;
	for (let i = 0; i < normalized.length; i++) {
		hash = (hash << 5) - hash + normalized.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash).toString(36);
}

function parseCsv(csv) {
	const lines = csv.trim().split(/\r?\n/);
	if (lines.length < 2) return [];
	const headers = lines[0].split(",").map((h) => h.trim());
	return lines.slice(1).map((line) => {
		const cols = [];
		let current = "";
		let inQuotes = false;
		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			if (char === '"') {
				inQuotes = !inQuotes;
			} else if (char === "," && !inQuotes) {
				cols.push(current.trim());
				current = "";
			} else {
				current += char;
			}
		}
		cols.push(current.trim());
		const obj = {};
		headers.forEach((h, i) => (obj[h] = (cols[i] || "").replace(/^"|"$/g, "")));
		return obj;
	});
}

async function main() {
	console.log("🎯 BARCELONA BOOST + DUBLIN/BRUSSELS INTERNSHIPS\n");

	const SEARCHES = [
		// BARCELONA - INTENSIVE (needs 500+ jobs)
		{
			city: "Barcelona",
			country: "spain",
			category: "ALL",
			terms: [
				"prácticas",
				"becario",
				"stage",
				"internship",
				"trainee",
				"graduate",
				"junior",
				"analista",
				"consultor",
				"finance",
				"marketing",
				"prácticas finance",
				"prácticas marketing",
				"prácticas tech",
				"prácticas consultoría",
				"becas",
				"programa graduados",
			],
		},

		// DUBLIN - More internships (only has 35!)
		{
			city: "Dublin",
			country: "ireland",
			category: "INTERNSHIPS",
			terms: [
				"internship",
				"intern",
				"summer intern",
				"finance intern",
				"consulting intern",
				"marketing intern",
				"tech intern",
				"operations intern",
				"data intern",
				"product intern",
				"sales intern",
			],
		},

		// BRUSSELS - More internships (only has 29!)
		{
			city: "Brussels",
			country: "belgium",
			category: "INTERNSHIPS",
			terms: [
				"stage",
				"stagiaire",
				"internship",
				"intern",
				"stage finance",
				"stage consulting",
				"stage marketing",
				"stage tech",
				"stage operations",
			],
		},
	];

	const collected = [];
	let totalSearches = 0;

	for (const search of SEARCHES) {
		console.log(
			`\n🏙️  ${search.city.toUpperCase()} - ${search.category} (${search.terms.length} searches)`,
		);

		for (const term of search.terms) {
			totalSearches++;
			console.log(`🔎 [${totalSearches}] "${term}"`);

			const py = spawnSync(
				PYTHON,
				[
					"-c",
					`
from jobspy import scrape_jobs
df = scrape_jobs(
  site_name=['indeed', 'glassdoor', 'google', 'zip_recruiter'],
  search_term='${term}',
  location='${search.city}',
  country_indeed='${search.country}',
  results_wanted=30,
  hours_old=720
)
cols=[c for c in ['title','company','location','job_url','company_description'] if c in df.columns]
print(df[cols].to_csv(index=False))
`,
				],
				{
					encoding: "utf8",
					timeout: 35000,
					env: { ...process.env, PYTHONUNBUFFERED: "1" },
				},
			);

			if (py.status === 0 && py.stdout) {
				const rows = parseCsv(py.stdout);
				console.log(`   ✅ ${rows.length}`);
				rows.forEach((r) => collected.push(r));
			} else {
				console.log(`   ❌ Failed`);
			}

			await new Promise((r) => setTimeout(r, 500));
		}
	}

	console.log(`\n📊 Total collected: ${collected.length} jobs`);

	// Save to database
	const supabase = getSupabase();
	const { processIncomingJob } = require("../scrapers/shared/processor.cjs");
	const { validateJobs } = require("../scrapers/shared/jobValidator.cjs");
	const { makeJobHash } = require("../scrapers/shared/helpers.cjs");

	// Process jobs through standardization pipe
	const processed = collected
		.map((j) => {
			const processed = processIncomingJob(
				{
					title: j.title,
					company: j.company,
					location: j.location,
					description: j.company_description || "",
					url: j.job_url,
				},
				{
					source: "jobspy-indeed",
				},
			);

			// Skip if processor rejected (e.g., job board company)
			if (!processed) return null;

			// Generate job_hash
			const job_hash = makeJobHash({
				title: processed.title,
				company: processed.company,
				location: processed.location,
			});

			return {
				...processed,
				job_hash,
			};
		})
		.filter(Boolean);

	// CRITICAL: Validate jobs before saving
	const validationResult = validateJobs(processed);
	console.log(
		`📊 Validation: ${validationResult.stats.total} total, ${validationResult.stats.valid} valid, ${validationResult.stats.invalid} invalid, ${validationResult.stats.autoFixed} auto-fixed`,
	);
	if (validationResult.stats.invalid > 0) {
		console.warn(`⚠️ Invalid jobs:`, validationResult.stats.errors);
	}

	const unique = Array.from(
		new Map(validationResult.valid.map((r) => [r.job_hash, r])).values(),
	);
	console.log(`📊 Unique jobs: ${unique.length}`);

	for (let i = 0; i < unique.length; i += 150) {
		const slice = unique.slice(i, i + 150);
		const { error } = await supabase
			.from("jobs")
			.upsert(slice, { onConflict: "job_hash" });
		if (error) console.error("Error:", error.message);
		else console.log(`✅ Saved ${slice.length} jobs`);
	}

	console.log(`\n🎉 Barcelona Boost Complete!`);
	console.log(`   Barcelona: Target 500+ jobs`);
	console.log(`   Dublin internships: Boost from 35`);
	console.log(`   Brussels internships: Boost from 29`);
	console.log(`   Total saved: ${unique.length} jobs`);
}

main().catch(console.error);
