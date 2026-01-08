-- Enable RLS on Public Tables
-- Target: Enable Row Level Security on analytics and session tables

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
