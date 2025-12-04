-- ============================================================================
-- CHECK REED LOCATION FORMATS
-- ============================================================================
-- This helps us understand why Reed jobs are missing city data
-- ============================================================================

-- Sample Reed locations to see the format
SELECT 
    location,
    city,
    country,
    source,
    COUNT(*) as count
FROM jobs
WHERE is_active = true
  AND source = 'reed'
  AND city IS NULL
  AND location IS NOT NULL
GROUP BY location, city, country, source
ORDER BY count DESC
LIMIT 50;

-- Check if locations contain form cities but weren't extracted
SELECT 
    location,
    city,
    SPLIT_PART(location, ',', 1) as first_part,
    LOWER(SPLIT_PART(location, ',', 1)) as first_part_lower,
    CASE 
        WHEN LOWER(SPLIT_PART(location, ',', 1)) IN (
            'london', 'manchester', 'birmingham',
            'dublin', 'paris', 'amsterdam', 'brussels',
            'berlin', 'hamburg', 'munich', 'zurich',
            'madrid', 'barcelona', 'milan', 'rome',
            'stockholm', 'copenhagen', 'vienna', 'prague', 'warsaw'
        ) THEN '✅ Should match'
        ELSE '❌ No match'
    END as should_extract
FROM jobs
WHERE is_active = true
  AND source = 'reed'
  AND city IS NULL
  AND location IS NOT NULL
LIMIT 20;

