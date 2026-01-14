-- ============================================================================
-- DATA INTEGRITY CONSTRAINTS FOR JOBS TABLE
-- ============================================================================
-- This migration adds constraints to ensure job categories and visa status
-- always match form requirements, preventing invalid data insertion.
--
-- Date: January 15, 2026
-- ============================================================================

BEGIN;

-- 1. Add CHECK constraint for visa_friendly (must be true or false, no null)
-- First ensure all existing null values are set to false
UPDATE jobs SET visa_friendly = false WHERE visa_friendly IS NULL;

-- Add NOT NULL constraint and CHECK constraint
ALTER TABLE jobs
  ALTER COLUMN visa_friendly SET NOT NULL,
  ADD CONSTRAINT check_visa_friendly_boolean
    CHECK (visa_friendly IN (true, false));

-- 2. Add CHECK constraint for valid categories
-- Define valid categories based on form options
CREATE OR REPLACE FUNCTION validate_job_categories(categories text[])
RETURNS boolean AS $$
BEGIN
  -- Allow null or empty array
  IF categories IS NULL OR array_length(categories, 1) IS NULL THEN
    RETURN true;
  END IF;

  -- Check that all categories are in the allowed list
  RETURN categories <@ ARRAY[
    'strategy-business-design',
    'data-analytics',
    'sales-client-success',
    'marketing-growth',
    'finance-investment',
    'operations-supply-chain',
    'product-innovation',
    'tech-transformation',
    'sustainability-esg',
    'general'
  ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add check constraint using the function
ALTER TABLE jobs
  ADD CONSTRAINT check_valid_categories
    CHECK (validate_job_categories(categories));

-- 3. Add trigger to automatically clean categories on insert/update
CREATE OR REPLACE FUNCTION clean_job_categories()
RETURNS trigger AS $$
BEGIN
  -- If categories is null or empty, leave it as is
  IF NEW.categories IS NULL OR array_length(NEW.categories, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Filter out invalid categories and remove duplicates
  NEW.categories := ARRAY(
    SELECT DISTINCT unnest(NEW.categories)
    INTERSECT
    SELECT unnest(ARRAY[
      'strategy-business-design',
      'data-analytics',
      'sales-client-success',
      'marketing-growth',
      'finance-investment',
      'operations-supply-chain',
      'product-innovation',
      'tech-transformation',
      'sustainability-esg',
      'general'
    ])
  );

  -- Ensure at least one category if any were provided
  IF array_length(NEW.categories, 1) IS NULL AND array_length(OLD.categories, 1) IS NOT NULL THEN
    NEW.categories := ARRAY['general'];
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs before insert/update
DROP TRIGGER IF EXISTS trigger_clean_job_categories ON jobs;
CREATE TRIGGER trigger_clean_job_categories
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION clean_job_categories();

-- 4. Add comments for documentation
COMMENT ON COLUMN jobs.visa_friendly IS 'Visa sponsorship availability: true = available, false = not available. Cannot be null.';
COMMENT ON COLUMN jobs.categories IS 'Job categories from predefined list: strategy-business-design, data-analytics, sales-client-success, marketing-growth, finance-investment, operations-supply-chain, product-innovation, tech-transformation, sustainability-esg, general. Automatically filtered to valid categories only.';

-- 5. Create index for visa_friendly (already exists but ensuring it's there)
CREATE INDEX IF NOT EXISTS idx_jobs_visa_friendly ON jobs(visa_friendly);

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run these after migration)
-- ============================================================================

-- Check constraint violations (should return 0 rows after migration)
/*
SELECT COUNT(*) as invalid_visa_jobs FROM jobs WHERE visa_friendly IS NULL;
SELECT COUNT(*) as invalid_category_jobs FROM jobs WHERE NOT validate_job_categories(categories);
*/

-- Check valid data distribution
/*
SELECT
  visa_friendly,
  COUNT(*) as count
FROM jobs
GROUP BY visa_friendly
ORDER BY visa_friendly;

SELECT
  unnest(categories) as category,
  COUNT(*) as count
FROM jobs
WHERE categories IS NOT NULL
GROUP BY unnest(categories)
ORDER BY count DESC;
*/