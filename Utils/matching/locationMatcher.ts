/**
 * Robust Location Matching Utility
 * Handles location name variations from multiple sources
 * Uses normalization maps to match jobs to user target cities
 */

import { CITY_TO_COUNTRY } from "@/lib/countryFlags";
import {
  CITY_NORMALIZATION_MAP,
  COUNTRY_NORMALIZATION_MAP,
  normalizeCity,
  normalizeCountry,
} from "@/lib/locationNormalizer";

/**
 * City-to-country mapping for matching
 */
const CITY_COUNTRY_MAP: Record<string, string> = {
  ...CITY_TO_COUNTRY,
  // Add more cities from normalization map
  Munich: "Germany",
  Cologne: "Germany",
  Hamburg: "Germany",
  Frankfurt: "Germany",
  Stuttgart: "Germany",
  Düsseldorf: "Germany",
  Vienna: "Austria",
  Prague: "Czech Republic",
  Milan: "Italy",
  Rome: "Italy",
  Barcelona: "Spain",
  Madrid: "Spain",
  Brussels: "Belgium",
  Amsterdam: "Netherlands",
  Stockholm: "Sweden",
  Copenhagen: "Denmark",
  Zurich: "Switzerland",
  Warsaw: "Poland",
  London: "United Kingdom",
  Manchester: "United Kingdom",
  Birmingham: "United Kingdom",
  Dublin: "Ireland",
  Paris: "France",
};

/**
 * Normalize a location string for matching (handles variations)
 */
function normalizeLocationForMatching(
  location: string | null | undefined,
): string {
  if (!location) return "";
  return location.trim().toLowerCase();
}

/**
 * Normalize a city name for matching (handles variations)
 */
function normalizeCityForMatching(city: string | null | undefined): string {
  if (!city) return "";
  const normalized = normalizeCity(city);
  return normalized.toLowerCase();
}

/**
 * Normalize a country name for matching (handles variations)
 */
function normalizeCountryForMatching(
  country: string | null | undefined,
): string {
  if (!country) return "";
  const normalized = normalizeCountry(country);
  return normalized.toLowerCase();
}

/**
 * Check if a city name matches (handles variations)
 */
function cityMatches(city1: string, city2: string): boolean {
  const norm1 = normalizeCityForMatching(city1);
  const norm2 = normalizeCityForMatching(city2);

  // Exact match after normalization
  if (norm1 === norm2) return true;

  // Check if one contains the other (handles "London" vs "Central London")
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  // Check normalization map (handles "München" vs "Munich")
  const map1 = CITY_NORMALIZATION_MAP[norm1];
  const map2 = CITY_NORMALIZATION_MAP[norm2];
  if (map1 && map1.toLowerCase() === norm2) return true;
  if (map2 && map2.toLowerCase() === norm1) return true;

  return false;
}

/**
 * Check if a country name matches (handles variations)
 */
function countryMatches(country1: string, country2: string): boolean {
  const norm1 = normalizeCountryForMatching(country1);
  const norm2 = normalizeCountryForMatching(country2);

  // Exact match after normalization
  if (norm1 === norm2) return true;

  // Check normalization map (handles "Deutschland" vs "Germany")
  const map1 = COUNTRY_NORMALIZATION_MAP[norm1];
  const map2 = COUNTRY_NORMALIZATION_MAP[norm2];
  if (map1 && map1.toLowerCase() === norm2) return true;
  if (map2 && map2.toLowerCase() === norm1) return true;

  return false;
}

/**
 * Extract city and country from location string
 */
function parseLocationString(location: string): {
  city: string | null;
  country: string | null;
} {
  if (!location) return { city: null, country: null };

  // Try comma-separated format: "City, Country"
  if (location.includes(",")) {
    const parts = location
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return {
        city: normalizeCity(parts[0]) || null,
        country: normalizeCountry(parts[parts.length - 1]) || null,
      };
    }
  }

  // Try to extract city (first word/phrase)
  const normalized = normalizeCity(location);
  if (normalized) {
    return { city: normalized, country: null };
  }

  // Try to extract country
  const normalizedCountry = normalizeCountry(location);
  if (normalizedCountry) {
    return { city: null, country: normalizedCountry };
  }

  return { city: null, country: null };
}

/**
 * Get country from city name
 */
function getCountryFromCity(city: string | null | undefined): string | null {
  if (!city) return null;
  const normalized = normalizeCityForMatching(city);
  return CITY_COUNTRY_MAP[normalized] || null;
}

/**
 * Check if a job location matches any of the user's target cities
 * Handles all variations and formats
 */
export function matchesLocation(
  job: {
    city?: string | null;
    country?: string | null;
    location?: string | null;
  },
  targetCities: string[],
): {
  matches: boolean;
  matchScore: number;
  reason: string;
  matchedCity?: string;
} {
  if (!targetCities || targetCities.length === 0) {
    return { matches: true, matchScore: 100, reason: "No location preference" };
  }

  if (!job.location && !job.city && !job.country) {
    return {
      matches: false,
      matchScore: 0,
      reason: "Job has no location data",
    };
  }

  // Normalize job location data
  const jobCity = job.city ? normalizeCityForMatching(job.city) : null;
  const jobCountry = job.country
    ? normalizeCountryForMatching(job.country)
    : null;
  const jobLocation = job.location
    ? normalizeLocationForMatching(job.location)
    : null;

  // Parse location string if we don't have structured data
  let parsedCity = jobCity;
  let parsedCountry = jobCountry;
  if (!parsedCity && !parsedCountry && jobLocation) {
    const parsed = parseLocationString(job.location || "");
    parsedCity = parsed.city ? normalizeCityForMatching(parsed.city) : null;
    parsedCountry = parsed.country
      ? normalizeCountryForMatching(parsed.country)
      : null;
  }

  // Check for remote/hybrid work (always matches)
  if (
    jobLocation &&
    (jobLocation.includes("remote") ||
      jobLocation.includes("hybrid") ||
      jobLocation.includes("work from home") ||
      jobLocation.includes("wfh") ||
      jobLocation.includes("anywhere") ||
      jobLocation.includes("distributed"))
  ) {
    return {
      matches: true,
      matchScore: 80,
      reason: "Remote/hybrid work available",
    };
  }

  // Check each target city
  for (const targetCity of targetCities) {
    const normalizedTarget = normalizeCityForMatching(targetCity);
    const targetCountry = getCountryFromCity(targetCity);

    // Level 1: Exact city match (highest score)
    if (parsedCity && cityMatches(parsedCity, normalizedTarget)) {
      return {
        matches: true,
        matchScore: 100,
        reason: `Exact city match: ${job.city || parsedCity} matches ${targetCity}`,
        matchedCity: targetCity,
      };
    }

    // Level 2: City match in location string
    if (
      jobLocation &&
      (jobLocation.includes(normalizedTarget) ||
        normalizedTarget.includes(jobLocation) ||
        cityMatches(jobLocation, normalizedTarget))
    ) {
      return {
        matches: true,
        matchScore: 95,
        reason: `City found in location string: ${job.location} matches ${targetCity}`,
        matchedCity: targetCity,
      };
    }

    // Level 3: Country match (if user specified a city, check if job is in same country)
    if (
      targetCountry &&
      parsedCountry &&
      countryMatches(parsedCountry, targetCountry)
    ) {
      return {
        matches: true,
        matchScore: 70,
        reason: `Country match: job in ${parsedCountry} matches ${targetCity} (${targetCountry})`,
        matchedCity: targetCity,
      };
    }

    // Level 4: Partial match in location string (handles variations)
    if (jobLocation) {
      // Check if location contains city name or variation
      const locationWords = jobLocation.split(/[\s,]+/);
      for (const word of locationWords) {
        if (cityMatches(word, normalizedTarget)) {
          return {
            matches: true,
            matchScore: 85,
            reason: `Partial city match: ${word} in ${job.location} matches ${targetCity}`,
            matchedCity: targetCity,
          };
        }
      }
    }
  }

  return { matches: false, matchScore: 0, reason: "No location match found" };
}

/**
 * Enhanced location compatibility check for matching system
 * Replaces the basic validateLocationCompatibility with robust variation handling
 */
export function validateLocationCompatibilityEnhanced(
  job: {
    city?: string | null;
    country?: string | null;
    location?: string | null;
  },
  userTargetCities: string[],
): {
  compatible: boolean;
  matchScore: number;
  reasons: string[];
} {
  if (!userTargetCities || userTargetCities.length === 0) {
    return {
      compatible: true,
      matchScore: 100,
      reasons: ["No location preference"],
    };
  }

  const matchResult = matchesLocation(job, userTargetCities);

  return {
    compatible: matchResult.matches,
    matchScore: matchResult.matchScore,
    reasons: matchResult.matches ? [matchResult.reason] : [matchResult.reason],
  };
}
