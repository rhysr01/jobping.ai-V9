-- ============================================================================
-- PREVENT MISSING WORK-TYPE CATEGORIES
-- ============================================================================
-- This migration creates a database trigger that ensures jobs always have
-- at least one work-type category. If a job is inserted/updated without a
-- work-type category, the trigger will automatically infer one from the
-- title and description.
-- ============================================================================
-- Date: January 4, 2026
-- ============================================================================

BEGIN;

-- Step 1: Create function to check if categories include work-type category
CREATE OR REPLACE FUNCTION has_work_type_category(categories text[])
RETURNS boolean AS $$
BEGIN
    IF categories IS NULL OR array_length(categories, 1) IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN categories && ARRAY[
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
    ]::text[];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Create function to infer work-type category from title/description
CREATE OR REPLACE FUNCTION infer_work_type_category(title text, description text)
RETURNS text[] AS $$
DECLARE
    text_lower text;
    inferred text[];
BEGIN
    text_lower := LOWER(COALESCE(title, '') || ' ' || COALESCE(description, ''));
    inferred := ARRAY[]::text[];

    -- Strategy & Business Design
    IF text_lower ~ '(strategy|business design|consulting|consultant|business analyst|transformation)' THEN
        inferred := array_append(inferred, 'strategy-business-design');
    END IF;

    -- Data & Analytics
    IF text_lower ~ '(data analyst|data scientist|data engineer|analytics|business intelligence|bi engineer|insights analyst)' THEN
        inferred := array_append(inferred, 'data-analytics');
    END IF;

    -- Marketing & Growth
    IF text_lower ~ '(marketing|growth|social media|content|brand|digital marketing|seo|ppc)' THEN
        inferred := array_append(inferred, 'marketing-growth');
    END IF;

    -- Tech & Transformation
    IF text_lower ~ '(software|developer|engineer|programmer|programming|tech|technology|it |information technology|systems|devops|sre|site reliability|cybersecurity|security|cloud|backend|frontend|full stack|fullstack)' THEN
        inferred := array_append(inferred, 'tech-transformation');
    END IF;

    -- Operations & Supply Chain
    IF text_lower ~ '(operations|supply chain|logistics|procurement|purchasing|warehouse|inventory|fulfillment)' THEN
        inferred := array_append(inferred, 'operations-supply-chain');
    END IF;

    -- Finance & Investment
    IF text_lower ~ '(finance|investment|financial|trading|trader|accountant|accounting|audit|risk|compliance|banking)' THEN
        inferred := array_append(inferred, 'finance-investment');
    END IF;

    -- Sales & Client Success
    IF text_lower ~ '(sales|account manager|client success|business development| bd |account executive| sdr | bdr |sales development)' THEN
        inferred := array_append(inferred, 'sales-client-success');
    END IF;

    -- Product & Innovation
    IF text_lower ~ '(product manager|product owner|product analyst|product specialist|product development|product innovation|product management)' THEN
        inferred := array_append(inferred, 'product-innovation');
    END IF;

    -- Sustainability & ESG
    IF text_lower ~ '(sustainability|esg|environmental|green|climate|carbon|renewable)' THEN
        inferred := array_append(inferred, 'sustainability-esg');
    END IF;

    -- People & HR
    IF text_lower ~ '(hr|human resources|recruitment|recruiter|talent acquisition|people operations)' THEN
        inferred := array_append(inferred, 'people-hr');
    END IF;

    -- Legal & Compliance
    IF text_lower ~ '(legal|lawyer|attorney|compliance|regulatory)' THEN
        inferred := array_append(inferred, 'legal-compliance');
    END IF;

    -- Creative & Design
    IF text_lower ~ '(designer|design|creative|graphic|ux|ui)' THEN
        inferred := array_append(inferred, 'creative-design');
    END IF;

    -- General Management (fallback if nothing else matches)
    IF array_length(inferred, 1) IS NULL AND text_lower ~ '(manager|management|director|executive)' THEN
        inferred := array_append(inferred, 'general-management');
    END IF;

    -- If still no match, use general-management as fallback
    IF array_length(inferred, 1) IS NULL THEN
        inferred := ARRAY['general-management']::text[];
    END IF;

    RETURN inferred;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Create trigger function to ensure work-type category
CREATE OR REPLACE FUNCTION ensure_work_type_category_trigger()
RETURNS trigger AS $$
DECLARE
    inferred_categories text[];
    existing_categories text[];
    final_categories text[];
    inferred_cat text;
BEGIN
    -- Skip if job is being deactivated
    IF NEW.is_active = false THEN
        RETURN NEW;
    END IF;

    -- Get existing categories
    existing_categories := COALESCE(NEW.categories, ARRAY[]::text[]);

    -- Check if work-type category exists
    IF NOT has_work_type_category(existing_categories) THEN
        -- Infer work-type categories from title/description
        inferred_categories := infer_work_type_category(
            COALESCE(NEW.title, ''),
            COALESCE(NEW.description, '')
        );

        -- Merge existing categories with inferred work-type categories
        -- Keep all existing categories, add inferred work-type categories
        final_categories := existing_categories;
        
        -- Add each inferred category if not already present
        FOREACH inferred_cat IN ARRAY inferred_categories
        LOOP
            IF NOT (inferred_cat = ANY(final_categories)) THEN
                final_categories := array_append(final_categories, inferred_cat);
            END IF;
        END LOOP;

        NEW.categories := final_categories;
        
        -- Log warning (can be monitored)
        RAISE WARNING 'Job % (title: %) missing work-type category - auto-inferred: %',
            NEW.id,
            NEW.title,
            array_to_string(inferred_categories, ', ');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger on INSERT and UPDATE
DROP TRIGGER IF EXISTS ensure_work_type_category_on_jobs ON jobs;
CREATE TRIGGER ensure_work_type_category_on_jobs
    BEFORE INSERT OR UPDATE ON jobs
    FOR EACH ROW
    WHEN (NEW.is_active = true)
    EXECUTE FUNCTION ensure_work_type_category_trigger();

-- Step 5: Add comment
COMMENT ON FUNCTION ensure_work_type_category_trigger() IS 'Ensures jobs always have at least one work-type category by auto-inferring from title/description if missing';
COMMENT ON FUNCTION infer_work_type_category(text, text) IS 'Infers work-type categories from job title and description using keyword matching';
COMMENT ON FUNCTION has_work_type_category(text[]) IS 'Checks if categories array contains at least one work-type category';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to verify)
-- ============================================================================
-- Test the trigger by trying to insert a job without work-type category:
-- INSERT INTO jobs (title, company, job_hash, categories, is_active, source)
-- VALUES ('Test Job', 'Test Company', 'test-hash-123', ARRAY['early-career'], true, 'test');
-- 
-- Check if work-type category was added:
-- SELECT id, title, categories FROM jobs WHERE job_hash = 'test-hash-123';
--
-- Check trigger exists:
-- SELECT tgname FROM pg_trigger WHERE tgname = 'ensure_work_type_category_on_jobs';

