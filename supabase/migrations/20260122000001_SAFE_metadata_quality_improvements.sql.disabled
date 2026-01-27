-- ============================================================================
-- METADATA QUALITY IMPROVEMENTS
-- Enhanced data quality and consistency fixes
-- Date: January 22, 2026
-- ============================================================================
-- This migration addresses metadata issues and improves data quality:
-- 1. Remove jobs with critical missing data
-- 2. Filter suspicious/test jobs
-- 3. Standardize data formats
-- 4. Clean up placeholder content
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FILTER JOBS WITH CRITICAL MISSING DATA
-- ============================================================================

-- Remove jobs with missing or empty titles
UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'missing_critical_data',
  updated_at = NOW()
WHERE is_active = true
  AND (title IS NULL OR title = '' OR TRIM(title) = '');

-- Remove jobs with missing or empty company names
UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'missing_critical_data',
  updated_at = NOW()
WHERE is_active = true
  AND (company IS NULL OR company = '' OR TRIM(company) = '');

-- Remove jobs with missing or invalid locations
UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'missing_location_data',
  updated_at = NOW()
WHERE is_active = true
  AND (location IS NULL OR location = '' OR TRIM(location) = '');

-- ============================================================================
-- 2. FILTER SUSPICIOUS AND TEST JOBS
-- ============================================================================

-- Remove obvious test/fake jobs
UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'suspicious_test_job',
  updated_at = NOW()
WHERE is_active = true
  AND (
    LOWER(title) LIKE '%test%' OR
    LOWER(title) LIKE '%fake%' OR
    LOWER(title) LIKE '%dummy%' OR
    LOWER(title) LIKE '%sample%' OR
    LOWER(company) LIKE '%test%' OR
    LOWER(company) LIKE '%fake%' OR
    LOWER(company) LIKE '%dummy%' OR
    LOWER(description) LIKE '%test job%' OR
    LOWER(description) LIKE '%fake listing%'
  );

-- ============================================================================
-- 3. FILTER JOBS WITH GENERIC/PLACEHOLDER CONTENT
-- ============================================================================

-- Remove jobs with generic company names
UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'generic_placeholder_content',
  updated_at = NOW()
WHERE is_active = true
  AND (
    LOWER(company) LIKE '%company%' AND LENGTH(company) <= 10 OR
    LOWER(company) IN ('ltd', 'limited', 'inc', 'corp', 'llc', 'gmbh', 'sa', 'sl') OR
    company ~ '^[A-Z]{2,5}$' OR  -- Acronyms only
    LOWER(company) LIKE '%recruit%' OR
    LOWER(company) LIKE '%agency%' OR
    LOWER(company) LIKE '%consulting%' AND LENGTH(company) <= 15
  );

-- Remove jobs with placeholder descriptions
UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'placeholder_description',
  updated_at = NOW()
WHERE is_active = true
  AND (
    description IS NULL OR
    LENGTH(TRIM(description)) < 50 OR
    LOWER(description) LIKE '%lorem ipsum%' OR
    LOWER(description) LIKE '%placeholder%' OR
    LOWER(description) LIKE '%coming soon%' OR
    LOWER(description) LIKE '%to be announced%'
  );

-- ============================================================================
-- 4. FILTER JOBS WITH UNREALISTIC REQUIREMENTS
-- ============================================================================

-- Remove jobs requiring impossible experience levels
UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'unrealistic_requirements',
  updated_at = NOW()
WHERE is_active = true
  AND (
    LOWER(description) LIKE '%20+ years%' OR
    LOWER(description) LIKE '%25+ years%' OR
    LOWER(description) LIKE '%30+ years%' OR
    LOWER(description) LIKE '%phd required%' AND LOWER(title) LIKE '%entry%' OR
    LOWER(description) LIKE '%c-level experience%' AND LOWER(title) LIKE '%junior%'
  );

-- ============================================================================
-- 5. CLEAN UP JOB BOARD COMPANIES
-- ============================================================================

-- Mark jobs posted by job boards as companies (already partially done)
UPDATE jobs
SET
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'job_board_as_company',
  updated_at = NOW()
WHERE is_active = true
  AND (
    LOWER(company) LIKE '%indeed%' OR
    LOWER(company) LIKE '%monster%' OR
    LOWER(company) LIKE '%reed%' OR
    LOWER(company) LIKE '%adzuna%' OR
    LOWER(company) LIKE '%careerjet%' OR
    LOWER(company) LIKE '%jooble%' OR
    LOWER(company) LIKE '%glassdoor%' OR
    LOWER(company) LIKE '%linkedin%' OR
    LOWER(company) LIKE '%totaljobs%'
  );

-- ============================================================================
-- 6. DATA CONSISTENCY FIXES
-- ============================================================================

-- Trim whitespace from text fields
UPDATE jobs
SET
  title = TRIM(title),
  company = TRIM(company),
  location = TRIM(location),
  description = TRIM(description),
  updated_at = NOW()
WHERE is_active = true;

-- Normalize empty strings to NULL where appropriate
UPDATE jobs
SET
  company_name = NULL
WHERE company_name = '' AND is_active = true;

UPDATE jobs
SET
  work_location = NULL
WHERE work_location = '' AND is_active = true;

-- ============================================================================
-- 7. BUSINESS LOGIC ENHANCEMENTS
-- ============================================================================

-- Mark graduate-friendly jobs more explicitly
UPDATE jobs
SET
  is_graduate = true,
  updated_at = NOW()
WHERE is_active = true
  AND is_graduate = false
  AND (
    LOWER(title) LIKE '%graduate%' OR
    LOWER(title) LIKE '%entry level%' OR
    LOWER(title) LIKE '%junior%' OR
    LOWER(title) LIKE '%trainee%' OR
    LOWER(description) LIKE '%graduate program%' OR
    LOWER(description) LIKE '%entry level%' OR
    LOWER(description) LIKE '%no experience required%' OR
    LOWER(description) LIKE '%recent graduate%'
  );

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check metadata quality improvements:
-- SELECT
--     filtered_reason,
--     COUNT(*) as job_count
-- FROM jobs
-- WHERE filtered_reason LIKE '%missing_critical_data%'
--    OR filtered_reason LIKE '%suspicious_test_job%'
--    OR filtered_reason LIKE '%generic_placeholder_content%'
--    OR filtered_reason LIKE '%placeholder_description%'
--    OR filtered_reason LIKE '%unrealistic_requirements%'
-- GROUP BY filtered_reason
-- ORDER BY job_count DESC;

-- Check data consistency:
-- SELECT
--     CASE
--         WHEN title IS NULL OR title = '' THEN 'empty_title'
--         WHEN company IS NULL OR company = '' THEN 'empty_company'
--         WHEN location IS NULL OR location = '' THEN 'empty_location'
--         ELSE 'valid'
--     END as data_quality,
--     COUNT(*) as job_count
-- FROM jobs
-- WHERE is_active = true
-- GROUP BY 1
-- ORDER BY 2 DESC;