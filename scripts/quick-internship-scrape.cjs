#!/usr/bin/env node
// Quick internship scraper - 1 search per city for speed

require("dotenv").config({ path: ".env.local" });
const { spawnSync } = require("node:child_process");
const { createClient } = require("@supabase/supabase-js");

function getSupabase() {
	const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) throw new Error("Missing SUPABASE env vars");
	return createClient(url, key, { auth: { persistSession: false } });
}

function hashJob(title, company, location) {
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
	// One internship search per city - FAST!
	const SEARCHES = [
		{ city: "London", country: "united kingdom", term: "internship" },
		{ city: "Dublin", country: "ireland", term: "internship" },
		{ city: "Madrid", country: "spain", term: "prácticas" },
		{ city: "Barcelona", country: "spain", term: "prácticas" },
		{ city: "Berlin", country: "germany", term: "praktikum" },
		{ city: "Munich", country: "germany", term: "praktikum" },
		{ city: "Hamburg", country: "germany", term: "praktikum" },
		{ city: "Paris", country: "france", term: "stage" },
		{ city: "Amsterdam", country: "netherlands", term: "stage" },
		{ city: "Brussels", country: "belgium", term: "stage" },
		{ city: "Zurich", country: "switzerland", term: "praktikum" },
		{ city: "Milan", country: "italy", term: "stage" },
		{ city: "Rome", country: "italy", term: "tirocinio" },
	];

	const pythonCmd = "/opt/homebrew/opt/python@3.11/bin/python3.11";
	const collected = [];

	console.log(`🎓 Quick Internship Scrape - ${SEARCHES.length} cities\n`);

	for (const search of SEARCHES) {
		console.log(`🔎 ${search.city}: "${search.term}"`);

		const py = spawnSync(
			pythonCmd,
			[
				"-c",
				`
from jobspy import scrape_jobs
df = scrape_jobs(
  site_name=['indeed', 'glassdoor', 'google', 'zip_recruiter'],
  search_term='${search.term}',
  location='${search.city}',
  country_indeed='${search.country}',
  results_wanted=15,
  hours_old=720
)
cols=[c for c in ['title','company','location','job_url','company_description'] if c in df.columns]
print(df[cols].to_csv(index=False))
`,
			],
			{ encoding: "utf8", timeout: 20000 },
		);

		if (py.status === 0) {
			const rows = parseCsv(py.stdout);
			console.log(`   ✅ ${rows.length} internships found`);
			rows.forEach((r) => collected.push(r));
		} else {
			console.log(`   ❌ Failed`);
		}
	}

	// Save to database
	const supabase = getSupabase();
	const nowIso = new Date().toISOString();
	const rows = collected
		.map((j) => ({
			job_hash: hashJob(j.title, j.company, j.location),
			title: (j.title || "").trim(),
			company: (j.company || "").trim(),
			location: (j.location || "").trim(),
			description: (j.company_description || "").trim(),
			job_url: (j.job_url || "").trim(),
			source: "jobspy-internships",
			categories: ["internship"],
			is_internship: true,
			is_active: true,
			created_at: nowIso,
		}))
		.filter((j) => j.title && j.company && j.job_url);

	const unique = Array.from(new Map(rows.map((r) => [r.job_hash, r])).values());

	for (let i = 0; i < unique.length; i += 150) {
		const slice = unique.slice(i, i + 150);
		const { error } = await supabase
			.from("jobs")
			.upsert(slice, { onConflict: "job_hash" });
		if (error) console.error("Error:", error.message);
		else console.log(`✅ Saved ${slice.length} internships`);
	}

	console.log(`\n🎉 Total: ${unique.length} internships saved!`);
}

main().catch(console.error);
