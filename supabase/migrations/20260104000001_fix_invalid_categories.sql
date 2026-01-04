-- ============================================================================
-- FIX INVALID/OLD CATEGORY NAMES
-- ============================================================================
-- This migration maps old form values to correct database categories and
-- removes duplicate/redundant categories.
-- ============================================================================
-- Date: January 4, 2026
-- Affected: ~4,000+ jobs
-- ============================================================================

BEGIN;

-- Step 1: Map old form values to correct database categories
-- These are categories that should be replaced with their database equivalents
UPDATE jobs
SET categories = (
    SELECT array_agg(DISTINCT new_cat)
    FROM (
        SELECT CASE
            -- Map old form values to database categories
            WHEN cat = 'finance' THEN 'finance-investment'
            WHEN cat = 'marketing' THEN 'marketing-growth'
            WHEN cat = 'sales' THEN 'sales-client-success'
            WHEN cat = 'strategy' THEN 'strategy-business-design'
            WHEN cat = 'data' THEN 'data-analytics'
            WHEN cat = 'operations' THEN 'operations-supply-chain'
            WHEN cat = 'sustainability' THEN 'sustainability-esg'
            WHEN cat = 'product' THEN 'product-innovation'
            -- Merge duplicate categories
            WHEN cat = 'graduate' THEN 'graduate-programme'
            WHEN cat = 'creative' THEN 'creative-design'
            WHEN cat = 'legal' THEN 'legal-compliance'
            -- Keep valid categories as-is
            ELSE cat
        END as new_cat
        FROM unnest(categories) as cat
    ) mapped
    WHERE new_cat IS NOT NULL
)
WHERE categories && ARRAY[
    'finance',
    'marketing',
    'sales',
    'strategy',
    'data',
    'operations',
    'sustainability',
    'product',
    'graduate',
    'creative',
    'legal'
]::text[];

-- Step 2: Remove 'general' category if it exists alone (no work-type category)
-- Keep it if there are other work-type categories present
UPDATE jobs
SET categories = array_remove(categories, 'general')
WHERE 'general' = ANY(categories)
AND NOT (
    categories && ARRAY[
        'strategy-business-design',
        'data-analytics',
        'marketing-growth',
        'tech-transformation',
        'operations-supply-chain',
        'finance-investment',
        'sales-client-success',
        'product-innovation',
        'sustainability-esg',
        'retail-luxury',
        'entrepreneurship',
        'technology',
        'people-hr',
        'legal-compliance',
        'creative-design',
        'general-management'
    ]::text[]
);

-- Step 3: Ensure no duplicate categories remain
UPDATE jobs
SET categories = (
    SELECT array_agg(DISTINCT cat ORDER BY cat)
    FROM unnest(categories) as cat
)
WHERE array_length(categories, 1) != array_length(array(SELECT DISTINCT unnest(categories)), 1);

-- Step 4: Remove empty category arrays (shouldn't happen, but safety check)
UPDATE jobs
SET categories = NULL
WHERE categories IS NOT NULL 
AND (array_length(categories, 1) IS NULL OR array_length(categories, 1) = 0);

-- Step 5: Update timestamp
UPDATE jobs
SET updated_at = NOW()
WHERE categories IS NOT NULL
AND (
    categories && ARRAY[
        'finance',
        'marketing',
        'sales',
        'strategy',
        'data',
        'operations',
        'sustainability',
        'product',
        'graduate',
        'creative',
        'legal',
        'general'
    ]::text[]
    OR array_length(categories, 1) != array_length(array(SELECT DISTINCT unnest(categories)), 1)
);

-- Log the results
DO $$
DECLARE
    old_form_value_count INTEGER;
    duplicate_category_count INTEGER;
    general_removed_count INTEGER;
BEGIN
    -- Count jobs that had old form values (before update)
    SELECT COUNT(*) INTO old_form_value_count
    FROM jobs
    WHERE categories && ARRAY[
        'finance',
        'marketing',
        'sales',
        'strategy',
        'data',
        'operations',
        'sustainability',
        'product',
        'graduate',
        'creative',
        'legal'
    ]::text[];
    
    -- Count jobs with 'general' category
    SELECT COUNT(*) INTO general_removed_count
    FROM jobs
    WHERE 'general' = ANY(categories);
    
    RAISE NOTICE 'Jobs with old form values processed: %', old_form_value_count;
    RAISE NOTICE 'Jobs with general category remaining: %', general_removed_count;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to verify)
-- ============================================================================
-- Check for remaining old form values:
-- SELECT unnest(categories) as category, COUNT(*) 
-- FROM jobs 
-- WHERE categories && ARRAY['finance', 'marketing', 'sales', 'strategy', 'data', 'operations', 'sustainability', 'product', 'graduate', 'creative', 'legal']::text[]
-- GROUP BY category;
--
-- Check for duplicate categories in arrays:
-- SELECT id, title, categories 
-- FROM jobs 
-- WHERE array_length(categories, 1) != array_length(array(SELECT DISTINCT unnest(categories)), 1)
-- LIMIT 10;
--
-- Check category distribution:
-- SELECT unnest(categories) as category, COUNT(*) 
-- FROM jobs 
-- WHERE categories IS NOT NULL 
-- GROUP BY category 
-- ORDER BY COUNT(*) DESC;

