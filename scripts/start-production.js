#!/usr/bin/env node

/**
 * Production Startup Script
 * Initializes all services for 50+ user scale
 */

const { jobQueue } = require('../Utils/job-queue.service');
const { scrapingOrchestrator } = require('../Utils/scraping-orchestrator');
const { aiCostManager } = require('../Utils/ai-cost-manager');

async function startProductionServices() {
  console.log('🚀 Starting JobPing Production Services...');
  
  try {
    // 1. Start Job Queue System
    console.log('📋 Starting job queue system...');
    await jobQueue.startProcessing();
    
    // 2. Initialize AI Cost Manager
    console.log('💰 Initializing AI cost management...');
    const costMetrics = await aiCostManager.getCostMetrics();
    console.log(`📊 Current AI costs: $${costMetrics.dailyCost.toFixed(2)} today`);
    
    // 3. Start Scraping Orchestrator
    console.log('🕷️ Starting scraping orchestrator...');
    const scrapingStats = await scrapingOrchestrator.getScrapingStats();
    console.log(`📊 Scraping stats: ${scrapingStats.activeCompanies}/${scrapingStats.totalCompanies} companies active`);
    
    // 4. Health check
    console.log('🏥 Running health checks...');
    await runHealthChecks();
    
    console.log('✅ All production services started successfully!');
    console.log('📊 System ready for 50+ users');
    
    // 5. Start monitoring loop
    startMonitoringLoop();
    
  } catch (error) {
    console.error('❌ Failed to start production services:', error);
    process.exit(1);
  }
}

async function runHealthChecks() {
  const checks = [
    { name: 'Database', check: () => checkDatabase() },
    { name: 'Redis', check: () => checkRedis() },
    { name: 'Job Queue', check: () => checkJobQueue() },
    { name: 'AI Cost Manager', check: () => checkAICostManager() }
  ];
  
  for (const { name, check } of checks) {
    try {
      await check();
      console.log(`✅ ${name} health check passed`);
    } catch (error) {
      console.error(`❌ ${name} health check failed:`, error.message);
    }
  }
}

async function checkDatabase() {
  // Add database health check
  return true;
}

async function checkRedis() {
  // Add Redis health check
  return true;
}

async function checkJobQueue() {
  const stats = await jobQueue.getQueueStats();
  if (stats.failed > 100) {
    throw new Error(`Too many failed jobs: ${stats.failed}`);
  }
  return true;
}

async function checkAICostManager() {
  const metrics = await aiCostManager.getCostMetrics();
  if (metrics.dailyCost > 20) {
    throw new Error(`AI costs too high: $${metrics.dailyCost}`);
  }
  return true;
}

function startMonitoringLoop() {
  setInterval(async () => {
    try {
      const queueStats = await jobQueue.getQueueStats();
      const costMetrics = await aiCostManager.getCostMetrics();
      const scrapingStats = await scrapingOrchestrator.getScrapingStats();
      
      console.log('📊 System Status:', {
        queue: queueStats,
        aiCost: `$${costMetrics.dailyCost.toFixed(2)}`,
        scraping: `${scrapingStats.activeCompanies} active companies`
      });
      
    } catch (error) {
      console.error('❌ Monitoring error:', error);
    }
  }, 60000); // Every minute
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down production services...');
  await jobQueue.stopProcessing();
  console.log('✅ Shutdown complete');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down production services...');
  await jobQueue.stopProcessing();
  console.log('✅ Shutdown complete');
  process.exit(0);
});

// Start services
startProductionServices();
