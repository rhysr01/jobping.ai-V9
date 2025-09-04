-- Migration: Add provenance tracking fields to matches table
-- This migration adds fields to track AI matching performance, costs, and fallback reasons
-- No UX changes - internal tracking only

-- Add provenance tracking columns to matches table
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS match_algorithm text,
ADD COLUMN IF NOT EXISTS ai_model text,
ADD COLUMN IF NOT EXISTS prompt_version text,
ADD COLUMN IF NOT EXISTS ai_latency_ms integer,
ADD COLUMN IF NOT EXISTS ai_cost_usd numeric(10,5),
ADD COLUMN IF NOT EXISTS cache_hit boolean,
ADD COLUMN IF NOT EXISTS fallback_reason text,
ADD COLUMN IF NOT EXISTS retry_count integer,
ADD COLUMN IF NOT EXISTS error_category text;

-- Create indexes for provenance analytics
CREATE INDEX IF NOT EXISTS idx_matches_algorithm ON public.matches(match_algorithm);
CREATE INDEX IF NOT EXISTS idx_matches_ai_model ON public.matches(ai_model);
CREATE INDEX IF NOT EXISTS idx_matches_cache_hit ON public.matches(cache_hit);
CREATE INDEX IF NOT EXISTS idx_matches_fallback_reason ON public.matches(fallback_reason);
CREATE INDEX IF NOT EXISTS idx_matches_retry_count ON public.matches(retry_count);
CREATE INDEX IF NOT EXISTS idx_matches_error_category ON public.matches(error_category);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON public.matches(created_at);

-- Add comments to document the new fields
COMMENT ON COLUMN public.matches.match_algorithm IS 'Algorithm used for matching: ai, rules, hybrid';
COMMENT ON COLUMN public.matches.ai_model IS 'OpenAI model used for AI matching';
COMMENT ON COLUMN public.matches.prompt_version IS 'Version of the prompt used for AI matching';
COMMENT ON COLUMN public.matches.ai_latency_ms IS 'AI processing latency in milliseconds';
COMMENT ON COLUMN public.matches.ai_cost_usd IS 'Cost of AI processing in USD';
COMMENT ON COLUMN public.matches.cache_hit IS 'Whether the result came from cache';
COMMENT ON COLUMN public.matches.fallback_reason IS 'Reason for fallback to rules-based matching';
COMMENT ON COLUMN public.matches.retry_count IS 'Number of retry attempts before success/failure';
COMMENT ON COLUMN public.matches.error_category IS 'Category of error: rate_limit, timeout, parsing, api_error, unknown';

-- Update existing records to have default values
UPDATE public.matches SET 
  match_algorithm = COALESCE(match_algorithm, 'rules'),
  cache_hit = COALESCE(cache_hit, false)
WHERE match_algorithm IS NULL OR cache_hit IS NULL;

-- Log the migration
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
    'Provenance tracking fields added to matches table successfully',
    'System'
);
