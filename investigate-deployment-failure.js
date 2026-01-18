#!/usr/bin/env node

const { VercelMCP } = require('./scripts/mcps/vercel-mcp.ts');

// Load environment variables
const { config } = require('dotenv');
const { resolve } = require('path');
config({ path: resolve(process.cwd(), '.env.local') });

async function investigateDeploymentFailure() {
  console.log('🔍 Investigating Vercel Deployment Failure\n');
  console.log('='.repeat(60));

  const vercel = new VercelMCP();

  try {
    // Get recent deployments to see the failure pattern
    console.log('📊 Fetching recent deployment history...');
    const deploymentsResult = await vercel.getDeployments({ limit: 5 });

    if (deploymentsResult.content && deploymentsResult.content[0]) {
      console.log('Recent Deployments:');
      console.log(deploymentsResult.content[0].text);
      console.log('');
    }

    // Get detailed information about the latest failed deployment
    console.log('🔬 Analyzing latest deployment details...');

    // Make a direct API call to get full deployment details
    const vercelToken = process.env.VERCEL_ACCESS_TOKEN;
    if (!vercelToken) {
      console.log('❌ VERCEL_ACCESS_TOKEN not found in environment');
      return;
    }

    const response = await fetch('https://api.vercel.com/v6/deployments', {
      headers: {
        Authorization: `Bearer ${vercelToken}`,
      },
    });

    if (!response.ok) {
      console.log(`❌ Vercel API error: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();

    if (!data.deployments || data.deployments.length === 0) {
      console.log('❌ No deployments found');
      return;
    }

    const latestDeployment = data.deployments[0];
    console.log('\n📋 DEPLOYMENT FAILURE ANALYSIS');
    console.log('='.repeat(40));

    // Basic deployment info
    console.log(`🔢 Deployment ID: ${latestDeployment.uid}`);
    console.log(`📊 State: ${latestDeployment.state}`);
    console.log(`🎯 Target: ${latestDeployment.target}`);
    console.log(`🔗 URL: https://${latestDeployment.url}`);
    console.log(`📅 Created: ${new Date(latestDeployment.createdAt).toLocaleString()}`);
    console.log(`🏗️  Building At: ${latestDeployment.buildingAt ? new Date(latestDeployment.buildingAt).toLocaleString() : 'N/A'}`);
    console.log(`✅ Ready At: ${latestDeployment.ready ? new Date(latestDeployment.ready).toLocaleString() : 'N/A'}`);

    // Error details
    if (latestDeployment.errorCode) {
      console.log(`\n❌ ERROR CODE: ${latestDeployment.errorCode}`);
    }

    if (latestDeployment.errorMessage) {
      console.log(`❌ ERROR MESSAGE: ${latestDeployment.errorMessage}`);
    }

    // Framework and build info
    console.log(`\n🔧 BUILD INFO:`);
    console.log(`Framework: ${latestDeployment.framework || 'unknown'}`);
    console.log(`Source: ${latestDeployment.source || 'unknown'}`);
    console.log(`Creator: ${latestDeployment.creator?.username || 'unknown'}`);

    // Git information
    if (latestDeployment.gitCommitMessage) {
      console.log(`\n📝 GIT INFO:`);
      console.log(`Commit: ${latestDeployment.gitCommitMessage}`);
      console.log(`Author: ${latestDeployment.gitCommitAuthorName || 'unknown'}`);
      console.log(`SHA: ${latestDeployment.gitCommitSha || 'unknown'}`);
    }

    // Environment and regions
    console.log(`\n🌍 DEPLOYMENT INFO:`);
    console.log(`Regions: ${latestDeployment.regions?.join(', ') || 'unknown'}`);
    console.log(`Meta: ${JSON.stringify(latestDeployment.meta || {}, null, 2)}`);

    // Failure analysis
    console.log(`\n🔍 FAILURE ANALYSIS:`);
    console.log('='.repeat(30));

    if (latestDeployment.state === 'ERROR') {
      if (latestDeployment.errorCode === 'lint_or_type_error') {
        console.log('🚨 ISSUE TYPE: Build/Lint/TypeScript Error');
        console.log('💡 COMMON CAUSES:');
        console.log('   • TypeScript compilation errors');
        console.log('   • ESLint or Biome linting failures');
        console.log('   • Missing dependencies');
        console.log('   • Build script failures');
        console.log('');
        console.log('🔧 SOLUTIONS:');
        console.log('   1. Run: npm run build (test locally)');
        console.log('   2. Check: npm run lint:biome');
        console.log('   3. Check: npm run type-check');
        console.log('   4. Verify package.json scripts');
      } else if (latestDeployment.errorCode) {
        console.log(`🚨 ISSUE TYPE: ${latestDeployment.errorCode}`);
        console.log('💡 This appears to be a specific Vercel error code.');
        console.log('   Check Vercel documentation for this error code.');
      } else {
        console.log('🚨 ISSUE TYPE: Generic Build Failure');
        console.log('💡 Check the build logs in Vercel dashboard for specific errors.');
      }

      console.log('');
      console.log('📋 NEXT STEPS:');
      console.log('   1. Visit: https://vercel.com/dashboard');
      console.log(`   2. Find deployment: ${latestDeployment.url}`);
      console.log('   3. Click "View Build Logs"');
      console.log('   4. Look for red error messages');
      console.log('   5. Fix the issues locally first');
      console.log('   6. Push fixes to trigger new deployment');
    }

    // Check if this is a pattern (multiple failures)
    const failedDeployments = data.deployments.filter(d => d.state === 'ERROR').length;
    const totalDeployments = data.deployments.length;

    console.log(`\n📈 FAILURE PATTERN:`);
    console.log(`Recent failures: ${failedDeployments}/${totalDeployments} deployments`);
    if (failedDeployments > 2) {
      console.log('⚠️  Multiple recent failures detected!');
      console.log('   This might indicate a systemic issue.');
    }

    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    console.log('='.repeat(20));

    if (latestDeployment.errorCode === 'lint_or_type_error') {
      console.log('1. Run local build test:');
      console.log('   npm run build');
      console.log('');
      console.log('2. Check for TypeScript errors:');
      console.log('   npm run type-check');
      console.log('');
      console.log('3. Verify linting:');
      console.log('   npm run lint:biome');
    }

    console.log('4. Check Vercel environment variables match local .env.local');
    console.log('5. Verify Node.js version compatibility (18.x)');
    console.log('6. Check for missing dependencies in package.json');

  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
  }
}

investigateDeploymentFailure();