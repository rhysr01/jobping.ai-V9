-- FIX DATA QUALITY ISSUES
-- Run this in Supabase SQL Editor to fix critical data problems

BEGIN;

-- ============================================================================
-- 1. SYNC COMPANY_NAME FROM COMPANY FIELD (CRITICAL)
-- ============================================================================
-- 7,206 jobs have NULL company_name but company field has data
UPDATE jobs
SET company_name = company
WHERE company_name IS NULL 
  AND company IS NOT NULL
  AND company != ''
  AND filtered_reason NOT LIKE '%job_board_as_company%';

-- ============================================================================
-- 2. FLAG JOB BOARD COMPANIES
-- ============================================================================
UPDATE jobs
SET filtered_reason = COALESCE(filtered_reason || '; ', '') || 'job_board_as_company',
    company_name = NULL
WHERE company IN ('Reed', 'Indeed', 'LinkedIn', 'Adzuna', 'Totaljobs', 
                  'Monster', 'ZipRecruiter', 'Jobspy', 'Google')
   OR company ILIKE '%indeed%'
   OR company ILIKE '%reed%'
   OR company ILIKE '%adzuna%'
   OR company ILIKE '%jobspy%'
   OR company ILIKE '%linkedin%'
   OR company ILIKE '%totaljobs%'
   OR company ILIKE '%monster%'
   OR company ILIKE '%ziprecruiter%';

-- ============================================================================
-- 3. EXTRACT CITY FROM LOCATION FIELD WHERE CITY IS NULL
-- ============================================================================
-- Try to extract city from location field for jobs missing city
UPDATE jobs
SET city = TRIM(SPLIT_PART(location, ',', 1))
WHERE city IS NULL 
  AND location IS NOT NULL 
  AND location != ''
  AND location LIKE '%,%'
  AND TRIM(SPLIT_PART(location, ',', 1)) != '';

-- ============================================================================
-- 4. EXTRACT COUNTRY FROM LOCATION FIELD WHERE COUNTRY IS NULL
-- ============================================================================
UPDATE jobs
SET country = TRIM(SPLIT_PART(location, ',', 2))
WHERE country IS NULL 
  AND location IS NOT NULL 
  AND location != ''
  AND location LIKE '%,%'
  AND TRIM(SPLIT_PART(location, ',', 2)) != '';

-- ============================================================================
-- 5. FIX VERY OLD POSTED DATES (> 2 years = likely invalid)
-- ============================================================================
UPDATE jobs
SET posted_at = created_at
WHERE posted_at < NOW() - INTERVAL '2 years'
  AND created_at IS NOT NULL;

-- ============================================================================
-- 6. VERIFICATION QUERIES
-- ============================================================================
-- Run these after migration to verify improvements:

-- SELECT COUNT(*) as total_jobs FROM jobs;
-- SELECT COUNT(*) as jobs_with_company_name FROM jobs WHERE company_name IS NOT NULL;
-- SELECT COUNT(*) as jobs_with_city FROM jobs WHERE city IS NOT NULL;
-- SELECT COUNT(*) as jobs_with_country FROM jobs WHERE country IS NOT NULL;
-- SELECT COUNT(*) as job_board_companies FROM jobs WHERE filtered_reason LIKE '%job_board_as_company%';

COMMIT;
