-- Fix jobs table source constraint to allow 'adzuna' as valid source
-- This will allow us to properly save Adzuna jobs with their correct source

-- First, drop the existing constraint
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_source_check;

-- Add the new constraint that includes 'adzuna'
ALTER TABLE jobs ADD CONSTRAINT jobs_source_check 
CHECK (source IN ('lever', 'remoteok', 'adzuna', 'reed', 'infojobs'));

-- Verify the constraint was applied
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'jobs'::regclass 
AND conname = 'jobs_source_check';

-- Test the constraint by checking what sources are currently allowed
SELECT DISTINCT source, COUNT(*) as job_count
FROM jobs 
GROUP BY source 
ORDER BY job_count DESC;
