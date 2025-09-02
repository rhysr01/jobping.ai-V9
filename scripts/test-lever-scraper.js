#!/usr/bin/env node

/**
 * Test Lever Scraper with Spotify and Plaid
 * 
 * This script tests the Lever scraper with the companies we discovered
 * to ensure they work properly.
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Test companies from our discovery
const TEST_COMPANIES = [
  {
    name: 'Spotify',
    url: 'https://jobs.lever.co/spotify',
    platform: 'lever'
  },
  {
    name: 'Plaid',
    url: 'https://jobs.lever.co/plaid',
    platform: 'lever'
  }
];

async function testLeverCompany(company) {
  console.log(`\n🔍 Testing ${company.name} (${company.url})`);
  
  try {
    const startTime = Date.now();
    
    // Test URL accessibility
    const response = await axios.get(company.url, {
      headers: {
        'User-Agent': 'JobPing/1.0 (Graduate Job Discovery Tool)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      timeout: 10000
    });

    const responseTime = Date.now() - startTime;
    console.log(`✅ ${company.name}: Accessible (${responseTime}ms)`);

    // Parse HTML and look for job postings
    const $ = cheerio.load(response.data);
    
    // Try multiple selectors for different Lever layouts
    const jobSelectors = [
      '.posting',                    // Standard Lever
      '.job-posting',               // Alternative layout
      '.position',                  // Custom layout
      '[data-qa="posting"]',        // Data attribute
      '.careers-posting',           // Corporate site
      '.job-item',                  // Simple layout
    ];
    
    let jobElements = $();
    let usedSelector = '';
    
    for (const selector of jobSelectors) {
      jobElements = $(selector);
      if (jobElements.length > 0) {
        usedSelector = selector;
        break;
      }
    }

    console.log(`📊 ${company.name}: Found ${jobElements.length} jobs using selector: ${usedSelector}`);

    if (jobElements.length > 0) {
      // Extract sample job titles
      const sampleTitles = [];
      const graduateKeywords = ['graduate', 'junior', 'entry', 'associate', 'intern', 'trainee', 'new grad', 'early career'];
      
      jobElements.slice(0, 5).each((i, el) => {
        const title = $(el).find('.posting-title > h5, .posting-title h4, .posting-title h3').text().trim();
        if (title) {
          sampleTitles.push(title);
          
          // Check for graduate keywords
          const hasGraduateKeyword = graduateKeywords.some(keyword => 
            title.toLowerCase().includes(keyword)
          );
          
          if (hasGraduateKeyword) {
            console.log(`🎯 ${company.name}: Found graduate job: "${title}"`);
          }
        }
      });

      console.log(`📝 ${company.name}: Sample titles:`, sampleTitles.slice(0, 3));
      
      // Check for European locations
      const europeanLocations = ['london', 'dublin', 'amsterdam', 'berlin', 'paris', 'stockholm', 'copenhagen', 'oslo', 'helsinki', 'zurich', 'munich', 'frankfurt', 'madrid', 'barcelona', 'milan', 'rome', 'vienna', 'brussels'];
      const pageText = response.data.toLowerCase();
      const foundLocations = europeanLocations.filter(location => pageText.includes(location));
      
      if (foundLocations.length > 0) {
        console.log(`🌍 ${company.name}: European locations found: ${foundLocations.join(', ')}`);
      }
      
      return {
        success: true,
        jobCount: jobElements.length,
        sampleTitles,
        europeanLocations: foundLocations,
        responseTime
      };
    } else {
      console.log(`⚠️ ${company.name}: No jobs found with any selector`);
      return {
        success: false,
        error: 'No jobs found'
      };
    }
    
  } catch (error) {
    console.log(`❌ ${company.name}: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🚀 Testing Lever Scraper with Discovered Companies\n');
  console.log('='.repeat(60));
  
  const results = [];
  
  for (const company of TEST_COMPANIES) {
    const result = await testLeverCompany(company);
    results.push({
      company: company.name,
      ...result
    });
    
    // Rate limiting between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n🎯 WORKING COMPANIES:');
    successful.forEach(result => {
      console.log(`   ${result.company}: ${result.jobCount} jobs`);
      if (result.europeanLocations.length > 0) {
        console.log(`      European locations: ${result.europeanLocations.join(', ')}`);
      }
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ FAILED COMPANIES:');
    failed.forEach(result => {
      console.log(`   ${result.company}: ${result.error}`);
    });
  }
  
  console.log('\n💡 RECOMMENDATION:');
  if (successful.length > 0) {
    console.log('   ✅ These companies are ready to be added to your Lever scraper!');
    console.log('   📝 Update your graduateEmployers.ts with the working companies.');
  } else {
    console.log('   ⚠️ No companies are working. Check the URLs and try again.');
  }
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testLeverCompany, runTests };
