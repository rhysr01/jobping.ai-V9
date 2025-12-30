-- ============================================================================
-- MIGRATION: Update Old Category Names to New Category Names
-- ============================================================================
-- This migration updates jobs with old category names to use the new category
-- names that match categoryMapper.ts mappings.
--
-- Old → New mappings:
--   marketing-advertising → marketing-growth (368 jobs)
--   finance-accounting → finance-investment (361 jobs)
--   sales-business-development → sales-client-success (319 jobs)
--   product-management → product-innovation (23 jobs)
--   Total: 983 jobs (some jobs have multiple old categories)
--
-- Date: December 29, 2025
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Update marketing-advertising → marketing-growth
-- ============================================================================
UPDATE jobs
SET categories = array_replace(categories, 'marketing-advertising', 'marketing-growth')
WHERE 'marketing-advertising' = ANY(categories);

-- ============================================================================
-- 2. Update finance-accounting → finance-investment
-- ============================================================================
UPDATE jobs
SET categories = array_replace(categories, 'finance-accounting', 'finance-investment')
WHERE 'finance-accounting' = ANY(categories);

-- ============================================================================
-- 3. Update sales-business-development → sales-client-success
-- ============================================================================
UPDATE jobs
SET categories = array_replace(categories, 'sales-business-development', 'sales-client-success')
WHERE 'sales-business-development' = ANY(categories);

-- ============================================================================
-- 4. Update product-management → product-innovation
-- ============================================================================
UPDATE jobs
SET categories = array_replace(categories, 'product-management', 'product-innovation')
WHERE 'product-management' = ANY(categories);

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to verify)
-- ============================================================================
-- Check remaining old categories (should be 0):
-- SELECT 
--     unnest(categories) as category,
--     COUNT(*) as job_count
-- FROM jobs
-- WHERE categories && ARRAY['marketing-advertising', 'finance-accounting', 'sales-business-development', 'product-management']::text[]
-- GROUP BY unnest(categories)
-- ORDER BY job_count DESC;
--
-- Check new categories (should show updated counts):
-- SELECT 
--     unnest(categories) as category,
--     COUNT(*) as job_count
-- FROM jobs
-- WHERE categories && ARRAY['marketing-growth', 'finance-investment', 'sales-client-success', 'product-innovation']::text[]
-- GROUP BY unnest(categories)
-- ORDER BY job_count DESC;

COMMIT;

