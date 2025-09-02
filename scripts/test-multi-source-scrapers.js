#!/usr/bin/env node

/**
 * Test script for the new multi-source scraper system
 * Demonstrates Adzuna, Reed, and InfoJobs scrapers with shared design patterns
 */

const { MultiSourceOrchestrator } = require('../scrapers/multi-source-orchestrator.ts');
const AdzunaScraper = require('../scrapers/adzuna-scraper.ts').default;
const ReedScraper = require('../scrapers/reed-scraper.ts').default;
const InfoJobsScraper = require('../scrapers/infojobs-scraper.ts').default;

async function testIndividualScrapers() {
  console.log('🧪 Testing individual scrapers...\n');

  // Test Adzuna scraper
  console.log('📍 Testing Adzuna scraper...');
  try {
    const adzunaScraper = new AdzunaScraper();
    
    // Check daily stats
    const stats = adzunaScraper.getDailyStats();
    console.log('📊 Adzuna daily stats:', stats);
    
    // Test single city scrape (London)
    console.log('🔄 Scraping London with Adzuna...');
    const londonResult = await adzunaScraper.scrapeSingleCity('London');
    console.log(`✅ London: ${londonResult.jobs.length} jobs found`);
    console.log('📈 Metrics:', londonResult.metrics);
    
  } catch (error) {
    console.error('❌ Adzuna test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test Reed scraper
  console.log('📍 Testing Reed scraper...');
  try {
    const reedScraper = new ReedScraper();
    
    // Check status
    const status = reedScraper.getStatus();
    console.log('📊 Reed status:', status);
    
    // Test London scrape
    console.log('🔄 Scraping London with Reed...');
    const reedResult = await reedScraper.scrapeLondon();
    console.log(`✅ Reed: ${reedResult.jobs.length} jobs found`);
    console.log('📈 Metrics:', reedResult.metrics);
    
  } catch (error) {
    console.error('❌ Reed test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test InfoJobs scraper
  console.log('📍 Testing InfoJobs scraper...');
  try {
    const infojobsScraper = new InfoJobsScraper();
    
    // Check status
    const status = infojobsScraper.getStatus();
    console.log('📊 InfoJobs status:', status);
    
    // Test single city scrape (Madrid)
    console.log('🔄 Scraping Madrid with InfoJobs...');
    const madridResult = await infojobsScraper.scrapeSingleCity('Madrid');
    console.log(`✅ Madrid: ${madridResult.jobs.length} jobs found`);
    console.log('📈 Metrics:', madridResult.metrics);
    
  } catch (error) {
    console.error('❌ InfoJobs test failed:', error.message);
  }
}

async function testMultiSourceOrchestrator() {
  console.log('\n🎯 Testing Multi-Source Orchestrator...\n');

  try {
    const orchestrator = new MultiSourceOrchestrator();
    
    // Check initial status
    const status = orchestrator.getStatus();
    console.log('📊 Initial status:', {
      isRunning: status.isRunning,
      seenJobsCount: status.seenJobsCount,
      adzunaStatus: status.adzunaStatus,
      reedStatus: status.reedStatus,
      infojobsStatus: status.infojobsStatus
    });

    // Test single source scraping
    console.log('\n🔄 Testing single source scraping (Adzuna)...');
    const adzunaResult = await orchestrator.runSingleSource('adzuna');
    console.log(`✅ Adzuna: ${adzunaResult.jobs.length} jobs processed`);
    console.log('📈 Metrics:', adzunaResult.metrics);

    // Check updated status
    const updatedStatus = orchestrator.getStatus();
    console.log('\n📊 Updated status:', {
      seenJobsCount: updatedStatus.seenJobsCount,
      lastRun: updatedStatus.lastRun ? {
        totalJobs: updatedStatus.lastRun.totalJobs,
        newJobs: updatedStatus.lastRun.newJobs,
        earlyCareerTagged: updatedStatus.lastRun.earlyCareerTagged
      } : null
    });

    // Get coverage report
    const coverage = orchestrator.getCoverageReport();
    console.log('\n📊 Coverage Report:', {
      cities: Object.keys(coverage.cities).length,
      sources: Object.keys(coverage.sources).length,
      earlyCareerPercentage: coverage.earlyCareerPercentage.toFixed(1) + '%'
    });

    // Get recent metrics
    const metrics = orchestrator.getMetrics(3);
    console.log('\n📈 Recent metrics:', metrics.map(m => ({
      timestamp: m.timestamp,
      totalJobs: m.totalJobs,
      newJobs: m.newJobs,
      earlyCareerTagged: m.earlyCareerTagged
    })));

  } catch (error) {
    console.error('❌ Multi-source orchestrator test failed:', error.message);
  }
}

async function testFullScrape() {
  console.log('\n🚀 Testing full multi-source scrape...\n');

  try {
    const orchestrator = new MultiSourceOrchestrator();
    
    console.log('🔄 Running full scrape (all sources)...');
    const startTime = Date.now();
    
    const result = await orchestrator.runFullScrape();
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Full scrape completed in ${duration}ms`);
    console.log(`📊 Results: ${result.jobs.length} jobs, ${result.metrics.duplicates} duplicates`);
    console.log(`🎯 Early-career jobs: ${result.metrics.earlyCareerTagged}`);
    console.log(`🌍 Cities covered: ${Object.keys(result.metrics.perCityCoverage).length}`);
    
    // Show sample jobs
    if (result.jobs.length > 0) {
      console.log('\n📋 Sample jobs:');
      result.jobs.slice(0, 3).forEach((job, index) => {
        console.log(`${index + 1}. ${job.title} at ${job.company} (${job.location})`);
        console.log(`   Categories: ${job.categories?.join(', ')}`);
        console.log(`   Experience: ${job.experience_required}`);
        console.log(`   Source: ${job.source}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Full scrape test failed:', error.message);
  }
}

async function main() {
  console.log('🚀 Multi-Source Scraper Test Suite\n');
  console.log('This script tests the new scraper system with:');
  console.log('• Adzuna (10 European cities, track rotation)');
  console.log('• Reed (London focus, UK business hours)');
  console.log('• InfoJobs (Madrid/Barcelona, hourly rotation)');
  console.log('• Multi-source orchestrator with shared patterns\n');

  try {
    // Test individual scrapers
    await testIndividualScrapers();
    
    // Test multi-source orchestrator
    await testMultiSourceOrchestrator();
    
    // Test full scrape (comment out if you want to avoid hitting APIs)
    // await testFullScrape();
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the test suite
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testIndividualScrapers,
  testMultiSourceOrchestrator,
  testFullScrape
};
