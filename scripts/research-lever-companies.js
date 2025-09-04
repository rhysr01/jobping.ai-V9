#!/usr/bin/env node

/**
 * Lever Company Research Script
 * Analyzes which companies actually have European graduate jobs
 * Focuses on companies with physical European offices and early-career programs
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const axios = require('axios');
const cheerio = require('cheerio');

// Companies most likely to have European graduate jobs
const TARGET_COMPANIES = [
  // UK Companies (High Probability)
  { name: 'Revolut', slug: 'revolut', priority: 'high', expectedJobs: 'UK graduate programs' },
  { name: 'Monzo', slug: 'monzo', priority: 'high', expectedJobs: 'UK graduate programs' },
  { name: 'Deliveroo', slug: 'deliveroo', priority: 'high', expectedJobs: 'UK graduate programs' },
  { name: 'Just Eat', slug: 'justeat', priority: 'high', expectedJobs: 'UK graduate programs' },
  { name: 'Wise', slug: 'wise', priority: 'high', expectedJobs: 'UK graduate programs' },
  { name: 'OakNorth', slug: 'oaknorth', priority: 'high', expectedJobs: 'UK graduate programs' },
  
  // European Tech Companies (High Probability)
  { name: 'Klarna', slug: 'klarna', priority: 'high', expectedJobs: 'Swedish graduate programs' },
  { name: 'Spotify', slug: 'spotify', priority: 'high', expectedJobs: 'Swedish graduate programs' },
  { name: 'Bolt', slug: 'bolt', priority: 'high', expectedJobs: 'Estonian graduate programs' },
  { name: 'TransferWise', slug: 'transferwise', priority: 'high', expectedJobs: 'UK graduate programs' },
  { name: 'Adyen', slug: 'adyen', priority: 'high', expectedJobs: 'Dutch graduate programs' },
  { name: 'Mollie', slug: 'mollie', priority: 'high', expectedJobs: 'Dutch graduate programs' },
  
  // European Unicorns (Medium-High Probability)
  { name: 'N26', slug: 'n26', priority: 'medium-high', expectedJobs: 'German graduate programs' },
  { name: 'GetYourGuide', slug: 'getyourguide', priority: 'medium-high', expectedJobs: 'German graduate programs' },
  { name: 'HelloFresh', slug: 'hellofresh', priority: 'medium-high', expectedJobs: 'German graduate programs' },
  { name: 'Zalando', slug: 'zalando', priority: 'medium-high', expectedJobs: 'German graduate programs' },
  { name: 'Delivery Hero', slug: 'deliveryhero', priority: 'medium-high', expectedJobs: 'German graduate programs' },
  
  // European SaaS Companies (Medium Probability)
  { name: 'Typeform', slug: 'typeform', priority: 'medium', expectedJobs: 'Spanish graduate programs' },
  { name: 'Airtable', slug: 'airtable', priority: 'medium', expectedJobs: 'UK office graduate programs' },
  { name: 'Notion', slug: 'notion', priority: 'medium', expectedJobs: 'UK office graduate programs' },
  { name: 'Figma', slug: 'figma', priority: 'medium', expectedJobs: 'UK office graduate programs' },
  
  // European Fintech (High Probability)
  { name: 'Checkout.com', slug: 'checkout', priority: 'high', expectedJobs: 'UK graduate programs' },
  { name: 'GoCardless', slug: 'gocardless', priority: 'high', expectedJobs: 'UK graduate programs' },
  { name: 'SumUp', slug: 'sumup', priority: 'high', expectedJobs: 'UK graduate programs' },
  { name: 'Rapyd', slug: 'rapyd', priority: 'high', expectedJobs: 'UK graduate programs' },
  
  // European Gaming (Medium Probability)
  { name: 'King', slug: 'king', priority: 'medium', expectedJobs: 'Swedish graduate programs' },
  { name: 'Mojang', slug: 'mojang', priority: 'medium', expectedJobs: 'Swedish graduate programs' },
  { name: 'Paradox Interactive', slug: 'paradoxinteractive', priority: 'medium', expectedJobs: 'Swedish graduate programs' },
  
  // European E-commerce (Medium Probability)
  { name: 'Farfetch', slug: 'farfetch', priority: 'medium', expectedJobs: 'UK graduate programs' },
  { name: 'Boohoo', slug: 'boohoo', priority: 'medium', expectedJobs: 'UK graduate programs' },
  { name: 'ASOS', slug: 'asos', priority: 'medium', expectedJobs: 'UK graduate programs' }
];

// Graduate job keywords
const GRADUATE_KEYWORDS = [
  'graduate', 'junior', 'entry', 'associate', 'intern', 'trainee',
  'new grad', 'recent graduate', 'early career', 'entry level',
  'student', 'apprentice', 'residency', 'fellowship'
];

// European locations
const EUROPEAN_LOCATIONS = [
  'london', 'uk', 'england', 'dublin', 'ireland', 'amsterdam', 'netherlands',
  'berlin', 'germany', 'paris', 'france', 'madrid', 'spain', 'barcelona',
  'milan', 'italy', 'rome', 'zurich', 'switzerland', 'stockholm', 'sweden',
  'oslo', 'norway', 'copenhagen', 'denmark', 'helsinki', 'finland'
];

class LeverCompanyResearcher {
  constructor() {
    this.results = [];
    this.userAgent = 'JobPing/1.0 (Graduate Job Research Tool)';
  }

  async researchCompany(company) {
    const url = `https://jobs.lever.co/${company.slug}`;
    console.log(`🔍 Researching ${company.name} (${url})`);
    
    try {
      const result = {
        name: company.name,
        slug: company.slug,
        url: url,
        priority: company.priority,
        expectedJobs: company.expectedJobs,
        accessible: false,
        totalJobs: 0,
        graduateJobs: 0,
        europeanJobs: 0,
        targetJobs: 0,
        sampleTitles: [],
        sampleLocations: [],
        hasGraduateProgram: false,
        hasEuropeanOffice: false,
        error: null
      };

      const startTime = Date.now();
      
      // Test URL accessibility
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        timeout: 10000
      });

      result.accessible = response.status === 200;

      if (result.accessible) {
        const $ = cheerio.load(response.data);
        
        // Count total job postings
        const jobElements = $('.posting, .job-posting, .position, [data-qa="posting"]');
        result.totalJobs = jobElements.length;

        if (result.totalJobs > 0) {
          // Extract job titles and locations
          const jobTitles = [];
          const jobLocations = [];
          
          jobElements.each((i, el) => {
            const title = $(el).find('h5, .posting-title, .job-title').text().toLowerCase().trim();
            const location = $(el).find('.posting-category, .location, .job-location').text().toLowerCase().trim();
            
            if (title) jobTitles.push(title);
            if (location) jobLocations.push(location);
          });

          // Count graduate jobs
          result.graduateJobs = jobTitles.filter(title => 
            GRADUATE_KEYWORDS.some(keyword => title.includes(keyword))
          ).length;

          // Count European jobs
          result.europeanJobs = jobLocations.filter(location => 
            EUROPEAN_LOCATIONS.some(european => location.includes(european))
          ).length;

          // Count target jobs (graduate + European)
          result.targetJobs = jobTitles.filter((title, index) => {
            const isGraduate = GRADUATE_KEYWORDS.some(keyword => title.includes(keyword));
            const location = jobLocations[index] || '';
            const isEuropean = EUROPEAN_LOCATIONS.some(european => location.includes(european));
            return isGraduate && isEuropean;
          }).length;

          // Sample data
          result.sampleTitles = jobTitles.slice(0, 5);
          result.sampleLocations = jobLocations.slice(0, 5);

          // Determine if company has what we want
          result.hasGraduateProgram = result.graduateJobs > 0;
          result.hasEuropeanOffice = result.europeanJobs > 0;

          console.log(`✅ ${company.name}: ${result.totalJobs} total, ${result.graduateJobs} graduate, ${result.europeanJobs} European, ${result.targetJobs} target jobs`);
        }
      }

      this.results.push(result);
      
      // Rate limiting
      await this.sleep(1000 + Math.random() * 2000);
      
    } catch (error) {
      console.log(`❌ ${company.name}: ${error.message}`);
      this.results.push({
        name: company.name,
        slug: company.slug,
        url: url,
        priority: company.priority,
        expectedJobs: company.expectedJobs,
        accessible: false,
        totalJobs: 0,
        graduateJobs: 0,
        europeanJobs: 0,
        targetJobs: 0,
        sampleTitles: [],
        sampleLocations: [],
        hasGraduateProgram: false,
        hasEuropeanOffice: false,
        error: error.message
      });
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async researchAllCompanies() {
    console.log(`🚀 Researching ${TARGET_COMPANIES.length} Lever companies for European graduate jobs...\n`);
    
    for (const company of TARGET_COMPANIES) {
      await this.researchCompany(company);
    }
    
    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 RESEARCH REPORT\n');
    console.log('='.repeat(80));

    // Summary
    const accessible = this.results.filter(r => r.accessible);
    const withGraduateJobs = this.results.filter(r => r.hasGraduateProgram);
    const withEuropeanOffice = this.results.filter(r => r.hasEuropeanOffice);
    const withTargetJobs = this.results.filter(r => r.targetJobs > 0);
    
    console.log(`📈 SUMMARY:`);
    console.log(`   Total companies researched: ${this.results.length}`);
    console.log(`   Accessible URLs: ${accessible.length}`);
    console.log(`   Companies with graduate jobs: ${withGraduateJobs.length}`);
    console.log(`   Companies with European offices: ${withEuropeanOffice.length}`);
    console.log(`   Companies with target jobs: ${withTargetJobs.length}`);
    console.log('');

    // High-priority recommendations
    const highPriority = this.results.filter(r => 
      r.priority === 'high' && r.targetJobs > 0
    );
    
    if (highPriority.length > 0) {
      console.log('🎯 HIGH-PRIORITY COMPANIES (High probability + Target jobs):');
      highPriority.forEach(company => {
        console.log(`   ✅ ${company.name}: ${company.targetJobs} target jobs`);
        console.log(`      Sample: ${company.sampleTitles.slice(0, 2).join(', ')}`);
      });
      console.log('');
    }

    // Medium-priority with target jobs
    const mediumWithTarget = this.results.filter(r => 
      r.priority === 'medium' && r.targetJobs > 0
    );
    
    if (mediumWithTarget.length > 0) {
      console.log('📊 MEDIUM-PRIORITY COMPANIES (Medium probability + Target jobs):');
      mediumWithTarget.forEach(company => {
        console.log(`   ✅ ${company.name}: ${company.targetJobs} target jobs`);
        console.log(`      Sample: ${company.sampleTitles.slice(0, 2).join(', ')}`);
      });
      console.log('');
    }

    // Companies to avoid
    const noTargetJobs = this.results.filter(r => r.accessible && r.targetJobs === 0);
    
    if (noTargetJobs.length > 0) {
      console.log('🚫 COMPANIES TO AVOID (No target jobs found):');
      noTargetJobs.forEach(company => {
        console.log(`   ❌ ${company.name}: ${company.totalJobs} total jobs, but 0 target jobs`);
      });
      console.log('');
    }

    // Recommendations
    console.log('💡 RECOMMENDATIONS:');
    console.log(`   1. Focus on high-priority companies: ${highPriority.length} companies`);
    console.log(`   2. Consider medium-priority with target jobs: ${mediumWithTarget.length} companies`);
    console.log(`   3. Avoid companies with no target jobs: ${noTargetJobs.length} companies`);
    console.log(`   4. Total recommended companies: ${highPriority.length + mediumWithTarget.length}`);
  }
}

// Main execution
async function main() {
  const researcher = new LeverCompanyResearcher();
  await researcher.researchAllCompanies();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Research failed:', error.message);
    process.exit(1);
  });
}

module.exports = { LeverCompanyResearcher, TARGET_COMPANIES };
