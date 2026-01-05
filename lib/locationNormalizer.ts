/**
 * Location Normalization Utility
 * Standardizes city, country, and location fields to a consistent format
 */

import { getCountryFromCity } from "./countryFlags";

/**
 * Map of country codes and variations to standardized full country names
 */
export const COUNTRY_NORMALIZATION_MAP: Record<string, string> = {
  // United Kingdom variations
  gb: "United Kingdom",
  uk: "United Kingdom",
  eng: "United Kingdom",
  england: "United Kingdom",
  scotland: "United Kingdom",
  wales: "United Kingdom",
  "northern ireland": "United Kingdom",
  "great britain": "United Kingdom",

  // Ireland variations
  ie: "Ireland",
  irl: "Ireland",
  eire: "Ireland",
  éire: "Ireland",
  "republic of ireland": "Ireland",

  // France variations
  fr: "France",

  // Germany variations
  de: "Germany",
  deutschland: "Germany",

  // Spain variations
  es: "Spain",
  españa: "Spain",

  // Italy variations
  it: "Italy",
  italia: "Italy",

  // Netherlands variations
  nl: "Netherlands",
  holland: "Netherlands",

  // Belgium variations
  be: "Belgium",
  belgië: "Belgium",
  belgique: "Belgium",

  // Switzerland variations
  ch: "Switzerland",
  schweiz: "Switzerland",
  suisse: "Switzerland",

  // Sweden variations
  se: "Sweden",
  sverige: "Sweden",

  // Denmark variations
  dk: "Denmark",
  danmark: "Denmark",

  // Austria variations
  at: "Austria",
  österreich: "Austria",

  // Czech Republic variations
  cz: "Czech Republic",
  czechia: "Czech Republic",

  // Poland variations
  pl: "Poland",
  polska: "Poland",
};

/**
 * Normalize country code/name to full country name
 */
export function normalizeCountry(country: string | null | undefined): string {
  if (!country) return "";

  const normalized = country.trim();
  if (!normalized) return "";

  // Check if it's already a full country name (exact match)
  const fullCountryNames = Object.values(COUNTRY_NORMALIZATION_MAP);
  if (fullCountryNames.includes(normalized)) {
    return normalized;
  }

  // Try case-insensitive match with full country names
  const countryKey = Object.keys(COUNTRY_NORMALIZATION_MAP).find(
    (key) =>
      COUNTRY_NORMALIZATION_MAP[key].toLowerCase() === normalized.toLowerCase(),
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

  // CRITICAL: If it's a country name being used incorrectly, return empty string
  // This prevents countries from being saved as city names
  const allCountryVariations = [
    ...Object.keys(COUNTRY_NORMALIZATION_MAP),
    ...Object.values(COUNTRY_NORMALIZATION_MAP),
    "espana",
    "deutschland",
    "osterreich",
    "nederland",
    "belgique",
    "united kingdom",
    "uk",
    "usa",
    "us",
    "france",
    "germany",
    "spain",
    "austria",
    "netherlands",
    "belgium",
    "ireland",
    "schweiz",
    "switzerland",
    "italia",
    "italy",
    "poland",
    "polska",
    "denmark",
    "danmark",
    "sweden",
    "sverige",
    "czech republic",
    "czechia",
  ];
  if (allCountryVariations.some((c) => c.toLowerCase() === lowerCountry)) {
    return ""; // Return empty for countries
  }

  // Return original if no match found (but capitalize first letter)
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

/**
 * Map of city name variations to canonical city names
 * CRITICAL: This prevents city name fragmentation in the database
 */
export const CITY_NORMALIZATION_MAP: Record<string, string> = {
  // German city variations
  münchen: "Munich",
  "garching bei münchen": "Munich",
  "flughafen münchen": "Munich",
  garching: "Munich",
  "neufahrn bei freising": "Munich",
  köln: "Cologne",
  "hamburg-altona": "Hamburg",
  "hamburg harvestehude": "Hamburg",
  "hamburg-harburg": "Hamburg",
  "frankfurt am main": "Frankfurt",
  "berlin-friedrichshain": "Berlin",
  "berlin-kreuzberg": "Berlin",
  "berlin-mitte": "Berlin",

  // Austrian city variations
  wien: "Vienna",
  "wiener neudorf": "Vienna",

  // Czech city variations
  praha: "Prague",
  "praha 1": "Prague",
  "praha 2": "Prague",
  "praha 4": "Prague",
  "praha 5": "Prague",
  "praha 7": "Prague",
  "praha 8": "Prague",
  "praha 10": "Prague",

  // Italian city variations
  milano: "Milan",
  roma: "Rome",

  // Spanish city variations (Barcelona area)
  "l'hospitalet de llobregat": "Barcelona",
  "el prat de llobregat": "Barcelona",
  "sant cugat del vallès": "Barcelona",
  "sant boi de llobregat": "Barcelona",
  "sant joan despí": "Barcelona",
  "parets del vallès": "Barcelona",
  "montcada i reixac": "Barcelona",
  "santa perpètua de mogoda": "Barcelona",
  polinyà: "Barcelona",
  viladecans: "Barcelona",
  viladecavalls: "Barcelona",

  // Spanish city variations (Madrid area)
  "alcalá de henares": "Madrid",
  alcobendas: "Madrid",
  "pozuelo de alarcón": "Madrid",
  "tres cantos": "Madrid",
  "torrejón de ardoz": "Madrid",
  "las rozas de madrid": "Madrid",
  "la moraleja": "Madrid",
  getafe: "Madrid",
  leganés: "Madrid",
  fuenlabrada: "Madrid",

  // French city variations (Paris area)
  "levallois-perret": "Paris",
  "boulogne-billancourt": "Paris",
  "charenton-le-pont": "Paris",
  "saint-cloud": "Paris",
  "saint-ouen": "Paris",
  "ivry-sur-seine": "Paris",
  "noisy-le-grand": "Paris",
  "noisy-le-sec": "Paris",
  "fontenay-sous-bois": "Paris",
  clichy: "Paris",
  courbevoie: "Paris",
  nanterre: "Paris",
  montreuil: "Paris",
  montrouge: "Paris",
  puteaux: "Paris",
  "issy-les-moulineaux": "Paris",
  "roissy-en-france": "Paris",
  "tremblay-en-france": "Paris",
  "ville-d'avray": "Paris",
  villebon: "Paris",
  villeparisis: "Paris",
  "la défense": "Paris",
  antony: "Paris",
  bagneux: "Paris",
  cergy: "Paris",
  clamart: "Paris",
  creil: "Paris",
  ennery: "Paris",
  épinay: "Paris",
  fourqueux: "Paris",
  franconville: "Paris",
  gagny: "Paris",
  "livry-gargan": "Paris",
  massy: "Paris",
  meaux: "Paris",
  "pontault-combault": "Paris",
  "rueil-malmaison": "Paris",
  "saint-cyr": "Paris",
  stains: "Paris",
  vélizy: "Paris",
  "brétigny-sur-orge": "Paris",
  "braine-l'alleud": "Paris",
  "paris 8e": "Paris",

  // Belgian city variations (Brussels area)
  bruxelles: "Brussels",
  "bruxelles ixelles": "Brussels",
  "bruxelles saint-gilles": "Brussels",
  "bruxelles schaarbeek": "Brussels",
  elsene: "Brussels",
  diegem: "Brussels",
  machelen: "Brussels",
  zaventem: "Brussels",
  dilbeek: "Brussels",
  mechelen: "Brussels",
  mortsel: "Brussels",
  kontich: "Brussels",
  kortenberg: "Brussels",
  kampenhout: "Brussels",
  puurs: "Brussels",
  rixensart: "Brussels",
  "strombeek-bever": "Brussels",
  wemmel: "Brussels",
  courcelles: "Brussels",
  drogenbos: "Brussels",
  erembodegem: "Brussels",
  "heist-op-den-berg": "Brussels",
  lede: "Brussels",
  ninove: "Brussels",
  nivelles: "Brussels",
  "sint-katelijne-waver": "Brussels",
  tirlemont: "Brussels",
  zottegem: "Brussels",
  zwijnaarde: "Brussels",
  zwijndrecht: "Brussels",

  // Dutch city variations (Amsterdam area)
  "amsterdam centrum": "Amsterdam",
  "amsterdam noord": "Amsterdam",
  "amsterdam oost": "Amsterdam",
  "amsterdam westpoort": "Amsterdam",
  "amsterdam zuid": "Amsterdam",
  "amsterdam-zuidoost": "Amsterdam",
  amstelveen: "Amsterdam",
  badhoevedorp: "Amsterdam",
  haarlem: "Amsterdam",
  hoofddorp: "Amsterdam",
  zaandam: "Amsterdam",
  halfweg: "Amsterdam",
  warmenhuizen: "Amsterdam",
  vijfhuizen: "Amsterdam",
  "nieuw-vennep": "Amsterdam",
  "utrecht west": "Utrecht",

  // Danish city variations
  københavn: "Copenhagen",
  frederiksberg: "Copenhagen",
  bagsværd: "Copenhagen",
  birkerød: "Copenhagen",
  brøndby: "Copenhagen",
  gladsaxe: "Copenhagen",
  herlev: "Copenhagen",
  hørsholm: "Copenhagen",
  humlebæk: "Copenhagen",
  ishøj: "Copenhagen",
  kastrup: "Copenhagen",
  lynge: "Copenhagen",
  måløv: "Copenhagen",
  roskilde: "Copenhagen",
  søborg: "Copenhagen",
  täby: "Copenhagen",
  vallensbæk: "Copenhagen",

  // Swedish city variations
  solna: "Stockholm",
  järfälla: "Stockholm",
  johanneshov: "Stockholm",
  kista: "Stockholm",
  sollentuna: "Stockholm",

  // Swiss city variations (Zurich area)
  zürich: "Zurich",
  opfikon: "Zurich",
  wallisellen: "Zurich",
  schlieren: "Zurich",
  dübendorf: "Zurich",
  "dübendorf / bahnhofstrasse": "Zurich",
  dietikon: "Zurich",
  dielsdorf: "Zurich",
  niederglatt: "Zurich",
  rümlang: "Zurich",
  rüschlikon: "Zurich",
  rüti: "Zurich",
  urdorf: "Zurich",
  wädenswil: "Zurich",
  wetzikon: "Zurich",
  zollikon: "Zurich",
  "affoltern am albis": "Zurich",
  bülach: "Zurich",
  dällikon: "Zurich",
  herrliberg: "Zurich",
  kilchberg: "Zurich",
  männedorf: "Zurich",
  stäfa: "Zurich",
  winterthur: "Zurich",

  // Polish city variations
  warszawa: "Warsaw",
  "nowy dwór mazowiecki": "Warsaw",

  // Irish city variations (Dublin area)
  "dublin 1": "Dublin",
  "dublin 2": "Dublin",
  "dublin 07": "Dublin",
  "dublin 14": "Dublin",
  blackrock: "Dublin",
  clondalkin: "Dublin",
  clonskeagh: "Dublin",
  dunboyne: "Dublin",
  glasnevin: "Dublin",
  leixlip: "Dublin",
  maynooth: "Dublin",
  naas: "Dublin",
  rathcoole: "Dublin",
  rathfarnham: "Dublin",
  rathmines: "Dublin",
  ratoath: "Dublin",
  sandyford: "Dublin",
  ballymount: "Dublin",
  balbriggan: "Dublin",
  bray: "Dublin",

  // UK city variations (London area)
  "central london": "London",
  "city of london": "London",
  "east london": "London",
  "north london": "London",
  "north west london": "London",
  "south east london": "London",
  "south london": "London",
  "south west london": "London",
  "west london": "London",
  "london heathrow airport": "London",
  bexleyheath: "London",
  croydon: "London",
  dartford: "London",
  erith: "London",
  farringdon: "London",
  greenhithe: "London",
  islington: "London",
  lambeth: "London",
  longsight: "London",
  loughton: "London",
  "new malden": "London",
  norwood: "London",
  prestwich: "London",
  purley: "London",
  "slades green": "London",
  "staines-upon-thames": "London",
  teddington: "London",
  tilbury: "London",
  tooting: "London",
  uxbridge: "London",
  walthamstow: "London",
  wapping: "London",
  watford: "London",
  "west brompton": "London",
  "west byfleet": "London",
  woking: "London",
  "alderley edge": "London",
  altrincham: "London",
  handforth: "London",
  wilmslow: "London",

  // UK other cities
  sale: "Manchester",
  salford: "Manchester",
  swinton: "Manchester",
  rochdale: "Manchester",
  stockport: "Manchester",
  hyde: "Manchester",
  huddersfield: "Manchester",
  bolton: "Manchester",
  bury: "Manchester",
  burnley: "Manchester",
  chorley: "Manchester",
  darwen: "Manchester",
  hindley: "Manchester",
  rossendale: "Manchester",
  skelmersdale: "Manchester",
  solihull: "Birmingham",
  coventry: "Birmingham",
  coleshill: "Birmingham",
  "west bromwich": "Birmingham",
  wolverhampton: "Birmingham",

  // Other city variations
  anvers: "Antwerp",
  gand: "Ghent",
  "den haag": "The Hague",
};

/**
 * Normalize city name to standard format
 * CRITICAL: This prevents city name fragmentation by mapping variations to canonical names
 */
export function normalizeCity(city: string | null | undefined): string {
  if (!city) return "";

  const normalized = city.trim();
  if (!normalized) return "";

  // First, check if it's a known variation (case-insensitive)
  const lowerCity = normalized.toLowerCase();
  if (CITY_NORMALIZATION_MAP[lowerCity]) {
    return CITY_NORMALIZATION_MAP[lowerCity];
  }

  // Check for district patterns (e.g., "Praha 5", "Dublin 2")
  if (/^(praha|dublin|paris|berlin|amsterdam)\s*\d+/i.test(normalized)) {
    const baseCity = normalized.match(
      /^(praha|dublin|paris|berlin|amsterdam)/i,
    )?.[1];
    if (baseCity) {
      const baseLower = baseCity.toLowerCase();
      if (CITY_NORMALIZATION_MAP[baseLower] || baseLower === "praha")
        return "Prague";
      if (baseLower === "dublin") return "Dublin";
      if (baseLower === "paris") return "Paris";
      if (baseLower === "berlin") return "Berlin";
      if (baseLower === "amsterdam") return "Amsterdam";
    }
  }

  // Check if it's a country name (should be rejected)
  const countryNames = Object.values(COUNTRY_NORMALIZATION_MAP);
  if (
    countryNames.includes(normalized) ||
    COUNTRY_NORMALIZATION_MAP[lowerCity]
  ) {
    return ""; // Return empty string for countries
  }

  // If no mapping found, capitalize properly and return
  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Normalize location string to consistent format: "City, Country"
 * Handles various input formats and returns standardized output
 */
export function normalizeLocation(
  location: string | null | undefined,
  city?: string | null,
  country?: string | null,
): string {
  if (!location && !city) return "";

  // Use provided city/country if available, otherwise parse from location
  let normalizedCity = city ? normalizeCity(city) : "";
  let normalizedCountry = country ? normalizeCountry(country) : "";

  // If we have location string, try to extract city/country from it
  if (location && !normalizedCity) {
    const parts = location
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
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
    return location.trim();
  }

  return "";
}

/**
 * Normalize all location fields for a job record
 * Returns normalized city, country, and location fields
 */
export function normalizeJobLocation(job: {
  city?: string | null;
  country?: string | null;
  location?: string | null;
}): {
  city: string;
  country: string;
  location: string;
} {
  // Normalize city
  let normalizedCity = normalizeCity(job.city);

  // If no city but we have location, extract from location
  if (!normalizedCity && job.location) {
    const parts = job.location
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      normalizedCity = normalizeCity(parts[0]);
    }
  }

  // Normalize country
  let normalizedCountry = normalizeCountry(job.country);

  // If country is invalid (like city name), infer from city
  if (
    normalizedCountry &&
    !COUNTRY_NORMALIZATION_MAP[normalizedCountry.toLowerCase()] &&
    !Object.values(COUNTRY_NORMALIZATION_MAP).includes(normalizedCountry)
  ) {
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
    normalizedCountry,
  );

  return {
    city: normalizedCity,
    country: normalizedCountry,
    location: normalizedLocation,
  };
}
