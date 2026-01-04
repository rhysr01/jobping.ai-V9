import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { getDatabaseClient } from "@/Utils/databasePool";
import { getDatabaseCategoriesForForm } from "@/Utils/matching/categoryMapper";
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
		const { cities, careerPath } = body;

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

		const supabase = getDatabaseClient();

		// Map career path to database categories
		const careerPathCategories = getDatabaseCategoriesForForm(careerPath);

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

		// Filter by cities at database level
		if (cities.length > 0 && cities.length <= 50) {
			query = query.in("city", cities);
		}

		// Filter by career path categories
		if (careerPathCategories.length > 0 && careerPathCategories.length <= 20) {
			query = query.overlaps("categories", careerPathCategories);
		}

		// Also filter for early-career roles only
		query = query.or(
			"is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}",
		);

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
		const userPrefs: UserPreferences = {
			email: "preview@example.com", // Dummy email for preview
			target_cities: cities,
			career_path: careerPath ? [careerPath] : [],
			subscription_tier: "free" as const,
			// Default preferences (most lenient for preview)
			work_environment: undefined, // Don't filter by work env in preview
			languages_spoken: [],
			roles_selected: [],
			company_types: [],
			visa_status: undefined, // Don't filter by visa in preview (too restrictive)
			entry_level_preference: undefined,
			professional_expertise: careerPath || "",
		};

		// Apply hard gates to get realistic count
		const eligibleJobs = preFilterByHardGates(sampleJobs, userPrefs);
		const realisticCount = eligibleJobs.length;

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
