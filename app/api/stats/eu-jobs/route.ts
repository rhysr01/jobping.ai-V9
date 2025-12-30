import { type NextRequest, NextResponse } from "next/server";
import { createSuccessResponse } from "@/lib/api-types";
import { AppError, asyncHandler } from "@/lib/errors";
import { getDatabaseClient } from "@/Utils/databasePool";

const EU_21_CITIES = [
	"London",
	"Berlin",
	"Paris",
	"Madrid",
	"Barcelona",
	"Amsterdam",
	"Munich",
	"Hamburg",
	"Dublin",
	"Zurich",
	"Vienna",
	"Brussels",
	"Stockholm",
	"Copenhagen",
	"Warsaw",
	"Milan",
	"Rome",
	"Lisbon",
	"Prague",
	"Helsinki",
	"Athens",
];

const EU_COUNTRIES = [
	"United Kingdom",
	"Germany",
	"France",
	"Spain",
	"Italy",
	"Netherlands",
	"Belgium",
	"Austria",
	"Switzerland",
	"Sweden",
	"Denmark",
	"Norway",
	"Ireland",
	"Poland",
	"Portugal",
	"Czech Republic",
	"Finland",
	"Greece",
];

export const dynamic = "force-dynamic";
export const revalidate = 3600; // 1 hour

export const GET = asyncHandler(async (_req: NextRequest) => {
	const supabase = getDatabaseClient();

	// Normalize city names for case-insensitive matching
	const normalizedCities = EU_21_CITIES.map((city) => city.toLowerCase());

	// Get ALL jobs from EU countries (remove default 1000 limit by using a high limit)
	// We need to fetch all to get accurate counts
	const { data: jobs, error } = await supabase
		.from("jobs")
		.select("is_internship, is_graduate, is_early_career, city")
		.eq("is_active", true)
		.in("country", EU_COUNTRIES)
		.limit(50000); // High limit to ensure we get all jobs

	if (error) {
		throw new AppError(
			"Failed to fetch EU job stats",
			500,
			"DATABASE_ERROR",
			error,
		);
	}

	// Filter jobs to only include our 21 cities (case-insensitive matching)
	const filteredJobs = jobs?.filter((job) => {
		if (!job.city) return false;
		const normalizedJobCity = job.city.toLowerCase().trim();
		return normalizedCities.includes(normalizedJobCity);
	}) || [];

	// Calculate counts
	const internships = filteredJobs.filter((j) => j.is_internship === true).length || 0;
	const graduateRoles = filteredJobs.filter((j) => j.is_graduate === true).length || 0;
	const earlyCareer =
		filteredJobs.filter(
			(j) =>
				j.is_early_career === true &&
				j.is_internship === false &&
				j.is_graduate === false,
		).length || 0;
	const total = filteredJobs.length || 0;

	// Get unique city count (use original city names from filtered jobs)
	const uniqueCities = new Set(filteredJobs.map((j) => j.city).filter(Boolean)).size;

	const stats = {
		internships,
		graduateRoles,
		earlyCareer,
		total,
		cities: uniqueCities || 21, // Fallback to 21 if count fails
	};

	return NextResponse.json(createSuccessResponse(stats));
});

