-- Add missing internship and graduate columns to jobs table
-- These columns are used by the preview-matches API and categorize_job function

DO $$
BEGIN
    -- Add is_internship column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'jobs' AND column_name = 'is_internship') THEN
        ALTER TABLE public.jobs ADD COLUMN is_internship BOOLEAN DEFAULT false;
        CREATE INDEX IF NOT EXISTS idx_jobs_is_internship ON public.jobs(is_internship) WHERE is_internship = true;
    END IF;

    -- Add is_graduate column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'jobs' AND column_name = 'is_graduate') THEN
        ALTER TABLE public.jobs ADD COLUMN is_graduate BOOLEAN DEFAULT false;
        CREATE INDEX IF NOT EXISTS idx_jobs_is_graduate ON public.jobs(is_graduate) WHERE is_graduate = true;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.jobs.is_internship IS 'Whether this job is an internship position';
COMMENT ON COLUMN public.jobs.is_graduate IS 'Whether this job is targeted at recent graduates';