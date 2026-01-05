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

// Predefined cities available in the signup form
const FORM_CITIES = [
  "Dublin",
  "Belfast",
  "London",
  "Manchester",
  "Birmingham",
  "Paris",
  "Amsterdam",
  "Brussels",
  "Berlin",
  "Hamburg",
  "Munich",
  "Zurich",
  "Madrid",
  "Barcelona",
  "Milan",
  "Rome",
  "Stockholm",
  "Copenhagen",
  "Vienna",
  "Prague",
  "Warsaw",
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
    .select("id", { count: "exact", head: true })
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
    .select("id", { count: "exact", head: true })
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
    .select("id", { count: "exact", head: true })
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
    .select("id", { count: "exact", head: true })
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

  // Get unique city count from EU jobs that match our predefined form cities
  // This ensures we only count cities that users can actually select from
  const { data: citiesData, error: citiesError } = await supabase
    .from("jobs")
    .select("city")
    .eq("is_active", true)
    .in("country", EU_COUNTRIES)
    .in("city", FORM_CITIES)
    .not("city", "is", null);

  if (citiesError) {
    throw new AppError(
      "Failed to fetch city stats",
      500,
      "DATABASE_ERROR",
      citiesError,
    );
  }

  // Count unique cities that are in our predefined form cities list
  const uniqueCities = new Set(
    (citiesData || []).map((j) => j.city?.trim()).filter(Boolean),
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
