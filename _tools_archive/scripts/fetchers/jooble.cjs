#!/usr/bin/env node

/**
 * Jooble API Fetcher
 * Fetches early-career jobs from Jooble API for priority European cities
 * Uses Boolean batching to collapse 19 roles into 3 main queries per city
 * Stays well under the 500-request daily limit (13 cities × 3 queries = 39 requests)
 */

const { createClient } = require("@supabase/supabase-js");
const crypto = require("node:crypto");
require("dotenv").config({ path: ".env.local" });

// 1. Config & Tiers
const TIERS = {
	PRIORITY: ["Warsaw", "Prague", "Bern", "Munich", "Vienna", "Copenhagen"],
	SECONDARY: [
		"London",
		"Dublin",
		"Berlin",
		"Paris",
		"Amsterdam",
		"Stockholm",
		"Zurich",
	],
};

// 2. Batched Queries (19 roles merged into 3 Concept Groups)
// Exclusively targets early career, graduate, and internship roles
// Includes local synonyms for DACH and Eastern Europe
const CONCEPT_QUERIES = [
	'(Software OR Developer OR Data OR Engineer) AND (Junior OR "Entry-level" OR "Entry level" OR Graduate OR "New Grad" OR "Recent Graduate" OR Intern OR Internship OR Trainee OR Praktikum OR Staż OR Stáž)',
	'(Marketing OR Sales OR "Business Dev" OR Finance) AND (Junior OR "Entry-level" OR "Entry level" OR Graduate OR "New Grad" OR "Recent Graduate" OR Intern OR Internship OR Trainee)',
	'(Product OR Design OR "Project Manager" OR Operations) AND (Junior OR "Entry-level" OR "Entry level" OR Graduate OR "New Grad" OR "Recent Graduate" OR Intern OR Internship OR Trainee)',
];

function getSupabase() {
	const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key =
		process.env.SUPABASE_SERVICE_ROLE_KEY ||
		process.env.SUPABASE_ANON_KEY ||
		process.env.SUPABASE_KEY;
	if (!url || !key) {
		throw new Error(
			"Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/ANON_KEY",
		);
	}
	return createClient(url, key, {
		auth: { persistSession: false },
		db: { schema: "public" },
	});
}

const supabase = getSupabase();

// Helper: Generate Job Hash
function generateHash(title, company, location) {
	const str = `${title}${company}${location}`.toLowerCase().replace(/\s/g, "");
	return crypto.createHash("md5").update(str).digest("hex");
}

// Helper: Check if location is USA-based
function isUSALocation(location) {
	if (!location) return false;
	const loc = location.toLowerCase();

	// USA state abbreviations
	const usaStates = [
		"tx",
		"ky",
		"in",
		"va",
		"ca",
		"md",
		"mt",
		"ne",
		"nd",
		"ny",
		"fl",
		"il",
		"pa",
		"oh",
		"ga",
		"nc",
		"mi",
		"nj",
		"az",
		"wa",
		"ma",
		"tn",
		"co",
		"sc",
		"al",
		"la",
		"mo",
		"mn",
		"ct",
		"ia",
		"ar",
		"ok",
		"ut",
		"nv",
		"ms",
		"ks",
		"nm",
		"wv",
		"nh",
		"id",
		"hi",
		"me",
		"ri",
		"de",
		"sd",
		"ak",
		"vt",
		"wy",
		"dc",
	];

	// Check for state abbreviations (e.g., ", TX", ", KY")
	if (
		usaStates.some(
			(state) =>
				loc.includes(`, ${state}`) ||
				loc.includes(`,${state}`) ||
				loc.endsWith(` ${state}`),
		)
	) {
		return true;
	}

	// Check for USA-specific patterns
	const usaPatterns = [
		"washington dc",
		"washington, dc",
		"united states",
		"usa",
		"u.s.a",
		"u.s.",
		"new york, ny",
		"los angeles, ca",
		"chicago, il",
		"houston, tx",
		"phoenix, az",
		"philadelphia, pa",
		"san antonio, tx",
		"san diego, ca",
		"dallas, tx",
		"san jose, ca",
	];

	return usaPatterns.some((pattern) => loc.includes(pattern));
}

// Helper: Normalize Jooble Data
function normalizeJooble(joobleJob, city) {
	return {
		title: joobleJob.title,
		company: joobleJob.company,
		location: joobleJob.location || city,
		description: joobleJob.snippet || "",
		job_url: joobleJob.link,
		source: "jooble",
		job_hash: generateHash(
			joobleJob.title,
			joobleJob.company,
			joobleJob.location || city,
		),
		created_at: new Date().toISOString(),
	};
}

async function fetchJoobleCity(city, query) {
	const apiKey = process.env.JOOBLE_API_KEY;
	const apiUrl = process.env.JOOBLE_API_URL || "https://jooble.org/api/";

	if (!apiKey) {
		throw new Error("Missing JOOBLE_API_KEY in environment variables");
	}

	const url = `${apiUrl}${apiKey}`;

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				keywords: query,
				location: city,
				radius: "25",
				ResultOnPage: "100", // Maximize yield
				page: "1",
				// Add country restriction to limit to Europe (if supported by API)
				// Note: Jooble API may not support this, so we filter in code as well
			}),
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();
		return (data.jobs || []).map((job) => normalizeJooble(job, city));
	} catch (err) {
		console.error(`❌ Jooble error [${city}]:`, err.message);
		return [];
	}
}

async function runJoobleIngest() {
	console.log("🚀 Starting Priority Jooble Ingestion...");
	const allCities = [...TIERS.PRIORITY, ...TIERS.SECONDARY];
	let totalSaved = 0;

	for (const city of allCities) {
		let cityJobs = [];
		console.log(`📡 Fetching: ${city}`);

		for (const query of CONCEPT_QUERIES) {
			const results = await fetchJoobleCity(city, query);
			cityJobs = [...cityJobs, ...results];
			// 1s gap to be polite to the API
			await new Promise((r) => setTimeout(r, 1000));
		}

		if (cityJobs.length > 0) {
			// Filter out jobs with missing required fields and USA locations
			const validJobs = cityJobs.filter((job) => {
				// Check required fields
				if (!job.company || !job.title) {
					return false;
				}

				// Filter out USA locations
				if (isUSALocation(job.location)) {
					return false;
				}

				return true;
			});

			// Remove duplicates by job_hash before saving
			const uniqueJobs = Array.from(
				new Map(validJobs.map((job) => [job.job_hash, job])).values(),
			);

			if (uniqueJobs.length === 0) {
				console.log(
					`⚠️  No valid jobs found for ${city} (all had missing company/title)`,
				);
				continue;
			}

			// Batch upsert to Supabase
			const BATCH_SIZE = 50;
			let savedCount = 0;

			for (let i = 0; i < uniqueJobs.length; i += BATCH_SIZE) {
				const slice = uniqueJobs.slice(i, i + BATCH_SIZE);

				try {
					const { error } = await supabase
						.from("jobs")
						.upsert(slice, { onConflict: "job_hash" });

					if (error) {
						console.error(
							`❌ Supabase error for ${city} (batch ${Math.floor(i / BATCH_SIZE) + 1}):`,
							error.message,
						);
					} else {
						savedCount += slice.length;
					}
				} catch (err) {
					console.error(
						`❌ Unexpected error saving batch for ${city}:`,
						err.message,
					);
				}
			}

			if (savedCount > 0) {
				console.log(`✅ Saved ${savedCount} jobs for ${city}`);
				totalSaved += savedCount;
			}
		} else {
			console.log(`⚠️  No jobs found for ${city}`);
		}
	}

	console.log(`🏁 Jooble Run Complete. Total jobs processed: ${totalSaved}`);
}

// Run if executed directly
if (require.main === module) {
	runJoobleIngest().catch((err) => {
		console.error("❌ Fatal error:", err);
		process.exit(1);
	});
}

module.exports = { runJoobleIngest, fetchJoobleCity };
