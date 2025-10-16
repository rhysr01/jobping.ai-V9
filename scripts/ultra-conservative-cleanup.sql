-- ============================================================================
-- ULTRA-CONSERVATIVE CLEANUP - Option A
-- ============================================================================
-- Keeps ONLY properly flagged graduate/internship roles
-- Removes all ambiguous jobs for 100% confidence in early-career focus
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Remove ALL unflagged jobs (not graduate, not internship)
-- ============================================================================

UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'not_flagged_early_career',
  updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false;

-- ============================================================================
-- STEP 2: Remove stale jobs (over 30 days old)
-- ============================================================================

UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'stale_posting',
  updated_at = now()
WHERE status = 'active'
  AND created_at < NOW() - INTERVAL '30 days';

-- ============================================================================
-- STEP 3: Remove duplicates (same title + company + city, keep newest)
-- ============================================================================

WITH ranked AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY title, company, SPLIT_PART(location, ',', 1) 
      ORDER BY created_at DESC
    ) as rn
  FROM jobs 
  WHERE status = 'active'
)
UPDATE jobs
SET
  status = 'inactive',
  filtered_reason = 'duplicate',
  updated_at = now()
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- ============================================================================
-- STEP 4: Ensure all remaining jobs have proper metadata
-- ============================================================================

-- Set experience_required for any missing
UPDATE jobs
SET
  experience_required = 'entry-level',
  updated_at = now()
WHERE status = 'active'
  AND experience_required IS NULL;

-- Ensure all have early-career category
UPDATE jobs
SET
  categories = COALESCE(categories, '{}') || ARRAY['early-career'],
  updated_at = now()
WHERE status = 'active'
  AND NOT ('early-career' = ANY(COALESCE(categories, '{}')));

-- Add internship category where appropriate
UPDATE jobs
SET
  categories = categories || ARRAY['internship'],
  updated_at = now()
WHERE status = 'active'
  AND is_internship = true
  AND NOT ('internship' = ANY(categories));

-- ============================================================================
-- FINAL STATISTICS
-- ============================================================================

SELECT '========================================' as divider;

SELECT 'ULTRA-CONSERVATIVE CLEANUP COMPLETE' as status;

SELECT
  COUNT(*) as pristine_active_jobs,
  COUNT(CASE WHEN is_graduate = true THEN 1 END) as graduate_roles,
  COUNT(CASE WHEN is_internship = true THEN 1 END) as internship_roles,
  COUNT(CASE WHEN is_graduate = true AND is_internship = true THEN 1 END) as both_flags,
  COUNT(CASE WHEN experience_required = 'entry-level' THEN 1 END) as entry_level,
  COUNT(CASE WHEN description IS NOT NULL AND LENGTH(description) > 100 THEN 1 END) as good_descriptions,
  COUNT(CASE WHEN 'early-career' = ANY(categories) THEN 1 END) as has_early_career_cat,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as fresh_last_7d,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as fresh_last_30d,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM jobs), 1) || '%' as pct_of_total_database
FROM jobs
WHERE status = 'active';

SELECT
  SPLIT_PART(location, ',', 1) as city,
  COUNT(*) as jobs
FROM jobs
WHERE status = 'active'
  AND location ~ '^(London|Paris|Milan|Berlin|Madrid|Amsterdam|Munich|Hamburg|Zurich|Rome|Dublin|Brussels)'
GROUP BY SPLIT_PART(location, ',', 1)
ORDER BY jobs DESC;

SELECT
  filtered_reason,
  COUNT(*) as count
FROM jobs
WHERE status = 'inactive'
  AND filtered_reason IS NOT NULL
GROUP BY filtered_reason
ORDER BY count DESC
LIMIT 10;

COMMIT;

-- ============================================================================
-- END OF SCRIPT - Database is now pristine and production-ready
-- ============================================================================

