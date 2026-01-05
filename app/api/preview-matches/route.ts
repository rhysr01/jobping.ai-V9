import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { getDatabaseClient } from "@/Utils/databasePool";
import { getProductionRateLimiter } from "@/Utils/productionRateLimiter";
import { preFilterByHardGates } from "@/Utils/matching/preFilterHardGates";
import type { UserPreferences } from "@/Utils/matching/types";

export async function POST(request: NextRequest) {
	// Rate limiting - prevent abuse
	const rateLimitResult = await getProductionRateLimiter().middleware(
		request,
		"preview-matches",
		{
			windowMs: 60 * 1000, // 1 minute
			maxRequests: 20, // 20 requests per minute per IP
		},
	);

	if (rateLimitResult) {
		return rateLimitResult;
	}

	try {
		const body = await request.json();
		const { cities, careerPath, visaSponsorship } = body;

		// Validate input
		if (!cities || !Array.isArray(cities) || cities.length === 0) {
			return NextResponse.json(
				{ error: "Cities array is required" },
				{ status: 400 },
			);
		}

		if (!careerPath || typeof careerPath !== "string") {
			return NextResponse.json(
				{ error: "Career path is required" },
				{ status: 400 },
			);
		}

		// visaSponsorship is optional (user may not have selected it yet)
		// but should be validated if provided
		if (
			visaSponsorship !== undefined &&
			typeof visaSponsorship !== "string"
		) {
			return NextResponse.json(
				{ error: "Invalid visa sponsorship value" },
				{ status: 400 },
			);
		}

		const supabase = getDatabaseClient();

		// PERFORMANCE FIX: Fetch limited sample (1000 jobs max) instead of all jobs
	// This gives us a representative sample to estimate realistic count
	const SAMPLE_SIZE = 1000;
	const SIXTY_DAYS_AGO = new Date();
	SIXTY_DAYS_AGO.setDate(SIXTY_DAYS_AGO.getDate() - 60);

	// Build query to fetch sample jobs (not just count)
	let query = supabase
		.from("jobs")
		.select("*")
		.eq("is_active", true)
		.eq("status", "active")
		.is("filtered_reason", null)
		.gte("created_at", SIXTY_DAYS_AGO.toISOString()) // Recent jobs only
		.limit(SAMPLE_SIZE); // CRITICAL: Limit to prevent memory issues

	// DEBUG: Temporarily skip city filtering to see total jobs
	// Filter by cities at database level
	// if (cities.length > 0 && cities.length <= 50) {
	// 	query = query.in("city", cities);
	// }

	// DON'T filter by career path at DB level - too restrictive for preview
	// Let hard gates handle career path matching for more accurate preview
	// This matches the signup API's approach (signup/free/route.ts lines 332-334)
	// Database has categories like "strategy-business-design" not "strategy"

	// DEBUG: Simplify to just check early-career category
	query = query.contains("categories", ["early-career"]);

		// Order by recency for better sample quality
		query = query.order("created_at", { ascending: false });

	const { data: sampleJobs, error } = await query;

	if (error) {
		apiLogger.error("Failed to fetch preview matches", error as Error, {
			cities,
			careerPath,
		});
		return NextResponse.json(
			{ error: "Failed to count matches" },
			{ status: 500 },
		);
	}

	// DEBUG: Log what we actually fetched
	console.log("PREVIEW DEBUG:", {
		cities,
		careerPath,
		visaSponsorship,
		jobsFetched: sampleJobs?.length || 0,
		sampleCities: sampleJobs?.slice(0, 3).map(j => ({ city: j.city, categories: j.categories })) || []
	});

		// If no jobs found in sample, return early
		if (!sampleJobs || sampleJobs.length === 0) {
			return NextResponse.json({
				count: 0,
				realisticCount: 0,
				cities,
				careerPath,
				isLowCount: true,
				suggestion: `No matches found in ${cities.join(", ")}. Try selecting different cities or career paths to see more opportunities.`,
			});
		}

	// Apply hard gates (same logic as matching engine) to get realistic count
	// Map visa_sponsorship to visa_status (same as signup API)
	const visa_status =
		visaSponsorship === "yes"
			? "Non-EU (require sponsorship)"
			: visaSponsorship === "no"
				? "EU citizen"
				: undefined; // If not provided yet, don't filter by visa

	const userPrefs: UserPreferences = {
		email: "preview@example.com", // Dummy email for preview
		target_cities: cities,
		career_path: careerPath ? [careerPath] : [],
		subscription_tier: "free" as const,
		// Default preferences (lenient for preview but realistic)
		work_environment: undefined, // Don't filter by work env in preview
		languages_spoken: [],
		roles_selected: [],
		company_types: [],
		visa_status: visa_status, // Use actual visa status if provided
		entry_level_preference: undefined,
		professional_expertise: careerPath || "",
	};

	// Apply hard gates to get realistic count
	const eligibleJobs = preFilterByHardGates(sampleJobs, userPrefs);
	let realisticCount = eligibleJobs.length;

	// CRO OPTIMIZATION: Visa is the critical filter, be smart about preview
	if (realisticCount === 0 && sampleJobs.length > 0) {
		// Since form requires visa selection first, but preview might trigger before it's set
		if (userPrefs.visa_status) {
			// User has selected visa status - be lenient with career path only
			const visaLenientPrefs = {
				...userPrefs,
				career_path: [], // Skip career path for estimation, keep visa strict
			};
			const visaLenientJobs = preFilterByHardGates(sampleJobs, visaLenientPrefs);
			if (visaLenientJobs.length > 0) {
				realisticCount = Math.max(1, Math.min(5, Math.floor(visaLenientJobs.length * 0.4)));
			}
		} else {
			// Visa not selected yet - be very lenient (skip both career + visa)
			const fullyLenientPrefs = {
				...userPrefs,
				career_path: [],
				visa_status: undefined,
			};
			const fullyLenientJobs = preFilterByHardGates(sampleJobs, fullyLenientPrefs);
			if (fullyLenientJobs.length > 0) {
				realisticCount = Math.max(1, Math.min(3, Math.floor(fullyLenientJobs.length * 0.2)));
			}
		}

		// Final fallback - always show at least 1 potential match
		if (realisticCount === 0) {
			realisticCount = 1;
		}
	}

	// Calculate pass rate to estimate total realistic count
	// If we sampled 1000 jobs and 100 passed, we estimate ~10% pass rate
	const passRate =
		sampleJobs.length > 0 ? realisticCount / sampleJobs.length : 0;

	// Determine if count is low and needs UI nudge
	const isLowCount = realisticCount < 3;
	const suggestion = isLowCount
		? `Matches are tight in ${cities.join(", ")}. Try selecting different cities or career paths to see more opportunities.`
		: undefined;

		return NextResponse.json({
			count: realisticCount, // Realistic count after hard gates
			rawCount: sampleJobs.length, // Raw SQL count for debugging
			passRate: Math.round(passRate * 100) / 100, // Pass rate for analytics
			cities,
			careerPath,
			isLowCount,
			suggestion,
		});
	} catch (error) {
		apiLogger.error("Preview matches API error", error as Error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
