-- ============================================================================
-- FINAL CLEANUP - Working Version
-- ============================================================================
-- Fixes city extraction, removes senior roles, filters non-target cities
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Fix NULL city values (extract from location)
-- ============================================================================

UPDATE jobs
SET city = CASE
  WHEN location LIKE 'London%' THEN 'London'
  WHEN location LIKE 'Paris%' THEN 'Paris'
  WHEN location LIKE 'Milan%' OR location LIKE 'Milano%' THEN 'Milan'
  WHEN location LIKE 'Berlin%' THEN 'Berlin'
  WHEN location LIKE 'Madrid%' THEN 'Madrid'
  WHEN location LIKE 'Amsterdam%' THEN 'Amsterdam'
  WHEN location LIKE 'Munich%' OR location LIKE 'München%' THEN 'Munich'
  WHEN location LIKE 'Hamburg%' THEN 'Hamburg'
  WHEN location LIKE 'Zurich%' OR location LIKE 'Zürich%' THEN 'Zurich'
  WHEN location LIKE 'Rome%' OR location LIKE 'Roma%' THEN 'Rome'
  WHEN location LIKE 'Dublin%' THEN 'Dublin'
  WHEN location LIKE 'Brussels%' OR location LIKE 'Bruxelles%' OR location LIKE 'Brussel%' THEN 'Brussels'
  ELSE SPLIT_PART(location, ',', 1)
END
WHERE status = 'active' 
  AND city IS NULL;

-- ============================================================================
-- STEP 2: Further normalize location variants to standard format
-- ============================================================================

UPDATE jobs SET location = 'Paris, FR' WHERE status = 'active' AND (location LIKE 'Paris%' AND location != 'Paris, FR');
UPDATE jobs SET location = 'London, GB' WHERE status = 'active' AND (location LIKE 'London%' AND location != 'London, GB');
UPDATE jobs SET location = 'Milan, IT' WHERE status = 'active' AND (location LIKE 'Milan%' OR location LIKE 'Milano%') AND location != 'Milan, IT';
UPDATE jobs SET location = 'Berlin, DE' WHERE status = 'active' AND (location LIKE 'Berlin%' AND location != 'Berlin, DE');
UPDATE jobs SET location = 'Madrid, ES' WHERE status = 'active' AND (location LIKE 'Madrid%' AND location != 'Madrid, ES');
UPDATE jobs SET location = 'Amsterdam, NL' WHERE status = 'active' AND (location LIKE 'Amsterdam%' AND location != 'Amsterdam, NL');
UPDATE jobs SET location = 'Munich, DE' WHERE status = 'active' AND (location LIKE 'Munich%' OR location LIKE 'München%') AND location != 'Munich, DE';
UPDATE jobs SET location = 'Hamburg, DE' WHERE status = 'active' AND (location LIKE 'Hamburg%' AND location != 'Hamburg, DE');
UPDATE jobs SET location = 'Zurich, CH' WHERE status = 'active' AND (location LIKE 'Zurich%' OR location LIKE 'Zürich%') AND location != 'Zurich, CH';
UPDATE jobs SET location = 'Rome, IT' WHERE status = 'active' AND (location LIKE 'Rome%' OR location LIKE 'Roma%') AND location != 'Rome, IT';
UPDATE jobs SET location = 'Dublin, IE' WHERE status = 'active' AND (location LIKE 'Dublin%' AND location != 'Dublin, IE');
UPDATE jobs SET location = 'Brussels, BE' WHERE status = 'active' AND (location LIKE 'Brussels%' OR location LIKE 'Bruxelles%' OR location LIKE 'Brussel%') AND location != 'Brussels, BE';

-- ============================================================================
-- STEP 3: Remove jobs from NON-target cities (using city field)
-- ============================================================================

UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'non_target_city_final',
  updated_at = now()
WHERE status = 'active'
  AND city IS NOT NULL
  AND city NOT IN ('London', 'Paris', 'Milan', 'Berlin', 'Madrid', 'Amsterdam', 
                   'Munich', 'Hamburg', 'Zurich', 'Rome', 'Dublin', 'Brussels');

-- Also by location for jobs where city extraction failed
UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'non_target_city_final',
  updated_at = now()
WHERE status = 'active'
  AND location NOT IN ('London, GB', 'Paris, FR', 'Milan, IT', 'Berlin, DE', 'Madrid, ES', 
                       'Amsterdam, NL', 'Munich, DE', 'Hamburg, DE', 'Zurich, CH', 
                       'Rome, IT', 'Dublin, IE', 'Brussels, BE')
  AND location NOT LIKE 'London%'
  AND location NOT LIKE 'Paris%'
  AND location NOT LIKE 'Milan%'
  AND location NOT LIKE 'Milano%'
  AND location NOT LIKE 'Berlin%'
  AND location NOT LIKE 'Madrid%'
  AND location NOT LIKE 'Amsterdam%'
  AND location NOT LIKE 'Munich%'
  AND location NOT LIKE 'München%'
  AND location NOT LIKE 'Hamburg%'
  AND location NOT LIKE 'Zurich%'
  AND location NOT LIKE 'Zürich%'
  AND location NOT LIKE 'Rome%'
  AND location NOT LIKE 'Roma%'
  AND location NOT LIKE 'Dublin%'
  AND location NOT LIKE 'Brussels%'
  AND location NOT LIKE 'Bruxelles%';

-- ============================================================================
-- STEP 4: Remove senior/manager roles (using LIKE for better matching)
-- ============================================================================

UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'senior_manager_final',
  updated_at = now()
WHERE status = 'active'
  AND (
    LOWER(title) LIKE '%senior %'
    OR LOWER(title) LIKE '% senior'
    OR LOWER(title) LIKE '%manager%'
    OR LOWER(title) LIKE '%director%'
    OR LOWER(title) LIKE '%head of%'
    OR LOWER(title) LIKE '% lead'
    OR LOWER(title) LIKE 'lead %'
  );

-- ============================================================================
-- STEP 5: Remove remaining non-business garbage
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'healthcare_final', updated_at = now()
WHERE status = 'active'
  AND LOWER(title) LIKE ANY(ARRAY['%nurse%', '%doctor%', '%medical%', '%healthcare%', '%pflege%']);

UPDATE jobs
SET status = 'inactive', filtered_reason = 'retail_final', updated_at = now()
WHERE status = 'active'
  AND LOWER(title) LIKE ANY(ARRAY['%retail%', '%mcdonalds%', '%barista%', '%cashier%']);

UPDATE jobs
SET status = 'inactive', filtered_reason = 'law_final', updated_at = now()
WHERE status = 'active'
  AND LOWER(title) LIKE ANY(ARRAY['%lawyer%', '%solicitor%', '%attorney%', '%legal counsel%']);

-- ============================================================================
-- FINAL STATISTICS
-- ============================================================================

SELECT 'FINAL CLEANUP COMPLETE' as status;

SELECT
  COUNT(*) as total_active_jobs,
  COUNT(CASE WHEN is_graduate = true OR is_internship = true THEN 1 END) as flagged,
  COUNT(CASE WHEN city IN ('London', 'Paris', 'Milan', 'Berlin', 'Madrid', 'Amsterdam', 'Munich', 'Hamburg', 'Zurich', 'Rome', 'Dublin', 'Brussels') THEN 1 END) as in_12_cities,
  COUNT(CASE WHEN city IS NULL THEN 1 END) as missing_city,
  ROUND(100.0 * COUNT(CASE WHEN is_graduate = true OR is_internship = true THEN 1 END) / COUNT(*), 1) || '%' as pct_flagged
FROM jobs
WHERE status = 'active';

-- City distribution
SELECT
  city,
  COUNT(*) as jobs
FROM jobs
WHERE status = 'active'
  AND city IS NOT NULL
GROUP BY city
ORDER BY jobs DESC
LIMIT 15;

COMMIT;

