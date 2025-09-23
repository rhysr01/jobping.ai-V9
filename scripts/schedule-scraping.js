#!/usr/bin/env node

// Compatibility shim for older workflows that call scripts/schedule-scraping.js
// Delegates to the new orchestrator or wrapper scripts.

import { spawn } from 'child_process';

function run(cmd, args = []) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: 'inherit', env: process.env });
    p.on('exit', (code) => resolve(code || 0));
  });
}

async function main() {
  const mode = process.argv[2] || '';
  const platforms = (process.env.SCRAPE_PLATFORMS || 'all').toLowerCase();

  if (mode === 'cleanup') {
    console.log('⚠️  Cleanup mode requested, but no cleanup script is wired. Skipping.');
    return 0;
  }

  if (platforms === 'all') {
    console.log('▶️  Running full orchestrator (single cycle)');
    return await run('node', ['automation/real-job-runner.cjs', '--single-run']);
  }

  const list = platforms.split(',').map(s => s.trim()).filter(Boolean);
  for (const s of list) {
    if (s === 'adzuna') {
      console.log('▶️  Running Adzuna wrapper');
      const code = await run('node', ['scrapers/wrappers/adzuna-wrapper.cjs']);
      if (code !== 0) return code;
    } else if (s === 'jobspy') {
      console.log('▶️  Running JobSpy wrapper');
      const code = await run('node', ['scrapers/wrappers/jobspy-wrapper.cjs']);
      if (code !== 0) return code;
    } else if (s === 'reed') {
      console.log('▶️  Running Reed wrapper');
      const code = await run('node', ['scrapers/wrappers/reed-wrapper.cjs']);
      if (code !== 0) return code;
    } else {
      console.log(`❓ Unknown platform: ${s}`);
    }
  }
  return 0;
}

main().then(code => process.exit(code)).catch(err => {
  console.error('Fatal:', err?.message || err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Simple schedule scraping entry point
 * Redirects to the full orchestrator for maximum compatibility
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 JobPing Schedule Scraper');
console.log('==========================');

// Path to the real orchestrator
const orchestratorPath = path.join(__dirname, '../automation/real-job-runner.cjs');

console.log('▶️  Delegating to full orchestrator (single-run mode)');

// Spawn the orchestrator with single-run mode
const child = spawn('node', [orchestratorPath, '--single-run'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    JOBPING_PRODUCTION_MODE: 'true',
    NODE_ENV: 'production'
  }
});

child.on('close', (code) => {
  console.log(`\n📋 Schedule scraping completed with exit code: ${code}`);
  process.exit(code);
});

child.on('error', (error) => {
  console.error('❌ Failed to start orchestrator:', error.message);
  process.exit(1);
});
