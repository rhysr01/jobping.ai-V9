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
    // EXPANDED: Increased global cycle target to allow more jobs
    // Set to 0 to disable quota (run all scrapers) or high number like 10000
    return parseInt(process.env.SCRAPER_CYCLE_JOB_TARGET || '0', 10); // 0 = no limit, run all scrapers
  }

  // Smart per-scraper targets based on historical performance
  // EXPANDED: Increased caps to allow more job collection
  getScraperTargets() {
    return {
      'jobspy-indeed': parseInt(process.env.JOBSPY_TARGET || '500', 10),           // Increased from 100
      'jobspy-internships': parseInt(process.env.JOBSPY_INTERNSHIPS_TARGET || '2000', 10), // Increased from 80
      'jobspy-career-roles': parseInt(process.env.JOBSPY_CAREER_TARGET || '3000', 10),    // Increased from 50
      'adzuna': parseInt(process.env.ADZUNA_TARGET || '500', 10),                 // Increased from 150
      'reed': parseInt(process.env.REED_TARGET || '200', 10),                      // Increased from 50
      'careerjet': parseInt(process.env.CAREERJET_TARGET || '450', 10),            // New EU scraper
      'arbeitnow': parseInt(process.env.ARBEITNOW_TARGET || '80', 10)              // New DACH scraper
    };
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

  async evaluateStopCondition(stage, sinceIso, scraperName = null) {
    const stats = await this.collectCycleStats(sinceIso);
    console.log(`📈 ${stage}: ${stats.total} unique job hashes ingested this cycle`);
    
    // Check global target first
    const globalTarget = this.getCycleJobTarget();
    if (globalTarget > 0 && stats.total >= globalTarget) {
      console.log(`🎯 Global cycle job target (${globalTarget}) reached after ${stage}; skipping remaining scrapers.`);
      return true;
    }
    
    // Check per-scraper target if scraper name provided
    if (scraperName) {
      const scraperTargets = this.getScraperTargets();
      const scraperTarget = scraperTargets[scraperName];
      const scraperJobs = stats.perSource[scraperName] || 0;
      
      if (scraperTarget > 0 && scraperJobs >= scraperTarget) {
        console.log(`🎯 Scraper ${scraperName} target (${scraperTarget}) reached (${scraperJobs} jobs); moving to next scraper.`);
        // Don't stop the whole cycle, just this scraper
        return false;
      }
    }
    
    return false;
  }

  // Actually run your working scrapers
  async runAdzunaScraper(targets) {
    try {
      console.log('🔄 Running Adzuna scraper...');
      console.log('⚠️  CRITICAL: Adzuna represents 52% of total jobs - monitoring closely');
      
      // Check API keys before running
      if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
        console.error('🚨 CRITICAL: Adzuna API keys missing! Check ADZUNA_APP_ID and ADZUNA_APP_KEY in .env.local');
        return 0;
      }
      
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

      const { stdout, stderr } = await execAsync('node scrapers/wrappers/adzuna-wrapper.cjs', {
        cwd: process.cwd(),
        timeout: 600000, // 10 minutes for full scraper suite
        env,
      });
      
      // Log stderr if present (might contain important warnings)
      if (stderr && stderr.trim()) {
        console.warn('⚠️  Adzuna stderr:', stderr.substring(0, 500));
      }
      
      // Parse canonical success line - try multiple patterns
      let jobsSaved = 0;
      const canonical = stdout.match(/✅ Adzuna: (\d+) jobs saved to database/);
      if (canonical) {
        jobsSaved = parseInt(canonical[1]);
      } else {
        // Try alternative patterns
        const altMatch = stdout.match(/Adzuna.*?(\d+).*?jobs.*?saved/i);
        if (altMatch) {
          jobsSaved = parseInt(altMatch[1]);
        } else {
          // Fallback to DB count (last 10 minutes to account for slower scrapes)
          const { count, error } = await supabase
            .from('jobs')
            .select('id', { count: 'exact', head: false })
            .eq('source', 'adzuna')
            .gte('created_at', new Date(Date.now() - 10*60*1000).toISOString());
          jobsSaved = error ? 0 : (count || 0);
          if (jobsSaved > 0) {
            console.log(`ℹ️  Adzuna: DB fallback count: ${jobsSaved} jobs`);
          } else {
            console.warn('⚠️  Adzuna: No jobs found in DB - scraper may have failed silently or filtered all jobs');
            // Show last 20 lines of output for debugging
            const lines = stdout.split('\n').filter(l => l.trim());
            if (lines.length > 0) {
              console.log('📋 Last output lines:', lines.slice(-20).join('\n'));
            }
          }
        }
      }
      
      if (jobsSaved === 0) {
        console.warn('⚠️  WARNING: Adzuna returned 0 jobs - investigate if this is expected');
      }
      
      console.log(`✅ Adzuna: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ Adzuna scraper failed:', error.message);
      console.error('❌ Stack:', error.stack);
      console.error('🚨 CRITICAL: Adzuna failure impacts 52% of job volume - investigate immediately!');
      return 0;
    }
  }

  // Run JobSpy scraper for early-career jobs
  async runJobSpyScraper() {
    try {
      console.log('🔄 Running JobSpy scraper...');
      
      // Pre-flight check: Verify Python and JobSpy
      try {
        const pythonCheck = await execAsync('python3 --version', { timeout: 5000 });
        console.log(`✅ Python check: ${pythonCheck.stdout.trim()}`);
      } catch (e) {
        console.error('❌ Python not found - JobSpy requires Python 3.11');
        return 0;
      }
      
      try {
        await execAsync('python3 -c "import jobspy"', { timeout: 5000, stdio: 'ignore' });
        console.log('✅ JobSpy Python package available');
      } catch (e) {
        console.error('❌ JobSpy Python package not installed - run: pip install python-jobspy');
        return 0;
      }
      
      // Call standardized wrapper
      const { stdout, stderr } = await execAsync('NODE_ENV=production node scrapers/wrappers/jobspy-wrapper.cjs', {
        cwd: process.cwd(),
        timeout: 1200000, // 20 minutes timeout (increased from 10)
        env: { ...process.env }
      });
      
      // Log stderr if present (might contain important info)
      if (stderr && stderr.trim()) {
        console.warn('⚠️  JobSpy stderr:', stderr.substring(0, 1000));
      }
      
      // Parse job count from the result - try multiple patterns
      let jobsSaved = 0;
      const savedMatch = stdout.match(/✅ JobSpy: total_saved=(\d+)/);
      if (savedMatch) {
        jobsSaved = parseInt(savedMatch[1]);
      } else {
        // Try alternative patterns
        const altMatch = stdout.match(/total_saved[=:](\d+)/i);
        if (altMatch) {
          jobsSaved = parseInt(altMatch[1]);
        } else {
          // Fallback to DB count (last 10 minutes)
          const { count, error } = await supabase
            .from('jobs')
            .select('id', { count: 'exact', head: false })
            .eq('source', 'jobspy-indeed')
            .gte('created_at', new Date(Date.now() - 10*60*1000).toISOString());
          jobsSaved = error ? 0 : (count || 0);
          if (jobsSaved > 0) {
            console.log(`ℹ️  JobSpy: DB fallback count: ${jobsSaved} jobs`);
          } else {
            console.warn('⚠️  JobSpy: No jobs found in DB - scraper may have filtered all jobs or found none');
            // Show last 30 lines of output for debugging
            const lines = stdout.split('\n').filter(l => l.trim());
            if (lines.length > 0) {
              console.log('📋 Last output lines:', lines.slice(-30).join('\n'));
            }
            // Also check if script completed
            if (stdout.includes('Done') || stdout.includes('Complete')) {
              console.log('ℹ️  Script completed but no jobs saved - likely filtering issue');
            } else {
              console.log('⚠️  Script may not have completed successfully');
            }
          }
        }
      }
      
      console.log(`✅ JobSpy: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ JobSpy scraper failed:', error.message);
      if (error.code === 'ETIMEDOUT') {
        console.error('❌ JobSpy scraper timed out after 20 minutes');
      }
      console.error('❌ Error code:', error.code);
      if (error.stdout) {
        console.error('❌ stdout:', error.stdout.substring(0, 500));
      }
      if (error.stderr) {
        console.error('❌ stderr:', error.stderr.substring(0, 500));
      }
      return 0;
    }
  }

  // Run JobSpy Internships-Only scraper
  async runJobSpyInternshipsScraper() {
    try {
      console.log('🎓 Running JobSpy Internships-Only scraper...');
      const { stdout, stderr } = await execAsync('NODE_ENV=production node scripts/jobspy-internships-only.cjs', {
        cwd: process.cwd(),
        timeout: 1200000, // 20 minutes timeout (increased from 10)
        env: { ...process.env }
      });
      
      // Log stderr if present
      if (stderr && stderr.trim()) {
        console.warn('⚠️  JobSpy Internships stderr:', stderr.substring(0, 1000));
      }
      
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
        } else {
          console.warn('⚠️  JobSpy Internships: No jobs found - showing last output');
          const lines = stdout.split('\n').filter(l => l.trim());
          if (lines.length > 0) {
            console.log('📋 Last output:', lines.slice(-20).join('\n'));
          }
        }
      }
      
      console.log(`✅ JobSpy Internships: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ JobSpy Internships scraper failed:', error.message);
      if (error.code === 'ETIMEDOUT') {
        console.error('❌ JobSpy Internships scraper timed out after 20 minutes');
      }
      if (error.stdout) console.error('❌ stdout:', error.stdout.substring(0, 500));
      if (error.stderr) console.error('❌ stderr:', error.stderr.substring(0, 500));
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
      
      const { stdout, stderr } = await execAsync('NODE_ENV=production node scripts/jobspy-career-path-roles.cjs', {
        cwd: process.cwd(),
        timeout: 1200000, // 20 minutes timeout (increased from 10)
        env,
      });
      
      // Log stderr if present
      if (stderr && stderr.trim()) {
        console.warn('⚠️  Career Path Roles stderr:', stderr.substring(0, 1000));
      }
      
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
        } else {
          console.warn('⚠️  Career Path Roles: No jobs found - showing last output');
          const lines = stdout.split('\n').filter(l => l.trim());
          if (lines.length > 0) {
            console.log('📋 Last output:', lines.slice(-20).join('\n'));
          }
        }
      }
      
      console.log(`✅ Career Path Roles: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ Career Path Roles scraper failed:', error.message);
      if (error.code === 'ETIMEDOUT') {
        console.error('❌ Career Path Roles scraper timed out after 20 minutes');
      }
      if (error.stdout) console.error('❌ stdout:', error.stdout.substring(0, 500));
      if (error.stderr) console.error('❌ stderr:', error.stderr.substring(0, 500));
      return 0;
    }
  }

  // Run Reed scraper with real API
  async runReedScraper(targets) {
    try {
      console.log('🔄 Running Reed scraper...');
      
      // Check API key before running
      if (!process.env.REED_API_KEY) {
        console.error('🚨 CRITICAL: Reed API key missing! Check REED_API_KEY in .env.local');
        return 0;
      }
      
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

      const { stdout, stderr } = await execAsync('node scrapers/wrappers/reed-wrapper.cjs', {
        cwd: process.cwd(),
        timeout: 300000,
        env,
      });
      
      // Log stderr if present
      if (stderr && stderr.trim()) {
        console.warn('⚠️  Reed stderr:', stderr.substring(0, 500));
      }
      
      let reedJobs = 0;
      const match = stdout.match(/✅ Reed: (\d+) jobs saved to database/);
      if (match) {
        reedJobs = parseInt(match[1]);
      } else {
        // Fallback to DB count (last 10 minutes)
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'reed')
          .gte('created_at', new Date(Date.now() - 10*60*1000).toISOString());
        reedJobs = error ? 0 : (count || 0);
        if (reedJobs > 0) {
          console.log(`ℹ️  Reed: DB fallback count: ${reedJobs} jobs`);
        } else {
          console.warn('⚠️  Reed: No jobs found in DB - scraper may have failed silently');
        }
      }
      
      console.log(`✅ Reed: ${reedJobs} jobs processed`);
      return reedJobs;
    } catch (error) {
      console.error('❌ Reed scraper failed:', error.message);
      console.error('❌ Stack:', error.stack);
      return 0;
    }
  }


  // Run CareerJet scraper
  async runCareerJetScraper() {
    try {
      console.log('🔄 Running CareerJet scraper...');
      
      // Check API key before running
      if (!process.env.CAREERJET_API_KEY) {
        console.error('🚨 CRITICAL: CareerJet API key missing! Check CAREERJET_API_KEY in .env.local');
        return 0;
      }
      console.log('✅ CareerJet API key present');
      
      const { scrapeCareerJet } = require('../scrapers/careerjet.cjs');
      const { stdout, stderr } = await execAsync('node scrapers/careerjet.cjs', {
        cwd: process.cwd(),
        timeout: 600000, // 10 minutes timeout
        env: { ...process.env }
      });
      
      // Log stderr if present
      if (stderr && stderr.trim()) {
        console.warn('⚠️  CareerJet stderr:', stderr.substring(0, 1000));
      }
      
      // Log full output for debugging (first 500 chars)
      if (stdout) {
        console.log('📋 CareerJet output preview:', stdout.substring(0, 500));
      }
      
      let jobsSaved = 0;
      const match = stdout.match(/\[CareerJet\] ✅ Complete: (\d+) jobs saved in/);
      if (match) {
        jobsSaved = parseInt(match[1]);
      } else {
        // Check for error messages
        if (stdout.includes('❌') || stdout.includes('Error') || stdout.includes('error')) {
          console.warn('⚠️  CareerJet output contains errors - check full logs');
          const errorLines = stdout.split('\n').filter(l => 
            l.includes('❌') || l.includes('Error') || l.includes('error') || l.includes('CRITICAL')
          );
          if (errorLines.length > 0) {
            console.warn('⚠️  CareerJet errors:', errorLines.slice(0, 10).join('\n'));
          }
        }
        
        // Fallback to DB count (last 10 minutes)
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'careerjet')
          .gte('created_at', new Date(Date.now() - 10*60*1000).toISOString());
        jobsSaved = error ? 0 : (count || 0);
        if (jobsSaved > 0) {
          console.log(`ℹ️  CareerJet: DB fallback count: ${jobsSaved} jobs`);
        } else {
          console.warn('⚠️  CareerJet: No jobs found in DB - scraper may have failed silently');
          console.warn('⚠️  Check CareerJet API response and error logs above');
        }
      }
      
      console.log(`✅ CareerJet: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ CareerJet scraper failed:', error.message);
      if (error.code === 'ETIMEDOUT') {
        console.error('❌ CareerJet scraper timed out after 10 minutes');
      }
      if (error.stdout) console.error('❌ stdout:', error.stdout.substring(0, 500));
      if (error.stderr) console.error('❌ stderr:', error.stderr.substring(0, 500));
      return 0;
    }
  }

  // Run Arbeitnow scraper
  async runArbeitnowScraper() {
    try {
      console.log('🔄 Running Arbeitnow scraper...');
      
      const { scrapeArbeitnow } = require('../scrapers/arbeitnow.cjs');
      const { stdout, stderr } = await execAsync('node scrapers/arbeitnow.cjs', {
        cwd: process.cwd(),
        timeout: 600000, // 10 minutes timeout
        env: { ...process.env }
      });
      
      // Log stderr if present
      if (stderr && stderr.trim()) {
        console.warn('⚠️  Arbeitnow stderr:', stderr.substring(0, 500));
      }
      
      let jobsSaved = 0;
      const match = stdout.match(/\[Arbeitnow\] ✅ Complete: (\d+) jobs saved in/);
      if (match) {
        jobsSaved = parseInt(match[1]);
      } else {
        // Fallback to DB count (last 10 minutes)
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'arbeitnow')
          .gte('created_at', new Date(Date.now() - 10*60*1000).toISOString());
        jobsSaved = error ? 0 : (count || 0);
        if (jobsSaved > 0) {
          console.log(`ℹ️  Arbeitnow: DB fallback count: ${jobsSaved} jobs`);
        } else {
          console.warn('⚠️  Arbeitnow: No jobs found in DB - scraper may have failed silently');
        }
      }
      
      console.log(`✅ Arbeitnow: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ Arbeitnow scraper failed:', error.message);
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


  // Monitor database health with source-level checks
  async checkDatabaseHealth() {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('created_at, source')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const lastJobTime = new Date(data[0].created_at);
        const hoursSinceLastJob = (Date.now() - lastJobTime.getTime()) / (1000 * 60 * 60);
        
        // Check source freshness
        const sourceLastRun = {};
        const criticalSources = ['adzuna', 'reed', 'jobspy-indeed', 'jobspy-internships', 'careerjet', 'arbeitnow'];
        
        criticalSources.forEach(source => {
          const sourceJobs = data.filter(j => j.source === source);
          if (sourceJobs.length > 0) {
            const lastSourceJob = new Date(sourceJobs[0].created_at);
            const hoursSince = (Date.now() - lastSourceJob.getTime()) / (1000 * 60 * 60);
            sourceLastRun[source] = hoursSince;
            
            // Alert if critical source hasn't run in 7 days
            if (hoursSince > 168) {
              console.error(`🚨 ALERT: Source '${source}' hasn't added jobs in ${Math.round(hoursSince)} hours (${Math.round(hoursSince/24)} days)`);
            }
          } else {
            console.error(`🚨 ALERT: Source '${source}' has no recent jobs`);
          }
        });
        
        if (hoursSinceLastJob > 24) {
          console.error(`🚨 ALERT: No jobs ingested in ${Math.round(hoursSinceLastJob)} hours`);
          return false;
        }
        
        console.log(`✅ Database healthy: Last job ${Math.round(hoursSinceLastJob)} hours ago`);
        console.log(`📊 Source freshness:`, sourceLastRun);
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
      console.log('🎯 Running streamlined scrapers: JobSpy, JobSpy Internships, Career Path Roles, Adzuna, Reed, CareerJet, Arbeitnow');
      
      const cycleStartIso = new Date().toISOString();
      const signupTargets = await this.getSignupTargets();

      if (!signupTargets.cities.length) {
        console.log('⚪ No active signup cities detected; skipping scraping cycle.');
        this.currentCycleStats = { total: 0, perSource: {} };
        return;
      }
      
      // Run JobSpy variants in parallel for faster execution
      console.log('⚡ Running JobSpy variants in parallel...');
      let jobspyJobs = 0;
      let jobspyInternshipsJobs = 0;
      try {
        const [jobspyResult, internshipsResult] = await Promise.all([
          this.runJobSpyScraper().catch(err => {
            console.error('❌ JobSpy scraper failed:', err.message);
            return 0;
          }),
          this.runJobSpyInternshipsScraper().catch(err => {
            console.error('❌ JobSpy Internships scraper failed:', err.message);
            return 0;
          })
        ]);
        jobspyJobs = jobspyResult;
        jobspyInternshipsJobs = internshipsResult;
        console.log(`✅ JobSpy parallel execution completed: ${jobspyJobs} general + ${jobspyInternshipsJobs} internships`);
      } catch (error) {
        console.error('❌ JobSpy parallel execution failed:', error.message);
      }

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
        stopDueToQuota = await this.evaluateStopCondition('Career Path Roles scraper', cycleStartIso);
      } else {
        console.log('⏹️  Skipping Career Path Roles scraper - cycle job target reached.');
      }

      // Run Adzuna and Reed in parallel (both are critical sources)
      // Adzuna is high priority (52% of jobs) but was being skipped - ensure it runs
      let adzunaJobs = 0;
      let reedJobs = 0;
      
      if (!stopDueToQuota) {
        console.log('⚡ Running Adzuna and Reed in parallel...');
        try {
          const [adzunaResult, reedResult] = await Promise.all([
            (!SKIP_ADZUNA ? this.runAdzunaScraper(signupTargets).catch(err => {
              console.error('❌ Adzuna scraper failed:', err.message);
              console.error('⚠️  Adzuna represents 52% of total jobs - investigate failure!');
              return 0;
            }) : Promise.resolve(0)),
            this.runReedScraper(signupTargets).catch(err => {
              console.error('❌ Reed scraper failed:', err.message);
              return 0;
            })
          ]);
          adzunaJobs = adzunaResult;
          reedJobs = reedResult;
          console.log(`✅ Adzuna + Reed parallel execution completed: ${adzunaJobs} Adzuna + ${reedJobs} Reed`);
        } catch (error) {
          console.error('❌ Adzuna/Reed parallel execution failed:', error.message);
        }
        stopDueToQuota = await this.evaluateStopCondition('Adzuna + Reed scrapers', cycleStartIso);
      } else {
        console.log('⏹️  Skipping Adzuna + Reed scrapers - cycle job target reached.');
      }

      // Run CareerJet (EU coverage)
      let careerjetJobs = 0;
      if (!stopDueToQuota) {
        try {
          careerjetJobs = await this.runCareerJetScraper();
          console.log(`✅ CareerJet completed: ${careerjetJobs} jobs`);
        } catch (error) {
          console.error('❌ CareerJet scraper failed, continuing with other scrapers:', error.message);
        }
        stopDueToQuota = await this.evaluateStopCondition('CareerJet scraper', cycleStartIso);
      } else {
        console.log('⏹️  Skipping CareerJet scraper - cycle job target reached.');
      }

      // Run Arbeitnow (DACH region)
      let arbeitnowJobs = 0;
      if (!stopDueToQuota) {
        try {
          arbeitnowJobs = await this.runArbeitnowScraper();
          console.log(`✅ Arbeitnow completed: ${arbeitnowJobs} jobs`);
        } catch (error) {
          console.error('❌ Arbeitnow scraper failed, continuing with other scrapers:', error.message);
        }
        stopDueToQuota = await this.evaluateStopCondition('Arbeitnow scraper', cycleStartIso);
      } else {
        console.log('⏹️  Skipping Arbeitnow scraper - cycle job target reached.');
      }
      
      if (!stopDueToQuota) {
        await this.evaluateStopCondition('Full cycle', cycleStartIso);
      }
      
      // Update stats with all scrapers
      this.totalJobsSaved += (adzunaJobs + jobspyJobs + jobspyInternshipsJobs + careerPathRolesJobs + reedJobs + careerjetJobs + arbeitnowJobs);
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
      console.log(`📊 Jobs processed this cycle: ${adzunaJobs + jobspyJobs + jobspyInternshipsJobs + careerPathRolesJobs + reedJobs + careerjetJobs + arbeitnowJobs}`);
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
      console.log(`   - Adzuna: ${adzunaJobs} jobs (reduced priority)`);
      console.log(`   - CareerJet: ${careerjetJobs} jobs (EU coverage)`);
      console.log(`   - Arbeitnow: ${arbeitnowJobs} jobs (DACH region)`);
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
 
    // Schedule runs 2 times per day (morning, evening) - optimized from 3x/day
    // Still exceeds "daily" promise while reducing costs by 33%
    cron.schedule('0 8,18 * * *', () => {
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
    console.log('   - 2x daily scraping cycles (8am, 6pm UTC) - optimized from 3x/day');
    console.log('   - Parallel execution enabled for faster cycles');
    console.log('   - Smart stop conditions per scraper');
    console.log('   - Daily health checks');
    console.log('   - Database monitoring');
      console.log('   - 7 core scrapers: JobSpy, JobSpy Internships, Career Path Roles, Adzuna, Reed, CareerJet, Arbeitnow');
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