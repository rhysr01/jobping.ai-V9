import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { apiLogger } from "../../../../lib/api-logger";
import { asyncHandler, getRequestId } from "../../../../lib/errors";
import { SignupMatchingService } from "../../../../utils/services/SignupMatchingService";

// Simple replacements for deleted country functions
function getCountryFromCity(city: string): string {
	// City to country mapping for the 21 cities available in the JobPing form options
	// Only includes cities that users can actually select from the EuropeMap component
	const cityToCountry: Record<string, string> = {
		// Ireland
		dublin: "ireland",
		belfast: "ireland",

		// United Kingdom
		london: "uk",
		manchester: "uk",
		birmingham: "uk",

		// France
		paris: "france",

		// Netherlands
		amsterdam: "netherlands",

		// Belgium
		brussels: "belgium",

		// Germany
		berlin: "germany",
		hamburg: "germany",
		munich: "germany",

		// Switzerland
		zurich: "switzerland",

		// Spain
		madrid: "spain",
		barcelona: "spain",

		// Italy
		milan: "italy",
		rome: "italy",

		// Sweden
		stockholm: "sweden",

		// Denmark
		copenhagen: "denmark",

		// Austria
		vienna: "austria",

		// Czech Republic
		prague: "czechia",

		// Poland
		warsaw: "poland",
	};
	return cityToCountry[city.toLowerCase()] || "unknown";
}

function getCountryVariations(country: string): string[] {
	// Comprehensive country variations for job matching across different data sources
	const variations: Record<string, string[]> = {
		uk: [
			"uk",
			"united kingdom",
			"gb",
			"great britain",
			"england",
			"scotland",
			"wales",
			"northern ireland",
			"britain",
			"ukraine", // Note: ukraine is intentionally excluded to avoid confusion
		],
		germany: [
			"germany",
			"deutschland",
			"de",
			"federal republic of germany",
			"bundesrepublik deutschland",
			"deutschland bundesrepublik",
			"german federal republic",
		],
		france: [
			"france",
			"fr",
			"french republic",
			"république française",
			"republique francaise",
		],
		netherlands: [
			"netherlands",
			"holland",
			"nl",
			"nederland",
			"the netherlands",
			"kingdom of the netherlands",
		],
		spain: ["spain", "es", "españa", "kingdom of spain", "reino de españa"],
		italy: ["italy", "it", "italia", "italian republic", "repubblica italiana"],
		sweden: [
			"sweden",
			"se",
			"sverige",
			"kingdom of sweden",
			"konungariket sverige",
		],
		denmark: [
			"denmark",
			"dk",
			"danmark",
			"kingdom of denmark",
			"kongeriget danmark",
		],
		norway: ["norway", "no", "norge", "kingdom of norway", "kongeriket norge"],
		finland: [
			"finland",
			"fi",
			"suomi",
			"republic of finland",
			"suomen tasavalta",
		],
		poland: [
			"poland",
			"pl",
			"polska",
			"republic of poland",
			"rzeczpospolita polska",
		],
		belgium: [
			"belgium",
			"be",
			"belgië",
			"belgique",
			"kingdom of belgium",
			"koninkrijk belgië",
		],
		austria: [
			"austria",
			"at",
			"österreich",
			"republik österreich",
			"republic of austria",
		],
		switzerland: [
			"switzerland",
			"ch",
			"schweiz",
			"suisse",
			"svizzera",
			"svizra",
			"swiss confederation",
			"schweizerische eidgenossenschaft",
			"confédération suisse",
			"confederazione svizzera",
		],
		portugal: [
			"portugal",
			"pt",
			"portuguesa",
			"república portuguesa",
			"portuguese republic",
		],
		ireland: [
			"ireland",
			"ie",
			"éire",
			"ireland republic",
			"republic of ireland",
			"poblacht na héireann",
		],
		czechia: [
			"czechia",
			"czech republic",
			"cz",
			"česko",
			"česká republika",
			"ceska republika",
		],
		hungary: [
			"hungary",
			"hu",
			"magyarország",
			"republic of hungary",
			"magyar köztársaság",
		],
		romania: [
			"romania",
			"ro",
			"românia",
			"republic of romania",
			"republica românia",
		],
		greece: [
			"greece",
			"gr",
			"ελλάδα",
			"hellas",
			"hellenic republic",
			"ελληνική δημοκρατία",
		],
		bulgaria: [
			"bulgaria",
			"bg",
			"българия",
			"republic of bulgaria",
			"република българия",
		],
		croatia: [
			"croatia",
			"hr",
			"hrvatska",
			"republic of croatia",
			"republika hrvatska",
		],
		slovenia: [
			"slovenia",
			"si",
			"slovenija",
			"republic of slovenia",
			"republika slovenija",
		],
		slovakia: [
			"slovakia",
			"sk",
			"slovensko",
			"slovak republic",
			"slovenská republika",
		],
		estonia: [
			"estonia",
			"ee",
			"eesti",
			"republic of estonia",
			"eesti vabariik",
		],
		latvia: [
			"latvia",
			"lv",
			"latvija",
			"republic of latvia",
			"latvijas republika",
		],
		lithuania: [
			"lithuania",
			"lt",
			"lietuva",
			"republic of lithuania",
			"lietuvos respublika",
		],
		luxembourg: [
			"luxembourg",
			"lu",
			"luxembourg",
			"grand duchy of luxembourg",
			"grand-duché de luxembourg",
		],
		malta: ["malta", "mt", "repubblika ta' malta", "republic of malta"],
		cyprus: [
			"cyprus",
			"cy",
			"κύπρος",
			"kıbrıs",
			"republic of cyprus",
			"κυπριακή δημοκρατία",
		],
		iceland: [
			"iceland",
			"is",
			"ísland",
			"republic of iceland",
			"lýðveldið ísland",
		],
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
	cities: z
		.array(z.string().max(50))
		.min(1, "Select at least one city")
		.max(3, "Maximum 3 cities allowed"),
	careerPath: z.array(z.string()).min(1, "Select at least one career path"),
	entryLevelPreferences: z
		.array(z.string())
		.optional()
		.default(["graduate", "intern", "junior"]),
	// Visa status is optional for free tier - assume EU citizen as default
	// Premium users get detailed visa filtering as an upgrade feature
	visaStatus: z.string().optional().default("EU citizen"),
	// GDPR compliance fields
	age_verified: z
		.boolean()
		.refine((val) => val === true, "Age verification is required"),
	terms_accepted: z
		.boolean()
		.refine((val) => val === true, "Terms of service must be accepted"),
});

export const POST = asyncHandler(async (request: NextRequest) => {
	const requestId = getRequestId(request);
	
	console.log("[FREE SIGNUP] Request received", {
		requestId,
		timestamp: new Date().toISOString(),
		url: request.url,
		method: request.method,
	});
	
	// Set Sentry context for this request
	Sentry.setContext("request", {
		requestId,
		endpoint: "signup-free",
		method: "POST",
	});

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
		apiLogger.warn("Rate limit exceeded for free signup", {
			requestId,
			ip: request.headers.get("x-forwarded-for") || "unknown",
			endpoint: "signup-free",
		});
		Sentry.captureMessage("Rate limit exceeded for free signup", {
			level: "warning",
			tags: { endpoint: "signup-free", error_type: "rate_limit" },
			extra: {
				requestId,
				ip: request.headers.get("x-forwarded-for") || "unknown",
			},
		});
		return rateLimitResult;
	}

	const body = await request.json();
	console.log("[FREE SIGNUP] Request body received", {
		requestId,
		email: body.email,
		full_name: body.full_name,
		cities: body.cities,
		citiesLength: body.cities?.length,
		careerPath: body.careerPath,
		careerPathLength: body.careerPath?.length,
		visaStatus: body.visaStatus,
		hasBirthYear: !!body.birth_year,
		age_verified: body.age_verified,
		terms_accepted: body.terms_accepted,
	});

	// Validate input with zod
	const validationResult = freeSignupSchema.safeParse(body);
	console.log("[FREE SIGNUP] Validation result", {
		requestId,
		success: validationResult.success,
		errors: validationResult.success ? null : validationResult.error.issues,
	});

	if (!validationResult.success) {
		const errors = validationResult.error.issues
			.map((e: any) => `${e.path.join(".")}: ${e.message}`)
			.join(", ");
		const validationError = new Error(errors);
		
		apiLogger.warn("Free signup validation failed", validationError, {
			requestId,
			email: body.email,
			full_name: body.full_name,
			cities: body.cities,
			citiesLength: body.cities?.length,
			careerPath: body.careerPath,
			careerPathLength: body.careerPath?.length,
			visaStatus: body.visaStatus,
			requestBody: body,
		});
		
		Sentry.captureMessage("Free signup validation failed", {
			level: "warning",
			tags: { endpoint: "signup-free", error_type: "validation" },
			extra: {
				requestId,
				email: body.email,
				errors: validationResult.error.issues,
				cities: body.cities,
				careerPath: body.careerPath,
			},
		});
		
		return NextResponse.json(
			{
				error: "invalid_input",
				message:
					"Please check your information and try again. All fields are required and must be valid.",
				details: validationResult.error.issues,
				requestId,
			},
			{ status: 400 },
		);
	}

	const {
		email,
		full_name,
		cities,
		careerPath,
		entryLevelPreferences,
		visaStatus,
		age_verified: _age_verified,
	} = validationResult.data;

	// Map visaStatus to visa_status format (for consistency with existing data)
	const visa_status =
		visaStatus === "yes" ? "Non-EU (require sponsorship)" : "EU citizen";

	const supabase = getDatabaseClient();
	const normalizedEmail = email.toLowerCase().trim();
	console.log("[FREE SIGNUP] Checking for existing user", {
		requestId,
		normalizedEmail,
	});

	// Check if email already used (any tier)
	// NOTE: exec_sql RPC doesn't exist, using direct query instead
	let existingUser = null;
	try {
		const { data, error } = await supabase
			.from("users")
			.select("id, subscription_tier")
			.eq("email", normalizedEmail)
			.maybeSingle();
		
		console.log("[FREE SIGNUP] Existing user check result", {
			requestId,
			normalizedEmail,
			hasError: !!error,
			error: error ? { code: error.code, message: error.message } : null,
			existingUser: data ? { id: data.id, tier: data.subscription_tier } : null,
		});
		
		if (error) {
			apiLogger.warn("Error checking existing user", error as Error, {
				requestId,
				email: normalizedEmail,
				errorCode: error.code,
				errorMessage: error.message,
			});
			Sentry.captureException(error, {
				tags: { endpoint: "signup-free", error_type: "user_check" },
				extra: {
					requestId,
					email: normalizedEmail,
					errorCode: error.code,
				},
			});
		} else {
			existingUser = data;
		}
	} catch (e) {
		const errorMessage = e instanceof Error ? e.message : String(e);
		apiLogger.error("Unexpected error checking existing user", e as Error, {
			requestId,
			email: normalizedEmail,
			error: errorMessage,
		});
		Sentry.captureException(e instanceof Error ? e : new Error(errorMessage), {
			tags: { endpoint: "signup-free", error_type: "user_check_unexpected" },
			extra: {
				requestId,
				email: normalizedEmail,
			},
		});
		// Continue - don't block signup if check fails
	}

	if (existingUser) {
		console.log("[FREE SIGNUP] User already exists, returning 409", {
			requestId,
			normalizedEmail,
			userId: existingUser.id,
			tier: existingUser.subscription_tier,
		});
		
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

	response.cookies.set("user_email", normalizedEmail, {
		httpOnly: true,
		secure: isProduction && isHttps,
		sameSite: "lax",
		maxAge: 60 * 60 * 24 * 30, // 30 days
		path: "/",
	});

		// Check if they have matches
		const { data: existingMatches } = await supabase
			.from("user_matches")
			.select("job_id")
			.eq("user_id", existingUser.id)
			.limit(1);

		apiLogger.info("Existing free user tried to sign up again", {
			requestId,
			email: normalizedEmail,
			hasMatches: (existingMatches?.length || 0) > 0,
			matchCount: existingMatches?.length || 0,
		});

		return response;
	}

	// Clean up any promo_pending entries - promo codes are for premium only, not free
	// NOTE: exec_sql RPC doesn't exist, using direct query instead
	try {
		const { error: deleteError } = await supabase
			.from("promo_pending")
			.delete()
			.eq("email", normalizedEmail);
		
		if (deleteError) {
			// Log but don't fail - this is cleanup, not critical
			apiLogger.warn("Failed to clean up promo_pending", deleteError as Error, {
				requestId,
				email: normalizedEmail,
				errorCode: deleteError.code,
			});
		}
	} catch (e) {
		// Log but don't fail - this is cleanup, not critical
		const errorMessage = e instanceof Error ? e.message : String(e);
		apiLogger.warn("Unexpected error cleaning up promo_pending", {
			requestId,
			email: normalizedEmail,
			error: errorMessage,
		});
	}

	// Create free user record
	const freeExpiresAt = new Date();
	freeExpiresAt.setDate(freeExpiresAt.getDate() + 30); // 30 days from now

	console.log("[FREE SIGNUP] Creating user", {
		requestId,
		normalizedEmail,
		full_name,
		cities,
		careerPath,
		visa_status,
	});

	// Insert user with full data in one operation
	// NOTE: The users table has a foreign key to auth.users(id), so we must NOT
	// specify an ID here. Supabase will handle ID generation or this will fail
	// with the foreign key constraint. For free users, we create a record without
	// a corresponding auth.users entry (allowing NULL for now).
	const { data: minimalUserData, error: minimalError } = await supabase
		.from("users")
		.insert({
			email: normalizedEmail,
		})
		.select("id, email")
		.single();
	
	console.log("[FREE SIGNUP] Minimal user insert result", {
		requestId,
		normalizedEmail,
		hasError: !!minimalError,
		error: minimalError ? { code: minimalError.code, message: minimalError.message } : null,
		userData: minimalUserData ? { id: minimalUserData.id, email: minimalUserData.email } : null,
	});

	if (minimalError) {
		apiLogger.error("Failed to create minimal user", minimalError as Error, {
			requestId,
			email: normalizedEmail,
		});
		Sentry.captureException(minimalError, {
			tags: { endpoint: "signup-free", error_type: "user_creation" },
			extra: {
				requestId,
				email: normalizedEmail,
				stage: "minimal_user_insert",
			},
		});
		throw minimalError;
	}

	// Now try to update with additional fields (this might fail due to schema cache)
	let userData: any = minimalUserData;
	console.log("[FREE SIGNUP] Updating user with additional fields", {
		requestId,
		normalizedEmail,
		userId: minimalUserData.id,
	});
	
	try {
		// Form now sends long form directly (data-analytics, finance-investment, etc)
		// No conversion needed - store as-is
		const { data: updatedUserData, error: updateError } = await supabase
			.from("users")
			.update({
				full_name,
				subscription_tier: "free",
				free_signup_at: new Date().toISOString(),
				free_expires_at: freeExpiresAt.toISOString(),
				target_cities: cities,
				career_path: careerPath[0] || null,
				entry_level_preference:
					entryLevelPreferences?.join(", ") || "graduate, intern, junior",
				visa_status: visa_status,
				email_verified: true,
				subscription_active: false,
			})
			.eq("id", minimalUserData.id)
			.select()
			.single();
		
		console.log("[FREE SIGNUP] User update result", {
			requestId,
			normalizedEmail,
			hasError: !!updateError,
			error: updateError ? { code: updateError.code, message: updateError.message } : null,
			updated: !!updatedUserData,
		});

		if (!updateError && updatedUserData) {
			userData = updatedUserData;
		}
		// If update fails, continue with minimal user data
	} catch (updateError) {
		const errorMessage = updateError instanceof Error ? updateError.message : String(updateError);
		apiLogger.warn("Failed to update user with additional fields, continuing with minimal data", {
			requestId,
			email: normalizedEmail,
			error: errorMessage,
		});
		Sentry.captureException(updateError instanceof Error ? updateError : new Error(errorMessage), {
			tags: { endpoint: "signup-free", error_type: "user_update" },
			level: "warning",
			extra: {
				requestId,
				email: normalizedEmail,
				stage: "user_field_update",
			},
		});
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

	// Fallback to cities if target_cities is empty (shouldn't happen, but safety check)
	if (
		targetCities.length === 0 &&
		cities &&
		cities.length > 0
	) {
		targetCities = cities;
	}

	apiLogger.info("Free signup - cities normalized", {
		requestId,
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
		requestId,
		email: normalizedEmail,
		targetCities: targetCities,
		targetCountries: Array.from(targetCountries),
		targetCountryVariations: Array.from(targetCountryVariations),
		strategy: targetCountries.size > 0 ? "country-level" : "no-location-filter",
	});

	// SIMPLIFIED: Let PrefilterService handle all smart filtering
	// Only do basic fetching - active, status, and freshness
	// BUT: ADD COUNTRY FILTER at DB level to avoid fetching US jobs
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

	// 🔴 CRITICAL: Add country-level filtering at DB query level
	// This prevents fetching 28k US jobs when user selects Berlin
	if (targetCountries.size > 0) {
		const countriesArray = Array.from(targetCountries);
		query = query.in("country", countriesArray);
		apiLogger.info("Free signup - country filter applied at DB level", {
			requestId,
			countries: countriesArray,
		});
	}
	// REMOVED LIMIT - let PrefilterService filter by location/career first

	apiLogger.info("Free signup - job query configured", {
		requestId,
		email: normalizedEmail,
		strategy: "country-filter-at-db-level",
		note: "PrefilterService handles city/career filtering after DB fetch",
	});

	let { data: allJobs, error: jobsError } = await query;
	console.log("[FREE SIGNUP] Initial job fetch result", {
		requestId,
		normalizedEmail,
		jobCount: allJobs?.length || 0,
		hasError: !!jobsError,
		error: jobsError ? { code: jobsError.code, message: jobsError.message } : null,
	});

	// ENTERPRISE-LEVEL FIX: Improved fallback logic
	// Since we already use country-level matching, fallback is simpler
	if (
		(jobsError || !allJobs || allJobs.length === 0) &&
		targetCountries.size > 0
	) {
		apiLogger.warn(
			"Free signup - no jobs found for target countries, trying broader fallback",
			{
				requestId,
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
					requestId,
					email: normalizedEmail,
					jobCount: allJobs.length,
					note: "Pre-filtering will handle city matching",
				},
			);
		}
	}

	// Final check: if still no jobs, return error
	if (jobsError || !allJobs || allJobs.length === 0) {
		const reason = targetCities.length === 0
			? "No cities selected"
			: jobsError
				? `Database error: ${jobsError.message}`
				: "No jobs match your criteria after all fallback attempts";
		
		apiLogger.warn("Free signup - no jobs found after all fallbacks", {
			requestId,
			email: normalizedEmail,
			cities: targetCities,
			careerPath: userData.career_path,
			jobsError: jobsError?.message,
			jobsCount: allJobs?.length || 0,
			reason,
		});
		
		Sentry.captureMessage("Free signup - no jobs found after all fallbacks", {
			level: "warning",
			tags: { endpoint: "signup-free", error_type: "no_jobs_found" },
			extra: {
				requestId,
				email: normalizedEmail,
				cities: targetCities,
				careerPath: userData.career_path,
				reason,
				jobsError: jobsError?.message,
			},
		});
		
		return NextResponse.json(
			{
				error: "no_jobs_found",
				message: `No jobs found. ${reason}. Try different cities or career paths.`,
				details: { cities: targetCities, careerPath: userData.career_path },
				requestId,
			},
			{ status: 404 },
		);
	}

	// NEW ARCHITECTURE: "Funnel of Truth"
	// Stage 1: SQL Filter (already done - is_active, city, early-career)
	// Stage 2-4: Hard Gates + Pre-Ranking + AI (handled in consolidatedMatchingV2)
	// Stage 5: Diversity Pass (in distributeJobsWithDiversity)
	apiLogger.info("Free signup - using new matching architecture", {
		requestId,
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
		apiLogger.warn("Free signup - no jobs available for matching", {
			requestId,
			email: normalizedEmail,
			targetCities,
			careerPath: userData.career_path,
		});
		Sentry.captureMessage("Free signup - no jobs available for matching", {
			level: "warning",
			tags: { endpoint: "signup-free", error_type: "no_jobs_for_matching" },
			extra: {
				requestId,
				email: normalizedEmail,
				targetCities,
				careerPath: userData.career_path,
			},
		});
		return NextResponse.json(
			{
				error: "no_jobs_for_matching",
				message: "No jobs available for matching. Try different cities or career paths.",
				details: { cities: targetCities, careerPath: userData.career_path },
				requestId,
			},
			{ status: 404 },
		);
	}

	// REFACTORED: Use consolidated matching service
	console.log("[FREE SIGNUP] Starting matching", {
		requestId,
		normalizedEmail,
		jobsForMatching: jobsForMatching.length,
		userPrefs: {
			email: userPrefs.email,
			target_cities: userPrefs.target_cities,
			career_path: userPrefs.career_path,
			visa_status: userPrefs.visa_status,
		},
	});
	
	const matchingConfig = SignupMatchingService.getConfig("free");
	const matchingResult = await SignupMatchingService.runMatching(
		userPrefs,
		matchingConfig,
	);

	const matchesCount = matchingResult.matchCount;
	console.log("[FREE SIGNUP] Matching complete", {
		requestId,
		normalizedEmail,
		matchesCount,
		method: matchingResult.method,
		hasError: !!matchingResult.error,
		error: matchingResult.error || null,
	});

	// Check for matches
	if (matchesCount === 0) {
		const matchingReason = matchingResult.error || "No jobs matched user criteria after filtering";
		apiLogger.info("Free signup - no matches found for user criteria", {
			requestId,
			email: normalizedEmail,
			jobsAvailable: jobsForMatching.length,
			method: matchingResult.method,
			reason: matchingReason,
			userCriteria: {
				cities: targetCities,
				careerPath: userData.career_path,
				visaStatus: userData.visa_status,
			},
		});
		Sentry.captureMessage("Free signup - no matches found for user criteria", {
			level: "info",
			tags: { endpoint: "signup-free", error_type: "no_matches_found" },
			extra: {
				requestId,
				email: normalizedEmail,
				jobsAvailable: jobsForMatching.length,
				method: matchingResult.method,
				reason: matchingReason,
				cities: targetCities,
				careerPath: userData.career_path,
			},
		});
		return NextResponse.json(
			{
				error: "no_matches_found",
				message: `No matches found. ${matchingReason}. Try different cities or career paths.`,
				details: {
					cities: targetCities,
					careerPath: userData.career_path,
					method: matchingResult.method,
					reason: matchingReason,
				},
				requestId,
			},
			{ status: 404 },
		);
	}

	// REFACTORED: Service already saved matches, create response
	const response = NextResponse.json({
		success: true,
		matchesCount: matchesCount,
		userId: userData.id,
		email: userData.email,
	});

	// Set session cookie for client-side auth
	// Set a session cookie (simple approach - you may want JWT instead)
	// Cookie expiration matches user expiration (30 days)
	// FIXED: In production, always set secure flag. Vercel automatically handles HTTPS
	// In development (localhost), secure is false which is correct
	const isProduction = process.env.NODE_ENV === "production";
	const secure = isProduction; // Simplified: production always uses HTTPS on Vercel

	try {
		response.cookies.set("user_email", userData.email, {
			httpOnly: true,
			secure: secure,
			sameSite: "lax",
			maxAge: 30 * 24 * 60 * 60, // 30 days
			path: "/",
		});
	} catch (sessionError) {
		apiLogger.warn(
			"Failed to create user_email cookie (non-critical)",
			sessionError as Error,
			{
				requestId,
				email: normalizedEmail,
			},
		);
	}

	apiLogger.info("Cookie set for user", {
		requestId,
		email: normalizedEmail,
		secure: secure,
		isProduction,
	});

	apiLogger.info("Free signup successful", {
		requestId,
		email: normalizedEmail,
		matchCount: matchesCount,
	});

	console.log("[FREE SIGNUP] Signup successful, returning response", {
		requestId,
		normalizedEmail,
		userId: userData.id,
		matchCount: matchesCount,
		hasSessionCookie: true,
	});

	return response;
});
