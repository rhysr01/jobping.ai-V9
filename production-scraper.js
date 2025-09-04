#!/usr/bin/env node

// 🚀 PRODUCTION SCRAPER SYSTEM
// Bulletproof, reliable, high-volume job scraping for JobPing

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  SCRAPING_INTERVAL_MINUTES: process.env.SCRAPING_INTERVAL_MINUTES || 60,
  MAX_CONCURRENT_SCRAPERS: process.env.MAX_CONCURRENT_SCRAPERS || 3,
  REQUEST_TIMEOUT_MS: process.env.REQUEST_TIMEOUT_MS || 30000, // Increased timeout
  ENABLE_PROXY: process.env.ENABLE_PROXY === 'true',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  ENABLE_MONITORING: process.env.ENABLE_MONITORING === 'true',
  API_BASE_URL: process.env.RAILWAY_STATIC_URL || process.env.NEXT_PUBLIC_URL || 'http://localhost:3002',
  API_KEY: process.env.JOBPING_API_KEY || '',
  // Railway-specific settings
  IS_RAILWAY: process.env.RAILWAY_ENVIRONMENT === 'production',
  DISABLE_PUPPETEER: process.env.DISABLE_PUPPETEER === 'true' || process.env.RAILWAY_ENVIRONMENT === 'production',
  // Rate limiting settings
  ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING !== 'false',
  SCRAPER_RPM: parseInt(process.env.SCRAPER_REQUESTS_PER_MINUTE || '12'),
  SCRAPER_RPH: parseInt(process.env.SCRAPER_REQUESTS_PER_HOUR || '360')
};

// Logging system
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLogLevel = LOG_LEVELS[CONFIG.LOG_LEVEL] || 1;

function log(level, message, data = null) {
  if (LOG_LEVELS[level] >= currentLogLevel) {
    const timestamp = new Date().toISOString();
    const prefix = {
      debug: '🔍',
      info: '📊',
      warn: '⚠️',
      error: '❌'
    }[level];
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
    if (data && level === 'debug') {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

// Production-grade scraper orchestrator
class ProductionScraperOrchestrator {
  constructor() {
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalJobsFound: 0,
      lastRunTime: null,
      uptime: Date.now()
    };
    
    this.isRunning = false;
    this.intervalId = null;
  }

  async start() {
    log('info', '🚀 Starting Production Scraper System');
    log('info', `📋 Config: ${CONFIG.SCRAPING_INTERVAL_MINUTES}min intervals, ${CONFIG.MAX_CONCURRENT_SCRAPERS} concurrent`);
    
    // Log Railway configuration
    if (CONFIG.IS_RAILWAY) {
      log('info', '🚂 Railway environment detected');
      log('info', `📊 Rate limiting: ${CONFIG.ENABLE_RATE_LIMITING ? 'enabled' : 'disabled'}`);
      log('info', `📊 Requests/min: ${CONFIG.SCRAPER_RPM}, Requests/hour: ${CONFIG.SCRAPER_RPH}`);
    }
    
    // Run once immediately
    await this.runScrapingCycle();
    
    // Schedule regular runs
    if (!process.argv.includes('--once')) {
      this.intervalId = setInterval(() => {
        this.runScrapingCycle();
      }, CONFIG.SCRAPING_INTERVAL_MINUTES * 60 * 1000);
      
      log('info', `⏰ Scheduled scraping every ${CONFIG.SCRAPING_INTERVAL_MINUTES} minutes`);
    } else {
      log('info', '🎯 Single run mode - exiting after completion');
      process.exit(0);
    }
  }

  async runScrapingCycle() {
    if (this.isRunning) {
      log('warn', '⏸️ Scraping cycle already running, skipping...');
      return;
    }

    this.isRunning = true;
    this.stats.totalRuns++;
    this.stats.lastRunTime = new Date().toISOString();
    
    const cycleStart = Date.now();
    const memoryBefore = process.memoryUsage();
    
    log('info', `🔄 Starting scraping cycle #${this.stats.totalRuns}`);
    
    try {
      // Use resilient orchestrator for graceful degradation
      const results = await this.runResilientScraping();
      
      const cycleDuration = Date.now() - cycleStart;
      const memoryAfter = process.memoryUsage();
      
      if (results.success) {
        this.stats.successfulRuns++;
        this.stats.totalJobsFound += results.totalJobs;
        
        log('info', `✅ Cycle completed: ${results.totalJobs} jobs found in ${cycleDuration}ms`);
        log('debug', `Memory usage: ${Math.round(memoryAfter.heapUsed / 1024 / 1024)}MB heap`);
        
        if (results.fallbackUsed) {
          log('warn', `⚠️ Fallback strategies were used to ensure job availability`);
        }
        
        this.logStats();
        
        // Log performance metrics
        this.logPerformanceMetrics({
          duration: cycleDuration,
          jobsFound: results.totalJobs,
          memoryUsed: memoryAfter.heapUsed,
          success: true,
          fallbackUsed: results.fallbackUsed
        });
      } else {
        this.stats.failedRuns++;
        log('error', `❌ Cycle failed: ${results.errors?.join(', ') || 'Unknown error'}`);
        
        this.logPerformanceMetrics({
          duration: cycleDuration,
          jobsFound: 0,
          memoryUsed: memoryAfter.heapUsed,
          success: false,
          error: results.errors?.join(', ') || 'Unknown error'
        });
      }
      
    } catch (error) {
      this.stats.failedRuns++;
      const cycleDuration = Date.now() - cycleStart;
      log('error', `💥 Cycle crashed: ${error.message}`);
      
      this.logPerformanceMetrics({
        duration: cycleDuration,
        jobsFound: 0,
        memoryUsed: process.memoryUsage().heapUsed,
        success: false,
        error: error.message
      });
    } finally {
      this.isRunning = false;
    }
  }

  async runResilientScraping() {
    log('info', '🔄 Running resilient scraping with graceful degradation...');
    
    try {
      // Try reliable scrapers first
      const reliableResults = await this.runReliableScrapers();
      
      if (reliableResults.success && reliableResults.totalJobs >= 50) {
        log('info', `✅ Reliable scrapers succeeded with ${reliableResults.totalJobs} jobs`);
        return {
          ...reliableResults,
          fallbackUsed: false
        };
      }
      
      // If reliable scrapers failed or insufficient jobs, try individual scrapers
      log('warn', `⚠️ Reliable scrapers ${reliableResults.success ? 'insufficient' : 'failed'}, trying individual scrapers...`);
      
      const individualResults = await this.runIndividualScrapers();
      
      if (individualResults.success && individualResults.totalJobs > 0) {
        log('info', `✅ Individual scrapers succeeded with ${individualResults.totalJobs} jobs`);
        return {
          ...individualResults,
          fallbackUsed: true
        };
      }
      
      // If all else fails, try emergency backfill
      log('warn', '🚨 All scraping strategies failed, attempting emergency backfill...');
      
      const emergencyResults = await this.emergencyJobBackfill();
      
      if (emergencyResults.success && emergencyResults.totalJobs > 0) {
        log('info', `✅ Emergency backfill succeeded with ${emergencyResults.totalJobs} jobs`);
        return {
          ...emergencyResults,
          fallbackUsed: true
        };
      }
      
      // Complete failure
      return {
        success: false,
        totalJobs: 0,
        error: 'All scraping strategies and fallbacks failed',
        errors: ['reliable_scrapers_failed', 'individual_scrapers_failed', 'emergency_backfill_failed']
      };
      
    } catch (error) {
      log('error', `💥 Resilient scraping failed: ${error.message}`);
      return {
        success: false,
        totalJobs: 0,
        error: error.message,
        errors: [error.message]
      };
    }
  }

  async runReliableScrapers() {
    log('info', '📡 Executing reliable scrapers...');
    
    try {
      const response = await axios.post(`${CONFIG.API_BASE_URL}/api/scrape`, {
        platforms: ['all'],
        companies: []
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CONFIG.API_KEY
        },
        timeout: CONFIG.REQUEST_TIMEOUT_MS
      });

      if (response.data.success) {
        const reliableResults = response.data.results.reliable;
        
        if (reliableResults.success) {
          return {
            success: true,
            totalJobs: reliableResults.jobs?.length || 0,
            inserted: reliableResults.inserted || 0,
            updated: reliableResults.updated || 0
          };
        } else {
          return {
            success: false,
            error: `Reliable scraper failed: ${reliableResults.errors?.join(', ') || 'Unknown error'}`
          };
        }
      } else {
        return {
          success: false,
          error: 'API request failed'
        };
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async runIndividualScrapers() {
    log('info', '🔧 Running individual scrapers...');
    
    const individualResults = [];
    let totalJobs = 0;
    
    try {
      // Try individual scraper endpoints
      const scrapers = ['greenhouse', 'lever', 'workday'];
      
      for (const scraper of scrapers) {
        try {
          const response = await axios.post(`${CONFIG.API_BASE_URL}/api/scrape/${scraper}`, {
            companies: []
          }, {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': CONFIG.API_KEY
            },
            timeout: CONFIG.REQUEST_TIMEOUT_MS
          });

          if (response.data.success && response.data.jobs) {
            individualResults.push(...response.data.jobs);
            totalJobs += response.data.jobs.length;
            log('info', `✅ ${scraper} scraper: ${response.data.jobs.length} jobs`);
          }
          
        } catch (error: any) {
          log('warn', `⚠️ ${scraper} scraper failed: ${error.message}`);
        }
      }
      
      if (totalJobs > 0) {
        return {
          success: true,
          totalJobs,
          jobs: individualResults
        };
      } else {
        return {
          success: false,
          error: 'All individual scrapers failed'
        };
      }
      
    } catch (error: any) {
      log('error', `❌ Individual scrapers failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async emergencyJobBackfill() {
    log('info', '🚨 Running emergency job backfill...');
    
    try {
      // Try to get jobs from backup sources or recent database
      const response = await axios.get(`${CONFIG.API_BASE_URL}/api/jobs/recent`, {
        headers: {
          'x-api-key': CONFIG.API_KEY
        },
        timeout: CONFIG.REQUEST_TIMEOUT_MS
      });

      if (response.data.success && response.data.jobs) {
        const recentJobs = response.data.jobs;
        log('info', `✅ Emergency backfill: ${recentJobs.length} recent jobs from database`);
        
        return {
          success: true,
          totalJobs: recentJobs.length,
          jobs: recentJobs
        };
      } else {
        throw new Error('Emergency backfill API returned failure');
      }
      
    } catch (error: any) {
      log('error', `❌ Emergency backfill failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
      }
  }

  logStats() {
    const uptime = Math.floor((Date.now() - this.stats.uptime) / 1000 / 60); // minutes
    const successRate = this.stats.totalRuns > 0 
      ? Math.round((this.stats.successfulRuns / this.stats.totalRuns) * 100) 
      : 0;
    
    log('info', `📊 Stats: ${this.stats.totalJobsFound} total jobs, ${successRate}% success rate, ${uptime}min uptime`);
    
    // Write stats to file for monitoring
    if (CONFIG.ENABLE_MONITORING) {
      const statsFile = path.join(__dirname, 'scraper-stats.json');
      fs.writeFileSync(statsFile, JSON.stringify({
        ...this.stats,
        uptime: uptime,
        successRate: successRate,
        lastUpdated: new Date().toISOString()
      }, null, 2));
    }
  }

  logPerformanceMetrics(metrics) {
    const timestamp = new Date().toISOString();
    
    // Log to console in debug mode
    if (CONFIG.LOG_LEVEL === 'debug') {
      log('debug', `Performance: ${metrics.duration}ms, ${metrics.jobsFound} jobs, ${Math.round(metrics.memoryUsed / 1024 / 1024)}MB`);
    }
    
    // Write detailed metrics to file
    if (CONFIG.ENABLE_MONITORING) {
      const metricsFile = path.join(__dirname, 'performance-metrics.jsonl');
      const metricsEntry = JSON.stringify({
        timestamp,
        ...metrics,
        memoryUsedMB: Math.round(metrics.memoryUsed / 1024 / 1024)
      }) + '\n';
      
      try {
        fs.appendFileSync(metricsFile, metricsEntry);
        
        // Rotate metrics file if it gets too large (>5MB)
        const stats = fs.statSync(metricsFile);
        if (stats.size > 5 * 1024 * 1024) {
          const archiveFile = metricsFile.replace('.jsonl', `-${timestamp.replace(/[:.]/g, '-')}.jsonl`);
          fs.renameSync(metricsFile, archiveFile);
        }
      } catch (error) {
        log('warn', `Failed to write performance metrics: ${error.message}`);
      }
    }
  }

  async healthCheck() {
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/api/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    log('info', '🛑 Production scraper stopped');
  }
}

// Enhanced monitoring and alerts
class ProductionMonitor {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.alertThresholds = {
      maxFailures: 3,
      maxResponseTime: 30000,
      minSuccessRate: 50
    };
    this.healthChecks = [];
    this.lastHealthCheck = 0;
  }

  checkHealth() {
    const stats = this.orchestrator.stats;
    const successRate = stats.totalRuns > 0 
      ? (stats.successfulRuns / stats.totalRuns) * 100 
      : 100;

    // Critical alerts
    if (stats.failedRuns >= this.alertThresholds.maxFailures) {
      this.sendAlert('🔴 CRITICAL', `${stats.failedRuns} consecutive failures`);
    }
    
    // Warning alerts  
    if (successRate < this.alertThresholds.minSuccessRate && stats.totalRuns >= 5) {
      this.sendAlert('🟡 WARNING', `Success rate dropped to ${successRate.toFixed(1)}%`);
    }
    
    // Healthy status
    if (successRate >= 90 && stats.totalJobsFound > 0) {
      log('debug', '🟢 All systems healthy');
    }
  }

  sendAlert(level, message) {
    log('warn', `${level}: ${message}`);
    
    // In production, send to Slack/email/monitoring service
    if (CONFIG.ENABLE_MONITORING) {
      // TODO: Integrate with your monitoring service
      console.log(`ALERT: ${level} - ${message}`);
    }
  }
}

// Anti-detection and proxy management
class ProxyManager {
  constructor() {
    this.proxies = [
      // Add your proxy URLs here
      process.env.BRIGHTDATA_PROXY_URL,
      // Add more proxy services as needed
    ].filter(Boolean);
    
    this.currentProxyIndex = 0;
  }

  getNextProxy() {
    if (this.proxies.length === 0) return null;
    
    const proxy = this.proxies[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
    
    return proxy;
  }

  getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0'
    ];
    
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }
}

// Main execution
async function main() {
  log('info', '🎯 JobPing Production Scraper v1.0');
  log('info', `📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  try {
    const orchestrator = new ProductionScraperOrchestrator();
    const monitor = new ProductionMonitor(orchestrator);
    const proxyManager = new ProxyManager();
    
    // Health check before starting
    const isHealthy = await orchestrator.healthCheck();
    if (!isHealthy) {
      log('error', '💔 API health check failed - cannot start scraper');
      process.exit(1);
    }
    
    log('info', '💚 API health check passed');
    
    // Start monitoring
    if (CONFIG.ENABLE_MONITORING) {
      setInterval(() => {
        monitor.checkHealth();
      }, 5 * 60 * 1000); // Check every 5 minutes
    }
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      log('info', '📪 Received SIGINT - shutting down gracefully...');
      orchestrator.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      log('info', '📪 Received SIGTERM - shutting down gracefully...');
      orchestrator.stop();
      process.exit(0);
    });
    
    // Start the production scraper
    await orchestrator.start();
    
  } catch (error) {
    log('error', '💥 Failed to start scraper:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  ProductionScraperOrchestrator,
  ProductionMonitor,
  ProxyManager
};
