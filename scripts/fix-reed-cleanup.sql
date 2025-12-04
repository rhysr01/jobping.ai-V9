-- ============================================================================
-- CLEANUP REED CITY DATA
-- ============================================================================
-- Fix issues found:
-- 1. "United Kingdom" set as city (should be NULL)
-- 2. Non-form cities like "Dukinfield" (should be NULL)
-- ============================================================================

BEGIN;

-- Remove "United Kingdom" and other country names that were incorrectly set as cities
UPDATE jobs
SET 
    city = NULL,
    updated_at = NOW()
WHERE is_active = true
  AND source = 'reed'
  AND city IN (
    'United Kingdom', 'UK', 'England', 'Scotland', 'Wales', 'Northern Ireland',
    'Ireland', 'Republic of Ireland'
  );

-- Remove cities that are NOT in the signup form list
UPDATE jobs
SET 
    city = NULL,
    updated_at = NOW()
WHERE is_active = true
  AND source = 'reed'
  AND city IS NOT NULL
  AND city NOT IN (
    -- ONLY cities from signup form (lib/config.ts targetCities)
    'London', 'Manchester', 'Birmingham',
    'Dublin',
    'Paris',
    'Amsterdam',
    'Brussels',
    'Berlin', 'Hamburg', 'Munich',
    'Zurich',
    'Madrid', 'Barcelona',
    'Milan', 'Rome',
    'Stockholm',
    'Copenhagen',
    'Vienna',
    'Prague',
    'Warsaw'
  );

-- Report cleanup results
DO $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RAISE NOTICE 'Cleaned up % Reed jobs with invalid city data', cleaned_count;
END $$;

COMMIT;

-- Verify cleanup
SELECT 
    'After Cleanup' as check_type,
    city,
    COUNT(*) as job_count
FROM jobs
WHERE is_active = true
  AND source = 'reed'
  AND city IS NOT NULL
GROUP BY city
ORDER BY job_count DESC;

-- Show remaining jobs without city
SELECT 
    'Remaining Missing City' as check_type,
    COUNT(*) as reed_jobs_missing_city,
    ROUND(COUNT(*) * 100.0 / NULLIF((
        SELECT COUNT(*) FROM jobs WHERE source = 'reed' AND is_active = true
    ), 0), 2) as percentage
FROM jobs
WHERE is_active = true
  AND source = 'reed'
  AND city IS NULL
  AND location IS NOT NULL;

