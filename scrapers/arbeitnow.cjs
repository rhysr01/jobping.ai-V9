// Load environment variables conditionally
// In production/GitHub Actions, env vars are already set
if (process.env.NODE_ENV !== "production" && !process.env.GITHUB_ACTIONS) {
    require("dotenv").config({ path: ".env.local" });
}
const { createClient } = require("@supabase/supabase-js");
const {
	classifyEarlyCareer,
	makeJobHash,
	normalizeString,
	CAREER_PATH_KEYWORDS,
} = require("./shared/helpers.cjs");
const {
	getAllRoles,
	getEarlyCareerRoles,
	getTopRolesByCareerPath,
	getRoleVariations,
	cleanRoleForSearch,
} = require("./shared/roles.cjs");
const { recordScraperRun } = require("./shared/telemetry.cjs");
const { processIncomingJob } = require("./shared/processor.cjs");

const BASE_URL = "https://www.arbeitnow.com/api/job-board-api";

// DACH region cities (Germany, Austria, Switzerland) - MINIMAL for timeout prevention
const CITIES = [
	// Germany (top 2 major cities only)
	{ name: "Berlin", country: "de" },
	{ name: "Munich", country: "de" },
];

/**
 * Query rotation system - 3 sets that rotate every 8 hours
 * EXPANDED DACH-FOCUSED queries covering all role types
 * German, Austrian, and Swiss terms for comprehensive DACH coverage
 */
const QUERY_SETS = {
	SET_A: [
		// Focus: Internships, graduate programs, and coordinator roles (DACH-focused)
		// German terms
		"praktikum",
		"werkstudent",
		"absolventenprogramm",
		"traineeprogramm",
		"praktikant",
		"praktikantin",
		"praktikumsplatz",
		"praktikumsstelle",
		"absolvent",
		"absolventin",
		"berufseinsteiger",
		"berufseinsteigerin",
		"ausbildung",
		"duales studium",
		"dualer student",
		"duale ausbildung",
		"einstiegsprogramm",
		"nachwuchsprogramm",
		"trainee",
		"traineeprogramm",
		"koordinator",
		"koordinatorin",
		"projektkoordinator",
		"marketing koordinator",
		"operations koordinator",
		"hr koordinator",
		"sales koordinator",
		// Austrian terms
		"praktikum wien",
		"praktikant wien",
		"absolventenprogramm österreich",
		"traineeprogramm österreich",
		"duales studium wien",
		// Swiss terms
		"praktikum zürich",
		"praktikant schweiz",
		"absolventenprogramm schweiz",
		"traineeprogramm schweiz",
		"lehre",
		"lehrstelle",
		// English fallback
		"internship",
		"intern",
		"graduate programme",
		"graduate scheme",
		"marketing coordinator",
		"operations coordinator",
		"product coordinator",
		"hr coordinator",
		"project coordinator",
		"sales coordinator",
	],
	SET_B: [
		// Focus: Analyst, associate, assistant, and representative roles (DACH-focused)
		// German terms
		"business analyst",
		"financial analyst",
		"data analyst",
		"operations analyst",
		"junior analyst",
		"graduate analyst",
		"absolvent analyst",
		"einsteiger analyst",
		"assistent",
		"assistentin",
		"marketing assistent",
		"brand assistent",
		"product assistent",
		"hr assistent",
		"finance assistent",
		"vertreter",
		"vertreterin",
		"sales vertreter",
		"kundenbetreuer",
		"junior account executive",
		"customer success associate",
		// Austrian terms
		"analyst wien",
		"assistent wien",
		"praktikant analyst",
		"absolvent analyst österreich",
		"einsteiger analyst wien",
		// Swiss terms
		"analyst zürich",
		"assistent schweiz",
		"praktikant analyst schweiz",
		"absolvent analyst schweiz",
		"einsteiger analyst zürich",
		// English fallback
		"business analyst",
		"financial analyst",
		"data analyst",
		"operations analyst",
		"associate consultant",
		"graduate analyst",
		"junior analyst",
		"marketing assistant",
		"brand assistant",
		"product assistant",
		"hr assistant",
		"sales development representative",
		"sdr",
		"bdr",
	],
	SET_C: [
		// Focus: Entry-level, junior, engineer, specialist, manager, designer roles (DACH-focused)
		// German terms
		"entry level",
		"junior",
		"einsteiger",
		"einsteigerin",
		"berufseinsteiger",
		"junior ingenieur",
		"ingenieur einsteiger",
		"absolvent ingenieur",
		"software engineer intern",
		"data engineer intern",
		"cloud engineer intern",
		"junior spezialist",
		"spezialist einsteiger",
		"absolvent spezialist",
		"junior designer",
		"designer einsteiger",
		"absolvent designer",
		"associate product manager",
		"apm",
		"product analyst",
		"junior product manager",
		"product manager einsteiger",
		"nachhaltigkeit",
		"esg praktikum",
		"sustainability analyst",
		"climate analyst",
		// Austrian terms
		"ingenieur wien",
		"spezialist wien",
		"designer wien",
		"junior ingenieur österreich",
		"absolvent ingenieur wien",
		"praktikum nachhaltigkeit wien",
		"esg praktikum österreich",
		// Swiss terms
		"ingenieur zürich",
		"spezialist schweiz",
		"designer schweiz",
		"junior ingenieur schweiz",
		"absolvent ingenieur zürich",
		"praktikum nachhaltigkeit schweiz",
		"esg praktikum zürich",
		// English fallback
		"entry level",
		"junior",
		"graduate",
		"recent graduate",
		"early careers program",
		"rotational graduate program",
		"junior fulfilment specialist",
		"entry level technical specialist",
		"graduate hr specialist",
		"junior product designer",
		"designer intern",
		"ux intern",
	],
};

/**
 * Determine which query set to use based on time of day
 * Rotates every 8 hours: SET_A (0-7h), SET_B (8-15h), SET_C (16-23h)
 */
function getCurrentQuerySet() {
	const manualSet = process.env.ARBEITNOW_QUERY_SET;
	if (manualSet && QUERY_SETS[manualSet]) {
		return manualSet;
	}

	const hour = new Date().getHours();
	if (hour >= 0 && hour < 8) return "SET_A";
	if (hour >= 8 && hour < 16) return "SET_B";
	return "SET_C";
}

/**
 * Generate search queries from specific roles (not generic terms)
 * Uses actual roles from signup form for targeted searches
 * NOW WITH QUERY ROTATION for variety across runs
 * ALL QUERIES ARE EARLY-CAREER FOCUSED with German local language terms
 */
function generateSearchQueries() {
	const currentSet = getCurrentQuerySet();
	const baseQueries = QUERY_SETS[currentSet];
	console.log(
		`🔄 Arbeitnow using query set: ${currentSet} (${baseQueries.length} base terms)`,
	);

	const queries = new Set();

	// Add base rotation queries (early-career focused, German + English)
	baseQueries.forEach((term) => queries.add(term.toLowerCase()));

	// Priority 1: Early-career roles (intern, graduate, junior, trainee)
	// EXPANDED: More roles per set for better DACH coverage
	const earlyCareerRoles = getEarlyCareerRoles();
	const roleSlice =
		currentSet === "SET_A"
			? earlyCareerRoles.slice(0, 15)
			: currentSet === "SET_B"
				? earlyCareerRoles.slice(15, 30)
				: earlyCareerRoles.slice(30, 45);

	roleSlice.forEach((role) => {
		const cleaned = cleanRoleForSearch(role);
		cleaned.forEach((cleanRole) => {
			if (cleanRole.length > 5) {
				queries.add(cleanRole.toLowerCase());
			}
		});
	});

	// Priority 2: All roles from signup form (rotated subset)
	// EXPANDED: More roles per set for better DACH coverage
	const allRoles = getAllRoles();
	const allRolesSlice =
		currentSet === "SET_A"
			? allRoles.slice(0, 20)
			: currentSet === "SET_B"
				? allRoles.slice(20, 40)
				: allRoles.slice(40, 60);

	allRolesSlice.forEach((role) => {
		const cleaned = cleanRoleForSearch(role);
		cleaned.forEach((cleanRole) => {
			if (cleanRole.length > 5) {
				queries.add(cleanRole.toLowerCase());
			}
		});
	});

	// Priority 3: DACH-specific early-career program terms (ALWAYS INCLUDED - EXPANDED)
	const dachProgramTerms = [
		// German terms
		"absolventenprogramm",
		"traineeprogramm",
		"praktikum",
		"werkstudent",
		"absolvent",
		"absolventin",
		"berufseinsteiger",
		"berufseinsteigerin",
		"ausbildung",
		"duales studium",
		"dualer student",
		"duale ausbildung",
		"einstiegsprogramm",
		"nachwuchsprogramm",
		"praktikant",
		"praktikantin",
		"einsteiger",
		"einsteigerin",
		"praktikumsplatz",
		"praktikumsstelle",
		"lehre",
		"lehrstelle",
		"auszubildender",
		"azubi",
		"bachelor abschluss",
		"master abschluss",
		"studienabschluss",
		"karrierestart",
		"berufseinstieg",
		"karrierestarter",
		// Austrian-specific terms
		"praktikum wien",
		"praktikant wien",
		"absolventenprogramm österreich",
		"traineeprogramm österreich",
		"duales studium wien",
		"lehre wien",
		"ausbildung wien",
		"berufseinsteiger wien",
		"einsteiger wien",
		// Swiss-specific terms
		"praktikum zürich",
		"praktikant schweiz",
		"absolventenprogramm schweiz",
		"traineeprogramm schweiz",
		"lehre zürich",
		"lehre schweiz",
		"ausbildung schweiz",
		"berufseinsteiger schweiz",
		"einsteiger zürich",
		"lehre zürich",
		"lehrstelle schweiz",
		"auszubildender schweiz",
	];
	dachProgramTerms.forEach((term) => queries.add(term.toLowerCase()));

	// Priority 4: English early-career terms (rotated)
	const englishProgramTerms =
		currentSet === "SET_A"
			? [
					"graduate programme",
					"graduate scheme",
					"graduate program",
					"graduate trainee",
					"management trainee",
					"rotational graduate program",
				]
			: currentSet === "SET_B"
				? [
						"graduate analyst",
						"graduate associate",
						"early careers program",
						"corporate graduate programme",
						"future leaders programme",
					]
				: [
						"campus hire",
						"new grad",
						"recent graduate",
						"entry level program",
						"graduate scheme",
						"trainee program",
						"internship program",
					];

	englishProgramTerms.forEach((term) => {
		queries.add(term.toLowerCase());
	});

	// Add career path keywords for broader matching (rotated subset)
	const paths = Object.keys(CAREER_PATH_KEYWORDS);
	const pathSlice =
		currentSet === "SET_A"
			? paths.slice(0, 4)
			: currentSet === "SET_B"
				? paths.slice(4, 8)
				: paths.slice(8, 12);

	pathSlice.forEach((path) => {
		CAREER_PATH_KEYWORDS[path].forEach((keyword) => {
			if (keyword.length > 3) {
				queries.add(keyword.toLowerCase());
			}
		});
	});

	return Array.from(queries);
}

/**
 * Extract city from location string
 * e.g., "Berlin, Germany" -> "Berlin"
 */
function extractCity(location) {
	if (!location) return "Unknown";
	return location.split(",")[0].trim();
}

/**
 * Infer country code from location
 */
function inferCountry(location) {
	const locationLower = normalizeString(location);
	if (
		locationLower.includes("germany") ||
		locationLower.includes("deutschland")
	)
		return "de";
	if (locationLower.includes("austria") || locationLower.includes("österreich"))
		return "at";
	if (
		locationLower.includes("switzerland") ||
		locationLower.includes("schweiz")
	)
		return "ch";
	return "de"; // Default to Germany
}

/**
 * Normalize date from Arbeitnow API
 * Handles Unix timestamps (seconds) and ISO strings
 */
function normalizeDate(dateValue) {
	if (!dateValue) return new Date().toISOString();

	// If it's a number (Unix timestamp in seconds), convert to milliseconds
	if (typeof dateValue === "number" || /^\d+$/.test(String(dateValue))) {
		const timestamp =
			typeof dateValue === "number" ? dateValue : parseInt(dateValue, 10);
		// If timestamp is less than 1e12, it's in seconds, convert to milliseconds
		const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
		return new Date(ms).toISOString();
	}

	// Try to parse as ISO string
	try {
		const date = new Date(dateValue);
		if (Number.isNaN(date.getTime())) {
			return new Date().toISOString();
		}
		return date.toISOString();
	} catch {
		return new Date().toISOString();
	}
}

/**
 * Infer categories from Arbeitnow tags
 * CRITICAL: Maps to database categories (matches categoryMapper.ts)
 */
function inferCategoriesFromTags(tags, title) {
	const allText = normalizeString([...tags, title].join(" "));
	let categories = ["early-career"];

	// Use shared category mapper to ensure consistency
	const {
		addCategoryFromPath,
		validateAndFixCategories,
	} = require("./shared/categoryMapper.cjs");

	Object.entries(CAREER_PATH_KEYWORDS).forEach(([path, keywords]) => {
		const keywordLower = keywords.map((k) => k.toLowerCase());
		if (keywordLower.some((kw) => allText.includes(kw))) {
			categories = addCategoryFromPath(path, categories);
		}
	});

	// CRITICAL: Validate and fix categories before returning
	categories = validateAndFixCategories(categories);

	// If no specific category found, add 'general'
	if (categories.length === 1) {
		categories.push("general");
	}

	return categories;
}

/**
 * Scrape Arbeitnow for a single keyword + location combo
 * FIXED: Now includes pagination to fetch multiple pages per query
 * FIXED: Batches database saves to prevent timeouts
 */
async function scrapeArbeitnowQuery(keyword, location, supabase) {
	// UNLIMITED: Fetch as many pages as available (no artificial limit)
	// Only stop when API indicates no more pages or returns empty results
	const MAX_PAGES = parseInt(process.env.ARBEITNOW_MAX_PAGES || "1000", 10); // Very high limit, effectively unlimited
	const BATCH_SIZE = 50; // Batch size for database saves
	let page = 1;
	let hasMorePages = true;
	let totalSaved = 0; // Track total saved jobs
	const jobBatch = []; // Accumulate jobs for batch saving

	while (hasMorePages && page <= MAX_PAGES) {
		try {
			const url = new URL(BASE_URL);
			url.searchParams.set("search", keyword);
			url.searchParams.set("location", location.name);
			url.searchParams.set("page", String(page));

			const response = await fetch(url.toString(), {
				headers: {
					"User-Agent": "JobPing/1.0 (job aggregator)",
					Accept: "application/json",
				},
			});

			if (!response.ok) {
				console.error(
					`[Arbeitnow] API error ${response.status} for ${keyword} in ${location.name} (page ${page})`,
				);
				break; // Stop pagination on error
			}

			const data = await response.json();
			const jobs = data.data || [];
			const meta = data.meta || {};
			
			// Check if there are more pages
			// Arbeitnow API typically returns pagination info in meta or we can infer from results
			if (jobs.length === 0) {
				hasMorePages = false;
				break;
			}

			// If meta indicates total pages, use that
			if (meta.last_page && page >= meta.last_page) {
				hasMorePages = false;
			}

			console.log(
				`[Arbeitnow] Found ${jobs.length} jobs for "${keyword}" in ${location.name} (page ${page})`,
			);

			// Process each job and add to batch
			for (const job of jobs) {
				try {
					// Extract city and country
					const city = extractCity(job.location);
					const country = inferCountry(job.location);

					// Create normalized job object for early-career check
					const normalizedJob = {
						title: job.title || "",
						company: job.company_name || "",
						location: city,
						description: job.description || "",
					};

					// Check if it's early career
					const isEarlyCareer = classifyEarlyCareer(normalizedJob);
					if (!isEarlyCareer) {
						continue; // Skip non-early-career jobs
					}

					// Process through standardization pipe
					const processed = processIncomingJob(
						{
							title: job.title,
							company: job.company_name,
							location: job.location,
							description: job.description,
							url: job.url,
							posted_at: normalizeDate(job.created_at),
							created_at: job.created_at,
						},
						{
							source: "arbeitnow",
							defaultCity: city,
							defaultCountry: country,
						},
					);

					// CRITICAL: Skip if processor rejected (e.g., job board company)
					if (!processed) {
						continue;
					}

					// Generate job_hash
					const job_hash = makeJobHash({
						title: processed.title,
						company: processed.company,
						location: processed.location,
					});

					// Infer categories from tags (Arbeitnow-specific)
					const categories = inferCategoriesFromTags(job.tags || [], job.title);

					// Prepare database record with all standardized fields
					const jobRecord = {
						...processed,
						job_hash,
						categories, // Override with Arbeitnow-specific categories
					};

					// CRITICAL: Validate before adding to batch
					const { validateJob } = require("./shared/jobValidator.cjs");
					const validation = validateJob(jobRecord);
					if (!validation.valid) {
						console.warn(
							`[Arbeitnow] Skipping invalid job: ${validation.errors.join(", ")}`,
						);
						continue;
					}

					// Add to batch instead of saving immediately
					jobBatch.push(validation.job);

					// Save batch when it reaches BATCH_SIZE
					if (jobBatch.length >= BATCH_SIZE) {
						// CRITICAL FIX: Use ignoreDuplicates: true to prevent timeout on updates
						// This avoids expensive UPDATE operations for existing jobs
						// last_seen_at will be updated by the matching engine, not by scrapers
						const { error } = await supabase.from("jobs").upsert(jobBatch, {
							onConflict: "job_hash",
							ignoreDuplicates: true, // Changed from false to true to prevent timeouts
						});

						if (error) {
							console.error(
								`[Arbeitnow] Error saving batch:`,
								error.message,
							);
						} else {
							console.log(
								`[Arbeitnow] Saved batch of ${jobBatch.length} jobs`,
							);
						}
						jobBatch.length = 0; // Clear batch
					}
				} catch (jobError) {
					console.error("[Arbeitnow] Error processing job:", jobError.message);
				}
			}

			// If we got fewer jobs than expected (e.g., < 20), likely no more pages
			// This is a heuristic - adjust based on typical page size
			if (jobs.length < 20) {
				hasMorePages = false;
			}

			page++;
			
			// Rate limiting between pages
			if (hasMorePages && page <= MAX_PAGES) {
				await new Promise((resolve) => setTimeout(resolve, 1000)); // 1s delay between pages
			}
		} catch (error) {
			console.error(
				`[Arbeitnow] Error scraping ${keyword} in ${location.name} (page ${page}):`,
				error.message,
			);
			break; // Stop pagination on error
		}
	}

	// Save any remaining jobs in the batch
	if (jobBatch.length > 0) {
		// CRITICAL FIX: Use ignoreDuplicates: true to prevent timeout on updates
		const { error, data } = await supabase.from("jobs").upsert(jobBatch, {
			onConflict: "job_hash",
			ignoreDuplicates: true, // Changed from false to true to prevent timeouts
		});

		if (error) {
			console.error(
				`[Arbeitnow] Error saving final batch:`,
				error.message,
			);
		} else {
			const saved = Array.isArray(data) ? data.length : jobBatch.length;
			totalSaved += saved;
			console.log(
				`[Arbeitnow] Saved final batch of ${jobBatch.length} jobs`,
			);
		}
	}

	return totalSaved;
}

/**
 * Main scraper function
 */
async function scrapeArbeitnow() {
	const supabaseUrl =
		process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
	const supabaseKey =
		process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseKey) {
		console.error(
			"[Arbeitnow] ❌ Supabase credentials not set. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
		);
		return;
	}

	const startTime = Date.now();
	console.log("[Arbeitnow] 🚀 Starting scrape...");

	// Create Supabase client (matching existing scraper pattern)
	const supabase = createClient(supabaseUrl, supabaseKey);

	const queries = generateSearchQueries();

// CRITICAL FIX: Drastically reduce queries to prevent 120s GitHub Actions timeout
// REDUCED from 40 to 6 queries to prevent timeouts
// 2 cities × 6 queries × 2 pages avg = ~24 requests max
// With rate limiting (2s between queries), this completes in ~48 seconds
const limitedQueries = queries.slice(0, 6); // Emergency reduction for timeout prevention
	
	const MAX_PAGES = parseInt(process.env.ARBEITNOW_MAX_PAGES || "1000", 10);
	console.log(
		`[Arbeitnow] Using ${limitedQueries.length} queries across ${CITIES.length} cities (unlimited pages per query, will fetch all available)`,
	);

	let totalSaved = 0;
	let errors = 0;

	// Scrape each city + keyword combo
	for (const city of CITIES) {
		for (const keyword of limitedQueries) {
			try {
				const saved = await scrapeArbeitnowQuery(keyword, city, supabase);
				totalSaved += saved;

				// Rate limiting: 2 seconds between requests (100/hour = ~36s spacing, but be conservative)
				await new Promise((resolve) => setTimeout(resolve, 2000));
			} catch (error) {
				console.error(
					`[Arbeitnow] Error with ${keyword} in ${city.name}:`,
					error.message,
				);
				errors++;
			}
		}
	}

	const duration = Date.now() - startTime;

	// Record telemetry
	recordScraperRun("arbeitnow", totalSaved, duration, errors);

	console.log(
		`[Arbeitnow] ✅ Complete: ${totalSaved} jobs saved in ${(duration / 1000).toFixed(1)}s`,
	);
}

// Run if called directly
if (require.main === module) {
	scrapeArbeitnow()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error("[Arbeitnow] Fatal error:", error);
			process.exit(1);
		});
}

module.exports = { scrapeArbeitnow };
