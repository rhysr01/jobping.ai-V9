-- ============================================================================
-- CONSOLIDATED DATA QUALITY FIXES
-- Comprehensive migration combining multiple data quality improvements
-- Date: January 20, 2026
-- ============================================================================
-- This migration consolidates multiple data quality tasks:
-- 1. Category cleanup (remove duplicate/old categories)
-- 2. Data normalization (cities, companies, locations)
-- 3. Status consistency fixes
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CATEGORY CLEANUP - Remove duplicate/old categories (from MIGRATION_TO_APPLY_NOW.sql)
-- ============================================================================

-- Remove old marketing-advertising category (new category exists)
UPDATE jobs
SET categories = array_remove(categories, 'marketing-advertising')
WHERE 'marketing-advertising' = ANY(categories);

-- Remove old finance-accounting category (new category exists)
UPDATE jobs
SET categories = array_remove(categories, 'finance-accounting')
WHERE 'finance-accounting' = ANY(categories);

-- Remove old sales-business-development category (new category exists)
UPDATE jobs
SET categories = array_remove(categories, 'sales-business-development')
WHERE 'sales-business-development' = ANY(categories);

-- Remove old product-management category (new category exists)
UPDATE jobs
SET categories = array_remove(categories, 'product-management')
WHERE 'product-management' = ANY(categories);

-- ============================================================================
-- 2. DATA NORMALIZATION - Cities and Companies
-- ============================================================================

-- Normalize city names (consolidated from FIX_ALL_EXISTING_DATA.sql)
UPDATE jobs
SET city = CASE
    -- German cities
    WHEN city ILIKE '%münchen%' OR city ILIKE '%munich%' THEN 'Munich'
    WHEN city ILIKE '%köln%' OR city ILIKE '%cologne%' THEN 'Cologne'
    WHEN city ILIKE '%hamburg%' THEN 'Hamburg'
    WHEN city ILIKE '%frankfurt%' THEN 'Frankfurt'
    WHEN city ILIKE '%berlin%' THEN 'Berlin'
    WHEN city ILIKE '%stuttgart%' THEN 'Stuttgart'
    WHEN city ILIKE '%düsseldorf%' THEN 'Düsseldorf'

    -- Austrian cities
    WHEN city ILIKE '%wien%' OR city ILIKE '%vienna%' THEN 'Vienna'

    -- Czech cities
    WHEN city ILIKE '%praha%' OR city ILIKE '%prague%' THEN 'Prague'

    -- Italian cities
    WHEN city ILIKE '%milano%' OR city ILIKE '%milan%' THEN 'Milan'
    WHEN city ILIKE '%roma%' OR city ILIKE '%rome%' THEN 'Rome'

    -- Spanish cities
    WHEN city ILIKE '%barcelona%' THEN 'Barcelona'
    WHEN city ILIKE '%madrid%' THEN 'Madrid'

    -- French cities (Paris area)
    WHEN city ILIKE '%paris%' OR city ILIKE '%levallois%' OR city ILIKE '%boulogne%'
         OR city ILIKE '%saint-cloud%' OR city ILIKE '%nanterre%' OR city ILIKE '%courbevoie%' THEN 'Paris'

    -- Belgian cities (Brussels area)
    WHEN city ILIKE '%bruxelles%' OR city ILIKE '%brussels%' OR city ILIKE '%elsene%'
         OR city ILIKE '%diegem%' OR city ILIKE '%zaventem%' THEN 'Brussels'

    -- Dutch cities (Amsterdam area)
    WHEN city ILIKE '%amsterdam%' OR city ILIKE '%amstelveen%' OR city ILIKE '%haarlem%' THEN 'Amsterdam'

    -- Danish cities
    WHEN city ILIKE '%københavn%' OR city ILIKE '%copenhagen%' THEN 'Copenhagen'

    -- Swedish cities
    WHEN city ILIKE '%stockholm%' THEN 'Stockholm'

    -- Norwegian cities
    WHEN city ILIKE '%oslo%' THEN 'Oslo'

    ELSE city
END
WHERE city IS NOT NULL;

-- Clean company names (remove legal suffixes) - simplified version
UPDATE jobs
SET company = TRIM(
    REGEXP_REPLACE(
        REGEXP_REPLACE(
            REGEXP_REPLACE(company,
                '[[:space:]]+(Ltd|Ltd\.|Limited|Inc|Inc\.|Incorporated|GmbH|S\.A\.|S\.L\.|S\.R\.L\.|LLC|LLP|PLC|Corp|Corp\.|Corporation|Co|Co\.|Company|AG|BV|NV|AB|Oy|AS)$',
                '', 'i'
            ),
            '[[:space:]]+', ' ', 'g'
        ), '^[[:space:]]+|[[:space:]]+$', '', 'g'
    )
)
WHERE company IS NOT NULL;

-- ============================================================================
-- 3. STATUS CONSISTENCY FIXES
-- ============================================================================

-- Ensure filtered jobs have consistent status
UPDATE jobs
SET status = 'inactive'
WHERE is_active = false AND status != 'inactive';

-- Ensure active jobs have consistent status
UPDATE jobs
SET status = 'active'
WHERE is_active = true AND status != 'active';

-- ============================================================================
-- 4. DATA INTEGRITY FIXES
-- ============================================================================

-- Remove jobs with missing critical fields
UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'missing_critical_data'
WHERE (title IS NULL OR title = '')
   OR (company IS NULL OR company = '')
   OR (location IS NULL OR location = '');

-- ============================================================================
-- 5. UPDATE TIMESTAMPS
-- ============================================================================

UPDATE jobs
SET updated_at = NOW()
WHERE updated_at IS NULL;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check category cleanup effectiveness:
-- SELECT COUNT(*) as jobs_with_old_categories FROM jobs
-- WHERE categories && ARRAY['marketing-advertising', 'finance-accounting', 'sales-business-development', 'product-management']::text[];

-- Check status consistency:
-- SELECT status, is_active, COUNT(*) FROM jobs GROUP BY status, is_active;

-- Check data quality:
-- SELECT
--     CASE
--         WHEN title IS NULL OR title = '' THEN 'missing_title'
--         WHEN company IS NULL OR company = '' THEN 'missing_company'
--         WHEN location IS NULL OR location = '' THEN 'missing_location'
--         ELSE 'valid'
--     END as data_quality,
--     COUNT(*) as job_count
-- FROM jobs
-- GROUP BY 1
-- ORDER BY 2 DESC;