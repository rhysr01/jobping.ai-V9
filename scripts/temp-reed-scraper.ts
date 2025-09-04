
import ReedScraper from '../scrapers/reed-scraper-standalone';

async function runReedScraper() {
  try {
    const scraper = new ReedScraper();
    
    // Check if it's business hours
    const status = scraper.getStatus();
    
    if (!status.businessHours) {
      // Use date range if outside business hours
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = new Date().toISOString().split('T')[0];
      
      const result = await scraper.scrapeLondonWithDateRange(fromDate, toDate);
      console.log('===REED_JOBS_START===');
      console.log(JSON.stringify(result.jobs, null, 2));
      console.log('===REED_JOBS_END===');
    } else {
      // Use normal scrape if during business hours
      const result = await scraper.scrapeLondon();
      console.log('===REED_JOBS_START===');
      console.log(JSON.stringify(result.jobs, null, 2));
      console.log('===REED_JOBS_END===');
    }
    
  } catch (error) {
    console.error('Reed scraper failed:', error);
    process.exit(1);
  }
}

runReedScraper();
