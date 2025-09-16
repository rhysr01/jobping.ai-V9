-- Migration: Add send ledger and seen jobs tracking
-- Run this in your Supabase SQL editor

-- Send ledger table for weekly usage tracking
CREATE TABLE IF NOT EXISTS send_ledger (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  week_start DATE NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'premium')),
  sends_used INTEGER NOT NULL DEFAULT 0,
  jobs_sent INTEGER NOT NULL DEFAULT 0,
  last_send_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one ledger entry per user per week
  UNIQUE(user_id, week_start)
);

-- Seen jobs table for deduplication
CREATE TABLE IF NOT EXISTS seen_jobs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_hash TEXT NOT NULL,
  seen_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tier TEXT NOT NULL CHECK (tier IN ('free', 'premium')),
  
  -- Ensure one entry per user per job
  UNIQUE(user_id, job_hash)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_send_ledger_user_week ON send_ledger(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_send_ledger_tier ON send_ledger(tier);
CREATE INDEX IF NOT EXISTS idx_seen_jobs_user ON seen_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_seen_jobs_hash ON seen_jobs(job_hash);
CREATE INDEX IF NOT EXISTS idx_seen_jobs_date ON seen_jobs(seen_date);

-- RLS policies
ALTER TABLE send_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE seen_jobs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage send_ledger" ON send_ledger
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage seen_jobs" ON seen_jobs
  FOR ALL USING (auth.role() = 'service_role');

-- Allow users to read their own data (if you add user auth later)
CREATE POLICY "Users can read own send_ledger" ON send_ledger
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can read own seen_jobs" ON seen_jobs
  FOR SELECT USING (auth.uid()::text = user_id);
