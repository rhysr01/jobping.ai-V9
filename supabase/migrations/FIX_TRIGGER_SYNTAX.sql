-- ============================================================================
-- FIX: Database Trigger Syntax Error
-- ============================================================================
-- Fixes the prevent_old_categories trigger function
-- The array filtering syntax was incorrect
-- ============================================================================
-- Copy this entire file and run in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- Drop and recreate the function with correct syntax
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
-- Check function exists:
-- SELECT routine_name FROM information_schema.routines 
-- WHERE routine_schema = 'public' AND routine_name = 'prevent_old_categories';

