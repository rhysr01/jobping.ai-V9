-- Remove "experienced" category (leftover from old scrapers)
BEGIN;

UPDATE jobs
SET categories = array_remove(categories, 'experienced')
WHERE status = 'active'
  AND 'experienced' = ANY(categories);

-- Verify it's gone
SELECT 
  COUNT(*) as jobs_with_experienced_category
FROM jobs
WHERE status = 'active'
  AND 'experienced' = ANY(COALESCE(categories, '{}'));

-- Show category distribution after fix
SELECT 
  category,
  COUNT(*) as count
FROM (
  SELECT UNNEST(categories) as category
  FROM jobs
  WHERE status = 'active'
) sub
WHERE category != 'early-career'
GROUP BY category
ORDER BY count DESC;

COMMIT;

