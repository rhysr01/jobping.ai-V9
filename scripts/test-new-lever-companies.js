#!/usr/bin/env node

/**
 * Test New Lever Companies
 * 
 * This script tests the newly added Lever companies to see what jobs are available.
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Test a selection of the new companies we added
const NEW_COMPANIES = [
  { name: 'Mistral AI', slug: 'mistral' },
  { name: 'Palantir Technologies', slug: 'palantir' },
  { name: 'Octopus Energy Group', slug: 'octopusenergy' },
  { name: 'Qonto', slug: 'qonto' },
  { name: 'Vestiaire Collective', slug: 'vestiairecollective' },
  { name: 'Neko Health', slug: 'nekohealth' },
  { name: 'Pigment', slug: 'pigment' },
  { name: 'BlaBlaCar', slug: 'blablacar' },
  { name: 'Contentsquare', slug: 'contentsquare' },
  { name: 'Bloom & Wild Group', slug: 'bloomandwild' },
  { name: 'Netlight', slug: 'netlight' },
  { name: 'MoonPay', slug: 'moonpay' },
  { name: 'Pipedrive', slug: 'pipedrive' },
  { name: 'Trustly', slug: 'trustly' },
  { name: 'ANYbotics', slug: 'anybotics' },
  { name: 'Lodgify', slug: 'lodgify' },
  { name: 'CARTO', slug: 'carto' },
  { name: 'FINN', slug: 'finn' }
];

// Graduate-friendly keywords to look for
const GRADUATE_KEYWORDS = [
  'graduate', 'junior', 'entry', 'associate', 'intern', 'trainee',
  'new grad', 'recent graduate', 'early career', 'entry level',
  'student', 'apprentice', 'residency', 'fellowship'
];

// European locations to check for
const EUROPEAN_LOCATIONS = [
  'london', 'dublin', 'amsterdam', 'berlin', 'paris', 'stockholm',
  'copenhagen', 'oslo', 'helsinki', 'zurich', 'munich', 'frankfurt',
  'madrid', 'barcelona', 'milan', 'rome', 'vienna', 'brussels'
];

class NewLeverCompanyTester {
  constructor() {
    this.results = [];
    this.userAgent = 'JobPing/1.0 (Graduate Job Discovery Tool)';
  }

  async testCompany(company) {
    const url = `https://jobs.lever.co/${company.slug}`;
    console.log(`🔍 Testing ${company.name} (${url})`);
    
    try {
      const result = {
        name: company.name,
        slug: company.slug,
        url: url,
        accessible: false,
        jobCount: 0,
        hasGraduateJobs: false,
        hasEuropeanJobs: false,
        graduateKeywords: [],
        europeanLocations: [],
        error: null,
        responseTime: 0,
        sampleTitles: []
      };

      const startTime = Date.now();
      
      // Test accessibility
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 10000
      });

      result.responseTime = Date.now() - startTime;
      result.accessible = true;

      // Parse HTML
      const $ = cheerio.load(response.data);
      
      // Count jobs (try different selectors)
      const selectors = ['.posting', '.posting-title', '.job-posting', '.job-listing', '.position'];
      let jobCount = 0;
      let usedSelector = '';
      
      for (const selector of selectors) {
        const jobs = $(selector);
        if (jobs.length > 0) {
          jobCount = jobs.length;
          usedSelector = selector;
          break;
        }
      }
      
      result.jobCount = jobCount;
      
      if (jobCount > 0) {
        console.log(`✅ ${company.name}: Accessible (${result.responseTime}ms)`);
        console.log(`📊 ${company.name}: Found ${jobCount} jobs using selector: ${usedSelector}`);
        
        // Get sample job titles
        const titles = [];
        $(usedSelector).slice(0, 5).each((i, el) => {
          const title = $(el).find('h5, h4, .posting-title, .job-title').first().text().trim();
          if (title) titles.push(title);
        });
        result.sampleTitles = titles;
        
        if (titles.length > 0) {
          console.log(`📝 ${company.name}: Sample titles: [${titles.join(', ')}]`);
        }
        
        // Check for graduate-friendly keywords
        const html = response.data.toLowerCase();
        const foundKeywords = GRADUATE_KEYWORDS.filter(keyword => 
          html.includes(keyword.toLowerCase())
        );
        result.graduateKeywords = foundKeywords;
        result.hasGraduateJobs = foundKeywords.length > 0;
        
        if (foundKeywords.length > 0) {
          console.log(`🎯 ${company.name}: Found graduate keywords: ${foundKeywords.join(', ')}`);
        }
        
        // Check for European locations
        const foundLocations = EUROPEAN_LOCATIONS.filter(location => 
          html.includes(location.toLowerCase())
        );
        result.europeanLocations = foundLocations;
        result.hasEuropeanJobs = foundLocations.length > 0;
        
        if (foundLocations.length > 0) {
          console.log(`🌍 ${company.name}: European locations found: ${foundLocations.join(', ')}`);
        }
        
      } else {
        console.log(`⚠️ ${company.name}: No jobs found (may need different selector)`);
      }
      
      this.results.push(result);
      
    } catch (error) {
      console.log(`❌ ${company.name}: Error - ${error.message}`);
      this.results.push({
        name: company.name,
        slug: company.slug,
        url: url,
        accessible: false,
        jobCount: 0,
        hasGraduateJobs: false,
        hasEuropeanJobs: false,
        graduateKeywords: [],
        europeanLocations: [],
        error: error.message,
        responseTime: 0,
        sampleTitles: []
      });
    }
    
    console.log(''); // Empty line for readability
  }

  async runTests() {
    console.log('🚀 Testing New Lever Companies\n');
    console.log('==========================================================');
    console.log('==\n');
    
    for (const company of NEW_COMPANIES) {
      await this.testCompany(company);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.printSummary();
  }

  printSummary() {
    console.log('📊 TEST SUMMARY');
    console.log('==========================================================');
    console.log('==\n');
    
    const successful = this.results.filter(r => r.accessible && r.jobCount > 0).length;
    const failed = this.results.filter(r => !r.accessible || r.jobCount === 0).length;
    
    console.log(`✅ Successful: ${successful}/${this.results.length}`);
    console.log(`❌ Failed: ${failed}/${this.results.length}\n`);
    
    if (successful > 0) {
      console.log('🎯 WORKING COMPANIES:');
      this.results
        .filter(r => r.accessible && r.jobCount > 0)
        .forEach(company => {
          console.log(`   ${company.name}: ${company.jobCount} jobs`);
          if (company.europeanLocations.length > 0) {
            console.log(`      European locations: ${company.europeanLocations.join(', ')}`);
          }
          if (company.graduateKeywords.length > 0) {
            console.log(`      Graduate keywords: ${company.graduateKeywords.join(', ')}`);
          }
          console.log('');
        });
    }
    
    if (failed > 0) {
      console.log('❌ FAILED COMPANIES:');
      this.results
        .filter(r => !r.accessible || r.jobCount === 0)
        .forEach(company => {
          console.log(`   ${company.name}: ${company.error || 'No jobs found'}`);
        });
      console.log('');
    }
    
    console.log('💡 RECOMMENDATION:');
    if (successful > 0) {
      console.log(`   ✅ ${successful} companies are working and ready for scraping!`);
    }
    if (failed > 0) {
      console.log(`   ⚠️ ${failed} companies may need URL adjustments or different selectors.`);
    }
  }
}

// Run the tests
const tester = new NewLeverCompanyTester();
tester.runTests().catch(console.error);
