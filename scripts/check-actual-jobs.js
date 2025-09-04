#!/usr/bin/env node

/**
 * Check Actual Jobs in Database
 * Examine real jobs to see what's actually stored
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Configuration
const CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  sampleSize: 20
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

class JobChecker {
  constructor() {
    this.supabase = null;
  }

  async initialize() {
    log('🚀 Initializing Job Checker...', 'blue');
    
    if (!CONFIG.supabaseUrl || !CONFIG.serviceRoleKey) {
      throw new Error('❌ Missing required environment variables');
    }
    
    this.supabase = createClient(CONFIG.supabaseUrl, CONFIG.serviceRoleKey);
    log('✅ Supabase client initialized', 'green');
  }

  async getJobCount() {
    try {
      const { count, error } = await this.supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count;
    } catch (error) {
      throw new Error(`Failed to get job count: ${error.message}`);
    }
  }

  async getSampleJobs() {
    try {
      const { data, error } = await this.supabase
        .from('jobs')
        .select('id, title, company, location, description, categories, work_environment, experience_required')
        .limit(CONFIG.sampleSize);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch sample jobs: ${error.message}`);
    }
  }

  analyzeJob(job) {
    const text = `${job.title || ''} ${job.company || ''} ${job.location || ''}`.toLowerCase();
    
    // Check for obvious USA indicators
    const usaIndicators = [
      'united states', 'usa', 'us', 'america', 'american',
      'new york', 'ny', 'nyc', 'los angeles', 'la', 'california', 'ca',
      'chicago', 'illinois', 'il', 'houston', 'texas', 'tx',
      'miami', 'florida', 'fl', 'atlanta', 'georgia', 'ga'
    ];
    
    // Check for obvious European indicators
    const europeanIndicators = [
      'london', 'uk', 'england', 'berlin', 'germany', 'de',
      'paris', 'france', 'madrid', 'spain', 'es', 'barcelona',
      'amsterdam', 'netherlands', 'nl', 'dublin', 'ireland', 'ie',
      'zurich', 'switzerland', 'ch', 'milan', 'rome', 'italy', 'it'
    ];
    
    let isUSA = false;
    let isEuropean = false;
    let usaReason = '';
    let europeanReason = '';
    
    // Check USA indicators
    for (const indicator of usaIndicators) {
      if (text.includes(indicator)) {
        isUSA = true;
        usaReason = indicator;
        break;
      }
    }
    
    // Check European indicators
    for (const indicator of europeanIndicators) {
      if (text.includes(indicator)) {
        isEuropean = true;
        europeanReason = indicator;
        break;
      }
    }
    
    return {
      isUSA,
      isEuropean,
      usaReason,
      europeanReason,
      location: job.location || 'No location',
      title: job.title || 'No title',
      company: job.company || 'No company'
    };
  }

  async run() {
    try {
      await this.initialize();
      
      // Get total job count
      const totalJobs = await this.getJobCount();
      log(`📊 Total jobs in database: ${totalJobs}`, 'cyan');
      
      // Get sample jobs
      const sampleJobs = await this.getSampleJobs();
      log(`🔍 Analyzing ${sampleJobs.length} sample jobs...`, 'blue');
      
      log('\n📋 Sample Job Analysis:', 'cyan');
      log('─'.repeat(80), 'cyan');
      
      let usaCount = 0;
      let europeanCount = 0;
      let unclearCount = 0;
      
      for (let i = 0; i < sampleJobs.length; i++) {
        const job = sampleJobs[i];
        const analysis = this.analyzeJob(job);
        
        // Count by type
        if (analysis.isUSA) {
          usaCount++;
        } else if (analysis.isEuropean) {
          europeanCount++;
        } else {
          unclearCount++;
        }
        
        // Display job info
        log(`\n${i + 1}. ${analysis.title}`, 'bright');
        log(`   Company: ${analysis.company}`, 'cyan');
        log(`   Location: ${analysis.location}`, 'cyan');
        
        if (analysis.isUSA) {
          log(`   🇺🇸 USA Job (${analysis.usaReason})`, 'red');
        } else if (analysis.isEuropean) {
          log(`   🇪🇺 European Job (${analysis.europeanReason})`, 'green');
        } else {
          log(`   ❓ Unclear location`, 'yellow');
        }
        
        // Show categories if available
        if (job.categories && job.categories.length > 0) {
          log(`   Categories: ${job.categories.join(', ')}`, 'magenta');
        }
      }
      
      // Summary
      log('\n📊 Sample Analysis Summary:', 'cyan');
      log('─'.repeat(40), 'cyan');
      log(`🇺🇸 USA jobs: ${usaCount}`, 'red');
      log(`🇪🇺 European jobs: ${europeanCount}`, 'green');
      log(`❓ Unclear: ${unclearCount}`, 'yellow');
      log(`📊 Sample size: ${sampleJobs.length}`, 'cyan');
      
      // Estimate total database composition
      if (totalJobs > 0) {
        const usaPercentage = (usaCount / sampleJobs.length) * 100;
        const europeanPercentage = (europeanCount / sampleJobs.length) * 100;
        const unclearPercentage = (unclearCount / sampleJobs.length) * 100;
        
        log('\n📈 Estimated Database Composition:', 'cyan');
        log(`🇺🇸 USA jobs: ~${Math.round(usaPercentage)}% (${Math.round(totalJobs * usaPercentage / 100)})`, 'red');
        log(`🇪🇺 European jobs: ~${Math.round(europeanPercentage)}% (${Math.round(totalJobs * europeanPercentage / 100)})`, 'green');
        log(`❓ Unclear: ~${Math.round(unclearPercentage)}% (${Math.round(totalJobs * unclearPercentage / 100)})`, 'yellow');
      }
      
      // Recommendations
      log('\n💡 Recommendations:', 'cyan');
      if (usaCount > europeanCount) {
        log('   • Database appears to have many USA jobs', 'yellow');
        log('   • Consider running cleanup script', 'yellow');
      } else if (europeanCount > usaCount) {
        log('   • Database appears to have mostly European jobs', 'green');
        log('   • Cleanup may not be needed', 'green');
      } else {
        log('   • Mixed database - review carefully', 'yellow');
      }
      
    } catch (error) {
      log(`💥 Job check failed: ${error.message}`, 'red');
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const checker = new JobChecker();
  await checker.run();
}

// Run the checker
if (require.main === module) {
  main().catch(error => {
    log(`💥 Unhandled error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { JobChecker };
