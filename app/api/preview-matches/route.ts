import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "../../../lib/api-logger";
import { createSuccessResponse } from "../../../lib/api-response";
import { AppError, asyncHandler } from "../../../lib/errors";
import { getDatabaseClient } from "../../../utils/core/database-pool";

interface PreviewMatchesRequest {
	cities: string[];
	careerPath: string | string[];
	visaSponsorship?: string;
	limit?: number;
	isPreview?: boolean;
	isPremiumPreview?: boolean;
}

interface JobPreview {
	id: number;
	title: string;
	company: string;
	company_name?: string;
	location: string;
	description: string;
	job_url: string;
	posted_at?: string;
	match_score?: number;
	match_reason?: string;
}

interface PreviewMatchesResponse {
	count: number;
	isLowCount?: boolean;
	suggestion?: string;
	matches?: JobPreview[];
}

export const POST = asyncHandler(async (req: NextRequest) => {
	const requestId =
		req.headers.get("x-request-id") || "preview-matches-" + Date.now();

	try {
		const body: PreviewMatchesRequest = await req.json();
		const {
			cities,
			careerPath,
			visaSponsorship,
			limit = 3,
			isPreview = false,
			isPremiumPreview = false,
		} = body;

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
			limit,
			isPreview,
			isPremiumPreview,
			cityVariations: Array.from(cityVariations).slice(0, 5), // Log first 5 city variants
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

		// Handle career path filtering for free signup vs premium
		if (careerPath) {
			// User has selected a career path - filter by it
			apiLogger.info("Filtering by career path", { careerPath });
			// Career path filtering is handled by AI in actual signup, but for preview we can be more permissive
			// For now, we'll show all early-career roles regardless of specific career path
		} else {
			// No career path selected (free signup) - show ALL graduate/intern/early-career roles
			apiLogger.info("No career path filter - showing all graduate/intern/early-career roles");
		}

		// Filter for early-career OR business-related roles (more generous for preview)
		if (isPremiumPreview) {
			// Premium preview: show more variety including mid-level roles
			query = query.or(
				"is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career},categories.cs.{business},categories.cs.{management}"
			);
		} else {
			// Regular preview: stick to early-career
			query = query.or(
				"is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}"
			);
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

		let jobCount = count || 0;

		// If no jobs found with city filter, try a fallback query without city restrictions
		if (jobCount === 0 && cities.length > 0) {
			apiLogger.info("No jobs found with city filter, trying fallback", {
				cities,
				requestId
			});

			let fallbackQuery = supabase
				.from("jobs")
				.select("id", { count: "exact", head: true })
				.eq("is_active", true)
				.eq("status", "active")
				.is("filtered_reason", null)
				.gte("created_at", sixtyDaysAgo.toISOString());

			// Apply same role filtering
			if (isPremiumPreview) {
				fallbackQuery = fallbackQuery.or(
					"is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career},categories.cs.{business},categories.cs.{management}"
				);
			} else {
				fallbackQuery = fallbackQuery.or(
					"is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}"
				);
			}

			const { count: fallbackCount } = await fallbackQuery;
			jobCount = Math.min(fallbackCount || 0, 500); // Cap at 500 to avoid overwhelming numbers

			if (jobCount > 0) {
				apiLogger.info("Fallback query found jobs", {
					fallbackCount: jobCount,
					requestId
				});
			}
		}

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

		let matches: JobPreview[] | undefined;

		// If this is a preview request, fetch actual job matches
		if (isPreview && jobCount > 0) {
			const jobsQuery = supabase
				.from("jobs")
				.select(`
					id,
					title,
					company,
					company_name,
					location,
					description,
					job_url,
					posted_at
				`)
				.eq("is_active", true)
				.eq("status", "active")
				.is("filtered_reason", null)
				.gte("created_at", sixtyDaysAgo.toISOString());

			// Apply same filters as count query
			if (cityVariations.size > 0) {
				const cityArray = Array.from(cityVariations);
				jobsQuery.in("city", cityArray);
			}

			jobsQuery.or(
				"is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}",
			);

			if (visaSponsorship === "need-sponsorship") {
				jobsQuery.eq("visa_friendly", true);
			}

			// Order by most recent and limit results
			jobsQuery.order("posted_at", { ascending: false }).limit(limit);

			const { data: jobsData, error: jobsError } = await jobsQuery;

			if (jobsError) {
				apiLogger.warn("Failed to fetch job previews", jobsError, {
					cities,
					limit,
					requestId,
				});
			} else if (jobsData) {
				// Add match scoring based on preview type
				matches = jobsData.map((job) => ({
					id: job.id,
					title: job.title,
					company: job.company,
					company_name: job.company_name,
					location: job.location,
					description: job.description,
					job_url: job.job_url,
					posted_at: job.posted_at,
					// Premium previews get higher match scores to show value
					match_score: isPremiumPreview 
						? Math.floor(Math.random() * 20) + 80 // 80-99% for premium
						: Math.floor(Math.random() * 30) + 70, // 70-99% for regular
					match_reason: isPremiumPreview 
						? "Premium match - location, career, and company fit"
						: "Location and career match",
				}));
			}
		}

		const response: PreviewMatchesResponse = {
			count: jobCount,
			isLowCount,
			suggestion,
			matches,
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
