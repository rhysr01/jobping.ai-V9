-- ============================================================================
-- CHECK YESTERDAY'S SCRAPER RUNS
-- ============================================================================
-- Shows jobs created in the last 24-48 hours grouped by source/scraper
-- ============================================================================

-- Get jobs created in the last 48 hours (to catch yesterday's runs)
SELECT 
  'Jobs Created in Last 48 Hours' as report_type,
  source,
  COUNT(*) as jobs_created,
  COUNT(*) FILTER (WHERE is_active = true) as active_jobs,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_jobs,
  COUNT(*) FILTER (WHERE is_early_career = true) as early_career_jobs,
  COUNT(*) FILTER (WHERE is_internship = true) as internship_jobs,
  COUNT(*) FILTER (WHERE is_graduate = true) as graduate_jobs,
  MIN(created_at) as earliest_job,
  MAX(created_at) as latest_job
FROM jobs
WHERE created_at >= NOW() - INTERVAL '48 hours'
GROUP BY source
ORDER BY jobs_created DESC;

-- Get jobs created yesterday specifically (last 24-48 hours)
SELECT 
  'Jobs Created Yesterday (24-48h ago)' as report_type,
  source,
  COUNT(*) as jobs_created,
  COUNT(*) FILTER (WHERE is_active = true) as active_jobs,
  MIN(created_at) as earliest_job,
  MAX(created_at) as latest_job
FROM jobs
WHERE created_at >= NOW() - INTERVAL '48 hours'
  AND created_at < NOW() - INTERVAL '24 hours'
GROUP BY source
ORDER BY jobs_created DESC;

-- Get jobs created in last 24 hours (today)
SELECT 
  'Jobs Created Today (Last 24h)' as report_type,
  source,
  COUNT(*) as jobs_created,
  COUNT(*) FILTER (WHERE is_active = true) as active_jobs,
  MIN(created_at) as earliest_job,
  MAX(created_at) as latest_job
FROM jobs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY source
ORDER BY jobs_created DESC;

-- Summary: Total jobs by source in last 7 days
SELECT 
  'Last 7 Days Summary' as report_type,
  source,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE is_active = true) as active_jobs,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as jobs_last_24h,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '48 hours' AND created_at < NOW() - INTERVAL '24 hours') as jobs_yesterday,
  MIN(created_at) as oldest_job_in_period,
  MAX(created_at) as newest_job_in_period
FROM jobs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY source
ORDER BY total_jobs DESC;

-- Check for language requirements in recent jobs
SELECT 
  'Recent Jobs with Language Requirements' as report_type,
  j.source,
  COUNT(DISTINCT j.id) as jobs_with_languages,
  array_agg(DISTINCT lang.lang) as languages_found
FROM jobs j
CROSS JOIN LATERAL unnest(j.language_requirements) AS lang(lang)
WHERE j.created_at >= NOW() - INTERVAL '48 hours'
  AND j.language_requirements IS NOT NULL
  AND array_length(j.language_requirements, 1) > 0
GROUP BY j.source
ORDER BY jobs_with_languages DESC;

