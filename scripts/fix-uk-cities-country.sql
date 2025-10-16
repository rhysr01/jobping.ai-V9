-- Fix country field for Manchester and Birmingham
BEGIN;

UPDATE jobs
SET country = 'GB'
WHERE status = 'active'
  AND city IN ('Manchester', 'Birmingham')
  AND country IS NULL;

-- Verify fix
SELECT
  city,
  country,
  COUNT(*) as jobs
FROM jobs
WHERE status = 'active'
  AND city IN ('London', 'Manchester', 'Birmingham', 'Dublin')
GROUP BY city, country
ORDER BY jobs DESC;

COMMIT;

