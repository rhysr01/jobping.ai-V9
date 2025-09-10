-- Migration: Add language detection columns to jobs table
-- This migration adds lang and lang_conf columns for language detection

-- Add language columns if they don't exist
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS lang TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS lang_conf REAL;

-- Add comment for documentation
COMMENT ON COLUMN jobs.lang IS 'Detected language code (ISO 639-1, e.g., en, fr, de, es)';
COMMENT ON COLUMN jobs.lang_conf IS 'Language detection confidence score (0.0 to 1.0)';

-- Optional: Add index on lang for faster queries by language
CREATE INDEX IF NOT EXISTS jobs_lang_idx ON jobs(lang);

-- Show the updated table structure
\d jobs;
