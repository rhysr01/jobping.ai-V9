#!/usr/bin/env node

/**
 * Test Adzuna's expanded city coverage - now 12 cities instead of 5!
 */

console.log('🚀 Testing Adzuna Expanded City Coverage!\n');

// Set environment variables
process.env.ADZUNA_APP_ID = 'd34f1fb7';
process.env.ADZUNA_APP_KEY = '9cd0a37a973d0bfc810261e14feec9b5';

// Test cities from the expanded configuration
const cities = [
  'London', 'Madrid', 'Berlin', 'Barcelona', 'Amsterdam',
  'Dublin', 'Munich', 'Stockholm', 'Copenhagen', 'Zurich', 'Vienna', 'Paris'
];

console.log(`📍 Testing ${cities.length} cities for early-career jobs...\n`);

import('https').then(https => {
  let completed = 0;
  let totalJobs = 0;
  let totalEarlyCareer = 0;
  const results = [];
  
  cities.forEach(city => {
    const country = getCountryCode(city);
    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&what=graduate&where=${city}&results_per_page=5`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          const jobs = result.results || [];
          const earlyCareerJobs = jobs.filter(job => {
            const text = `${job.title} ${job.description}`.toLowerCase();
            return text.includes('graduate') || text.includes('junior') || text.includes('entry') || text.includes('trainee');
          });
          
          totalJobs += jobs.length;
          totalEarlyCareer += earlyCareerJobs.length;
          
          const cityResult = {
            city,
            country,
            total: jobs.length,
            earlyCareer: earlyCareerJobs.length,
            sample: earlyCareerJobs.length > 0 ? earlyCareerJobs[0].title : 'None'
          };
          
          results.push(cityResult);
          
          console.log(`✅ ${city} (${country}): ${jobs.length} total, ${earlyCareerJobs.length} early-career`);
          if (earlyCareerJobs.length > 0) {
            console.log(`   🎯 Sample: ${earlyCareerJobs[0].title}`);
          }
          
        } catch (error) {
          console.log(`❌ ${city}: Failed to parse response`);
          results.push({ city, country: getCountryCode(city), total: 0, earlyCareer: 0, sample: 'Error' });
        }
        
        completed++;
        if (completed === cities.length) {
          showFinalResults();
        }
      });
    }).on('error', (error) => {
      console.log(`❌ ${city}: Request failed`);
      results.push({ city, country: getCountryCode(city), total: 0, earlyCareer: 0, sample: 'Failed' });
      completed++;
      if (completed === cities.length) {
        showFinalResults();
      }
    });
  });
  
  function getCountryCode(city) {
    const countryMap = {
      'London': 'gb', 'Madrid': 'es', 'Berlin': 'de', 'Barcelona': 'es', 'Amsterdam': 'nl',
      'Dublin': 'ie', 'Munich': 'de', 'Stockholm': 'se', 'Copenhagen': 'dk', 'Zurich': 'ch', 'Vienna': 'at', 'Paris': 'fr'
    };
    return countryMap[city] || 'gb';
  }
  
  function showFinalResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 EXPANDED CITY COVERAGE RESULTS!');
    console.log('='.repeat(60));
    
    console.log(`📊 Total Jobs Found: ${totalJobs}`);
    console.log(`🎯 Early-Career Jobs: ${totalEarlyCareer}`);
    console.log(`🏙️ Cities Tested: ${cities.length}`);
    console.log(`📈 Success Rate: ${((totalEarlyCareer / totalJobs) * 100).toFixed(1)}%`);
    
    console.log('\n🏆 Top Cities by Early-Career Jobs:');
    results
      .sort((a, b) => b.earlyCareer - a.earlyCareer)
      .slice(0, 5)
      .forEach((result, i) => {
        console.log(`   ${i + 1}. ${result.city} (${result.country}): ${result.earlyCareer} jobs`);
      });
    
    console.log('\n✅ Expanded city coverage test completed!');
  }
});
