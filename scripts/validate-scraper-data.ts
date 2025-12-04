/**
 * SCRAPER DATA VALIDATION SCRIPT
 * Validates that scraper is saving correct, complete data
 * Run this to check for data quality issues before they reach matching
 */

import { getDatabaseClient } from '@/Utils/databasePool';
import { apiLogger } from '@/lib/api-logger';

interface ValidationIssue {
  severity: 'critical' | 'warning' | 'info';
  issue: string;
  count: number;
  percentage: number;
  fix?: string;
}

async function validateScraperData() {
  const supabase = getDatabaseClient();
  const issues: ValidationIssue[] = [];

  // 1. Check for missing critical fields
  const { data: missingCity } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .is('city', null)
    .not('location', 'is', null)
    .not('location', 'eq', '');

  const { data: missingCategories } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .or('categories.is.null,categories.eq.{}');

  const { data: missingWorkEnv } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .is('work_environment', null);

  const { data: totalActive } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  const total = totalActive?.length || 0;

  if (missingCity && missingCity.length > 0) {
    issues.push({
      severity: 'critical',
      issue: 'Jobs missing city (hurts city-based matching)',
      count: missingCity.length,
      percentage: (missingCity.length / total) * 100,
      fix: 'Run: UPDATE jobs SET city = SPLIT_PART(location, \',\', 1) WHERE city IS NULL AND location IS NOT NULL'
    });
  }

  if (missingCategories && missingCategories.length > 0) {
    issues.push({
      severity: 'critical',
      issue: 'Jobs missing categories (hurts career path matching)',
      count: missingCategories.length,
      percentage: (missingCategories.length / total) * 100,
      fix: 'Ensure scraper always sets categories array'
    });
  }

  if (missingWorkEnv && missingWorkEnv.length > 0) {
    issues.push({
      severity: 'warning',
      issue: 'Jobs missing work_environment',
      count: missingWorkEnv.length,
      percentage: (missingWorkEnv.length / total) * 100,
      fix: 'Ensure detectWorkEnvironment() always returns a value'
    });
  }

  // 2. Check for invalid data patterns
  const { data: emptyTitles } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .or('title.is.null,title.eq.');

  if (emptyTitles && emptyTitles.length > 0) {
    issues.push({
      severity: 'critical',
      issue: 'Jobs with empty titles (should never happen)',
      count: emptyTitles.length,
      percentage: (emptyTitles.length / total) * 100,
      fix: 'Fix scraper validation - reject jobs without titles'
    });
  }

  // 3. Check for remote jobs (should be filtered by scraper)
  const { data: remoteJobs } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .or('location.ilike.%remote%,location.ilike.%work from home%');

  if (remoteJobs && remoteJobs.length > 0) {
    issues.push({
      severity: 'warning',
      issue: 'Remote jobs in database (scraper should filter these)',
      count: remoteJobs.length,
      percentage: (remoteJobs.length / total) * 100,
      fix: 'Check scraper filter - line 368 in jobspy-save.cjs filters remote but some may slip through'
    });
  }

  // 4. Check for senior roles (should be filtered)
  const { data: seniorJobs } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .or('title.ilike.%senior%,title.ilike.%lead%,title.ilike.%director%')
    .not('is_internship', 'eq', true)
    .not('is_graduate', 'eq', true);

  if (seniorJobs && seniorJobs.length > 0) {
    issues.push({
      severity: 'warning',
      issue: 'Senior roles in database (should be filtered)',
      count: seniorJobs.length,
      percentage: (seniorJobs.length / total) * 100,
      fix: 'Improve classifyJobType() to filter senior roles'
    });
  }

  // 5. Check for duplicate job_hashes
  const { data: duplicates } = await supabase.rpc('check_duplicate_job_hashes');
  
  if (duplicates && duplicates.length > 0) {
    issues.push({
      severity: 'critical',
      issue: 'Duplicate job_hashes (data integrity issue)',
      count: duplicates.length,
      percentage: 0,
      fix: 'Investigate hash collision - job_hash should be unique'
    });
  }

  // 6. Check source data quality
  const { data: sourceQuality } = await supabase
    .from('jobs')
    .select('source')
    .eq('is_active', true);

  const sourceStats = new Map<string, { total: number; missingCity: number; missingCategories: number }>();
  
  sourceQuality?.forEach(job => {
    const stats = sourceStats.get(job.source) || { total: 0, missingCity: 0, missingCategories: 0 };
    stats.total++;
    sourceStats.set(job.source, stats);
  });

  // Print report
  console.log('\n========================================');
  console.log('SCRAPER DATA QUALITY AUDIT REPORT');
  console.log('========================================\n');

  if (issues.length === 0) {
    console.log('✅ No data quality issues found!');
  } else {
    issues.forEach((issue, idx) => {
      const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
      console.log(`${icon} [${issue.severity.toUpperCase()}] ${issue.issue}`);
      console.log(`   Count: ${issue.count} (${issue.percentage.toFixed(2)}%)`);
      if (issue.fix) {
        console.log(`   Fix: ${issue.fix}`);
      }
      console.log('');
    });
  }

  // Source quality breakdown
  console.log('\nSource Data Quality:');
  console.log('--------------------');
  for (const [source, stats] of sourceStats.entries()) {
    const cityCoverage = ((stats.total - stats.missingCity) / stats.total * 100).toFixed(1);
    const categoryCoverage = ((stats.total - stats.missingCategories) / stats.total * 100).toFixed(1);
    console.log(`${source}:`);
    console.log(`  Total: ${stats.total}`);
    console.log(`  City coverage: ${cityCoverage}%`);
    console.log(`  Category coverage: ${categoryCoverage}%`);
  }

  return issues;
}

// Run if called directly
if (require.main === module) {
  validateScraperData()
    .then(issues => {
      const criticalIssues = issues.filter(i => i.severity === 'critical');
      process.exit(criticalIssues.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

export { validateScraperData };

