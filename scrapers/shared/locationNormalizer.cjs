/**
 * Location Normalization Utility (CommonJS)
 * Standardizes city, country, and location fields to a consistent format
 * For use in .cjs scraper files
 */

// Map of city to country (from EuropeMap)
const CITY_TO_COUNTRY = {
  'Dublin': 'Ireland',
  'Belfast': 'Ireland',
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

// Map of country codes and variations to standardized full country names
const COUNTRY_NORMALIZATION_MAP = {
  // United Kingdom variations
  'gb': 'United Kingdom',
  'uk': 'United Kingdom',
  'eng': 'United Kingdom',
  'england': 'United Kingdom',
  'scotland': 'United Kingdom',
  'wales': 'United Kingdom',
  'northern ireland': 'United Kingdom',
  'great britain': 'United Kingdom',
  
  // Ireland variations
  'ie': 'Ireland',
  'irl': 'Ireland',
  'eire': 'Ireland',
  'éire': 'Ireland',
  'republic of ireland': 'Ireland',
  
  // France variations
  'fr': 'France',
  
  // Germany variations
  'de': 'Germany',
  'deutschland': 'Germany',
  
  // Spain variations
  'es': 'Spain',
  'españa': 'Spain',
  
  // Italy variations
  'it': 'Italy',
  'italia': 'Italy',
  
  // Netherlands variations
  'nl': 'Netherlands',
  'holland': 'Netherlands',
  
  // Belgium variations
  'be': 'Belgium',
  'belgië': 'Belgium',
  'belgique': 'Belgium',
  
  // Switzerland variations
  'ch': 'Switzerland',
  'schweiz': 'Switzerland',
  'suisse': 'Switzerland',
  
  // Sweden variations
  'se': 'Sweden',
  'sverige': 'Sweden',
  
  // Denmark variations
  'dk': 'Denmark',
  'danmark': 'Denmark',
  
  // Austria variations
  'at': 'Austria',
  'österreich': 'Austria',
  
  // Czech Republic variations
  'cz': 'Czech Republic',
  'czechia': 'Czech Republic',
  
  // Poland variations
  'pl': 'Poland',
  'polska': 'Poland',
};

function getCountryFromCity(city) {
  if (!city) return '';
  return CITY_TO_COUNTRY[city] || '';
}

function normalizeCountry(country) {
  if (!country) return '';
  
  const normalized = String(country).trim();
  if (!normalized) return '';
  
  // Check if it's already a full country name (exact match)
  const fullCountryNames = Object.values(COUNTRY_NORMALIZATION_MAP);
  if (fullCountryNames.includes(normalized)) {
    return normalized;
  }
  
  // Try case-insensitive match with full country names
  const countryKey = Object.keys(COUNTRY_NORMALIZATION_MAP).find(
    key => COUNTRY_NORMALIZATION_MAP[key].toLowerCase() === normalized.toLowerCase()
  );
  if (countryKey) {
    return COUNTRY_NORMALIZATION_MAP[countryKey];
  }
  
  // Try normalization map (handles codes and variations)
  const lowerCountry = normalized.toLowerCase();
  if (COUNTRY_NORMALIZATION_MAP[lowerCountry]) {
    return COUNTRY_NORMALIZATION_MAP[lowerCountry];
  }
  
  // If it's a city name (like "Dublin" in country field), get country from city
  const countryFromCity = getCountryFromCity(normalized);
  if (countryFromCity) {
    return countryFromCity;
  }
  
  // Return original if no match found (but capitalize first letter)
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

function normalizeCity(city) {
  if (!city) return '';
  
  const normalized = String(city).trim();
  if (!normalized) return '';
  
  // Capitalize first letter of each word
  return normalized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function normalizeLocation(location, city, country) {
  if (!location && !city) return '';
  
  // Use provided city/country if available, otherwise parse from location
  let normalizedCity = city ? normalizeCity(city) : '';
  let normalizedCountry = country ? normalizeCountry(country) : '';
  
  // If we have location string, try to extract city/country from it
  if (location && !normalizedCity) {
    const parts = String(location).split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      normalizedCity = normalizeCity(parts[0]);
    }
    if (parts.length > 1 && !normalizedCountry) {
      // Try to normalize the country part
      normalizedCountry = normalizeCountry(parts[parts.length - 1]);
    }
  }
  
  // If we still don't have a country, try to infer from city
  if (normalizedCity && !normalizedCountry) {
    const inferredCountry = getCountryFromCity(normalizedCity);
    if (inferredCountry) {
      normalizedCountry = inferredCountry;
    }
  }
  
  // Build standardized location string
  if (normalizedCity && normalizedCountry) {
    return `${normalizedCity}, ${normalizedCountry}`;
  } else if (normalizedCity) {
    return normalizedCity;
  } else if (location) {
    return String(location).trim();
  }
  
  return '';
}

function normalizeJobLocation(job) {
  // Normalize city
  let normalizedCity = normalizeCity(job.city);
  
  // If no city but we have location, extract from location
  if (!normalizedCity && job.location) {
    const parts = String(job.location).split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      normalizedCity = normalizeCity(parts[0]);
    }
  }
  
  // Normalize country
  let normalizedCountry = normalizeCountry(job.country);
  
  // If country is invalid (like city name), infer from city
  if (normalizedCountry && !COUNTRY_NORMALIZATION_MAP[normalizedCountry.toLowerCase()] && 
      !Object.values(COUNTRY_NORMALIZATION_MAP).includes(normalizedCountry)) {
    const inferredFromCity = getCountryFromCity(normalizedCity);
    if (inferredFromCity) {
      normalizedCountry = inferredFromCity;
    }
  }
  
  // If still no country, infer from city
  if (!normalizedCountry && normalizedCity) {
    const inferredCountry = getCountryFromCity(normalizedCity);
    if (inferredCountry) {
      normalizedCountry = inferredCountry;
    }
  }
  
  // Build standardized location string
  const normalizedLocation = normalizeLocation(
    job.location,
    normalizedCity,
    normalizedCountry
  );
  
  return {
    city: normalizedCity,
    country: normalizedCountry,
    location: normalizedLocation,
  };
}

module.exports = {
  normalizeJobLocation,
  normalizeCity,
  normalizeCountry,
  normalizeLocation,
  getCountryFromCity,
};

