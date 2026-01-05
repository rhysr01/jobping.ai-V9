/**
 * City Matching Domain - City matching with special cases and variations
 */

/**
 * Check if job matches target city
 * Handles special cases, variations, and reverse matching
 */
export function matchesCity(
  jobCity: string,
  jobLocation: string,
  targetCity: string,
): boolean {
  const cityLower = targetCity.toLowerCase().trim();
  const jobCityLower = jobCity.toLowerCase().trim();
  const jobLocLower = jobLocation.toLowerCase().trim();

  // Exact match
  if (jobCityLower === cityLower || jobLocLower === cityLower) return true;

  // Word boundary matching
  const escapedCity = cityLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`\\b${escapedCity}\\b`, "i"),
    new RegExp(`^${escapedCity}[,\\s]`, "i"),
    new RegExp(`[,\\s]${escapedCity}[,\\s]`, "i"),
    new RegExp(`[,\\s]${escapedCity}$`, "i"),
  ];

  for (let p = 0; p < patterns.length; p++) {
    if (patterns[p].test(jobCityLower) || patterns[p].test(jobLocLower)) {
      return true;
    }
  }

  // Special cases (Greater London, etc.)
  const specialCases: Record<string, string[]> = {
    london: [
      "greater london",
      "central london",
      "north london",
      "south london",
      "east london",
      "west london",
      "london area",
      "greater london area",
      "city of london",
    ],
    manchester: ["greater manchester", "manchester area"],
    birmingham: ["greater birmingham", "birmingham area", "west midlands"],
    dublin: [
      "county dublin",
      "baile átha cliath",
      "dublin area",
      "greater dublin",
    ],
    belfast: [
      "greater belfast",
      "belfast area",
      "northern ireland",
      "belfast city",
    ],
    paris: [
      "greater paris",
      "paris region",
      "île-de-france",
      "ile-de-france",
      "arrondissement",
    ],
    amsterdam: [
      "greater amsterdam",
      "amsterdam area",
      "noord-holland",
      "north holland",
    ],
    brussels: [
      "bruxelles",
      "brussel",
      "brussels-capital",
      "greater brussels",
      "brussels area",
    ],
    berlin: ["greater berlin", "brandenburg", "berlin area"],
    hamburg: ["greater hamburg", "hamburg area", "hansestadt hamburg"],
    munich: ["münchen", "greater munich", "munich area", "bavaria", "bayern"],
    frankfurt: [
      "frankfurt am main",
      "greater frankfurt",
      "frankfurt area",
      "hesse",
      "hessen",
    ],
    madrid: [
      "greater madrid",
      "comunidad de madrid",
      "madrid region",
      "madrid area",
    ],
    barcelona: [
      "greater barcelona",
      "catalonia",
      "catalunya",
      "barcelona area",
      "barcelona region",
    ],
    milan: ["greater milan", "milan area", "lombardy", "lombardia", "milano"],
    rome: ["greater rome", "rome area", "lazio", "roma"],
    lisbon: ["lisboa", "greater lisbon", "lisbon area", "lisboa area"],
    zurich: ["zürich", "greater zurich", "zurich area", "zürich area"],
    stockholm: [
      "stockholms län",
      "greater stockholm",
      "stockholm area",
      "stockholm county",
    ],
    copenhagen: [
      "københavn",
      "greater copenhagen",
      "copenhagen area",
      "capital region",
      "hovedstaden",
    ],
    oslo: ["greater oslo", "oslo area", "oslo county"],
    helsinki: ["greater helsinki", "helsinki area", "uusimaa", "helsingfors"],
    vienna: ["wien", "greater vienna", "vienna area", "wien area"],
    prague: ["praha", "greater prague", "prague area", "praha area"],
    warsaw: [
      "warszawa",
      "greater warsaw",
      "warsaw area",
      "warszawa area",
      "mazowieckie",
    ],
  };

  if (specialCases[cityLower]) {
    const variants = specialCases[cityLower];
    for (let v = 0; v < variants.length; v++) {
      if (
        jobCityLower.includes(variants[v]) ||
        jobLocLower.includes(variants[v])
      ) {
        return true;
      }
    }
  }

  // Reverse matching for cities with multiple name variations
  const reverseMatches: Record<string, string[]> = {
    rome: ["roma"],
    roma: ["rome"],
    milan: ["milano"],
    milano: ["milan"],
    lisbon: ["lisboa"],
    lisboa: ["lisbon"],
    zurich: ["zürich"],
    zürich: ["zurich"],
    copenhagen: ["københavn"],
    københavn: ["copenhagen"],
    vienna: ["wien"],
    wien: ["vienna"],
    prague: ["praha"],
    praha: ["prague"],
    warsaw: ["warszawa"],
    warszawa: ["warsaw"],
    brussels: ["bruxelles", "brussel"],
    bruxelles: ["brussels"],
    brussel: ["brussels"],
    munich: ["münchen"],
    münchen: ["munich"],
    stockholm: ["stockholms län"],
    helsinki: ["helsingfors"],
    helsingfors: ["helsinki"],
    dublin: ["baile átha cliath"],
  };

  if (reverseMatches[cityLower]) {
    const variants = reverseMatches[cityLower];
    for (let v = 0; v < variants.length; v++) {
      if (jobCityLower === variants[v] || jobLocLower.includes(variants[v])) {
        return true;
      }
    }
  }

  return false;
}
