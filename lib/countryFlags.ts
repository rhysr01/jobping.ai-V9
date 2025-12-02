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
  
  // Try to extract country from location string
  const parts = location.split(',').map(p => p.trim());
  if (parts.length > 1) {
    const countryPart = parts[parts.length - 1];
    // Check if it's a known country
    if (COUNTRY_FLAGS[countryPart]) {
      return countryPart;
    }
  }
  
  // Try city-based lookup
  const city = parts[0];
  return getCountryFromCity(city);
}

