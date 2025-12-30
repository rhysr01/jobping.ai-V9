"use strict";
// Reed.co.uk Scraper (API v1.0) - UK and Ireland early-career focus
require("dotenv").config({ path: ".env.local" });
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const {
	classifyEarlyCareer,
	makeJobHash,
	CAREER_PATH_KEYWORDS,
} = require("./shared/helpers.cjs");
const { recordScraperRun } = require("./shared/telemetry.cjs");
const { processIncomingJob } = require("./shared/processor.cjs");

// Parse location to extract city and country
function parseLocation(location) {
	if (!location) return { city: "", country: "", isRemote: false };
	const loc = location.toLowerCase().trim();

	// Check for remote indicators
	const isRemote = /remote|work\s+from\s+home|wfh|anywhere/i.test(loc);
	if (isRemote) return { city: "", country: "", isRemote: true };

	// Known UK/Ireland cities (Reed is UK/Ireland only)
	const ukIrelandCities = new Set([
		"london",
		"manchester",
		"birmingham",
		"belfast",
		"dublin",
		"edinburgh",
		"glasgow",
		"leeds",
		"liverpool",
		"cork",
		"galway",
	]);

	// Extract city and country using comma separation
	const parts = loc
		.split(",")
		.map((p) => p.trim())
		.filter(Boolean);
	let city = parts.length > 0 ? parts[0] : loc;
	let country = parts.length > 1 ? parts[parts.length - 1] : "";

	// Clean up city name - remove common suffixes like "ENG", "GB", "IE", etc.
	city = city.replace(
		/\s+(eng|gb|ie|uk|northern\s+ireland|republic\s+of\s+ireland)$/i,
		"",
	);

	// Normalize country codes
	if (country) {
		const countryMap = {
			"united kingdom": "United Kingdom",
			uk: "United Kingdom",
			gb: "United Kingdom",
			"great britain": "United Kingdom",
			england: "United Kingdom",
			scotland: "United Kingdom",
			wales: "United Kingdom",
			"northern ireland": "United Kingdom",
			ireland: "Ireland",
			ie: "Ireland",
			"republic of ireland": "Ireland",
		};
		const normalizedCountry = country.toLowerCase();
		country = countryMap[normalizedCountry] || country;
	}

	// If single part and it's a known city, infer country
	if (parts.length === 1 && ukIrelandCities.has(city)) {
		// Infer country from city
		if (["dublin", "cork", "galway"].includes(city)) {
			country = "Ireland";
		} else {
			country = "United Kingdom";
		}
	}

	// Capitalize city name properly
	city = city
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");

	return { city, country, isRemote: false };
}

// Use centralized processor for standardization
function convertToDatabaseFormat(job) {
	// Process through standardization pipe
	const processed = processIncomingJob(job, {
		source: "reed",
	});

	// Add job_hash (needs to be calculated after processing)
	const job_hash = makeJobHash({
		title: processed.title,
		company: processed.company,
		location: processed.location,
	});

	return {
		...processed,
		job_hash,
	};
}

const REED_API = "https://www.reed.co.uk/api/1.0/search";

// Reed.co.uk supports UK and Ireland
// UK cities: London, Manchester, Birmingham, Belfast (Belfast is in Northern Ireland, part of UK)
// Ireland cities: Dublin (Republic of Ireland, NOT part of UK)
const UK_CITIES = ["London", "Manchester", "Birmingham", "Belfast"];
const IRELAND_CITIES = ["Dublin"];
const SUPPORTED_CITIES = [...UK_CITIES, ...IRELAND_CITIES];
const DEFAULT_LOCATIONS = [
	"London",
	"Manchester",
	"Birmingham",
	"Belfast",
	"Dublin",
];

function parseTargetCities() {
	const raw = process.env.TARGET_CITIES;
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) {
			return parsed
				.map((city) => (typeof city === "string" ? city.trim() : ""))
				.filter(Boolean);
		}
		return [];
	} catch (error) {
		console.warn("⚠️  Reed TARGET_CITIES parse failed:", error.message);
		return [];
	}
}

// Filter TARGET_CITIES to only Reed-supported cities (UK + Ireland)
function filterReedSupportedCities(cities) {
	return cities.filter((city) => SUPPORTED_CITIES.includes(city));
}

const TARGET_CITIES = parseTargetCities();
const REED_SUPPORTED_CITIES = TARGET_CITIES.length
	? filterReedSupportedCities(TARGET_CITIES)
	: [];
const LOCATIONS = REED_SUPPORTED_CITIES.length
	? REED_SUPPORTED_CITIES
	: DEFAULT_LOCATIONS;

if (
	TARGET_CITIES.length &&
	REED_SUPPORTED_CITIES.length < TARGET_CITIES.length
) {
	const filtered = TARGET_CITIES.filter((c) => !SUPPORTED_CITIES.includes(c));
	console.log(
		`⚠️  Reed: Filtered out ${filtered.length} unsupported cities: ${filtered.join(", ")}`,
	);
	const ukCities = REED_SUPPORTED_CITIES.filter((c) => UK_CITIES.includes(c));
	const irelandCities = REED_SUPPORTED_CITIES.filter((c) =>
		IRELAND_CITIES.includes(c),
	);
	if (ukCities.length)
		console.log(`🇬🇧 Reed: UK cities: ${ukCities.join(", ")}`);
	if (irelandCities.length)
		console.log(`🇮🇪 Reed: Ireland cities: ${irelandCities.join(", ")}`);
}

if (TARGET_CITIES.length) {
	console.log(
		"🎯 Reed target cities from signup data:",
		TARGET_CITIES.join(", "),
	);
}

const RESULTS_PER_PAGE = parseInt(
	process.env.REED_RESULTS_PER_PAGE || "50",
	10,
);
const PAGE_DELAY_MS = parseInt(process.env.REED_PAGE_DELAY_MS || "400", 10);
const PAGE_DELAY_JITTER_MS = parseInt(
	process.env.REED_PAGE_DELAY_JITTER_MS || "0",
	10,
);
const BACKOFF_DELAY_MS = parseInt(
	process.env.REED_BACKOFF_DELAY_MS || "6000",
	10,
);
// Import role definitions from signup form FIRST
const {
	getAllRoles,
	getEarlyCareerRoles,
	getTopRolesByCareerPath,
	cleanRoleForSearch,
} = require("./shared/roles.cjs");

/**
 * Query rotation system - 3 sets that rotate every 8 hours
 * EXPANDED to cover all role types: coordinator, assistant, representative, engineer, specialist, manager, designer, HR, legal, sustainability
 * ALL QUERIES ARE EARLY-CAREER FOCUSED
 */
const QUERY_SETS = {
	SET_A: [
		// Focus: Internships, graduate programs, and coordinator roles
		"graduate programme",
		"graduate scheme",
		"internship",
		"intern",
		"graduate trainee",
		"management trainee",
		"trainee program",
		"marketing coordinator",
		"operations coordinator",
		"product coordinator",
		"hr coordinator",
		"project coordinator",
		"sales coordinator",
	],
	SET_B: [
		// Focus: Analyst, associate, assistant, and representative roles
		"business analyst",
		"financial analyst",
		"data analyst",
		"operations analyst",
		"junior analyst",
		"associate consultant",
		"graduate analyst",
		"marketing assistant",
		"brand assistant",
		"product assistant",
		"sales development representative",
		"sdr",
		"bdr",
		"junior account executive",
		"customer success associate",
		"hr assistant",
	],
	SET_C: [
		// Focus: Entry-level, junior, engineer, specialist, manager, designer, and program roles
		"entry level",
		"junior",
		"graduate",
		"recent graduate",
		"early careers program",
		"rotational graduate program",
		"software engineer intern",
		"data engineer intern",
		"cloud engineer intern",
		"associate product manager",
		"apm",
		"product analyst",
		"junior fulfilment specialist",
		"entry level technical specialist",
		"graduate hr specialist",
		"ux intern",
		"junior product designer",
		"design intern",
		"esg intern",
		"sustainability analyst",
		"climate analyst",
	],
};

/**
 * Determine which query set to use based on time of day
 * Rotates every 8 hours: SET_A (0-7h), SET_B (8-15h), SET_C (16-23h)
 */
function getCurrentQuerySet() {
	const manualSet = process.env.REED_QUERY_SET;
	if (manualSet && QUERY_SETS[manualSet]) {
		return manualSet;
	}

	const hour = new Date().getHours();
	if (hour >= 0 && hour < 8) return "SET_A";
	if (hour >= 8 && hour < 16) return "SET_B";
	return "SET_C";
}

/**
 * Generate comprehensive query list covering ALL roles from signup form
 * NOW WITH QUERY ROTATION for variety across runs
 * Since Reed has no API limit, we can be generous with queries
 * ALL QUERIES ARE EARLY-CAREER FOCUSED
 */
function generateReedQueries() {
	const currentSet = getCurrentQuerySet();
	const baseQueries = QUERY_SETS[currentSet];
	console.log(
		`🔄 Reed using query set: ${currentSet} (${baseQueries.length} base terms)`,
	);

	const queries = [];

	// Add base rotation queries (early-career focused)
	queries.push(...baseQueries);

	// 🥇 TIER 1: Exact role names from signup form (ROTATED SUBSET)
	// Rotate which roles we prioritize based on query set
	const allRoles = getAllRoles(); // All roles across all career paths
	const earlyCareerRoles = getEarlyCareerRoles(); // Roles with intern/graduate/junior keywords
	const topRolesByPath = getTopRolesByCareerPath(5); // Top 5 roles per career path

	// Rotate role subsets for variety
	const roleSubset =
		currentSet === "SET_A"
			? [
					...earlyCareerRoles.slice(0, 15), // First 15 early-career roles
					...allRoles.slice(0, 20), // First 20 all roles
				]
			: currentSet === "SET_B"
				? [
						...earlyCareerRoles.slice(15, 30), // Next 15 early-career roles
						...allRoles.slice(20, 40), // Next 20 all roles
					]
				: [
						...earlyCareerRoles.slice(30), // Remaining early-career roles
						...allRoles.slice(40), // Remaining all roles
						...Object.values(topRolesByPath).flat(), // Top roles per career path
					];

	// Clean role names and get primary version (without parentheses)
	const cleanedRoles = roleSubset.map((role) => {
		const cleaned = cleanRoleForSearch(role);
		return cleaned[0]; // Use primary cleaned version
	});

	// Remove duplicates and add unique role names
	const uniqueRoleTerms = [...new Set(cleanedRoles)];
	queries.push(...uniqueRoleTerms);

	// 🥈 TIER 2: Generic early-career terms (rotated)
	const GENERIC_EARLY_TERMS =
		currentSet === "SET_A"
			? [
					"graduate",
					"graduate programme",
					"graduate scheme",
					"entry level",
					"junior",
				]
			: currentSet === "SET_B"
				? [
						"trainee",
						"intern",
						"internship",
						"graduate trainee",
						"management trainee",
					]
				: [
						"graduate trainee",
						"trainee program",
						"entry level program",
						"campus hire",
						"new grad",
					];

	queries.push(...GENERIC_EARLY_TERMS);

	// Remove duplicates and return
	return [...new Set(queries)];
}

const EARLY_TERMS = generateReedQueries();

// Free tier: 1,000 requests/day, 2 runs/day = 500 per run
// Reed supports only UK/Ireland (5 cities), so: 5 cities × queries × pages ≤ 500
// Target: 10 queries × 10 pages = 500 requests (perfect!)
const MAX_QUERIES_PER_LOCATION = parseInt(
	process.env.REED_MAX_QUERIES_PER_LOCATION || "10",
	10,
);
const INCLUDE_REMOTE =
	String(process.env.INCLUDE_REMOTE || "").toLowerCase() === "true";
const scriptStart = Date.now();
let scrapeErrors = 0;

const queriesToUse =
	MAX_QUERIES_PER_LOCATION > 0
		? EARLY_TERMS.slice(0, MAX_QUERIES_PER_LOCATION)
		: EARLY_TERMS;
const estimatedRequests = LOCATIONS.length * queriesToUse.length * 10; // 10 pages avg
console.log(
	`📋 Reed query strategy: Using ${queriesToUse.length} queries per location (from ${EARLY_TERMS.length} total)`,
);
console.log(
	`📊 API Usage: ~${LOCATIONS.length} cities × ${queriesToUse.length} queries × 10 pages = ~${estimatedRequests} calls per run`,
);
console.log(
	`⚠️  Free Tier Limit: 1,000 requests/day (2 runs/day = 500 per run). Current: ~${estimatedRequests} (${estimatedRequests <= 500 ? "✅ SAFE" : "❌ EXCEEDS LIMIT"})`,
);

function parseTargetCareerPaths() {
	const raw = process.env.TARGET_CAREER_PATHS;
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) {
			return parsed
				.map((value) => (typeof value === "string" ? value.trim() : ""))
				.filter(Boolean);
		}
		return [];
	} catch (error) {
		console.warn("⚠️  Reed TARGET_CAREER_PATHS parse failed:", error.message);
		return [];
	}
}

const TARGET_CAREER_PATHS = parseTargetCareerPaths();
if (TARGET_CAREER_PATHS.length) {
	console.log("🎯 Reed target career paths:", TARGET_CAREER_PATHS.join(", "));
}

/**
 * Determine max pages based on query type (smart pagination)
 * Role-based queries get more pages (more targeted, better results)
 * Generic queries get fewer pages (broader, less targeted)
 * Since Reed has no API limit, we can be generous
 */
function getMaxPagesForQuery(query) {
	// Role-based queries (exact role names) - use more pages
	const roleBasedPattern =
		/(analyst|consultant|intern|associate|manager|engineer|specialist|coordinator|representative|executive|trainee|assistant)/i;
	const isRoleBased = roleBasedPattern.test(query) && query.length > 8; // Longer queries are usually role names

	// Generic queries (internship, graduate, junior) - use fewer pages
	const genericPattern =
		/^(internship|graduate|junior|entry level|trainee|intern)$/i;
	const isGeneric = genericPattern.test(query.trim());

	// Reed supports only UK/Ireland (5 cities), so we have more headroom
	// Free tier: 1,000 requests/day, 2 runs/day = 500 per run
	// 5 cities × queries × pages ≤ 500
	// Target: 10 queries × 10 pages = 500 requests (perfect!)
	if (isRoleBased) {
		return parseInt(process.env.REED_MAX_PAGES_ROLE || "10", 10); // 10 pages for roles (free tier safe)
	} else if (isGeneric) {
		return parseInt(process.env.REED_MAX_PAGES_GENERIC || "8", 10); // 8 pages for generic (free tier safe)
	}
	return parseInt(process.env.REED_MAX_PAGES || "10", 10); // Default: 10 pages (free tier safe)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildAuthHeader() {
	const key = process.env.REED_API_KEY || "";
	const token = Buffer.from(`${key}:`).toString("base64");
	return `Basic ${token}`;
}

async function fetchReedPage(params) {
	console.log(`   ↪ fetching page:`, {
		kw: params.keywords,
		loc: params.locationName,
		skip: params.resultsToSkip,
	});
	const headers = {
		Authorization: buildAuthHeader(),
		Accept: "application/json",
		"User-Agent":
			"JobPingBot/1.0 (+https://getjobping.com/bot; contact: support@getjobping.com)",
	};
	const resp = await axios.get(REED_API, { params, headers, timeout: 20000 });
	const len = Array.isArray(resp.data?.results) ? resp.data.results.length : 0;
	console.log(`   ← got ${len} results`);
	return resp.data;
}

function toIngestJob(reedJob) {
	return {
		title: reedJob.jobTitle || "",
		company: reedJob.employerName || "",
		location: reedJob.locationName || "",
		description: reedJob.jobDescription || "",
		url: reedJob.jobUrl || "",
		posted_at: reedJob.date || new Date().toISOString(),
		source: "reed",
	};
}

async function scrapeLocation(location) {
	const jobs = [];
	const resultsPerPage = RESULTS_PER_PAGE;
	const termsToUse =
		MAX_QUERIES_PER_LOCATION > 0
			? EARLY_TERMS.slice(0, MAX_QUERIES_PER_LOCATION)
			: EARLY_TERMS;

	console.log(
		`   🔍 Using ${termsToUse.length} queries for ${location} (${termsToUse.filter((_, i) => i < 20).length} role-based)`,
	);

	for (const term of termsToUse) {
		// Smart pagination: more pages for role-based queries
		const queryMaxPages = getMaxPagesForQuery(term);
		let page = 0;

		while (page < queryMaxPages) {
			const params = {
				keywords: term,
				locationName: location,
				resultsToTake: resultsPerPage,
				resultsToSkip: page * resultsPerPage,
				distanceFromLocation: 15,
				permanent: true,
				contract: true,
				partTime: true,
				fullTime: true,
				minimumSalary: 0,
				maximumSalary: 0,
				postedByRecruitmentAgency: true,
				postedByDirectEmployer: true,
				graduate: true, // Use Reed's graduate filter to focus on early-career roles
			};
			try {
				const data = await fetchReedPage(params);
				const items = Array.isArray(data.results) ? data.results : [];
				if (!items.length) break;
				for (const r of items) {
					const j = toIngestJob(r);
					const { isRemote, country } = parseLocation(j.location);
					// Filter out remote jobs if not included
					if (isRemote && !INCLUDE_REMOTE) continue;
					// Reed is UK/Ireland only - filter out non-UK/Ireland locations
					const locationLower = j.location.toLowerCase();
					const isUKIreland =
						country === "United Kingdom" ||
						country === "Ireland" ||
						locationLower.includes("london") ||
						locationLower.includes("manchester") ||
						locationLower.includes("birmingham") ||
						locationLower.includes("belfast") ||
						locationLower.includes("dublin") ||
						locationLower.includes("uk") ||
						locationLower.includes("ireland") ||
						locationLower.includes("england");
					if (!isUKIreland) continue;
					// Filter for early-career roles using strict classification
					const normalizedJob = {
						title: j.title || "",
						description: j.description || "",
					};
					const isEarlyCareer = classifyEarlyCareer(normalizedJob);
					if (!isEarlyCareer) {
						continue; // Skip non-early-career jobs (internships, graduate, entry-level only)
					}
					if (TARGET_CAREER_PATHS.length) {
						const text =
							`${j.title || ""} ${j.description || ""}`.toLowerCase();
						const matchesCareerPath = TARGET_CAREER_PATHS.some((path) => {
							const keywords = CAREER_PATH_KEYWORDS[path] || [];
							if (!keywords.length) return true;
							return keywords.some((keyword) => text.includes(keyword));
						});
						if (!matchesCareerPath) continue;
					}
					const valid =
						j.title && j.company && j.location && j.description && j.url;
					if (valid) jobs.push(j);
				}
				console.log(
					`   ✓ accumulated ${jobs.length} valid jobs so far for ${location}`,
				);
				const jitter =
					PAGE_DELAY_JITTER_MS > 0
						? Math.floor(Math.random() * PAGE_DELAY_JITTER_MS)
						: 0;
				const delayMs = Math.max(0, PAGE_DELAY_MS + jitter);
				if (delayMs > 0) {
					await sleep(delayMs);
				}
				// Stop paginating if fewer than a full page returned
				if (items.length < resultsPerPage) break;
				page++;
			} catch (e) {
				scrapeErrors += 1;
				if (e.response && e.response.status === 429) {
					await sleep(BACKOFF_DELAY_MS);
					page--;
					continue;
				}
				console.warn(`Reed error for ${location} ${term}:`, e.message);
				break;
			}
		}
	}
	return jobs;
}

async function saveJobsToDB(jobs) {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
	const key =
		process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
	const supabase = createClient(url, key);

	const dbJobs = jobs
		.map(convertToDatabaseFormat)
		.filter((job) => job !== null);

	// CRITICAL: Use comprehensive validator (consolidates all validation logic)
	const { validateJobs } = require("./shared/jobValidator.cjs");
	const validationResult = validateJobs(dbJobs);

	// Log validation stats
	console.log(
		`📊 Validation: ${validationResult.stats.total} total, ${validationResult.stats.valid} valid, ${validationResult.stats.invalid} invalid, ${validationResult.stats.autoFixed} auto-fixed`,
	);
	if (validationResult.stats.invalid > 0) {
		console.warn(`⚠️ Invalid jobs:`, validationResult.stats.errors);
	}

	// CRITICAL: Ensure company_name is set for all valid jobs
	const validatedRows = validationResult.valid.map((row) => {
		if (!row.company_name && row.company) {
			row.company_name = row.company;
		}
		return row;
	});

	const unique = Array.from(
		new Map(validatedRows.map((r) => [r.job_hash, r])).values(),
	);
	console.log(
		`📊 Validated: ${dbJobs.length} → ${validatedRows.length} → ${unique.length} unique jobs`,
	);

	const BATCH_SIZE = 50;
	let totalUpserted = 0;

	for (let i = 0; i < unique.length; i += BATCH_SIZE) {
		const batch = unique.slice(i, i + BATCH_SIZE);
		const { data, error } = await supabase
			.from("jobs")
			.upsert(batch, { onConflict: "job_hash", ignoreDuplicates: false })
			.select("job_hash");

		if (error) {
			console.error("Upsert error:", error.message);
			// Log first few failed rows for debugging
			if (i === 0 && batch.length > 0) {
				console.error("Sample failed row:", JSON.stringify(batch[0], null, 2));
			}
			throw error;
		}

		totalUpserted += Array.isArray(data) ? data.length : batch.length;
	}

	return totalUpserted;
}

(async () => {
	if (!process.env.REED_API_KEY) {
		console.log("⚠️ REED_API_KEY missing; skipping Reed run");
		process.exit(0);
	}
	console.log("🚀 Starting Reed scrape for locations:", LOCATIONS.join(", "));
	const all = [];
	for (const loc of LOCATIONS) {
		try {
			console.log(`📍 Reed: ${loc}`);
			const jobs = await scrapeLocation(loc);
			console.log(`  ➜ ${loc}: ${jobs.length} jobs`);
			all.push(...jobs);
			await sleep(1000);
		} catch (e) {
			console.error(`❌ Reed fatal in ${loc}:`, e?.message || e);
			scrapeErrors += 1;
		}
	}
	const seen = new Set();
	const unique = all.filter((j) => {
		const key = makeJobHash({
			title: j.title,
			company: j.company,
			location: j.location,
		});
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
	console.log(`📊 Reed total unique: ${unique.length}`);
	let inserted = 0;
	try {
		inserted = await saveJobsToDB(unique);
	} catch (e) {
		scrapeErrors += 1;
		console.error("❌ Reed DB save failed:", e.message);
	}
	console.log(`✅ Reed: ${inserted} jobs saved to database`);
	recordScraperRun("reed", inserted, Date.now() - scriptStart, scrapeErrors);
})().catch((e) => {
	console.error("❌ Reed fatal:", e.message);
	recordScraperRun("reed", 0, Date.now() - scriptStart, scrapeErrors + 1);
	process.exit(1);
});
