import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiLogger } from "@/lib/api-logger";
import { getCountryFromCity, getCountryVariations } from "@/lib/countryFlags";
import { triggerMatchingEvent } from "@/lib/inngest/matching-helpers";
import {
	QUALITY_THRESHOLDS,
	calculateQualityMetrics,
	filterHighQualityJobs,
	selectJobsForDistribution,
} from "@/Utils/business-rules/quality-thresholds";
import { createConsolidatedMatcher } from "@/Utils/consolidatedMatchingV2";
import { getDatabaseClient } from "@/Utils/databasePool";
import { distributeJobsWithDiversity } from "@/Utils/matching/jobDistribution";
import { getProductionRateLimiter } from "@/Utils/productionRateLimiter";

// Input validation schema
const freeSignupSchema = z.object({
	email: z.string().email("Invalid email address").max(255, "Email too long"),
	full_name: z
		.string()
		.min(1, "Name is required")
		.max(100, "Name too long")
		.regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters"),
	preferred_cities: z
		.array(z.string().max(50))
		.min(1, "Select at least one city")
		.max(3, "Maximum 3 cities allowed"),
	career_paths: z.array(z.string()).min(1, "Select at least one career path"),
	entry_level_preferences: z
		.array(z.string())
		.optional()
		.default(["graduate", "intern", "junior"]),
	visa_sponsorship: z.string().min(1, "Visa sponsorship status is required"),
});

export async function POST(request: NextRequest) {
	// Rate limiting - prevent abuse (more lenient for legitimate users)
	const rateLimitResult = await getProductionRateLimiter().middleware(
		request,
		"signup-free",
		{
			windowMs: 60 * 60 * 1000, // 1 hour
			maxRequests: 10, // 10 signup attempts per hour per IP (allows testing different preferences)
		},
	);

	if (rateLimitResult) {
		return rateLimitResult;
	}

	try {
		const body = await request.json();

		// Validate input with zod
		const validationResult = freeSignupSchema.safeParse(body);

		if (!validationResult.success) {
			const errors = validationResult.error.issues
				.map((e: any) => `${e.path.join(".")}: ${e.message}`)
				.join(", ");
			apiLogger.warn("Free signup validation failed", new Error(errors), {
				email: body.email,
			});
			return NextResponse.json(
				{ error: "Invalid input", details: validationResult.error.issues },
				{ status: 400 },
			);
		}

		const {
			email,
			full_name,
			preferred_cities,
			career_paths,
			entry_level_preferences,
			visa_sponsorship,
		} = validationResult.data;

		// Map visa_sponsorship ('yes'/'no') to visa_status format
		const visa_status =
			visa_sponsorship === "yes"
				? "Non-EU (require sponsorship)"
				: "EU citizen";

		const supabase = getDatabaseClient();
		const normalizedEmail = email.toLowerCase().trim();

		// Check if email already used for Free tier
		const { data: existingFreeUser } = await supabase
			.from("users")
			.select("id, subscription_tier")
			.eq("email", normalizedEmail)
			.eq("subscription_tier", "free")
			.maybeSingle();

		if (existingFreeUser) {
			// User already exists - set cookie and check if they have matches
			// This allows them to access /matches even if cookie was lost
			const response = NextResponse.json(
				{
					error: "already_signed_up",
					message: "You already tried Free. Redirecting to your matches...",
					redirectToMatches: true,
				},
				{ status: 409 },
			);

			// Set cookie so they can access matches
			const isProduction = process.env.NODE_ENV === "production";
			const isHttps =
				request.headers.get("x-forwarded-proto") === "https" ||
				request.url.startsWith("https://");

			response.cookies.set("free_user_email", normalizedEmail, {
				httpOnly: true,
				secure: isProduction && isHttps,
				sameSite: "lax",
				maxAge: 60 * 60 * 24 * 30, // 30 days
				path: "/",
			});

			// Check if they have matches
			const { data: existingMatches } = await supabase
				.from("matches")
				.select("job_hash")
				.eq("user_email", normalizedEmail)
				.limit(1);

			apiLogger.info("Existing free user tried to sign up again", {
				email: normalizedEmail,
				hasMatches: (existingMatches?.length || 0) > 0,
				matchCount: existingMatches?.length || 0,
			});

			return response;
		}

		// Clean up any promo_pending entries - promo codes are for premium only, not free
		await supabase.from("promo_pending").delete().eq("email", normalizedEmail);

		// Create free user record
		const freeExpiresAt = new Date();
		freeExpiresAt.setDate(freeExpiresAt.getDate() + 30); // 30 days from now

		const { data: userData, error: userError } = await supabase
			.from("users")
			.insert({
				email: normalizedEmail,
				full_name,
				subscription_tier: "free", // Use existing column
				free_signup_at: new Date().toISOString(),
				free_expires_at: freeExpiresAt.toISOString(),
				target_cities: preferred_cities, // Use target_cities, not preferred_cities
				career_path: career_paths[0] || null, // Single value, not array
				entry_level_preference:
					entry_level_preferences?.join(", ") || "graduate, intern, junior",
				visa_status: visa_status, // Map visa sponsorship to visa_status
				email_verified: true,
				subscription_active: false, // Free users not active - promo codes are for premium only
				active: true,
			})
			.select()
			.single();

		if (userError) {
			apiLogger.error("Failed to create free user", userError as Error, {
				email: normalizedEmail,
			});
			throw userError;
		}

		// CRITICAL FIX: Ensure target_cities is always an array
		// Supabase might return it in different formats, so normalize it
		let targetCities: string[] = [];
		if (userData.target_cities) {
			if (Array.isArray(userData.target_cities)) {
				targetCities = userData.target_cities;
			} else if (typeof userData.target_cities === "string") {
				// Handle case where it might be a JSON string
				try {
					targetCities = JSON.parse(userData.target_cities);
				} catch {
					// If not JSON, treat as single city
					targetCities = [userData.target_cities];
				}
			}
		}

		// Fallback to preferred_cities if target_cities is empty (shouldn't happen, but safety check)
		if (
			targetCities.length === 0 &&
			preferred_cities &&
			preferred_cities.length > 0
		) {
			targetCities = preferred_cities;
		}

		apiLogger.info("Free signup - cities normalized", {
			email: normalizedEmail,
			original: userData.target_cities,
			normalized: targetCities,
			type: typeof userData.target_cities,
			isArray: Array.isArray(userData.target_cities),
		});

		// Fetch jobs (same pattern as existing signup)

		// ENTERPRISE-LEVEL FIX: Use country-level matching instead of exact city matching
		// This is more forgiving and lets pre-filtering handle exact city matching
		// Strategy: Fetch jobs from target countries, then let pre-filtering match exact cities
		const targetCountries = new Set<string>();
		const targetCountryVariations = new Set<string>(); // All variations (codes, names, etc.)

		if (targetCities.length > 0) {
			targetCities.forEach((city) => {
				const country = getCountryFromCity(city);
				if (country) {
					targetCountries.add(country);
					// Get all variations for this country (IE, Ireland, DUBLIN, etc.)
					const variations = getCountryVariations(country);
					variations.forEach((v) => {
						targetCountryVariations.add(v);
					});
				}
			});
		}

		apiLogger.info("Free signup - job fetching strategy", {
			email: normalizedEmail,
			targetCities: targetCities,
			targetCountries: Array.from(targetCountries),
			targetCountryVariations: Array.from(targetCountryVariations),
			strategy:
				targetCountries.size > 0 ? "country-level" : "no-location-filter",
		});

		let query = supabase
			.from("jobs")
			.select("*")
			.eq("is_active", true)
			.eq("status", "active")
			.is("filtered_reason", null);

		// CRITICAL FIX: City is MORE IMPORTANT than country - filter by city first
		// Build city variations array (handles native names like Wien, Zürich, Milano, Roma)
		const cityVariations = new Set<string>();
		if (targetCities.length > 0) {
			targetCities.forEach((city) => {
				cityVariations.add(city); // Original: "Dublin"
				cityVariations.add(city.toUpperCase()); // "DUBLIN"
				cityVariations.add(city.toLowerCase()); // "dublin"

				// Add native language variations (based on actual database values)
				const cityVariants: Record<string, string[]> = {
					Vienna: ["Wien", "WIEN", "wien"],
					Zurich: ["Zürich", "ZURICH", "zürich"],
					Milan: ["Milano", "MILANO", "milano"],
					Rome: ["Roma", "ROMA", "roma"],
					Prague: ["Praha", "PRAHA", "praha"],
					Warsaw: ["Warszawa", "WARSZAWA", "warszawa"],
					Brussels: [
						"Bruxelles",
						"BRUXELLES",
						"bruxelles",
						"Brussel",
						"BRUSSEL",
					],
					Munich: ["München", "MÜNCHEN", "münchen"],
					Copenhagen: ["København", "KØBENHAVN"],
					Stockholm: ["Stockholms län"],
					Helsinki: ["Helsingfors"],
					Dublin: ["Baile Átha Cliath"],
				};

				if (cityVariants[city]) {
					cityVariants[city].forEach((v) => {
						cityVariations.add(v);
					});
				}

				// Add London area variations (based on actual database values)
				if (city.toLowerCase() === "london") {
					[
						"Central London",
						"City Of London",
						"East London",
						"North London",
						"South London",
						"West London",
					].forEach((v) => {
						cityVariations.add(v);
						cityVariations.add(v.toUpperCase());
						cityVariations.add(v.toLowerCase());
					});
				}
			});
		}

		// PRIORITY 1: Filter by city variations (city is more important)
		// Use .in() with all variations - this is case-sensitive but we include all case variations
		// This catches jobs where city field matches any variation
		if (cityVariations.size > 0) {
			const cityArray = Array.from(cityVariations);
			// Use .in() with all variations - includes uppercase, lowercase, and mixed case
			query = query.in("city", cityArray);
			apiLogger.info(
				"Free signup - filtering jobs by cities (with variations)",
				{
					email: normalizedEmail,
					targetCities: targetCities,
					cityVariations: cityArray.slice(0, 15), // Log first 15
					cityVariationCount: cityVariations.size,
					note: "City filtering includes all case variations - catches Wien/Vienna, Zürich/Zurich, etc.",
				},
			);
		} else if (targetCountryVariations.size > 0) {
			// Fallback: if no city variations, use country only
			const countryArray = Array.from(targetCountryVariations);
			query = query.in("country", countryArray);
			apiLogger.info(
				"Free signup - filtering by country only (no city variations)",
				{
					email: normalizedEmail,
					countries: Array.from(targetCountries),
					countryVariations: countryArray.slice(0, 10),
					variationCount: targetCountryVariations.size,
				},
			);
		}

		// DON'T filter by career path at DB level - too restrictive
		// Let pre-filtering handle career path matching for better results
		// This ensures we get more jobs to choose from

		// Filter for early-career roles (same as preview API)
		// This ensures we get internships, graduate roles, or early-career jobs
		query = query.or(
			"is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}",
		);

		// Fetch jobs from last 60 days for recency, but use id-based ordering for variety
		// This balances recency (quality) with variety (better matching pool)
		const sixtyDaysAgo = new Date();
		sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

		query = query
			.gte("created_at", sixtyDaysAgo.toISOString()) // Only recent jobs (last 60 days)
			.order("id", { ascending: false }) // Pseudo-random ordering via id for variety
			.limit(2000); // Fetch more jobs for better diversity

		let { data: allJobs, error: jobsError } = await query;

		// ENTERPRISE-LEVEL FIX: Improved fallback logic
		// Since we already use country-level matching, fallback is simpler
		if (
			(jobsError || !allJobs || allJobs.length === 0) &&
			targetCountries.size > 0
		) {
			apiLogger.warn(
				"Free signup - no jobs found for target countries, trying broader fallback",
				{
					email: normalizedEmail,
					countries: Array.from(targetCountries),
					cities: targetCities,
				},
			);

			// Fallback: Remove country filter, keep early-career filter only
			// Don't filter by career path - let pre-filtering handle it
			let fallbackQuery = supabase
				.from("jobs")
				.select("*")
				.eq("is_active", true)
				.eq("status", "active")
				.is("filtered_reason", null);

			// Also filter for early-career roles in fallback
			fallbackQuery = fallbackQuery.or(
				"is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}",
			);

			// Use same variety strategy for fallback
			const sixtyDaysAgoFallback = new Date();
			sixtyDaysAgoFallback.setDate(sixtyDaysAgoFallback.getDate() - 60);

			fallbackQuery = fallbackQuery
				.gte("created_at", sixtyDaysAgoFallback.toISOString())
				.order("id", { ascending: false })
				.limit(2000);

			const fallbackResult = await fallbackQuery;

			if (
				!fallbackResult.error &&
				fallbackResult.data &&
				fallbackResult.data.length > 0
			) {
				allJobs = fallbackResult.data;
				jobsError = null;
				apiLogger.info(
					"Free signup - found jobs using broader fallback (no country filter)",
					{
						email: normalizedEmail,
						jobCount: allJobs.length,
						note: "Pre-filtering will handle city matching",
					},
				);
			}
		}

		// Final check: if still no jobs, return error
		if (jobsError || !allJobs || allJobs.length === 0) {
			apiLogger.warn("Free signup - no jobs found after all fallbacks", {
				email: normalizedEmail,
				cities: targetCities,
				careerPath: userData.career_path,
			});
			return NextResponse.json(
				{ error: "No jobs found. Try different cities or career paths." },
				{ status: 404 },
			);
		}

		// NEW ARCHITECTURE: "Funnel of Truth"
		// Stage 1: SQL Filter (already done - is_active, city, early-career)
		// Stage 2-4: Hard Gates + Pre-Ranking + AI (handled in consolidatedMatchingV2)
		// Stage 5: Diversity Pass (in distributeJobsWithDiversity)
		apiLogger.info("Free signup - using new matching architecture", {
			email: normalizedEmail,
			totalJobsFetched: allJobs?.length || 0,
			targetCities: targetCities,
			note: "Matching engine handles hard gates, pre-ranking, and AI matching",
		});

		const userPrefs = {
			email: userData.email,
			target_cities: targetCities,
			career_path: userData.career_path ? [userData.career_path] : [],
			entry_level_preference: userData.entry_level_preference,
			work_environment: undefined, // Free users don't have work environment preferences
			languages_spoken: userData.languages_spoken || [],
			roles_selected: userData.roles_selected || [],
			company_types: userData.company_types || [],
			visa_status: userData.visa_status,
			professional_expertise: userData.career_path || "",
			subscription_tier: "free" as const, // TIER-AWARE: Mark as free tier
		};

		// Pass all jobs to matching engine - it handles hard gates and pre-ranking
		const jobsForMatching = allJobs || [];

		if (!jobsForMatching || jobsForMatching.length === 0) {
			return NextResponse.json(
				{ error: "No matches found. Try different cities or career paths." },
				{ status: 404 },
			);
		}

		// Run matching using consolidated matching engine
		// Engine handles: Hard Gates → Pre-Ranking → AI Matching
		let matchedJobsRaw: any[] = [];

		if (!process.env.OPENAI_API_KEY) {
			apiLogger.warn(
				"OPENAI_API_KEY not set - using fallback matching without AI",
				{
					email: normalizedEmail,
					jobCount: jobsForMatching.length,
				},
			);

			// FALLBACK: Use rule-based matching (engine will handle hard gates and pre-ranking)
			const matcher = createConsolidatedMatcher();
			const matchResult = await matcher.performMatching(
				jobsForMatching as any[],
				userPrefs as any,
				true, // Force rule-based
			);

			matchedJobsRaw = matchResult.matches
				.map((m: any) => {
					const job = jobsForMatching.find(
						(j: any) => j.job_hash === m.job_hash,
					);
					return job
						? {
								...job,
								match_score: m.match_score,
								match_reason: m.match_reason,
							}
						: null;
				})
				.filter((j: any) => j !== null);

			apiLogger.info("Fallback matching completed (no AI)", {
				email: normalizedEmail,
				matchesCount: matchedJobsRaw.length,
			});
		} else {
			// Use Inngest for durable matching if enabled (prevents Vercel timeout)
			const useInngest = process.env.USE_INNGEST_FOR_MATCHING === "true";

			if (useInngest) {
				// Trigger Inngest matching event (async, durable, with retries)
				apiLogger.info("Triggering Inngest matching event", {
					email: normalizedEmail,
					jobsCount: jobsForMatching.length,
					cities: targetCities,
					careerPath: userData.career_path,
				});

				try {
					await triggerMatchingEvent({
						userPrefs: userPrefs as any,
						jobs: jobsForMatching as any[],
						context: {
							source: "signup/free",
							requestId: crypto.randomUUID(),
						},
					});

					// For signup/free, we still need immediate results for the response
					// So we'll do synchronous matching as fallback, but Inngest will also process it
					// In production, you might want to return immediately and send email when Inngest completes
					apiLogger.info(
						"Inngest matching triggered, falling back to sync matching for immediate response",
						{ email: normalizedEmail },
					);
				} catch (inngestError) {
					apiLogger.error(
						"Failed to trigger Inngest matching, using synchronous matching",
						inngestError as Error,
						{ email: normalizedEmail },
					);
				}
			}

			// Normal AI matching flow (synchronous for immediate response)
			// Matching engine handles: Hard Gates → Pre-Ranking → AI Matching
			const matcher = createConsolidatedMatcher(process.env.OPENAI_API_KEY);

			apiLogger.info("Starting AI matching", {
				email: normalizedEmail,
				jobsCount: jobsForMatching.length,
				cities: targetCities,
				careerPath: userData.career_path,
				useInngest,
				note: "Matching engine will apply hard gates, pre-rank, and select top 50 for AI",
			});

			let matchResult: any = null;
			try {
				// Pass all jobs - engine handles hard gates and pre-ranking internally
				matchResult = await matcher.performMatching(
					jobsForMatching as any[],
					userPrefs as any,
				);
			} catch (matchingError) {
				apiLogger.error("AI matching failed", matchingError as Error, {
					email: normalizedEmail,
					jobsCount: jobsForMatching.length,
					errorMessage:
						matchingError instanceof Error
							? matchingError.message
							: String(matchingError),
				});

				// FALLBACK: Engine will use rule-based matching automatically
				apiLogger.warn(
					"AI matching failed, engine will use rule-based fallback",
					{ email: normalizedEmail },
				);
				const fallbackResult = await matcher.performMatching(
					jobsForMatching as any[],
					userPrefs as any,
					true, // Force rule-based
				);
				matchResult = fallbackResult;
			}

			if (
				!matchResult ||
				!matchResult.matches ||
				matchResult.matches.length === 0
			) {
				apiLogger.warn("No matches returned from matching engine", {
					email: normalizedEmail,
					jobsCount: jobsForMatching.length,
					cities: targetCities,
					careerPath: userData.career_path,
				});

				return NextResponse.json(
					{ error: "No matches found. Try different cities or career paths." },
					{ status: 404 },
				);
			} else {
				apiLogger.info("Matching completed", {
					email: normalizedEmail,
					matchesCount: matchResult.matches.length,
					method: matchResult.method,
				});

				// Get matched jobs with full data
				for (const m of matchResult.matches) {
					const job = jobsForMatching.find(
						(j: any) => j.job_hash === m.job_hash,
					);
					if (job) {
						matchedJobsRaw.push({
							...job,
							match_score: m.match_score,
							match_reason: m.match_reason,
						});
					}
				}
			}
		}

		if (matchedJobsRaw.length === 0) {
			return NextResponse.json(
				{ error: "No matches found. Try different cities or career paths." },
				{ status: 404 },
			);
		}

		// ENTERPRISE-LEVEL FIX: Prioritize quality while maintaining balance
		// Step 1: Sort by match_score DESC to prioritize highest-quality matches
		matchedJobsRaw.sort((a: any, b: any) => {
			const scoreA = a.match_score || 0;
			const scoreB = b.match_score || 0;
			return scoreB - scoreA; // Higher score = better quality
		});

		// Step 2: Filter low-quality matches using business rules
		const highQualityJobs = filterHighQualityJobs(
			matchedJobsRaw,
			QUALITY_THRESHOLDS.FREE_SIGNUP,
		);

		// Step 3: Calculate quality metrics for logging using business rules
		const qualityMetrics = calculateQualityMetrics(matchedJobsRaw);

		apiLogger.info("Free signup - quality filtering", {
			email: normalizedEmail,
			totalMatches: matchedJobsRaw.length,
			highQualityMatches: highQualityJobs.length,
			qualityThreshold: QUALITY_THRESHOLDS.FREE_SIGNUP,
			averageScore: qualityMetrics.averageScore,
			minScore: qualityMetrics.minScore,
			maxScore: qualityMetrics.maxScore,
			qualityFilterApplied: highQualityJobs.length < matchedJobsRaw.length,
		});

		// Step 4: Use high-quality jobs if we have enough, otherwise use all (with quality priority)
		// This ensures we always return 5 jobs if possible, but prioritize quality
		const jobsForDistribution = selectJobsForDistribution(
			matchedJobsRaw,
			highQualityJobs,
			5, // Free tier: 5 jobs
		);

		// Distribute jobs (max 5 for free)
		// Extract work environment preferences (may be comma-separated string or array)
		let targetWorkEnvironments: string[] = [];
		if (userData.work_environment) {
			if (Array.isArray(userData.work_environment)) {
				targetWorkEnvironments = userData.work_environment;
			} else if (typeof userData.work_environment === "string") {
				// Parse comma-separated string: "Office, Hybrid" -> ["Office", "Hybrid"]
				targetWorkEnvironments = userData.work_environment
					.split(",")
					.map((env: string) => env.trim())
					.filter(Boolean);
			}
		}

		// Log city and work environment distribution before distribution
		const cityDistributionBefore = matchedJobsRaw.reduce(
			(acc: Record<string, number>, job: any) => {
				const city = job.city || "unknown";
				acc[city] = (acc[city] || 0) + 1;
				return acc;
			},
			{},
		);
		const workEnvDistributionBefore = matchedJobsRaw.reduce(
			(acc: Record<string, number>, job: any) => {
				const workEnv = job.work_environment || "unknown";
				acc[workEnv] = (acc[workEnv] || 0) + 1;
				return acc;
			},
			{},
		);
		apiLogger.info("Free signup - jobs before distribution", {
			email: normalizedEmail,
			totalJobs: matchedJobsRaw.length,
			cityDistribution: cityDistributionBefore,
			workEnvDistribution: workEnvDistributionBefore,
			targetCities: targetCities,
			targetWorkEnvironments: targetWorkEnvironments,
		});

		// ENTERPRISE-LEVEL FIX: Use quality-filtered jobs for distribution
		const distributedJobs = distributeJobsWithDiversity(
			jobsForDistribution as any[],
			{
				targetCount: 5,
				targetCities: targetCities, // Use normalized array
				maxPerSource: 2,
				ensureCityBalance: true,
				targetWorkEnvironments: targetWorkEnvironments,
				ensureWorkEnvironmentBalance: targetWorkEnvironments.length > 0,
			},
		);

		// Log city and work environment distribution after distribution
		const cityDistributionAfter = distributedJobs.reduce(
			(acc: Record<string, number>, job: any) => {
				const city = job.city || "unknown";
				acc[city] = (acc[city] || 0) + 1;
				return acc;
			},
			{},
		);
		const workEnvDistributionAfter = distributedJobs.reduce(
			(acc: Record<string, number>, job: any) => {
				const workEnv = job.work_environment || "unknown";
				acc[workEnv] = (acc[workEnv] || 0) + 1;
				return acc;
			},
			{},
		);
		apiLogger.info("Free signup - jobs after distribution", {
			email: normalizedEmail,
			totalJobs: distributedJobs.length,
			cityDistribution: cityDistributionAfter,
			workEnvDistribution: workEnvDistributionAfter,
			targetCities: targetCities,
			targetWorkEnvironments: targetWorkEnvironments,
		});

		// ENTERPRISE-LEVEL FIX: Ensure final jobs maintain quality
		// If distribution returned jobs, use them (they're already balanced and quality-filtered)
		// Otherwise fallback to top-quality jobs (sorted by match_score)
		let finalJobs: any[];
		if (distributedJobs.length > 0) {
			finalJobs = distributedJobs.slice(0, 5);
		} else {
			// Fallback: Use top-quality jobs sorted by match_score
			const sortedByQuality = [...jobsForDistribution].sort(
				(a: any, b: any) => {
					const scoreA = a.match_score || 0;
					const scoreB = b.match_score || 0;
					return scoreB - scoreA;
				},
			);
			finalJobs = sortedByQuality.slice(0, 5);

			apiLogger.warn(
				"Free signup - distribution returned empty, using top-quality fallback",
				{
					email: normalizedEmail,
					fallbackJobsCount: finalJobs.length,
					topScores: finalJobs.map((j: any) => j.match_score || 0),
				},
			);
		}

		// ENTERPRISE-LEVEL FIX: Log final quality metrics
		const finalAverageScore =
			finalJobs.length > 0
				? finalJobs.reduce(
						(sum: number, j: any) => sum + (j.match_score || 0),
						0,
					) / finalJobs.length
				: 0;
		const finalMinScore =
			finalJobs.length > 0
				? Math.min(...finalJobs.map((j: any) => j.match_score || 0))
				: 0;

		apiLogger.info("Free signup - final job quality", {
			email: normalizedEmail,
			finalJobsCount: finalJobs.length,
			averageScore: Math.round(finalAverageScore * 10) / 10,
			minScore: finalMinScore,
			maxScore:
				finalJobs.length > 0
					? Math.max(...finalJobs.map((j: any) => j.match_score || 0))
					: 0,
			qualityThresholdMet: finalMinScore >= QUALITY_THRESHOLDS.FREE_SIGNUP,
		});

		// CRITICAL: Filter out jobs without job_hash before saving
		const validJobs = finalJobs.filter((job: any) => {
			if (!job || !job.job_hash) {
				apiLogger.warn("Skipping job without job_hash", {
					email: normalizedEmail,
					hasJob: !!job,
					jobTitle: job?.title,
					jobCompany: job?.company,
				});
				return false;
			}
			return true;
		});

		if (validJobs.length === 0) {
			const error = new Error("No valid jobs to save (all missing job_hash)");
			apiLogger.error("No valid jobs to save (all missing job_hash)", error as Error, {
				email: normalizedEmail,
				finalJobsCount: finalJobs.length,
				distributedJobsCount: distributedJobs.length,
				matchedJobsRawCount: matchedJobsRaw.length,
			});
			return NextResponse.json(
				{ error: "No valid matches found. Please try again." },
				{ status: 500 },
			);
		}

		// Store matches in YOUR matches table (uses user_email, not user_id!)
		// match_score from AI is 0-100, normalize to 0-1 for database
		const matchRecords = validJobs.map((job: any) => {
			// match_score is 0-100 from matching engine, normalize to 0-1
			let normalizedScore = 0.75; // Default fallback
			if (job.match_score !== undefined && job.match_score !== null) {
				if (job.match_score > 1) {
					// Score is 0-100, normalize to 0-1
					normalizedScore = job.match_score / 100;
				} else {
					// Score is already 0-1
					normalizedScore = job.match_score;
				}
			}

			return {
				user_email: normalizedEmail, // CRITICAL: Use user_email, not user_id!
				job_hash: String(job.job_hash), // Ensure it's a string
				match_score: normalizedScore, // Normalized to 0-1
				match_reason: job.match_reason || "AI matched",
				match_quality: "good", // Use simple value that should pass constraint
				match_tags: userData.career_path ? [userData.career_path] : [], // Convert to array (database expects array)
				matched_at: new Date().toISOString(),
				created_at: new Date().toISOString(),
			};
		});

		// CRITICAL: Save matches - fail if this doesn't work
		const { data: savedMatches, error: matchesError } = await supabase
			.from("matches")
			.upsert(matchRecords, { onConflict: "user_email,job_hash" })
			.select();

		if (matchesError) {
			apiLogger.error("Failed to store matches", matchesError as Error, {
				email: normalizedEmail,
			});
			return NextResponse.json(
				{ error: "Failed to save matches. Please try again." },
				{ status: 500 },
			);
		}

		// Verify matches were saved
		if (!savedMatches || savedMatches.length === 0) {
			apiLogger.error("No matches saved", new Error("Matches array empty"), {
				email: normalizedEmail,
				matchRecordsCount: matchRecords.length,
			});
			return NextResponse.json(
				{ error: "Failed to save matches. Please try again." },
				{ status: 500 },
			);
		}

		// Log successful match creation for debugging
		apiLogger.info("Free signup - matches saved successfully", {
			email: normalizedEmail,
			savedMatchesCount: savedMatches.length,
			savedMatchHashes: savedMatches.map((m: any) => m.job_hash),
			matchRecordsCount: matchRecords.length,
			validJobsCount: validJobs.length,
		});

		// Track analytics (optional - don't fail if this fails)
		try {
			await supabase.from("free_signups_analytics").insert({
				email: normalizedEmail,
				cities: preferred_cities,
				career_path: career_paths[0],
			});
		} catch (analyticsError) {
			// Non-critical - log but don't fail
			apiLogger.warn("Failed to track analytics", analyticsError as Error, {
				email: normalizedEmail,
			});
		}

		// Set session cookie for client-side auth
		const response = NextResponse.json({
			success: true,
			matchCount: savedMatches.length,
			userId: userData.id,
		});

		// Set a session cookie (simple approach - you may want JWT instead)
		// Cookie expiration matches user expiration (30 days)
		// CRITICAL: Don't use secure flag if site might be accessed over HTTP
		const isProduction = process.env.NODE_ENV === "production";
		const isHttps =
			request.headers.get("x-forwarded-proto") === "https" ||
			request.url.startsWith("https://");

		response.cookies.set("free_user_email", normalizedEmail, {
			httpOnly: true,
			secure: isProduction && isHttps, // Only secure in production HTTPS
			sameSite: "lax",
			maxAge: 60 * 60 * 24 * 30,
			path: "/",
		});

		// Optional: Still create session for future use, but don't rely on it
		try {
			const sessionId = crypto.randomUUID();
			await supabase.from("free_sessions").insert({
				session_id: sessionId,
				user_email: normalizedEmail,
				expires_at: freeExpiresAt.toISOString(),
				created_at: new Date().toISOString(),
			});
		} catch (sessionError) {
			// Non-critical - log but don't fail
			apiLogger.warn(
				"Failed to create session (non-critical)",
				sessionError as Error,
			);
		}

		apiLogger.info("Cookie set for free user", {
			email: normalizedEmail,
			secure: isProduction && isHttps,
			isProduction,
			isHttps,
		});

		apiLogger.info("Free signup successful", {
			email: normalizedEmail,
			matchCount: savedMatches.length,
			savedMatchesCount: savedMatches.length,
		});

		return response;
	} catch (error) {
		apiLogger.error("Free signup failed", error as Error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
