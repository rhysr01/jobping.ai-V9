import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "../../../utils/core/database-pool";
import { apiLogger } from "../../../lib/api-logger";
import { asyncHandler } from "../../../lib/errors";

// Popular cities and career paths for sample jobs
const POPULAR_CITIES = ["London", "Paris", "Madrid", "Berlin", "Amsterdam"];
const POPULAR_CAREER_PATHS = ["Strategy", "Product", "Data", "Marketing", "Tech", "Business", "Consulting", "Design", "Engineering"];

interface SampleJob {
	title: string;
	company: string;
	location: string;
	matchScore: number;
	matchReason: string;
	workEnvironment: string;
	isInternship?: boolean;
	isGraduate?: boolean;
	description?: string;
	job_url?: string;
}

export const GET = asyncHandler(async (request: NextRequest) => {
	const { searchParams } = new URL(request.url);
	const day = searchParams.get("day") || "monday";
	const tier = searchParams.get("tier") || "free";
	const week = parseInt(searchParams.get("week") || "1");

	// Rate limiting for sample jobs (less strict than signup)
	const rateLimitResult = await getProductionRateLimiter().middleware(
		request,
		"sample-jobs",
		{
			windowMs: 60 * 1000, // 1 minute
			maxRequests: 20, // 20 requests per minute
		},
	);

	if (rateLimitResult) {
		return rateLimitResult;
	}

	const supabase = getDatabaseClient();

	// Simple SQL filtering: Get jobs from popular cities, recent, active, early-career
	const sixtyDaysAgo = new Date();
	sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

	// Build query for popular cities - more inclusive filtering
	let query = supabase
		.from("jobs")
		.select("*")
		.eq("is_active", true)
		.eq("status", "active")
		.is("filtered_reason", null)
		.gte("created_at", sixtyDaysAgo.toISOString())
		.or(
			"is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}",
		)
		.order("created_at", { ascending: false })
		.limit(100); // Get more jobs to filter from

	const { data: jobs, error } = await query;

	if (error) {
		apiLogger.error("Failed to fetch sample jobs", error);
		return NextResponse.json(
			{ error: "Failed to fetch sample jobs" },
			{ status: 500 },
		);
	}

	// Filter jobs to include those from popular cities (case-insensitive matching)
	const filteredJobs = jobs?.filter((job) => {
		const jobCity = job.city?.toLowerCase();
		const jobCountry = job.country?.toLowerCase();

		// Check if job is in one of our popular cities
		const cityMatch = POPULAR_CITIES.some((city) =>
			jobCity?.includes(city.toLowerCase()) ||
			job.location?.toLowerCase().includes(city.toLowerCase())
		);

		// Also include jobs from countries that contain our cities
		const countryMatch = jobCountry && (
			jobCountry.includes("uk") ||
			jobCountry.includes("france") ||
			jobCountry.includes("spain") ||
			jobCountry.includes("germany") ||
			jobCountry.includes("netherlands")
		);

		return cityMatch || countryMatch;
	}) || [];

	if (!jobs || filteredJobs.length === 0) {
		apiLogger.warn("No sample jobs found in database after filtering", {
			totalJobsFetched: jobs?.length || 0,
			cities: POPULAR_CITIES,
			careerPaths: POPULAR_CAREER_PATHS,
		});

		// Return fallback sample jobs if no real jobs found
		return NextResponse.json({
			jobs: getFallbackSampleJobs(),
		});
	}

	// Simple scoring: Basic SQL-based matching
	const scoredJobs: SampleJob[] = filteredJobs.map((job) => {
		let score = 70; // Base score
		let matchReason = `Entry-level role in ${job.city}`;

		// City bonus (higher for Madrid, Paris, London as mentioned in user complaint)
		if (["Madrid", "Paris", "London"].includes(job.city || "")) {
			score += 15;
			matchReason = `Located in ${job.city}, one of Europe's top tech hubs`;
		}

		// Career path matching (simple keyword matching)
		const jobText = `${job.title} ${job.description || ""}`.toLowerCase();
		const matchedCareers = POPULAR_CAREER_PATHS.filter((career) =>
			jobText.includes(career.toLowerCase()),
		);

		if (matchedCareers.length > 0) {
			score += 10;
			matchReason += `. Matches ${matchedCareers[0]} career path`;
		}

		// Freshness bonus
		const daysOld = job.created_at
			? (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)
			: 30;
		if (daysOld < 7) {
			score += 5;
			matchReason += ". Recently posted";
		}

		return {
			title: job.title,
			company: job.company,
			location: `${job.city || "Unknown"}, ${job.country || ""}`.trim(),
			matchScore: Math.min(Math.max(score, 0), 100),
			matchReason,
			workEnvironment: job.work_environment || "Hybrid",
			isInternship: job.is_internship || false,
			isGraduate: job.is_graduate || false,
			description: job.description,
			job_url: job.job_url,
		};
	});

	// Sort by score and take top 5
	const topJobs = scoredJobs
		.sort((a, b) => b.matchScore - a.matchScore)
		.slice(0, 5);

	apiLogger.info("Sample jobs fetched successfully", {
		totalJobsFetched: jobs?.length || 0,
		filteredJobs: filteredJobs.length,
		sampleJobsReturned: topJobs.length,
		cities: POPULAR_CITIES,
		day,
		tier,
		week,
	});

	return NextResponse.json({
		jobs: topJobs,
		meta: {
			totalAvailable: jobs.length,
			filteredByCities: POPULAR_CITIES,
			filteredByCareerPaths: POPULAR_CAREER_PATHS,
			week,
			day,
			tier,
		},
	});
});

// Fallback sample jobs if database is empty
function getFallbackSampleJobs(): SampleJob[] {
	return [
		{
			title: "Strategy & Business Design Intern",
			company: "McKinsey & Company",
			location: "London, UK",
			matchScore: 95,
			matchReason: "Perfect for Strategy career path. Located in London, visa sponsorship available.",
			workEnvironment: "Hybrid",
			isInternship: true,
		},
		{
			title: "Graduate Programme - Consulting",
			company: "BCG",
			location: "Amsterdam, Netherlands",
			matchScore: 92,
			matchReason: "Ideal for recent graduates in Strategy. Visa sponsorship available for non-EU candidates.",
			workEnvironment: "Hybrid",
			isGraduate: true,
		},
		{
			title: "Junior Business Analyst",
			company: "Deloitte",
			location: "Dublin, Ireland",
			matchScore: 89,
			matchReason: "Great entry-level role matching your career path. Dublin location with visa support.",
			workEnvironment: "On-site",
		},
		{
			title: "Strategy Consultant (Entry Level)",
			company: "PwC",
			location: "Berlin, Germany",
			matchScore: 86,
			matchReason: "Entry-level role in Strategy consulting. Berlin office with relocation support.",
			workEnvironment: "Hybrid",
		},
		{
			title: "Business Design Intern",
			company: "EY",
			location: "Paris, France",
			matchScore: 84,
			matchReason: "Internship opportunity in Business Design. Paris location, French language preferred.",
			workEnvironment: "Hybrid",
			isInternship: true,
		},
	];
}

// Note: This import should be at the top, but we need to handle the circular dependency
// The rate limiter is used in signup/free/route.ts which imports this file indirectly
function getProductionRateLimiter() {
	return require("../../../utils/production-rate-limiter").getProductionRateLimiter();
}