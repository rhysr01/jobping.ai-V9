-- Migration: Create pending_digests table
-- Date: 2026-01-21
-- Description: Creates table for queued digest emails that need to be sent

-- ============================================================================
-- CREATE pending_digests TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pending_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  job_hashes JSONB NOT NULL DEFAULT '[]'::jsonb,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent BOOLEAN NOT NULL DEFAULT false,
  cancelled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT pending_digests_user_email_check CHECK (user_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT pending_digests_job_hashes_check CHECK (jsonb_typeof(job_hashes) = 'array')
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for finding ready digests (scheduled_for <= now, not sent, not cancelled)
CREATE INDEX IF NOT EXISTS idx_pending_digests_ready 
  ON public.pending_digests(scheduled_for, sent, cancelled) 
  WHERE sent = false AND cancelled = false;

-- Index for user email lookups
CREATE INDEX IF NOT EXISTS idx_pending_digests_user_email 
  ON public.pending_digests(user_email);

-- Index for scheduled_for ordering
CREATE INDEX IF NOT EXISTS idx_pending_digests_scheduled_for 
  ON public.pending_digests(scheduled_for);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.pending_digests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES (Service role only - internal table)
-- ============================================================================

-- Policy: Service role can manage all pending digests
CREATE POLICY "Service role can manage pending_digests" ON public.pending_digests
  FOR ALL USING ((select auth.role()) = 'service_role');

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON public.pending_digests TO service_role;

-- No grants to anon/authenticated roles - this is an internal table

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.pending_digests IS 
  'Stores queued digest emails that need to be sent to premium users. Processed by cron job.';

COMMENT ON COLUMN public.pending_digests.job_hashes IS 
  'JSONB array of job hashes with match scores: [{"job_hash": "...", "match_score": 85, "match_reason": "..."}]';

COMMENT ON COLUMN public.pending_digests.scheduled_for IS 
  'When this digest should be sent. Digests are processed when scheduled_for <= now()';

COMMENT ON COLUMN public.pending_digests.sent IS 
  'Whether this digest has been successfully sent';

COMMENT ON COLUMN public.pending_digests.cancelled IS 
  'Whether this digest was cancelled (e.g., user unsubscribed, insufficient jobs)';

COMMENT ON POLICY "Service role can manage pending_digests" ON public.pending_digests IS 
  'Allows service role to manage pending digests. This is an internal table accessed only by cron jobs.';
