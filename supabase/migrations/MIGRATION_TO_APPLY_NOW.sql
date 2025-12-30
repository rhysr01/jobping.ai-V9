-- ============================================================================
-- IMMEDIATE FIX: Remove Old Categories (32 jobs with duplicate categories)
-- ============================================================================
-- PROBLEM: Jobs have BOTH old and new categories (e.g., both 
--          'sales-business-development' AND 'sales-client-success')
-- SOLUTION: Remove old categories completely
-- ============================================================================
-- Copy this entire file and run in Supabase SQL Editor
-- NOTE: This migration is idempotent - safe to run multiple times
-- ============================================================================

BEGIN;

-- Remove marketing-advertising (new category already exists)
UPDATE jobs
SET categories = array_remove(categories, 'marketing-advertising')
WHERE 'marketing-advertising' = ANY(categories);

-- Remove finance-accounting (new category already exists)
UPDATE jobs
SET categories = array_remove(categories, 'finance-accounting')
WHERE 'finance-accounting' = ANY(categories);

-- Remove sales-business-development (new category already exists)
UPDATE jobs
SET categories = array_remove(categories, 'sales-business-development')
WHERE 'sales-business-development' = ANY(categories);

-- Remove product-management (new category already exists)
UPDATE jobs
SET categories = array_remove(categories, 'product-management')
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

