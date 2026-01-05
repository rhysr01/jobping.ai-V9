require("dotenv").config({ path: ".env.local" });
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
	cleanRoleForSearch,
} = require("./shared/roles.cjs");
const { recordScraperRun } = require("./shared/telemetry.cjs");
const { processIncomingJob } = require("./shared/processor.cjs");

// Jooble API endpoint - using their public API
// Note: Jooble may require API key registration for production use
const BASE_URL = "https://jooble.org/api/";

// EU Cities - REDUCED for timeout prevention
// Jooble supports 71 countries including all EU countries
const CITIES = [
	{ name: "London", country: "gb", locale: "en" },
	{ name: "Berlin", country: "de", locale: "de" },
	{ name: "Paris", country: "fr", locale: "fr" },
	{ name: "Amsterdam", country: "nl", locale: "nl" },
	{ name: "Dublin", country: "ie", locale: "en" },
	{ name: "Munich", country: "de", locale: "de" },
];

/**
 * Query rotation system - 3 sets that rotate every 8 hours
 * Focused on early-career roles matching signup form
 */
const QUERY_SETS = {
	SET_A: [
		// Focus: Internships, graduate programs, and coordinator roles
		"internship",
		"graduate programme",
		"graduate scheme",
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
		"associate consultant",
		"graduate analyst",
		"junior analyst",
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
		// Focus: Entry-level, junior, engineer, specialist, manager, designer roles
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
	const manualSet = process.env.JOOBLE_QUERY_SET;
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
 * ALL QUERIES ARE EARLY-CAREER FOCUSED
 */
function generateSearchQueries() {
	const currentSet = getCurrentQuerySet();
	const baseQueries = QUERY_SETS[currentSet];
	console.log(
		`🔄 Jooble using query set: ${currentSet} (${baseQueries.length} base terms)`,
	);

	const queries = new Set();

	// Add base rotation queries (early-career focused)
	baseQueries.forEach((term) => {
		queries.add(term.toLowerCase());
	});

	// Priority 1: Early-career roles (intern, graduate, junior, trainee)
	const earlyCareerRoles = getEarlyCareerRoles();
	const roleSlice =
		currentSet === "SET_A"
			? earlyCareerRoles.slice(0, 10)
			: currentSet === "SET_B"
				? earlyCareerRoles.slice(10, 20)
				: earlyCareerRoles.slice(20, 30);

	roleSlice.forEach((role) => {
		const cleaned = cleanRoleForSearch(role);
		cleaned.forEach((cleanRole) => {
			if (cleanRole.length > 5) {
				queries.add(cleanRole.toLowerCase());
			}
		});
	});

	// Priority 2: All roles from signup form (rotated subset)
	const allRoles = getAllRoles();
	const allRolesSlice =
		currentSet === "SET_A"
			? allRoles.slice(0, 15)
			: currentSet === "SET_B"
				? allRoles.slice(15, 30)
				: allRoles.slice(30, 45);

	allRolesSlice.forEach((role) => {
		const cleaned = cleanRoleForSearch(role);
		cleaned.forEach((cleanRole) => {
			if (cleanRole.length > 5) {
				queries.add(cleanRole.toLowerCase());
			}
		});
	});

	return Array.from(queries).slice(0, 20); // Limit to 20 queries per run
}

/**
 * Extract city from location string
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
	if (locationLower.includes("france")) return "fr";
	if (locationLower.includes("spain") || locationLower.includes("espana"))
		return "es";
	if (locationLower.includes("italy") || locationLower.includes("italia"))
		return "it";
	if (
		locationLower.includes("netherlands") ||
		locationLower.includes("nederland")
	)
		return "nl";
	if (locationLower.includes("belgium")) return "be";
	if (
		locationLower.includes("switzerland") ||
		locationLower.includes("schweiz")
	)
		return "ch";
	if (locationLower.includes("austria") || locationLower.includes("österreich"))
		return "at";
	if (locationLower.includes("sweden") || locationLower.includes("sverige"))
		return "se";
	if (locationLower.includes("denmark") || locationLower.includes("danmark"))
		return "dk";
	if (locationLower.includes("czech") || locationLower.includes("česká"))
		return "cz";
	if (locationLower.includes("poland") || locationLower.includes("polska"))
		return "pl";
	if (locationLower.includes("ireland") || locationLower.includes("éire"))
		return "ie";
	if (locationLower.includes("united kingdom") || locationLower.includes("uk"))
		return "gb";
	return "gb"; // Default to UK
}

/**
 * Normalize date from Jooble API
 */
function normalizeDate(dateValue) {
	if (!dateValue) return new Date().toISOString();

	// If it's a number (Unix timestamp), convert to milliseconds
	if (typeof dateValue === "number" || /^\d+$/.test(String(dateValue))) {
		const timestamp =
			typeof dateValue === "number" ? dateValue : parseInt(dateValue, 10);
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
 * Scrape Jooble for a single keyword + location combo
 * FIXED: Added pagination, better logging, and response structure debugging
 */
async function scrapeJoobleQuery(keyword, location, supabase, apiKey) {
	if (!apiKey) {
		console.error(
			`[Jooble] ❌ API key missing for ${keyword} in ${location.name}`,
		);
		return 0;
	}

	const BATCH_SIZE = 50; // Batch size for database saves
	let totalSaved = 0;
	let totalFound = 0;
	let totalFilteredEarlyCareer = 0;
	let totalFilteredProcessor = 0;
	let totalFilteredValidation = 0;
	const jobBatch = []; // Accumulate jobs for batch saving

	// UNLIMITED: Fetch as many pages as available (no artificial limit)
	// Only stop when API indicates no more pages or returns empty results
	const MAX_PAGES = parseInt(process.env.JOOBLE_MAX_PAGES || "1000", 10); // Very high limit, effectively unlimited
	let page = 1;
	let hasMorePages = true;

	while (hasMorePages && page <= MAX_PAGES) {
		try {
			// Jooble API requires POST requests to /api/{api_key} endpoint
			const url = `${BASE_URL}${apiKey}`;

			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"User-Agent": "JobPing/1.0 (job aggregator)",
					Accept: "application/json",
				},
				body: JSON.stringify({
					keywords: keyword,
					location: location.name,
					page: page,
					radius: 25,
				}),
			});

			if (!response.ok) {
				const errorText = await response.text().catch(() => "");
				console.error(
					`[Jooble] API error ${response.status} for ${keyword} in ${location.name} (page ${page}): ${errorText.substring(0, 200)}`,
				);
				break;
			}

			const data = await response.json();

			// DEBUG: Log response structure on first page to understand API format
			if (page === 1) {
				console.log(
					`[Jooble] Response structure for ${keyword} in ${location.name}:`,
					JSON.stringify(
						{
							keys: Object.keys(data),
							hasJobs: !!data.jobs,
							hasResults: !!data.results,
							hasData: !!data.data,
							hasItems: !!data.items,
							totalJobs:
								data.jobs?.length ||
								data.results?.length ||
								data.data?.length ||
								data.items?.length ||
								0,
						},
						null,
						2,
					),
				);
			}

			// Try multiple response structures
			const jobs = data.jobs || data.results || data.data || data.items || [];
			totalFound += jobs.length;

			// Check for pagination metadata
			const totalPages =
				data.totalPages ||
				data.last_page ||
				data.pages ||
				data.total_pages ||
				null;
			const totalResults =
				data.total || data.totalResults || data.count || null;

			if (jobs.length === 0) {
				hasMorePages = false;
				break;
			}

			// If we have pagination metadata, use it
			if (totalPages && page >= totalPages) {
				hasMorePages = false;
			}

			console.log(
				`[Jooble] Found ${jobs.length} jobs for "${keyword}" in ${location.name} (page ${page}${totalResults ? `, total available: ${totalResults}` : ""})`,
			);

			// Process each job
			for (const job of jobs) {
				try {
					// Extract city and country
					const city = extractCity(job.location || job.city || "");
					const country = inferCountry(job.location || job.country || "");

					// Create normalized job object for early-career check
					const normalizedJob = {
						title: job.title || job.jobTitle || "",
						company: job.company || job.companyName || job.employer || "",
						location: city,
						description: job.description || job.snippet || "",
					};

					// Check if it's early career
					const isEarlyCareer = classifyEarlyCareer(normalizedJob);
					if (!isEarlyCareer) {
						totalFilteredEarlyCareer++;
						continue; // Skip non-early-career jobs
					}

					// Process through standardization pipe
					const processed = processIncomingJob(
						{
							title: job.title || job.jobTitle || "",
							company: job.company || job.companyName || job.employer || "",
							location: job.location || `${city}, ${country}`,
							description: job.description || job.snippet || "",
							url: job.url || job.link || job.jobUrl || "",
							posted_at: normalizeDate(
								job.date || job.postedDate || job.created,
							),
							created_at: job.created || job.postedDate,
						},
						{
							source: "jooble",
							defaultCity: city,
							defaultCountry: country,
						},
					);

					// CRITICAL: Skip if processor rejected (e.g., job board company)
					if (!processed) {
						totalFilteredProcessor++;
						continue;
					}

					// Generate job_hash
					const job_hash = makeJobHash({
						title: processed.title,
						company: processed.company,
						location: processed.location,
					});

					// Prepare database record
					const jobRecord = {
						...processed,
						job_hash,
					};

					// CRITICAL: Validate before adding to batch
					const { validateJob } = require("./shared/jobValidator.cjs");
					const validation = validateJob(jobRecord);
					if (!validation.valid) {
						totalFilteredValidation++;
						console.warn(
							`[Jooble] Skipping invalid job: ${validation.errors.join(", ")}`,
						);
						continue;
					}

					// Add to batch instead of saving immediately
					jobBatch.push(validation.job);

					// Save batch when it reaches BATCH_SIZE
					if (jobBatch.length >= BATCH_SIZE) {
						const { error, data } = await supabase
							.from("jobs")
							.upsert(jobBatch, {
								onConflict: "job_hash",
								ignoreDuplicates: false,
							});

						if (error) {
							console.error(`[Jooble] Error saving batch:`, error.message);
						} else {
							const saved = Array.isArray(data) ? data.length : jobBatch.length;
							totalSaved += saved;
							console.log(`[Jooble] Saved batch of ${jobBatch.length} jobs`);
						}
						jobBatch.length = 0; // Clear batch
					}
				} catch (jobError) {
					console.error("[Jooble] Error processing job:", jobError.message);
				}
			}

			// If we got fewer jobs than expected, likely no more pages
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
				`[Jooble] Error scraping ${keyword} in ${location.name} (page ${page}):`,
				error.message,
			);
			break; // Stop pagination on error
		}
	}

	// Save any remaining jobs in the batch
	if (jobBatch.length > 0) {
		const { error, data } = await supabase.from("jobs").upsert(jobBatch, {
			onConflict: "job_hash",
			ignoreDuplicates: false,
		});

		if (error) {
			console.error(`[Jooble] Error saving final batch:`, error.message);
		} else {
			const saved = Array.isArray(data) ? data.length : jobBatch.length;
			totalSaved += saved;
			console.log(`[Jooble] Saved final batch of ${jobBatch.length} jobs`);
		}
	}

	// Log filtering stats for debugging
	if (totalFound > 0) {
		console.log(
			`[Jooble] ${keyword} in ${location.name} stats: ${totalFound} found, ${totalSaved} saved, ` +
				`${totalFilteredEarlyCareer} filtered (early-career), ${totalFilteredProcessor} filtered (processor), ` +
				`${totalFilteredValidation} filtered (validation)`,
		);
	}

	return totalSaved;
}

/**
 * Main scraper function
 */
async function scrapeJooble() {
	const supabaseUrl =
		process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
	const supabaseKey =
		process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseKey) {
		console.error(
			"[Jooble] ❌ Supabase credentials not set. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
		);
		return;
	}

	const apiKey = process.env.JOOBLE_API_KEY || "";
	if (!apiKey) {
		console.error(
			"[Jooble] ❌ JOOBLE_API_KEY not set. Please set the JOOBLE_API_KEY environment variable.",
		);
		return;
	}

	const startTime = Date.now();
	console.log("[Jooble] 🚀 Starting scrape...");

	// Create Supabase client
	const supabase = createClient(supabaseUrl, supabaseKey);

	const queries = generateSearchQueries();

	// Limit queries to stay within API limits
	// 22 cities × 20 keywords = 440 requests per run
	// Rate limiting: 2s between requests = ~15 minutes total
	const limitedQueries = queries.slice(0, 12); // Reduced from 20 to prevent timeouts

	let totalSaved = 0;
	let errors = 0;

	// Scrape each city + keyword combo
	for (const city of CITIES) {
		for (const keyword of limitedQueries) {
			try {
				const saved = await scrapeJoobleQuery(keyword, city, supabase, apiKey);
				totalSaved += saved;

				// Rate limiting: 2 seconds between requests
				await new Promise((resolve) => setTimeout(resolve, 2000));
			} catch (error) {
				console.error(
					`[Jooble] Error with ${keyword} in ${city.name}:`,
					error.message,
				);
				errors++;
			}
		}
	}

	const duration = Date.now() - startTime;

	// Record telemetry
	recordScraperRun("jooble", totalSaved, duration, errors);

	console.log(
		`[Jooble] ✅ Complete: ${totalSaved} jobs saved in ${(duration / 1000).toFixed(1)}s`,
	);
}

// Run if called directly
if (require.main === module) {
	scrapeJooble()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error("[Jooble] Fatal error:", error);
			process.exit(1);
		});
}

module.exports = { scrapeJooble };
