-- Migration: Clean up invalid job categories
-- Date: 2026-01-27
-- Description: Remove non-form-option categories from jobs table
--
-- CONTEXT:
-- Some jobs have categories that don't correspond to form options:
-- - retail-luxury
-- - entrepreneurship
-- - technology (should be tech-transformation)
-- - people-hr (no form option)
-- - legal-compliance (no form option)
-- - creative-design (no form option)
-- - general-management (no form option)
--
-- ACTION: Replace these with 'all-categories' (unsure fallback)

BEGIN;

-- Update jobs with invalid categories to use 'all-categories' fallback
UPDATE public.jobs
SET categories = array_replace(
  array_replace(
    array_replace(
      array_replace(
        array_replace(
          array_replace(
            array_replace(
              categories,
              'retail-luxury', 'all-categories'
            ),
            'entrepreneurship', 'all-categories'
          ),
          'technology', 'all-categories'
        ),
        'people-hr', 'all-categories'
      ),
      'legal-compliance', 'all-categories'
    ),
    'creative-design', 'all-categories'
  ),
  'general-management', 'all-categories'
)
WHERE is_active = true
AND (
  categories @> ARRAY['retail-luxury']
  OR categories @> ARRAY['entrepreneurship']
  OR categories @> ARRAY['technology']
  OR categories @> ARRAY['people-hr']
  OR categories @> ARRAY['legal-compliance']
  OR categories @> ARRAY['creative-design']
  OR categories @> ARRAY['general-management']
);

-- Log the update (if audit_log table exists)
-- Note: audit_log table must be created separately
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'audit_log'
  ) THEN
    INSERT INTO public.audit_log (action, table_name, details, created_at)
    VALUES (
      'cleanup_invalid_categories',
      'jobs',
      jsonb_build_object(
        'removed_categories', ARRAY['retail-luxury', 'entrepreneurship', 'technology', 'people-hr', 'legal-compliance', 'creative-design', 'general-management'],
        'replacement', 'all-categories',
        'reason', 'Categories do not correspond to form options'
      ),
      NOW()
    );
  END IF;
END $$;

COMMIT;

