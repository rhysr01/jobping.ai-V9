-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON PUBLIC TABLES
-- ============================================================================
-- Enables RLS on tables that are exposed to PostgREST but don't have RLS enabled
-- This is a security requirement for public tables
--
-- Date: January 2, 2026
-- ============================================================================

BEGIN;

-- Enable RLS on all public tables that need it
ALTER TABLE public.free_signups_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraping_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fallback_match_events ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for service role access
-- Note: These are permissive policies - adjust based on your security requirements

-- free_signups_analytics: Service role can do everything, authenticated users can read
CREATE POLICY "Service role full access" ON public.free_signups_analytics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read" ON public.free_signups_analytics
  FOR SELECT
  TO authenticated
  USING (true);

-- analytics_events: Service role can do everything, authenticated users can insert their own
CREATE POLICY "Service role full access" ON public.analytics_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert" ON public.analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- free_sessions: Service role can do everything, authenticated users can read/insert
CREATE POLICY "Service role full access" ON public.free_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage own" ON public.free_sessions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- scraping_priorities: Service role only (internal use)
CREATE POLICY "Service role full access" ON public.scraping_priorities
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- custom_scans: Service role can do everything, authenticated users can read/insert their own
-- Note: custom_scans uses user_email, not user_id - adjust policy based on your auth setup
CREATE POLICY "Service role full access" ON public.custom_scans
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- For authenticated users, you may need to match user_email to auth.users.email
-- Adjust this policy based on your authentication setup
CREATE POLICY "Users can manage own scans" ON public.custom_scans
  FOR ALL
  TO authenticated
  USING (user_email = (select email from auth.users where id = (select auth.uid())))
  WITH CHECK (user_email = (select email from auth.users where id = (select auth.uid())));

-- fallback_match_events: Service role only (internal use)
CREATE POLICY "Service role full access" ON public.fallback_match_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;

