-- Add user_id column to matches table to support UUID-based user lookups
-- This allows efficient joins with users table

ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_matches_user_id 
  ON public.matches(user_id);

-- Backfill user_id from user_email (if needed)
UPDATE public.matches m
SET user_id = u.id
FROM public.users u
WHERE m.user_email = u.email
  AND m.user_id IS NULL;

COMMENT ON COLUMN public.matches.user_id IS 'Foreign key to users.id for efficient user-based queries';

