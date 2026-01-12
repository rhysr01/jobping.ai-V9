import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "../../../lib/api-logger";

// Inline country flags and helper functions (from deleted countryFlags.ts)
const COUNTRY_FLAGS: Record<string, string> = {
	"United Kingdom": "🇬🇧", // London, Manchester, Birmingham
	Ireland: "🇮🇪", // Dublin, Belfast
	France: "🇫🇷", // Paris
	Germany: "🇩🇪", // Berlin, Hamburg, Munich
	Spain: "🇪🇸", // Madrid, Barcelona
	Italy: "🇮🇹", // Milan, Rome
	Netherlands: "🇳🇱", // Amsterdam
	Belgium: "🇧🇪", // Brussels
	Switzerland: "🇨🇭", // Zurich
	Sweden: "🇸🇪", // Stockholm
	Denmark: "🇩🇰", // Copenhagen
	Austria: "🇦🇹", // Vienna
	"Czech Republic": "🇨🇿", // Prague
	Poland: "🇵🇱", // Warsaw
};

const getCountryFlag = (country: string): string => {
	if (!country) return "";
	return COUNTRY_FLAGS[country] || "";
};

// Simplified country extraction (removed complex logic from deleted file)
const extractCountryFromLocation = (location: string): string => {
	if (!location) return "";
	const trimmed = location.trim();
	// Simple city to country mapping for known cities
	const cityMap: Record<string, string> = {
		"Dublin": "Ireland", "Belfast": "Ireland",
		"London": "United Kingdom", "Manchester": "United Kingdom", "Birmingham": "United Kingdom",
		"Paris": "France", "Amsterdam": "Netherlands", "Brussels": "Belgium",
		"Berlin": "Germany", "Hamburg": "Germany", "Munich": "Germany",
		"Zurich": "Switzerland", "Madrid": "Spain", "Barcelona": "Spain",
		"Milan": "Italy", "Rome": "Italy", "Stockholm": "Sweden",
		"Copenhagen": "Denmark", "Vienna": "Austria", "Prague": "Czech Republic", "Warsaw": "Poland"
	};
	return cityMap[trimmed] || trimmed;
};

const getCountryFromCity = (city: string): string => {
	return extractCountryFromLocation(city);
};
import { asyncHandler } from "../../../lib/errors";
import { getDatabaseClient } from "../../../utils/core/database-pool";
import { withApiAuth } from "../../../utils/authentication/apiAuth";

// Cache for 1 hour
let cachedCountries: Array<{
	country: string;
	flag: string;
	cities: string[];
	count: number;
}> | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 60 * 60 * 1000;

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const getCountriesHandler = asyncHandler(async (_req: NextRequest) => {
	const now = Date.now();

	if (cachedCountries && now - lastFetch < CACHE_DURATION) {
		return NextResponse.json({
			countries: cachedCountries,
			cached: true,
		});
	}

	const supabase = getDatabaseClient();

	// Get all jobs to extract countries
	const { data, error } = await supabase
		.from("jobs")
		.select("location, city, country")
		.eq("is_active", true)
		.eq("is_sent", true);

	if (error) {
		throw new Error(`Failed to fetch jobs: ${error.message}`);
	}

	// Collect unique cities grouped by country
	const countryToCities = new Map<string, Set<string>>();

	data?.forEach((job) => {
		let country = "";
		let city = "";

		// Priority: country field > location field > city field
		if (job.country) {
			const normalizedCountry = job.country.trim();
			const countryKey = Object.keys(COUNTRY_FLAGS).find(
				(key) => key.toLowerCase() === normalizedCountry.toLowerCase(),
			);
			country = countryKey || normalizedCountry;
		} else if (job.location) {
			country = extractCountryFromLocation(job.location);
		} else if (job.city) {
			country = extractCountryFromLocation(job.city);
			city = job.city.trim();
		}

		// Only include countries we have flags for
		if (country && getCountryFlag(country)) {
			if (!countryToCities.has(country)) {
				countryToCities.set(country, new Set());
			}

			// Add city if we have it and it's a known city
			if (city && getCountryFromCity(city) === country) {
				countryToCities.get(country)?.add(city);
			}
		}
	});

	// Convert to array with cities
	const dbCountries = Array.from(countryToCities.entries())
		.map(([country, cities]) => ({
			country,
			flag: getCountryFlag(country),
			cities: Array.from(cities),
			count: cities.size,
		}))
		.filter((c) => c.flag) // Only include countries with flags
		.sort((a, b) => b.count - a.count); // Sort by city count

	// If we have countries from DB, use those
	// Otherwise, show all available countries from signup form as fallback
	let countries: Array<{
		country: string;
		flag: string;
		cities: string[];
		count: number;
	}>;

	if (dbCountries.length > 0) {
		countries = dbCountries;
	} else {
		// Fallback: Show all available countries with their cities from signup form
		const CITY_TO_COUNTRY: Record<string, string> = {
			Dublin: "Ireland",
			Belfast: "Ireland",
			London: "United Kingdom",
			Manchester: "United Kingdom",
			Birmingham: "United Kingdom",
			Paris: "France",
			Amsterdam: "Netherlands",
			Brussels: "Belgium",
			Berlin: "Germany",
			Hamburg: "Germany",
			Munich: "Germany",
			Zurich: "Switzerland",
			Madrid: "Spain",
			Barcelona: "Spain",
			Milan: "Italy",
			Rome: "Italy",
			Stockholm: "Sweden",
			Copenhagen: "Denmark",
			Vienna: "Austria",
			Prague: "Czech Republic",
			Warsaw: "Poland",
		};

		// Group cities by country
		const fallbackCountryToCities = new Map<string, string[]>();
		Object.entries(CITY_TO_COUNTRY).forEach(([city, country]) => {
			if (!fallbackCountryToCities.has(country)) {
				fallbackCountryToCities.set(country, []);
			}
			fallbackCountryToCities.get(country)?.push(city);
		});

		countries = Object.entries(COUNTRY_FLAGS)
			.map(([country, flag]) => ({
				country,
				flag,
				cities: fallbackCountryToCities.get(country) || [],
				count: fallbackCountryToCities.get(country)?.length || 0,
			}))
			.filter((c) => c.cities.length > 0) // Only show countries with cities
			.sort((a, b) => a.country.localeCompare(b.country)); // Alphabetical order
		apiLogger.info("No DB countries found, using fallback", {
			endpoint: "/api/countries",
			fallbackCount: countries.length,
		});
	}

	apiLogger.debug("Found countries", {
		endpoint: "/api/countries",
		countryCount: countries.length,
		totalJobs: data?.length || 0,
	});

	cachedCountries = countries;
	lastFetch = now;

	return NextResponse.json({
		countries,
		count: countries.length,
		cached: false,
	});
});

export const GET = withApiAuth(getCountriesHandler, {
	allowPublic: true,
	rateLimitConfig: {
		maxRequests: 30, // Lower limit - less frequently needed
		windowMs: 60000,
	},
});
