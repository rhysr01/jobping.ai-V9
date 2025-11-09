-- ============================================================================
-- ACTIVATE CATEGORIZATION TRIGGER AND BACKFILL CATEGORIES
-- ============================================================================
-- Ensures the categorization trigger is active and backfills categories
-- for existing jobs, focusing on Sales, Tech, Product, ESG
-- ============================================================================

-- First, ensure the categorization function exists (from create-auto-categorization-trigger.sql)
-- If it doesn't exist, you'll need to run that script first

-- Verify trigger exists, create if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_categorize_job' 
        AND tgrelid = 'public.jobs'::regclass
    ) THEN
        -- Create the trigger
        CREATE TRIGGER trigger_categorize_job
        BEFORE INSERT OR UPDATE ON jobs
        FOR EACH ROW
        EXECUTE FUNCTION categorize_job();
        
        RAISE NOTICE 'Categorization trigger created';
    ELSE
        RAISE NOTICE 'Categorization trigger already exists';
    END IF;
END $$;

-- ============================================================================
-- BACKFILL CATEGORIES FOR EXISTING JOBS
-- ============================================================================
-- Run categorization logic on all existing jobs
-- Focus on Sales, Tech, Product, ESG categories

CREATE OR REPLACE FUNCTION backfill_job_categories()
RETURNS TABLE (
    total_processed INTEGER,
    sales_categorized INTEGER,
    tech_categorized INTEGER,
    product_categorized INTEGER,
    esg_categorized INTEGER
) AS $$
DECLARE
    job_record RECORD;
    job_title TEXT;
    job_description TEXT;
    job_company TEXT;
    job_categories TEXT[];
    sales_count INTEGER := 0;
    tech_count INTEGER := 0;
    product_count INTEGER := 0;
    esg_count INTEGER := 0;
    total_count INTEGER := 0;
BEGIN
    FOR job_record IN 
        SELECT id, title, description, company, categories
        FROM jobs
        WHERE is_active = true
    LOOP
        job_title := LOWER(COALESCE(job_record.title, ''));
        job_description := LOWER(COALESCE(job_record.description, ''));
        job_company := LOWER(COALESCE(job_record.company, ''));
        job_categories := COALESCE(job_record.categories, ARRAY[]::TEXT[]);
        
        -- Sales & Client Success
        IF NOT ('sales-client-success' = ANY(job_categories)) THEN
            IF job_title ~ 'sales|sdr|bdr|account\s+executive|business\s+development|client\s+success|customer\s+success|revenue\s+operations' OR
               job_description ~ 'sales|sdr|bdr|account\s+executive|business\s+development|client\s+success|customer\s+success|revenue\s+operations' OR
               job_company ~ 'salesforce|hubspot' THEN
                job_categories := array_append(job_categories, 'sales-client-success');
                sales_count := sales_count + 1;
            END IF;
        END IF;
        
        -- Tech & Engineering
        IF NOT ('tech-transformation' = ANY(job_categories)) THEN
            IF job_title ~ 'software\s+engineer|developer|programmer|engineer|devops|cloud\s+engineer|data\s+engineer|systems\s+engineer|platform\s+engineer|qa|test\s+engineer|cybersecurity|it\s+support|technical' OR
               job_description ~ 'software\s+engineering|development|programming|coding|devops|cloud|infrastructure|backend|frontend|full\s+stack|api|microservices' OR
               job_company ~ 'tech|technology|software|saas' THEN
                job_categories := array_append(job_categories, 'tech-transformation');
                tech_count := tech_count + 1;
            END IF;
        END IF;
        
        -- Product & Innovation
        IF NOT ('product-innovation' = ANY(job_categories)) THEN
            IF job_title ~ 'product\s+manager|product\s+owner|product\s+analyst|apm|associate\s+product|product\s+designer|ux|ui\s+designer|innovation' OR
               job_description ~ 'product\s+management|product\s+development|product\s+strategy|user\s+experience|ux|ui\s+design|innovation|product\s+roadmap' THEN
                job_categories := array_append(job_categories, 'product-innovation');
                product_count := product_count + 1;
            END IF;
        END IF;
        
        -- Sustainability & ESG
        IF NOT ('sustainability-esg' = ANY(job_categories)) THEN
            IF job_title ~ 'esg|sustainability|environmental|climate|green\s+finance|sustainable' OR
               job_description ~ 'esg|environmental\s+social\s+governance|sustainability|climate|carbon|renewable|green\s+finance|sustainable' THEN
                job_categories := array_append(job_categories, 'sustainability-esg');
                esg_count := esg_count + 1;
            END IF;
        END IF;
        
        -- Update job if categories changed
        IF job_categories != job_record.categories THEN
            UPDATE jobs
            SET categories = job_categories, updated_at = NOW()
            WHERE id = job_record.id;
            total_count := total_count + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT total_count, sales_count, tech_count, product_count, esg_count;
END;
$$ LANGUAGE plpgsql;

-- Execute the backfill function
SELECT * FROM backfill_job_categories();

-- Verify category distribution
SELECT 
    category,
    COUNT(*) as job_count
FROM (
    SELECT unnest(categories) as category
    FROM jobs
    WHERE is_active = true 
      AND categories IS NOT NULL 
      AND array_length(categories, 1) > 0
) sub
WHERE category IN ('sales-client-success', 'tech-transformation', 'product-innovation', 'sustainability-esg')
GROUP BY category
ORDER BY job_count DESC;

-- Drop the function after use (or keep it for future use)
-- DROP FUNCTION IF EXISTS backfill_job_categories();

