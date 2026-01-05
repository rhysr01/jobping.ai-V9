"use strict";
// Reed.co.uk Scraper (API v1.0) - UK and Ireland early-career focus
// Load environment variables conditionally
// In production/GitHub Actions, env vars are already set
if (process.env.NODE_ENV !== "production" && !process.env.GITHUB_ACTIONS) {
    require("dotenv").config({ path: ".env.local" });
}
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const {
	classifyEarlyCareer,
	makeJobHash,
	normalizeString,
	CAREER_PATH_KEYWORDS,
} = require("./shared/helpers.cjs");

// Removed debug regex patterns
const { recordScraperRun, recordApiRequest } = require("./shared/telemetry.cjs");

// Check for required API credentials
if (!process.env.REED_API_KEY) {
	console.error("❌ REED CREDENTIALS MISSING:");
	console.error("   - REED_API_KEY:", process.env.REED_API_KEY ? "✅ Set" : "❌ Missing");
	console.error("   📝 Add this to your environment variables or GitHub Actions secrets");
	console.error("   🔗 Get credentials: https://www.reed.co.uk/developers/jobseeker");
	process.exit(1);
}
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
	// CRITICAL: Add null check - processIncomingJob can return null for job boards
	if (!job) {
		console.warn("⚠️  Reed: Skipping null job object");
		return null;
	}

	// Process through standardization pipe
	const processed = processIncomingJob(job, {
		source: "reed",
	});

	// CRITICAL: Check if processing returned null (e.g., job board company)
	if (!processed) {
		return null;
	}

	// CRITICAL: Ensure processed job has required fields
	if (!processed.title || !processed.company || !processed.location) {
		console.warn("⚠️  Reed: Processed job missing required fields:", {
			hasTitle: !!processed.title,
			hasCompany: !!processed.company,
			hasLocation: !!processed.location,
		});
		return null;
	}

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

// Reed.co.uk supports UK only (NOT Ireland)
// UK cities: London, Manchester, Birmingham, Belfast (Belfast is in Northern Ireland, part of UK)
const UK_CITIES = ["London", "Manchester", "Birmingham", "Belfast"];
const SUPPORTED_CITIES = UK_CITIES; // UK only, no Ireland
const DEFAULT_LOCATIONS = [
	"London",
	"Manchester",
	"Birmingham",
	"Belfast",
]; // UK only - Dublin removed as Reed is UK-only

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
 * Generate career path-based queries rotating between internship, graduate programme, and early career
 * Rotates every 8 hours: SET_A (internship), SET_B (graduate programme), SET_C (early career)
 * UK-focused queries for Reed
 * 
 * EXPANDED: Now includes both career path queries AND specific role-based queries from QUERY_SETS
 * This provides broader coverage and should significantly increase job collection
 */
function generateReedQueries() {
	const currentSet = getCurrentQuerySet();
	console.log(
		`🔄 Reed using query set: ${currentSet} - rotating between internship, graduate programme, and early career`,
	);

	const queries = [];

	// Career paths from signup form
	const careerPaths = [
		"strategy",
		"finance",
		"sales",
		"marketing",
		"data",
		"operations",
		"product",
		"tech",
		"sustainability",
		"people-hr",
		"legal",
		"creative",
		"general-management",
	];

	// Determine query type based on rotation set
	let queryType;
	
	if (currentSet === "SET_A") {
		// Internship queries
		queryType = "internship";
	} else if (currentSet === "SET_B") {
		// Graduate programme queries (UK uses "graduate programme" or "graduate scheme")
		queryType = "graduate programme";
	} else {
		// Early career queries
		queryType = "early career";
	}

	// Generate queries for each career path
	for (const path of careerPaths) {
		queries.push(`${path} ${queryType}`);
		// For SET_B, also add "graduate scheme" variant (UK-specific)
		if (currentSet === "SET_B") {
			queries.push(`${path} graduate scheme`);
		}
	}

	// ADD: Include specific role-based queries from QUERY_SETS for broader coverage
	// These are more specific and should return more targeted results
	const roleQueries = QUERY_SETS[currentSet] || [];
	queries.push(...roleQueries);

	// Remove duplicates and return
	return [...new Set(queries)];
}

const EARLY_TERMS = generateReedQueries();

// Free tier: 1,000 requests/day, 2 runs/day = 500 per run
// Reed supports only UK/Ireland (5 cities), so: 5 cities × queries × pages ≤ 500
// Target: 10 queries × 10 pages × 5 cities = 500 requests (perfect!)
// INCREASED: Now using more queries (up to 26 available) but capped at 10 per city to stay within limit
// If you want to use all queries, reduce pages: 26 queries × 4 pages × 5 cities = 520 (slightly over)
const MAX_QUERIES_PER_LOCATION = parseInt(
	process.env.REED_MAX_QUERIES_PER_LOCATION || "10", // Default: 10 queries per city (500 requests total)
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
// Calculate estimated requests based on average pages per query type
// Career path queries: 10 pages, role queries: 10 pages (both use same max now)
const avgPagesPerQuery = 10;
const estimatedRequests = LOCATIONS.length * queriesToUse.length * avgPagesPerQuery;
console.log(
	`📋 Reed query strategy: Using ${queriesToUse.length} queries per location (from ${EARLY_TERMS.length} total)`,
);
console.log(
	`📊 API Usage: ~${LOCATIONS.length} cities × ${queriesToUse.length} queries × ${avgPagesPerQuery} pages = ~${estimatedRequests} calls per run`,
);
console.log(
	`⚠️  Free Tier Limit: 1,000 requests/day (2 runs/day = 500 per run). Current: ~${estimatedRequests} (${estimatedRequests <= 500 ? "✅ SAFE" : "⚠️ OVER LIMIT - will be throttled by MAX_QUERIES_PER_LOCATION"})`,
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
 * RESPECTS API LIMITS: Free tier is 1,000 requests/day, 2 runs/day = 500 per run
 * Strategy: 5 cities × 10 queries × 10 pages = 500 requests (perfect match to limit)
 * This maximizes job collection while staying within free tier limits
 */
function getMaxPagesForQuery(query) {
	// Career path queries (e.g., "strategy internship", "finance graduate programme")
	const careerPathPattern = /^(strategy|finance|sales|marketing|data|operations|product|tech|sustainability|people-hr|legal|creative|general-management)\s+(internship|graduate programme|graduate scheme|early career)/i;
	const isCareerPathQuery = careerPathPattern.test(query.trim());

	// REED FREE TIER LIMIT: 1,000 requests/day, 2 runs/day = 500 per run
	// Calculation: 5 cities × 10 queries × 10 pages = 500 requests (perfect!)
	// We use 10 pages to maximize collection while respecting the limit
	// Users can override via env vars if they have paid tier
	if (isCareerPathQuery) {
		return parseInt(process.env.REED_MAX_PAGES_CAREER_PATH || "10", 10); // 10 pages respects free tier limit
	}
	return parseInt(process.env.REED_MAX_PAGES || "10", 10); // 10 pages respects free tier limit
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

	try {
		const headers = {
			Authorization: buildAuthHeader(),
			Accept: "application/json",
			"User-Agent":
				"JobPingBot/1.0 (+https://getjobping.com/bot; contact: support@getjobping.com)",
		};
		const resp = await axios.get(REED_API, { params, headers, timeout: 20000 });
		const len = Array.isArray(resp.data?.results) ? resp.data.results.length : 0;
		console.log(`   ← got ${len} results`);

		// Record successful API request
		recordApiRequest("reed", REED_API, true);

		// Log API response details for debugging
		if (resp.data && typeof resp.data === 'object') {
			console.log(`   📊 API response summary:`, {
				totalResults: resp.data.totalResults || 'N/A',
				resultsCount: len,
				hasResults: Array.isArray(resp.data.results),
				status: resp.status
			});
		}

		return resp.data;
	} catch (error) {
		// Record failed API request
		recordApiRequest("reed", REED_API, false);

		console.error(`   ❌ Reed API error:`, {
			status: error.response?.status,
			statusText: error.response?.statusText,
			message: error.message,
			url: REED_API,
			params: params
		});

		// If unauthorized, the API key is likely invalid
		if (error.response?.status === 401) {
			console.error(`   🔑 API key appears to be invalid or expired!`);
		}

		throw error;
	}
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
	
	let totalQueries = 0;
	let successfulQueries = 0;
	let totalJobsFound = 0;
	let totalJobsFiltered = 0;

	for (const term of termsToUse) {
		totalQueries++;
		// Smart pagination: more pages for role-based queries
		const queryMaxPages = getMaxPagesForQuery(term);
		let page = 0;
		let queryJobsFound = 0;
		let queryJobsFiltered = 0;

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
				// REMOVED: graduate: true - This was too restrictive and filtered out many early-career jobs
				// We'll rely on our own classifyEarlyCareer() function instead for better coverage
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
					console.warn(
						`⚠️  Reed rate limit hit for ${location} ${term}, backing off...`,
					);
					await sleep(BACKOFF_DELAY_MS);
					page--;
					continue;
				}
				console.warn(`❌ Reed error for ${location} ${term}:`, e.message);
				if (e.response) {
					console.warn(`   HTTP ${e.response.status}: ${e.response.statusText}`);
				}
				break;
			}
		}
		
		// Log query results
		queryJobsFound = jobs.length - totalJobsFound;
		totalJobsFound = jobs.length;
		if (queryJobsFound > 0) {
			successfulQueries++;
			console.log(
				`   ✅ "${term}": Found ${queryJobsFound} jobs (${queryMaxPages} pages checked)`,
			);
		} else {
			console.log(
				`   ⚠️  "${term}": No jobs found (${queryMaxPages} pages checked)`,
			);
		}
	}
	
	// Log location summary
	console.log(
		`📊 Reed ${location} summary: ${successfulQueries}/${totalQueries} queries successful, ${jobs.length} total jobs found`,
	);
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
		// CRITICAL: Add null check to prevent "Cannot read properties of null" errors
		if (!j || !j.title || !j.company || !j.location) {
			console.warn("⚠️  Reed: Skipping job with missing required fields");
			return false;
		}
		
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
