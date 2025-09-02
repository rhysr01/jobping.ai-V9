#!/usr/bin/env node

/**
 * Example Usage of Adzuna Job Scraping Functions
 * Shows different ways to use the modular functions
 */

const { 
  scrapeAllCities, 
  quickScrape, 
  getAvailableCities,
  scrapeCityJobs 
} = require('./adzuna-job-functions');

// Example 1: Scrape all cities (full run)
async function exampleFullScrape() {
  console.log('🚀 Example 1: Full Scrape of All Cities\n');
  
  try {
    const results = await scrapeAllCities({
      verbose: true,
      delay: 1000, // 1 second delay between requests
      resultsPerPage: 25
    });
    
    console.log(`\n📊 Full scrape completed! Total jobs: ${results.totalJobs}`);
    return results;
  } catch (error) {
    console.error('❌ Full scrape failed:', error.message);
  }
}

// Example 2: Quick scrape of a single city
async function exampleSingleCity() {
  console.log('\n🎯 Example 2: Quick Scrape of London Only\n');
  
  try {
    const londonJobs = await quickScrape('London', {
      verbose: true,
      delay: 500,
      resultsPerPage: 15
    });
    
    console.log(`\n📊 London scrape completed! Jobs found: ${londonJobs.length}`);
    return londonJobs;
  } catch (error) {
    console.error('❌ London scrape failed:', error.message);
  }
}

// Example 3: Custom city and keywords
async function exampleCustomSearch() {
  console.log('\n🔍 Example 3: Custom Search for Berlin with Specific Keywords\n');
  
  try {
    const customKeywords = ['junior', 'student', 'praktikum'];
    const berlinJobs = await scrapeCityJobs('Berlin', 'de', customKeywords, {
      verbose: true,
      delay: 600,
      resultsPerPage: 20
    });
    
    console.log(`\n📊 Custom Berlin search completed! Jobs found: ${berlinJobs.length}`);
    return berlinJobs;
  } catch (error) {
    console.error('❌ Custom search failed:', error.message);
  }
}

// Example 4: Get available cities info
function exampleGetCities() {
  console.log('\n🌍 Example 4: Available Cities and Keywords\n');
  
  const cities = getAvailableCities();
  cities.forEach(city => {
    console.log(`\n🏢 ${city.name} (${city.country}):`);
    console.log(`   Keywords: ${city.keywords.join(', ')}`);
  });
  
  return cities;
}

// Example 5: Batch processing with custom options
async function exampleBatchProcessing() {
  console.log('\n⚡ Example 5: Batch Processing with Custom Options\n');
  
  try {
    // Process only UK cities with faster settings
    const ukCities = [
      { name: 'London', country: 'gb', keywords: ['graduate', 'junior', 'entry-level'] }
    ];
    
    const results = await scrapeAllCities({
      cities: ukCities,
      verbose: true,
      delay: 300, // Faster processing
      resultsPerPage: 30,
      timeout: 10000
    });
    
    console.log(`\n📊 Batch processing completed! Total jobs: ${results.totalJobs}`);
    return results;
  } catch (error) {
    console.error('❌ Batch processing failed:', error.message);
  }
}

// Main execution function
async function runExamples() {
  console.log('🎯 Adzuna Job Scraping Functions - Usage Examples\n');
  console.log('='.repeat(60));
  
  // Show available cities first
  exampleGetCities();
  
  // Run examples (uncomment the ones you want to test)
  
  // await exampleFullScrape();        // Full scrape of all cities
  // await exampleSingleCity();        // Single city scrape
  // await exampleCustomSearch();      // Custom search
  // await exampleBatchProcessing();   // Batch processing
  
  console.log('\n✅ Examples completed! Uncomment the examples you want to run.');
  console.log('💡 Each function returns structured data that you can use in your application.');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

// Export examples for use in other files
module.exports = {
  exampleFullScrape,
  exampleSingleCity,
  exampleCustomSearch,
  exampleGetCities,
  exampleBatchProcessing,
  runExamples
};

