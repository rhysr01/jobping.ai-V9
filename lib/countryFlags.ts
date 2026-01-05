/**
 * Country to flag emoji mapping
 * Maps country names to their flag emojis for display
 */

// Only countries available in the signup form (based on cities in EuropeMap)
export const COUNTRY_FLAGS: Record<string, string> = {
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

/**
 * Get flag emoji for a country name
 */
export function getCountryFlag(country: string): string {
  if (!country) return "";
  return COUNTRY_FLAGS[country] || "";
}

/**
 * Extract country from city name using EuropeMap coordinates
 */
export const CITY_TO_COUNTRY: Record<string, string> = {
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

/**
 * Get country from city name
 */
export function getCountryFromCity(city: string): string {
  if (!city) return "";
  return CITY_TO_COUNTRY[city] || "";
}

/**
 * Get all possible country variations for a country name (for database queries)
 * Returns array of country codes, names, common variations, and city names
 * This handles cases where city names are incorrectly stored in the country field
 */
export function getCountryVariations(country: string): string[] {
  if (!country) return [];

  const variations = new Set<string>([country]); // Include the country name itself

  // Map of country names to their variations (codes, common names, etc.)
  const COUNTRY_VARIATIONS: Record<string, string[]> = {
    Ireland: ["IE", "ie", "IRL", "irl", "EIRE", "eire", "Ireland"],
    "United Kingdom": [
      "GB",
      "gb",
      "UK",
      "uk",
      "ENG",
      "eng",
      "England",
      "Scotland",
      "Wales",
      "Northern Ireland",
      "Great Britain",
    ],
    France: ["FR", "fr", "France"],
    Germany: ["DE", "de", "Germany", "Deutschland"],
    Spain: ["ES", "es", "Spain", "España"],
    Italy: ["IT", "it", "Italy", "Italia"],
    Netherlands: ["NL", "nl", "Netherlands", "Holland"],
    Belgium: ["BE", "be", "Belgium", "België", "Belgique"],
    Switzerland: ["CH", "ch", "Switzerland", "Schweiz", "Suisse"],
    Sweden: ["SE", "se", "Sweden", "Sverige"],
    Denmark: ["DK", "dk", "Denmark", "Danmark"],
    Austria: ["AT", "at", "Austria", "Österreich"],
    "Czech Republic": ["CZ", "cz", "Czech Republic", "Czechia"],
    Poland: ["PL", "pl", "Poland", "Polska"],
  };

  // Add country code/name variations (including lowercase versions)
  const countryVariations = COUNTRY_VARIATIONS[country];
  if (countryVariations) {
    countryVariations.forEach((v) => {
      variations.add(v);
      // Also add lowercase version for case-insensitive matching
      if (v !== v.toLowerCase()) {
        variations.add(v.toLowerCase());
      }
    });
  }

  // CRITICAL FIX: Also add all city names for this country (handles cases where city names are incorrectly stored as country)
  // This ensures we catch jobs even when city names like "DUBLIN", "LONDON", etc. are stored in the country field
  for (const [cityName, cityCountry] of Object.entries(CITY_TO_COUNTRY)) {
    if (cityCountry === country) {
      variations.add(cityName); // Add city name (e.g., "Dublin")
      variations.add(cityName.toUpperCase()); // Add uppercase version (e.g., "DUBLIN" - common error)
    }
  }

  return Array.from(variations);
}

/**
 * Extract country from location string (e.g., "London, United Kingdom" or "Berlin, Germany")
 */
export function extractCountryFromLocation(location: string): string {
  if (!location) return "";

  const normalized = location.trim();

  // Try to extract country from location string
  const parts = normalized.split(",").map((p) => p.trim());
  if (parts.length > 1) {
    const countryPart = parts[parts.length - 1];
    // Check if it's a known country (exact match)
    if (COUNTRY_FLAGS[countryPart]) {
      return countryPart;
    }
    // Try case-insensitive match
    const countryKey = Object.keys(COUNTRY_FLAGS).find(
      (key) => key.toLowerCase() === countryPart.toLowerCase(),
    );
    if (countryKey) {
      return countryKey;
    }
  }

  // Try city-based lookup
  const city = parts[0];
  const countryFromCity = getCountryFromCity(city);
  if (countryFromCity) {
    return countryFromCity;
  }

  // Try to match city name directly in location
  for (const [cityName, country] of Object.entries(CITY_TO_COUNTRY)) {
    if (normalized.toLowerCase().includes(cityName.toLowerCase())) {
      return country;
    }
  }

  return "";
}
