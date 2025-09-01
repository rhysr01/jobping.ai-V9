#!/usr/bin/env node

/**
 * 🚂 RAILWAY SCRAPER SERVICE
 * Enterprise-level scraper orchestration for JobPing
 * Integrates seamlessly with existing architecture
 */

require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enhanced logging
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

// Service state
let serviceState = {
  status: 'starting',
  uptime: Date.now(),
  lastScrape: null,
  totalScrapes: 0,
  successfulScrapes: 0,
  failedScrapes: 0,
  currentScrape: null
};

// Initialize your existing orchestrator
let orchestrator = null;

async function initializeOrchestrator() {
  try {
    // Import your existing ProductionScraperOrchestrator
    const { ProductionScraperOrchestrator } = require('./production-scraper');
    orchestrator = new ProductionScraperOrchestrator();
    
    // Log Railway configuration
    try {
      const { logConfig } = require('./Utils/railwayConfig');
      logConfig();
    } catch (configError) {
      log(`⚠️ Could not load Railway config: ${configError.message}`, 'yellow');
    }
    
    log('✅ Production Scraper Orchestrator initialized', 'green');
    serviceState.status = 'ready';
  } catch (error) {
    log(`❌ Failed to initialize orchestrator: ${error.message}`, 'red');
    log(`🔧 Attempting fallback initialization...`, 'yellow');
    
    // Fallback: Try to initialize with basic configuration
    try {
      const { ProductionScraperOrchestrator } = require('./production-scraper');
      orchestrator = new ProductionScraperOrchestrator();
      
      // Override configuration for Railway
      process.env.DISABLE_PUPPETEER = 'true';
      process.env.ENABLE_BROWSER_POOL = 'false';
      process.env.ENABLE_RATE_LIMITING = 'true';
      process.env.SCRAPER_REQUESTS_PER_MINUTE = '12';
      process.env.SCRAPER_REQUESTS_PER_HOUR = '360';
      
      log('✅ Production Scraper Orchestrator initialized with Railway fallback', 'green');
      serviceState.status = 'ready';
    } catch (fallbackError) {
      log(`❌ Fallback initialization also failed: ${fallbackError.message}`, 'red');
      serviceState.status = 'error';
    }
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  const uptime = Date.now() - serviceState.uptime;
  const uptimeMinutes = Math.floor(uptime / 60000);
  
  res.json({
    status: serviceState.status,
    service: 'jobping-railway-scrapers',
    uptime: `${uptimeMinutes} minutes`,
    lastScrape: serviceState.lastScrape,
    stats: {
      total: serviceState.totalScrapes,
      successful: serviceState.successfulScrapes,
      failed: serviceState.failedScrapes
    },
    timestamp: new Date().toISOString()
  });
});

// Manual scrape trigger
app.post('/scrape', async (req, res) => {
  log('🚀 Manual scrape triggered', 'blue');
  
  if (serviceState.currentScrape) {
    return res.status(409).json({
      error: 'Scrape already in progress',
      currentScrape: serviceState.currentScrape
    });
  }

  try {
    serviceState.currentScrape = {
      id: Date.now().toString(),
      started: new Date().toISOString(),
      type: 'manual'
    };

    // Use your existing orchestrator
    if (orchestrator) {
      await orchestrator.runScrapingCycle();
    } else {
      // Fallback to direct script execution
      await runScrapingScript();
    }

    serviceState.totalScrapes++;
    serviceState.successfulScrapes++;
    serviceState.lastScrape = new Date().toISOString();
    
    res.json({
      success: true,
      message: 'Scraping completed successfully',
      scrapeId: serviceState.currentScrape.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    serviceState.totalScrapes++;
    serviceState.failedScrapes++;
    
    log(`❌ Manual scrape failed: ${error.message}`, 'red');
    res.status(500).json({
      error: 'Scraping failed',
      message: error.message
    });
  } finally {
    serviceState.currentScrape = null;
  }
});

// Get scraping status
app.get('/status', async (req, res) => {
  // Get scraper rate limiting stats
  let rateLimitStats = {};
  try {
    const { productionRateLimiter } = require('./Utils/productionRateLimiter');
    rateLimitStats = productionRateLimiter.getScraperStats();
  } catch (error) {
    log('Failed to get rate limit stats: ' + error.message, 'yellow');
    rateLimitStats = { error: 'Stats unavailable' };
  }
  
  res.json({
    service: 'jobping-railway-scrapers',
    status: serviceState.status,
    currentScrape: serviceState.currentScrape,
    stats: {
      total: serviceState.totalScrapes,
      successful: serviceState.successfulScrapes,
      failed: serviceState.failedScrapes,
      successRate: serviceState.totalScrapes > 0 
        ? ((serviceState.successfulScrapes / serviceState.totalScrapes) * 100).toFixed(1) + '%'
        : '0%'
    },
    rateLimiting: rateLimitStats,
    uptime: Date.now() - serviceState.uptime,
    timestamp: new Date().toISOString()
  });
});

// Run scraping script (fallback method)
async function runScrapingScript() {
  return new Promise((resolve, reject) => {
    log('🔄 Running production scraper script...', 'cyan');
    
    const child = spawn('node', ['production-scraper.js', '--once'], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
      log(`📊 Scraper: ${data.toString().trim()}`, 'cyan');
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
      log(`⚠️ Scraper Error: ${data.toString().trim()}`, 'yellow');
    });

    child.on('close', (code) => {
      if (code === 0) {
        log('✅ Scraping script completed successfully', 'green');
        resolve();
      } else {
        log(`❌ Scraping script failed with code ${code}`, 'red');
        reject(new Error(`Script failed with code ${code}: ${errorOutput}`));
      }
    });

    child.on('error', (error) => {
      log(`❌ Failed to start scraping script: ${error.message}`, 'red');
      reject(error);
    });
  });
}

// Scheduled scraping using your existing orchestrator
async function runScheduledScrape() {
  if (serviceState.currentScrape) {
    log('⏸️ Skipping scheduled scrape - one already in progress', 'yellow');
    return;
  }

  log('⏰ Running scheduled scrape...', 'blue');
  
  try {
    serviceState.currentScrape = {
      id: Date.now().toString(),
      started: new Date().toISOString(),
      type: 'scheduled'
    };

    if (orchestrator) {
      await orchestrator.runScrapingCycle();
    } else {
      await runScrapingScript();
    }

    serviceState.totalScrapes++;
    serviceState.successfulScrapes++;
    serviceState.lastScrape = new Date().toISOString();
    
    log('✅ Scheduled scrape completed successfully', 'green');
  } catch (error) {
    serviceState.totalScrapes++;
    serviceState.failedScrapes++;
    
    log(`❌ Scheduled scrape failed: ${error.message}`, 'red');
  } finally {
    serviceState.currentScrape = null;
  }
}

// Health check function
async function runHealthCheck() {
  try {
    log('🏥 Running health check...', 'cyan');
    
    const child = spawn('node', ['scripts/health-check.js'], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    child.stdout.on('data', (data) => {
      log(`🏥 Health: ${data.toString().trim()}`, 'cyan');
    });

    child.stderr.on('data', (data) => {
      log(`⚠️ Health Error: ${data.toString().trim()}`, 'yellow');
    });

    child.on('close', (code) => {
      if (code === 0) {
        log('✅ Health check completed', 'green');
      } else {
        log(`❌ Health check failed with code ${code}`, 'red');
      }
    });
  } catch (error) {
    log(`❌ Health check error: ${error.message}`, 'red');
  }
}

// Initialize service
async function initializeService() {
  log('🚂 Initializing JobPing Railway Scraper Service...', 'blue');
  
  // Initialize orchestrator
  await initializeOrchestrator();
  
  // Schedule scrapes every hour
  cron.schedule('0 * * * *', runScheduledScrape);
  log('⏰ Scheduled scraping every hour (0 * * * *)', 'green');
  
  // Health checks every 5 minutes
  cron.schedule('*/5 * * * *', runHealthCheck);
  log('🏥 Health checks every 5 minutes', 'green');
  
  // Run initial health check
  setTimeout(runHealthCheck, 10000); // 10 seconds after startup
  
  log('✅ Railway scraper service initialized successfully', 'green');
}

// Start server
app.listen(PORT, () => {
  log(`🚂 Railway scraper service running on port ${PORT}`, 'green');
  log(`🏥 Health check: http://localhost:${PORT}/health`, 'cyan');
  log(`🎯 Manual scrape: POST http://localhost:${PORT}/scrape`, 'cyan');
  log(`📊 Status: GET http://localhost:${PORT}/status`, 'cyan');
  
  // Initialize service after server starts
  initializeService();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('🛑 Received SIGTERM, shutting down gracefully...', 'yellow');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('🛑 Received SIGINT, shutting down gracefully...', 'yellow');
  process.exit(0);
});
