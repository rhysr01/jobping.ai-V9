-- Migration: Simple match_logs schema update
-- This migration adds missing fields without complex type conversions
-- Run this in your Supabase SQL Editor

-- 1. Add missing timestamp fields
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

-- 4. Add the updated_at trigger
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

-- 5. Log the migration
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
    'match_logs schema updated successfully - added timestamp fields',
    'System'
);

-- 6. Verify the final structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'match_logs' 
ORDER BY ordinal_position;
