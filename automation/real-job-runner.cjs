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

function parseJsonEnv(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean);
    }
    return [];
  } catch (error) {
    console.warn('⚠️  Failed to parse JSON env value:', error.message);
    return [];
  }
}

class RealJobRunner {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.totalJobsSaved = 0;
    this.runCount = 0;
    this.currentCycleStats = { total: 0, perSource: {} };
    this.embeddingRefreshRunning = false;
    this.lastEmbeddingRefresh = null;
  }

  async runEmbeddingRefresh(trigger = 'cron') {
    if (this.embeddingRefreshRunning) {
      console.log(`⚠️  Embedding refresh already in progress, skipping (${trigger})`);
      return;
    }

    const command = process.env.EMBEDDING_REFRESH_COMMAND || 'npx tsx scripts/generate_all_embeddings.ts';

    console.log(`\n🧠 Starting embedding refresh (${trigger}) using \
"${command}" at ${new Date().toISOString()}`);
    this.embeddingRefreshRunning = true;

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        env: process.env
      });

      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);

      this.lastEmbeddingRefresh = new Date();
      console.log(`✅ Embedding refresh complete at ${this.lastEmbeddingRefresh.toISOString()}`);
    } catch (error) {
      console.error('❌ Embedding refresh failed:', error);
    } finally {
      this.embeddingRefreshRunning = false;
    }
  }

  async getSignupTargets() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('target_cities, career_path, industries, roles_selected')
        .eq('subscription_active', true);

      if (error) {
        console.error('⚠️  Failed to fetch signup targets:', error.message);
        return { cities: [], careerPaths: [], industries: [], roles: [] };
      }

      const citySet = new Set(parseJsonEnv(process.env.TARGET_CITIES_OVERRIDE));
      const careerSet = new Set(parseJsonEnv(process.env.TARGET_CAREER_PATHS_OVERRIDE));
      const industrySet = new Set(parseJsonEnv(process.env.TARGET_INDUSTRIES_OVERRIDE));
      const roleSet = new Set(parseJsonEnv(process.env.TARGET_ROLES_OVERRIDE));

      (data || []).forEach((user) => {
        if (Array.isArray(user?.target_cities)) {
          user.target_cities.forEach((city) => {
            if (typeof city === 'string' && city.trim()) {
              citySet.add(city.trim());
            }
          });
        }

        if (user?.career_path && typeof user.career_path === 'string') {
          careerSet.add(user.career_path.trim());
        }

        if (Array.isArray(user?.industries)) {
          user.industries.forEach((industry) => {
            if (typeof industry === 'string' && industry.trim()) {
              industrySet.add(industry.trim());
            }
          });
        }

        if (Array.isArray(user?.roles_selected)) {
          user.roles_selected.forEach((role) => {
            if (typeof role === 'string' && role.trim()) {
              roleSet.add(role.trim());
            }
          });
        }
      });

      const cities = Array.from(citySet);
      const careerPaths = Array.from(careerSet);
      const industries = Array.from(industrySet);
      const roles = Array.from(roleSet);

      console.log('🎯 Signup-driven targets ready', {
        citiesPreview: cities.slice(0, 10),
        totalCities: cities.length,
        totalCareerPaths: careerPaths.length,
        totalIndustries: industries.length,
        totalRoles: roles.length,
      });

      return { cities, careerPaths, industries, roles };
    } catch (error) {
      console.error('⚠️  Unexpected error collecting signup targets:', error.message);
      return { cities: [], careerPaths: [], industries: [], roles: [] };
    }
  }

  getCycleJobTarget() {
    // Increased target to allow more diversity: Reed, Greenhouse, and reduce Adzuna dependency
    // Set to 0 to disable quota (run all scrapers) or high number like 2000
    return parseInt(process.env.SCRAPER_CYCLE_JOB_TARGET || '0', 10);
  }

  async collectCycleStats(sinceIso) {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('job_hash, source')
        .gte('created_at', sinceIso);

      if (error) {
        throw error;
      }

      const uniqueHashes = new Set();
      const perSource = {};

      (data || []).forEach((row) => {
        if (!row?.job_hash) return;
        uniqueHashes.add(row.job_hash);
        const sourceKey = row.source || 'unknown';
        perSource[sourceKey] = (perSource[sourceKey] || 0) + 1;
      });

      const stats = { total: uniqueHashes.size, perSource };
      this.currentCycleStats = stats;
      return stats;
    } catch (error) {
      console.error('⚠️  Failed to collect cycle stats:', error.message);
      return { total: 0, perSource: {} };
    }
  }

  async evaluateStopCondition(stage, sinceIso) {
    const stats = await this.collectCycleStats(sinceIso);
    console.log(`📈 ${stage}: ${stats.total} unique job hashes ingested this cycle`);
    const target = this.getCycleJobTarget();
    // If target is 0, run all scrapers (no limit)
    if (target > 0 && stats.total >= target) {
      console.log(`🎯 Cycle job target (${target}) reached after ${stage}; skipping remaining scrapers.`);
      return true;
    }
    return false;
  }

  // Actually run your working scrapers
  async runAdzunaScraper(targets) {
    try {
      console.log('🔄 Running Adzuna scraper...');
      // Call standardized wrapper for consistent output
      const env = {
        ...process.env,
        NODE_ENV: 'production',
      };
      if (targets?.cities?.length) {
        env.TARGET_CITIES = JSON.stringify(targets.cities);
      }
      if (targets?.careerPaths?.length) {
        env.TARGET_CAREER_PATHS = JSON.stringify(targets.careerPaths);
      }
      if (targets?.industries?.length) {
        env.TARGET_INDUSTRIES = JSON.stringify(targets.industries);
      }
      if (targets?.roles?.length) {
        env.TARGET_ROLES = JSON.stringify(targets.roles);
      }

      const { stdout } = await execAsync('node scrapers/wrappers/adzuna-wrapper.cjs', {
        cwd: process.cwd(),
        timeout: 600000, // 10 minutes for full scraper suite
        env,
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
      const savedMatch = stdout.match(/✅ JobSpy: total_saved=(\d+)/);
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

  // Run JobSpy Internships-Only scraper
  async runJobSpyInternshipsScraper() {
    try {
      console.log('🎓 Running JobSpy Internships-Only scraper...');
      const { stdout } = await execAsync('NODE_ENV=production node scripts/jobspy-internships-only.cjs', {
        cwd: process.cwd(),
        timeout: 600000, // 10 minutes timeout
        env: { ...process.env }
      });
      
      // Parse job count from the result
      let jobsSaved = 0;
      const savedMatch = stdout.match(/✅ JobSpy Internships: total_saved=(\d+)/);
      if (savedMatch) {
        jobsSaved = parseInt(savedMatch[1]);
      } else {
        // Fallback to DB count (last 10 minutes)
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'jobspy-internships')
          .gte('created_at', new Date(Date.now() - 10*60*1000).toISOString());
        jobsSaved = error ? 0 : (count || 0);
        if (jobsSaved) {
          console.log(`ℹ️  JobSpy Internships: DB fallback count: ${jobsSaved} jobs`);
        }
      }
      
      console.log(`✅ JobSpy Internships: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ JobSpy Internships scraper failed:', error.message);
      return 0;
    }
  }

  // Run JobSpy Career Path Roles scraper (searches for all roles across career paths)
  async runJobSpyCareerPathRolesScraper(targets) {
    try {
      console.log('🎯 Running JobSpy Career Path Roles scraper...');
      const env = {
        ...process.env,
        NODE_ENV: 'production',
      };
      if (targets?.cities?.length) {
        env.TARGET_CITIES = JSON.stringify(targets.cities);
      }
      
      const { stdout } = await execAsync('NODE_ENV=production node scripts/jobspy-career-path-roles.cjs', {
        cwd: process.cwd(),
        timeout: 600000, // 10 minutes timeout
        env,
      });
      
      // Parse job count from the result
      let jobsSaved = 0;
      const savedMatch = stdout.match(/✅ Career Path Roles: total_saved=(\d+)/);
      if (savedMatch) {
        jobsSaved = parseInt(savedMatch[1]);
      } else {
        // Fallback to DB count (last 10 minutes)
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'jobspy-career-roles')
          .gte('created_at', new Date(Date.now() - 10*60*1000).toISOString());
        jobsSaved = error ? 0 : (count || 0);
        if (jobsSaved) {
          console.log(`ℹ️  Career Path Roles: DB fallback count: ${jobsSaved} jobs`);
        }
      }
      
      console.log(`✅ Career Path Roles: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ Career Path Roles scraper failed:', error.message);
      return 0;
    }
  }

  // Run Reed scraper with real API
  async runReedScraper(targets) {
    try {
      console.log('🔄 Running Reed scraper...');
      const env = {
        ...process.env,
        NODE_ENV: 'production',
      };
      if (targets?.cities?.length) {
        env.TARGET_CITIES = JSON.stringify(targets.cities);
      }
      if (targets?.careerPaths?.length) {
        env.TARGET_CAREER_PATHS = JSON.stringify(targets.careerPaths);
      }
      if (targets?.industries?.length) {
        env.TARGET_INDUSTRIES = JSON.stringify(targets.industries);
      }
      if (targets?.roles?.length) {
        env.TARGET_ROLES = JSON.stringify(targets.roles);
      }

      const { stdout } = await execAsync('node scrapers/wrappers/reed-wrapper.cjs', {
        cwd: process.cwd(),
        timeout: 300000,
        env,
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



  // Removed deprecated scrapers: JSearch, Jooble, Ashby, Muse
  // Current active scrapers: JobSpy (Indeed/Glassdoor), Adzuna, Reed

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
      console.log('🎯 Running streamlined scrapers: JobSpy, JobSpy Internships, Career Path Roles, Adzuna, Reed');
      
      const cycleStartIso = new Date().toISOString();
      const signupTargets = await this.getSignupTargets();

      if (!signupTargets.cities.length) {
        console.log('⚪ No active signup cities detected; skipping scraping cycle.');
        this.currentCycleStats = { total: 0, perSource: {} };
        return;
      }
      
      // Run JobSpy first for fast signal
      let jobspyJobs = 0;
      try {
        jobspyJobs = await this.runJobSpyScraper();
        console.log(`✅ JobSpy completed: ${jobspyJobs} jobs`);
      } catch (error) {
        console.error('❌ JobSpy scraper failed, continuing with other scrapers:', error.message);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Run JobSpy Internships-Only scraper
      let jobspyInternshipsJobs = 0;
      try {
        jobspyInternshipsJobs = await this.runJobSpyInternshipsScraper();
        console.log(`✅ JobSpy Internships completed: ${jobspyInternshipsJobs} jobs`);
      } catch (error) {
        console.error('❌ JobSpy Internships scraper failed, continuing with other scrapers:', error.message);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));

      let stopDueToQuota = await this.evaluateStopCondition('JobSpy pipelines', cycleStartIso);

      // Run JobSpy Career Path Roles scraper (searches for all roles across career paths)
      let careerPathRolesJobs = 0;
      if (!stopDueToQuota) {
        try {
          careerPathRolesJobs = await this.runJobSpyCareerPathRolesScraper(signupTargets);
          console.log(`✅ Career Path Roles completed: ${careerPathRolesJobs} jobs`);
        } catch (error) {
          console.error('❌ Career Path Roles scraper failed, continuing with other scrapers:', error.message);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        stopDueToQuota = await this.evaluateStopCondition('Career Path Roles scraper', cycleStartIso);
      } else {
        console.log('⏹️  Skipping Career Path Roles scraper - cycle job target reached.');
      }

      // Run Reed BEFORE Adzuna to increase its usage (currently only 4.43%)
      let reedJobs = 0;
      if (!stopDueToQuota) {
        try {
          reedJobs = await this.runReedScraper(signupTargets);
          console.log(`✅ Reed completed: ${reedJobs} jobs`);
        } catch (error) {
          console.error('❌ Reed scraper failed, continuing with other scrapers:', error.message);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        stopDueToQuota = await this.evaluateStopCondition('Reed scraper', cycleStartIso);
      } else {
        console.log('⏹️  Skipping Reed scraper - cycle job target reached.');
      }

      // Run Greenhouse to expand its usage (currently only 7 jobs)
      let greenhouseJobs = 0;
      if (!stopDueToQuota) {
        try {
          greenhouseJobs = await this.runGreenhouseScraper();
          console.log(`✅ Greenhouse completed: ${greenhouseJobs} jobs`);
        } catch (error) {
          console.error('❌ Greenhouse scraper failed, continuing with other scrapers:', error.message);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        stopDueToQuota = await this.evaluateStopCondition('Greenhouse scraper', cycleStartIso);
      } else {
        console.log('⏹️  Skipping Greenhouse scraper - cycle job target reached.');
      }

      // Then Adzuna (reduced priority to decrease dependency from 52.76% to <40%)
      let adzunaJobs = 0;
      if (!SKIP_ADZUNA && !stopDueToQuota) {
        try {
          adzunaJobs = await this.runAdzunaScraper(signupTargets);
          console.log(`✅ Adzuna completed: ${adzunaJobs} jobs`);
        } catch (error) {
          console.error('❌ Adzuna scraper failed, continuing with other scrapers:', error.message);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        stopDueToQuota = await this.evaluateStopCondition('Adzuna scraper', cycleStartIso);
      } else if (SKIP_ADZUNA) {
        console.log('⏩ Skipping Adzuna (flag set)');
      } else if (stopDueToQuota) {
        console.log('⏹️  Skipping Adzuna scraper - cycle job target reached.');
      }
      
      if (!stopDueToQuota) {
        await this.evaluateStopCondition('Full cycle', cycleStartIso);
      }
      
      // Update stats with all scrapers
      this.totalJobsSaved += (adzunaJobs + jobspyJobs + jobspyInternshipsJobs + careerPathRolesJobs + reedJobs + greenhouseJobs);
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
      console.log(`📊 Jobs processed this cycle: ${adzunaJobs + jobspyJobs + jobspyInternshipsJobs + careerPathRolesJobs + reedJobs + greenhouseJobs}`);
      console.log(`📈 Total jobs processed: ${this.totalJobsSaved}`);
      console.log(`🔄 Total cycles run: ${this.runCount}`);
      console.log(`📅 Last run: ${this.lastRun.toISOString()}`);
      console.log(`💾 Database total: ${dbStats.totalJobs} jobs`);
      console.log(`🆕 Database recent (24h): ${dbStats.recentJobs} jobs`);
      console.log(`🏷️  Sources: ${JSON.stringify(dbStats.sourceBreakdown)}`);
      console.log(`🎯 Core scrapers breakdown:`);
      console.log(`   - JobSpy (General): ${jobspyJobs} jobs`);
      console.log(`   - JobSpy (Internships Only): ${jobspyInternshipsJobs} jobs`);
      console.log(`   - Career Path Roles: ${careerPathRolesJobs} jobs`);
      console.log(`   - Reed: ${reedJobs} jobs (increased priority)`);
      console.log(`   - Greenhouse: ${greenhouseJobs} jobs (expanded)`);
      console.log(`   - Adzuna: ${adzunaJobs} jobs (reduced priority)`);
      console.log(`🧮 Unique job hashes this cycle: ${this.currentCycleStats.total}`);
      console.log(`📦 Per-source breakdown this cycle: ${JSON.stringify(this.currentCycleStats.perSource)}`);
      
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
    this.runEmbeddingRefresh('startup');
 
    // Schedule runs 3 times per day (morning, lunch, evening) to avoid duplicate jobs
    cron.schedule('0 8,13,18 * * *', () => {
      console.log('\n⏰ Scheduled scraping cycle starting...');
      this.runScrapingCycle();
    });
 
    // Schedule embedding refresh every 72 hours (default time 02:00 UTC)
    const embeddingCron = process.env.EMBEDDING_REFRESH_CRON || '0 2 */3 * *';
    const embeddingTz = process.env.EMBEDDING_REFRESH_TZ || 'UTC';
    cron.schedule(embeddingCron, () => this.runEmbeddingRefresh('cron'), {
      timezone: embeddingTz
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
    console.log('   - 6 core scrapers: JobSpy, JobSpy Internships, Career Path Roles, Adzuna, Reed, Greenhouse');
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