import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { getDatabaseClient } from "@/Utils/databasePool";
import { getDatabaseCategoriesForForm } from "@/Utils/matching/categoryMapper";
import { getProductionRateLimiter } from "@/Utils/productionRateLimiter";

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

		// Build optimized COUNT query (fast, no data fetching)
		let query = supabase
			.from("jobs")
			.select("*", { count: "exact", head: true })
			.eq("is_active", true)
			.eq("status", "active")
			.is("filtered_reason", null);

		// Filter by cities at database level
		if (cities.length > 0 && cities.length <= 50) {
			query = query.in("city", cities);
		}

		// Filter by career path categories
		if (careerPathCategories.length > 0 && careerPathCategories.length <= 20) {
			query = query.overlaps("categories", careerPathCategories);
		}

		// Also filter for early-career roles only (internships, graduate, junior)
		query = query.or(
			"is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}",
		);

		const { count, error } = await query;

		if (error) {
			apiLogger.error("Failed to count preview matches", error as Error, {
				cities,
				careerPath,
			});
			return NextResponse.json(
				{ error: "Failed to count matches" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			count: count || 0,
			cities,
			careerPath,
		});
	} catch (error) {
		apiLogger.error("Preview matches API error", error as Error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
