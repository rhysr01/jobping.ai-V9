// 🔧 SCRAPER ORCHESTRATION SYSTEM
// MASTER SCRAPING CONTROLLER

// Removed RemoteOKScraper - it's poison for graduates

class JobScrapingOrchestrator {
  constructor() {
    // CRITICAL FIX: Actually include graduate-focused scrapers!
    this.scrapers = [];
    
    // Add graduate-focused scrapers FIRST (higher priority)
    try {
      const { scrapeGraduateJobs } = require('./graduatejobs');
      this.scrapers.push({
        name: 'GraduateJobs',
        scrapeWithRetry: () => scrapeGraduateJobs('orchestrator-run-' + Date.now())
      });
    } catch (error) {
      console.warn('GraduateJobs scraper not available:', error.message);
    }
    
    try {
      // const { scrapeJobTeaser } = require('./jobteaser'); // TEMPORARILY DISABLED due to syntax errors
      this.scrapers.push({
        name: 'JobTeaser',
        scrapeWithRetry: () => Promise.resolve({ raw: 0, eligible: 0, careerTagged: 0, locationTagged: 0, inserted: 0, updated: 0, errors: ['Temporarily disabled due to syntax errors'], samples: [] })
      });
    } catch (error) {
      console.warn('JobTeaser scraper not available:', error.message);
    }
    
    try {
      const { scrapeMilkround } = require('./milkround');
      this.scrapers.push({
        name: 'Milkround',
        scrapeWithRetry: () => scrapeMilkround('orchestrator-run-' + Date.now())
      });
    } catch (error) {
      console.warn('Milkround scraper not available:', error.message);
    }
    
    // Removed RemoteOK - it's poison for graduates
    // Only add graduate-focused scrapers
    
    // Log which scrapers are active
    console.log('🎯 Active scrapers:', this.scrapers.map(s => s.name).join(', '));
    
    this.results = {
      successful: [],
      failed: [],
      totalJobs: 0,
      jobsBySource: {}
    };
  }

  async runAllScrapers() {
    console.log('🚀 Starting job scraping orchestration...');
    console.log(`📊 Running ${this.scrapers.length} scrapers`);
    
    if (this.scrapers.length === 0) {
      console.error('❌ NO SCRAPERS CONFIGURED! Check scraper imports.');
      return this.results;
    }
    
    const promises = this.scrapers.map(async (scraper) => {
      try {
        console.log(`⚡ Starting ${scraper.name} scraper...`);
        const startTime = Date.now();
        
        const result = await scraper.scrapeWithRetry();
        
        // Handle different return types
        let jobs = [];
        if (result && result.jobs) {
          jobs = result.jobs;
        } else if (Array.isArray(result)) {
          jobs = result;
        }
        
        const duration = Date.now() - startTime;
        console.log(`✅ ${scraper.name} completed: ${jobs.length} jobs in ${duration}ms`);
        
        this.results.successful.push({
          scraper: scraper.name,
          jobCount: jobs.length,
          jobs: jobs,
          duration: duration
        });
        
        // Track jobs by source
        this.results.jobsBySource[scraper.name] = jobs.length;
        this.results.totalJobs += jobs.length;
        
        return {
          scraper: scraper.name,
          status: 'success',
          jobs: jobs.length,
          duration: duration
        };
        
      } catch (error) {
        console.error(`❌ ${scraper.name} failed:`, error.message);
        
        this.results.failed.push({
          scraper: scraper.name,
          error: error.message
        });
        
        this.results.jobsBySource[scraper.name] = 0;
        
        return {
          scraper: scraper.name,
          status: 'failed',
          error: error.message
        };
      }
    });

    const results = await Promise.allSettled(promises);
    
    this.printSummary();
    
    return this.results;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SCRAPING SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Total jobs found: ${this.results.totalJobs}`);
    console.log(`✅ Successful scrapers: ${this.results.successful.length}`);
    console.log(`❌ Failed scrapers: ${this.results.failed.length}`);
    
    if (this.results.successful.length > 0) {
      console.log('\n🎯 SUCCESSFUL SCRAPERS:');
      this.results.successful.forEach(result => {
        console.log(`   ${result.scraper}: ${result.jobCount} jobs (${result.duration}ms)`);
      });
    }
    
    if (this.results.failed.length > 0) {
      console.log('\n❌ FAILED SCRAPERS:');
      this.results.failed.forEach(result => {
        console.log(`   ${result.scraper}: ${result.error}`);
      });
    }
    
    // Show job distribution
    console.log('\n📈 JOB DISTRIBUTION:');
    Object.entries(this.results.jobsBySource).forEach(([source, count]) => {
      const percentage = this.results.totalJobs > 0 
        ? ((count / this.results.totalJobs) * 100).toFixed(1)
        : '0.0';
      console.log(`   ${source}: ${count} jobs (${percentage}%)`);
    });
    
    // WARNING if RemoteOK dominates
    if (this.results.jobsBySource['RemoteOK'] > this.results.totalJobs * 0.5) {
      console.log('\n⚠️  WARNING: RemoteOK represents >50% of jobs!');
      console.log('   This means graduates are getting mostly senior roles.');
      console.log('   Fix the graduate scrapers to provide real entry-level jobs!');
    }
    
    console.log('='.repeat(60));
  }

  getAllJobs() {
    const allJobs = [];
    
    this.results.successful.forEach(result => {
      allJobs.push(...result.jobs);
    });
    
    // Remove duplicates based on job_hash
    const uniqueJobs = this.removeDuplicates(allJobs);
    
    console.log(`🔄 Deduplicated: ${allJobs.length} → ${uniqueJobs.length} jobs`);
    
    // Log distribution after deduplication
    const sourceCounts = {};
    uniqueJobs.forEach(job => {
      const source = job.source || 'unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    
    console.log('📊 Final job distribution by source:');
    Object.entries(sourceCounts).forEach(([source, count]) => {
      console.log(`   ${source}: ${count} jobs`);
    });
    
    return uniqueJobs;
  }

  removeDuplicates(jobs) {
    const seen = new Set();
    
    return jobs.filter(job => {
      // Use job_hash if available, otherwise fall back to title+company
      const key = job.job_hash || `${job.title?.toLowerCase()}-${job.company?.toLowerCase()}`;
      
      if (seen.has(key)) {
        return false;
      }
      
      seen.add(key);
      return true;
    });
  }

  // Get summary for API response
  getSummary() {
    return {
      total_jobs: this.results.totalJobs,
      successful_scrapers: this.results.successful.length,
      failed_scrapers: this.results.failed.length,
      job_distribution: this.results.jobsBySource,
      warning: this.results.jobsBySource['RemoteOK'] > this.results.totalJobs * 0.5 
        ? 'RemoteOK dominates job pool - graduates getting senior jobs!'
        : null,
      scrapers: [
        ...this.results.successful.map(s => ({
          name: s.scraper,
          status: 'success',
          jobs: s.jobCount,
          duration: s.duration
        })),
        ...this.results.failed.map(f => ({
          name: f.scraper,
          status: 'failed',
          error: f.error
        }))
      ]
    };
  }
}

module.exports = JobScrapingOrchestrator;
