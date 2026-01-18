-- Migration: Create tables for Guaranteed Matching Engine
-- Date: 2025-01-01
-- Description: Adds custom_scans, fallback_match_events, and scraping_priorities tables

-- Table: custom_scans
-- Tracks custom scan requests when guaranteed matching cannot find enough matches
CREATE TABLE IF NOT EXISTS custom_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  criteria JSONB NOT NULL, -- { location: [], career_path: [], roles: [], visa: bool }
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  estimated_completion TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  matches_found INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_custom_scans_user_email ON custom_scans(user_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_scans_status ON custom_scans(status, created_at DESC) WHERE status = 'pending';

COMMENT ON TABLE custom_scans IS 'Tracks custom scan requests when guaranteed matching cannot find enough matches';

-- Table: fallback_match_events
-- Tracks when guaranteed matching uses relaxation to find matches
CREATE TABLE IF NOT EXISTS fallback_match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  relaxation_level INTEGER NOT NULL, -- 0 = exact, 7 = custom scan
  relaxation_path TEXT[] NOT NULL, -- ['exact', 'relaxed', 'custom_scan']
  original_preferences JSONB NOT NULL,
  final_preferences JSONB NOT NULL,
  matches_found INTEGER NOT NULL,
  min_matches_required INTEGER NOT NULL,
  missing_criteria JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fallback_events_user_email ON fallback_match_events(user_email, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_fallback_events_relaxation_level ON fallback_match_events(relaxation_level, timestamp DESC);

COMMENT ON TABLE fallback_match_events IS 'Tracks when guaranteed matching uses relaxation to find matches';

-- Table: scraping_priorities
-- Tracks high-demand criteria from fallback events to inform scraping priorities
CREATE TABLE IF NOT EXISTS scraping_priorities (
  criteria TEXT PRIMARY KEY, -- e.g., 'location:london', 'career_path:tech', 'visa_sponsorship'
  demand_count INTEGER DEFAULT 1,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scraping_priorities_demand ON scraping_priorities(demand_count DESC, last_updated DESC);

COMMENT ON TABLE scraping_priorities IS 'Tracks high-demand criteria from fallback events to inform scraping priorities';

