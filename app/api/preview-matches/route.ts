import { type NextRequest, NextResponse } from "next/server";
import { createSuccessResponse } from "../../../lib/api-response";
import { asyncHandler, AppError } from "../../../lib/errors";
import { apiLogger } from "../../../lib/api-logger";
import { getDatabaseClient } from "../../../utils/core/database-pool";

interface PreviewMatchesRequest {
	cities: string[];
	careerPath: string | string[];
	visaSponsorship?: string;
}

interface PreviewMatchesResponse {
	count: number;
	isLowCount?: boolean;
	suggestion?: string;
}

export const POST = asyncHandler(async (req: NextRequest) => {
	const requestId = req.headers.get("x-request-id") || "preview-matches-" + Date.now();

	try {
		const body: PreviewMatchesRequest = await req.json();
		const { cities, careerPath, visaSponsorship } = body;

		// Validate required fields
		if (!cities || !Array.isArray(cities) || cities.length === 0) {
			throw new AppError("Cities array is required", 400, "VALIDATION_ERROR");
		}

		if (!careerPath || (typeof careerPath !== "string" && !Array.isArray(careerPath))) {
			throw new AppError("Career path is required", 400, "VALIDATION_ERROR");
		}

		apiLogger.info("Preview matches request", {
			cities,
			careerPath,
			visaSponsorship,
			requestId,
		});

		const supabase = getDatabaseClient();

		// Build the query for job matching
		let query = supabase
			.from("jobs")
			.select("id", { count: "exact", head: true })
			.eq("is_active", true);

		// Filter by cities - match any of the selected cities
		if (cities.length > 0) {
			query = query.in("city", cities);
		}

		// Filter by career path - balanced matching approach
		if (careerPath) {
			const careerPathMapping: Record<string, string[]> = {
				"Strategy & Business Design": ["strategy", "business-design", "consulting"],
				"Data & Analytics": ["data", "analytics", "data-science"],
				"Sales & Client Success": ["sales", "business-development", "client-success"],
				"Marketing & Growth": ["marketing", "growth", "brand"],
				"Finance & Investment": ["finance", "accounting", "investment"],
				"Operations & Supply Chain": ["operations", "supply-chain", "logistics"],
				"Product & Innovation": ["product", "product-management", "innovation"],
				"Tech & Transformation": ["tech", "technology", "transformation", "it"],
				"Sustainability & ESG": ["sustainability", "esg", "environmental", "social"],
				"Not Sure Yet / General": ["general", "graduate", "trainee", "rotational"],
			};

			// Normalize to array for consistent processing
			const careerPaths = Array.isArray(careerPath) ? careerPath : [careerPath];

			// Get all categories for all selected career paths
			const allCareerCategories = careerPaths.flatMap(path =>
				careerPathMapping[path] || [path.toLowerCase()]
			);

			// Remove duplicates
			const uniqueCategories = [...new Set(allCareerCategories)];

			// Use overlaps to find jobs that match at least one category,
			// but we'll filter further in the application layer for balance
			query = query.overlaps("categories", uniqueCategories);
		}

		// Filter by visa sponsorship if specified
		if (visaSponsorship) {
			switch (visaSponsorship) {
				case "eu":
					// EU citizens can work anywhere - no filtering needed
					break;
				case "blue-card":
				case "student-visa":
					// These users have some work rights but may have restrictions
					// We'll show both visa-friendly and regular jobs
					break;
				case "need-sponsorship":
					// Only show jobs that explicitly offer visa sponsorship
					query = query.eq("visa_friendly", true);
					break;
			}
		}

		// Execute the count query
		const { count, error } = await query;

		if (error) {
			apiLogger.error("Database error in preview matches", error, {
				cities,
				careerPath,
				visaSponsorship,
				requestId,
			});
			throw new AppError("Failed to fetch job count", 500, "DATABASE_ERROR", error);
		}

		const jobCount = count || 0;

		// Determine if this is a low count and provide suggestions
		let isLowCount = false;
		let suggestion = undefined;

		if (jobCount === 0) {
			isLowCount = true;
			suggestion = "Try selecting additional cities or a broader career path to find more opportunities.";
		} else if (jobCount < 10) {
			isLowCount = true;
			suggestion = "Consider expanding to more cities or exploring related career paths for better results.";
		}

		const response: PreviewMatchesResponse = {
			count: jobCount,
			isLowCount,
			suggestion,
		};

		apiLogger.info("Preview matches response", {
			count: jobCount,
			isLowCount,
			hasSuggestion: !!suggestion,
			requestId,
		});

		const successResponse = createSuccessResponse(response, undefined, undefined, 200);
		const nextResponse = NextResponse.json(successResponse, { status: 200 });
		nextResponse.headers.set("x-request-id", requestId);

		return nextResponse;

	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		apiLogger.error("Unexpected error in preview matches", error as Error, {
			requestId,
		});

		throw new AppError(
			"An unexpected error occurred",
			500,
			"INTERNAL_ERROR",
			error as Error
		);
	}
});