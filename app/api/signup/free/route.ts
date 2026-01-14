import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiLogger } from "../../../../lib/api-logger";
import { asyncHandler } from "../../../../lib/errors";
import { SignupMatchingService } from "../../../../utils/services/SignupMatchingService";

// Simple replacements for deleted country functions
function getCountryFromCity(city: string): string {
	// Simple implementation - could be enhanced
	const cityToCountry: Record<string, string> = {
		london: "uk",
		paris: "france",
		berlin: "germany",
		amsterdam: "netherlands",
		// Add more as needed
	};
	return cityToCountry[city.toLowerCase()] || "unknown";
}

function getCountryVariations(country: string): string[] {
	// Simple implementation
	const variations: Record<string, string[]> = {
		uk: ["uk", "united kingdom", "gb", "great britain"],
		germany: ["germany", "deutschland", "de"],
		france: ["france", "fr"],
		// Add more as needed
	};
	return variations[country.toLowerCase()] || [country];
}


// Note: createConsolidatedMatcher import removed - using simplified matching engine
import { getDatabaseClient } from "../../../../utils/core/database-pool";
import { getProductionRateLimiter } from "../../../../utils/production-rate-limiter";

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
	// GDPR compliance fields
	birth_year: z
		.number()
		.min(1900, "Invalid birth year")
		.max(
			new Date().getFullYear() - 16,
			"You must be at least 16 years old to use this service",
		)
		.optional(),
	age_verified: z
		.boolean()
		.refine((val) => val === true, "Age verification is required"),
	terms_accepted: z
		.boolean()
		.refine((val) => val === true, "Terms of service must be accepted"),
});

export const POST = asyncHandler(async (request: NextRequest) => {
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
			{
				error: "invalid_input",
				message:
					"Please check your information and try again. All fields are required and must be valid.",
				details: validationResult.error.issues,
			},
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
		birth_year: _birth_year,
		age_verified: _age_verified,
	} = validationResult.data;

	// Map visa_sponsorship ('yes'/'no') to visa_status format
	const visa_status =
		visa_sponsorship === "yes" ? "Non-EU (require sponsorship)" : "EU citizen";

	const supabase = getDatabaseClient();
	const normalizedEmail = email.toLowerCase().trim();

	// Check if email already used (any tier)
	const { data: existingUser } = await supabase
		.from("users")
		.select("id, subscription_tier")
		.eq("email", normalizedEmail)
		.maybeSingle();

	if (existingUser) {
		// User already exists - redirect to matches regardless of tier
		// This prevents duplicate accounts and ensures users can access their matches
		const response = NextResponse.json(
			{
				error: "account_already_exists",
				message:
					"Looks like you already have a JobPing account! Taking you to your matches...",
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
		strategy: targetCountries.size > 0 ? "country-level" : "no-location-filter",
	});

	// SIMPLIFIED: Let PrefilterService handle all smart filtering
	// Only do basic fetching - active, status, and freshness
	const sixtyDaysAgo = new Date();
	sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

	let query = supabase
		.from("jobs")
		.select("*")
		.eq("is_active", true)
		.eq("status", "active")
		.is("filtered_reason", null)
		.gte("created_at", sixtyDaysAgo.toISOString()) // Only recent jobs
		.order("id", { ascending: false }); // Pseudo-random for variety
		// REMOVED LIMIT - let PrefilterService filter by location/career first

	apiLogger.info("Free signup - simplified job fetching", {
		email: normalizedEmail,
		strategy: "basic-fetch-only",
		note: "PrefilterService now handles all smart filtering (cities, career, etc.)",
	});

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

	// REFACTORED: Use consolidated matching service
	const matchingConfig = SignupMatchingService.getConfig("free");
	const matchingResult = await SignupMatchingService.runMatching(userPrefs, matchingConfig);

	const matchesCount = matchingResult.matchCount;

	// Check for matches
	if (matchesCount === 0) {
		return NextResponse.json(
			{ error: "No matches found. Try different cities or career paths." },
			{ status: 404 },
		);
	}

	// REFACTORED: Service already saved matches, create response
	const response = NextResponse.json({
		success: true,
		matchCount: matchesCount,
		userId: userData.id,
	});

	// Set session cookie for client-side auth
	// Set a session cookie (simple approach - you may want JWT instead)
	// Cookie expiration matches user expiration (30 days)
	// CRITICAL: Don't use secure flag if site might be accessed over HTTP
	const isProduction = process.env.NODE_ENV === "production";
	const isHttps =
		request.headers.get("x-forwarded-proto") === "https" ||
		request.headers.get("x-forwarded-proto")?.includes("https") ||
		request.url.startsWith("https://");

	try {
		response.cookies.set("session", userData.email, {
			httpOnly: true,
			secure: isProduction && isHttps,
			sameSite: "lax",
			maxAge: 30 * 24 * 60 * 60, // 30 days
			path: "/",
		});
	} catch (sessionError) {
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
		matchCount: matchesCount,
	});

	return response;
});
