import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "../../../lib/api-logger";
import { createSuccessResponse } from "../../../lib/api-response";
import { AppError, asyncHandler } from "../../../lib/errors";
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
	const requestId =
		req.headers.get("x-request-id") || "preview-matches-" + Date.now();

	try {
		const body: PreviewMatchesRequest = await req.json();
		const { cities, careerPath, visaSponsorship } = body;

		// Validate required fields
		if (!cities || !Array.isArray(cities) || cities.length === 0) {
			throw new AppError("Cities array is required", 400, "VALIDATION_ERROR");
		}

		if (
			!careerPath ||
			(typeof careerPath !== "string" && !Array.isArray(careerPath))
		) {
			throw new AppError("Career path is required", 400, "VALIDATION_ERROR");
		}

		apiLogger.info("Preview matches request", {
			cities,
			careerPath: careerPath || "not filtered (handled by AI)",
			visaSponsorship,
			requestId,
			note: "Career path filtering handled by AI matching, not database",
		});

		const supabase = getDatabaseClient();

		// Build the query for job matching - match free signup filtering logic
		const sixtyDaysAgo = new Date();
		sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

		let query = supabase
			.from("jobs")
			.select("id", { count: "exact", head: true })
			.eq("is_active", true)
			.eq("status", "active")
			.is("filtered_reason", null)
			.gte("created_at", sixtyDaysAgo.toISOString());

		// Build city variations array (handles native names like Wien, Zürich, Milano, Roma)
		const cityVariations = new Set<string>();
		if (cities.length > 0) {
			cities.forEach((city) => {
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

		// Filter by city variations (city is more important)
		if (cityVariations.size > 0) {
			const cityArray = Array.from(cityVariations);
			query = query.in("city", cityArray);
		}

		// DON'T filter by career path at DB level - too restrictive for preview
		// Career path filtering is handled by AI matching in the actual signup process
		// Preview should show all early-career jobs in selected cities, regardless of category

		// Filter for early-career roles (same as free signup API)
		query = query.or(
			"is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}",
		);

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
				filters:
					"active + status + recent + early-career + cities + visa (no career path filtering)",
			});
			throw new AppError(
				"Failed to fetch job count",
				500,
				"DATABASE_ERROR",
				error,
			);
		}

		const jobCount = count || 0;

		// Determine if this is a low count and provide suggestions
		let isLowCount = false;
		let suggestion;

		if (jobCount === 0) {
			isLowCount = true;
			suggestion =
				"Try selecting additional cities or a broader career path to find more opportunities.";
		} else if (jobCount < 10) {
			isLowCount = true;
			suggestion =
				"Consider expanding to more cities or exploring related career paths for better results.";
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

		const successResponse = createSuccessResponse(
			response,
			undefined,
			undefined,
			200,
		);
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
			error as Error,
		);
	}
});
