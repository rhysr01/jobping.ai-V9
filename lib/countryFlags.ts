/**
 * Country to flag emoji mapping
 * Maps country names to their flag emojis for display
 */

export const COUNTRY_FLAGS: Record<string, string> = {
  'United Kingdom': '🇬🇧',
  'Ireland': '🇮🇪',
  'France': '🇫🇷',
  'Germany': '🇩🇪',
  'Spain': '🇪🇸',
  'Italy': '🇮🇹',
  'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪',
  'Switzerland': '🇨🇭',
  'Sweden': '🇸🇪',
  'Denmark': '🇩🇰',
  'Austria': '🇦🇹',
  'Czech Republic': '🇨🇿',
  'Poland': '🇵🇱',
  'Portugal': '🇵🇹',
  'Finland': '🇫🇮',
  'Norway': '🇳🇴',
  'Greece': '🇬🇷',
  'Romania': '🇷🇴',
  'Hungary': '🇭🇺',
};

/**
 * Get flag emoji for a country name
 */
export function getCountryFlag(country: string): string {
  if (!country) return '';
  return COUNTRY_FLAGS[country] || '';
}

/**
 * Extract country from city name using EuropeMap coordinates
 */
const CITY_TO_COUNTRY: Record<string, string> = {
  'Dublin': 'Ireland',
  'London': 'United Kingdom',
  'Manchester': 'United Kingdom',
  'Birmingham': 'United Kingdom',
  'Paris': 'France',
  'Amsterdam': 'Netherlands',
  'Brussels': 'Belgium',
  'Berlin': 'Germany',
  'Hamburg': 'Germany',
  'Munich': 'Germany',
  'Zurich': 'Switzerland',
  'Madrid': 'Spain',
  'Barcelona': 'Spain',
  'Milan': 'Italy',
  'Rome': 'Italy',
  'Stockholm': 'Sweden',
  'Copenhagen': 'Denmark',
  'Vienna': 'Austria',
  'Prague': 'Czech Republic',
  'Warsaw': 'Poland',
};

/**
 * Get country from city name
 */
export function getCountryFromCity(city: string): string {
  if (!city) return '';
  return CITY_TO_COUNTRY[city] || '';
}

/**
 * Extract country from location string (e.g., "London, United Kingdom" or "Berlin, Germany")
 */
export function extractCountryFromLocation(location: string): string {
  if (!location) return '';
  
  const normalized = location.trim();
  
  // Try to extract country from location string
  const parts = normalized.split(',').map(p => p.trim());
  if (parts.length > 1) {
    const countryPart = parts[parts.length - 1];
    // Check if it's a known country (exact match)
    if (COUNTRY_FLAGS[countryPart]) {
      return countryPart;
    }
    // Try case-insensitive match
    const countryKey = Object.keys(COUNTRY_FLAGS).find(
      key => key.toLowerCase() === countryPart.toLowerCase()
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
  
  return '';
}

