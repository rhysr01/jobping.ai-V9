require("dotenv").config({ path: ".env.local" });
const axios = require("axios");
const {
	classifyEarlyCareer,
	makeJobHash,
	CAREER_PATH_KEYWORDS,
} = require("../scrapers/shared/helpers.cjs");
const { recordScraperRun } = require("../scrapers/shared/telemetry.cjs");
const {
	getAllRoles,
	getEarlyCareerRoles,
	getTopRolesByCareerPath,
} = require("../scrapers/shared/roles.cjs");

// Get all role names from signup form for matching (used in filtering)
const allFormRoles = getAllRoles().map((r) => r.toLowerCase());

/**
 * Check if job is early-career (lenient version that recognizes form roles)
 */
function isEarlyCareerJob(job) {
	const titleLower = (job.title || "").toLowerCase();
	const _descLower = (job.description || "").toLowerCase();

	// Check if it matches explicit early-career terms
	const hasEarlyTerms = classifyEarlyCareer(job);

	// Check if title matches any role from signup form (all form roles are early-career)
	const matchesFormRole = allFormRoles.some((role) => {
		const roleWords = role.split(" ").filter((w) => w.length > 3); // Skip short words like "sdr"
		return (
			roleWords.length > 0 &&
			roleWords.every((word) => titleLower.includes(word))
		);
	});

	// Accept if it has early terms OR matches a form role
	return hasEarlyTerms || matchesFormRole;
}
const scriptStart = Date.now();
let scrapeErrors = 0;

/**
 * Get country code for Adzuna API based on city name
 * Adzuna requires specific country codes in the API path
 * VALIDATES that country is supported by Adzuna API before returning
 * Adzuna supports: GB, FR, DE, IT, NL, ES, PL, AT, BE, CH, US, AU, CA, etc.
 * NOT SUPPORTED: IE (Ireland), SE (Sweden), DK (Denmark), CZ (Czech Republic),
 *                FI (Finland), NO (Norway), PT (Portugal), GR (Greece),
 *                HU (Hungary), RO (Romania), BG (Bulgaria)
 */
const ADZUNA_SUPPORTED_COUNTRIES = new Set([
	"gb", "fr", "de", "it", "nl", "es", "pl", "at", "be", "ch",
	"us", "au", "ca", "mx", "br", "in", "sg", "za", "nz", "ru"
]);

// Explicitly list unsupported countries for filtering
const ADZUNA_UNSUPPORTED_COUNTRIES = new Set([
	"ie", "se", "dk", "cz", "fi", "no", "pt", "gr", "hu", "ro", "bg"
]);

function getCountryCode(cityName, fallbackCountryCode = "gb") {
	const countryCode = fallbackCountryCode.toLowerCase();
	
	// CRITICAL: First check if country is explicitly unsupported
	if (ADZUNA_UNSUPPORTED_COUNTRIES.has(countryCode)) {
		console.warn(
			`⚠️  Adzuna: Country code '${fallbackCountryCode.toUpperCase()}' (${cityName}) is not supported by Adzuna API. Skipping.`
		);
		return null; // Signal to skip this city
	}
	
	// Validate that the country code is supported by Adzuna
	if (!ADZUNA_SUPPORTED_COUNTRIES.has(countryCode)) {
		console.warn(
			`⚠️  Adzuna: Country code '${fallbackCountryCode}' not supported for city '${cityName}'. Skipping.`
		);
		return null; // Signal to skip this city
	}
	
	// For all cities in EU_CITIES_CATEGORIES, use the provided fallback (from EU_CITIES_CATEGORIES)
	// This handles all supported countries correctly (es, de, fr, it, nl, etc.)
	return fallbackCountryCode;
}

// EU Cities - FILTERED to only Adzuna-supported countries
// Adzuna API supports: GB, FR, DE, IT, NL, ES, PL, AT, BE, CH, US, AU, CA, etc.
// NOT SUPPORTED and REMOVED:
//   IE (Ireland): Dublin, Cork
//   SE (Sweden): Stockholm
//   DK (Denmark): Copenhagen
//   CZ (Czech Republic): Prague
//   FI (Finland): Helsinki
//   NO (Norway): Oslo
//   PT (Portugal): Lisbon, Porto
//   GR (Greece): Athens
//   HU (Hungary): Budapest
//   RO (Romania): Bucharest
//   BG (Bulgaria): Sofia
const EU_CITIES_CATEGORIES = [
	{ name: "London", country: "gb" }, // ✅ High performer
	{ name: "Manchester", country: "gb" }, // 🆕 UK's 2nd largest city
	{ name: "Birmingham", country: "gb" }, // 🆕 UK's 3rd largest city
	{ name: "Madrid", country: "es" }, // ✅ High performer (prácticas goldmine)
	{ name: "Barcelona", country: "es" }, // 🆕 Spain's 2nd largest city (tech/finance hub)
	{ name: "Berlin", country: "de" }, // ✅ Moderate performer
	{ name: "Hamburg", country: "de" }, // 🆕 Germany's 2nd largest city
	{ name: "Munich", country: "de" }, // 🆕 Germany's 3rd largest city (finance/tech hub)
	{ name: "Amsterdam", country: "nl" }, // ✅ Moderate performer
	{ name: "Brussels", country: "be" }, // 🆕 EU capital (many institutions)
	{ name: "Paris", country: "fr" }, // ✅ High performer (522 jobs)
	{ name: "Zurich", country: "ch" }, // ✅ Moderate performer
	{ name: "Milan", country: "it" }, // ✅ High performer (470 jobs)
	{ name: "Rome", country: "it" }, // 🆕 Italy's capital
	{ name: "Vienna", country: "at" }, // 🆕 Central European business hub
	{ name: "Warsaw", country: "pl" }, // 🆕 Eastern European business hub
];

// Query rotation system for Adzuna - 3 different sets that rotate throughout the day
// EXPANDED to cover all role types: coordinator, assistant, representative, engineer, specialist, manager, designer, HR, legal, sustainability
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

// Determine which query set to use based on time of day
// Rotates every 8 hours: SET_A (0-7h), SET_B (8-15h), SET_C (16-23h)
// This ensures different queries if running twice a day
const getCurrentQuerySet = () => {
	const manualSet = process.env.ADZUNA_QUERY_SET;
	if (manualSet && QUERY_SETS[manualSet]) {
		console.log(`🎯 Adzuna manual query set override: ${manualSet}`);
		return manualSet;
	}

	const hour = new Date().getHours();
	if (hour >= 0 && hour < 8) return "SET_A";
	if (hour >= 8 && hour < 16) return "SET_B";
	return "SET_C";
};

const currentSet = getCurrentQuerySet();
// Note: QUERY_SETS and CORE_ENGLISH_TERMS are no longer used in generateCityQueries
// but kept for backward compatibility if referenced elsewhere
const CORE_ENGLISH_TERMS = QUERY_SETS[currentSet];
console.log(
	`🔄 Adzuna using query set: ${currentSet} - rotating between internship, graduate programme, and early career queries for career paths`,
);

// Local language terms by country (EXPANDED for better coverage - includes coordinator, assistant, representative, engineer, specialist roles)
const LOCAL_EARLY_CAREER_TERMS = {
	gb: [], // English only set is CORE_ENGLISH_TERMS
	es: [
		"programa de graduados",
		"becario",
		"prácticas",
		"junior",
		"recién graduado",
		"nivel inicial",
		"coordinador",
		"asistente",
		"representante",
		"especialista",
		"ingeniero",
		"prácticas marketing",
		"prácticas finance",
		"prácticas tech",
		"prácticas hr",
		"prácticas sostenibilidad",
	],
	de: [
		"absolvent",
		"trainee",
		"praktikant",
		"junior",
		"berufseinsteiger",
		"nachwuchskraft",
		"koordinator",
		"assistent",
		"vertreter",
		"spezialist",
		"ingenieur",
		"praktikum marketing",
		"praktikum finance",
		"praktikum tech",
		"praktikum hr",
		"praktikum nachhaltigkeit",
	],
	nl: [
		"afgestudeerde",
		"traineeship",
		"starter",
		"junior",
		"beginnend",
		"werkstudent",
		"coördinator",
		"assistent",
		"vertegenwoordiger",
		"specialist",
		"ingenieur",
		"stage marketing",
		"stage finance",
		"stage tech",
		"stage hr",
		"stage duurzaamheid",
	],
	fr: [
		"jeune diplômé",
		"stagiaire",
		"alternance",
		"junior",
		"débutant",
		"programme graduate",
		"coordinateur",
		"assistant",
		"représentant",
		"spécialiste",
		"ingénieur",
		"stagiaire marketing",
		"stagiaire finance",
		"stagiaire tech",
		"stagiaire hr",
		"stagiaire esg",
	],
	ch: [
		"absolvent",
		"trainee",
		"praktikant",
		"junior",
		"jeune diplômé",
		"stagiaire",
		"koordinator",
		"assistent",
		"vertreter",
		"spezialist",
		"ingenieur",
	],
	it: [
		"neolaureato",
		"stage",
		"tirocinio",
		"junior",
		"primo lavoro",
		"laureato",
		"coordinatore",
		"assistente",
		"rappresentante",
		"specialista",
		"ingegnere",
		"stage marketing",
		"stage finance",
		"stage tech",
		"stage hr",
		"stage sostenibilità",
	],
	ie: [], // English only set is CORE_ENGLISH_TERMS
	be: [
		"stagiaire",
		"junior",
		"débutant",
		"afgestudeerde",
		"starter",
		"coordinateur",
		"assistant",
		"représentant",
		"spécialiste",
		"ingénieur",
		"stagiaire marketing",
	], // Belgium: French + Dutch
	se: [
		"nyexaminerad",
		"trainee",
		"praktikant",
		"junior",
		"nybörjare",
		"graduate",
		"koordinator",
		"assistent",
		"representant",
		"specialist",
		"ingenjör",
	], // Swedish
	dk: [
		"nyuddannet",
		"trainee",
		"praktikant",
		"junior",
		"begynder",
		"graduate",
		"koordinator",
		"assistent",
		"repræsentant",
		"specialist",
		"ingeniør",
	], // Danish
	at: [
		"absolvent",
		"trainee",
		"praktikant",
		"junior",
		"einsteiger",
		"nachwuchskraft",
		"koordinator",
		"assistent",
		"vertreter",
		"spezialist",
		"ingenieur",
	], // Austrian German
	cz: [
		"absolvent",
		"trainee",
		"praktikant",
		"junior",
		"začátečník",
		"graduate",
		"koordinátor",
		"asistent",
		"zástupce",
		"specialista",
		"inženýr",
	], // Czech
	pl: [
		"absolwent",
		"stażysta",
		"praktykant",
		"junior",
		"początkujący",
		"graduate",
		"koordynator",
		"asystent",
		"przedstawiciel",
		"specjalista",
		"inżynier",
	], // Polish
};

// Target sectors for IE graduates
// Target sectors (TOP 3 PERFORMERS ONLY - reduced from 6 to 3)
const HIGH_PERFORMING_SECTORS = [
	"finance", // ✅ Proven: junior finance (9 jobs Madrid), prácticas finance (8 jobs Madrid)
	"marketing", // ✅ Proven: prácticas marketing (24 jobs Madrid!)
	"strategy", // ✅ Proven: prácticas strategy (7 jobs Madrid), strategy consultant (15 jobs Paris)
];

// REMOVED UNIVERSAL ZEROS: consulting (0 Madrid), tech (0 London, 0 Madrid),
// supply chain, logistics, data analytics, sustainability

/**
 * Generate career path-based queries rotating between internship, graduate programme, and early career
 * Rotates every 8 hours: SET_A (internship), SET_B (graduate programme), SET_C (early career)
 */
function generateCityQueries(countryCode) {
	const queries = [];
	const currentSet = getCurrentQuerySet();

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
	let localQueryType;
	
	if (currentSet === "SET_A") {
		// Internship queries
		queryType = "internship";
		// Local language internship terms
		if (countryCode === "es") {
			localQueryType = "prácticas";
		} else if (countryCode === "fr") {
			localQueryType = "stagiaire";
		} else if (countryCode === "de") {
			localQueryType = "praktikum";
		} else if (countryCode === "it") {
			localQueryType = "stage";
		} else if (countryCode === "nl") {
			localQueryType = "stage";
		} else {
			localQueryType = "internship";
		}
	} else if (currentSet === "SET_B") {
		// Graduate programme queries
		queryType = "graduate programme";
		// Local language graduate terms
		if (countryCode === "es") {
			localQueryType = "programa de graduados";
		} else if (countryCode === "fr") {
			localQueryType = "programme graduate";
		} else if (countryCode === "de") {
			localQueryType = "absolventenprogramm";
		} else if (countryCode === "it") {
			localQueryType = "programma per neolaureati";
		} else if (countryCode === "nl") {
			localQueryType = "traineeship";
		} else {
			localQueryType = "graduate programme";
		}
	} else {
		// Early career queries
		queryType = "early career";
		// Local language early career terms
		if (countryCode === "es") {
			localQueryType = "inicio de carrera";
		} else if (countryCode === "fr") {
			localQueryType = "début de carrière";
		} else if (countryCode === "de") {
			localQueryType = "berufseinstieg";
		} else if (countryCode === "it") {
			localQueryType = "inizio carriera";
		} else if (countryCode === "nl") {
			localQueryType = "startersfunctie";
		} else {
			localQueryType = "early career";
		}
	}

	// Generate queries for each career path
	// Limit to top 3 career paths per city to stay within API limits
	const topCareerPaths = careerPaths.slice(0, 3);
	
	for (const path of topCareerPaths) {
		// Use local language if available, otherwise English
		if (localQueryType !== queryType && countryCode !== "gb" && countryCode !== "ie") {
			queries.push(`${path} ${localQueryType}`);
		} else {
			queries.push(`${path} ${queryType}`);
		}
	}

	// Remove duplicates and return
	return [...new Set(queries)];
}

/**
 * Determine max pages based on query type (smart pagination)
 * Career path queries (e.g., "strategy internship", "finance graduate programme") - use role pages
 * Generic queries - use generic pages
 * Exact role name queries - use role pages (highest priority)
 */
function getMaxPagesForQuery(query, rolePages = null, genericPages = null) {
	// Check if it's an exact role name query (from signup form roles)
	const { getAllRoles } = require("../scrapers/shared/roles.cjs");
	const allRoles = getAllRoles().map(r => r.toLowerCase());
	const queryLower = query.toLowerCase().trim();
	const isExactRoleQuery = allRoles.some(role => {
		const roleWords = role.split(" ").filter(w => w.length > 3);
		return roleWords.length > 0 && roleWords.every(word => queryLower.includes(word));
	});
	
	// Career path queries (e.g., "strategy internship", "finance graduate programme")
	const careerPathPattern = /^(strategy|finance|sales|marketing|data|operations|product|tech|sustainability|people-hr|legal|creative|general-management)\s+(internship|graduate programme|graduate scheme|early career|prácticas|stagiaire|praktikum|stage|programa de graduados|absolventenprogramm|inicio de carrera|début de carrière|berufseinstieg)/i;
	const isCareerPathQuery = careerPathPattern.test(query.trim());

	// Use dynamic pages if provided, otherwise fall back to defaults
	if (isExactRoleQuery || isCareerPathQuery) {
		// Role-based queries (exact roles or career paths) - use role pages
		return rolePages !== null ? rolePages : parseInt(process.env.ADZUNA_MAX_PAGES_ROLE || "4", 10);
	}
	// Generic queries - use generic pages
	return genericPages !== null ? genericPages : parseInt(process.env.ADZUNA_MAX_PAGES_GENERIC || "3", 10);
}

/**
 * Scrape jobs from a single city with category-focused keywords
 */
async function scrapeCityCategories(
	cityName,
	countryCode,
	queries,
	options = {},
) {
	const {
		appId = process.env.ADZUNA_APP_ID,
		appKey = process.env.ADZUNA_APP_KEY,
		resultsPerPage = parseInt(process.env.ADZUNA_RESULTS_PER_PAGE || "50", 10), // EXPANDED: Increased from 25 to 50
		maxDaysOld = parseInt(process.env.ADZUNA_MAX_DAYS_OLD || "28", 10), // Last 28 days for wider coverage
		delay = parseInt(process.env.ADZUNA_PAGE_DELAY_MS || "800", 10),
		timeout = parseInt(process.env.ADZUNA_TIMEOUT_MS || "15000", 10),
		verbose = false,
		maxPages = null, // Will be determined per query using smart pagination
		pageDelayJitter = parseInt(
			process.env.ADZUNA_PAGE_DELAY_JITTER_MS || "0",
			10,
		),
		targetCareerPaths = [],
		rolePages = null, // Dynamic role pages per city (for low-coverage cities)
		genericPages = null, // Dynamic generic pages per city (for low-coverage cities)
	} = options;

	if (!appId || !appKey) {
		throw new Error("Missing Adzuna credentials");
	}

	const allJobs = [];
	let consecutive404s = 0;
	const MAX_CONSECUTIVE_404S = 3; // If 3 queries in a row return 404, country likely not supported

	for (const query of queries) {
		try {
			// Smart pagination: more pages for role-based queries, fewer for generic
			// Use dynamic pages if provided (for low-coverage cities), otherwise use maxPages or default
			const queryMaxPages =
				maxPages !== null ? maxPages : getMaxPagesForQuery(query, rolePages, genericPages);

			if (verbose)
				console.log(
					`📍 Searching ${cityName} for: "${query}" (max ${maxDaysOld} days, ${queryMaxPages} pages)`,
				);

			// Search multiple pages for more results
			let page = 1;
			let hasMorePages = true;

			while (hasMorePages && page <= queryMaxPages) {
				// Use getCountryCode helper to ensure correct country code for API endpoint
				// Returns null if country is not supported by Adzuna
				const apiCountryCode = getCountryCode(cityName, countryCode);
				if (!apiCountryCode) {
					// Country not supported, skip this query
					console.warn(
						`⚠️  Adzuna: Skipping ${cityName} (${countryCode.toUpperCase()}) - country not supported by Adzuna API`
					);
					break; // Skip to next query
				}
				const url = `https://api.adzuna.com/v1/api/jobs/${apiCountryCode}/search/${page}?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(query)}&where=${encodeURIComponent(cityName)}&results_per_page=${resultsPerPage}&sort_by=date&max_days_old=${maxDaysOld}`;

				let response;
				let retries = 0;
				const maxRetries = 3;

				// Retry logic for 502/503 errors (API gateway issues)
				while (retries <= maxRetries) {
					try {
						response = await axios.get(url, {
							headers: {
								"User-Agent":
									"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
							},
							timeout,
							validateStatus: (status) => status < 500, // Don't throw on 4xx errors
						});

						// If we got a response (even if error), break retry loop
						break;
					} catch (error) {
						// Network errors or 5xx errors - retry
						if (
							error.response?.status >= 500 ||
							error.code === "ECONNRESET" ||
							error.code === "ETIMEDOUT"
						) {
							retries++;
							if (retries <= maxRetries) {
								const backoffDelay = Math.min(1000 * 2 ** retries, 5000); // Exponential backoff, max 5s
								if (verbose)
									console.log(
										`   ↻ Retrying (${retries}/${maxRetries}) after ${backoffDelay}ms...`,
									);
								await new Promise((resolve) =>
									setTimeout(resolve, backoffDelay),
								);
								continue;
							}
						}
						// Re-throw if not retryable
						throw error;
					}
				}

				// Check for 404 - country code likely not supported
				if (response.status === 404) {
					consecutive404s++;
					if (consecutive404s >= MAX_CONSECUTIVE_404S) {
						console.warn(
							`⚠️  ${cityName} (${countryCode.toUpperCase()}): Country code not supported by Adzuna API (${consecutive404s} consecutive 404s). Skipping remaining queries for this city.`,
						);
						// Don't return - continue with next city instead of stopping entirely
						return allJobs; // Return jobs collected so far, but continue to next city in outer loop
					}
					// Single 404 might be query-specific, continue to next query
					break; // Skip to next query
				}

				// Check for 502/503 - API gateway errors (retry handled above, but log if still failing)
				if (response.status === 502 || response.status === 503) {
					scrapeErrors += 1;
					if (retries >= maxRetries) {
						console.error(
							`❌ Error searching ${cityName} for "${query}": HTTP ${response.status} (after ${maxRetries} retries)`,
						);
					} else {
						console.warn(
							`⚠️  ${cityName} for "${query}": HTTP ${response.status}, retrying...`,
						);
					}
					break; // Skip to next query
				}

				// Check for other HTTP errors
				if (response.status !== 200) {
					scrapeErrors += 1;
					console.error(
						`❌ Error searching ${cityName} for "${query}": HTTP ${response.status}`,
					);
					break; // Skip to next query
				}

				const jobs = response.data?.results || [];

				// Reset 404 counter on successful response
				consecutive404s = 0;

				if (jobs.length > 0) {
					if (verbose)
						console.log(
							`   ✅ Found ${jobs.length} jobs for "${query}" (page ${page})`,
						);

					// Transform jobs to our format
					const transformedJobs = jobs.map((job) => ({
						title: job.title?.trim() || "Unknown Title",
						company: job.company?.display_name?.trim() || "Unknown Company",
						location: `${cityName}, ${countryCode.toUpperCase()}`,
						description: job.description?.trim() || "",
						url: job.redirect_url || job.url || "",
						posted_at: job.created
							? new Date(job.created).toISOString()
							: new Date().toISOString(),
						source: "adzuna",
						source_job_id: job.id?.toString() || "",
						salary_min: job.salary_min || null,
						salary_max: job.salary_max || null,
						category: query, // Track which search term found this job
						search_location: cityName,
						search_country: countryCode,
					}));

					const filteredJobs = transformedJobs.filter((job) => {
						// Use lenient early-career check (recognizes form roles)
						if (!isEarlyCareerJob(job)) {
							return false;
						}

						if (!targetCareerPaths || targetCareerPaths.length === 0) {
							return true;
						}

						const lowerText =
							`${job.title || ""} ${job.description || ""}`.toLowerCase();
						return targetCareerPaths.some((path) => {
							const keywords = CAREER_PATH_KEYWORDS[path] || [];
							if (!keywords.length) return true;
							return keywords.some((keyword) => lowerText.includes(keyword));
						});
					});

					// Log filtering stats
					const filteredCount = transformedJobs.length - filteredJobs.length;
					if (filteredCount > 0) {
						if (verbose) {
							console.log(
								`   ⚠️  Filtered out ${filteredCount}/${transformedJobs.length} jobs for "${query}" (early-career check)`,
							);
						}
					}
					if (
						filteredJobs.length === 0 &&
						transformedJobs.length > 0 &&
						!verbose
					) {
						console.log(
							`   ⚠️  All ${transformedJobs.length} jobs filtered out for "${query}" (likely not early-career or form role match)`,
						);
					}

					allJobs.push(...filteredJobs);

					// Stop if we got fewer results than requested (last page)
					if (jobs.length < resultsPerPage) {
						hasMorePages = false;
					}
				} else {
					if (verbose)
						console.log(`   ⚠️  No jobs found for "${query}" (page ${page})`);
					hasMorePages = false;
				}

				page++;

				const jitter =
					pageDelayJitter > 0 ? Math.floor(Math.random() * pageDelayJitter) : 0;
				const delayMs = Math.max(0, delay + jitter);
				if (delayMs > 0) {
					await new Promise((resolve) => setTimeout(resolve, delayMs));
				}
			}
		} catch (error) {
			scrapeErrors += 1;
			// Check if it's a 404 error
			if (error.response?.status === 404) {
				consecutive404s++;
				if (consecutive404s >= MAX_CONSECUTIVE_404S) {
					console.warn(
						`⚠️  ${cityName} (${countryCode.toUpperCase()}): Country code not supported by Adzuna API (${consecutive404s} consecutive 404s). Skipping remaining queries for this city.`,
					);
					return allJobs; // Return jobs collected so far, but continue to next city in outer loop
				}
			}
			console.error(
				`❌ Error searching ${cityName} for "${query}":`,
				error.message,
			);
			// Continue with next query
		}
	}

	return allJobs;
}

/**
 * Scrape all EU cities with category-focused approach
 */
async function scrapeAllCitiesCategories(options = {}) {
	const {
		verbose = false,
		targetCities = [],
		targetCareerPaths = [],
		targetIndustries = [],
		targetRoles = [],
		includeRemote = false,
		resultsPerPage: overrideResultsPerPage,
		maxDaysOld: overrideMaxDaysOld,
		delay: overrideDelay,
		timeout: overrideTimeout,
		maxPages: overrideMaxPages,
		pageDelayJitter: overridePageDelayJitter,
		maxQueriesPerCity: overrideMaxQueriesPerCity,
	} = options;

	const normalizedTargetCities = targetCities
		.map((city) => city?.toLowerCase().trim())
		.filter(Boolean);

	const resultsPerPage =
		typeof overrideResultsPerPage === "number"
			? overrideResultsPerPage
			: parseInt(process.env.ADZUNA_RESULTS_PER_PAGE || "50", 10); // EXPANDED: Increased from 25 to 50
	const maxDaysOld =
		typeof overrideMaxDaysOld === "number"
			? overrideMaxDaysOld
			: parseInt(process.env.ADZUNA_MAX_DAYS_OLD || "28", 10);
	const delayMs =
		typeof overrideDelay === "number"
			? overrideDelay
			: parseInt(process.env.ADZUNA_PAGE_DELAY_MS || "800", 10);
	const timeoutMs =
		typeof overrideTimeout === "number"
			? overrideTimeout
			: parseInt(process.env.ADZUNA_TIMEOUT_MS || "15000", 10);
	const maxPages =
		typeof overrideMaxPages === "number"
			? overrideMaxPages
			: parseInt(process.env.ADZUNA_MAX_PAGES || "8", 10); // EXPANDED: Increased from 5 to 8 for more jobs per query
	const pageDelayJitter =
		typeof overridePageDelayJitter === "number"
			? overridePageDelayJitter
			: parseInt(process.env.ADZUNA_PAGE_DELAY_JITTER_MS || "0", 10);
	// Priority cities with low Adzuna coverage - get more queries
	// Based on database analysis: Most cities have 0 Adzuna jobs, only London has good coverage
	const LOW_COVERAGE_CITIES = new Set([
		"warsaw", "manchester", "birmingham", "brussels", "vienna", "rome",
		"zurich", "milan", "hamburg", "barcelona", "paris", "berlin",
		"madrid", "munich", "amsterdam" // Amsterdam has only 24 jobs, 0 recent
	]);
	const HIGH_COVERAGE_CITIES = new Set([
		"london" // London has 1102 Adzuna jobs, 986 recent - already well covered
	]);
	
	const baseMaxQueriesPerCity =
		typeof overrideMaxQueriesPerCity === "number"
			? overrideMaxQueriesPerCity
			: parseInt(process.env.ADZUNA_MAX_QUERIES_PER_CITY || "3", 10);

	console.log(
		`🎓 Starting multilingual early-career job search across ${EU_CITIES_CATEGORIES.length} EU cities...`,
	);
	console.log(`📅 Time range: Last 28 days for wider coverage`);
	console.log(`🌍 Languages: English + local terms per country`);
	console.log(`🏢 Target sectors: ${HIGH_PERFORMING_SECTORS.join(", ")}`);
	// Smart pagination with priority for low-coverage cities
	// Low-coverage cities: More pages to maximize job collection
	// High-coverage cities: Standard pages (already well covered)
	const baseRolePages = parseInt(process.env.ADZUNA_MAX_PAGES_ROLE || "4", 10);
	const baseGenericPages = parseInt(
		process.env.ADZUNA_MAX_PAGES_GENERIC || "3",
		10,
	);
	
	// Calculate estimated requests (weighted by city priority)
	// After removing 11 unsupported cities, we have 16 cities total
	const lowCoverageCount = EU_CITIES_CATEGORIES.filter(c => 
		LOW_COVERAGE_CITIES.has(c.name.toLowerCase())
	).length;
	const highCoverageCount = EU_CITIES_CATEGORIES.filter(c => 
		HIGH_COVERAGE_CITIES.has(c.name.toLowerCase())
	).length;
	const standardCount = EU_CITIES_CATEGORIES.length - lowCoverageCount - highCoverageCount;
	
	// Query allocation per city type:
	// Low-coverage: 5 queries (2 role queries × 6 pages + 1 generic × 5 pages) = 5 × 17 = 85 requests per city
	// High-coverage: 3 queries (2 role queries × 4 pages + 1 generic × 3 pages) = 3 × 11 = 33 requests per city  
	// Standard: 4 queries (2 role queries × 5 pages + 1 generic × 4 pages) = 4 × 14 = 56 requests per city
	const estimatedRequests = 
		(lowCoverageCount * 5 * (2 * 6 + 1 * 5)) +
		(highCoverageCount * 3 * (2 * 4 + 1 * 3)) +
		(standardCount * 4 * (2 * 5 + 1 * 4));
	
	console.log(
		`📊 City Priority Breakdown: ${lowCoverageCount} low-coverage (5 queries, 6/5 pages), ${highCoverageCount} high-coverage (3 queries, 4/3 pages), ${standardCount} standard (4 queries, 5/4 pages)`,
	);
	console.log(
		`📊 API Usage: ~${EU_CITIES_CATEGORIES.length} cities × (2 role queries × ${baseRolePages} pages + 1 generic × ${baseGenericPages} pages) = ~${estimatedRequests} calls per run`,
	);
	console.log(
		`⚠️  Free Tier Limit: 250 requests/day. Current: ~${estimatedRequests} (${estimatedRequests < 250 ? "✅ SAFE" : "❌ EXCEEDS LIMIT"})`,
	);
	console.log(
		`⚡ Strategy: Prioritizing exact role names (highest performing), smart pagination (more pages for roles)`,
	);
	console.log(
		`⚙️  Adzuna config: ${JSON.stringify({
			resultsPerPage,
			maxDaysOld,
			delayMs,
			timeoutMs,
			maxPages,
			pageDelayJitter,
			maxQueriesPerCity,
		})}`,
	);
	if (verbose) {
		console.log(`🔍 Core English terms: ${CORE_ENGLISH_TERMS.join(", ")}`);
	}

	if (normalizedTargetCities.length) {
		console.log(
			`🎯 Signup target cities (${normalizedTargetCities.length}): ${normalizedTargetCities.join(", ")}`,
		);
	}
	if (targetCareerPaths.length) {
		console.log(
			`🎯 Signup career paths (${targetCareerPaths.length}): ${targetCareerPaths.join(", ")}`,
		);
	}
	if (targetIndustries.length) {
		console.log(
			`🎯 Signup industries (${targetIndustries.length}): ${targetIndustries.join(", ")}`,
		);
	}
	if (targetRoles.length) {
		console.log(
			`🎯 Signup roles (${targetRoles.length}): ${targetRoles.join(", ")}`,
		);
	}

	const allJobs = [];
	let totalCityCount = 0;

	// Optional single-city filter via env CITY (matches by name, case-insensitive)
	const cityEnv = (process.env.CITY || "").trim().toLowerCase();
	let citiesToProcess;
	if (cityEnv) {
		citiesToProcess = EU_CITIES_CATEGORIES.filter(
			(c) => c.name.toLowerCase() === cityEnv,
		);
	} else if (normalizedTargetCities.length) {
		// Filter to only Adzuna-supported cities
		citiesToProcess = EU_CITIES_CATEGORIES.filter((c) =>
			normalizedTargetCities.includes(c.name.toLowerCase()),
		);
		
		// CRITICAL: Filter out any cities from unsupported countries
		citiesToProcess = citiesToProcess.filter((c) => {
			const countryCode = c.country.toLowerCase();
			if (ADZUNA_UNSUPPORTED_COUNTRIES.has(countryCode)) {
				console.warn(
					`⚠️  Adzuna: Skipping ${c.name} (${countryCode.toUpperCase()}) - country not supported by Adzuna API`,
				);
				return false;
			}
			return true;
		});
		
		if (citiesToProcess.length === 0) {
			console.warn(
				"⚠️  Signup cities did not match predefined EU list or were from unsupported countries; falling back to default cities",
			);
			citiesToProcess = EU_CITIES_CATEGORIES;
		}
	} else {
		citiesToProcess = EU_CITIES_CATEGORIES;
	}
	
	// Final safety check: Ensure all cities are from supported countries
	citiesToProcess = citiesToProcess.filter((c) => {
		const countryCode = c.country.toLowerCase();
		if (ADZUNA_UNSUPPORTED_COUNTRIES.has(countryCode)) {
			console.warn(
				`⚠️  Adzuna: Removing ${c.name} (${countryCode.toUpperCase()}) - country not supported by Adzuna API`,
			);
			return false;
		}
		return ADZUNA_SUPPORTED_COUNTRIES.has(countryCode);
	});

	for (const city of citiesToProcess) {
		try {
			const cityNameLower = city.name.toLowerCase();
			const isLowCoverage = LOW_COVERAGE_CITIES.has(cityNameLower);
			const isHighCoverage = HIGH_COVERAGE_CITIES.has(cityNameLower);
			
			// Dynamic query allocation based on coverage
			let cityMaxQueries, cityRolePages, cityGenericPages;
			if (isLowCoverage) {
				// Low-coverage cities: More queries and pages to maximize collection
				cityMaxQueries = baseMaxQueriesPerCity > 0 ? Math.max(baseMaxQueriesPerCity, 5) : 5;
				cityRolePages = Math.max(baseRolePages, 6); // Increased from 4 to 6
				cityGenericPages = Math.max(baseGenericPages, 5); // Increased from 3 to 5
			} else if (isHighCoverage) {
				// High-coverage cities: Standard allocation (already well covered)
				cityMaxQueries = baseMaxQueriesPerCity > 0 ? baseMaxQueriesPerCity : 3;
				cityRolePages = baseRolePages;
				cityGenericPages = baseGenericPages;
			} else {
				// Standard cities: Moderate increase
				cityMaxQueries = baseMaxQueriesPerCity > 0 ? Math.max(baseMaxQueriesPerCity, 4) : 4;
				cityRolePages = Math.max(baseRolePages, 5); // Increased from 4 to 5
				cityGenericPages = Math.max(baseGenericPages, 4); // Increased from 3 to 4
			}
			
			const cityQueries = generateCityQueries(city.country);
			const limitedCityQueries =
				cityMaxQueries > 0
					? cityQueries.slice(0, cityMaxQueries)
					: cityQueries;
			
			const priorityLabel = isLowCoverage ? "🎯 [LOW COVERAGE - PRIORITY] " : 
			                     isHighCoverage ? "✅ [HIGH COVERAGE] " : "";
			console.log(
				`\n${priorityLabel}🌍 Processing ${city.name} (${city.country.toUpperCase()}) - ${limitedCityQueries.length}/${cityQueries.length} queries, ${cityRolePages} role pages, ${cityGenericPages} generic pages...`,
			);

			const cityJobs = await scrapeCityCategories(
				city.name,
				city.country,
				limitedCityQueries,
				{
					resultsPerPage,
					maxDaysOld,
					delay: delayMs,
					timeout: timeoutMs,
					verbose,
					maxPages: null, // Use dynamic pages per query type
					pageDelayJitter,
					targetCareerPaths,
					rolePages: cityRolePages, // Pass dynamic role pages
					genericPages: cityGenericPages, // Pass dynamic generic pages
				},
			);

			if (cityJobs.length > 0) {
				allJobs.push(...cityJobs);
				console.log(
					`✅ ${city.name}: Found ${cityJobs.length} jobs (total so far: ${allJobs.length})`,
				);
			} else {
				console.log(
					`⚠️  ${city.name}: No jobs found (continuing with next city...)`,
				);
			}

			totalCityCount++;
		} catch (error) {
			scrapeErrors += 1;
			console.error(`❌ Failed to process ${city.name}:`, error.message);
			console.log(`   ↻ Continuing with next city...`);
			// Continue to next city - don't stop the entire scraper
		}
	}

	// Remove duplicates based on URL
	const uniqueJobs = allJobs.reduce((acc, job) => {
		const jobHash = makeJobHash(job);
		if (!acc.has(jobHash)) {
			acc.set(jobHash, { ...job, job_hash: jobHash });
		}
		return acc;
	}, new Map());

	let finalJobs = Array.from(uniqueJobs.values());
	if (!includeRemote) {
		finalJobs = finalJobs.filter(
			(job) =>
				!String(job.location || "")
					.toLowerCase()
					.includes("remote"),
		);
	}

	console.log(`\n📊 Multilingual Early-Career Job Search Summary:`);
	console.log(
		`   🏙️  Cities processed: ${totalCityCount}/${EU_CITIES_CATEGORIES.length}`,
	);
	console.log(`   🌍 Multilingual coverage: English + local terms`);
	console.log(`   📄 Raw jobs found: ${allJobs.length}`);
	console.log(`   ✨ Unique jobs: ${finalJobs.length}`);
	console.log(`   📅 Time range: Last 28 days`);

	return {
		jobs: finalJobs,
		totalRaw: allJobs.length,
		totalUnique: finalJobs.length,
		citiesProcessed: totalCityCount,
	};
}

// Export functions
module.exports = {
	scrapeCityCategories,
	scrapeAllCitiesCategories,
	generateCityQueries,
	getCountryCode,
	EU_CITIES_CATEGORIES,
	CORE_ENGLISH_TERMS,
	LOCAL_EARLY_CAREER_TERMS,
	HIGH_PERFORMING_SECTORS,
};

// Direct execution
if (require.main === module) {
	console.log(
		"🌍 Starting Adzuna Multilingual Early-Career Scraper with Database Saving...\n",
	);

	(async () => {
		try {
			const { createClient } = require("@supabase/supabase-js");
			// Local helpers to avoid ESM/CJS interop issues
			function localParseLocation(location) {
				const loc = String(location || "").toLowerCase();
				const isRemote =
					/\b(remote|work\s*from\s*home|wfh|anywhere|distributed|virtual)\b/i.test(
						loc,
					);
				return { isRemote };
			}
			function convertToDatabaseFormat(job) {
				const { isRemote } = localParseLocation(job.location);
				// Use lenient early-career check (recognizes form roles)
				const isEarly = isEarlyCareerJob(job);
				const job_hash = makeJobHash(job);
				const nowIso = new Date().toISOString();

				// Only save jobs that pass early-career filter (lenient - recognizes form roles)
				// If not early-career, skip this job entirely
				if (!isEarly) {
					return null; // Signal to filter out
				}

				return {
					job_hash,
					title: (job.title || "").trim(),
					company: (job.company || "").trim(),
					location: (job.location || "").trim(),
					description: (job.description || "").trim(),
					job_url: (job.url || "").trim(),
					source: (job.source || "adzuna").trim(),
					posted_at: job.posted_at || nowIso,
					categories: ["early-career"], // Always early-career since we filter
					work_environment: isRemote ? "remote" : "on-site",
					experience_required: "entry-level",
					original_posted_date: job.posted_at || nowIso,
					last_seen_at: nowIso,
					is_active: true,
					created_at: nowIso,
				};
			}

			const supabase = createClient(
				process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
				process.env.SUPABASE_SERVICE_ROLE_KEY,
			);

			const results = await scrapeAllCitiesCategories({ verbose: true });

			// Convert and deduplicate jobs by job_hash before saving
			// Respect remote exclusion preference
			const includeRemote =
				String(process.env.INCLUDE_REMOTE || "").toLowerCase() !== "false";
			const filteredJobs = includeRemote
				? results.jobs
				: results.jobs.filter((j) => !localParseLocation(j.location).isRemote);
			const dbJobs = filteredJobs
				.map((job) => {
					const dbJob = convertToDatabaseFormat(job);
					if (!dbJob) return null; // Filter out non-early-career jobs
					const { metadata, ...clean } = dbJob;
					return clean;
				})
				.filter((job) => job !== null); // Remove null entries

			// Deduplicate by job_hash to prevent "cannot affect row a second time" error
			const uniqueJobs = dbJobs.reduce((acc, job) => {
				if (!acc.has(job.job_hash)) {
					acc.set(job.job_hash, job);
				}
				return acc;
			}, new Map());

			const finalJobs = Array.from(uniqueJobs.values());
			console.log(
				`🔍 Deduplication: ${dbJobs.length} → ${finalJobs.length} unique jobs by hash`,
			);

			let savedCount = 0;
			let skippedCount = 0;
			const batchSize = 50;

			for (let i = 0; i < finalJobs.length; i += batchSize) {
				const batch = finalJobs.slice(i, i + batchSize);

				console.log(
					`💾 Saving batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(finalJobs.length / batchSize)} (${batch.length} jobs)...`,
				);

				const { data, error } = await supabase
					.from("jobs")
					.upsert(batch, { onConflict: "job_hash", ignoreDuplicates: true })
					.select("id");

				if (!error) {
					const inserted = Array.isArray(data) ? data.length : 0;
					const skipped = batch.length - inserted;
					savedCount += inserted;
					skippedCount += skipped;
					console.log(
						`✅ Inserted ${inserted}, Skipped ${skipped} (already in DB) - Cumulative: ${savedCount} new, ${skippedCount} existing`,
					);
				} else {
					console.error("❌ Batch error:", error.message);
				}
			}

			// Print canonical success line for orchestrator with clear breakdown
			console.log(`\n📊 Adzuna Processing Complete:`);
			console.log(`   ✅ ${savedCount} NEW jobs saved to database`);
			console.log(
				`   ⏭️  ${skippedCount} jobs already existed (skipped duplicates)`,
			);
			console.log(`   📈 Total processed: ${finalJobs.length} unique jobs`);
			console.log(`\n✅ Adzuna: ${savedCount} jobs processed`);
			recordScraperRun(
				"adzuna",
				savedCount,
				Date.now() - scriptStart,
				scrapeErrors,
			);
		} catch (error) {
			console.error("❌ Adzuna category scraping failed:", error.message);
			recordScraperRun("adzuna", 0, Date.now() - scriptStart, scrapeErrors + 1);
			process.exit(1);
		}
	})();
}
