-- ============================================
-- Data Consistency Fixes for JobPing Database
-- Run this migration to fix company names and ensure data consistency
-- ============================================

-- 1. Fix company_name: Populate from company field where company_name is NULL
-- This fixes the JobSpy Internships and other sources data quality issue
UPDATE jobs
SET company_name = company
WHERE company_name IS NULL 
  AND company IS NOT NULL 
  AND company != '';

-- 2. Standardize company_name: Trim whitespace and normalize
UPDATE jobs
SET company_name = TRIM(company_name)
WHERE company_name IS NOT NULL 
  AND company_name != TRIM(company_name);

-- 3. Fix company field consistency: Ensure company matches company_name
UPDATE jobs
SET company = company_name
WHERE company_name IS NOT NULL 
  AND company_name != ''
  AND (company IS NULL OR company = '' OR company != company_name);

-- 4. Fix inconsistent source labels
-- Ensure all sources are lowercase and standardized
UPDATE jobs
SET source = LOWER(TRIM(source))
WHERE source != LOWER(TRIM(source));

-- 5. Fix location consistency: Ensure city is populated from location where possible
UPDATE jobs
SET city = TRIM(SPLIT_PART(location, ',', 1))
WHERE city IS NULL 
  AND location IS NOT NULL 
  AND location != ''
  AND TRIM(SPLIT_PART(location, ',', 1)) != '';

-- 6. Standardize work_environment values
UPDATE jobs
SET work_environment = CASE
  WHEN LOWER(work_environment) IN ('remote', 'work from home', 'wfh', 'anywhere') THEN 'remote'
  WHEN LOWER(work_environment) IN ('hybrid', 'flexible', 'part remote') THEN 'hybrid'
  WHEN LOWER(work_environment) IN ('on-site', 'onsite', 'office', 'in-office') THEN 'on-site'
  ELSE work_environment
END
WHERE work_environment IS NOT NULL
  AND work_environment NOT IN ('remote', 'hybrid', 'on-site');

-- 7. Fix is_internship flag consistency
UPDATE jobs
SET is_internship = true
WHERE source = 'jobspy-internships'
  AND is_internship IS NOT TRUE;

-- 8. Ensure categories array consistency for internships
UPDATE jobs
SET categories = array_append(
  COALESCE(categories, ARRAY[]::text[]),
  'internship'
)
WHERE is_internship = true
  AND ('internship' = ANY(categories)) IS NOT TRUE;

-- 9. Fix experience_required consistency for internships
UPDATE jobs
SET experience_required = 'entry-level'
WHERE (is_internship = true OR source = 'jobspy-internships')
  AND (experience_required IS NULL OR experience_required != 'entry-level');

-- 10. Create index for faster company_name lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_jobs_company_name ON jobs(company_name) WHERE company_name IS NOT NULL;

-- 11. Create index for source lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source) WHERE is_active = true;

