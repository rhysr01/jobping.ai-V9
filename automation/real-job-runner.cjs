#!/usr/bin/env node

// REAL JobPing Automation - This Actually Works
const cron = require("node-cron");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

// Initialize language detection (simple version)
// const { initLang } = require('../scrapers/lang');

// Check if running in single-run mode (for GitHub Actions)
const SINGLE_RUN_MODE =
	process.argv.includes("--single-run") ||
	process.env.GITHUB_ACTIONS === "true";
const SKIP_ADZUNA =
	process.argv.includes("--skip-adzuna") || process.env.SKIP_ADZUNA === "true";

// Load environment variables
require("dotenv").config({ path: ".env.local" });

// Check required environment variables (support both public and server URL vars)
const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
	process.env.SUPABASE_SERVICE_ROLE_KEY ||
	process.env.SUPABASE_ANON_KEY ||
	process.env.SUPABASE_KEY;
const requiredEnvVars = {
	SUPABASE_URL: SUPABASE_URL,
	"SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY)": SUPABASE_KEY,
};

// Validate environment variables
for (const [key, value] of Object.entries(requiredEnvVars)) {
	if (!value) {
		console.error(`❌ Missing required environment variable: ${key}`);
		console.error("Please set this variable in your environment");
		process.exit(1);
	}
}

console.log("✅ Environment variables loaded successfully");
console.log(`📡 Supabase URL: ${SUPABASE_URL ? "Set" : "Missing"}`);
console.log(`🔑 Supabase Key: ${SUPABASE_KEY ? "Set" : "Missing"}`);

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("✅ Supabase client initialized successfully");

// Import extracted business logic and orchestration modules
const {
	getCycleJobTarget,
	getScraperTargets,
	shouldStopCycle,
	hasScraperReachedTarget,
} = require("./business-logic/quota-manager.cjs");
const { resolveTargets } = require("./business-logic/target-resolver.cjs");
const { collectCycleStats } = require("./orchestration/stats-collector.cjs");

class RealJobRunner {
	constructor() {
		this.isRunning = false;
		this.lastRun = null;
		this.totalJobsSaved = 0;
		this.runCount = 0;
		this.currentCycleStats = { total: 0, perSource: {} };
		this.embeddingRefreshRunning = false;
		this.lastEmbeddingRefresh = null;
		this.lastStatsCheck = null; // Cache for stats to reduce DB queries
	}

	async runEmbeddingRefresh(trigger = "cron", processFullQueue = true) {
		if (this.embeddingRefreshRunning) {
			console.log(
				`⚠️  Embedding refresh already in progress, skipping (${trigger})`,
			);
			return;
		}

		// Use TypeScript version with tsx for proper module resolution
		const command =
			process.env.EMBEDDING_REFRESH_COMMAND ||
			"npx tsx scripts/generate_all_embeddings.ts";

		console.log(
			`\n🧠 Starting embedding refresh (${trigger}) using "${command}" at ${new Date().toISOString()}`,
		);
		if (processFullQueue) {
			console.log("📋 Will process entire embedding queue until empty");
		}
		this.embeddingRefreshRunning = true;

		try {
			const { stdout, stderr } = await execAsync(command, {
				cwd: process.cwd(),
				env: process.env,
				timeout: 1800000, // 30 minutes timeout for full queue processing
			});

			if (stdout) process.stdout.write(stdout);
			if (stderr) process.stderr.write(stderr);

			this.lastEmbeddingRefresh = new Date();
			console.log(
				`✅ Embedding refresh complete at ${this.lastEmbeddingRefresh.toISOString()}`,
			);
		} catch (error) {
			console.error("❌ Embedding refresh failed:", error);
			if (error.code === "ETIMEDOUT") {
				console.error(
					"⚠️  Embedding refresh timed out after 30 minutes - queue may be very large",
				);
			}
		} finally {
			this.embeddingRefreshRunning = false;
		}
	}

	async getSignupTargets() {
		try {
			const { data, error } = await supabase
				.from("users")
				.select("target_cities, career_path, industries, roles_selected")
				.eq("subscription_active", true);

			if (error) {
				console.error("⚠️  Failed to fetch signup targets:", error.message);
				return { cities: [], careerPaths: [], industries: [], roles: [] };
			}

			// Use extracted target resolver
			const targets = resolveTargets(data || []);

			// Note: We don't provide default cities here because each scraper has its own defaults:
			// - Reed: UK/Ireland cities (London, Manchester, Birmingham, Belfast, Dublin)
			// - CareerJet: EU cities (Dublin, Cork, Belfast, London, Manchester, Edinburgh, Paris, Berlin, Munich, Amsterdam, Madrid, Barcelona, Milan, Rome, Lisbon, Brussels)
			// - Arbeitnow: DACH cities (Germany, Austria, Switzerland)
			// - Adzuna: EU_CITIES_CATEGORIES (20 cities)
			// - JobSpy: Has its own comprehensive city list
			// Each scraper will use its own defaults if TARGET_CITIES is empty

			console.log("🎯 Signup-driven targets ready", {
				citiesPreview: targets.cities.slice(0, 10),
				totalCities: targets.cities.length,
				totalCareerPaths: targets.careerPaths.length,
				totalIndustries: targets.industries.length,
				totalRoles: targets.roles.length,
				note:
					targets.cities.length === 0
						? "Scrapers will use their own default city lists"
						: "Scrapers will filter to their supported cities",
			});

			return targets;
		} catch (error) {
			console.error(
				"⚠️  Unexpected error collecting signup targets:",
				error.message,
			);
			// Return empty arrays - scrapers will use their own defaults
			return { cities: [], careerPaths: [], industries: [], roles: [] };
		}
	}

	// Methods removed - now using extracted modules:
	// getCycleJobTarget() -> use getCycleJobTarget() from quota-manager
	// getScraperTargets() -> use getScraperTargets() from quota-manager
	// collectCycleStats() -> use collectCycleStats() from stats-collector

	async collectCycleStats(sinceIso) {
		// Use extracted stats collector with caching to avoid redundant queries
		// Only refresh if more than 30 seconds have passed since last check
		const now = Date.now();
		if (
			this.lastStatsCheck &&
			now - this.lastStatsCheck < 30000 &&
			this.currentCycleStats
		) {
			return this.currentCycleStats;
		}
		const stats = await collectCycleStats(supabase, sinceIso);
		this.currentCycleStats = stats;
		this.lastStatsCheck = now;
		return stats;
	}

	async evaluateStopCondition(stage, sinceIso, scraperName = null) {
		const stats = await this.collectCycleStats(sinceIso);
		console.log(
			`📈 ${stage}: ${stats.total} unique job hashes ingested this cycle`,
		);

		// Use extracted quota manager for global cycle check
		if (shouldStopCycle(stats)) {
			const globalTarget = getCycleJobTarget();
			console.log(
				`🎯 Global cycle job target (${globalTarget}) reached after ${stage}; skipping remaining scrapers.`,
			);
			return true;
		}

		// Check per-scraper target if scraper name provided
		if (scraperName) {
			if (hasScraperReachedTarget(stats, scraperName)) {
				const scraperTargets = getScraperTargets();
				const scraperTarget = scraperTargets[scraperName];
				const scraperJobs = stats.perSource[scraperName] || 0;
				console.log(
					`🎯 Scraper ${scraperName} target (${scraperTarget}) reached (${scraperJobs} jobs); moving to next scraper.`,
				);
				// Don't stop the whole cycle, just this scraper
				return false;
			}
		}

		return false;
	}

	// Actually run your working scrapers
	async runAdzunaScraper(targets) {
		try {
			console.log("🔄 Running Adzuna scraper...");
			console.log(
				"⚠️  CRITICAL: Adzuna represents 52% of total jobs - monitoring closely",
			);

			// Check API keys before running
			if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
				console.error(
					"🚨 CRITICAL: Adzuna API keys missing! Check ADZUNA_APP_ID and ADZUNA_APP_KEY in .env.local",
				);
				return 0;
			}

			// Call standardized wrapper for consistent output
			const env = {
				...process.env,
				NODE_ENV: "production",
			};
			if (targets?.cities?.length) {
				env.TARGET_CITIES = JSON.stringify(targets.cities);
			}
			if (targets?.careerPaths?.length) {
				env.TARGET_CAREER_PATHS = JSON.stringify(targets.careerPaths);
			}
			if (targets?.industries?.length) {
				env.TARGET_INDUSTRIES = JSON.stringify(targets.industries);
			}
			if (targets?.roles?.length) {
				env.TARGET_ROLES = JSON.stringify(targets.roles);
			}

			const { stdout, stderr } = await this.withTimeout(
				execAsync("node scrapers/wrappers/adzuna-wrapper.cjs", {
					cwd: process.cwd(),
					timeout: 120000, // 2 minutes - reduced from 10min, if API doesn't respond in 2min it's broken
					env,
				}),
				120000, // Reduced from 600000 (10min) to 120000 (2min)
				"Adzuna scraper",
			);

			// Log stderr if present (might contain important warnings)
			if (stderr?.trim()) {
				console.warn("⚠️  Adzuna stderr:", stderr.substring(0, 500));
			}

			// Parse canonical success line - try multiple patterns
			let jobsSaved = 0;
			const canonical = stdout.match(/✅ Adzuna: (\d+) jobs saved to database/);
			if (canonical) {
				jobsSaved = parseInt(canonical[1]);
			} else {
				// Try alternative patterns
				const altMatch = stdout.match(/Adzuna.*?(\d+).*?jobs.*?saved/i);
				if (altMatch) {
					jobsSaved = parseInt(altMatch[1]);
				} else {
					// Fallback to DB count (last 10 minutes to account for slower scrapes)
					const { count, error } = await supabase
						.from("jobs")
						.select("id", { count: "exact", head: false })
						.eq("source", "adzuna")
						.gte(
							"created_at",
							new Date(Date.now() - 10 * 60 * 1000).toISOString(),
						);
					jobsSaved = error ? 0 : count || 0;
					if (jobsSaved > 0) {
						console.log(`ℹ️  Adzuna: DB fallback count: ${jobsSaved} jobs`);
					} else {
						console.warn(
							"⚠️  Adzuna: No jobs found in DB - scraper may have failed silently or filtered all jobs",
						);
						// Show last 20 lines of output for debugging
						const lines = stdout.split("\n").filter((l) => l.trim());
						if (lines.length > 0) {
							console.log("📋 Last output lines:", lines.slice(-20).join("\n"));
						}
					}
				}
			}

			if (jobsSaved === 0) {
				console.warn(
					"⚠️  WARNING: Adzuna returned 0 jobs - investigate if this is expected",
				);
			}

			console.log(`✅ Adzuna: ${jobsSaved} jobs processed`);
			return jobsSaved;
		} catch (error) {
			console.error("❌ Adzuna scraper failed:", error.message);
			console.error("❌ Stack:", error.stack);
			console.error(
				"🚨 CRITICAL: Adzuna failure impacts 52% of job volume - investigate immediately!",
			);
			return 0;
		}
	}

	// Run JobSpy scraper for early-career jobs
	async runJobSpyScraper() {
		try {
			console.log("🔄 Running JobSpy scraper...");

			// Pre-flight check: Verify Python and JobSpy (with timeout)
			try {
				const pythonCheck = await this.withTimeout(
					execAsync("python3 --version", { timeout: 5000 }),
					5000,
					"Python check",
				);
				console.log(`✅ Python check: ${pythonCheck.stdout.trim()}`);
			} catch {
				console.error("❌ Python not found - JobSpy requires Python 3.11");
				return 0;
			}

			try {
				await this.withTimeout(
					execAsync('python3 -c "import jobspy"', {
						timeout: 5000,
						stdio: "ignore",
					}),
					5000,
					"JobSpy import check",
				);
				console.log("✅ JobSpy Python package available");
			} catch {
				console.error(
					"❌ JobSpy Python package not installed - run: pip install python-jobspy",
				);
				return 0;
			}

			// Call standardized wrapper with timeout protection
			const { stdout, stderr } = await this.withTimeout(
				execAsync(
					"NODE_ENV=production node scrapers/wrappers/jobspy-wrapper.cjs",
					{
						cwd: process.cwd(),
						timeout: 600000, // 10 minutes timeout (reduced from 20)
						env: { ...process.env },
					},
				),
				120000, // Reduced from 600000 (10min) to 120000 (2min)
				"JobSpy scraper",
			);

			// Log stderr if present (might contain important info)
			if (stderr?.trim()) {
				console.warn("⚠️  JobSpy stderr:", stderr.substring(0, 1000));
			}

			// Parse job count from the result - try multiple patterns
			let jobsSaved = 0;
			const savedMatch = stdout.match(/✅ JobSpy: total_saved=(\d+)/);
			if (savedMatch) {
				jobsSaved = parseInt(savedMatch[1]);
			} else {
				// Try alternative patterns
				const altMatch = stdout.match(/total_saved[=:](\d+)/i);
				if (altMatch) {
					jobsSaved = parseInt(altMatch[1]);
				} else {
					// Fallback to DB count (last 10 minutes)
					const { count, error } = await supabase
						.from("jobs")
						.select("id", { count: "exact", head: false })
						.eq("source", "jobspy-indeed")
						.gte(
							"created_at",
							new Date(Date.now() - 10 * 60 * 1000).toISOString(),
						);
					jobsSaved = error ? 0 : count || 0;
					if (jobsSaved > 0) {
						console.log(`ℹ️  JobSpy: DB fallback count: ${jobsSaved} jobs`);
					} else {
						console.warn(
							"⚠️  JobSpy: No jobs found in DB - scraper may have filtered all jobs or found none",
						);
						// Show last 30 lines of output for debugging
						const lines = stdout.split("\n").filter((l) => l.trim());
						if (lines.length > 0) {
							console.log("📋 Last output lines:", lines.slice(-30).join("\n"));
						}
						// Also check if script completed
						if (stdout.includes("Done") || stdout.includes("Complete")) {
							console.log(
								"ℹ️  Script completed but no jobs saved - likely filtering issue",
							);
						} else {
							console.log("⚠️  Script may not have completed successfully");
						}
					}
				}
			}

			console.log(`✅ JobSpy: ${jobsSaved} jobs processed`);
			return jobsSaved;
		} catch (error) {
			console.error("❌ JobSpy scraper failed:", error.message);
			if (error.code === "ETIMEDOUT") {
				console.error("❌ JobSpy scraper timed out after 20 minutes");
			}
			console.error("❌ Error code:", error.code);
			if (error.stdout) {
				console.error("❌ stdout:", error.stdout.substring(0, 500));
			}
			if (error.stderr) {
				console.error("❌ stderr:", error.stderr.substring(0, 500));
			}
			return 0;
		}
	}

	// Run JobSpy Internships-Only scraper
	async runJobSpyInternshipsScraper() {
		try {
			console.log("🎓 Running JobSpy Internships-Only scraper...");

			// Check if file exists before running
			const fs = require("fs");
			const path = require("path");
			const scriptPath = path.join(
				process.cwd(),
				"scripts",
				"jobspy-internships-only.cjs",
			);
			if (!fs.existsSync(scriptPath)) {
				console.error(
					`❌ JobSpy Internships scraper file not found: ${scriptPath}`,
				);
				console.error(
					"⚠️  This scraper is currently disabled. To enable, create the file or update the runner.",
				);
				return 0;
			}

			const { stdout, stderr } = await this.withTimeout(
				execAsync(
					"NODE_ENV=production node scripts/jobspy-internships-only.cjs",
					{
						cwd: process.cwd(),
						timeout: 600000, // 10 minutes timeout (reduced from 20)
						env: { ...process.env },
					},
				),
				120000, // Reduced from 600000 (10min) to 120000 (2min)
				"JobSpy Internships scraper",
			);

			// Log stderr if present
			if (stderr?.trim()) {
				console.warn(
					"⚠️  JobSpy Internships stderr:",
					stderr.substring(0, 1000),
				);
			}

			// Parse job count from the result
			let jobsSaved = 0;
			const savedMatch = stdout.match(
				/✅ JobSpy Internships: total_saved=(\d+)/,
			);
			if (savedMatch) {
				jobsSaved = parseInt(savedMatch[1]);
			} else {
				// Fallback to DB count (last 10 minutes)
				const { count, error } = await supabase
					.from("jobs")
					.select("id", { count: "exact", head: false })
					.eq("source", "jobspy-internships")
					.gte(
						"created_at",
						new Date(Date.now() - 10 * 60 * 1000).toISOString(),
					);
				jobsSaved = error ? 0 : count || 0;
				if (jobsSaved) {
					console.log(
						`ℹ️  JobSpy Internships: DB fallback count: ${jobsSaved} jobs`,
					);
				} else {
					console.warn(
						"⚠️  JobSpy Internships: No jobs found - showing last output",
					);
					const lines = stdout.split("\n").filter((l) => l.trim());
					if (lines.length > 0) {
						console.log("📋 Last output:", lines.slice(-20).join("\n"));
					}
				}
			}

			console.log(`✅ JobSpy Internships: ${jobsSaved} jobs processed`);
			return jobsSaved;
		} catch (error) {
			console.error("❌ JobSpy Internships scraper failed:", error.message);
			if (error.code === "ETIMEDOUT") {
				console.error(
					"❌ JobSpy Internships scraper timed out after 20 minutes",
				);
			}
			if (error.stdout)
				console.error("❌ stdout:", error.stdout.substring(0, 500));
			if (error.stderr)
				console.error("❌ stderr:", error.stderr.substring(0, 500));
			return 0;
		}
	}

	// Run JobSpy Career Path Roles scraper (searches for all roles across career paths)
	async runJobSpyCareerPathRolesScraper(targets) {
		try {
			console.log("🎯 Running JobSpy Career Path Roles scraper...");

			// Check if file exists before running
			const fs = require("fs");
			const path = require("path");
			const scriptPath = path.join(
				process.cwd(),
				"scripts",
				"jobspy-career-path-roles.cjs",
			);
			if (!fs.existsSync(scriptPath)) {
				console.warn(
					`⚠️  JobSpy Career Path Roles scraper file not found: ${scriptPath}`,
				);
				console.warn(
					"⚠️  Skipping JobSpy Career Path Roles scraper - file does not exist. This scraper is currently disabled.",
				);
				return 0; // Return early, don't try to execute
			}

			const env = {
				...process.env,
				NODE_ENV: "production",
			};
			if (targets?.cities?.length) {
				env.TARGET_CITIES = JSON.stringify(targets.cities);
			}

			const { stdout, stderr } = await this.withTimeout(
				execAsync(
					"NODE_ENV=production node scripts/jobspy-career-path-roles.cjs",
					{
						cwd: process.cwd(),
						timeout: 600000, // 10 minutes timeout (reduced from 20)
						env,
					},
				),
				120000, // Reduced from 600000 (10min) to 120000 (2min)
				"Career Path Roles scraper",
			);

			// Log stderr if present
			if (stderr?.trim()) {
				console.warn("⚠️  Career Path Roles stderr:", stderr.substring(0, 1000));
			}

			// Parse job count from the result
			let jobsSaved = 0;
			const savedMatch = stdout.match(
				/✅ Career Path Roles: total_saved=(\d+)/,
			);
			if (savedMatch) {
				jobsSaved = parseInt(savedMatch[1]);
			} else {
				// Fallback to DB count (last 10 minutes)
				const { count, error } = await supabase
					.from("jobs")
					.select("id", { count: "exact", head: false })
					.eq("source", "jobspy-career-roles")
					.gte(
						"created_at",
						new Date(Date.now() - 10 * 60 * 1000).toISOString(),
					);
				jobsSaved = error ? 0 : count || 0;
				if (jobsSaved) {
					console.log(
						`ℹ️  Career Path Roles: DB fallback count: ${jobsSaved} jobs`,
					);
				} else {
					console.warn(
						"⚠️  Career Path Roles: No jobs found - showing last output",
					);
					const lines = stdout.split("\n").filter((l) => l.trim());
					if (lines.length > 0) {
						console.log("📋 Last output:", lines.slice(-20).join("\n"));
					}
				}
			}

			console.log(`✅ Career Path Roles: ${jobsSaved} jobs processed`);
			return jobsSaved;
		} catch (error) {
			console.error("❌ Career Path Roles scraper failed:", error.message);
			if (error.code === "ETIMEDOUT") {
				console.error(
					"❌ Career Path Roles scraper timed out after 20 minutes",
				);
			}
			if (error.stdout)
				console.error("❌ stdout:", error.stdout.substring(0, 500));
			if (error.stderr)
				console.error("❌ stderr:", error.stderr.substring(0, 500));
			return 0;
		}
	}

	// Run Reed scraper with real API
	async runReedScraper(targets) {
		try {
			console.log("🔄 Running Reed scraper...");

			// Check API key before running
			if (!process.env.REED_API_KEY) {
				console.error(
					"🚨 CRITICAL: Reed API key missing! Check REED_API_KEY in .env.local",
				);
				return 0;
			}

			const env = {
				...process.env,
				NODE_ENV: "production",
			};
			if (targets?.cities?.length) {
				env.TARGET_CITIES = JSON.stringify(targets.cities);
			}
			if (targets?.careerPaths?.length) {
				env.TARGET_CAREER_PATHS = JSON.stringify(targets.careerPaths);
			}
			if (targets?.industries?.length) {
				env.TARGET_INDUSTRIES = JSON.stringify(targets.industries);
			}
			if (targets?.roles?.length) {
				env.TARGET_ROLES = JSON.stringify(targets.roles);
			}

			const { stdout, stderr } = await this.withTimeout(
				execAsync("node scrapers/wrappers/reed-wrapper.cjs", {
					cwd: process.cwd(),
					timeout: 300000,
					env,
				}),
				300000,
				"Reed scraper",
			);

			// Log stderr if present
			if (stderr?.trim()) {
				console.warn("⚠️  Reed stderr:", stderr.substring(0, 500));
			}

			let reedJobs = 0;
			const match = stdout.match(/✅ Reed: (\d+) jobs saved to database/);
			if (match) {
				reedJobs = parseInt(match[1]);
			} else {
				// Fallback to DB count (last 10 minutes)
				const { count, error } = await supabase
					.from("jobs")
					.select("id", { count: "exact", head: false })
					.eq("source", "reed")
					.gte(
						"created_at",
						new Date(Date.now() - 10 * 60 * 1000).toISOString(),
					);
				reedJobs = error ? 0 : count || 0;
				if (reedJobs > 0) {
					console.log(`ℹ️  Reed: DB fallback count: ${reedJobs} jobs`);
				} else {
					console.warn(
						"⚠️  Reed: No jobs found in DB - scraper may have failed silently",
					);
				}
			}

			console.log(`✅ Reed: ${reedJobs} jobs processed`);
			return reedJobs;
		} catch (error) {
			console.error("❌ Reed scraper failed:", error.message);
			console.error("❌ Stack:", error.stack);
			return 0;
		}
	}

	// Run CareerJet scraper
	async runCareerJetScraper() {
		try {
			console.log("🔄 Running CareerJet scraper...");

			// Check API key before running
			if (!process.env.CAREERJET_API_KEY) {
				console.error(
					"🚨 CRITICAL: CareerJet API key missing! Check CAREERJET_API_KEY in .env.local",
				);
				return 0;
			}
			console.log("✅ CareerJet API key present");

			const { stdout, stderr } = await this.withTimeout(
				execAsync("node scrapers/careerjet.cjs", {
					cwd: process.cwd(),
					timeout: 600000, // 10 minutes timeout
					env: { ...process.env },
				}),
				120000, // Reduced from 600000 (10min) to 120000 (2min)
				"CareerJet scraper",
			);

			// Log stderr if present
			if (stderr?.trim()) {
				console.warn("⚠️  CareerJet stderr:", stderr.substring(0, 1000));
			}

			// Log full output for debugging (first 500 chars)
			if (stdout) {
				console.log("📋 CareerJet output preview:", stdout.substring(0, 500));
			}

			let jobsSaved = 0;
			const match = stdout.match(
				/\[CareerJet\] ✅ Complete: (\d+) jobs saved in/,
			);
			if (match) {
				jobsSaved = parseInt(match[1]);
			} else {
				// Check for error messages
				if (
					stdout.includes("❌") ||
					stdout.includes("Error") ||
					stdout.includes("error")
				) {
					console.warn("⚠️  CareerJet output contains errors - check full logs");
					const errorLines = stdout
						.split("\n")
						.filter(
							(l) =>
								l.includes("❌") ||
								l.includes("Error") ||
								l.includes("error") ||
								l.includes("CRITICAL"),
						);
					if (errorLines.length > 0) {
						console.warn(
							"⚠️  CareerJet errors:",
							errorLines.slice(0, 10).join("\n"),
						);
					}
				}

				// Fallback to DB count (last 10 minutes)
				const { count, error } = await supabase
					.from("jobs")
					.select("id", { count: "exact", head: false })
					.eq("source", "careerjet")
					.gte(
						"created_at",
						new Date(Date.now() - 10 * 60 * 1000).toISOString(),
					);
				jobsSaved = error ? 0 : count || 0;
				if (jobsSaved > 0) {
					console.log(`ℹ️  CareerJet: DB fallback count: ${jobsSaved} jobs`);
				} else {
					console.warn(
						"⚠️  CareerJet: No jobs found in DB - scraper may have failed silently",
					);
					console.warn("⚠️  Check CareerJet API response and error logs above");
				}
			}

			console.log(`✅ CareerJet: ${jobsSaved} jobs processed`);
			return jobsSaved;
		} catch (error) {
			console.error("❌ CareerJet scraper failed:", error.message);
			if (error.code === "ETIMEDOUT") {
				console.error("❌ CareerJet scraper timed out after 10 minutes");
			}
			if (error.stdout)
				console.error("❌ stdout:", error.stdout.substring(0, 500));
			if (error.stderr)
				console.error("❌ stderr:", error.stderr.substring(0, 500));
			return 0;
		}
	}

	// Run Arbeitnow scraper
	async runArbeitnowScraper() {
		try {
			console.log("🔄 Running Arbeitnow scraper...");

			// Check if file exists
			const fs = require("fs");
			const path = require("path");
			const scriptPath = path.join(process.cwd(), "scrapers", "arbeitnow.cjs");
			if (!fs.existsSync(scriptPath)) {
				console.error(`❌ Arbeitnow scraper file not found: ${scriptPath}`);
				return 0;
			}

			const { stdout, stderr } = await this.withTimeout(
				execAsync("node scrapers/arbeitnow.cjs", {
					cwd: process.cwd(),
					timeout: 600000, // 10 minutes timeout
					env: { ...process.env },
				}),
				120000, // Reduced from 600000 (10min) to 120000 (2min)
				"Arbeitnow scraper",
			);

			// Log stderr if present
			if (stderr?.trim()) {
				console.warn("⚠️  Arbeitnow stderr:", stderr.substring(0, 500));
			}

			// Log full output for debugging if no match found
			if (stdout && !stdout.includes("[Arbeitnow] ✅ Complete")) {
				console.log("📋 Arbeitnow output preview:", stdout.substring(0, 1000));
			}

			let jobsSaved = 0;
			const match = stdout.match(
				/\[Arbeitnow\] ✅ Complete: (\d+) jobs saved in/,
			);
			if (match) {
				jobsSaved = parseInt(match[1]);
			} else {
				// Check for error messages in output
				if (
					stdout.includes("❌") ||
					stdout.includes("Error") ||
					stdout.includes("Fatal error")
				) {
					console.warn("⚠️  Arbeitnow output contains errors - check full logs");
					const errorLines = stdout
						.split("\n")
						.filter((line) => /❌|Error|error|Fatal/i.test(line))
						.slice(0, 5);
					if (errorLines.length > 0) {
						console.warn("   Error details:", errorLines.join(" | "));
					}
				}

				// Fallback to DB count (last 10 minutes)
				const { count, error } = await supabase
					.from("jobs")
					.select("id", { count: "exact", head: false })
					.eq("source", "arbeitnow")
					.gte(
						"created_at",
						new Date(Date.now() - 10 * 60 * 1000).toISOString(),
					);
				jobsSaved = error ? 0 : count || 0;
				if (jobsSaved > 0) {
					console.log(`ℹ️  Arbeitnow: DB fallback count: ${jobsSaved} jobs`);
				} else {
					console.warn(
						"⚠️  Arbeitnow: No jobs found in DB - scraper may have failed silently",
					);
				}
			}

			console.log(`✅ Arbeitnow: ${jobsSaved} jobs processed`);
			return jobsSaved;
		} catch (error) {
			console.error("❌ Arbeitnow scraper failed:", error.message);
			if (error.code === "ETIMEDOUT") {
				console.error("❌ Arbeitnow scraper timed out after 10 minutes");
			}
			if (error.stdout) {
				console.error("❌ stdout:", error.stdout.substring(0, 500));
			}
			if (error.stderr) {
				console.error("❌ stderr:", error.stderr.substring(0, 500));
			}
			return 0;
		}
	}

	// Run Jooble scraper
	async runJoobleScraper() {
		try {
			console.log("🔄 Running Jooble scraper...");

			// Check if file exists
			const fs = require("fs");
			const path = require("path");
			const scriptPath = path.join(process.cwd(), "scrapers", "jooble.cjs");
			if (!fs.existsSync(scriptPath)) {
				console.error(`❌ Jooble scraper file not found: ${scriptPath}`);
				return 0;
			}

			const { stdout, stderr } = await this.withTimeout(
				execAsync("node scrapers/jooble.cjs", {
					cwd: process.cwd(),
					timeout: 600000, // 10 minutes timeout
					env: { ...process.env },
				}),
				120000, // Reduced from 600000 (10min) to 120000 (2min)
				"Jooble scraper",
			);

			// Log stderr if present
			if (stderr?.trim()) {
				console.warn("⚠️  Jooble stderr:", stderr.substring(0, 500));
			}

			// Log full output for debugging if no match found
			if (stdout && !stdout.includes("[Jooble] ✅ Complete")) {
				console.log("📋 Jooble output preview:", stdout.substring(0, 1000));
			}

			let jobsSaved = 0;
			const match = stdout.match(/\[Jooble\] ✅ Complete: (\d+) jobs saved in/);
			if (match) {
				jobsSaved = parseInt(match[1]);
			} else {
				// Check for error messages in output
				if (
					stdout.includes("❌") ||
					stdout.includes("Error") ||
					stdout.includes("Fatal error")
				) {
					console.warn("⚠️  Jooble output contains errors - check full logs");
					const errorLines = stdout
						.split("\n")
						.filter((line) => /❌|Error|error|Fatal/i.test(line))
						.slice(0, 5);
					if (errorLines.length > 0) {
						console.warn("   Error details:", errorLines.join(" | "));
					}
				}

				// Fallback to DB count (last 10 minutes)
				const { count, error } = await supabase
					.from("jobs")
					.select("id", { count: "exact", head: false })
					.eq("source", "jooble")
					.gte(
						"created_at",
						new Date(Date.now() - 10 * 60 * 1000).toISOString(),
					);
				jobsSaved = error ? 0 : count || 0;
				if (jobsSaved > 0) {
					console.log(`ℹ️  Jooble: DB fallback count: ${jobsSaved} jobs`);
				} else {
					console.warn(
						"⚠️  Jooble: No jobs found in DB - scraper may have failed silently",
					);
				}
			}

			console.log(`✅ Jooble: ${jobsSaved} jobs processed`);
			return jobsSaved;
		} catch (error) {
			console.error("❌ Jooble scraper failed:", error.message);
			if (error.code === "ETIMEDOUT") {
				console.error("❌ Jooble scraper timed out after 10 minutes");
			}
			if (error.stdout) {
				console.error("❌ stdout:", error.stdout.substring(0, 500));
			}
			if (error.stderr) {
				console.error("❌ stderr:", error.stderr.substring(0, 500));
			}
			return 0;
		}
	}

	// Run Indeed scraper
	// Indeed scraper removed - not working properly

	// Removed deprecated scrapers: JSearch, Ashby, Muse
	// Current active scrapers: JobSpy (Indeed/Glassdoor), Adzuna, Reed, CareerJet, Arbeitnow, Jooble

	// Run SERP API scraper
	async runSerpAPIScraper() {
		try {
			console.log("🔍 Running SERP API scraper...");

			// Use the SERP API scraper with smart strategies
			if (
				!fs.existsSync("scrapers/serp-api-scraper.ts") &&
				!fs.existsSync("scrapers/serp-api-scraper.js")
			) {
				console.log("⚠️ SERP API scraper not found, skipping");
				return 0;
			}
			const serpCmd = fs.existsSync("scrapers/serp-api-scraper.ts")
				? "npx -y tsx scrapers/serp-api-scraper.ts"
				: "node scrapers/serp-api-scraper.js";
			const { stdout } = await execAsync(serpCmd, {
				cwd: process.cwd(),
				timeout: 600000, // 10 minutes timeout for API calls
				env: { ...process.env },
			});

			const jobMatch = stdout.match(
				/✅ SERP API: (\d+) jobs saved to database/,
			);
			const jobsSaved = jobMatch ? parseInt(jobMatch[1]) : 0;
			if (!jobsSaved) {
				if (stdout.includes("API key missing")) {
					console.log("❌ SERP API: Missing API key");
				} else if (stdout.toLowerCase().includes("quota exceeded")) {
					console.log("❌ SERP API: Quota exceeded");
				}
			}

			console.log(`✅ SERP API: ${jobsSaved} jobs processed`);
			return jobsSaved;
		} catch (error) {
			console.error("❌ SERP API scraper failed:", error.message);
			return 0;
		}
	}

	// Run RapidAPI Internships scraper
	async runRapidAPIInternshipsScraper() {
		try {
			console.log("🎓 Running RapidAPI Internships scraper...");

			// Use the RapidAPI Internships scraper
			const { stdout } = await execAsync(
				"npx -y tsx scrapers/rapidapi-internships.ts",
				{
					cwd: process.cwd(),
					timeout: 300000,
				},
			);

			// Parse job count from the result
			const insertedMatch = stdout.match(/inserted:\s*(\d+)/);
			const jobsSaved = insertedMatch ? parseInt(insertedMatch[1]) : 0;

			console.log(`✅ RapidAPI Internships: ${jobsSaved} jobs processed`);
			return jobsSaved;
		} catch (error) {
			console.error("❌ RapidAPI Internships scraper failed:", error.message);
			return 0;
		}
	}

	// Monitor database health with source-level checks
	async checkDatabaseHealth() {
		try {
			const { data, error } = await supabase
				.from("jobs")
				.select("created_at, source")
				.order("created_at", { ascending: false })
				.limit(100);

			if (error) throw error;

			if (data && data.length > 0) {
				const lastJobTime = new Date(data[0].created_at);
				const hoursSinceLastJob =
					(Date.now() - lastJobTime.getTime()) / (1000 * 60 * 60);

				// Check source freshness
				const sourceLastRun = {};
				const criticalSources = [
					"adzuna",
					"reed",
					"jobspy-indeed",
					"jobspy-internships",
					"careerjet",
					"arbeitnow",
				];

				criticalSources.forEach((source) => {
					const sourceJobs = data.filter((j) => j.source === source);
					if (sourceJobs.length > 0) {
						const lastSourceJob = new Date(sourceJobs[0].created_at);
						const hoursSince =
							(Date.now() - lastSourceJob.getTime()) / (1000 * 60 * 60);
						sourceLastRun[source] = hoursSince;

						// Alert if critical source hasn't run in 7 days (168 hours)
						if (hoursSince > 168) {
							console.error(
								`🚨 ALERT: Source '${source}' hasn't added jobs in ${Math.round(hoursSince)} hours (${Math.round(hoursSince / 24)} days)`,
							);
						}
					} else {
						// More specific message: source may be working but not in last 100 jobs
						console.error(
							`🚨 ALERT: Source '${source}' has no jobs in last 100 ingested (may be working but low volume)`,
						);
					}
				});

				if (hoursSinceLastJob > 24) {
					console.error(
						`🚨 ALERT: No jobs ingested in ${Math.round(hoursSinceLastJob)} hours`,
					);
					return false;
				}

				console.log(
					`✅ Database healthy: Last job ${Math.round(hoursSinceLastJob)} hours ago`,
				);
				console.log(`📊 Source freshness:`, sourceLastRun);
				return true;
			} else {
				console.error("🚨 ALERT: No jobs in database");
				return false;
			}
		} catch (error) {
			console.error("❌ Database health check failed:", error.message);
			return false;
		}
	}

	// Get database stats
	async getDatabaseStats() {
		try {
			const { data, error } = await supabase
				.from("jobs")
				.select("created_at, source");

			if (error) throw error;

			const totalJobs = data.length;
			const recentJobs = data.filter((job) => {
				const jobTime = new Date(job.created_at);
				return Date.now() - jobTime.getTime() < 24 * 60 * 60 * 1000;
			}).length;

			const sourceBreakdown = data.reduce((acc, job) => {
				acc[job.source] = (acc[job.source] || 0) + 1;
				return acc;
			}, {});

			return {
				totalJobs,
				recentJobs,
				sourceBreakdown,
			};
		} catch (error) {
			console.error("❌ Database stats failed:", error.message);
			return { totalJobs: 0, recentJobs: 0, sourceBreakdown: {} };
		}
	}

	// Deactivate stale jobs (lifecycle management)
	// Sets is_active = false for jobs not seen in the last N days
	async deactivateStaleJobs() {
		try {
			const ttlDays = parseInt(process.env.JOB_TTL_DAYS || "7", 10);
			const cutoffDate = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000);
			const cutoffIso = cutoffDate.toISOString();

			console.log(
				`🧹 Checking for stale jobs (older than ${ttlDays} days, cutoff: ${cutoffIso})...`,
			);

			// Update jobs where last_seen_at is older than cutoff and is_active is true
			const { data, error } = await supabase
				.from("jobs")
				.update({ is_active: false })
				.eq("is_active", true)
				.lt("last_seen_at", cutoffIso)
				.select("id");

			if (error) {
				console.error("❌ Failed to deactivate stale jobs:", error.message);
				return 0;
			}

			const deactivatedCount = Array.isArray(data) ? data.length : 0;

			if (deactivatedCount > 0) {
				console.log(
					`✅ Deactivated ${deactivatedCount} stale jobs (last_seen_at < ${cutoffIso})`,
				);
			} else {
				console.log(
					`✅ No stale jobs found (all jobs seen within last ${ttlDays} days)`,
				);
			}

			return deactivatedCount;
		} catch (error) {
			console.error("❌ Deactivate stale jobs failed:", error.message);
			return 0;
		}
	}

	// Delete inactive jobs that have been inactive for more than 5 days
	// This prevents database bloat while preserving recent inactive jobs for recovery
	async deleteOldInactiveJobs() {
		try {
			const inactiveRetentionDays = parseInt(
				process.env.INACTIVE_JOB_RETENTION_DAYS || "2",
				10,
			);
			const cutoffDate = new Date(
				Date.now() - inactiveRetentionDays * 24 * 60 * 60 * 1000,
			);
			const cutoffIso = cutoffDate.toISOString();

			console.log(
				`🗑️  Checking for inactive jobs to delete (inactive for more than ${inactiveRetentionDays} days, cutoff: ${cutoffIso})...`,
			);

			// First, get jobs that are inactive and haven't been seen in the retention period
			// We check both is_active = false AND last_seen_at < cutoff
			const { data: jobsToDelete, error: queryError } = await supabase
				.from("jobs")
				.select("id, job_hash, title, company, source, last_seen_at")
				.eq("is_active", false)
				.lt("last_seen_at", cutoffIso)
				.limit(1000); // Process in batches to avoid timeouts

			if (queryError) {
				console.error(
					"❌ Failed to query inactive jobs for deletion:",
					queryError.message,
				);
				return 0;
			}

			if (!jobsToDelete || jobsToDelete.length === 0) {
				console.log(
					`✅ No inactive jobs to delete (all inactive jobs are within ${inactiveRetentionDays} day retention period)`,
				);
				return 0;
			}

			const jobHashes = jobsToDelete.map((j) => j.job_hash).filter(Boolean);
			const jobIds = jobsToDelete.map((j) => j.id).filter(Boolean);

			console.log(
				`📊 Found ${jobsToDelete.length} inactive jobs to delete (inactive for >${inactiveRetentionDays} days)`,
			);

			// Delete related records first (to maintain referential integrity)
			// 1. Delete from embedding_queue
			const { error: queueError } = await supabase
				.from("embedding_queue")
				.delete()
				.in("job_hash", jobHashes);

			if (queueError) {
				console.warn(
					"⚠️  Failed to delete embedding_queue entries:",
					queueError.message,
				);
			}

			// 2. Delete from matches (jobs being deleted shouldn't be matched)
			const { error: matchesError } = await supabase
				.from("matches")
				.delete()
				.in("job_hash", jobHashes);

			if (matchesError) {
				console.warn(
					"⚠️  Failed to delete matches entries:",
					matchesError.message,
				);
			}

			// 3. Delete from user_feedback (optional - might want to keep feedback)
			// Commented out to preserve user feedback data
			// const { error: feedbackError } = await supabase
			//   .from("user_feedback")
			//   .delete()
			//   .in("job_hash", jobHashes);

			// Finally, delete the jobs themselves
			const { error: deleteError } = await supabase
				.from("jobs")
				.delete()
				.in("id", jobIds);

			if (deleteError) {
				console.error(
					"❌ Failed to delete inactive jobs:",
					deleteError.message,
				);
				return 0;
			}

			console.log(
				`✅ Deleted ${jobsToDelete.length} inactive jobs (inactive for >${inactiveRetentionDays} days)`,
			);

			return jobsToDelete.length;
		} catch (error) {
			console.error("❌ Delete inactive jobs failed:", error.message);
			return 0;
		}
	}

	// Retry helper with exponential backoff
	async retryWithBackoff(fn, maxRetries = 2, delayMs = 1000) {
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				return await fn();
			} catch (error) {
				if (attempt === maxRetries) {
					throw error;
				}
				const backoffDelay = delayMs * 2 ** attempt;
				console.warn(
					`⚠️  Attempt ${attempt + 1} failed, retrying in ${backoffDelay}ms...`,
				);
				await new Promise((resolve) => setTimeout(resolve, backoffDelay));
			}
		}
	}

	// Timeout wrapper to kill slow scrapers faster
	async withTimeout(promise, timeoutMs, scraperName) {
		return Promise.race([
			promise,
			new Promise((_, reject) =>
				setTimeout(
					() =>
						reject(
							new Error(`${scraperName} timed out after ${timeoutMs / 1000}s`),
						),
					timeoutMs,
				),
			),
		]);
	}

	// Main scraping cycle - OPTIMIZED for speed and reliability
	async runScrapingCycle() {
		if (this.isRunning) {
			console.log("⏸️ Scraping cycle already running, skipping...");
			return;
		}

		this.isRunning = true;
		const startTime = Date.now();

		try {
			console.log("\n🚀 STARTING AUTOMATED SCRAPING CYCLE");
			console.log("=====================================");
			console.log(
				"🎯 Running streamlined scrapers: JobSpy, JobSpy Internships, Career Path Roles, Adzuna, Reed, CareerJet, Arbeitnow, Jooble",
			);

			const cycleStartIso = new Date().toISOString();
			const signupTargets = await this.getSignupTargets();

			if (signupTargets.cities.length === 0) {
				console.log(
					"ℹ️  No signup cities found; scrapers will use their default city lists.",
				);
			}

			// OPTIMIZATION: Run all fast scrapers in parallel groups
			// Group 1: JobSpy variants (can run together)
			console.log("⚡ Running JobSpy variants in parallel...");
			let jobspyJobs = 0;
			let jobspyInternshipsJobs = 0;
			let careerPathRolesJobs = 0;

			try {
				const [jobspyResult, internshipsResult, careerPathResult] =
					await Promise.allSettled([
						this.runJobSpyScraper(),
						this.runJobSpyInternshipsScraper(),
						this.runJobSpyCareerPathRolesScraper(signupTargets),
					]);

				jobspyJobs =
					jobspyResult.status === "fulfilled" ? jobspyResult.value : 0;
				jobspyInternshipsJobs =
					internshipsResult.status === "fulfilled"
						? internshipsResult.value
						: 0;
				careerPathRolesJobs =
					careerPathResult.status === "fulfilled" ? careerPathResult.value : 0;

				if (jobspyResult.status === "rejected") {
					console.error(
						"❌ JobSpy scraper failed:",
						jobspyResult.reason?.message ?? "Unknown error",
					);
				}
				if (internshipsResult.status === "rejected") {
					console.error(
						"❌ JobSpy Internships scraper failed:",
						internshipsResult.reason?.message ?? "Unknown error",
					);
				}
				if (careerPathResult.status === "rejected") {
					console.error(
						"❌ Career Path Roles scraper failed:",
						careerPathResult.reason?.message ?? "Unknown error",
					);
				}

				console.log(
					`✅ JobSpy parallel execution completed: ${jobspyJobs} general + ${jobspyInternshipsJobs} internships + ${careerPathRolesJobs} career roles`,
				);
			} catch (error) {
				console.error("❌ JobSpy parallel execution failed:", error.message);
			}

			// Check stop condition once after JobSpy group
			let stopDueToQuota = await this.evaluateStopCondition(
				"JobSpy pipelines",
				cycleStartIso,
			);

			// Group 2: Critical API scrapers (Adzuna + Reed) - run in parallel
			let adzunaJobs = 0;
			let reedJobs = 0;

			if (!stopDueToQuota) {
				console.log("⚡ Running Adzuna and Reed in parallel...");
				try {
					const [adzunaResult, reedResult] = await Promise.allSettled([
						!SKIP_ADZUNA
							? this.runAdzunaScraper(signupTargets)
							: Promise.resolve(0),
						this.runReedScraper(signupTargets),
					]);

					adzunaJobs =
						adzunaResult.status === "fulfilled" ? adzunaResult.value : 0;
					reedJobs = reedResult.status === "fulfilled" ? reedResult.value : 0;

					if (adzunaResult.status === "rejected") {
						console.error(
							"❌ Adzuna scraper failed:",
							adzunaResult.reason?.message ?? "Unknown error",
						);
						console.error(
							"⚠️  Adzuna represents 52% of total jobs - investigate failure!",
						);
					}
					if (reedResult.status === "rejected") {
						console.error(
							"❌ Reed scraper failed:",
							reedResult.reason?.message ?? "Unknown error",
						);
					}

					console.log(
						`✅ Adzuna + Reed parallel execution completed: ${adzunaJobs} Adzuna + ${reedJobs} Reed`,
					);
				} catch (error) {
					console.error(
						"❌ Adzuna/Reed parallel execution failed:",
						error.message,
					);
				}
				stopDueToQuota = await this.evaluateStopCondition(
					"Adzuna + Reed scrapers",
					cycleStartIso,
				);
			} else {
				console.log(
					"⏹️  Skipping Adzuna + Reed scrapers - cycle job target reached.",
				);
			}

			// Group 3: EU scrapers (CareerJet, Arbeitnow, Jooble) - run in parallel
			let careerjetJobs = 0;
			let arbeitnowJobs = 0;
			let joobleJobs = 0;

			if (!stopDueToQuota) {
				console.log(
					"⚡ Running EU scrapers in parallel (CareerJet, Arbeitnow, Jooble)...",
				);
				try {
					const [careerjetResult, arbeitnowResult, joobleResult] =
						await Promise.allSettled([
							this.runCareerJetScraper(),
							this.runArbeitnowScraper(),
							this.runJoobleScraper(),
						]);

					careerjetJobs =
						careerjetResult.status === "fulfilled" ? careerjetResult.value : 0;
					arbeitnowJobs =
						arbeitnowResult.status === "fulfilled" ? arbeitnowResult.value : 0;
					joobleJobs =
						joobleResult.status === "fulfilled" ? joobleResult.value : 0;

					if (careerjetResult.status === "rejected") {
						console.error(
							"❌ CareerJet scraper failed:",
							careerjetResult.reason?.message ?? "Unknown error",
						);
					}
					if (arbeitnowResult.status === "rejected") {
						console.error(
							"❌ Arbeitnow scraper failed:",
							arbeitnowResult.reason?.message ?? "Unknown error",
						);
					}
					if (joobleResult.status === "rejected") {
						console.error(
							"❌ Jooble scraper failed:",
							joobleResult.reason?.message ?? "Unknown error",
						);
					}

					console.log(
						`✅ EU scrapers parallel execution completed: ${careerjetJobs} CareerJet + ${arbeitnowJobs} Arbeitnow + ${joobleJobs} Jooble`,
					);
				} catch (error) {
					console.error(
						"❌ EU scrapers parallel execution failed:",
						error.message,
					);
				}
				stopDueToQuota = await this.evaluateStopCondition(
					"EU scrapers",
					cycleStartIso,
				);
			} else {
				console.log("⏹️  Skipping EU scrapers - cycle job target reached.");
			}

			// Final stop condition check
			if (!stopDueToQuota) {
				await this.evaluateStopCondition("Full cycle", cycleStartIso);
			}

			// Update stats with all scrapers
			this.totalJobsSaved +=
				adzunaJobs +
				jobspyJobs +
				jobspyInternshipsJobs +
				careerPathRolesJobs +
				reedJobs +
				careerjetJobs +
				arbeitnowJobs +
				joobleJobs;
			this.runCount++;
			this.lastRun = new Date();

			// OPTIMIZATION: Run database operations in parallel
			console.log("🧹 Running database maintenance operations in parallel...");
			const [, deactivatedCount, deletedCount, dbStats] =
				await Promise.allSettled([
					this.checkDatabaseHealth(),
					this.deactivateStaleJobs(),
					this.deleteOldInactiveJobs(),
					this.getDatabaseStats(),
				]);

			if (
				deactivatedCount.status === "fulfilled" &&
				deactivatedCount.value > 0
			) {
				console.log(
					`🧹 Database cleanup: Deactivated ${deactivatedCount.value} stale jobs`,
				);
			}
			if (deletedCount.status === "fulfilled" && deletedCount.value > 0) {
				console.log(
					`🗑️  Database cleanup: Deleted ${deletedCount.value} old inactive jobs`,
				);
			}

			const finalDbStats =
				dbStats.status === "fulfilled"
					? dbStats.value
					: { totalJobs: 0, recentJobs: 0, sourceBreakdown: {} };

			const duration = (Date.now() - startTime) / 1000;
			console.log("\n✅ SCRAPING CYCLE COMPLETE");
			console.log("============================");
			console.log(`⏱️  Duration: ${duration.toFixed(1)} seconds`);
			console.log(
				`📊 Jobs processed this cycle: ${adzunaJobs + jobspyJobs + jobspyInternshipsJobs + careerPathRolesJobs + reedJobs + careerjetJobs + arbeitnowJobs + joobleJobs}`,
			);
			console.log(`📈 Total jobs processed: ${this.totalJobsSaved}`);
			console.log(`🔄 Total cycles run: ${this.runCount}`);
			console.log(`📅 Last run: ${this.lastRun.toISOString()}`);
			console.log(`💾 Database total: ${finalDbStats.totalJobs} jobs`);
			console.log(`🆕 Database recent (24h): ${finalDbStats.recentJobs} jobs`);
			console.log(
				`🏷️  Sources: ${JSON.stringify(finalDbStats.sourceBreakdown)}`,
			);
			console.log(`🎯 Core scrapers breakdown:`);
			console.log(`   - JobSpy (General): ${jobspyJobs} jobs`);
			console.log(
				`   - JobSpy (Internships Only): ${jobspyInternshipsJobs} jobs`,
			);
			console.log(`   - Career Path Roles: ${careerPathRolesJobs} jobs`);
			console.log(`   - Reed: ${reedJobs} jobs (increased priority)`);
			console.log(`   - Adzuna: ${adzunaJobs} jobs (reduced priority)`);
			console.log(`   - CareerJet: ${careerjetJobs} jobs (EU coverage)`);
			console.log(`   - Arbeitnow: ${arbeitnowJobs} jobs (DACH region)`);
			console.log(`   - Jooble: ${joobleJobs} jobs (EU-wide coverage)`);
			console.log(
				`🧮 Unique job hashes this cycle: ${this.currentCycleStats.total}`,
			);
			console.log(
				`📦 Per-source breakdown this cycle: ${JSON.stringify(this.currentCycleStats.perSource)}`,
			);
			if (
				deactivatedCount.status === "fulfilled" &&
				deactivatedCount.value > 0
			) {
				console.log(`🧹 Stale jobs deactivated: ${deactivatedCount.value}`);
			}

			// AUTOMATIC: Process embeddings after each scraping cycle
			// This ensures new jobs get embeddings quickly
			console.log("\n🧠 Starting automatic embedding processing...");
			await this.runEmbeddingRefresh("post-scrape", true);
		} catch (error) {
			console.error("❌ Scraping cycle failed:", error);
		} finally {
			this.isRunning = false;
		}
	}

	// Start the automation
	start() {
		if (SINGLE_RUN_MODE) {
			console.log("🎯 Running in single-run mode (GitHub Actions)");
			console.log("=====================================");

			// Run once and exit
			return this.runScrapingCycle()
				.then(() => {
					console.log("✅ Single scraping cycle completed");
					process.exit(0);
				})
				.catch((error) => {
					console.error("❌ Scraping cycle failed:", error);
					process.exit(1);
				});
		}

		// Existing cron schedule code for local development...
		console.log("🚀 Starting JobPing Real Automation...");
		console.log("=====================================");

		// Run immediately on startup
		this.runScrapingCycle();
		// Note: Embeddings will run automatically after scraping cycle completes

		// Schedule runs 2 times per day (morning, evening) - optimized from 3x/day
		// Still exceeds "daily" promise while reducing costs by 33%
		cron.schedule("0 8,18 * * *", () => {
			console.log("\n⏰ Scheduled scraping cycle starting...");
			this.runScrapingCycle();
			// Embeddings will run automatically after scraping cycle completes
		});

		// Schedule additional embedding refresh every 6 hours to catch any missed jobs
		// This ensures queue stays empty even if some jobs were added outside scraping cycles
		const embeddingCron = process.env.EMBEDDING_REFRESH_CRON || "0 */6 * * *";
		const embeddingTz = process.env.EMBEDDING_REFRESH_TZ || "UTC";
		cron.schedule(
			embeddingCron,
			() => this.runEmbeddingRefresh("scheduled", true),
			{
				timezone: embeddingTz,
			},
		);

		// Schedule daily health check
		cron.schedule("0 9 * * *", async () => {
			console.log("\n🏥 Daily health check...");
			await this.checkDatabaseHealth();
			const stats = await this.getDatabaseStats();
			console.log("📊 Daily stats:", stats);
		});

		console.log("✅ Automation started successfully!");
		console.log(
			"   - 2x daily scraping cycles (8am, 6pm UTC) - optimized from 3x/day",
		);
		console.log("   - Automatic embedding processing after each scrape cycle");
		console.log(
			"   - Embedding queue processed every 6 hours (configurable via EMBEDDING_REFRESH_CRON)",
		);
		console.log("   - Parallel execution enabled for faster cycles");
		console.log("   - Smart stop conditions per scraper");
		console.log("   - Daily health checks");
		console.log("   - Database monitoring");
		console.log(
			"   - 8 core scrapers: JobSpy, JobSpy Internships, Career Path Roles, Adzuna, Reed, CareerJet, Arbeitnow, Jooble",
		);
	}

	// Get status
	getStatus() {
		return {
			isRunning: this.isRunning,
			lastRun: this.lastRun?.toISOString(),
			totalJobsSaved: this.totalJobsSaved,
			runCount: this.runCount,
			uptime: process.uptime(),
		};
	}
}

// Export the runner
const jobRunner = new RealJobRunner();

// Start if this file is run directly
if (require.main === module) {
	(async () => {
		try {
			if (process.env.LOG_LEVEL === "debug") {
				// Optional language initialization if available
				if (typeof initLang === "function") {
					await initLang();
					console.log("✅ Language detection initialized");
				}
			}
		} catch (e) {
			console.warn("[lang] init failed, falling back to franc-only", e);
		}

		// Start the job runner
		jobRunner.start();
	})();

	// Handle graceful shutdown
	process.on("SIGINT", () => {
		console.log("\n🛑 Shutting down gracefully...");
		process.exit(0);
	});

	process.on("SIGTERM", () => {
		console.log("\n🛑 Shutting down gracefully...");
		process.exit(0);
	});
}

module.exports = jobRunner;
