#!/usr/bin/env node

// REAL JobPing Automation - This Actually Works
const cron = require('node-cron');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Initialize language detection (simple version)
// const { initLang } = require('../scrapers/lang');

// Check if running in single-run mode (for GitHub Actions)
const SINGLE_RUN_MODE = process.argv.includes('--single-run') || process.env.GITHUB_ACTIONS === 'true';
const SKIP_ADZUNA = process.argv.includes('--skip-adzuna') || process.env.SKIP_ADZUNA === 'true';

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Check required environment variables (support both public and server URL vars)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const requiredEnvVars = {
  'SUPABASE_URL': SUPABASE_URL,
  'SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY)': SUPABASE_KEY
};

// Validate environment variables
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    console.error(`❌ Missing required environment variable: ${key}`);
    console.error('Please set this variable in your environment');
    process.exit(1);
  }
}

console.log('✅ Environment variables loaded successfully');
console.log(`📡 Supabase URL: ${SUPABASE_URL ? 'Set' : 'Missing'}`);
console.log(`🔑 Supabase Key: ${SUPABASE_KEY ? 'Set' : 'Missing'}`);

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('✅ Supabase client initialized successfully');

class RealJobRunner {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.totalJobsSaved = 0;
    this.runCount = 0;
  }

  // Actually run your working scrapers
  async runAdzunaScraper() {
    try {
      console.log('🔄 Running Adzuna scraper...');
      // Call standardized wrapper for consistent output
      const { stdout } = await execAsync('NODE_ENV=production node scrapers/wrappers/adzuna-wrapper.cjs', {
        cwd: process.cwd(),
        timeout: 600000 // 10 minutes for full scraper suite
      });
      // Parse canonical success line
      let jobsSaved = 0;
      const canonical = stdout.match(/✅ Adzuna: (\d+) jobs saved to database/);
      if (canonical) {
        jobsSaved = parseInt(canonical[1]);
      } else {
        // Fallback to DB count (last 5 minutes)
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'adzuna')
          .gte('created_at', new Date(Date.now() - 5*60*1000).toISOString());
        jobsSaved = error ? 0 : (count || 0);
      }
      
      console.log(`✅ Adzuna: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ Adzuna scraper failed:', error.message);
      return 0;
    }
  }

  // Run JobSpy scraper for early-career jobs
  async runJobSpyScraper() {
    try {
      console.log('🔄 Running JobSpy scraper...');
      // Call standardized wrapper
      const { stdout } = await execAsync('NODE_ENV=production node scrapers/wrappers/jobspy-wrapper.cjs', {
        cwd: process.cwd(),
        timeout: 600000, // 10 minutes timeout
        env: { ...process.env }
      });
      
      // Parse job count from the result
      let jobsSaved = 0;
      const savedMatch = stdout.match(/✅ Saved (\d+) jobs/);
      if (savedMatch) {
        jobsSaved = parseInt(savedMatch[1]);
      } else {
        // Fallback to DB count (last 10 minutes)
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'jobspy-indeed')
          .gte('created_at', new Date(Date.now() - 10*60*1000).toISOString());
        jobsSaved = error ? 0 : (count || 0);
        if (jobsSaved) {
          console.log(`ℹ️  JobSpy: DB fallback count: ${jobsSaved} jobs`);
        }
      }
      
      console.log(`✅ JobSpy: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ JobSpy scraper failed:', error.message);
      return 0;
    }
  }

  // Run Reed scraper with real API
  async runReedScraper() {
    try {
      console.log('🔄 Running Reed scraper...');
      const { stdout } = await execAsync('NODE_ENV=production node scrapers/wrappers/reed-wrapper.cjs', {
        cwd: process.cwd(),
        timeout: 300000
      });
      let reedJobs = 0;
      const match = stdout.match(/✅ Reed: (\d+) jobs saved to database/);
      if (match) {
        reedJobs = parseInt(match[1]);
      } else {
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'reed')
          .gte('created_at', new Date(Date.now() - 5*60*1000).toISOString());
        reedJobs = error ? 0 : (count || 0);
      }
      console.log(`✅ Reed: ${reedJobs} jobs processed`);
      return reedJobs;
    } catch (error) {
      console.error('❌ Reed scraper failed:', error.message);
      return 0;
    }
  }

  // Run Muse scraper with API key
  async runMuseScraper() {
    try {
      console.log('🔄 Running enhanced Muse scraper...');
      
      // Use the Muse scraper via tsx (handles TS/ESM interop)
      const { stdout } = await execAsync('npx -y tsx scrapers/muse-scraper.ts', {
        cwd: process.cwd(),
        timeout: 180000, // 3 minutes timeout
        env: { ...process.env }
      });
      
      let museJobs = 0;
      const m = stdout.match(/^✅\s+Muse:\s+(\d+)\s+jobs saved to database$/m);
      if (m) {
        museJobs = parseInt(m[1]);
      } else {
        // Fallback to DB count (last 60 minutes)
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'themuse')
          .gte('created_at', new Date(Date.now() - 60*60*1000).toISOString());
        museJobs = error ? 0 : (count || 0);
      }
      
      console.log(`✅ Muse: ${museJobs} jobs processed`);
      return museJobs;
    } catch (error) {
      console.error('❌ Muse scraper failed:', error.message);
      return 0;
    }
  }

  // Run standardized Greenhouse scraper
  async runGreenhouseScraper() {
    try {
      // Greenhouse standardized requires config present; skip if missing
      if (!fs.existsSync('scrapers/greenhouse-standardized.js') || !fs.existsSync('scrapers/config/greenhouse-companies.js')) {
        console.log('⚠️ Greenhouse standardized dependencies missing, skipping');
        return 0;
      }
      console.log('🔄 Running enhanced Greenhouse scraper (standardized JS) ...');
      const cmd = 'node scrapers/greenhouse-standardized.js';
      const { stdout } = await execAsync(cmd, {
        cwd: process.cwd(),
        timeout: 600000,
        env: { ...process.env }
      });
      let jobsSaved = 0;
      const ghSummary = stdout.match(/\[greenhouse\]\s+source=greenhouse\s+found=(\d+)\s+upserted=(\d+)/);
      if (ghSummary) {
        jobsSaved = parseInt(ghSummary[2]);
      } else {
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'greenhouse')
          .gte('created_at', new Date(Date.now() - 60*60*1000).toISOString());
        jobsSaved = error ? 0 : (count || 0);
      }
      
      console.log(`✅ Greenhouse: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ Greenhouse scraper failed:', error.message);
      return 0;
    }
  }

  // Fallback to standard Greenhouse scraper
  async runStandardGreenhouseScraper() {
    try {
      console.log('🔄 Running standard Greenhouse scraper (TS import)...');
      
      // Execute the TS module directly via dynamic import and run persistence entry
      const cmd = 'node -e "(async()=>{ const mod=await import(\'./scrapers/greenhouse-standardized.ts\'); await mod.runGreenhouseAndSave(); })().catch(e=>{ console.error(e?.message||e); process.exit(1); })"';
      const { stdout } = await execAsync(cmd, {
        cwd: process.cwd(),
        timeout: 600000,
        env: { ...process.env }
      });
      
      // Prefer parsing standardized summary from the TS scraper
      let jobsSaved = 0;
      const ghSummary = stdout.match(/\[greenhouse\]\s+source=greenhouse\s+found=(\d+)\s+upserted=(\d+)/);
      if (ghSummary) {
        jobsSaved = parseInt(ghSummary[2]);
      } else {
        // Fallback to DB count (last 60 minutes)
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'greenhouse')
          .gte('created_at', new Date(Date.now() - 60*60*1000).toISOString());
        jobsSaved = error ? 0 : (count || 0);
      }
      
      console.log(`✅ Standard Greenhouse: ${jobsSaved} jobs saved to database`);
      return jobsSaved;
      
    } catch (error) {
      console.error('❌ Standard Greenhouse scraper failed:', error.message);
      return 0;
    }
  }

  // Run Indeed scraper
  // Indeed scraper removed - not working properly



  // (duplicate runMuseScraper removed; see the earlier implementation with DB fallback)

  // Run enhanced JSearch scraper
  async runJSearchScraper() {
    try {
      console.log('🔄 Running enhanced JSearch scraper...');
      
      // Use the enhanced JSearch scraper via tsx
      const { stdout } = await execAsync('npx -y tsx scrapers/jsearch-scraper.ts', {
        cwd: process.cwd(),
        timeout: 300000
      });
      
      let jobsSaved = 0;
      const m = stdout.match(/^✅\s+JSearch:\s+(\d+)\s+jobs saved to database$/m);
      if (m) {
        jobsSaved = parseInt(m[1]);
      } else {
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'jsearch')
          .gte('created_at', new Date(Date.now() - 60*60*1000).toISOString());
        jobsSaved = error ? 0 : (count || 0);
      }
      
      console.log(`✅ JSearch: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ JSearch scraper failed:', error.message);
      return 0;
    }
  }

  // Run enhanced Jooble scraper
  async runJoobleScraper() {
    try {
      console.log('🔄 Running enhanced Jooble scraper...');
      if (process.env.JOOBLE_ENABLED === 'false') {
        console.log('⚠️ Jooble disabled by flag');
        return 0;
      }
      
      // Use the enhanced Jooble scraper via tsx
      const { stdout } = await execAsync('npx -y tsx scrapers/jooble.ts', {
        cwd: process.cwd(),
        timeout: 300000
      });
      
      let jobsSaved = 0;
      const m = stdout.match(/^✅\s+Jooble:\s+(\d+)\s+jobs saved to database$/m);
      if (m) {
        jobsSaved = parseInt(m[1]);
      } else {
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'jooble')
          .gte('created_at', new Date(Date.now() - 60*60*1000).toISOString());
        jobsSaved = error ? 0 : (count || 0);
      }
      
      console.log(`✅ Jooble: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ Jooble scraper failed:', error.message);
      return 0;
    }
  }

  // Run enhanced Ashby scraper
  async runAshbyScraper() {
    try {
      console.log('🔄 Running enhanced Ashby scraper...');
      
      // Use the enhanced Ashby scraper (CommonJS)
      const { stdout } = await execAsync('node scrapers/ashby.cjs', {
        cwd: process.cwd(),
        timeout: 300000
      });
      
      let jobsSaved = 0;
      const m = stdout.match(/^✅\s+Ashby:\s+(\d+)\s+jobs saved to database$/m);
      if (m) {
        jobsSaved = parseInt(m[1]);
      } else {
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'ashby')
          .gte('created_at', new Date(Date.now() - 60*60*1000).toISOString());
        jobsSaved = error ? 0 : (count || 0);
      }
      
      console.log(`✅ Ashby: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ Ashby scraper failed:', error.message);
      return 0;
    }
  }

  // Run SERP API scraper
  async runSerpAPIScraper() {
    try {
      console.log('🔍 Running SERP API scraper...');
      
      // Use the SERP API scraper with smart strategies
      if (!fs.existsSync('scrapers/serp-api-scraper.ts') && !fs.existsSync('scrapers/serp-api-scraper.js')) {
        console.log('⚠️ SERP API scraper not found, skipping');
        return 0;
      }
      const serpCmd = fs.existsSync('scrapers/serp-api-scraper.ts')
        ? 'npx -y tsx scrapers/serp-api-scraper.ts'
        : 'node scrapers/serp-api-scraper.js';
      const { stdout } = await execAsync(serpCmd, {
        cwd: process.cwd(),
        timeout: 600000, // 10 minutes timeout for API calls
        env: { ...process.env }
      });
      
      const jobMatch = stdout.match(/✅ SERP API: (\d+) jobs saved to database/);
      let jobsSaved = jobMatch ? parseInt(jobMatch[1]) : 0;
      if (!jobsSaved) {
        if (stdout.includes('API key missing')) {
          console.log('❌ SERP API: Missing API key');
        } else if (stdout.toLowerCase().includes('quota exceeded')) {
          console.log('❌ SERP API: Quota exceeded');
        }
      }
      
      console.log(`✅ SERP API: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ SERP API scraper failed:', error.message);
      return 0;
    }
  }

  // Run RapidAPI Internships scraper
  async runRapidAPIInternshipsScraper() {
    try {
      console.log('🎓 Running RapidAPI Internships scraper...');
      
      // Use the RapidAPI Internships scraper
      const { stdout } = await execAsync('npx -y tsx scrapers/rapidapi-internships.ts', {
        cwd: process.cwd(),
        timeout: 300000
      });
      
      // Parse job count from the result
      const insertedMatch = stdout.match(/inserted:\s*(\d+)/);
      const jobsSaved = insertedMatch ? parseInt(insertedMatch[1]) : 0;
      
      console.log(`✅ RapidAPI Internships: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ RapidAPI Internships scraper failed:', error.message);
      return 0;
    }
  }


  // Monitor database health
  async checkDatabaseHealth() {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const lastJobTime = new Date(data[0].created_at);
        const hoursSinceLastJob = (Date.now() - lastJobTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastJob > 24) {
          console.error(`🚨 ALERT: No jobs ingested in ${Math.round(hoursSinceLastJob)} hours`);
          return false;
        }
        
        console.log(`✅ Database healthy: Last job ${Math.round(hoursSinceLastJob)} hours ago`);
        return true;
      } else {
        console.error('🚨 ALERT: No jobs in database');
        return false;
      }
    } catch (error) {
      console.error('❌ Database health check failed:', error.message);
      return false;
    }
  }

  // Get database stats
  async getDatabaseStats() {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('created_at, source');
      
      if (error) throw error;
      
      const totalJobs = data.length;
      const recentJobs = data.filter(job => {
        const jobTime = new Date(job.created_at);
        return (Date.now() - jobTime.getTime()) < (24 * 60 * 60 * 1000);
      }).length;
      
      const sourceBreakdown = data.reduce((acc, job) => {
        acc[job.source] = (acc[job.source] || 0) + 1;
        return acc;
      }, {});
      
      return {
        totalJobs,
        recentJobs,
        sourceBreakdown
      };
    } catch (error) {
      console.error('❌ Database stats failed:', error.message);
      return { totalJobs: 0, recentJobs: 0, sourceBreakdown: {} };
    }
  }

  // Main scraping cycle
  async runScrapingCycle() {
    if (this.isRunning) {
      console.log('⏸️ Scraping cycle already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('\n🚀 STARTING AUTOMATED SCRAPING CYCLE');
      console.log('=====================================');
      console.log('🎯 Running streamlined scrapers: JobSpy, Adzuna, Reed, Muse');
      
      // Run JobSpy first for fast signal
      let jobspyJobs = 0;
      try {
        jobspyJobs = await this.runJobSpyScraper();
        console.log(`✅ JobSpy completed: ${jobspyJobs} jobs`);
      } catch (error) {
        console.error('❌ JobSpy scraper failed, continuing with other scrapers:', error.message);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Then Adzuna, unless skipped
      let adzunaJobs = 0;
      if (!SKIP_ADZUNA) {
        try {
          adzunaJobs = await this.runAdzunaScraper();
          console.log(`✅ Adzuna completed: ${adzunaJobs} jobs`);
        } catch (error) {
          console.error('❌ Adzuna scraper failed, continuing with other scrapers:', error.message);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.log('⏩ Skipping Adzuna (flag set)');
      }
      
      let reedJobs = 0;
      try {
        reedJobs = await this.runReedScraper();
        console.log(`✅ Reed completed: ${reedJobs} jobs`);
      } catch (error) {
        console.error('❌ Reed scraper failed, continuing with other scrapers:', error.message);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let museJobs = 0;
      try {
        museJobs = await this.runMuseScraper();
        console.log(`✅ Muse completed: ${museJobs} jobs`);
      } catch (error) {
        console.error('❌ Muse scraper failed, continuing with other scrapers:', error.message);
      }
      
      // Update stats with all scrapers
      this.totalJobsSaved += (adzunaJobs + jobspyJobs + reedJobs + museJobs);
      this.runCount++;
      this.lastRun = new Date();
      
      // Check database health
      await this.checkDatabaseHealth();
      
      // Get final stats
      const dbStats = await this.getDatabaseStats();
      
      const duration = (Date.now() - startTime) / 1000;
      console.log('\n✅ SCRAPING CYCLE COMPLETE');
      console.log('============================');
      console.log(`⏱️  Duration: ${duration.toFixed(1)} seconds`);
      console.log(`📊 Jobs processed this cycle: ${adzunaJobs + jobspyJobs + reedJobs + museJobs}`);
      console.log(`📈 Total jobs processed: ${this.totalJobsSaved}`);
      console.log(`🔄 Total cycles run: ${this.runCount}`);
      console.log(`📅 Last run: ${this.lastRun.toISOString()}`);
      console.log(`💾 Database total: ${dbStats.totalJobs} jobs`);
      console.log(`🆕 Database recent (24h): ${dbStats.recentJobs} jobs`);
      console.log(`🏷️  Sources: ${JSON.stringify(dbStats.sourceBreakdown)}`);
      console.log(`🎯 Core scrapers breakdown:`);
      console.log(`   - JobSpy: ${jobspyJobs} jobs`);
      console.log(`   - Adzuna: ${adzunaJobs} jobs`);
      console.log(`   - Reed: ${reedJobs} jobs`);
      console.log(`   - Muse: ${museJobs} jobs`);
      
    } catch (error) {
      console.error('❌ Scraping cycle failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Start the automation
  start() {
    if (SINGLE_RUN_MODE) {
      console.log('🎯 Running in single-run mode (GitHub Actions)');
      console.log('=====================================');
      
      // Run once and exit
      return this.runScrapingCycle().then(() => {
        console.log('✅ Single scraping cycle completed');
        process.exit(0);
      }).catch((error) => {
        console.error('❌ Scraping cycle failed:', error);
        process.exit(1);
      });
    }
    
    // Existing cron schedule code for local development...
    console.log('🚀 Starting JobPing Real Automation...');
    console.log('=====================================');
    
    // Run immediately on startup
    this.runScrapingCycle();
    
    // Schedule runs 3 times per day (morning, lunch, evening) to avoid duplicate jobs
    cron.schedule('0 8,13,18 * * *', () => {
      console.log('\n⏰ Scheduled scraping cycle starting...');
      this.runScrapingCycle();
    });
    
    // Schedule daily health check
    cron.schedule('0 9 * * *', async () => {
      console.log('\n🏥 Daily health check...');
      await this.checkDatabaseHealth();
      const stats = await this.getDatabaseStats();
      console.log('📊 Daily stats:', stats);
    });
    
    console.log('✅ Automation started successfully!');
    console.log('   - 3x daily scraping cycles (8am, 1pm, 6pm)');
    console.log('   - Daily health checks');
    console.log('   - Database monitoring');
    console.log('   - 4 core scrapers: JobSpy, Adzuna, Reed, Muse');
  }

  // Get status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun?.toISOString(),
      totalJobsSaved: this.totalJobsSaved,
      runCount: this.runCount,
      uptime: process.uptime()
    };
  }
}

// Export the runner
const jobRunner = new RealJobRunner();

// Start if this file is run directly
if (require.main === module) {
  (async () => {
    try {
      if (process.env.LOG_LEVEL === 'debug') {
        // Optional language initialization if available
        if (typeof initLang === 'function') {
          await initLang();
          console.log('✅ Language detection initialized');
        }
      }
    } catch (e) {
      console.warn('[lang] init failed, falling back to franc-only', e);
    }
    
    // Start the job runner
    jobRunner.start();
  })();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down gracefully...');
    process.exit(0);
  });
}

module.exports = jobRunner;