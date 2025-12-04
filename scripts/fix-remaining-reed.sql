-- ============================================================================
-- FIX REMAINING REED CITY EXTRACTION
-- ============================================================================
-- More aggressive extraction for remaining Reed jobs
-- Handles edge cases and variations
-- ============================================================================

BEGIN;

-- Method 1: Extract city from start of location (handles "London, ..." formats)
UPDATE jobs
SET 
    city = CASE
        WHEN LOWER(TRIM(SPLIT_PART(location, ',', 1))) = 'london' THEN 'London'
        WHEN LOWER(TRIM(SPLIT_PART(location, ',', 1))) = 'manchester' THEN 'Manchester'
        WHEN LOWER(TRIM(SPLIT_PART(location, ',', 1))) = 'birmingham' THEN 'Birmingham'
        WHEN LOWER(TRIM(SPLIT_PART(location, ',', 1))) = 'dublin' THEN 'Dublin'
        ELSE city
    END,
    updated_at = NOW()
WHERE is_active = true
  AND source = 'reed'
  AND city IS NULL
  AND location IS NOT NULL
  AND location != ''
  AND LOWER(TRIM(SPLIT_PART(location, ',', 1))) IN ('london', 'manchester', 'birmingham', 'dublin')
  AND NOT (location ILIKE '%remote%' OR location ILIKE '%work from home%' OR location ILIKE '%wfh%');

-- Method 2: Extract from anywhere in location (handles "Greater London", "London Area", etc.)
UPDATE jobs
SET 
    city = CASE
        WHEN location ~* '\y(london)\y' 
             AND location !~* '\y(united kingdom|uk|england|scotland|wales|northern ireland)\y'
             AND city IS NULL THEN 'London'
        WHEN location ~* '\y(manchester)\y' 
             AND location !~* '\y(united kingdom|uk|england|scotland|wales|northern ireland)\y'
             AND city IS NULL THEN 'Manchester'
        WHEN location ~* '\y(birmingham)\y' 
             AND location !~* '\y(united kingdom|uk|england|scotland|wales|northern ireland)\y'
             AND city IS NULL THEN 'Birmingham'
        WHEN location ~* '\y(dublin)\y' 
             AND location !~* '\y(ireland|republic|united kingdom|uk)\y'
             AND city IS NULL THEN 'Dublin'
        ELSE city
    END,
    updated_at = NOW()
WHERE is_active = true
  AND source = 'reed'
  AND city IS NULL
  AND location IS NOT NULL
  AND location != ''
  AND (
    location ~* '\y(london|manchester|birmingham|dublin)\y'
  )
  AND NOT (location ILIKE '%remote%' OR location ILIKE '%work from home%' OR location ILIKE '%wfh%');

-- Report results
DO $$
DECLARE
    method1_count INTEGER;
    method2_count INTEGER;
    total_fixed INTEGER;
    remaining_count INTEGER;
BEGIN
    -- Get count from method 1
    SELECT COUNT(*) INTO method1_count
    FROM jobs
    WHERE is_active = true
      AND source = 'reed'
      AND city IS NOT NULL
      AND updated_at > NOW() - INTERVAL '1 minute';
    
    -- Get remaining count
    SELECT COUNT(*) INTO remaining_count
    FROM jobs
    WHERE is_active = true
      AND source = 'reed'
      AND city IS NULL
      AND location IS NOT NULL;
    
    total_fixed := method1_count;
    
    RAISE NOTICE 'Fixed % Reed jobs with city data', total_fixed;
    RAISE NOTICE 'Remaining Reed jobs without city: %', remaining_count;
END $$;

COMMIT;

-- Verify results
SELECT 
    'After Additional Fix' as check_type,
    COUNT(*) as reed_jobs_with_city,
    ROUND(COUNT(*) * 100.0 / NULLIF((
        SELECT COUNT(*) FROM jobs WHERE source = 'reed' AND is_active = true
    ), 0), 2) as percentage_with_city
FROM jobs
WHERE is_active = true
  AND source = 'reed'
  AND city IS NOT NULL

UNION ALL

SELECT 
    'Remaining Missing City' as check_type,
    COUNT(*) as reed_jobs_missing_city,
    ROUND(COUNT(*) * 100.0 / NULLIF((
        SELECT COUNT(*) FROM jobs WHERE source = 'reed' AND is_active = true
    ), 0), 2) as percentage_missing_city
FROM jobs
WHERE is_active = true
  AND source = 'reed'
  AND city IS NULL
  AND location IS NOT NULL;

-- Show sample of remaining locations
SELECT 
    'Sample Remaining Locations' as report_type,
    location,
    COUNT(*) as job_count
FROM jobs
WHERE is_active = true
  AND source = 'reed'
  AND city IS NULL
  AND location IS NOT NULL
GROUP BY location
ORDER BY job_count DESC
LIMIT 10;

