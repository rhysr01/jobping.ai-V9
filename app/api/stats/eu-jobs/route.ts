import { type NextRequest, NextResponse } from "next/server";
import { createSuccessResponse } from "@/lib/api-types";
import { AppError, asyncHandler } from "@/lib/errors";
import { getDatabaseClient } from "@/Utils/databasePool";

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

	// Get ALL jobs from EU countries - use count queries for efficiency
	// This avoids fetching all job data and is much faster

	// Count internships
	const { count: internships, error: internshipsError } = await supabase
		.from("jobs")
		.select("*", { count: "exact", head: true })
		.eq("is_active", true)
		.eq("is_internship", true)
		.in("country", EU_COUNTRIES);

	if (internshipsError) {
		throw new AppError(
			"Failed to fetch internship stats",
			500,
			"DATABASE_ERROR",
			internshipsError,
		);
	}

	// Count graduate roles
	const { count: graduateRoles, error: graduateError } = await supabase
		.from("jobs")
		.select("*", { count: "exact", head: true })
		.eq("is_active", true)
		.eq("is_graduate", true)
		.in("country", EU_COUNTRIES);

	if (graduateError) {
		throw new AppError(
			"Failed to fetch graduate stats",
			500,
			"DATABASE_ERROR",
			graduateError,
		);
	}

	// Count early career (entry-level roles that aren't internships or graduate programs)
	// Using categories array for consistency with main stats route
	const { count: earlyCareer, error: earlyCareerError } = await supabase
		.from("jobs")
		.select("*", { count: "exact", head: true })
		.eq("is_active", true)
		.contains("categories", ["early-career"])
		.eq("is_internship", false)
		.eq("is_graduate", false)
		.in("country", EU_COUNTRIES);

	if (earlyCareerError) {
		throw new AppError(
			"Failed to fetch early career stats",
			500,
			"DATABASE_ERROR",
			earlyCareerError,
		);
	}

	// Count total active jobs from EU countries
	const { count: total, error: totalError } = await supabase
		.from("jobs")
		.select("*", { count: "exact", head: true })
		.eq("is_active", true)
		.in("country", EU_COUNTRIES);

	if (totalError) {
		throw new AppError(
			"Failed to fetch total job stats",
			500,
			"DATABASE_ERROR",
			totalError,
		);
	}

	// Get unique city count from all EU jobs (not just the 21 cities)
	// We need to fetch city data for this, but we can limit to just distinct cities
	const { data: citiesData, error: citiesError } = await supabase
		.from("jobs")
		.select("city")
		.eq("is_active", true)
		.in("country", EU_COUNTRIES)
		.not("city", "is", null);

	if (citiesError) {
		throw new AppError(
			"Failed to fetch city stats",
			500,
			"DATABASE_ERROR",
			citiesError,
		);
	}

	// Count unique cities
	const uniqueCities = new Set(
		(citiesData || []).map((j) => j.city?.toLowerCase().trim()).filter(Boolean),
	).size;

	const stats = {
		internships: internships || 0,
		graduateRoles: graduateRoles || 0,
		earlyCareer: earlyCareer || 0,
		total: total || 0,
		cities: uniqueCities || 0,
	};

	return NextResponse.json(createSuccessResponse(stats));
});
