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

	// Get counts for 21 EU cities
	const { data: jobs, error } = await supabase
		.from("jobs")
		.select("is_internship, is_graduate, is_early_career, city")
		.eq("is_active", true)
		.in("country", EU_COUNTRIES)
		.in("city", EU_21_CITIES);

	if (error) {
		throw new AppError(
			"Failed to fetch EU job stats",
			500,
			"DATABASE_ERROR",
			error,
		);
	}

	// Calculate counts
	const internships = jobs?.filter((j) => j.is_internship === true).length || 0;
	const graduateRoles = jobs?.filter((j) => j.is_graduate === true).length || 0;
	const earlyCareer =
		jobs?.filter(
			(j) =>
				j.is_early_career === true &&
				j.is_internship === false &&
				j.is_graduate === false,
		).length || 0;
	const total = jobs?.length || 0;

	// Get unique city count
	const uniqueCities = new Set(jobs?.map((j) => j.city).filter(Boolean)).size;

	const stats = {
		internships,
		graduateRoles,
		earlyCareer,
		total,
		cities: uniqueCities || 21, // Fallback to 21 if count fails
	};

	return NextResponse.json(createSuccessResponse(stats));
});

