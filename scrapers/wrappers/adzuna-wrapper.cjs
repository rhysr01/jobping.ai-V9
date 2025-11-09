#!/usr/bin/env node

// Wrapper for Adzuna scraper - standardizes output format
function parseJson(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean);
    }
    return [];
  } catch (error) {
    console.warn('⚠️  Failed to parse TARGET JSON:', error.message);
    return [];
  }
}

async function main() {
  try {
    process.env.INCLUDE_REMOTE = process.env.INCLUDE_REMOTE || 'false';
    const targetCities = parseJson(process.env.TARGET_CITIES);
    const targetCareerPaths = parseJson(process.env.TARGET_CAREER_PATHS);
    const targetIndustries = parseJson(process.env.TARGET_INDUSTRIES);
    const targetRoles = parseJson(process.env.TARGET_ROLES);

    const adzunaModule = require('../../scripts/adzuna-categories-scraper.cjs');
    const includeRemote = String(process.env.INCLUDE_REMOTE).toLowerCase() === 'true';
    const result = await adzunaModule.scrapeAllCitiesCategories({
      verbose: false,
      targetCities,
      targetCareerPaths,
      targetIndustries,
      targetRoles,
      includeRemote,
    });
    const jobs = result.jobs;
    console.log(`✅ Adzuna: ${jobs.length} jobs saved to database`);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Adzuna failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };


