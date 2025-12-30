-- ============================================================================
-- FIX: Remove Old Categories and Ensure New Categories Exist
-- ============================================================================
-- Problem: Jobs have BOTH old and new categories (e.g., both 
--          'sales-business-development' AND 'sales-client-success')
-- Solution: Remove old categories, ensure new ones exist
-- ============================================================================
-- Copy this entire file and run in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Remove marketing-advertising and ensure marketing-growth exists
-- ============================================================================
UPDATE jobs
SET categories = 
  CASE 
    WHEN 'marketing-advertising' = ANY(categories) THEN
      -- Remove old category, add new one if not present
      array_remove(
        CASE 
          WHEN 'marketing-growth' = ANY(categories) THEN categories
          ELSE array_append(categories, 'marketing-growth')
        END,
        'marketing-advertising'
      )
    ELSE categories
  END
WHERE 'marketing-advertising' = ANY(categories);

-- ============================================================================
-- 2. Remove finance-accounting and ensure finance-investment exists
-- ============================================================================
UPDATE jobs
SET categories = 
  CASE 
    WHEN 'finance-accounting' = ANY(categories) THEN
      array_remove(
        CASE 
          WHEN 'finance-investment' = ANY(categories) THEN categories
          ELSE array_append(categories, 'finance-investment')
        END,
        'finance-accounting'
      )
    ELSE categories
  END
WHERE 'finance-accounting' = ANY(categories);

-- ============================================================================
-- 3. Remove sales-business-development and ensure sales-client-success exists
-- ============================================================================
UPDATE jobs
SET categories = 
  CASE 
    WHEN 'sales-business-development' = ANY(categories) THEN
      array_remove(
        CASE 
          WHEN 'sales-client-success' = ANY(categories) THEN categories
          ELSE array_append(categories, 'sales-client-success')
        END,
        'sales-business-development'
      )
    ELSE categories
  END
WHERE 'sales-business-development' = ANY(categories);

-- ============================================================================
-- 4. Remove product-management and ensure product-innovation exists
-- ============================================================================
UPDATE jobs
SET categories = 
  CASE 
    WHEN 'product-management' = ANY(categories) THEN
      array_remove(
        CASE 
          WHEN 'product-innovation' = ANY(categories) THEN categories
          ELSE array_append(categories, 'product-innovation')
        END,
        'product-management'
      )
    ELSE categories
  END
WHERE 'product-management' = ANY(categories);

COMMIT;

-- ============================================================================
-- VERIFICATION (Run after migration)
-- ============================================================================
-- Should return 0 rows:
-- SELECT 
--     unnest(categories) as category,
--     COUNT(*) as job_count
-- FROM jobs
-- WHERE categories && ARRAY['marketing-advertising', 'finance-accounting', 'sales-business-development', 'product-management']::text[]
-- GROUP BY unnest(categories)
-- ORDER BY job_count DESC;
--
-- Should show no jobs with both old and new:
-- SELECT COUNT(*) as jobs_with_both
-- FROM jobs
-- WHERE (
--     ('marketing-advertising' = ANY(categories) AND 'marketing-growth' = ANY(categories)) OR
--     ('finance-accounting' = ANY(categories) AND 'finance-investment' = ANY(categories)) OR
--     ('sales-business-development' = ANY(categories) AND 'sales-client-success' = ANY(categories)) OR
--     ('product-management' = ANY(categories) AND 'product-innovation' = ANY(categories))
-- );

