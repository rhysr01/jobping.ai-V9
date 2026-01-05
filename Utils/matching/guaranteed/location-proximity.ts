/**
 * Location Proximity Helper
 * Ensures we never jump from "London" to "New York" without intermediate steps
 * Progression: City → Country → Region → Remote (if selected) → Never Global
 */

import { CITY_COUNTRY_MAP } from "../prefilter/location";

export type LocationExpansionLevel =
  | "exact_city"
  | "country_wide"
  | "region_wide" // EU, UK, etc.
  | "remote_only" // Only if user selected remote
  | "never"; // Never expand beyond region

export interface LocationExpansion {
  level: LocationExpansionLevel;
  expandedCities: string[];
  expandedCountries: string[];
  expandedRegions: string[];
  maxDistance: "city" | "country" | "region" | "remote";
}

/**
 * EU Regions for proximity matching
 */
const EU_REGIONS: Record<string, string[]> = {
  uk: ["united kingdom", "england", "scotland", "wales", "northern ireland"],
  ireland: ["ie", "republic of ireland"],
  germany: ["de", "deutschland"],
  france: ["fr"],
  spain: ["es", "españa"],
  italy: ["it", "italia"],
  netherlands: ["nl", "holland", "the netherlands"],
  belgium: ["be", "belgië", "belgique"],
  switzerland: ["ch", "schweiz"],
  austria: ["at", "österreich"],
  sweden: ["se", "sverige"],
  denmark: ["dk", "danmark"],
  norway: ["no", "norge"],
  finland: ["fi", "suomi"],
  poland: ["pl", "polska"],
  czech: ["cz", "czech republic", "česká republika"],
  portugal: ["pt", "portuguesa"],
  greece: ["gr", "ελλάδα"],
};

/**
 * Get country from city using CITY_COUNTRY_MAP
 */
function getCountryFromCity(city: string): string | null {
  const cityLower = city.toLowerCase();
  for (const [key, countries] of Object.entries(CITY_COUNTRY_MAP)) {
    if (cityLower.includes(key) || key.includes(cityLower)) {
      return countries[0]; // Return primary country
    }
  }
  return null;
}

/**
 * Get region from country
 */
function getRegionFromCountry(country: string): string | null {
  const countryLower = country.toLowerCase();
  for (const [region, countries] of Object.entries(EU_REGIONS)) {
    if (countries.some((c) => c.toLowerCase() === countryLower)) {
      return region;
    }
  }
  return null;
}

/**
 * Calculate location expansion for guaranteed matching
 * NEVER jumps from London → New York
 * Progression: London → UK → Europe → Remote (if selected) → Stop
 */
export function calculateLocationExpansion(
  targetCities: string[],
  userWorkEnvironment?: string,
): LocationExpansion {
  if (targetCities.length === 0) {
    return {
      level: "never",
      expandedCities: [],
      expandedCountries: [],
      expandedRegions: [],
      maxDistance: "remote",
    };
  }

  // Step 1: Extract countries from cities
  const countries = new Set<string>();
  targetCities.forEach((city) => {
    const country = getCountryFromCity(city);
    if (country) {
      countries.add(country);
    }
  });

  // Step 2: Extract regions from countries
  const regions = new Set<string>();
  countries.forEach((country) => {
    const region = getRegionFromCountry(country);
    if (region) {
      regions.add(region);
    }
  });

  // Step 3: Determine expansion level
  // If user selected remote, allow remote jobs
  // Otherwise, max expansion is region-wide
  const allowsRemote =
    userWorkEnvironment === "remote" || userWorkEnvironment === "hybrid";

  return {
    level: allowsRemote ? "remote_only" : "region_wide",
    expandedCities: targetCities,
    expandedCountries: Array.from(countries),
    expandedRegions: Array.from(regions),
    maxDistance: allowsRemote ? "remote" : "region",
  };
}

/**
 * Build SQL query with location proximity expansion
 * Returns query builder with appropriate filters
 */
export function buildLocationProximityQuery(
  supabase: any,
  expansion: LocationExpansion,
): any {
  let query = supabase
    .from("jobs")
    .select("*")
    .eq("is_active", true)
    .eq("status", "active")
    .is("filtered_reason", null);

  // Level 1: Exact cities (always first)
  if (expansion.expandedCities.length > 0) {
    query = query.in("city", expansion.expandedCities);
  }

  // Level 2: If not enough, expand to countries
  // (This is handled in the matching engine, not SQL)
  // SQL only filters by city - matching engine handles country/region expansion

  // Level 3: If remote allowed, include remote jobs
  if (expansion.maxDistance === "remote") {
    // Remote jobs are identified by location string, not city
    // So we don't filter them out in SQL - matching engine handles this
  }

  return query;
}
