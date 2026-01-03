-- COMPREHENSIVE DATA QUALITY FIX
-- Fixes all identified data quality issues
-- Run this in Supabase SQL Editor

BEGIN;

-- ============================================================================
-- 1. SYNC COMPANY_NAME FROM COMPANY FIELD (CRITICAL - 7,206 jobs)
-- ============================================================================
UPDATE jobs
SET company_name = company
WHERE company_name IS NULL 
  AND company IS NOT NULL
  AND company != ''
  AND filtered_reason NOT LIKE '%job_board_as_company%';

-- ============================================================================
-- 2. FLAG JOB BOARD COMPANIES (9 jobs)
-- ============================================================================
UPDATE jobs
SET filtered_reason = COALESCE(filtered_reason || '; ', '') || 'job_board_as_company',
    company_name = NULL
WHERE company IN ('Reed', 'Indeed', 'LinkedIn', 'Adzuna', 'Totaljobs', 
                  'Monster', 'ZipRecruiter', 'Jobspy', 'Google', 'StepStone Group', 'StepStone')
   OR company ILIKE '%indeed%'
   OR company ILIKE '%reed%'
   OR company ILIKE '%adzuna%'
   OR company ILIKE '%jobspy%'
   OR company ILIKE '%linkedin%'
   OR company ILIKE '%totaljobs%'
   OR company ILIKE '%monster%'
   OR company ILIKE '%ziprecruiter%'
   OR company ILIKE '%efinancial%'
   OR company ILIKE '%stepstone%'
   OR company_name ILIKE '%efinancial%'
   OR company_name ILIKE '%stepstone%'
   -- Exclude legitimate recruitment agencies (they place candidates at companies)
   AND company NOT ILIKE '%recruitment%'
   AND company NOT ILIKE '%staffing%'
   AND company NOT ILIKE '%placement%';

-- ============================================================================
-- 3. EXTRACT CITY FROM LOCATION FIELD (2,036 jobs missing city)
-- ============================================================================
UPDATE jobs
SET city = TRIM(SPLIT_PART(location, ',', 1))
WHERE city IS NULL 
  AND location IS NOT NULL 
  AND location != ''
  AND location LIKE '%,%'
  AND TRIM(SPLIT_PART(location, ',', 1)) != ''
  -- Don't extract if it looks like a country name
  AND TRIM(SPLIT_PART(location, ',', 1)) NOT IN (
    'España', 'Deutschland', 'Österreich', 'Nederland', 'Belgique', 
    'United Kingdom', 'UK', 'USA', 'US', 'France', 'Germany', 
    'Spain', 'Austria', 'Netherlands', 'Belgium', 'Ireland', 
    'Schweiz', 'Switzerland', 'Italia', 'Italy', 'Poland', 'Polska'
  );

-- ============================================================================
-- 4. EXTRACT COUNTRY FROM LOCATION FIELD (2,051 jobs missing country)
-- ============================================================================
UPDATE jobs
SET country = TRIM(SPLIT_PART(location, ',', 2))
WHERE country IS NULL 
  AND location IS NOT NULL 
  AND location != ''
  AND location LIKE '%,%'
  AND TRIM(SPLIT_PART(location, ',', 2)) != '';

-- ============================================================================
-- 5. FIX VERY OLD POSTED DATES (4 jobs)
-- ============================================================================
UPDATE jobs
SET posted_at = created_at
WHERE posted_at < NOW() - INTERVAL '2 years'
  AND created_at IS NOT NULL;

-- ============================================================================
-- 6. FIX NULL POSTED DATES (154 jobs)
-- ============================================================================
UPDATE jobs
SET posted_at = created_at
WHERE posted_at IS NULL
  AND created_at IS NOT NULL;

-- ============================================================================
-- 7. FIX EMPTY CATEGORIES (11 jobs)
-- ============================================================================
UPDATE jobs
SET categories = ARRAY['early-career']
WHERE categories IS NULL 
   OR array_length(categories, 1) IS NULL 
   OR array_length(categories, 1) = 0;

-- ============================================================================
-- 8. FIX VERY SHORT DESCRIPTIONS (1,282 jobs)
-- ============================================================================
-- Build minimal description from title and company
UPDATE jobs
SET description = COALESCE(
  title || ' at ' || company_name || COALESCE(' at ' || company, ''),
  title || ' position',
  'Job opportunity'
)
WHERE (description IS NULL OR description = '' OR LENGTH(description) < 20)
  AND title IS NOT NULL;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================================================
-- SELECT COUNT(*) as total_jobs FROM jobs;
-- SELECT COUNT(*) as jobs_with_company_name FROM jobs WHERE company_name IS NOT NULL;
-- SELECT COUNT(*) as jobs_with_city FROM jobs WHERE city IS NOT NULL;
-- SELECT COUNT(*) as jobs_with_country FROM jobs WHERE country IS NOT NULL;
-- SELECT COUNT(*) as jobs_with_description FROM jobs WHERE description IS NOT NULL AND LENGTH(description) >= 20;
-- SELECT COUNT(*) as job_board_companies FROM jobs WHERE filtered_reason LIKE '%job_board_as_company%';

COMMIT;

