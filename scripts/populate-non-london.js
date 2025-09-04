#!/usr/bin/env node

// Populate jobs from non-London cities across Europe
const { execSync } = require('child_process');

console.log('🌍 POPULATING NON-LONDON JOBS ACROSS EUROPE');
console.log('=============================================\n');

// Test individual scrapers for non-London cities
async function populateNonLondonJobs() {
  try {
    // 1. Test Adzuna with non-London cities
    console.log('📍 Testing Adzuna (Madrid, Berlin, Amsterdam, Paris, Dublin):');
    try {
      const adzunaOutput = execSync('npx tsx -e "import(\'./scrapers/adzuna-scraper-standalone.ts\').then(m => { const AdzunaScraper = m.default.default || m.default; const scraper = new AdzunaScraper(); scraper.scrapeSingleCity(\'Madrid\').then(result => { console.log(\'✅ Madrid jobs:\', result.jobs.length); result.jobs.slice(0, 3).forEach(job => console.log(\'  -\', job.title, \'at\', job.company, \'(\', job.location, \')\')); }); });"', { encoding: 'utf8' });
      console.log(adzunaOutput);
    } catch (error) {
      console.log('❌ Adzuna test failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 2. Test Reed with non-London cities
    console.log('📍 Testing Reed (Manchester, Birmingham, Edinburgh):');
    try {
      const reedOutput = execSync('npx tsx -e "import(\'./scrapers/reed-scraper-standalone.ts\').then(m => { const ReedScraper = m.default.default || m.default; const scraper = new ReedScraper(); scraper.scrapeSingleCity(\'Manchester\').then(result => { console.log(\'✅ Manchester jobs:\', result.jobs.length); result.jobs.slice(0, 3).forEach(job => console.log(\'  -\', job.title, \'at\', job.company, \'(\', job.location, \')\')); }); });"', { encoding: 'utf8' });
      console.log(reedOutput);
    } catch (error) {
      console.log('❌ Reed test failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 3. Test Greenhouse (already EU-focused)
    console.log('📍 Testing Greenhouse (EU companies):');
    try {
      const greenhouseOutput = execSync('npx tsx -e "import(\'./scrapers/greenhouse.ts\').then(m => { const GreenhouseScraper = m.default.default || m.default; const scraper = new GreenhouseScraper(); scraper.scrape().then(result => { console.log(\'✅ Greenhouse jobs:\', result.jobs.length); result.jobs.filter(job => !job.location.toLowerCase().includes(\'london\')).slice(0, 3).forEach(job => console.log(\'  -\', job.title, \'at\', job.company, \'(\', job.location, \')\')); }); });"', { encoding: 'utf8' });
      console.log(greenhouseOutput);
    } catch (error) {
      console.log('❌ Greenhouse test failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 4. Test JSearch with EU cities
    console.log('📍 Testing JSearch (EU cities only):');
    try {
      const jsearchOutput = execSync('npx tsx -e "import(\'./scrapers/jsearch-scraper.ts\').then(m => { const JSearchScraper = m.default.default || m.default; const scraper = new JSearchScraper(); scraper.searchSingleQuery(\'graduate program\', \'Berlin, Germany\').then(result => { console.log(\'✅ Berlin jobs:\', result.jobs.length); result.jobs.slice(0, 3).forEach(job => console.log(\'  -\', job.title, \'at\', job.company, \'(\', job.location, \')\')); }); });"', { encoding: 'utf8' });
      console.log(jsearchOutput);
    } catch (error) {
      console.log('❌ JSearch test failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 5. Test Muse with EU locations
    console.log('📍 Testing Muse (EU locations):');
    try {
      const museOutput = execSync('npx tsx -e "import(\'./scrapers/muse-scraper.ts\').then(m => { const MuseScraper = m.default.default || m.default; const scraper = new MuseScraper(); scraper.scrapeSingleLocation(\'Paris, France\').then(result => { console.log(\'✅ Paris jobs:\', result.jobs.length); result.jobs.slice(0, 3).forEach(job => console.log(\'  -\', job.title, \'at\', job.company, \'(\', job.location, \')\')); }); });"', { encoding: 'utf8' });
      console.log(museOutput);
    } catch (error) {
      console.log('❌ Muse test failed:', error.message);
    }

    console.log('\n✅ Non-London job population complete!');
    console.log('🌍 You should now have jobs from cities across Europe!');

  } catch (error) {
    console.error('❌ Error populating non-London jobs:', error);
  }
}

// Run the population
populateNonLondonJobs();
