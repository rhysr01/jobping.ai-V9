-- ============================================================================
-- FINAL DATABASE POLISH - Production Ready Cleanup
-- ============================================================================
-- Fixes remaining data quality issues for optimal AI matching
-- Run after scraping sessions to ensure maximum matching quality
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: REMOVE EXPERIENCED & SENIOR JOBS (Critical for Early Career Focus)
-- ============================================================================

-- Remove experienced-level jobs
UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'experienced_level',
  updated_at = now()
WHERE status = 'active'
  AND experience_required = 'experienced';

-- Remove senior/lead/manager roles
UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'senior_level_role',
  updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(senior|lead|principal|director|head of|vp|vice president|chief|manager)';

-- ============================================================================
-- PART 2: REMOVE NON-BUSINESS ROLES (Healthcare, Retail, Trades)
-- ============================================================================

-- Healthcare/Medical (not relevant for business graduates)
UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'healthcare_medical',
  updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(nurse|doctor|pharmacist|therapist|medical|healthcare|clinical|paramedic|radiographer)';

-- Retail/Service (non-graduate level)
UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'retail_service',
  updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND LOWER(title) ~ '(barista|waiter|waitress|bar staff|cashier|retail assistant|shop assistant|store assistant)';

-- ============================================================================
-- PART 3: FIX MISSING FIELDS (Critical for Matching)
-- ============================================================================

-- Set experience_required for jobs missing it (if flagged as graduate/intern)
UPDATE jobs
SET
  experience_required = 'entry-level',
  updated_at = now()
WHERE status = 'active'
  AND experience_required IS NULL
  AND (is_graduate = true OR is_internship = true);

-- Add early-career category where missing
UPDATE jobs
SET
  categories = COALESCE(categories, '{}') || ARRAY['early-career'],
  updated_at = now()
WHERE status = 'active'
  AND (is_graduate = true OR is_internship = true)
  AND NOT ('early-career' = ANY(COALESCE(categories, '{}')));

-- Set categories for uncategorized entry-level jobs
UPDATE jobs
SET
  categories = ARRAY['early-career'],
  updated_at = now()
WHERE status = 'active'
  AND (categories IS NULL OR categories = '{}')
  AND experience_required = 'entry-level';

-- ============================================================================
-- PART 4: REMOVE JOBS WITH POOR DATA QUALITY
-- ============================================================================

-- Remove jobs with very poor descriptions (can't match without context)
UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'insufficient_data',
  updated_at = now()
WHERE status = 'active'
  AND (description IS NULL OR LENGTH(TRIM(description)) < 30)
  AND (title IS NULL OR LENGTH(TRIM(title)) < 10);

-- Remove clearly broken JobSpy jobs
UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'data_quality_poor',
  updated_at = now()
WHERE status = 'active'
  AND source LIKE 'jobspy%'
  AND (
    title LIKE '%**%'
    OR title LIKE '* %'
    OR LENGTH(title) < 10
    OR company IN ('C\\+\\+', 'R', 'automatisation', 'Crisis Management', 'wellbeing')
  );

-- ============================================================================
-- PART 5: NORMALIZE LOCATIONS (Improves Matching Consistency)
-- ============================================================================

-- Normalize London variations
UPDATE jobs
SET location = 'London, GB'
WHERE status = 'active'
  AND location ~ '^London'
  AND location != 'London, GB';

-- Normalize Paris variations
UPDATE jobs
SET location = 'Paris, FR'
WHERE status = 'active'
  AND location ~ '^Paris'
  AND location != 'Paris, FR';

-- Normalize Milan variations
UPDATE jobs
SET location = 'Milan, IT'
WHERE status = 'active'
  AND location ~ '^Mila(n|no)'
  AND location != 'Milan, IT';

-- Normalize Berlin variations
UPDATE jobs
SET location = 'Berlin, DE'
WHERE status = 'active'
  AND location ~ '^Berlin'
  AND location != 'Berlin, DE';

-- Normalize Madrid variations
UPDATE jobs
SET location = 'Madrid, ES'
WHERE status = 'active'
  AND location ~ '^Madrid'
  AND location != 'Madrid, ES';

-- Normalize Amsterdam variations
UPDATE jobs
SET location = 'Amsterdam, NL'
WHERE status = 'active'
  AND location ~ '^Amsterdam'
  AND location != 'Amsterdam, NL';

-- Normalize Munich variations
UPDATE jobs
SET location = 'Munich, DE'
WHERE status = 'active'
  AND location ~ '^M(ü|u)nchen'
  AND location != 'Munich, DE';

-- Normalize Hamburg variations
UPDATE jobs
SET location = 'Hamburg, DE'
WHERE status = 'active'
  AND location ~ '^Hamburg'
  AND location != 'Hamburg, DE';

-- Normalize Zurich variations
UPDATE jobs
SET location = 'Zurich, CH'
WHERE status = 'active'
  AND location ~ '^Z(ü|u)rich'
  AND location != 'Zurich, CH';

-- Normalize Rome variations
UPDATE jobs
SET location = 'Rome, IT'
WHERE status = 'active'
  AND location ~ '^Rom(a|e)'
  AND location != 'Rome, IT';

-- Normalize Dublin variations
UPDATE jobs
SET location = 'Dublin, IE'
WHERE status = 'active'
  AND location ~ '^Dublin'
  AND location != 'Dublin, IE';

-- Normalize Brussels variations
UPDATE jobs
SET location = 'Brussels, BE'
WHERE status = 'active'
  AND location ~ '^Bru(xelles|ssels)'
  AND location != 'Brussels, BE';

-- ============================================================================
-- PART 6: FINAL STATISTICS
-- ============================================================================

SELECT '========================================' as divider;

SELECT 'FINAL DATABASE POLISH COMPLETE' as status;

SELECT
  COUNT(*) as total_active_jobs,
  COUNT(CASE WHEN is_graduate = true OR is_internship = true THEN 1 END) as early_career_flagged,
  COUNT(CASE WHEN experience_required = 'entry-level' THEN 1 END) as entry_level,
  COUNT(CASE WHEN description IS NOT NULL AND LENGTH(description) > 100 THEN 1 END) as good_descriptions,
  COUNT(CASE WHEN categories IS NOT NULL AND categories != '{}' THEN 1 END) as has_categories,
  ROUND(100.0 * COUNT(CASE WHEN is_graduate = true OR is_internship = true THEN 1 END) / COUNT(*), 1) || '%' as pct_flagged,
  ROUND(100.0 * COUNT(CASE WHEN description IS NOT NULL AND LENGTH(description) > 100 THEN 1 END) / COUNT(*), 1) || '%' as pct_good_desc
FROM jobs
WHERE status = 'active';

SELECT
  filtered_reason,
  COUNT(*) as jobs_filtered
FROM jobs
WHERE status = 'inactive'
  AND filtered_reason IS NOT NULL
GROUP BY filtered_reason
ORDER BY COUNT(*) DESC
LIMIT 10;

COMMIT;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================

