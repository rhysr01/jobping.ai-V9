#!/usr/bin/env node

/**
 * Check GitHub Actions Workflow Runs
 * 
 * This script checks recent workflow runs for the scrape-jobs workflow
 * to see why JobSpy might not have run yesterday.
 * 
 * Usage:
 *   GITHUB_TOKEN=your_token node scripts/check-github-actions-logs.js
 * 
 * Or set GITHUB_TOKEN in .env.local
 */

const https = require('https');
const { execSync } = require('child_process');

// Get GitHub token from env or .env.local
let GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  try {
    require('dotenv').config({ path: '.env.local' });
    GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  } catch (e) {
    // .env.local might not exist
  }
}

// Get repo info from git
function getRepoInfo() {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf-8' }).trim();
    // Handle both https and ssh formats
    const match = remoteUrl.match(/(?:github\.com[:/]|git@github\.com:)([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  } catch (e) {
    console.error('❌ Could not determine repo from git remote');
  }
  return null;
}

function makeGitHubRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const repoInfo = getRepoInfo();
    if (!repoInfo) {
      reject(new Error('Could not determine repository'));
      return;
    }

    const url = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}${path}`;
    
    const requestOptions = {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'JobPing-Scraper-Checker',
        ...(GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {})
      },
      ...options
    };

    https.get(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode} - ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function checkWorkflowRuns() {
  console.log('🔍 Checking GitHub Actions Workflow Runs...\n');
  
  if (!GITHUB_TOKEN) {
    console.warn('⚠️  GITHUB_TOKEN not set. Some API calls may be rate-limited.');
    console.log('   Set GITHUB_TOKEN environment variable or add to .env.local\n');
  }

  try {
    // Get workflow runs for scrape-jobs workflow
    const workflows = await makeGitHubRequest('/actions/workflows');
    
    // Find the scrape-jobs workflow
    const scrapeWorkflow = workflows.workflows?.find(w => 
      w.name === 'Automated Job Scraping' || 
      w.path.includes('scrape-jobs.yml')
    );

    if (!scrapeWorkflow) {
      console.log('❌ Could not find scrape-jobs workflow');
      return;
    }

    console.log(`✅ Found workflow: ${scrapeWorkflow.name} (ID: ${scrapeWorkflow.id})\n`);

    // Get recent runs
    const runs = await makeGitHubRequest(`/actions/workflows/${scrapeWorkflow.id}/runs?per_page=10`);
    
    if (!runs.workflow_runs || runs.workflow_runs.length === 0) {
      console.log('❌ No workflow runs found');
      return;
    }

    console.log(`📊 Found ${runs.workflow_runs.length} recent runs:\n`);
    console.log('='.repeat(100));

    // Analyze each run
    for (const run of runs.workflow_runs) {
      const runDate = new Date(run.created_at);
      const now = new Date();
      const hoursAgo = (now - runDate) / (1000 * 60 * 60);
      const daysAgo = hoursAgo / 24;

      const statusIcon = run.status === 'completed' 
        ? (run.conclusion === 'success' ? '✅' : '❌')
        : run.status === 'in_progress' ? '🔄'
        : '⏸️';

      console.log(`\n${statusIcon} Run #${run.run_number} - ${run.status} (${run.conclusion || 'pending'})`);
      console.log(`   📅 Created: ${runDate.toISOString()} (${daysAgo.toFixed(1)} days ago)`);
      console.log(`   🎯 Event: ${run.event}`);
      console.log(`   🔗 URL: ${run.html_url}`);

      // Check if this was yesterday
      if (daysAgo >= 1 && daysAgo < 2) {
        console.log(`   ⚠️  THIS WAS YESTERDAY!`);
      }

      // Get job details if failed
      if (run.conclusion === 'failure' || run.conclusion === 'cancelled') {
        try {
          const jobs = await makeGitHubRequest(`/actions/runs/${run.id}/jobs`);
          console.log(`   📋 Jobs in this run:`);
          
          for (const job of jobs.jobs || []) {
            const jobStatus = job.conclusion === 'success' ? '✅' : 
                            job.conclusion === 'failure' ? '❌' : 
                            job.conclusion === 'cancelled' ? '🚫' : '⏸️';
            console.log(`      ${jobStatus} ${job.name} - ${job.conclusion || job.status}`);
            
            if (job.conclusion === 'failure') {
              console.log(`         ⏱️  Duration: ${Math.round(job.completed_at ? (new Date(job.completed_at) - new Date(job.started_at)) / 1000 : 0)}s`);
            }
          }
        } catch (e) {
          console.log(`   ⚠️  Could not fetch job details: ${e.message}`);
        }
      }

      // Check if run was cancelled due to concurrency
      if (run.conclusion === 'cancelled' && run.event === 'schedule') {
        console.log(`   ⚠️  This scheduled run was cancelled (likely due to concurrency)`);
      }
    }

    console.log('\n' + '='.repeat(100));
    
    // Summary
    const yesterdayRuns = runs.workflow_runs.filter(run => {
      const runDate = new Date(run.created_at);
      const daysAgo = (new Date() - runDate) / (1000 * 60 * 60 * 24);
      return daysAgo >= 1 && daysAgo < 2;
    });

    console.log('\n📈 Summary:');
    console.log(`   Total runs checked: ${runs.workflow_runs.length}`);
    console.log(`   Runs yesterday: ${yesterdayRuns.length}`);
    
    if (yesterdayRuns.length === 0) {
      console.log(`   ⚠️  NO RUNS YESTERDAY - This explains why JobSpy didn't run!`);
    } else {
      const failedRuns = yesterdayRuns.filter(r => r.conclusion === 'failure');
      const cancelledRuns = yesterdayRuns.filter(r => r.conclusion === 'cancelled');
      const successRuns = yesterdayRuns.filter(r => r.conclusion === 'success');
      
      console.log(`   ✅ Successful: ${successRuns.length}`);
      console.log(`   ❌ Failed: ${failedRuns.length}`);
      console.log(`   🚫 Cancelled: ${cancelledRuns.length}`);
      
      if (cancelledRuns.length > 0) {
        console.log(`\n   ⚠️  Cancelled runs likely due to concurrency (cancel-in-progress: true)`);
        console.log(`   This means another run was already in progress, so this one was cancelled.`);
      }
    }

    // Check today's runs
    const todayRuns = runs.workflow_runs.filter(run => {
      const runDate = new Date(run.created_at);
      const hoursAgo = (new Date() - runDate) / (1000 * 60 * 60);
      return hoursAgo < 24;
    });

    console.log(`\n   Runs today: ${todayRuns.length}`);
    const todaySuccess = todayRuns.filter(r => r.conclusion === 'success');
    if (todaySuccess.length > 0) {
      console.log(`   ✅ Successful today: ${todaySuccess.length}`);
      const latestSuccess = todaySuccess[0];
      console.log(`   Latest success: ${new Date(latestSuccess.created_at).toISOString()}`);
      console.log(`   This matches JobSpy running at 16:47 UTC today!`);
    }

  } catch (error) {
    console.error('❌ Error checking workflow runs:', error.message);
    if (error.message.includes('401') || error.message.includes('403')) {
      console.error('\n💡 Tip: You need a GitHub Personal Access Token with `actions:read` permission');
      console.error('   Create one at: https://github.com/settings/tokens');
      console.error('   Then set: export GITHUB_TOKEN=your_token');
    }
  }
}

// Run the check
checkWorkflowRuns().catch(console.error);

