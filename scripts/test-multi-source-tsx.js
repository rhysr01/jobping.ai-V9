#!/usr/bin/env node

/**
 * Test script using tsx to run TypeScript scrapers directly
 * Tests actual functionality of the multi-source scraper system
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Testing Multi-Source Scrapers with tsx\n');

// Test individual scrapers
async function testAdzunaScraper() {
  console.log('📍 Testing Adzuna scraper...');
  
  return new Promise((resolve) => {
    const testCode = `
      import AdzunaScraper from '../scrapers/adzuna-scraper.ts';
      
      try {
        const scraper = new AdzunaScraper();
        console.log('✅ Adzuna scraper instantiated successfully');
        
        const stats = scraper.getDailyStats();
        console.log('📊 Daily stats:', stats);
        
        console.log('✅ Adzuna scraper test passed');
      } catch (error) {
        console.error('❌ Adzuna scraper test failed:', error.message);
        process.exit(1);
      }
    `;
    
    const tempFile = path.join(__dirname, 'temp-adzuna-test.js');
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

async function testReedScraper() {
  console.log('📍 Testing Reed scraper...');
  
  return new Promise((resolve) => {
    const testCode = `
      import ReedScraper from '../scrapers/reed-scraper.ts';
      
      try {
        const scraper = new ReedScraper();
        console.log('✅ Reed scraper instantiated successfully');
        
        const status = scraper.getStatus();
        console.log('📊 Status:', status);
        
        console.log('✅ Reed scraper test passed');
      } catch (error) {
        console.error('❌ Reed scraper test failed:', error.message);
        process.exit(1);
      }
    `;
    
    const tempFile = path.join(__dirname, 'temp-reed-test.js');
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

async function testInfoJobsScraper() {
  console.log('📍 Testing InfoJobs scraper...');
  
  return new Promise((resolve) => {
    const testCode = `
      import InfoJobsScraper from '../scrapers/infojobs-scraper.ts';
      
      try {
        const scraper = new InfoJobsScraper();
        console.log('✅ InfoJobs scraper instantiated successfully');
        
        const status = scraper.getStatus();
        console.log('📊 Status:', status);
        
        console.log('✅ InfoJobs scraper test passed');
      } catch (error) {
        console.error('❌ InfoJobs scraper test failed:', error.message);
        process.exit(1);
      }
    `;
    
    const tempFile = path.join(__dirname, 'temp-infojobs-test.js');
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

async function testOrchestrator() {
  console.log('📍 Testing Multi-Source Orchestrator...');
  
  return new Promise((resolve) => {
    const testCode = `
      import MultiSourceOrchestrator from '../scrapers/multi-source-orchestrator.ts';
      
      try {
        const orchestrator = new MultiSourceOrchestrator();
        console.log('✅ Multi-Source Orchestrator instantiated successfully');
        
        const status = orchestrator.getStatus();
        console.log('📊 Status:', status);
        
        const coverage = orchestrator.getCoverageReport();
        console.log('📊 Coverage report:', coverage);
        
        console.log('✅ Multi-Source Orchestrator test passed');
      } catch (error) {
        console.error('❌ Multi-Source Orchestrator test failed:', error.message);
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

async function main() {
  console.log('🧪 Running TypeScript scraper tests with tsx...\n');
  
  const results = [];
  
  // Test each scraper
  results.push(await testAdzunaScraper());
  console.log('\n' + '='.repeat(50) + '\n');
  
  results.push(await testReedScraper());
  console.log('\n' + '='.repeat(50) + '\n');
  
  results.push(await testInfoJobsScraper());
  console.log('\n' + '='.repeat(50) + '\n');
  
  results.push(await testOrchestrator());
  
  // Summary
  console.log('\n🎯 Test Results Summary:');
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All TypeScript scraper tests passed!');
    console.log('The multi-source scraper system is ready to use.');
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
  testAdzunaScraper,
  testReedScraper,
  testInfoJobsScraper,
  testOrchestrator
};
