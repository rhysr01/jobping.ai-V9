-- ============================================================================
-- FIX DATA QUALITY ISSUES
-- ============================================================================
-- This migration fixes:
-- 1. Jobs with missing location data
-- 2. Jobs with very old posting dates
-- 3. Jobs with null/empty critical fields
-- ============================================================================
-- Date: January 4, 2026
-- Affected: ~17 jobs
-- ============================================================================

BEGIN;

-- Step 1: Mark jobs with missing location data as inactive
-- These jobs cannot be properly matched to users
UPDATE jobs
SET 
    is_active = false,
    status = 'incomplete',
    filtered_reason = 'Missing location data',
    updated_at = NOW()
WHERE (location IS NULL OR TRIM(location) = '')
AND (city IS NULL OR TRIM(city) = '')
AND (country IS NULL OR TRIM(country) = '')
AND is_active = true;

-- Step 2: Mark jobs with null/empty title as inactive
UPDATE jobs
SET 
    is_active = false,
    status = 'incomplete',
    filtered_reason = 'Missing title',
    updated_at = NOW()
WHERE (title IS NULL OR TRIM(title) = '')
AND is_active = true;

-- Step 3: Mark jobs with null/empty company as inactive
UPDATE jobs
SET 
    is_active = false,
    status = 'incomplete',
    filtered_reason = 'Missing company name',
    updated_at = NOW()
WHERE (company IS NULL OR TRIM(company) = '')
AND is_active = true;

-- Step 4: Mark jobs with null/empty description as inactive
-- Description is critical for matching and user experience
UPDATE jobs
SET 
    is_active = false,
    status = 'incomplete',
    filtered_reason = 'Missing description',
    updated_at = NOW()
WHERE (description IS NULL OR TRIM(description) = '')
AND is_active = true;

-- Step 5: Review jobs with very old posting dates (>2 years)
-- Mark as inactive if original_posted_date is more than 2 years old
-- and the job hasn't been seen recently
UPDATE jobs
SET 
    is_active = false,
    status = 'expired',
    filtered_reason = 'Job posting is more than 2 years old',
    updated_at = NOW()
WHERE original_posted_date IS NOT NULL
AND original_posted_date < CURRENT_DATE - INTERVAL '2 years'
AND last_seen_at < NOW() - INTERVAL '30 days'
AND is_active = true;

-- Step 6: Fix invalid URLs (mark jobs as inactive if URL is clearly broken)
UPDATE jobs
SET 
    is_active = false,
    status = 'invalid',
    filtered_reason = 'Invalid job URL format',
    updated_at = NOW()
WHERE job_url IS NOT NULL
AND (
    (job_url NOT LIKE 'http://%' AND job_url NOT LIKE 'https://%')
    OR LENGTH(job_url) < 10
    OR job_url = ''
)
AND is_active = true;

-- Step 7: Log the results
DO $$
DECLARE
    missing_location_count INTEGER;
    missing_title_count INTEGER;
    missing_company_count INTEGER;
    missing_description_count INTEGER;
    old_posting_count INTEGER;
    invalid_url_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_location_count
    FROM jobs
    WHERE status = 'incomplete' AND filtered_reason = 'Missing location data';
    
    SELECT COUNT(*) INTO missing_title_count
    FROM jobs
    WHERE status = 'incomplete' AND filtered_reason = 'Missing title';
    
    SELECT COUNT(*) INTO missing_company_count
    FROM jobs
    WHERE status = 'incomplete' AND filtered_reason = 'Missing company name';
    
    SELECT COUNT(*) INTO missing_description_count
    FROM jobs
    WHERE status = 'incomplete' AND filtered_reason = 'Missing description';
    
    SELECT COUNT(*) INTO old_posting_count
    FROM jobs
    WHERE status = 'expired' AND filtered_reason = 'Job posting is more than 2 years old';
    
    SELECT COUNT(*) INTO invalid_url_count
    FROM jobs
    WHERE status = 'invalid' AND filtered_reason = 'Invalid job URL format';
    
    RAISE NOTICE 'Data quality fixes applied:';
    RAISE NOTICE '  Missing location: %', missing_location_count;
    RAISE NOTICE '  Missing title: %', missing_title_count;
    RAISE NOTICE '  Missing company: %', missing_company_count;
    RAISE NOTICE '  Missing description: %', missing_description_count;
    RAISE NOTICE '  Old postings (>2 years): %', old_posting_count;
    RAISE NOTICE '  Invalid URLs: %', invalid_url_count;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to verify)
-- ============================================================================
-- Check inactive jobs by reason:
-- SELECT status, filtered_reason, COUNT(*) 
-- FROM jobs 
-- WHERE status IN ('incomplete', 'expired', 'invalid')
-- GROUP BY status, filtered_reason;
--
-- Check remaining jobs with missing data:
-- SELECT COUNT(*) FROM jobs 
-- WHERE is_active = true 
-- AND ((location IS NULL OR TRIM(location) = '') AND (city IS NULL OR TRIM(city) = '') AND (country IS NULL OR TRIM(country) = ''));
--
-- Check old postings:
-- SELECT id, title, company, original_posted_date, last_seen_at 
-- FROM jobs 
-- WHERE original_posted_date < CURRENT_DATE - INTERVAL '2 years'
-- AND is_active = true
-- LIMIT 10;

