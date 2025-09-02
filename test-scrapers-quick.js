/**
 * Quick test of multiple scrapers with short timeouts
 */

import { spawn } from 'child_process';

const scrapers = [
  'lever',
  'greenhouse', 
  'milkround',
  'workday',
  'jobteaser',
  'eures',
  'graduatejobs',
  'graduateland',
  'iagora',
  'smartrecruiters'
];

console.log('🧪 Quick testing of all scrapers (15s timeout each)...\n');

const testScraper = (scraperName) => {
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', `scrapers/${scraperName}.ts`], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000 // 15 second timeout
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, scraper: scraperName, stdout, stderr });
      } else {
        resolve({ success: false, scraper: scraperName, code, stdout, stderr });
      }
    });

    child.on('error', (error) => {
      resolve({ success: false, scraper: scraperName, error: error.message });
    });

    child.on('timeout', () => {
      child.kill();
      resolve({ success: false, scraper: scraperName, error: 'Timeout' });
    });
  });
};

// Test all scrapers
const results = [];
for (const scraper of scrapers) {
  console.log(`🔍 Testing ${scraper}...`);
  const result = await testScraper(scraper);
  results.push(result);
  
  if (result.success) {
    console.log(`✅ ${scraper}: SUCCESS`);
    // Look for job counts in output
    const jobMatch = result.stdout.match(/(\d+)\s+jobs?/i);
    if (jobMatch) {
      console.log(`   📊 Found ${jobMatch[1]} jobs`);
    }
  } else {
    console.log(`❌ ${scraper}: FAILED (${result.error || result.code})`);
  }
  
  // Small delay between tests
  await new Promise(resolve => setTimeout(resolve, 1000));
}

console.log('\n📋 SUMMARY:');
console.log('===========');

const successful = results.filter(r => r.success);
const failed = results.filter(r => !r.success);

console.log(`✅ Successful: ${successful.length}/${scrapers.length}`);
console.log(`❌ Failed: ${failed.length}/${scrapers.length}`);

if (successful.length > 0) {
  console.log('\n✅ Working scrapers:');
  successful.forEach(r => {
    console.log(`   - ${r.scraper}`);
    const jobMatch = r.stdout.match(/(\d+)\s+jobs?/i);
    if (jobMatch) {
      console.log(`     Found ${jobMatch[1]} jobs`);
    }
  });
}

if (failed.length > 0) {
  console.log('\n❌ Failed scrapers:');
  failed.forEach(r => {
    console.log(`   - ${r.scraper}: ${r.error || r.code}`);
  });
}

console.log('\n🎯 Next steps:');
console.log('1. Focus on working scrapers');
console.log('2. Debug failed scrapers');
console.log('3. Test job filtering on successful scrapers');
