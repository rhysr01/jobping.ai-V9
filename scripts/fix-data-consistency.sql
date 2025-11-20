-- ============================================
-- Data Consistency Fixes for JobPing Database
-- ============================================
-- Run these queries to ensure all company names and labels are consistent

-- 1. Fix company_name: Populate from company field where company_name is NULL
-- This fixes the JobSpy Internships data quality issue
UPDATE jobs
SET company_name = company
WHERE company_name IS NULL 
  AND company IS NOT NULL 
  AND company != '';

-- 2. Verify the fix: Check how many jobs were updated
SELECT 
  'Before Fix' as status,
  COUNT(*) as jobs_with_null_company_name
FROM jobs
WHERE company_name IS NULL AND company IS NOT NULL AND company != '';

-- 3. Standardize company_name: Trim whitespace and normalize
UPDATE jobs
SET company_name = TRIM(company_name)
WHERE company_name IS NOT NULL 
  AND company_name != TRIM(company_name);

-- 4. Fix company field consistency: Ensure company matches company_name
UPDATE jobs
SET company = company_name
WHERE company_name IS NOT NULL 
  AND company_name != ''
  AND (company IS NULL OR company = '' OR company != company_name);

-- 5. Check for duplicate company names with different casing
SELECT 
  LOWER(company_name) as normalized_name,
  COUNT(DISTINCT company_name) as variations,
  array_agg(DISTINCT company_name) as variations_list,
  COUNT(*) as total_jobs
FROM jobs
WHERE company_name IS NOT NULL
GROUP BY LOWER(company_name)
HAVING COUNT(DISTINCT company_name) > 1
ORDER BY total_jobs DESC
LIMIT 20;

-- 6. Fix inconsistent source labels
-- Ensure all sources are lowercase and standardized
UPDATE jobs
SET source = LOWER(TRIM(source))
WHERE source != LOWER(TRIM(source));

-- 7. Check source consistency
SELECT 
  source,
  COUNT(*) as job_count,
  COUNT(DISTINCT company_name) as unique_companies,
  COUNT(*) FILTER (WHERE company_name IS NULL) as null_company_names
FROM jobs
WHERE is_active = true
GROUP BY source
ORDER BY job_count DESC;

-- 8. Fix location consistency: Ensure city is populated from location where possible
UPDATE jobs
SET city = SPLIT_PART(location, ',', 1)
WHERE city IS NULL 
  AND location IS NOT NULL 
  AND location != ''
  AND SPLIT_PART(location, ',', 1) != '';

-- 9. Standardize work_environment values
UPDATE jobs
SET work_environment = CASE
  WHEN LOWER(work_environment) IN ('remote', 'work from home', 'wfh', 'anywhere') THEN 'remote'
  WHEN LOWER(work_environment) IN ('hybrid', 'flexible', 'part remote') THEN 'hybrid'
  WHEN LOWER(work_environment) IN ('on-site', 'onsite', 'office', 'in-office') THEN 'on-site'
  ELSE work_environment
END
WHERE work_environment IS NOT NULL;

-- 10. Fix is_internship flag consistency
UPDATE jobs
SET is_internship = true
WHERE source = 'jobspy-internships'
  AND is_internship IS NOT true;

-- 11. Ensure categories array consistency for internships
UPDATE jobs
SET categories = array_append(
  COALESCE(categories, ARRAY[]::text[]),
  'internship'
)
WHERE is_internship = true
  AND ('internship' = ANY(categories)) IS NOT TRUE;

-- 12. Fix experience_required consistency
UPDATE jobs
SET experience_required = 'entry-level'
WHERE (is_internship = true OR source = 'jobspy-internships')
  AND (experience_required IS NULL OR experience_required != 'entry-level');

-- 13. Data quality report: Check for common issues
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

-- 14. Source diversity check after fixes
SELECT 
  source,
  COUNT(*) as total_jobs,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage,
  COUNT(DISTINCT company_name) as unique_companies,
  COUNT(DISTINCT city) as unique_cities,
  COUNT(*) FILTER (WHERE company_name IS NULL) as null_company_names
FROM jobs
WHERE is_active = true
GROUP BY source
ORDER BY total_jobs DESC;

