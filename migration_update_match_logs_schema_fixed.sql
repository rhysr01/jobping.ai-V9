-- Migration: Update existing match_logs table schema (FIXED VERSION)
-- This migration adds missing fields and fixes data type issues
-- Run this after the table already exists

-- 1. Add missing fields
ALTER TABLE public.match_logs 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Update existing records to have created_at and updated_at
UPDATE public.match_logs 
SET created_at = timestamp::timestamptz, 
    updated_at = timestamp::timestamptz 
WHERE created_at IS NULL OR updated_at IS NULL;

-- 3. Make created_at and updated_at NOT NULL after populating
ALTER TABLE public.match_logs 
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN updated_at SET NOT NULL;

-- 4. Fix data type issues - convert object fields to text
-- First, let's check what the current data types are
-- We'll handle each field individually to avoid type errors

-- Handle user_career_path - convert from object to text
ALTER TABLE public.match_logs 
ALTER COLUMN user_career_path TYPE TEXT USING 
  CASE 
    WHEN user_career_path IS NULL THEN NULL
    WHEN pg_typeof(user_career_path) = 'jsonb'::regtype THEN 
      CASE 
        WHEN jsonb_typeof(user_career_path) = 'array' THEN (user_career_path->0)::text
        WHEN jsonb_typeof(user_career_path) = 'string' THEN user_career_path::text
        ELSE NULL
      END
    WHEN pg_typeof(user_career_path) = 'text'::regtype THEN user_career_path
    ELSE user_career_path::text
  END;

-- Handle user_professional_experience - convert from object to text
ALTER TABLE public.match_logs 
ALTER COLUMN user_professional_experience TYPE TEXT USING 
  CASE 
    WHEN user_professional_experience IS NULL THEN NULL
    WHEN pg_typeof(user_professional_experience) = 'jsonb'::regtype THEN 
      CASE 
        WHEN jsonb_typeof(user_professional_experience) = 'array' THEN (user_professional_experience->0)::text
        WHEN jsonb_typeof(user_professional_experience) = 'string' THEN user_professional_experience::text
        ELSE NULL
      END
    WHEN pg_typeof(user_professional_experience) = 'text'::regtype THEN user_professional_experience
    ELSE user_professional_experience::text
  END;

-- Handle user_work_preference - convert from object to text
ALTER TABLE public.match_logs 
ALTER COLUMN user_work_preference TYPE TEXT USING 
  CASE 
    WHEN user_work_preference IS NULL THEN NULL
    WHEN pg_typeof(user_work_preference) = 'jsonb'::regtype THEN 
      CASE 
        WHEN jsonb_typeof(user_work_preference) = 'array' THEN (user_work_preference->0)::text
        WHEN jsonb_typeof(user_work_preference) = 'string' THEN user_work_preference::text
        ELSE NULL
      END
    WHEN pg_typeof(user_work_preference) = 'text'::regtype THEN user_work_preference
    ELSE user_work_preference::text
  END;

-- Handle error_message - convert from object to text
ALTER TABLE public.match_logs 
ALTER COLUMN error_message TYPE TEXT USING 
  CASE 
    WHEN error_message IS NULL THEN NULL
    WHEN pg_typeof(error_message) = 'jsonb'::regtype THEN 
      CASE 
        WHEN jsonb_typeof(error_message) = 'string' THEN error_message::text
        ELSE NULL
      END
    WHEN pg_typeof(error_message) = 'text'::regtype THEN error_message
    ELSE error_message::text
  END;

-- 5. Add missing indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_match_logs_block_send ON public.match_logs(block_send);
CREATE INDEX IF NOT EXISTS idx_match_logs_block_processed ON public.match_logs(block_processed);

-- 6. Add the updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_match_logs_updated_at ON public.match_logs;
CREATE TRIGGER update_match_logs_updated_at 
    BEFORE UPDATE ON public.match_logs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Update sample data to use correct format
UPDATE public.match_logs 
SET user_career_path = 'Strategy & Business Design',
    user_professional_experience = 'Consulting',
    user_work_preference = 'Hybrid'
WHERE user_email = 'test@example.com' AND user_career_path IS NULL;

UPDATE public.match_logs 
SET user_career_path = 'Data & Analytics',
    user_professional_experience = 'Data Analysis',
    user_work_preference = 'Remote'
WHERE user_email = 'test@example.com' AND user_career_path IS NULL;

UPDATE public.match_logs 
SET user_career_path = 'Finance & Investment',
    user_professional_experience = 'Investment Banking',
    user_work_preference = 'Office'
WHERE user_email = 'premium@example.com' AND user_career_path IS NULL;

-- 8. Log the migration
INSERT INTO public.match_logs (
    user_email, 
    match_type, 
    matches_generated, 
    error_message,
    user_career_path
) VALUES (
    'system@jobping.com', 
    'ai_success', 
    0, 
    'match_logs schema updated successfully - added missing fields and fixed data types',
    'System'
);

-- 9. Verify the final structure
-- This will show the current table structure after migration
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'match_logs' 
ORDER BY ordinal_position;
