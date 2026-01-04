-- ============================================================================
-- ADD MISSING CATEGORIES BASED ON KEYWORD ANALYSIS
-- ============================================================================
-- This migration adds missing work-type categories to jobs based on
-- keywords in title and description. Jobs identified as having suspicious
-- category mismatches will get additional categories added.
-- ============================================================================
-- Date: January 4, 2026
-- Affected: ~561 jobs
-- ============================================================================

BEGIN;

-- Step 1: Add 'strategy-business-design' to jobs with strategy keywords
UPDATE jobs
SET categories = (
    SELECT array_agg(DISTINCT cat ORDER BY cat)
    FROM (
        SELECT unnest(categories) as cat
        UNION
        SELECT 'strategy-business-design'
    ) combined
)
WHERE (
    LOWER(title) LIKE '%strategy%'
    OR LOWER(title) LIKE '%business design%'
    OR LOWER(title) LIKE '%consulting%'
    OR (description IS NOT NULL AND (
        LOWER(description) LIKE '%strategy%'
        OR LOWER(description) LIKE '%consulting%'
    ))
)
AND NOT (categories && ARRAY['strategy-business-design']::text[])
AND is_active = true;

-- Step 2: Add 'data-analytics' to jobs with data/analytics keywords
UPDATE jobs
SET categories = (
    SELECT array_agg(DISTINCT cat ORDER BY cat)
    FROM (
        SELECT unnest(categories) as cat
        UNION
        SELECT 'data-analytics'
    ) combined
)
WHERE (
    LOWER(title) LIKE '%data%'
    OR LOWER(title) LIKE '%analytics%'
    OR LOWER(title) LIKE '%data analyst%'
    OR LOWER(title) LIKE '%data scientist%'
    OR (description IS NOT NULL AND (
        LOWER(description) LIKE '%data%'
        OR LOWER(description) LIKE '%analytics%'
    ))
)
AND NOT (categories && ARRAY['data-analytics']::text[])
AND is_active = true;

-- Step 3: Add 'marketing-growth' to jobs with marketing keywords
UPDATE jobs
SET categories = (
    SELECT array_agg(DISTINCT cat ORDER BY cat)
    FROM (
        SELECT unnest(categories) as cat
        UNION
        SELECT 'marketing-growth'
    ) combined
)
WHERE (
    LOWER(title) LIKE '%marketing%'
    OR LOWER(title) LIKE '%growth%'
    OR LOWER(title) LIKE '%social media%'
    OR LOWER(title) LIKE '%content%'
    OR LOWER(title) LIKE '%brand%'
    OR (description IS NOT NULL AND (
        LOWER(description) LIKE '%marketing%'
        OR LOWER(description) LIKE '%growth%'
    ))
)
AND NOT (categories && ARRAY['marketing-growth']::text[])
AND is_active = true;

-- Step 4: Add 'finance-investment' to jobs with finance keywords
UPDATE jobs
SET categories = (
    SELECT array_agg(DISTINCT cat ORDER BY cat)
    FROM (
        SELECT unnest(categories) as cat
        UNION
        SELECT 'finance-investment'
    ) combined
)
WHERE (
    LOWER(title) LIKE '%finance%'
    OR LOWER(title) LIKE '%investment%'
    OR LOWER(title) LIKE '%financial%'
    OR LOWER(title) LIKE '%trading%'
    OR LOWER(title) LIKE '%trader%'
    OR (description IS NOT NULL AND (
        LOWER(description) LIKE '%finance%'
        OR LOWER(description) LIKE '%investment%'
    ))
)
AND NOT (categories && ARRAY['finance-investment']::text[])
AND is_active = true;

-- Step 5: Add 'sales-client-success' to jobs with sales keywords
UPDATE jobs
SET categories = (
    SELECT array_agg(DISTINCT cat ORDER BY cat)
    FROM (
        SELECT unnest(categories) as cat
        UNION
        SELECT 'sales-client-success'
    ) combined
)
WHERE (
    LOWER(title) LIKE '%sales%'
    OR LOWER(title) LIKE '%account manager%'
    OR LOWER(title) LIKE '%client success%'
    OR LOWER(title) LIKE '%business development%'
    OR LOWER(title) LIKE '%bd%'
    OR LOWER(title) LIKE '%account executive%'
    OR LOWER(title) LIKE '%sdr%'
    OR LOWER(title) LIKE '%bdr%'
    OR (description IS NOT NULL AND (
        LOWER(description) LIKE '%sales%'
        OR LOWER(description) LIKE '%client success%'
        OR LOWER(description) LIKE '%business development%'
    ))
)
AND NOT (categories && ARRAY['sales-client-success']::text[])
AND is_active = true;

-- Step 6: Add 'tech-transformation' to jobs with tech keywords
UPDATE jobs
SET categories = (
    SELECT array_agg(DISTINCT cat ORDER BY cat)
    FROM (
        SELECT unnest(categories) as cat
        UNION
        SELECT 'tech-transformation'
    ) combined
)
WHERE (
    LOWER(title) LIKE '%software%'
    OR LOWER(title) LIKE '%developer%'
    OR LOWER(title) LIKE '%engineer%'
    OR LOWER(title) LIKE '%programmer%'
    OR LOWER(title) LIKE '%programming%'
    OR LOWER(title) LIKE '%tech%'
    OR LOWER(title) LIKE '%technology%'
    OR LOWER(title) LIKE '%it%'
    OR LOWER(title) LIKE '%information technology%'
    OR LOWER(title) LIKE '%systems%'
    OR LOWER(title) LIKE '%devops%'
    OR LOWER(title) LIKE '%sre%'
    OR LOWER(title) LIKE '%site reliability%'
    OR LOWER(title) LIKE '%cybersecurity%'
    OR LOWER(title) LIKE '%security%'
    OR LOWER(title) LIKE '%cloud%'
    OR LOWER(title) LIKE '%backend%'
    OR LOWER(title) LIKE '%frontend%'
    OR LOWER(title) LIKE '%full stack%'
    OR LOWER(title) LIKE '%fullstack%'
    OR (description IS NOT NULL AND (
        LOWER(description) LIKE '%software%'
        OR LOWER(description) LIKE '%developer%'
        OR LOWER(description) LIKE '%engineer%'
        OR LOWER(description) LIKE '%programming%'
        OR LOWER(description) LIKE '%technology%'
    ))
)
AND NOT (categories && ARRAY['tech-transformation']::text[])
AND is_active = true;

-- Step 7: Add 'operations-supply-chain' to jobs with operations keywords
UPDATE jobs
SET categories = (
    SELECT array_agg(DISTINCT cat ORDER BY cat)
    FROM (
        SELECT unnest(categories) as cat
        UNION
        SELECT 'operations-supply-chain'
    ) combined
)
WHERE (
    LOWER(title) LIKE '%operations%'
    OR LOWER(title) LIKE '%supply chain%'
    OR LOWER(title) LIKE '%logistics%'
    OR LOWER(title) LIKE '%procurement%'
    OR LOWER(title) LIKE '%purchasing%'
    OR LOWER(title) LIKE '%operations manager%'
    OR LOWER(title) LIKE '%operations analyst%'
    OR LOWER(title) LIKE '%supply chain%'
    OR LOWER(title) LIKE '%logistics%'
    OR LOWER(title) LIKE '%warehouse%'
    OR LOWER(title) LIKE '%inventory%'
    OR LOWER(title) LIKE '%fulfillment%'
    OR (description IS NOT NULL AND (
        LOWER(description) LIKE '%operations%'
        OR LOWER(description) LIKE '%supply chain%'
        OR LOWER(description) LIKE '%logistics%'
    ))
)
AND NOT (categories && ARRAY['operations-supply-chain']::text[])
AND is_active = true;

-- Step 8: Add 'product-innovation' to jobs with product keywords
UPDATE jobs
SET categories = (
    SELECT array_agg(DISTINCT cat ORDER BY cat)
    FROM (
        SELECT unnest(categories) as cat
        UNION
        SELECT 'product-innovation'
    ) combined
)
WHERE (
    LOWER(title) LIKE '%product manager%'
    OR LOWER(title) LIKE '%product owner%'
    OR LOWER(title) LIKE '%product analyst%'
    OR LOWER(title) LIKE '%product specialist%'
    OR LOWER(title) LIKE '%product development%'
    OR LOWER(title) LIKE '%product innovation%'
    OR LOWER(title) LIKE '%product management%'
    OR (description IS NOT NULL AND (
        LOWER(description) LIKE '%product management%'
        OR LOWER(description) LIKE '%product development%'
        OR LOWER(description) LIKE '%product owner%'
    ))
)
AND NOT (categories && ARRAY['product-innovation']::text[])
AND is_active = true;

-- Step 9: Add 'sustainability-esg' to jobs with sustainability keywords
UPDATE jobs
SET categories = (
    SELECT array_agg(DISTINCT cat ORDER BY cat)
    FROM (
        SELECT unnest(categories) as cat
        UNION
        SELECT 'sustainability-esg'
    ) combined
)
WHERE (
    LOWER(title) LIKE '%sustainability%'
    OR LOWER(title) LIKE '%esg%'
    OR LOWER(title) LIKE '%environmental%'
    OR LOWER(title) LIKE '%green%'
    OR LOWER(title) LIKE '%climate%'
    OR LOWER(title) LIKE '%carbon%'
    OR LOWER(title) LIKE '%renewable%'
    OR (description IS NOT NULL AND (
        LOWER(description) LIKE '%sustainability%'
        OR LOWER(description) LIKE '%esg%'
        OR LOWER(description) LIKE '%environmental%'
    ))
)
AND NOT (categories && ARRAY['sustainability-esg']::text[])
AND is_active = true;

-- Step 10: Update timestamp for all modified jobs
UPDATE jobs
SET updated_at = NOW()
WHERE id IN (
    SELECT DISTINCT id FROM (
        -- Strategy jobs
        SELECT id FROM jobs WHERE (
            LOWER(title) LIKE '%strategy%' OR LOWER(title) LIKE '%consulting%'
        ) AND NOT (categories && ARRAY['strategy-business-design']::text[])
        
        UNION
        
        -- Data jobs
        SELECT id FROM jobs WHERE (
            LOWER(title) LIKE '%data%' OR LOWER(title) LIKE '%analytics%'
        ) AND NOT (categories && ARRAY['data-analytics']::text[])
        
        UNION
        
        -- Marketing jobs
        SELECT id FROM jobs WHERE (
            LOWER(title) LIKE '%marketing%' OR LOWER(title) LIKE '%growth%'
        ) AND NOT (categories && ARRAY['marketing-growth']::text[])
        
        UNION
        
        -- Finance jobs
        SELECT id FROM jobs WHERE (
            LOWER(title) LIKE '%finance%' OR LOWER(title) LIKE '%investment%'
        ) AND NOT (categories && ARRAY['finance-investment']::text[])
        
        UNION
        
        -- Sales jobs
        SELECT id FROM jobs WHERE (
            LOWER(title) LIKE '%sales%' OR LOWER(title) LIKE '%client success%'
        ) AND NOT (categories && ARRAY['sales-client-success']::text[])
        
        UNION
        
        -- Tech jobs
        SELECT id FROM jobs WHERE (
            LOWER(title) LIKE '%software%' OR LOWER(title) LIKE '%developer%' OR LOWER(title) LIKE '%engineer%'
        ) AND NOT (categories && ARRAY['tech-transformation']::text[])
        
        UNION
        
        -- Operations jobs
        SELECT id FROM jobs WHERE (
            LOWER(title) LIKE '%operations%' OR LOWER(title) LIKE '%supply chain%' OR LOWER(title) LIKE '%logistics%'
        ) AND NOT (categories && ARRAY['operations-supply-chain']::text[])
        
        UNION
        
        -- Product jobs
        SELECT id FROM jobs WHERE (
            LOWER(title) LIKE '%product manager%' OR LOWER(title) LIKE '%product owner%'
        ) AND NOT (categories && ARRAY['product-innovation']::text[])
        
        UNION
        
        -- Sustainability jobs
        SELECT id FROM jobs WHERE (
            LOWER(title) LIKE '%sustainability%' OR LOWER(title) LIKE '%esg%'
        ) AND NOT (categories && ARRAY['sustainability-esg']::text[])
    ) modified
);

-- Log the results
DO $$
DECLARE
    strategy_added INTEGER;
    data_added INTEGER;
    marketing_added INTEGER;
    finance_added INTEGER;
    sales_added INTEGER;
    tech_added INTEGER;
    operations_added INTEGER;
    product_added INTEGER;
    sustainability_added INTEGER;
    total_jobs_without_work_type INTEGER;
BEGIN
    -- Count how many jobs got each category added (check jobs updated in last minute)
    SELECT COUNT(*) INTO strategy_added
    FROM jobs
    WHERE 'strategy-business-design' = ANY(categories)
    AND updated_at >= NOW() - INTERVAL '1 minute';
    
    SELECT COUNT(*) INTO data_added
    FROM jobs
    WHERE 'data-analytics' = ANY(categories)
    AND updated_at >= NOW() - INTERVAL '1 minute';
    
    SELECT COUNT(*) INTO marketing_added
    FROM jobs
    WHERE 'marketing-growth' = ANY(categories)
    AND updated_at >= NOW() - INTERVAL '1 minute';
    
    SELECT COUNT(*) INTO finance_added
    FROM jobs
    WHERE 'finance-investment' = ANY(categories)
    AND updated_at >= NOW() - INTERVAL '1 minute';
    
    SELECT COUNT(*) INTO sales_added
    FROM jobs
    WHERE 'sales-client-success' = ANY(categories)
    AND updated_at >= NOW() - INTERVAL '1 minute';
    
    SELECT COUNT(*) INTO tech_added
    FROM jobs
    WHERE 'tech-transformation' = ANY(categories)
    AND updated_at >= NOW() - INTERVAL '1 minute';
    
    SELECT COUNT(*) INTO operations_added
    FROM jobs
    WHERE 'operations-supply-chain' = ANY(categories)
    AND updated_at >= NOW() - INTERVAL '1 minute';
    
    SELECT COUNT(*) INTO product_added
    FROM jobs
    WHERE 'product-innovation' = ANY(categories)
    AND updated_at >= NOW() - INTERVAL '1 minute';
    
    SELECT COUNT(*) INTO sustainability_added
    FROM jobs
    WHERE 'sustainability-esg' = ANY(categories)
    AND updated_at >= NOW() - INTERVAL '1 minute';
    
    -- Count jobs still missing work-type categories
    SELECT COUNT(*) INTO total_jobs_without_work_type
    FROM jobs
    WHERE is_active = true
    AND categories IS NOT NULL
    AND array_length(categories, 1) > 0
    AND NOT (categories && ARRAY[
        'strategy-business-design', 'data-analytics', 'marketing-growth',
        'tech-transformation', 'operations-supply-chain', 'finance-investment',
        'sales-client-success', 'product-innovation', 'sustainability-esg',
        'retail-luxury', 'entrepreneurship', 'technology',
        'people-hr', 'legal-compliance', 'creative-design', 'general-management'
    ]::text[]);
    
    RAISE NOTICE 'Categories added in this migration:';
    RAISE NOTICE '  strategy-business-design: %', strategy_added;
    RAISE NOTICE '  data-analytics: %', data_added;
    RAISE NOTICE '  marketing-growth: %', marketing_added;
    RAISE NOTICE '  finance-investment: %', finance_added;
    RAISE NOTICE '  sales-client-success: %', sales_added;
    RAISE NOTICE '  tech-transformation: %', tech_added;
    RAISE NOTICE '  operations-supply-chain: %', operations_added;
    RAISE NOTICE '  product-innovation: %', product_added;
    RAISE NOTICE '  sustainability-esg: %', sustainability_added;
    RAISE NOTICE '';
    RAISE NOTICE 'Jobs still missing work-type categories: %', total_jobs_without_work_type;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to verify)
-- ============================================================================
-- Check jobs with strategy keywords that now have the category:
-- SELECT id, title, categories 
-- FROM jobs 
-- WHERE LOWER(title) LIKE '%strategy%' 
-- AND 'strategy-business-design' = ANY(categories)
-- LIMIT 10;
--
-- Check for jobs still missing work-type categories:
-- SELECT id, title, categories 
-- FROM jobs 
-- WHERE is_active = true
-- AND categories IS NOT NULL
-- AND NOT (categories && ARRAY[
--     'strategy-business-design', 'data-analytics', 'marketing-growth',
--     'tech-transformation', 'operations-supply-chain', 'finance-investment',
--     'sales-client-success', 'product-innovation', 'sustainability-esg'
-- ]::text[])
-- LIMIT 20;

