#!/usr/bin/env node

// Simple script to run Adzuna scraper and see real results
import AdzunaScraper from '../scrapers/adzuna-scraper-standalone.ts';

async function runAdzuna() {
  console.log('🚀 Starting Adzuna scraper...');
  
  try {
    const scraper = new AdzunaScraper();
    
    // Show configuration
    console.log('📍 Target cities:', scraper.getTargetCities());
    console.log('🌍 Countries:', scraper.getCountries());
    console.log('📊 Daily stats:', scraper.getDailyStats());
    
    // Run the scraper
    console.log('\n🔍 Scraping all cities...');
    const result = await scraper.scrapeAllCities();
    
    console.log('\n✅ SCRAPING COMPLETE!');
    console.log('📊 Total jobs found:', result.jobs.length);
    console.log('🏙️ Cities processed:', result.metrics.citiesProcessed);
    console.log('📞 API calls used:', result.metrics.callsUsed);
    console.log('💰 Budget remaining:', result.metrics.budgetRemaining);
    
    // Show sample jobs
    if (result.jobs.length > 0) {
      console.log('\n🎯 Sample jobs found:');
      result.jobs.slice(0, 5).forEach((job, i) => {
        console.log(`  ${i + 1}. ${job.title} at ${job.company} (${job.location})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Adzuna scraper failed:', error.message);
  }
}

runAdzuna();
