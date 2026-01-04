/**
 * Location Domain - Location matching with city-to-country mapping
 */

import { apiLogger } from "@/lib/api-logger";
import type { JobWithFreshness, LocationMatchLevel } from "./types";

/**
 * Comprehensive city-to-country mapping for intelligent fallback
 */
export const CITY_COUNTRY_MAP: Record<string, string[]> = {
	london: ["uk", "united kingdom", "england", "britain", "great britain"],
	berlin: ["germany", "deutschland", "de"],
	munich: ["germany", "deutschland", "de"],
	hamburg: ["germany", "deutschland", "de"],
	frankfurt: ["germany", "deutschland", "de"],
	cologne: ["germany", "deutschland", "de"],
	paris: ["france", "fr"],
	lyon: ["france", "fr"],
	marseille: ["france", "fr"],
	toulouse: ["france", "fr"],
	madrid: ["spain", "españa", "es"],
	barcelona: ["spain", "españa", "es"],
	valencia: ["spain", "españa", "es"],
	seville: ["spain", "españa", "es"],
	amsterdam: ["netherlands", "holland", "nl", "the netherlands"],
	rotterdam: ["netherlands", "holland", "nl"],
	"the hague": ["netherlands", "holland", "nl"],
	dublin: ["ireland", "ie", "republic of ireland"],
	vienna: ["austria", "at", "österreich"],
	zurich: ["switzerland", "ch", "schweiz"],
	geneva: ["switzerland", "ch", "schweiz"],
	basel: ["switzerland", "ch", "schweiz"],
	stockholm: ["sweden", "se", "sverige"],
	gothenburg: ["sweden", "se"],
	copenhagen: ["denmark", "dk", "danmark"],
	oslo: ["norway", "no", "norge"],
	helsinki: ["finland", "fi", "suomi"],
	brussels: ["belgium", "be", "belgië", "belgique"],
	antwerp: ["belgium", "be"],
	lisbon: ["portugal", "pt", "portuguesa"],
	porto: ["portugal", "pt"],
	milan: ["italy", "it", "italia"],
	rome: ["italy", "it", "italia"],
	turin: ["italy", "it"],
	warsaw: ["poland", "pl", "polska"],
	krakow: ["poland", "pl"],
	prague: ["czech republic", "czech", "cz", "česká republika"],
	budapest: ["hungary", "hu", "magyarország"],
	bucharest: ["romania", "ro", "românia"],
	athens: ["greece", "gr", "ελλάδα"],
};

/**
 * Enhanced location matching with multiple fallback levels
 */
export function matchesLocationStrict(
	job: JobWithFreshness,
	targetCity: string,
): boolean {
	const { matchesLocation } = require("../locationMatcher");
	const matchResult = matchesLocation(
		{
			city: (job as any).city,
			country: (job as any).country,
			location: job.location,
		},
		[targetCity],
	);
	return matchResult.matches;
}

/**
 * Strict location matching - exact cities only
 * ALL USERS get strict matching - quality is consistent across tiers
 * Differentiation is quantity (5 vs 10 matches) and frequency (one-time vs weekly), not quality
 */
export function getLocationMatchedJobs(
	jobs: JobWithFreshness[],
	cities: string[],
	userEmail: string,
	subscriptionTier?: "free" | "premium",
): {
	jobs: JobWithFreshness[];
	matchLevel: LocationMatchLevel;
} {
	if (cities.length === 0) {
		return { jobs, matchLevel: "all" };
	}

	// ALL USERS: Strict location matching (exact cities only)
	// Quality is the same for all users - differentiation is quantity/frequency, not quality
	const exactMatches = jobs.filter((job) =>
		cities.some((city) => matchesLocationStrict(job, city)),
	);

	apiLogger.info("Strict location matching (exact cities only)", {
		email: userEmail,
		exactMatches: exactMatches.length,
		targetCities: cities,
		tier: subscriptionTier || "free",
	});
	return { jobs: exactMatches, matchLevel: "exact" };

	// Level 2: Country-level matches (relaxed)
	const targetCountries = new Set<string>();
	cities.forEach((city) => {
		const cityLower = city.toLowerCase();
		Object.entries(CITY_COUNTRY_MAP).forEach(([key, countries]) => {
			if (cityLower.includes(key) || key.includes(cityLower)) {
				countries.forEach((c) => {
					targetCountries.add(c);
				});
			}
		});
	});

	const countryMatches = jobs.filter((job) => {
		const jobLocation = (job.location || "").toLowerCase();
		const jobCountry = ((job as any).country || "").toLowerCase();

		return Array.from(targetCountries).some(
			(country) =>
				jobLocation.includes(country) ||
				jobCountry.includes(country) ||
				jobLocation.includes(country.replace(" ", "-")),
		);
	});

	const combinedMatches = [...new Set([...exactMatches, ...countryMatches])];

	if (combinedMatches.length >= 15) {
		return { jobs: combinedMatches, matchLevel: "country" };
	}

	// Level 3: Remote/hybrid jobs (always acceptable)
	const remoteMatches = jobs.filter((job) => {
		const jobLocation = (job.location || "").toLowerCase();
		return (
			jobLocation.includes("remote") ||
			jobLocation.includes("hybrid") ||
			jobLocation.includes("work from home") ||
			jobLocation.includes("flexible location")
		);
	});

	const allMatches = [...new Set([...combinedMatches, ...remoteMatches])];

	if (allMatches.length >= 10) {
		return { jobs: allMatches, matchLevel: "remote" };
	}

	// Level 4: Last resort - use all jobs (better than zero matches)
	apiLogger.warn("Using all jobs as last resort fallback", {
		email: userEmail,
		targetCities: cities,
		exactMatches: exactMatches.length,
		countryMatches: countryMatches.length,
		remoteMatches: remoteMatches.length,
		totalJobs: jobs.length,
	});

	return { jobs, matchLevel: "all" };
}
