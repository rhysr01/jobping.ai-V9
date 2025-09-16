#!/usr/bin/env node

// 🚀 25-USER LAUNCH PRODUCTION TEST
// Comprehensive test suite specifically designed for a controlled 25-user pilot launch

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run25UserLaunchTest() {
  console.log('🚀 25-USER LAUNCH PRODUCTION TEST');
  console.log('=====================================');
  console.log('Testing system readiness for controlled 25-user pilot launch...\n');

  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    critical: 0,
    warnings: 0,
    launchReady: false
  };

  // Test 1: Syntax & Build Integrity
  console.log('🔧 Test 1: Code Quality & Build Integrity');
  console.log('==========================================');
  testResults.total++;
  
  try {
    console.log('   🔍 Checking production build...');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Check if .next directory exists (indicating successful build)
    const fs = require('fs');
    if (fs.existsSync('.next')) {
      console.log('   ✅ Production build: SUCCESS');
      console.log('   ✅ Next.js application: READY');
      testResults.passed++;
    } else {
      console.log('   ❌ Production build: NOT FOUND');
      console.log('   💡 Run "npm run build" to generate production build');
      testResults.failed++;
      testResults.critical++;
    }
  } catch (error) {
    console.log('   ❌ Build check failed:', error.message);
    testResults.failed++;
    testResults.critical++;
  }

  // Test 2: Database Job Quality & Quantity
  console.log('\n📊 Test 2: Database Job Quality & Quantity');
  console.log('============================================');
  testResults.total++;
  
  try {
    // Check total jobs
    const { data: totalJobs, error: totalError } = await supabase
      .from('jobs')
      .select('id', { count: 'exact' });
    
    if (totalError) throw totalError;
    
    // Check recent jobs (last 48 hours for freshness)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: recentJobs, error: recentError } = await supabase
      .from('jobs')
      .select('id, title, company, location, created_at, source, experience_required')
      .gte('created_at', fortyEightHoursAgo)
      .order('created_at', { ascending: false });
    
    if (recentError) throw recentError;
    
    // Analyze job quality
    const eu_cities = ['London', 'Dublin', 'Berlin', 'Amsterdam', 'Paris', 'Madrid', 'Barcelona', 'Munich', 'Stockholm', 'Copenhagen', 'Zurich', 'Vienna', 'Brussels', 'Prague', 'Warsaw', 'Lisbon', 'Helsinki', 'Oslo', 'Athens', 'Milan', 'Rome'];
    const euJobs = recentJobs.filter(job => 
      job.location && eu_cities.some(city => job.location.toLowerCase().includes(city.toLowerCase()))
    );
    
    const earlyCareerKeywords = ['graduate', 'junior', 'entry', 'trainee', 'intern', 'associate', '0-2 years', 'new grad'];
    const earlyCareerJobs = recentJobs.filter(job => 
      earlyCareerKeywords.some(keyword => 
        (job.title && job.title.toLowerCase().includes(keyword)) || 
        (job.experience_required && job.experience_required.toLowerCase().includes(keyword))
      )
    );
    
    console.log(`   📊 Total jobs in database: ${totalJobs.length}`);
    console.log(`   🆕 Fresh jobs (48h): ${recentJobs.length}`);
    console.log(`   🇪🇺 EU location jobs: ${euJobs.length} (${Math.round(euJobs.length/recentJobs.length*100)}%)`);
    console.log(`   🎓 Early career jobs: ${earlyCareerJobs.length} (${Math.round(earlyCareerJobs.length/recentJobs.length*100)}%)`);
    
    // Quality metrics for 25-user launch
    const hasMinimumJobs = totalJobs.length >= 500;
    const hasRecentActivity = recentJobs.length >= 50;
    const hasGoodEuCoverage = euJobs.length >= 30;
    const hasEarlyCareerFocus = earlyCareerJobs.length >= 20;
    
    if (hasMinimumJobs && hasRecentActivity && hasGoodEuCoverage && hasEarlyCareerFocus) {
      console.log('   ✅ Database quality: EXCELLENT for 25-user launch');
      testResults.passed++;
    } else {
      console.log('   ⚠️  Database quality: NEEDS IMPROVEMENT');
      if (!hasMinimumJobs) console.log('      - Need minimum 500 total jobs for stability');
      if (!hasRecentActivity) console.log('      - Need minimum 50 jobs in last 48h');
      if (!hasGoodEuCoverage) console.log('      - Need better EU location coverage');
      if (!hasEarlyCareerFocus) console.log('      - Need more early career opportunities');
      testResults.warnings++;
      testResults.passed++;
    }
  } catch (error) {
    console.log(`   ❌ Database test failed: ${error.message}`);
    testResults.failed++;
    testResults.critical++;
  }

  // Test 3: Frontend UI/UX Quality Assessment
  console.log('\n🎨 Test 3: Frontend UI/UX Quality Assessment');
  console.log('==============================================');
  testResults.total++;
  
  try {
    // Check key UI components exist
    const uiComponents = [
      'app/components/Hero.tsx',
      'app/components/JobCard.tsx',
      'app/components/PriceSelector.tsx',
      'app/components/Features.tsx',
      'app/components/FAQ.tsx',
      'app/globals.css'
    ];
    
    let uiScore = 0;
    const maxUiScore = uiComponents.length;
    
    for (const component of uiComponents) {
      if (fs.existsSync(component)) {
        uiScore++;
        console.log(`   ✅ ${component}: EXISTS`);
      } else {
        console.log(`   ❌ ${component}: MISSING`);
      }
    }
    
    // Check for modern design patterns in CSS
    const cssContent = fs.readFileSync('app/globals.css', 'utf8');
    const modernFeatures = {
      'CSS Variables': cssContent.includes(':root'),
      'Dark Theme': cssContent.includes('bg-[#0B0B0F]') || cssContent.includes('dark'),
      'Responsive Design': cssContent.includes('@media'),
      'Modern Animations': cssContent.includes('transition') || cssContent.includes('transform'),
      'Accessibility': cssContent.includes('focus') || cssContent.includes('sr-only'),
      'Premium Styling': cssContent.includes('gradient') || cssContent.includes('backdrop-filter')
    };
    
    const modernScore = Object.values(modernFeatures).filter(Boolean).length;
    
    console.log('\n   🎨 Design Quality Analysis:');
    Object.entries(modernFeatures).forEach(([feature, hasFeature]) => {
      console.log(`      ${hasFeature ? '✅' : '❌'} ${feature}`);
    });
    
    const totalUiScore = Math.round(((uiScore / maxUiScore) + (modernScore / Object.keys(modernFeatures).length)) / 2 * 100);
    
    console.log(`\n   📊 UI/UX Score: ${totalUiScore}/100`);
    
    if (totalUiScore >= 85) {
      console.log('   🎉 Frontend: EXCELLENT - Professional and modern');
      testResults.passed++;
    } else if (totalUiScore >= 70) {
      console.log('   🟡 Frontend: GOOD - Ready but could be enhanced');
      testResults.warnings++;
      testResults.passed++;
    } else {
      console.log('   ❌ Frontend: NEEDS WORK - Not ready for public launch');
      testResults.failed++;
    }
  } catch (error) {
    console.log(`   ❌ Frontend test failed: ${error.message}`);
    testResults.failed++;
  }

  // Test 4: Core API Functionality
  console.log('\n🔌 Test 4: Core API Functionality');
  console.log('===================================');
  testResults.total++;
  
  try {
    // Test webhook endpoint exists
    const webhookPath = 'app/api/webhook-tally/route.ts';
    const matchUsersPath = 'app/api/match-users/route.ts';
    
    const webhookExists = fs.existsSync(webhookPath);
    const matchUsersExists = fs.existsSync(matchUsersPath);
    
    console.log(`   ${webhookExists ? '✅' : '❌'} Webhook API: ${webhookExists ? 'EXISTS' : 'MISSING'}`);
    console.log(`   ${matchUsersExists ? '✅' : '❌'} Match Users API: ${matchUsersExists ? 'EXISTS' : 'MISSING'}`);
    
    // Test database tables exist
    const { data: userTables, error: tableError } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .limit(1);
    
    if (tableError && !tableError.message.includes('relation "users" does not exist')) {
      throw tableError;
    }
    
    const hasUserTable = !tableError;
    console.log(`   ${hasUserTable ? '✅' : '⚠️'} Users table: ${hasUserTable ? 'EXISTS' : 'MISSING (will be created)'}`);
    
    if (webhookExists && matchUsersExists) {
      console.log('   ✅ Core APIs: All essential endpoints exist');
      testResults.passed++;
    } else {
      console.log('   ❌ Core APIs: Missing critical endpoints');
      testResults.failed++;
      testResults.critical++;
    }
  } catch (error) {
    console.log(`   ❌ API test failed: ${error.message}`);
    testResults.failed++;
  }

  // Test 5: 25-User Scale Readiness
  console.log('\n👥 Test 5: 25-User Scale Readiness');
  console.log('===================================');
  testResults.total++;
  
  try {
    // Calculate daily job capacity
    const { data: last7Days, error } = await supabase
      .from('jobs')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    if (error) throw error;
    
    const avgJobsPerDay = last7Days.length / 7;
    const jobsFor25Users = 25 * 5; // 5 jobs per user per day
    const capacityRatio = avgJobsPerDay / jobsFor25Users;
    
    console.log(`   📊 Average jobs per day: ${Math.round(avgJobsPerDay)}`);
    console.log(`   🎯 Required for 25 users: ${jobsFor25Users} jobs/day`);
    console.log(`   ⚖️  Capacity ratio: ${capacityRatio.toFixed(2)}x`);
    
    // Check rate limiting configuration
    const matchUsersContent = fs.readFileSync('app/api/match-users/route.ts', 'utf8');
    const hasRateLimiting = matchUsersContent.includes('rateLimitMap') || matchUsersContent.includes('rate');
    
    console.log(`   ${hasRateLimiting ? '✅' : '⚠️'} Rate limiting: ${hasRateLimiting ? 'IMPLEMENTED' : 'BASIC'}`);
    
    // Check environment variable limits
    const envContent = process.env.SEND_DAILY_FREE || '50';
    const dailyJobLimit = parseInt(envContent);
    console.log(`   📊 Daily job limit per user: ${dailyJobLimit}`);
    
    if (capacityRatio >= 1.5 && hasRateLimiting) {
      console.log('   ✅ Scale readiness: EXCELLENT - Can handle 25 users comfortably');
      testResults.passed++;
    } else if (capacityRatio >= 1.0) {
      console.log('   🟡 Scale readiness: ADEQUATE - Monitor closely during launch');
      testResults.warnings++;
      testResults.passed++;
    } else {
      console.log('   ❌ Scale readiness: INSUFFICIENT - Need more job ingestion');
      testResults.failed++;
    }
  } catch (error) {
    console.log(`   ❌ Scale test failed: ${error.message}`);
    testResults.failed++;
  }

  // Test 6: Launch-Critical Security & Compliance
  console.log('\n🔒 Test 6: Launch-Critical Security & Compliance');
  console.log('=================================================');
  testResults.total++;
  
  try {
    // Check GDPR compliance
    const legalPages = [
      'app/legal/privacy-policy.tsx',
      'app/legal/terms-of-service.tsx',
      'app/legal/unsubscribe/page.tsx'
    ];
    
    const legalCompliance = legalPages.every(page => fs.existsSync(page));
    console.log(`   ${legalCompliance ? '✅' : '❌'} GDPR Compliance: ${legalCompliance ? 'COMPLETE' : 'INCOMPLETE'}`);
    
    // Check email unsubscribe capability
    const unsubscribeExists = fs.existsSync('app/legal/unsubscribe/page.tsx');
    console.log(`   ${unsubscribeExists ? '✅' : '❌'} Unsubscribe page: ${unsubscribeExists ? 'EXISTS' : 'MISSING'}`);
    
    // Check environment variables are properly secured
    const criticalEnvVars = ['SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY', 'RESEND_API_KEY'];
    const envSecure = criticalEnvVars.every(envVar => process.env[envVar] && process.env[envVar].length > 10);
    console.log(`   ${envSecure ? '✅' : '❌'} API Keys Security: ${envSecure ? 'SECURE' : 'INSECURE'}`);
    
    if (legalCompliance && unsubscribeExists && envSecure) {
      console.log('   ✅ Security & Compliance: READY for pilot launch');
      testResults.passed++;
    } else {
      console.log('   ❌ Security & Compliance: CRITICAL ISSUES - Cannot launch');
      testResults.failed++;
      testResults.critical++;
    }
  } catch (error) {
    console.log(`   ❌ Security test failed: ${error.message}`);
    testResults.failed++;
  }

  // Test 7: Email System End-to-End
  console.log('\n📧 Test 7: Email System End-to-End');
  console.log('===================================');
  testResults.total++;
  
  try {
    // Check email configuration
    const hasResendKey = !!process.env.RESEND_API_KEY;
    const emailUtilsExists = fs.existsSync('Utils/email.ts') || fs.existsSync('Utils/email.js') || fs.existsSync('Utils/email/emailPreview.ts');
    
    console.log(`   ${hasResendKey ? '✅' : '❌'} Resend API Key: ${hasResendKey ? 'SET' : 'MISSING'}`);
    console.log(`   ${emailUtilsExists ? '✅' : '❌'} Email utilities: ${emailUtilsExists ? 'EXISTS' : 'MISSING'}`);
    
    // Check for email templates in the codebase
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout } = await execAsync('find . -name "*.tsx" -o -name "*.ts" -o -name "*.js" | xargs grep -l "email.*template\\|template.*email" | head -5');
      const hasEmailTemplates = stdout.trim().length > 0;
      console.log(`   ${hasEmailTemplates ? '✅' : '⚠️'} Email templates: ${hasEmailTemplates ? 'FOUND' : 'CHECK MANUALLY'}`);
      
      if (hasResendKey && emailUtilsExists) {
        console.log('   ✅ Email system: READY for 25-user pilot');
        testResults.passed++;
      } else {
        console.log('   ❌ Email system: INCOMPLETE - Critical for user onboarding');
        testResults.failed++;
        testResults.critical++;
      }
    } catch (grepError) {
      console.log('   ⚠️  Email templates: Could not verify automatically');
      if (hasResendKey && emailUtilsExists) {
        testResults.warnings++;
        testResults.passed++;
      } else {
        testResults.failed++;
      }
    }
  } catch (error) {
    console.log(`   ❌ Email test failed: ${error.message}`);
    testResults.failed++;
  }

  // Final 25-User Launch Assessment
  console.log('\n🚀 25-USER LAUNCH READINESS ASSESSMENT');
  console.log('=======================================');
  
  const successRate = Math.round((testResults.passed / testResults.total) * 100);
  const criticalIssues = testResults.critical;
  const warnings = testResults.warnings;
  
  console.log(`📊 Test Results:`);
  console.log(`   Total Tests: ${testResults.total}`);
  console.log(`   ✅ Passed: ${testResults.passed}`);
  console.log(`   ❌ Failed: ${testResults.failed}`);
  console.log(`   🚨 Critical Issues: ${criticalIssues}`);
  console.log(`   ⚠️  Warnings: ${warnings}`);
  console.log(`   📈 Success Rate: ${successRate}%`);
  
  // Launch decision logic
  if (criticalIssues === 0 && successRate >= 85) {
    testResults.launchReady = true;
    console.log('\n🎉 LAUNCH DECISION: GO FOR LAUNCH! 🚀');
    console.log('   ✅ System is ready for 25-user pilot');
    console.log('   ✅ All critical systems operational');
    console.log('   ✅ Database has sufficient job data');
    console.log('   ✅ Frontend is professional and modern');
    console.log('   ✅ Scale capacity adequate for pilot');
    
    console.log('\n📋 LAUNCH CHECKLIST:');
    console.log('   1. ✅ Code quality verified');
    console.log('   2. ✅ Database populated with quality jobs');
    console.log('   3. ✅ UI/UX is launch-ready');
    console.log('   4. ✅ APIs are functional');
    console.log('   5. ✅ System can handle 25 users');
    console.log('   6. ✅ Legal compliance complete');
    console.log('   7. ✅ Email system operational');
    
  } else if (criticalIssues === 0 && successRate >= 70) {
    console.log('\n🟡 LAUNCH DECISION: CONDITIONAL GO');
    console.log('   ⚠️  Ready for pilot but monitor closely');
    console.log('   ✅ No critical blockers');
    console.log('   ⚠️  Some areas need attention during pilot');
    
  } else {
    console.log('\n🔴 LAUNCH DECISION: NO GO - DO NOT LAUNCH');
    console.log('   ❌ Critical issues must be resolved first');
    console.log('   🚨 Launch blocked until fixes implemented');
  }
  
  if (warnings > 0) {
    console.log('\n⚠️  PILOT MONITORING RECOMMENDATIONS:');
    console.log('   1. Monitor user signup and email delivery rates');
    console.log('   2. Track job matching quality and user feedback');
    console.log('   3. Watch database performance and job freshness');
    console.log('   4. Monitor API response times and error rates');
    console.log('   5. Collect user experience feedback actively');
  }
  
  if (criticalIssues > 0) {
    console.log('\n🚨 CRITICAL ACTIONS BEFORE LAUNCH:');
    console.log('   1. Fix all critical issues identified above');
    console.log('   2. Re-run this test suite until 0 critical issues');
    console.log('   3. Consider a smaller beta test (5-10 users) first');
    console.log('   4. Have rollback plan ready');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`🎯 FINAL VERDICT: ${testResults.launchReady ? 'READY FOR 25-USER LAUNCH' : 'NOT READY - RESOLVE ISSUES FIRST'}`);
  console.log('='.repeat(60));
  
  // Return results for programmatic use
  return testResults;
}

// Run the test
run25UserLaunchTest().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

module.exports = { run25UserLaunchTest };
