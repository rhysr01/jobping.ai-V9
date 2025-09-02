#!/usr/bin/env node

/**
 * Test script for the updated multi-source orchestrator
 * Uses standalone scrapers to avoid module resolution issues
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Testing Updated Multi-Source Orchestrator\n');

// Test orchestrator instantiation
async function testOrchestratorInstantiation() {
  console.log('📍 Testing orchestrator instantiation...');
  
  return new Promise((resolve) => {
    const testCode = `
      import 'dotenv/config';
      import MultiSourceOrchestrator from '../scrapers/multi-source-orchestrator.ts';
      
      try {
        const orchestrator = new MultiSourceOrchestrator();
        console.log('✅ Multi-Source Orchestrator instantiated successfully');
        
        const status = orchestrator.getStatus();
        console.log('📊 Status:', status);
        
        console.log('✅ Orchestrator instantiation test passed');
      } catch (error) {
        console.error('❌ Orchestrator instantiation test failed:', error.message);
        process.exit(1);
      }
    `;
    
    const tempFile = path.join(__dirname, 'temp-orchestrator-test.js');
    require('fs').writeFileSync(tempFile, testCode);
    
    const child = spawn('npx', ['tsx', tempFile], { 
      stdio: 'pipe',
      cwd: __dirname 
    });
    
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    child.on('close', (code) => {
      require('fs').unlinkSync(tempFile);
      console.log(output);
      resolve(code === 0);
    });
  });
}

// Test single source scraping
async function testSingleSourceScraping() {
  console.log('📍 Testing single source scraping (Reed)...');
  
  return new Promise((resolve) => {
    const testCode = `
      import 'dotenv/config';
      import MultiSourceOrchestrator from '../scrapers/multi-source-orchestrator.ts';
      
      (async () => {
        try {
          const orchestrator = new MultiSourceOrchestrator();
          console.log('✅ Orchestrator ready');
          
          console.log('🔄 Testing Reed scraper...');
          const result = await orchestrator.runSingleSource('reed');
          
          console.log('✅ Reed scraping completed');
          console.log('📊 Results:', {
            jobsFound: result.jobs.length,
            metrics: result.metrics
          });
          
          if (result.jobs.length > 0) {
            console.log('📋 Sample job:', {
              title: result.jobs[0].title,
              company: result.jobs[0].company,
              location: result.jobs[0].location,
              source: result.jobs[0].source
            });
          }
          
          console.log('✅ Single source scraping test passed');
        } catch (error) {
          console.error('❌ Single source scraping test failed:', error.message);
          process.exit(1);
        }
      })();
    `;
    
    const tempFile = path.join(__dirname, 'temp-single-source-test.js');
    require('fs').writeFileSync(tempFile, testCode);
    
    const child = spawn('npx', ['tsx', tempFile], { 
      stdio: 'pipe',
      cwd: __dirname 
    });
    
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    child.on('close', (code) => {
      require('fs').unlinkSync(tempFile);
      console.log(output);
      resolve(code === 0);
    });
  });
}

// Test orchestrator status and metrics
async function testOrchestratorStatus() {
  console.log('📍 Testing orchestrator status and metrics...');
  
  return new Promise((resolve) => {
    const testCode = `
      import 'dotenv/config';
      import MultiSourceOrchestrator from '../scrapers/multi-source-orchestrator.ts';
      
      try {
        const orchestrator = new MultiSourceOrchestrator();
        console.log('✅ Orchestrator ready');
        
        const status = orchestrator.getStatus();
        console.log('📊 Full Status:', status);
        
        const coverage = orchestrator.getCoverageReport();
        console.log('📊 Coverage Report:', coverage);
        
        const metrics = orchestrator.getMetrics(3);
        console.log('📊 Recent Metrics:', metrics);
        
        console.log('✅ Status and metrics test passed');
      } catch (error) {
        console.error('❌ Status and metrics test failed:', error.message);
        process.exit(1);
      }
    `;
    
    const tempFile = path.join(__dirname, 'temp-status-test.js');
    require('fs').writeFileSync(tempFile, testCode);
    
    const child = spawn('npx', ['tsx', tempFile], { 
      stdio: 'pipe',
      cwd: __dirname 
    });
    
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    child.on('close', (code) => {
      require('fs').unlinkSync(tempFile);
      console.log(output);
      resolve(code === 0);
    });
  });
}

async function main() {
  console.log('🧪 Running updated orchestrator tests...\n');
  
  const results = [];
  
  // Test orchestrator instantiation
  results.push(await testOrchestratorInstantiation());
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test single source scraping
  results.push(await testSingleSourceScraping());
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test status and metrics
  results.push(await testOrchestratorStatus());
  
  // Summary
  console.log('\n🎯 Updated Orchestrator Test Results Summary:');
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All updated orchestrator tests passed!');
    console.log('The multi-source orchestrator is now working with standalone scrapers.');
    console.log('\n📝 Next steps:');
    console.log('• Use the existing scheduling infrastructure');
    console.log('• Run full multi-source scraping');
    console.log('• Integrate with production scraper system');
  } else {
    console.log('\n💥 Some tests failed. Check the output above for details.');
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testOrchestratorInstantiation,
  testSingleSourceScraping,
  testOrchestratorStatus
};
