-- ============================================================================
-- ADD MISSING INDEXES FOR FOREIGN KEYS
-- ============================================================================
-- Adds indexes for foreign keys to improve query performance
--
-- Date: January 2, 2026
-- ============================================================================

BEGIN;

-- Add index for api_key_usage.api_key_id foreign key
CREATE INDEX IF NOT EXISTS idx_api_key_usage_api_key_id 
ON public.api_key_usage(api_key_id);

-- Add index for api_keys.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id 
ON public.api_keys(user_id);

COMMIT;

