-- Migration: Create match_logs table for tracking matching sessions
-- This table tracks AI matching performance, fallback usage, and user engagement

-- Create the match_logs table
CREATE TABLE IF NOT EXISTS public.match_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    job_batch_id TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    fallback_used BOOLEAN NOT NULL DEFAULT false,
    jobs_processed INTEGER NOT NULL DEFAULT 0,
    matches_generated INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    match_type TEXT NOT NULL CHECK (match_type IN ('ai_success', 'ai_failed', 'fallback')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processing_time_ms INTEGER,
    ai_model_used TEXT,
    cache_hit BOOLEAN DEFAULT false,
    user_tier TEXT,
    job_freshness_distribution JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_match_logs_user_email ON public.match_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_match_logs_timestamp ON public.match_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_match_logs_match_type ON public.match_logs(match_type);
CREATE INDEX IF NOT EXISTS idx_match_logs_success ON public.match_logs(success);
CREATE INDEX IF NOT EXISTS idx_match_logs_job_batch_id ON public.match_logs(job_batch_id);

-- Create a composite index for common queries
CREATE INDEX IF NOT EXISTS idx_match_logs_user_timestamp ON public.match_logs(user_email, timestamp DESC);

-- Add RLS policies
ALTER TABLE public.match_logs ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "service_role_full_access_match_logs" ON public.match_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Users can only see their own logs
CREATE POLICY "users_can_view_own_logs" ON public.match_logs
    FOR SELECT USING (auth.email() = user_email);

-- Grant permissions
GRANT ALL ON public.match_logs TO service_role;
GRANT SELECT ON public.match_logs TO authenticated;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_match_logs_updated_at 
    BEFORE UPDATE ON public.match_logs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO public.match_logs (
    user_email, 
    job_batch_id, 
    success, 
    fallback_used, 
    jobs_processed, 
    matches_generated, 
    match_type, 
    user_tier,
    processing_time_ms
) VALUES 
    ('test@example.com', 'batch_20250101_001', true, false, 50, 15, 'ai_success', 'free', 1250),
    ('test@example.com', 'batch_20250101_002', true, true, 45, 12, 'fallback', 'free', 800),
    ('premium@example.com', 'batch_20250101_003', true, false, 100, 25, 'ai_success', 'premium', 2100);

-- Log the migration
INSERT INTO public.match_logs (
    user_email, 
    job_batch_id, 
    success, 
    fallback_used, 
    jobs_processed, 
    matches_generated, 
    match_type, 
    error_message,
    user_tier
) VALUES (
    'system@jobping.com', 
    'migration_001', 
    true, 
    false, 
    0, 
    0, 
    'ai_success', 
    'match_logs table created successfully',
    'system'
);
