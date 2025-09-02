/**
 * Test a single scraper with better error handling
 */

import { spawn } from 'child_process';

const scraperName = process.argv[2] || 'lever';

console.log(`🧪 Testing ${scraperName} scraper...\n`);

const testScraper = (scraperName) => {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', `scrapers/${scraperName}.ts`], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000 // 30 second timeout
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(data.toString());
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(data.toString());
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${scraperName} scraper completed successfully`);
        resolve({ success: true, stdout, stderr });
      } else {
        console.log(`❌ ${scraperName} scraper failed with code ${code}`);
        reject({ success: false, code, stdout, stderr });
      }
    });

    child.on('error', (error) => {
      console.log(`❌ ${scraperName} scraper error: ${error.message}`);
      reject({ success: false, error: error.message });
    });

    child.on('timeout', () => {
      console.log(`⏰ ${scraperName} scraper timed out`);
      child.kill();
      reject({ success: false, error: 'Timeout' });
    });
  });
};

// Test the scraper
testScraper(scraperName)
  .then((result) => {
    console.log('\n📊 Test completed successfully!');
    console.log('Output length:', result.stdout.length);
    if (result.stdout.includes('jobs processed')) {
      console.log('✅ Found job processing output');
    }
  })
  .catch((error) => {
    console.log('\n❌ Test failed!');
    console.log('Error:', error.error || error.message);
    if (error.stderr) {
      console.log('Stderr:', error.stderr.slice(-500));
    }
  });
