-- ============================================================================
-- CHECK REMAINING REED LOCATIONS WITHOUT CITY
-- ============================================================================
-- See what location formats we're still missing
-- ============================================================================

-- Sample remaining locations to understand the format
SELECT 
    location,
    COUNT(*) as job_count
FROM jobs
WHERE is_active = true
  AND source = 'reed'
  AND city IS NULL
  AND location IS NOT NULL
GROUP BY location
ORDER BY job_count DESC
LIMIT 30;

-- Check if they contain city names but weren't matched
SELECT 
    location,
    CASE 
        WHEN location ILIKE '%london%' THEN 'Contains London'
        WHEN location ILIKE '%manchester%' THEN 'Contains Manchester'
        WHEN location ILIKE '%birmingham%' THEN 'Contains Birmingham'
        WHEN location ILIKE '%dublin%' THEN 'Contains Dublin'
        ELSE 'No city match'
    END as contains_city,
    COUNT(*) as job_count
FROM jobs
WHERE is_active = true
  AND source = 'reed'
  AND city IS NULL
  AND location IS NOT NULL
GROUP BY location
ORDER BY job_count DESC
LIMIT 20;

