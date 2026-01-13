#!/usr/bin/env node

/**
 * Save CAREER PATH ROLES from JobSpy to Supabase (EU cities)
 * - Runs JobSpy per city with career path-specific terms (graduate, entry-level, junior)
 * - Parses CSV output
 * - Filters to career path roles (graduate programs, entry-level, junior positions)
 * - Upserts into 'jobs' table using job_hash
 * - Source: "jobspy-career-roles"
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
			// Enhanced network error detection
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
				throw error; // Don't retry non-network errors or on last attempt
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

// Cities to scrape (EU focus)
const EU_CITIES = [
	"London, United Kingdom",
	"Berlin, Germany",
	"Munich, Germany",
	"Paris, France",
	"Amsterdam, Netherlands",
	"Madrid, Spain",
	"Barcelona, Spain",
	"Milan, Italy",
	"Vienna, Austria",
	"Zurich, Switzerland",
	"Brussels, Belgium",
	"Hamburg, Germany",
	"Frankfurt, Germany",
	"Stockholm, Sweden",
	"Copenhagen, Denmark",
	"Warsaw, Poland",
	"Prague, Czech Republic",
	"Budapest, Hungary",
	"Rome, Italy",
	"Dublin, Ireland",
];

// Classify job as career path role - CAREER PATH ROLES VERSION
function isCareerPathRole(title, description) {
	if (!title && !description) return false;

	const text = `${title || ""} ${description || ""}`.toLowerCase();

	// Career path indicators (graduate, entry-level, junior roles) - ONLY these matter for this scraper
	const careerPathTerms = [
		"graduate",
		"entry level",
		"entry-level",
		"junior",
		"recent graduate",
		"early career",
		"graduate programme",
		"graduate program",
		"graduate scheme",
		"graduate training",
		"associate",
		"analyst",
		"coordinator",
		"specialist",
		"officer",
		"representative",
		"consultant",
		"assistant",
		"trainee",
		"apprentice",
		"developmental",
		"development",
		"rotational",
		"fast track",
		"leadership development",
		"management trainee",
		"professional development",
		"career starter",
		"young professional",
	];

	// Must contain at least one career path term
	const hasCareerPathTerm = careerPathTerms.some(term => text.includes(term));

	// Exclude internships (this is for career path roles, not internships)
	const internshipTerms = ["intern", "internship", "stage", "praktikum", "prácticas"];
	const isInternship = internshipTerms.some(term => text.includes(term));

	return hasCareerPathTerm && !isInternship;
}

async function main() {
	try {
		console.log("🎯 Starting JobSpy Career Path Roles scraper...");

		// Check Python/JobSpy availability
		try {
			const result = spawnSync("python3", ["-c", "import jobspy; print('JobSpy available')"], {
				timeout: 5000,
			});
			if (result.status !== 0) {
				console.error("❌ JobSpy Python package not installed");
				process.exit(1);
			}
		} catch {
			console.error("❌ JobSpy Python package not available");
			process.exit(1);
		}

		const supabase = getSupabase();
		let totalSaved = 0;

		for (const city of EU_CITIES) {
			console.log(`\n🏙️  Processing ${city}...`);

			try {
				// Career path search terms (focus on graduate/entry-level roles)
				const searchTerms = [
					"graduate",
					"entry level",
					"junior",
					"recent graduate",
					"early career",
					"graduate programme",
					"associate",
					"junior analyst",
					"junior consultant",
				];

				const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];

				console.log(`🔍 Searching for "${term}" in ${city}...`);

				// Run JobSpy
				const result = spawnSync(
					"python3",
					[
						"-c",
						`
import jobspy
import pandas as pd
import sys

try:
    jobs = jobspy.scrape_jobs(
        site_name=["indeed", "glassdoor"],
        search_term="${term}",
        location="${city}",
        results_wanted=50,
        hours_old=168,  # Last 7 days
        country_indeed="UK" if "United Kingdom" in "${city}" else None
    )

    if jobs is not None and len(jobs) > 0:
        # Convert to CSV format
        csv_data = jobs.to_csv(index=False)
        print("SUCCESS")
        print(csv_data)
    else:
        print("NO_JOBS")
except Exception as e:
    print(f"ERROR: {str(e)}")
    sys.exit(1)
						`,
					],
					{
						timeout: 120000, // 2 minutes
						maxBuffer: 1024 * 1024 * 10, // 10MB buffer
					},
				);

				if (result.error || result.status !== 0) {
					console.warn(`⚠️  JobSpy failed for ${city}:`, result.error?.message || result.stderr?.toString());
					continue;
				}

				const output = result.stdout.toString();
				if (!output.includes("SUCCESS")) {
					console.log(`ℹ️  No jobs found for ${city}`);
					continue;
				}

				// Parse CSV
				const lines = output.split("\n");
				const csvStartIndex = lines.findIndex(line => line.includes("title,company,"));
				if (csvStartIndex === -1) continue;

				const csvData = lines.slice(csvStartIndex).join("\n");
				const jobs = [];

				try {
					const { parse } = require("csv-parse/sync");
					jobs.push(...parse(csvData, {
						columns: true,
						skip_empty_lines: true,
					}));
				} catch (parseError) {
					console.warn(`⚠️  CSV parse error for ${city}:`, parseError.message);
					continue;
				}

				console.log(`📊 Found ${jobs.length} raw jobs for ${city}`);

				// Process and filter jobs
				const qualityFiltered = [];
				let processedCount = 0;
				let filtered = 0;
				let saved = 0;

				for (const j of jobs) {
					try {
						processedCount++;

						// Skip if missing critical fields
						if (!j.title || !j.company || !j.job_url) {
							console.log(`[JobSpy Debug] Missing fields for job: title="${j.title}", company="${j.company}", job_url="${j.job_url}"`);
							continue;
						}

						// Check if it's a career path role
						if (!isCareerPathRole(j.title, j.description)) {
							filtered++;
							continue;
						}

						// Ensure minimum description length for quality
						let description = (j.description || "").trim();
						if (description.length < 20) {
							description =
								`${j.title || ""} at ${j.company || ""}. ${description}`.trim();
						}

						// Process through standardization pipe
						const processedJob = processIncomingJob(
							{
								title: j.title,
								company: j.company,
								location: j.location,
								description: description,
								url: j.job_url || j.url,
								posted_at: j.posted_at,
							},
							{
								source: "jobspy-career-roles",
							},
						);

						if (processedJob) {
							qualityFiltered.push(processedJob);
							saved++;
						} else {
							filtered++;
						}
					} catch (error) {
						console.warn(`⚠️  Error processing job:`, error.message);
						filtered++;
					}
				}

				console.log(`📊 ${city}: ${processedCount} processed, ${filtered} filtered, ${saved} saved`);

				// Batch save to database
				if (qualityFiltered.length > 0) {
					const batchSize = 10;
					for (let i = 0; i < qualityFiltered.length; i += batchSize) {
						const slice = qualityFiltered.slice(i, i + batchSize);

						await retryWithBackoff(async () => {
							const { error } = await supabase.from("jobs").upsert(slice, {
								onConflict: "job_hash",
								ignoreDuplicates: false,
							});

							if (error) {
								console.error(`❌ Database error for ${city} batch ${Math.floor(i / batchSize) + 1}:`, error);
								throw error;
							}
						});
					}

					console.log(
						`✅ ${city}: Saved ${qualityFiltered.length} career path role jobs (total so far: ${totalSaved + qualityFiltered.length})`,
					);
					totalSaved += qualityFiltered.length;
				}

				// Rate limiting - be gentle with JobSpy
				await new Promise(resolve => setTimeout(resolve, 2000));

			} catch (error) {
				console.error(`❌ Error processing ${city}:`, error.message);
				continue;
			}
		}

		console.log(`\n🎉 JobSpy Career Path Roles scraping complete!`);
		console.log(`📊 Total career path role jobs saved: ${totalSaved}`);

	} catch (error) {
		console.error("❌ JobSpy Career Path Roles scraper failed:", error.message);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}
