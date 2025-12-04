-- ============================================================================
-- IMPROVED CITY EXTRACTION FOR REED JOBS
-- ============================================================================
-- This handles more location formats and extracts cities more flexibly
-- ============================================================================

BEGIN;

-- Method 1: Extract from comma-separated format (standard)
UPDATE jobs
SET 
    city = INITCAP(TRIM(SPLIT_PART(location, ',', 1))),
    updated_at = NOW()
WHERE is_active = true
  AND source = 'reed'
  AND city IS NULL
  AND location IS NOT NULL
  AND location != ''
  AND LOWER(TRIM(SPLIT_PART(location, ',', 1))) IN (
    'london', 'manchester', 'birmingham',
    'dublin',
    'paris',
    'amsterdam',
    'brussels',
    'berlin', 'hamburg', 'munich',
    'zurich',
    'madrid', 'barcelona',
    'milan', 'rome',
    'stockholm',
    'copenhagen',
    'vienna',
    'prague',
    'warsaw'
  );

-- Method 2: Extract from location if it contains city name (handles "London, UK" or "London")
UPDATE jobs
SET 
    city = CASE
        WHEN location ILIKE '%london%' THEN 'London'
        WHEN location ILIKE '%manchester%' THEN 'Manchester'
        WHEN location ILIKE '%birmingham%' THEN 'Birmingham'
        WHEN location ILIKE '%dublin%' THEN 'Dublin'
        WHEN location ILIKE '%paris%' THEN 'Paris'
        WHEN location ILIKE '%amsterdam%' THEN 'Amsterdam'
        WHEN location ILIKE '%brussels%' THEN 'Brussels'
        WHEN location ILIKE '%berlin%' THEN 'Berlin'
        WHEN location ILIKE '%hamburg%' THEN 'Hamburg'
        WHEN location ILIKE '%munich%' THEN 'Munich'
        WHEN location ILIKE '%zurich%' THEN 'Zurich'
        WHEN location ILIKE '%madrid%' THEN 'Madrid'
        WHEN location ILIKE '%barcelona%' THEN 'Barcelona'
        WHEN location ILIKE '%milan%' THEN 'Milan'
        WHEN location ILIKE '%rome%' THEN 'Rome'
        WHEN location ILIKE '%stockholm%' THEN 'Stockholm'
        WHEN location ILIKE '%copenhagen%' THEN 'Copenhagen'
        WHEN location ILIKE '%vienna%' THEN 'Vienna'
        WHEN location ILIKE '%prague%' THEN 'Prague'
        WHEN location ILIKE '%warsaw%' THEN 'Warsaw'
        ELSE city
    END,
    updated_at = NOW()
WHERE is_active = true
  AND source = 'reed'
  AND city IS NULL
  AND location IS NOT NULL
  AND location != ''
  AND (
    location ILIKE '%london%' OR
    location ILIKE '%manchester%' OR
    location ILIKE '%birmingham%' OR
    location ILIKE '%dublin%' OR
    location ILIKE '%paris%' OR
    location ILIKE '%amsterdam%' OR
    location ILIKE '%brussels%' OR
    location ILIKE '%berlin%' OR
    location ILIKE '%hamburg%' OR
    location ILIKE '%munich%' OR
    location ILIKE '%zurich%' OR
    location ILIKE '%madrid%' OR
    location ILIKE '%barcelona%' OR
    location ILIKE '%milan%' OR
    location ILIKE '%rome%' OR
    location ILIKE '%stockholm%' OR
    location ILIKE '%copenhagen%' OR
    location ILIKE '%vienna%' OR
    location ILIKE '%prague%' OR
    location ILIKE '%warsaw%'
  )
  AND NOT (location ILIKE '%remote%' OR location ILIKE '%work from home%');

-- Report results
DO $$
DECLARE
    method1_count INTEGER;
    method2_count INTEGER;
    total_fixed INTEGER;
BEGIN
    GET DIAGNOSTICS method1_count = ROW_COUNT;
    
    -- Count how many were fixed by method 2
    SELECT COUNT(*) INTO method2_count
    FROM jobs
    WHERE is_active = true
      AND source = 'reed'
      AND city IS NOT NULL
      AND updated_at > NOW() - INTERVAL '1 minute';
    
    total_fixed := method1_count + method2_count;
    
    RAISE NOTICE 'Fixed % Reed jobs with city data', total_fixed;
END $$;

COMMIT;

-- Verify results
SELECT 
    'After Fix' as check_type,
    COUNT(*) as reed_jobs_missing_city,
    ROUND(COUNT(*) * 100.0 / NULLIF((
        SELECT COUNT(*) FROM jobs WHERE source = 'reed' AND is_active = true
    ), 0), 2) as percentage
FROM jobs
WHERE is_active = true
  AND source = 'reed'
  AND city IS NULL
  AND location IS NOT NULL;

