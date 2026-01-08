-- RLS and Security Fixes Migration

-- 2. ENABLE RLS ON PUBLIC TABLES (Security)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'free_signups_analytics'
      AND rowsecurity = true
  ) THEN
    ALTER TABLE public.free_signups_analytics ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'analytics_events'
      AND rowsecurity = true
  ) THEN
    ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'free_sessions'
      AND rowsecurity = true
  ) THEN
    ALTER TABLE public.free_sessions ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'scraping_priorities'
      AND rowsecurity = true
  ) THEN
    ALTER TABLE public.scraping_priorities ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'custom_scans'
      AND rowsecurity = true
  ) THEN
    ALTER TABLE public.custom_scans ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'fallback_match_events'
      AND rowsecurity = true
  ) THEN
    ALTER TABLE public.fallback_match_events ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create RLS policies (idempotent - DROP IF EXISTS then CREATE)
DO $$
BEGIN
  -- free_signups_analytics policies
  DROP POLICY IF EXISTS "Service role full access" ON public.free_signups_analytics;
  CREATE POLICY "Service role full access" ON public.free_signups_analytics
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'free_signups_analytics'
      AND policyname = 'Authenticated users can read'
  ) THEN
    CREATE POLICY "Authenticated users can read" ON public.free_signups_analytics
      FOR SELECT TO authenticated USING (true);
  END IF;

  -- analytics_events policies
  DROP POLICY IF EXISTS "Service role full access" ON public.analytics_events;
  CREATE POLICY "Service role full access" ON public.analytics_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analytics_events'
      AND policyname = 'Authenticated users can insert'
  ) THEN
    CREATE POLICY "Authenticated users can insert" ON public.analytics_events
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  -- free_sessions policies
  DROP POLICY IF EXISTS "Service role full access" ON public.free_sessions;
  CREATE POLICY "Service role full access" ON public.free_sessions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'free_sessions'
      AND policyname = 'Authenticated users can manage own'
  ) THEN
    CREATE POLICY "Authenticated users can manage own" ON public.free_sessions
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  -- scraping_priorities policies
  DROP POLICY IF EXISTS "Service role full access" ON public.scraping_priorities;
  CREATE POLICY "Service role full access" ON public.scraping_priorities
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  -- custom_scans policies
  DROP POLICY IF EXISTS "Service role full access" ON public.custom_scans;
  CREATE POLICY "Service role full access" ON public.custom_scans
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Users can manage own scans" ON public.custom_scans;
  CREATE POLICY "Users can manage own scans" ON public.custom_scans
    FOR ALL TO authenticated
    USING (user_email = (select email from auth.users where id = (select auth.uid())))
    WITH CHECK (user_email = (select email from auth.users where id = (select auth.uid())));

  -- fallback_match_events policies
  DROP POLICY IF EXISTS "Service role full access" ON public.fallback_match_events;
  CREATE POLICY "Service role full access" ON public.fallback_match_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);
END $$;

-- 3. FIX RLS PERFORMANCE (Performance)
DO $$
BEGIN
  -- pending_digests (uses user_email, not user_id)
  DROP POLICY IF EXISTS "pending_digests_user_read_policy" ON public.pending_digests;
  CREATE POLICY "pending_digests_user_read_policy" ON public.pending_digests
    FOR SELECT TO authenticated
    USING (user_email = (select auth.jwt() ->> 'email'));

  -- matches (has both user_id and user_email - use user_email for consistency)
  DROP POLICY IF EXISTS "users_view_own_matches" ON public.matches;
  CREATE POLICY "users_view_own_matches" ON public.matches
    FOR SELECT TO authenticated
    USING (user_email = (select auth.jwt() ->> 'email'));

  -- match_logs (uses user_email, not user_id)
  DROP POLICY IF EXISTS "users_view_own_match_logs" ON public.match_logs;
  CREATE POLICY "users_view_own_match_logs" ON public.match_logs
    FOR SELECT TO authenticated
    USING (user_email = (select auth.jwt() ->> 'email'));

  -- stripe_connect_accounts
  DROP POLICY IF EXISTS "Users can read own accounts" ON public.stripe_connect_accounts;
  CREATE POLICY "Users can read own accounts" ON public.stripe_connect_accounts
    FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

  DROP POLICY IF EXISTS "Service role full access" ON public.stripe_connect_accounts;
  CREATE POLICY "Service role full access" ON public.stripe_connect_accounts
    FOR ALL TO service_role USING (true) WITH CHECK (true);
END $$;

-- 4. ADD MISSING INDEXES (Performance)
CREATE INDEX IF NOT EXISTS idx_api_key_usage_api_key_id
  ON public.api_key_usage(api_key_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id
  ON public.api_keys(user_id);

-- 5. FIX FUNCTION SEARCH PATH (Security)
DO $$
DECLARE
  func_name text;
  func_list text[] := ARRAY[
    'prevent_old_categories()',
    'reset_user_recommendations()',
    'normalize_city_name(text)',
    'get_user_match_stats(uuid)',
    'clean_company_name(text)',
    'clean_job_data_before_insert()',
    'categorize_job()',
    'clear_user_feedback_cache()',
    'trigger_user_rematch()',
    'update_pending_digests_updated_at()'
  ];
BEGIN
  FOREACH func_name IN ARRAY func_list
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION public.%s SET search_path = public', func_name);
    EXCEPTION WHEN OTHERS THEN
      -- Function doesn't exist or already has correct search_path - skip
      NULL;
    END;
  END LOOP;
END $$;
