-- Simplified Enhanced Feedback System Migration
-- Run this in Supabase SQL Editor if you encounter issues with the full migration

-- 1. Create enhanced feedback table
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id SERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  job_hash TEXT NOT NULL,
  match_hash TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('job_relevance', 'match_quality', 'email_experience', 'overall_satisfaction')),
  verdict TEXT NOT NULL CHECK (verdict IN ('positive', 'negative', 'neutral')),
  relevance_score INTEGER CHECK (relevance_score >= 1 AND relevance_score <= 5),
  match_quality_score INTEGER CHECK (match_quality_score >= 1 AND match_quality_score <= 5),
  explanation TEXT,
  user_preferences_snapshot JSONB,
  job_context JSONB,
  match_context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_job_feedback UNIQUE(user_email, job_hash, feedback_type)
);

-- 2. Create feedback analytics table
CREATE TABLE IF NOT EXISTS public.feedback_analytics (
  id SERIAL PRIMARY KEY,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_feedback_count INTEGER DEFAULT 0,
  positive_feedback_count INTEGER DEFAULT 0,
  negative_feedback_count INTEGER DEFAULT 0,
  neutral_feedback_count INTEGER DEFAULT 0,
  avg_relevance_score DECIMAL(3,2),
  avg_match_quality_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_period UNIQUE(period_start, period_end)
);

-- 3. Create feedback learning table
CREATE TABLE IF NOT EXISTS public.feedback_learning_data (
  id SERIAL PRIMARY KEY,
  user_profile_features JSONB,
  job_features JSONB,
  match_features JSONB,
  feedback_label TEXT NOT NULL,
  learning_weight DECIMAL(3,2) DEFAULT 1.0,
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_for_training BOOLEAN DEFAULT FALSE,
  training_iteration INTEGER DEFAULT 0
);

-- 4. Add basic indexes
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_email ON public.user_feedback(user_email);
CREATE INDEX IF NOT EXISTS idx_user_feedback_job_hash ON public.user_feedback(job_hash);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON public.user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON public.user_feedback(created_at);

-- 5. Create simple view
CREATE OR REPLACE VIEW public.feedback_summary AS
SELECT 
  user_email,
  COUNT(*) as total_feedback,
  COUNT(CASE WHEN verdict = 'positive' THEN 1 END) as positive_count,
  COUNT(CASE WHEN verdict = 'negative' THEN 1 END) as negative_count,
  COUNT(CASE WHEN verdict = 'neutral' THEN 1 END) as neutral_count,
  AVG(relevance_score) as avg_relevance,
  AVG(match_quality_score) as avg_match_quality,
  MAX(created_at) as last_feedback
FROM public.user_feedback
GROUP BY user_email;

-- 6. Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.user_feedback TO authenticated;
GRANT SELECT ON public.feedback_analytics TO authenticated;
GRANT SELECT ON public.feedback_summary TO authenticated;
GRANT SELECT ON public.feedback_learning_data TO authenticated;

-- 7. Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_learning_data ENABLE ROW LEVEL SECURITY;

-- 8. Create basic RLS policies
CREATE POLICY "Users can view their own feedback" ON public.user_feedback
  FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can insert their own feedback" ON public.user_feedback
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Analytics are viewable by authenticated users" ON public.feedback_analytics
  FOR SELECT USING (auth.role() = 'authenticated');

-- 9. Insert test data
INSERT INTO public.user_feedback (user_email, job_hash, feedback_type, verdict, relevance_score, match_quality_score, explanation)
VALUES 
  ('test@example.com', 'sample_job_hash_1', 'job_relevance', 'positive', 5, 4, 'Perfect match for my skills and location'),
  ('test@example.com', 'sample_job_hash_2', 'job_relevance', 'negative', 2, 3, 'Not interested in this type of role');

-- Migration complete
SELECT 'Simplified feedback system migration completed successfully!' as status;
