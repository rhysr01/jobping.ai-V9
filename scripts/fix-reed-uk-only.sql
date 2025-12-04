-- ============================================================================
-- FIX REED CITY EXTRACTION (UK ONLY)
-- ============================================================================
-- Reed only has UK jobs, so locations are UK-specific formats
-- Handles: "London", "London, UK", "London, England", "Greater London", etc.
-- ============================================================================

BEGIN;

-- Extract UK cities from Reed locations (UK-only source)
-- Handles various UK location formats
-- IMPORTANT: Only extract form cities, exclude country names
UPDATE jobs
SET 
    city = CASE
        -- London variations (must be exact word match, not "Greater London" etc)
        WHEN location ~* '\y(london)\y' AND location !~* '\y(united kingdom|uk|england|greater|area|region)\y' THEN 'London'
        -- Manchester variations
        WHEN location ~* '\y(manchester)\y' AND location !~* '\y(united kingdom|uk|england|greater|area|region)\y' THEN 'Manchester'
        -- Birmingham variations
        WHEN location ~* '\y(birmingham)\y' AND location !~* '\y(united kingdom|uk|england|greater|area|region)\y' THEN 'Birmingham'
        -- Dublin (Ireland, but Reed might have it)
        WHEN location ~* '\y(dublin)\y' AND location !~* '\y(ireland|republic|greater|area|region)\y' THEN 'Dublin'
        ELSE city
    END,
    updated_at = NOW()
WHERE is_active = true
  AND source = 'reed'
  AND city IS NULL
  AND location IS NOT NULL
  AND location != ''
  AND (
    -- Match UK city patterns (word boundaries to avoid false positives)
    -- Exclude if location contains country names
    location ~* '\y(london|manchester|birmingham|dublin)\y'
    AND location !~* '\y(united kingdom|uk|england|scotland|wales|northern ireland|ireland|republic)\y'
  )
  AND NOT (location ILIKE '%remote%' OR location ILIKE '%work from home%' OR location ILIKE '%wfh%');

-- Report results
DO $$
DECLARE
    fixed_count INTEGER;
    remaining_count INTEGER;
    sample_location TEXT;
BEGIN
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    
    SELECT COUNT(*) INTO remaining_count
    FROM jobs
    WHERE is_active = true
      AND source = 'reed'
      AND city IS NULL
      AND location IS NOT NULL;
    
    RAISE NOTICE 'Fixed % Reed jobs with city data', fixed_count;
    RAISE NOTICE 'Remaining Reed jobs without city: %', remaining_count;
    
    -- Show sample of remaining locations for debugging
    IF remaining_count > 0 THEN
        RAISE NOTICE 'Sample remaining locations:';
        FOR sample_location IN 
            SELECT DISTINCT location 
            FROM jobs
            WHERE is_active = true
              AND source = 'reed'
              AND city IS NULL
              AND location IS NOT NULL
            LIMIT 5
        LOOP
            RAISE NOTICE '  - %', sample_location;
        END LOOP;
    END IF;
END $$;

COMMIT;

-- Verify results
SELECT 
    'Reed City Extraction' as check_type,
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
    'Reed Missing City' as check_type,
    COUNT(*) as reed_jobs_missing_city,
    ROUND(COUNT(*) * 100.0 / NULLIF((
        SELECT COUNT(*) FROM jobs WHERE source = 'reed' AND is_active = true
    ), 0), 2) as percentage_missing_city
FROM jobs
WHERE is_active = true
  AND source = 'reed'
  AND city IS NULL
  AND location IS NOT NULL;

-- Show city distribution for Reed
SELECT 
    city,
    COUNT(*) as job_count
FROM jobs
WHERE is_active = true
  AND source = 'reed'
  AND city IS NOT NULL
GROUP BY city
ORDER BY job_count DESC;

