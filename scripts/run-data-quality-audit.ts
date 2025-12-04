/**
 * DATA QUALITY AUDIT RUNNER
 * Connects to database and runs comprehensive data quality checks
 * Run with: npx tsx scripts/run-data-quality-audit.ts
 */

import { getDatabaseClient } from '@/Utils/databasePool';
import { apiLogger } from '@/lib/api-logger';

interface AuditResult {
  section: string;
  issue: string;
  count: number;
  percentage: number;
  severity: 'critical' | 'warning' | 'info';
  fix?: string;
}

async function runDataQualityAudit() {
  const supabase = getDatabaseClient();
  const results: AuditResult[] = [];

  console.log('\n🔍 Starting Data Quality Audit...\n');

  // Get total active jobs count
  const { count: totalActive } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  console.log(`📊 Total Active Jobs: ${totalActive || 0}\n`);

  // ============================================================================
  // 1. CHECK MISSING CRITICAL FIELDS FOR MATCHING
  // ============================================================================

  const { count: missingCity } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .is('city', null)
    .not('location', 'is', null)
    .not('location', 'eq', '');

  if (missingCity && missingCity > 0) {
    results.push({
      section: 'CRITICAL - Missing Fields',
      issue: 'Jobs with NULL city (hurts city-based matching)',
      count: missingCity,
      percentage: (missingCity / (totalActive || 1)) * 100,
      severity: 'critical',
      fix: 'Run: UPDATE jobs SET city = INITCAP(SPLIT_PART(location, \',\', 1)) WHERE city IS NULL AND location IS NOT NULL'
    });
  }

  const { count: missingCategories } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .or('categories.is.null,categories.eq.{}');

  if (missingCategories && missingCategories > 0) {
    results.push({
      section: 'CRITICAL - Missing Fields',
      issue: 'Jobs with NULL/empty categories (hurts career path matching)',
      count: missingCategories,
      percentage: (missingCategories / (totalActive || 1)) * 100,
      severity: 'critical',
      fix: 'Ensure scraper always sets categories array - check jobspy-save.cjs line 412'
    });
  }

  const { count: missingWorkEnv } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .is('work_environment', null);

  if (missingWorkEnv && missingWorkEnv > 0) {
    results.push({
      section: 'WARNING - Missing Fields',
      issue: 'Jobs with NULL work_environment',
      count: missingWorkEnv,
      percentage: (missingWorkEnv / (totalActive || 1)) * 100,
      severity: 'warning',
      fix: 'Ensure detectWorkEnvironment() always returns a value - check jobspy-save.cjs line 389'
    });
  }

  // ============================================================================
  // 2. CHECK INVALID DATA PATTERNS
  // ============================================================================

  const { count: emptyTitles } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .or('title.is.null,title.eq.');

  if (emptyTitles && emptyTitles > 0) {
    results.push({
      section: 'CRITICAL - Invalid Data',
      issue: 'Jobs with empty titles (should never happen)',
      count: emptyTitles,
      percentage: (emptyTitles / (totalActive || 1)) * 100,
      severity: 'critical',
      fix: 'Fix scraper validation - reject jobs without titles before saving'
    });
  }

  const { count: statusMismatch } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .neq('status', 'active');

  if (statusMismatch && statusMismatch > 0) {
    results.push({
      section: 'WARNING - Data Inconsistency',
      issue: 'Jobs with is_active=true but status != active',
      count: statusMismatch,
      percentage: (statusMismatch / (totalActive || 1)) * 100,
      severity: 'warning',
      fix: 'UPDATE jobs SET status = \'active\' WHERE is_active = true AND status != \'active\''
    });
  }

  const { count: conflictingFlags } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('is_internship', true)
    .eq('is_graduate', true);

  if (conflictingFlags && conflictingFlags > 0) {
    results.push({
      section: 'WARNING - Data Inconsistency',
      issue: 'Jobs with both is_internship=true AND is_graduate=true (mutually exclusive)',
      count: conflictingFlags,
      percentage: (conflictingFlags / (totalActive || 1)) * 100,
      severity: 'warning',
      fix: 'UPDATE jobs SET is_graduate = false WHERE is_internship = true AND is_graduate = true'
    });
  }

  // ============================================================================
  // 3. CHECK SCRAPER DATA VALIDATION ISSUES
  // ============================================================================

  const { count: remoteJobs } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .or('location.ilike.%remote%,location.ilike.%work from home%');

  if (remoteJobs && remoteJobs > 0) {
    results.push({
      section: 'WARNING - Scraper Filter',
      issue: 'Remote jobs in database (scraper should filter these at line 368)',
      count: remoteJobs,
      percentage: (remoteJobs / (totalActive || 1)) * 100,
      severity: 'warning',
      fix: 'Check scraper filter logic - some remote jobs may have slipped through'
    });
  }

  const { count: staleJobs } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .lt('posted_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());

  if (staleJobs && staleJobs > 0) {
    results.push({
      section: 'INFO - Stale Data',
      issue: 'Jobs older than 60 days (should be deactivated for matching)',
      count: staleJobs,
      percentage: (staleJobs / (totalActive || 1)) * 100,
      severity: 'info',
      fix: 'UPDATE jobs SET is_active = false WHERE posted_at < NOW() - INTERVAL \'60 days\''
    });
  }

  // ============================================================================
  // 4. CHECK DATABASE INDEXES FOR MATCHING OPTIMIZATION
  // ============================================================================

  let indexes = null;
  try {
    const { data } = await supabase.rpc('get_table_indexes', { table_name: 'jobs' });
    indexes = data;
  } catch (error) {
    // RPC function may not exist, ignore error
    indexes = null;
  }

  // Check for critical indexes
  const criticalIndexes = [
    { name: 'idx_jobs_city', reason: 'CRITICAL for city-based filtering in matching queries' },
    { name: 'idx_jobs_categories_gin', reason: 'CRITICAL for category/career path filtering' },
    { name: 'idx_jobs_is_active_status', reason: 'CRITICAL for active job filtering' },
  ];

  // Note: We can't easily check indexes via Supabase client, so we'll note this
  results.push({
    section: 'INFO - Database Indexes',
    issue: 'Check indexes manually: idx_jobs_city, idx_jobs_categories_gin, idx_jobs_is_active_status',
    count: 0,
    percentage: 0,
    severity: 'info',
    fix: 'Run: SELECT indexname FROM pg_indexes WHERE tablename = \'jobs\' AND indexname LIKE \'idx_jobs_%\';'
  });

  // ============================================================================
  // 5. SOURCE-SPECIFIC DATA QUALITY
  // ============================================================================

  const { data: sourceStats } = await supabase
    .from('jobs')
    .select('source, city, categories, work_environment')
    .eq('is_active', true)
    .limit(10000); // Sample check

  if (sourceStats) {
    const sourceMap = new Map<string, { total: number; missingCity: number; missingCategories: number; missingWorkEnv: number }>();
    
    sourceStats.forEach(job => {
      const stats = sourceMap.get(job.source) || { total: 0, missingCity: 0, missingCategories: 0, missingWorkEnv: 0 };
      stats.total++;
      if (!job.city) stats.missingCity++;
      if (!job.categories || (Array.isArray(job.categories) && job.categories.length === 0)) stats.missingCategories++;
      if (!job.work_environment) stats.missingWorkEnv++;
      sourceMap.set(job.source, stats);
    });

    console.log('\n📊 Source Data Quality Breakdown:');
    console.log('-----------------------------------');
    for (const [source, stats] of sourceMap.entries()) {
      const cityCoverage = ((stats.total - stats.missingCity) / stats.total * 100).toFixed(1);
      const categoryCoverage = ((stats.total - stats.missingCategories) / stats.total * 100).toFixed(1);
      const workEnvCoverage = ((stats.total - stats.missingWorkEnv) / stats.total * 100).toFixed(1);
      
      console.log(`\n${source}:`);
      console.log(`  Total: ${stats.total}`);
      console.log(`  City coverage: ${cityCoverage}% (${stats.missingCity} missing)`);
      console.log(`  Category coverage: ${categoryCoverage}% (${stats.missingCategories} missing)`);
      console.log(`  Work env coverage: ${workEnvCoverage}% (${stats.missingWorkEnv} missing)`);
      
      if (stats.missingCity > stats.total * 0.1) {
        results.push({
          section: 'WARNING - Source Quality',
          issue: `${source}: >10% missing city data`,
          count: stats.missingCity,
          percentage: (stats.missingCity / stats.total) * 100,
          severity: 'warning',
          fix: 'Improve parseLocation() function in scraper'
        });
      }
    }
  }

  // ============================================================================
  // PRINT RESULTS
  // ============================================================================

  console.log('\n\n========================================');
  console.log('DATA QUALITY AUDIT RESULTS');
  console.log('========================================\n');

  const critical = results.filter(r => r.severity === 'critical');
  const warnings = results.filter(r => r.severity === 'warning');
  const info = results.filter(r => r.severity === 'info');

  if (critical.length > 0) {
    console.log('🔴 CRITICAL ISSUES:');
    critical.forEach(r => {
      console.log(`\n  ${r.issue}`);
      console.log(`  Count: ${r.count} (${r.percentage.toFixed(2)}%)`);
      if (r.fix) console.log(`  Fix: ${r.fix}`);
    });
  }

  if (warnings.length > 0) {
    console.log('\n\n🟡 WARNINGS:');
    warnings.forEach(r => {
      console.log(`\n  ${r.issue}`);
      console.log(`  Count: ${r.count} (${r.percentage.toFixed(2)}%)`);
      if (r.fix) console.log(`  Fix: ${r.fix}`);
    });
  }

  if (info.length > 0) {
    console.log('\n\n🔵 INFO:');
    info.forEach(r => {
      console.log(`\n  ${r.issue}`);
      if (r.fix) console.log(`  Fix: ${r.fix}`);
    });
  }

  if (results.length === 0) {
    console.log('✅ No data quality issues found!');
  }

  // Summary
  console.log('\n\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Total Active Jobs: ${totalActive || 0}`);
  console.log(`Critical Issues: ${critical.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Info Items: ${info.length}`);

  if (critical.length > 0) {
    console.log('\n⚠️  ACTION REQUIRED: Fix critical issues before matching!');
    process.exit(1);
  }

  return results;
}

// Run if called directly
if (require.main === module) {
  runDataQualityAudit()
    .then(() => {
      console.log('\n✅ Audit complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Audit failed:', error);
      process.exit(1);
    });
}

export { runDataQualityAudit };

