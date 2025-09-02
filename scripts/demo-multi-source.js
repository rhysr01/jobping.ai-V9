#!/usr/bin/env node

/**
 * Demonstration script for the Multi-Source Scraper System
 * Shows usage patterns and examples without requiring API keys
 */

console.log('🚀 Multi-Source Scraper System Demo\n');

console.log('📋 System Overview:');
console.log('This system implements a comprehensive job scraping strategy with:');
console.log('• Shared design patterns across all sources');
console.log('• City-first batching and incremental pulls');
console.log('• Backoff + retries with exponential jitter');
console.log('• ETag/Last-Modified caching where supported');
console.log('• Comprehensive monitoring and metrics');
console.log('• Early-career tagging in multiple languages\n');

console.log('🎯 Target Cities (10 European cities):');
const cities = [
  'London', 'Madrid', 'Berlin', 'Amsterdam', 'Paris', 
  'Dublin', 'Stockholm', 'Zurich', 'Barcelona', 'Munich'
];
cities.forEach((city, index) => {
  console.log(`   ${index + 1}. ${city}`);
});

console.log('\n🔧 Three Scraper Sources:');

console.log('\n1️⃣  ADZUNA SCRAPER');
console.log('   • 1,000 calls/month free (≈33/day)');
console.log('   • 10 cities × 3 calls = 30 daily calls');
console.log('   • Track rotation strategy:');
console.log('     - Track A: intern OR graduate OR junior');
console.log('     - Track B: student OR trainee (industry focus)');
console.log('     - Track C: local language synonyms');
console.log('   • Dedupe by: adzuna_id + company + title + city');
console.log('   • Fail-safe: extra page for low-yield cities');

console.log('\n2️⃣  REED SCRAPER');
console.log('   • UK-focused London coverage');
console.log('   • Self-throttle ~1 req/sec');
console.log('   • UK business hours (08:00–20:00 local)');
console.log('   • Run every 30 minutes');
console.log('   • Alternating runs: graduate/intern vs junior/entry-level');
console.log('   • In-memory "seen set" for 48h');
console.log('   • Backoff: 1 req/sec; 429 = exponential backoff');

console.log('\n3️⃣  INFOJOBS SCRAPER');
console.log('   • Spain: Madrid/Barcelona precision');
console.log('   • Hourly pulls during ES business hours (09:00–21:00)');
console.log('   • Early-career filters: experienceMin=no_experience');
console.log('   • Hourly rotation strategy:');
console.log('     - Top of hour: IT + junior terms');
console.log('     - :20 past: Business/Finance + junior terms');
console.log('     - :40 past: Marketing/Sales + student terms');
console.log('     - Evening: broader sweep (page 1 only)');

console.log('\n🔄 SHARED DESIGN PATTERNS:');

console.log('\n📊 Incremental Pulls:');
console.log('   • Always ask "new since last run"');
console.log('   • Use posted_after/date/updated if available');
console.log('   • Fallback: last 48h with dedupe by (source, external_id)');

console.log('\n🏙️  City-First Batching:');
console.log('   • Run one job per city, per source');
console.log('   • Normalize to schema → dedupe → tag early-career');

console.log('\n⏱️  Backoff + Retries:');
console.log('   • 429/5xx = exponential backoff with jitter');
console.log('   • Respect Retry-After if provided');

console.log('\n💾 Caching:');
console.log('   • Store ETag/Last-Modified where APIs support it');
console.log('   • Skip unchanged pages');

console.log('\n📈 Monitoring:');
console.log('   • Log requests, new_jobs, duplicates, errors, latency');
console.log('   • Per-city coverage tracking');
console.log('   • Alert if any metric drops to zero');

console.log('\n🏷️  Early-Career Tagging (Multilingual):');
console.log('   • EN: intern, graduate, junior, trainee, entry-level, placement');
console.log('   • ES: becario, prácticas, junior, recién graduado');
console.log('   • DE: praktikant, praktikum, trainee, berufseinsteiger, junior');
console.log('   • FR: stagiaire, alternance, junior, débutant, jeune diplômé');
console.log('   • NL: stagiair, werkstudent, junior, starter');

console.log('\n📊 Normalization Fields:');
const fields = [
  'title', 'company', 'city', 'country', 'url', 'posted_at', 
  'source', 'platform', 'lang', 'contract_type', 'seniority',
  'is_internship', 'is_graduate', 'salary_min', 'salary_max',
  'deadline', 'skills_tags[]', 'visa_sponsorship'
];
console.log('   • ' + fields.join(', '));

console.log('\n🔑 Environment Variables Required:');
const envVars = [
  'ADZUNA_APP_ID',
  'ADZUNA_APP_KEY',
  'REED_API_KEY', 
  'INFOJOBS_TOKEN'
];
envVars.forEach(envVar => {
  console.log(`   • ${envVar}`);
});

console.log('\n📝 Usage Examples:');

console.log('\n// Individual scraper usage:');
console.log('const adzunaScraper = new AdzunaScraper();');
console.log('const result = await adzunaScraper.scrapeAllCities();');
console.log('console.log(result.jobs.length, "jobs found");');

console.log('\n// Multi-source orchestrator:');
console.log('const orchestrator = new MultiSourceOrchestrator();');
console.log('const { jobs, metrics } = await orchestrator.runFullScrape();');
console.log('console.log(metrics.earlyCareerTagged, "early-career jobs");');

console.log('\n// Single source scraping:');
console.log('const reedJobs = await orchestrator.runSingleSource("reed");');
console.log('console.log(reedJobs.jobs.length, "Reed jobs");');

console.log('\n// Get status and metrics:');
console.log('const status = orchestrator.getStatus();');
console.log('const coverage = orchestrator.getCoverageReport();');
console.log('const recentMetrics = orchestrator.getMetrics(10);');

console.log('\n🚀 Getting Started:');
console.log('1. Set up environment variables with your API keys');
console.log('2. Test individual scrapers: npm run test:multi-source:simple');
console.log('3. Test TypeScript compilation: npm run test:imports');
console.log('4. Run full system: npm run test:multi-source:tsx');
console.log('5. Integrate into your production workflow');

console.log('\n📊 Expected Performance:');
console.log('• Adzuna: ~30-33 API calls/day, 10 cities');
console.log('• Reed: ~48 calls/day (2 per 30 min × 12 hours)');
console.log('• InfoJobs: ~48 calls/day (hourly × 2 cities × 12 hours)');
console.log('• Total: ~126-129 API calls/day across all sources');

console.log('\n🎯 Key Benefits:');
console.log('• Maximizes coverage within tight API budgets');
console.log('• Intelligent rotation strategies to stretch quotas');
console.log('• Comprehensive early-career job detection');
console.log('• Multilingual support for European markets');
console.log('• Robust error handling and monitoring');
console.log('• Scalable architecture for adding new sources');

console.log('\n✅ Multi-Source Scraper System is ready to use!');
console.log('Set up your API keys and start scraping European early-career jobs.');
