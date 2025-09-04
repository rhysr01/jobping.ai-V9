#!/usr/bin/env node

/**
 * Greenhouse Board Research Script
 * Finds companies that actually use Greenhouse and have European graduate jobs
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const axios = require('axios');

// Companies that commonly use Greenhouse (based on research)
const POTENTIAL_BOARDS = [
  // High Probability (Known Greenhouse users)
  'palantir', 'stripe', 'airbnb', 'uber', 'lyft', 'robinhood', 'coinbase',
  'square', 'shopify', 'slack', 'zoom', 'dropbox', 'asana', 'monday',
  'clickup', 'miro', 'canva', 'webflow', 'framer', 'bubble', 'zapier',
  
  // European Companies
  'revolut', 'monzo', 'deliveroo', 'justeat', 'wise', 'oaknorth',
  'klarna', 'bolt', 'adyen', 'mollie', 'n26', 'getyourguide',
  'hellofresh', 'zalando', 'deliveryhero', 'typeform', 'farfetch',
  'boohoo', 'asos', 'king', 'mojang', 'paradoxinteractive',
  
  // Tech Giants
  'google', 'microsoft', 'amazon', 'meta', 'apple', 'netflix',
  'twitter', 'linkedin', 'salesforce', 'oracle', 'ibm', 'intel',
  
  // Additional Companies
  'spotify', 'checkoutcom', 'sumup', 'notion', 'figma', 'linear',
  'airtable', 'calendly', 'loom', 'brex', 'deel', 'remote',
  'gitlab', 'hashicorp', 'vercel', 'anthropic', 'huggingface',
  'scale', 'retool', 'supabase'
];

const BASE = "https://boards-api.greenhouse.io/v1/boards";

class GreenhouseBoardResearcher {
  constructor() {
    this.results = [];
    this.userAgent = 'JobPing/1.0 (Greenhouse Board Research Tool)';
  }

  async verifyBoard(board) {
    const urls = [
      `${BASE}/${board}/departments`,
      `${BASE}/${board}/jobs`
    ];
    
    for (const url of urls) {
      try {
        const response = await axios.get(url, { 
          timeout: 8000, 
          headers: { "Accept": "application/json" },
          validateStatus: s => s === 200 || s === 404
        });
        
        if (response.status === 200) {
          return true;
        }
      } catch (error) {
        // Ignore errors, continue to next URL
      }
      
      // Small delay between attempts
      await this.sleep(200);
    }
    
    return false;
  }

  async checkBoardJobs(board) {
    try {
      const url = `${BASE}/${board}/jobs`;
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          "User-Agent": this.userAgent,
          "Accept": "application/json"
        },
        validateStatus: s => s === 200 || s === 404
      });
      
      if (response.status === 404) {
        return { exists: false, jobCount: 0 };
      }
      
      const jobs = response.data?.jobs || [];
      return { exists: true, jobCount: jobs.length };
      
    } catch (error) {
      return { exists: false, jobCount: 0, error: error.message };
    }
  }

  async researchBoard(board) {
    console.log(`🔍 Researching ${board}...`);
    
    try {
      const exists = await this.verifyBoard(board);
      
      if (!exists) {
        console.log(`❌ ${board}: Board not found`);
        this.results.push({
          board,
          exists: false,
          jobCount: 0,
          status: 'not_found'
        });
        return;
      }
      
      const jobInfo = await this.checkBoardJobs(board);
      
      if (jobInfo.exists) {
        console.log(`✅ ${board}: ${jobInfo.jobCount} jobs found`);
        this.results.push({
          board,
          exists: true,
          jobCount: jobInfo.jobCount,
          status: 'working'
        });
      } else {
        console.log(`⚠️ ${board}: Board exists but no jobs`);
        this.results.push({
          board,
          exists: true,
          jobCount: 0,
          status: 'no_jobs'
        });
      }
      
    } catch (error) {
      console.log(`❌ ${board}: ${error.message}`);
      this.results.push({
        board,
        exists: false,
        jobCount: 0,
        status: 'error',
        error: error.message
      });
    }
    
    // Rate limiting
    await this.sleep(500 + Math.random() * 1000);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async researchAllBoards() {
    console.log(`🚀 Researching ${POTENTIAL_BOARDS.length} potential Greenhouse boards...\n`);
    
    for (const board of POTENTIAL_BOARDS) {
      await this.researchBoard(board);
    }
    
    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 GREENHOUSE BOARD RESEARCH REPORT\n');
    console.log('='.repeat(80));

    // Summary
    const working = this.results.filter(r => r.status === 'working');
    const noJobs = this.results.filter(r => r.status === 'no_jobs');
    const notFound = this.results.filter(r => r.status === 'not_found');
    const errors = this.results.filter(r => r.status === 'error');
    
    console.log(`📈 SUMMARY:`);
    console.log(`   Total boards researched: ${this.results.length}`);
    console.log(`   Working boards: ${working.length}`);
    console.log(`   Boards with no jobs: ${noJobs.length}`);
    console.log(`   Boards not found: ${notFound.length}`);
    console.log(`   Errors: ${errors.length}`);
    console.log('');

    // Working boards (recommended)
    if (working.length > 0) {
      console.log('✅ WORKING BOARDS (Recommended for scraping):');
      working.forEach(board => {
        console.log(`   • ${board.board}: ${board.jobCount} jobs`);
      });
      console.log('');
    }

    // Boards with no jobs
    if (noJobs.length > 0) {
      console.log('⚠️ BOARDS WITH NO JOBS (Skip these):');
      noJobs.forEach(board => {
        console.log(`   • ${board.board}: Board exists but empty`);
      });
      console.log('');
    }

    // Boards not found
    if (notFound.length > 0) {
      console.log('❌ BOARDS NOT FOUND (Don\'t use these):');
      notFound.forEach(board => {
        console.log(`   • ${board.board}: 404 - Board doesn't exist`);
      });
      console.log('');
    }

    // Recommendations
    console.log('💡 RECOMMENDATIONS:');
    console.log(`   1. Focus on working boards: ${working.length} companies`);
    console.log(`   2. Skip boards with no jobs: ${noJobs.length} companies`);
    console.log(`   3. Avoid non-existent boards: ${notFound.length} companies`);
    console.log(`   4. Total usable boards: ${working.length}`);
    
    if (working.length > 0) {
      console.log('\n🎯 NEXT STEPS:');
      console.log('   Update your Greenhouse runner with these working boards:');
      working.forEach(board => {
        console.log(`   "${board.board}",`);
      });
    }
  }
}

// Main execution
async function main() {
  const researcher = new GreenhouseBoardResearcher();
  await researcher.researchAllBoards();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Research failed:', error.message);
    process.exit(1);
  });
}

module.exports = { GreenhouseBoardResearcher, POTENTIAL_BOARDS };
