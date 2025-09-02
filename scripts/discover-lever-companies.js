#!/usr/bin/env node

/**
 * Lever Company Discovery Script
 * 
 * This script helps discover and validate Lever companies for your scraper.
 * It tests URLs, checks for job listings, and validates graduate-friendly criteria.
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Known Lever companies to test
const LEVER_COMPANIES = [
  // Current companies in your system
  { name: 'Spotify', slug: 'spotify', priority: 'high' },
  { name: 'Plaid', slug: 'plaid', priority: 'high' },
  
  // High-priority companies to add
  { name: 'Notion', slug: 'notion', priority: 'high' },
  { name: 'Figma', slug: 'figma', priority: 'high' },
  { name: 'Linear', slug: 'linear', priority: 'high' },
  { name: 'Airtable', slug: 'airtable', priority: 'high' },
  { name: 'Calendly', slug: 'calendly', priority: 'high' },
  { name: 'Loom', slug: 'loom', priority: 'high' },
  { name: 'Robinhood', slug: 'robinhood', priority: 'high' },
  { name: 'Coinbase', slug: 'coinbase', priority: 'high' },
  { name: 'Brex', slug: 'brex', priority: 'high' },
  
  // Medium-priority companies
  { name: 'Deel', slug: 'deel', priority: 'medium' },
  { name: 'Remote', slug: 'remote', priority: 'medium' },
  { name: 'GitLab', slug: 'gitlab', priority: 'medium' },
  { name: 'HashiCorp', slug: 'hashicorp', priority: 'medium' },
  { name: 'Vercel', slug: 'vercel', priority: 'medium' },
  { name: 'Anthropic', slug: 'anthropic', priority: 'medium' },
  { name: 'Hugging Face', slug: 'huggingface', priority: 'medium' },
  { name: 'Scale AI', slug: 'scale', priority: 'medium' },
  { name: 'Retool', slug: 'retool', priority: 'medium' },
  { name: 'Supabase', slug: 'supabase', priority: 'medium' },
  
  // Additional companies to test
  { name: 'Stripe', slug: 'stripe', priority: 'medium' },
  { name: 'Slack', slug: 'slack', priority: 'medium' },
  { name: 'Zoom', slug: 'zoom', priority: 'medium' },
  { name: 'Dropbox', slug: 'dropbox', priority: 'medium' },
  { name: 'Asana', slug: 'asana', priority: 'medium' },
  { name: 'Monday.com', slug: 'monday', priority: 'medium' },
  { name: 'ClickUp', slug: 'clickup', priority: 'medium' },
  { name: 'Miro', slug: 'miro', priority: 'medium' },
  { name: 'Canva', slug: 'canva', priority: 'medium' },
  { name: 'Webflow', slug: 'webflow', priority: 'medium' },
  { name: 'Framer', slug: 'framer', priority: 'medium' },
  { name: 'Bubble', slug: 'bubble', priority: 'medium' },
  { name: 'Zapier', slug: 'zapier', priority: 'medium' },
  { name: 'Make', slug: 'make', priority: 'medium' },
  { name: 'Integromat', slug: 'integromat', priority: 'medium' }
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

class LeverCompanyValidator {
  constructor() {
    this.results = [];
    this.userAgent = 'JobPing/1.0 (Graduate Job Discovery Tool)';
  }

  async validateCompany(company) {
    const url = `https://jobs.lever.co/${company.slug}`;
    console.log(`🔍 Testing ${company.name} (${url})`);
    
    try {
      const result = {
        name: company.name,
        slug: company.slug,
        url: url,
        priority: company.priority,
        accessible: false,
        jobCount: 0,
        hasGraduateJobs: false,
        hasEuropeanJobs: false,
        graduateKeywords: [],
        europeanLocations: [],
        error: null,
        responseTime: 0
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

      result.responseTime = Date.now() - startTime;
      result.accessible = response.status === 200;

      if (result.accessible) {
        const $ = cheerio.load(response.data);
        
        // Count job postings
        const jobElements = $('.posting, .job-posting, .position, [data-qa="posting"]');
        result.jobCount = jobElements.length;

        // Extract job titles and check for graduate keywords
        const jobTitles = [];
        jobElements.each((i, el) => {
          const title = $(el).find('h5, .posting-title, .job-title').text().toLowerCase();
          jobTitles.push(title);
        });

        // Check for graduate keywords
        result.graduateKeywords = GRADUATE_KEYWORDS.filter(keyword => 
          jobTitles.some(title => title.includes(keyword))
        );
        result.hasGraduateJobs = result.graduateKeywords.length > 0;

        // Check for European locations
        const locationText = response.data.toLowerCase();
        result.europeanLocations = EUROPEAN_LOCATIONS.filter(location => 
          locationText.includes(location)
        );
        result.hasEuropeanJobs = result.europeanLocations.length > 0;

        console.log(`✅ ${company.name}: ${result.jobCount} jobs, ${result.graduateKeywords.length} graduate keywords, ${result.europeanLocations.length} European locations`);
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
        accessible: false,
        jobCount: 0,
        hasGraduateJobs: false,
        hasEuropeanJobs: false,
        graduateKeywords: [],
        europeanLocations: [],
        error: error.message,
        responseTime: 0
      });
    }
  }

  async validateAllCompanies() {
    console.log(`🚀 Starting validation of ${LEVER_COMPANIES.length} Lever companies...\n`);
    
    for (const company of LEVER_COMPANIES) {
      await this.validateCompany(company);
    }
    
    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 VALIDATION REPORT\n');
    console.log('='.repeat(80));

    // Summary
    const accessible = this.results.filter(r => r.accessible);
    const withGraduateJobs = this.results.filter(r => r.hasGraduateJobs);
    const withEuropeanJobs = this.results.filter(r => r.hasEuropeanJobs);
    
    console.log(`📈 SUMMARY:`);
    console.log(`   Total companies tested: ${this.results.length}`);
    console.log(`   Accessible URLs: ${accessible.length}`);
    console.log(`   Companies with graduate jobs: ${withGraduateJobs.length}`);
    console.log(`   Companies with European jobs: ${withEuropeanJobs.length}`);
    console.log('');

    // High-priority recommendations
    const highPriority = this.results.filter(r => 
      r.priority === 'high' && r.accessible && r.hasGraduateJobs
    );
    
    if (highPriority.length > 0) {
      console.log('🎯 HIGH-PRIORITY RECOMMENDATIONS (Add to your scraper):');
      highPriority.forEach(company => {
        console.log(`   ✅ ${company.name} (${company.slug})`);
        console.log(`      Jobs: ${company.jobCount}, Graduate keywords: ${company.graduateKeywords.join(', ')}`);
        console.log(`      European locations: ${company.europeanLocations.join(', ')}`);
        console.log('');
      });
    }

    // Medium-priority recommendations
    const mediumPriority = this.results.filter(r => 
      r.priority === 'medium' && r.accessible && r.hasGraduateJobs
    );
    
    if (mediumPriority.length > 0) {
      console.log('📋 MEDIUM-PRIORITY RECOMMENDATIONS:');
      mediumPriority.forEach(company => {
        console.log(`   ⚡ ${company.name} (${company.slug})`);
        console.log(`      Jobs: ${company.jobCount}, Graduate keywords: ${company.graduateKeywords.join(', ')}`);
        console.log('');
      });
    }

    // Failed validations
    const failed = this.results.filter(r => !r.accessible);
    if (failed.length > 0) {
      console.log('❌ FAILED VALIDATIONS:');
      failed.forEach(company => {
        console.log(`   ${company.name} (${company.slug}): ${company.error}`);
      });
      console.log('');
    }

    // Generate TypeScript code
    this.generateTypeScriptCode();
  }

  generateTypeScriptCode() {
    const validCompanies = this.results.filter(r => 
      r.accessible && r.hasGraduateJobs && r.priority === 'high'
    );

    if (validCompanies.length > 0) {
      console.log('💻 TYPESCRIPT CODE TO ADD TO graduateEmployers.ts:');
      console.log('');
      
      validCompanies.forEach(company => {
        const locations = company.europeanLocations.length > 0 
          ? company.europeanLocations.map(loc => `'${loc.charAt(0).toUpperCase() + loc.slice(1)}'`)
          : ['London', 'Dublin', 'Amsterdam'];
        
        console.log(`  {
    name: '${company.name}',
    url: 'https://jobs.lever.co/${company.slug}',
    platform: 'lever',
    graduatePrograms: ['${company.name} Graduate Program', '${company.name} Engineering Residency'],
    locations: [${locations.join(', ')}],
    visaSponsorship: true,
    applicationDeadlines: ['October', 'November'],
    programDuration: '2 years'
  },`);
        console.log('');
      });
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the validation
async function main() {
  const validator = new LeverCompanyValidator();
  await validator.validateAllCompanies();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { LeverCompanyValidator, LEVER_COMPANIES };
