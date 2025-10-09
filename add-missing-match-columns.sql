-- Add missing columns to matches table that the API is trying to insert

-- Add error_category column (optional tracking field)
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS error_category text;

-- Add retry_count column (optional tracking field)
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'matches' 
  AND table_schema = 'public'
  AND column_name IN ('error_category', 'retry_count');

