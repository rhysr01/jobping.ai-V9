#!/usr/bin/env node

/**
 * Save INTERNSHIP-ONLY jobs from JobSpy to Supabase (EU cities)
 * - Runs JobSpy per city with internship-specific terms only
 * - Parses CSV output
 * - Filters to ONLY internships (is_internship = true)
 * - Upserts into 'jobs' table using job_hash
 * - Source: "jobspy-internships"
 */

// Load environment variables conditionally
// In production/GitHub Actions, env vars are already set
if (process.env.NODE_ENV !== "production" && !process.env.GITHUB_ACTIONS) {
    require("dotenv").config({ path: ".env.local" });
}
const { spawnSync } = require("node:child_process");
const { createClient } = require("@supabase/supabase-js");
const { processIncomingJob } = require("../scrapers/shared/processor.cjs");

function getSupabase() {
	const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key =
		process.env.SUPABASE_SERVICE_ROLE_KEY ||
		process.env.SUPABASE_ANON_KEY ||
		process.env.SUPABASE_KEY;
	if (!url || !key)
		throw new Error(
			"Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/ANON_KEY",
		);

	// Use global fetch with timeout wrapper if available
	const fetchWithTimeout =
		typeof fetch !== "undefined"
			? async (fetchUrl, fetchOptions = {}) => {
					const timeout = 60000; // 60 seconds
					const controller = new AbortController();
					const timeoutId = setTimeout(() => controller.abort(), timeout);

					try {
						const response = await fetch(fetchUrl, {
							...fetchOptions,
							signal: controller.signal,
						});
						clearTimeout(timeoutId);
						return response;
					} catch (error) {
						clearTimeout(timeoutId);
						if (
							error instanceof TypeError &&
							error.message?.includes("fetch failed")
						) {
							const networkError = new Error(`Network error: ${error.message}`);
							networkError.name = "NetworkError";
							networkError.cause = error;
							throw networkError;
						}
						throw error;
					}
				}
			: undefined;

	return createClient(url, key, {
		auth: { persistSession: false },
		db: { schema: "public" },
		...(fetchWithTimeout ? { global: { fetch: fetchWithTimeout } } : {}),
	});
}

// Retry helper with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			const errorMessage = error?.message || String(error || "");
			const errorName = error?.name || "";
			const isNetworkError =
				errorName === "NetworkError" ||
				errorName === "AbortError" ||
				errorName === "TypeError" ||
				errorMessage.toLowerCase().includes("fetch failed") ||
				errorMessage.toLowerCase().includes("network") ||
				errorMessage.toLowerCase().includes("timeout") ||
				errorMessage.toLowerCase().includes("econnrefused") ||
				errorMessage.toLowerCase().includes("enotfound") ||
				errorMessage.toLowerCase().includes("econnreset") ||
				errorMessage.toLowerCase().includes("etimedout") ||
				(error instanceof TypeError &&
					errorMessage.toLowerCase().includes("fetch"));

			if (!isNetworkError || attempt === maxRetries - 1) {
				throw error;
			}

			const delay = baseDelay * 2 ** attempt;
			console.warn(
				`⚠️  Network error (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`,
				errorMessage,
			);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}
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

// Parse location to extract city and country (same as jobspy-save.cjs)
function _parseLocation(location) {
	if (!location) return { city: "", country: "" };
	const loc = location.toLowerCase().trim();

	const isRemote = /remote|work\s+from\s+home|wfh|anywhere/i.test(loc);
	if (isRemote) return { city: "", country: "", isRemote: true };

	const euCities = new Set([
		"dublin",
		"london",
		"paris",
		"amsterdam",
		"manchester",
		"birmingham",
		"madrid",
		"barcelona",
		"berlin",
		"hamburg",
		"munich",
		"zurich",
		"milan",
		"rome",
		"brussels",
		"stockholm",
		"copenhagen",
		"vienna",
		"prague",
		"warsaw",
	]);

	const parts = loc
		.split(",")
		.map((p) => p.trim())
		.filter(Boolean);
	let city = parts.length > 0 ? parts[0] : loc;
	let country = parts.length > 1 ? parts[parts.length - 1] : "";

	city = city.replace(/\s+(eng|gb|de|fr|es|it|nl|be|ch|ie|se|dk|at|cz|pl)$/i, "");

	if (parts.length === 1 && euCities.has(city)) {
		country = "";
	}

	if (country) {
		const countryMap = {
			eng: "GB",
			england: "GB",
			"united kingdom": "GB",
			uk: "GB",
			"great britain": "GB",
			de: "DE",
			germany: "DE",
			deutschland: "DE",
			fr: "FR",
			france: "FR",
			es: "ES",
			spain: "ES",
			españa: "ES",
			it: "IT",
			italy: "IT",
			italia: "IT",
			nl: "NL",
			netherlands: "NL",
			holland: "NL",
			be: "BE",
			belgium: "BE",
			belgië: "BE",
			belgique: "BE",
			ch: "CH",
			switzerland: "CH",
			schweiz: "CH",
			suisse: "CH",
			ie: "IE",
			ireland: "IE",
			éire: "IE",
			se: "SE",
			sweden: "SE",
			sverige: "SE",
			dk: "DK",
			denmark: "DK",
			danmark: "DK",
			at: "AT",
			austria: "AT",
			österreich: "AT",
			cz: "CZ",
			"czech republic": "CZ",
			czechia: "CZ",
			pl: "PL",
			poland: "PL",
			polska: "PL",
		};
		const normalizedCountry = country.toLowerCase();
		country = countryMap[normalizedCountry] || country.toUpperCase();
	}

	const capitalizedCity = city
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");

	return {
		city: capitalizedCity || city,
		country: country || "",
	};
}

// Classify job as internship - INTERNSHIPS ONLY VERSION
function _classifyJobType(job) {
	const title = (job.title || "").toLowerCase();
	const description = (
		job.description ||
		job.company_description ||
		job.skills ||
		""
	).toLowerCase();
	const _text = `${title} ${description}`;

	// Internship indicators (multilingual) - ONLY these matter for this scraper
	const internshipTerms = [
		"intern",
		"internship",
		"stage",
		"praktikum",
		"prácticas",
		"tirocinio",
		"stagiaire",
		"stagiar",
		"becario",
		"werkstudent",
		"placement",
		"summer intern",
		"winter intern",
		"co-op",
		"coop",
		"summer internship",
		"spring internship",
		"fall internship",
		"student position",
		"working student",
		"praktikant",
		"absolvent praktikum",
		"student job",
		"studentenjob",
	];

	// Check for internship - MUST match for this scraper
	const isInternship = internshipTerms.some(
		(term) => title.includes(term) || description.includes(term),
	);

	// This scraper ONLY saves internships, so isGraduate is always false
	return { isInternship, isGraduate: false };
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

async function saveJobs(jobs, source) {
	const supabase = getSupabase();
	const nonRemote = jobs.filter(
		(j) => !(j.location || "").toLowerCase().includes("remote"),
	);
	const rows = nonRemote.map((j) => {
		let description = (
			(j.description && j.description.trim().length > 50
				? j.description
				: "") ||
			j.company_description ||
			"" ||
			j.skills ||
			""
		).trim();

		if (description.length < 100 && (j.company_description || j.skills)) {
			const parts = [];
			if (description) parts.push(description);
			if (
				j.company_description &&
				!description.includes(j.company_description)
			) {
				parts.push(j.company_description);
			}
			if (j.skills && !description.includes(j.skills)) {
				parts.push(j.skills);
			}
			description = parts.join(" ").trim();
		}

		if (description.length < 20) {
			description =
				`${j.title || ""} at ${j.company || ""}. ${description}`.trim();
		}

		const processed = processIncomingJob(
			{
				title: j.title,
				company: j.company,
				location: j.location,
				description: description,
				url: j.job_url || j.url,
				posted_at: j.posted_at,
			},
			{
				source,
			},
		);

		// CRITICAL: Check if processing returned null (job was filtered out, e.g., job board)
		if (!processed) {
			return null; // Skip this job
		}

		// CRITICAL: Only save if it's classified as an internship
		const { isInternship } = _classifyJobType({
			title: j.title,
			description: description,
			company_description: j.company_description,
			skills: j.skills,
		});

		// If not an internship, skip it
		if (!isInternship) {
			return null;
		}

		// Build categories array - internships get "internship" category
		const { CAREER_PATH_KEYWORDS } = require("../scrapers/shared/helpers.cjs");
		let categories = ["early-career", "internship"];

		const fullText = `${(j.title || "").toLowerCase()} ${description.toLowerCase()}`;
		const {
			addCategoryFromPath,
			validateAndFixCategories,
		} = require("../scrapers/shared/categoryMapper.cjs");

		Object.entries(CAREER_PATH_KEYWORDS).forEach(([path, keywords]) => {
			const keywordLower = keywords.map((k) => k.toLowerCase());
			if (keywordLower.some((kw) => fullText.includes(kw))) {
				categories = addCategoryFromPath(path, categories);
			}
		});

		categories = validateAndFixCategories(categories);

		const job_hash = hashJob(j.title, processed.company, j.location);

		return {
			...processed,
			job_hash,
			categories,
			is_internship: true, // Force internship flag
		};
	}).filter(Boolean); // Remove null entries (non-internships)

	// CRITICAL: Use comprehensive validator
	const { validateJobs } = require("../scrapers/shared/jobValidator.cjs");
	const validationResult = validateJobs(rows);

	console.log(
		`📊 Validation: ${validationResult.stats.total} total, ${validationResult.stats.valid} valid, ${validationResult.stats.invalid} invalid, ${validationResult.stats.autoFixed} auto-fixed`,
	);
	if (validationResult.stats.invalid > 0) {
		console.warn(`⚠️ Invalid jobs:`, validationResult.stats.errors);
	}
	if (validationResult.stats.autoFixed > 0) {
		console.log(`✅ Auto-fixed issues:`, validationResult.stats.warnings);
	}

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
		`📊 Validated: ${rows.length} → ${validatedRows.length} → ${unique.length} unique internships`,
	);

	let savedCount = 0;
	let failedCount = 0;

	const BATCH_SIZE = 50;
	for (let i = 0; i < unique.length; i += BATCH_SIZE) {
		const slice = unique.slice(i, i + BATCH_SIZE);

		try {
			const result = await retryWithBackoff(
				async () => {
					try {
						const upsertResult = await supabase.from("jobs").upsert(slice, {
							onConflict: "job_hash",
							ignoreDuplicates: false,
						});

						if (upsertResult.error) {
							const isNetworkError =
								upsertResult.error.message?.includes("fetch failed") ||
								upsertResult.error.message?.includes("network") ||
								upsertResult.error.message?.includes("timeout") ||
								upsertResult.error.message?.includes("ECONNREFUSED") ||
								upsertResult.error.message?.includes("ENOTFOUND") ||
								upsertResult.error.message?.includes("ETIMEDOUT");
							if (isNetworkError) {
								throw upsertResult.error;
							}
						}
						return upsertResult;
					} catch (error) {
						const errorMessage = error?.message || String(error || "");
						const errorName = error?.name || "";
						const errorCode = error?.code || error?.cause?.code || "";

						const isNetworkException =
							(errorName === "TypeError" &&
								errorMessage.includes("fetch failed")) ||
							errorName === "NetworkError" ||
							errorName === "AbortError" ||
							errorCode === "UND_ERR_CONNECT_TIMEOUT" ||
							errorCode === "UND_ERR_SOCKET" ||
							errorCode === "UND_ERR_REQUEST_TIMEOUT" ||
							errorMessage.toLowerCase().includes("fetch failed") ||
							errorMessage.toLowerCase().includes("network") ||
							errorMessage.toLowerCase().includes("timeout");

						if (isNetworkException) {
							throw error;
						}
						throw error;
					}
				},
				5,
				2000,
			);

			if (result.error) {
				console.error(
					`❌ Upsert error (batch ${Math.floor(i / BATCH_SIZE) + 1}):`,
					result.error.message,
				);
				failedCount += slice.length;
			} else {
				const savedCountInBatch = result.data
					? result.data.length
					: slice.length;
				console.log(
					`✅ Saved ${savedCountInBatch} internships (batch ${Math.floor(i / BATCH_SIZE) + 1})`,
				);
				savedCount += savedCountInBatch;
			}
		} catch (error) {
			console.error(
				`❌ Fatal upsert error after retries (batch ${Math.floor(i / BATCH_SIZE) + 1}):`,
				error.message,
			);
			failedCount += slice.length;
		}
	}

	console.log(
		`📊 Save summary: ${savedCount} internships saved, ${failedCount} failed out of ${unique.length} total`,
	);
	return savedCount;
}

function pickPythonCommand() {
	if (process.env.PYTHON) {
		console.log(`✅ Using Python from PYTHON env: ${process.env.PYTHON}`);
		return process.env.PYTHON;
	}

	const scriptPath = require("node:path").join(
		__dirname,
		"run-jobspy-python.sh",
	);
	if (require("node:fs").existsSync(scriptPath)) {
		console.log(`✅ Using Python wrapper: ${scriptPath}`);
		return scriptPath;
	}

	const directPath = "/opt/homebrew/opt/python@3.11/bin/python3.11";
	if (require("node:fs").existsSync(directPath)) {
		console.log(`✅ Using Python: ${directPath}`);
		return directPath;
	}

	console.warn("⚠️  Python 3.11 not found - jobspy may fail");
	return "python3";
}

async function main() {
	console.log("🎓 JobSpy Internships-Only Scraper");
	console.log("===================================");

	// INTERNSHIP-SPECIFIC QUERIES ONLY
	// Multilingual internship terms
	const INTERNSHIP_TERMS_EN = [
		"intern",
		"internship",
		"summer internship",
		"spring internship",
		"fall internship",
		"winter internship",
		"co-op",
		"coop",
		"placement",
		"student position",
		"working student",
		"student job",
		"internship program",
		"internship programme",
	];

	// Local language internship terms
	const CITY_LOCAL_INTERNSHIPS = {
		London: [],
		Manchester: [],
		Birmingham: [],
		Madrid: [
			"prácticas",
			"becario",
			"prácticas marketing",
			"prácticas finance",
			"prácticas tech",
			"prácticas hr",
		],
		Barcelona: [
			"prácticas",
			"becario",
			"prácticas marketing",
		],
		Berlin: [
			"praktikum",
			"praktikant",
			"werkstudent",
			"praktikum marketing",
			"praktikum finance",
			"praktikum tech",
			"praktikum hr",
		],
		Hamburg: [
			"praktikum",
			"praktikant",
			"werkstudent",
		],
		Munich: [
			"praktikum",
			"praktikant",
			"werkstudent",
		],
		Amsterdam: [
			"stage",
			"traineeship",
			"werkstudent",
			"stage marketing",
			"stage finance",
			"stage tech",
			"stage hr",
		],
		Brussels: [
			"stagiaire",
			"stage",
			"stagiaire marketing",
		],
		Paris: [
			"stagiaire",
			"stage",
			"alternance",
			"stagiaire marketing",
			"stagiaire finance",
			"stagiaire tech",
			"stagiaire hr",
		],
		Zurich: [
			"praktikum",
			"praktikant",
			"stagiaire",
			"stage",
		],
		Milan: [
			"stage",
			"tirocinio",
			"stage marketing",
			"stage finance",
			"stage tech",
			"stage hr",
		],
		Rome: [
			"stage",
			"tirocinio",
		],
		Dublin: [],
		Belfast: [],
		Stockholm: [
			"praktikant",
			"praktik",
		],
		Copenhagen: [
			"praktikant",
			"praktik",
		],
		Vienna: [
			"praktikum",
			"praktikant",
		],
		Prague: [
			"praktikant",
			"praktika",
		],
		Warsaw: [
			"stażysta",
			"praktykant",
			"staż",
		],
	};

	const PRIORITY_CITIES = [
		"Stockholm",
		"Copenhagen",
		"Vienna",
		"Prague",
		"Warsaw",
		"Belfast",
	];
	const OTHER_CITIES = [
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
	const cities = [...PRIORITY_CITIES, ...OTHER_CITIES];

	const MAX_Q_PER_CITY = parseInt(process.env.JOBSPY_INTERNSHIPS_MAX_Q_PER_CITY || "4", 10);
	const PRIORITY_MAX_Q = parseInt(
		process.env.JOBSPY_INTERNSHIPS_PRIORITY_MAX_Q || "6",
		10,
	);
	const RESULTS_WANTED = parseInt(
		process.env.JOBSPY_INTERNSHIPS_RESULTS_WANTED || "50",
		10,
	);
	const PRIORITY_RESULTS_WANTED = parseInt(
		process.env.JOBSPY_INTERNSHIPS_PRIORITY_RESULTS || "75",
		10,
	);
	const JOBSPY_TIMEOUT_MS = parseInt(
		process.env.JOBSPY_TIMEOUT_MS || "20000",
		10,
	);

	const pythonCmd = pickPythonCommand();

	async function runJobSpyScraper(pythonCode, label) {
		let py;
		let tries = 0;
		const maxTries = 3;

		while (tries < maxTries) {
			tries++;
			if (tries > 1) {
				const backoffDelay = 2 ** (tries - 2) * 1000;
				console.log(
					`↻ Retrying ${label} (${tries}/${maxTries}) after ${backoffDelay}ms...`,
				);
				await new Promise((resolve) => setTimeout(resolve, backoffDelay));
			}

			py = spawnSync(pythonCmd, ["-c", pythonCode], {
				encoding: "utf8",
				timeout: JOBSPY_TIMEOUT_MS,
				env: { ...process.env, PATH: process.env.PATH },
			});

			if (py.status === 0) break;

			const stderrText = (py.stderr || "").toLowerCase();
			const stdoutText = (py.stdout || "").toLowerCase();
			const errorText = stderrText + stdoutText;

			const expectedErrors = [
				"ziprecruiter response status code 403",
				"geoblocked-gdpr",
				"glassdoor is not available for",
				"not available in the european union",
				"gdpr",
			];

			const isExpectedError = expectedErrors.some((err) =>
				errorText.includes(err),
			);

			if (isExpectedError) {
				console.log(`ℹ️  Expected error (GDPR/Geo restriction) - continuing...`);
				break;
			} else {
				console.error(
					`${label} Python error:`,
					py.stderr?.trim() || py.stdout?.trim() || `status ${py.status}`,
				);
			}
		}

		if (py && py.status === 0) {
			const rows = parseCsv(py.stdout);
			return rows;
		}
		return [];
	}

	// Quality filtering - MUST be internship
	const hasFields = (j) =>
		(j.title || "").trim().length > 3 &&
		(j.company || "").trim().length > 1 &&
		(j.location || "").trim().length > 3 &&
		(j.job_url || j.url || "").trim().startsWith("http");

	function filterInternshipJobs(jobs) {
		let kept = 0;
		let filteredOut = 0;
		let noFields = 0;
		let notInternship = 0;

		const result = jobs.filter((j) => {
			if (!hasFields(j)) {
				noFields++;
				return false;
			}

			// CRITICAL: Must be classified as internship
			const { isInternship } = _classifyJobType({
				title: j.title,
				description: j.description || j.company_description || j.skills || "",
				company_description: j.company_description,
				skills: j.skills,
			});

			if (!isInternship) {
				notInternship++;
				// DEBUG: Log first few non-internship jobs to understand the data
				if (notInternship <= 3) {
					console.log(`   🚫 Not internship: "${j.title}" - ${j.company || 'Unknown'}`);
				}
				return false; // Reject non-internships
			}

			kept++;
			return true;
		});

		// Log filtering summary
		console.log(`   📊 Internship filtering: ${kept} kept, ${filteredOut + noFields + notInternship} filtered (${noFields} no fields, ${notInternship} not internships)`);

		return result;
	}

	let totalSaved = 0;

	for (const city of cities) {
		const cityResults = [];
		const isPriority = PRIORITY_CITIES.includes(city);
		const maxQueries = isPriority ? PRIORITY_MAX_Q : MAX_Q_PER_CITY;
		const resultsWanted = isPriority ? PRIORITY_RESULTS_WANTED : RESULTS_WANTED;
		const localized = CITY_LOCAL_INTERNSHIPS[city] || [];

		const country =
			city === "London" || city === "Manchester" || city === "Birmingham" || city === "Belfast"
				? "united kingdom"
				: city === "Paris"
					? "france"
					: city === "Madrid" || city === "Barcelona"
						? "spain"
						: city === "Berlin" || city === "Hamburg" || city === "Munich"
							? "germany"
							: city === "Amsterdam"
								? "netherlands"
								: city === "Brussels"
									? "belgium"
									: city === "Zurich"
										? "switzerland"
										: city === "Dublin"
											? "ireland"
											: city === "Milan" || city === "Rome"
												? "italy"
												: city === "Stockholm"
													? "sweden"
													: city === "Copenhagen"
														? "denmark"
														: city === "Vienna"
															? "austria"
															: city === "Prague"
																? "czech republic"
																: city === "Warsaw"
																	? "poland"
																	: "europe";

		const priorityLabel = isPriority ? "🎯 [PRIORITY] " : "";

		// Build internship query batch
		const allInternshipTerms = [...INTERNSHIP_TERMS_EN, ...localized];
		const internshipBatch = `("${allInternshipTerms.join('" OR "')}")`;

		console.log(
			`\n${priorityLabel}📦 Searching internships in ${city} using: "${internshipBatch.substring(0, 80)}..."`,
		);

		// Indeed search
		const GLASSDOOR_BLOCKED_CITIES = [
			"Stockholm",
			"Copenhagen",
			"Prague",
			"Warsaw",
		];
		const indeedSites = ["indeed"];
		if (!GLASSDOOR_BLOCKED_CITIES.includes(city)) {
			indeedSites.push("glassdoor");
		}

		const indeedPython = `
from jobspy import scrape_jobs
import pandas as pd
df = scrape_jobs(
  site_name=${JSON.stringify(indeedSites)},
  search_term='''${internshipBatch.replace(/'/g, "''")}''',
  location='''${city}''',
  country_indeed='''${country}''',
  results_wanted=${resultsWanted},
  hours_old=720,
  distance=20
)
import sys
print('Available columns:', list(df.columns), file=sys.stderr)
desc_cols = ['description', 'job_description', 'full_description', 'job_details', 'details']
desc_col = None
for col in desc_cols:
    if col in df.columns:
        desc_col = col
        break
if desc_col is None:
    df['description'] = df.apply(lambda x: ' '.join(filter(None, [
        str(x.get('company_description', '') or ''),
        str(x.get('skills', '') or ''),
        str(x.get('job_function', '') or ''),
        str(x.get('job_type', '') or '')
    ])), axis=1)
else:
    df['description'] = df.apply(lambda x: (
        str(x.get(desc_col, '') or '') or 
        str(x.get('company_description', '') or '') or
        str(x.get('skills', '') or '')
    ), axis=1)
cols=[c for c in ['title','company','location','job_url','description','company_description','skills'] if c in df.columns]
print(df[cols].to_csv(index=False))
`;

		const indeedRows = await runJobSpyScraper(
			indeedPython,
			`Indeed [${city}]`,
		);
		if (indeedRows && indeedRows.length > 0) {
			console.log(
				`→ Indeed [${city}]: Collected ${indeedRows.length} rows`,
			);
			indeedRows.forEach((r) => cityResults.push(r));
		}

		// Save after each city
		if (cityResults.length > 0) {
			console.log(`\n💾 Processing ${cityResults.length} jobs for ${city}...`);

			// DEBUG: Log sample job structure
			if (cityResults.length > 0) {
				console.log(`   📋 Sample job structure:`, {
					title: cityResults[0].title,
					company: cityResults[0].company,
					description_length: cityResults[0].description?.length || 0,
					has_description: !!cityResults[0].description,
					has_company_description: !!cityResults[0].company_description,
					has_skills: !!cityResults[0].skills
				});
			}

			const internshipFiltered = filterInternshipJobs(cityResults);
			console.log(
				`   ✅ ${internshipFiltered.length}/${cityResults.length} jobs are internships`,
			);

			if (internshipFiltered.length > 0) {
				console.log(
					`💾 Saving ${internshipFiltered.length} internships for ${city} to Supabase...`,
				);
				try {
					const saved = await saveJobs(internshipFiltered, "jobspy-internships");
					totalSaved += saved || internshipFiltered.length;
					console.log(
						`✅ ${city}: Saved ${internshipFiltered.length} internships (total so far: ${totalSaved})`,
					);
				} catch (error) {
					console.error(`❌ ${city}: Failed to save internships:`, error.message);
				}
			} else {
				console.log(`⚠️  ${city}: No internships found`);
			}
		} else {
			console.log(`⚠️  ${city}: No jobs collected`);
		}

		if (cities.indexOf(city) < cities.length - 1) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}

	console.log(`\n🎉 Internship scraping complete!`);
	console.log(`📊 Total internships saved: ${totalSaved}`);
	console.log(`✅ JobSpy Internships: total_saved=${totalSaved}`);
	console.log("✅ Done");
}

main().catch((e) => {
	console.error("Fatal:", e);
	process.exit(1);
});

module.exports = {
	main,
};

