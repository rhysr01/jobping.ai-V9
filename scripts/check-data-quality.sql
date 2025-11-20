-- ============================================
-- Data Quality Check Queries
-- Run these to verify data consistency after fixes
-- ============================================

-- 1. Source diversity check
SELECT 
  source,
  COUNT(*) as total_jobs,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage,
  COUNT(DISTINCT company_name) as unique_companies,
  COUNT(DISTINCT city) as unique_cities,
  COUNT(*) FILTER (WHERE company_name IS NULL) as null_company_names,
  COUNT(*) FILTER (WHERE is_internship = true) as internships
FROM jobs
WHERE is_active = true
GROUP BY source
ORDER BY total_jobs DESC;

-- 2. Data quality report: Check for common issues
SELECT 
  'Total Active Jobs' as metric,
  COUNT(*)::text as value
FROM jobs
WHERE is_active = true

UNION ALL

SELECT 
  'Jobs with NULL company_name',
  COUNT(*)::text
FROM jobs
WHERE is_active = true AND company_name IS NULL

UNION ALL

SELECT 
  'Jobs with NULL company',
  COUNT(*)::text
FROM jobs
WHERE is_active = true AND company IS NULL

UNION ALL

SELECT 
  'Jobs with NULL city',
  COUNT(*)::text
FROM jobs
WHERE is_active = true AND city IS NULL

UNION ALL

SELECT 
  'Jobs with NULL location',
  COUNT(*)::text
FROM jobs
WHERE is_active = true AND location IS NULL

UNION ALL

SELECT 
  'Jobs with NULL job_url',
  COUNT(*)::text
FROM jobs
WHERE is_active = true AND job_url IS NULL

UNION ALL

SELECT 
  'Jobs with NULL title',
  COUNT(*)::text
FROM jobs
WHERE is_active = true AND title IS NULL

UNION ALL

SELECT 
  'Jobs with empty company_name',
  COUNT(*)::text
FROM jobs
WHERE is_active = true AND (company_name = '' OR company_name IS NULL)

UNION ALL

SELECT 
  'Internships without is_internship flag',
  COUNT(*)::text
FROM jobs
WHERE is_active = true 
  AND source = 'jobspy-internships'
  AND is_internship IS NOT TRUE;

-- 3. Check for duplicate company names with different casing
SELECT 
  LOWER(company_name) as normalized_name,
  COUNT(DISTINCT company_name) as variations,
  array_agg(DISTINCT company_name ORDER BY company_name) as variations_list,
  COUNT(*) as total_jobs
FROM jobs
WHERE company_name IS NOT NULL
  AND is_active = true
GROUP BY LOWER(company_name)
HAVING COUNT(DISTINCT company_name) > 1
ORDER BY total_jobs DESC
LIMIT 20;

-- 4. Check company_name consistency by source
SELECT 
  source,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE company_name IS NOT NULL AND company_name != '') as has_company_name,
  COUNT(*) FILTER (WHERE company_name IS NULL OR company_name = '') as missing_company_name,
  ROUND(
    COUNT(*) FILTER (WHERE company_name IS NOT NULL AND company_name != '') * 100.0 / COUNT(*),
    2
  ) as company_name_coverage_pct
FROM jobs
WHERE is_active = true
GROUP BY source
ORDER BY total_jobs DESC;

-- 5. Check work_environment standardization
SELECT 
  work_environment,
  COUNT(*) as job_count
FROM jobs
WHERE is_active = true
GROUP BY work_environment
ORDER BY job_count DESC;

-- 6. Check source label consistency
SELECT 
  source,
  COUNT(*) as job_count
FROM jobs
WHERE is_active = true
GROUP BY source
ORDER BY job_count DESC;

