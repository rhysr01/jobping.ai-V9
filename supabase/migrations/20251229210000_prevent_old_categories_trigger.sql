-- ============================================================================
-- DATABASE TRIGGER: Prevent Old Category Names
-- ============================================================================
-- This trigger automatically removes/replaces old category names when jobs
-- are inserted or updated, ensuring they never persist in the database.
--
-- Date: December 29, 2025
-- ============================================================================

BEGIN;

-- ============================================================================
-- Function to clean categories and prevent old category names
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_old_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if categories exist
  IF NEW.categories IS NOT NULL AND array_length(NEW.categories, 1) > 0 THEN
    -- Replace old category names with new ones
    NEW.categories = array_replace(NEW.categories, 'marketing-advertising', 'marketing-growth');
    NEW.categories = array_replace(NEW.categories, 'finance-accounting', 'finance-investment');
    NEW.categories = array_replace(NEW.categories, 'sales-business-development', 'sales-client-success');
    NEW.categories = array_replace(NEW.categories, 'product-management', 'product-innovation');
    
    -- Remove any remaining old categories using array_remove (more reliable)
    NEW.categories = array_remove(NEW.categories, 'marketing-advertising');
    NEW.categories = array_remove(NEW.categories, 'finance-accounting');
    NEW.categories = array_remove(NEW.categories, 'sales-business-development');
    NEW.categories = array_remove(NEW.categories, 'product-management');
    
    -- Ensure array is not empty
    IF array_length(NEW.categories, 1) IS NULL OR array_length(NEW.categories, 1) = 0 THEN
      NEW.categories = ARRAY['early-career'];
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Create triggers (BEFORE INSERT and BEFORE UPDATE)
-- ============================================================================
DROP TRIGGER IF EXISTS trg_prevent_old_categories_insert ON jobs;
CREATE TRIGGER trg_prevent_old_categories_insert
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_old_categories();

DROP TRIGGER IF EXISTS trg_prevent_old_categories_update ON jobs;
CREATE TRIGGER trg_prevent_old_categories_update
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_old_categories();

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Test the trigger:
-- INSERT INTO jobs (title, company, categories, ...) 
-- VALUES ('Test', 'Test Co', ARRAY['marketing-advertising', 'early-career'], ...);
-- 
-- Should result in: categories = ARRAY['marketing-growth', 'early-career']
-- 
-- Check trigger exists:
-- SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = 'jobs'::regclass AND tgname LIKE '%prevent_old_categories%';

