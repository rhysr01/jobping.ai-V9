-- Enhanced User Feedback System Migration
-- Provides rich, structured feedback data for AI learning and continuous improvement

-- 1. Create enhanced feedback table
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id SERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  job_hash TEXT NOT NULL,
  match_hash TEXT, -- Links to specific match instance
  
  -- Core feedback
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('job_relevance', 'match_quality', 'email_experience', 'overall_satisfaction')),
  verdict TEXT NOT NULL CHECK (verdict IN ('positive', 'negative', 'neutral')),
  
  -- Detailed feedback (AI-optimized)
  relevance_score INTEGER CHECK (relevance_score >= 1 AND relevance_score <= 5), -- 1-5 scale
  match_quality_score INTEGER CHECK (match_quality_score >= 1 AND match_quality_score <= 5),
  explanation TEXT, -- User's explanation (AI can analyze sentiment/insights)
  
  -- Context for AI learning
  user_preferences_snapshot JSONB, -- What user wanted at time of match
  job_context JSONB, -- Job details at time of match
  match_context JSONB, -- How AI arrived at this match
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT unique_user_job_feedback UNIQUE(user_email, job_hash, feedback_type)
);

-- 2. Create feedback analytics table for aggregated insights
CREATE TABLE IF NOT EXISTS public.feedback_analytics (
  id SERIAL PRIMARY KEY,
  
  -- Aggregation period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Metrics
  total_feedback_count INTEGER DEFAULT 0,
  positive_feedback_count INTEGER DEFAULT 0,
  negative_feedback_count INTEGER DEFAULT 0,
  neutral_feedback_count INTEGER DEFAULT 0,
  
  -- Score averages
  avg_relevance_score DECIMAL(3,2),
  avg_match_quality_score DECIMAL(3,2),
  
  -- AI learning insights
  common_negative_patterns JSONB, -- Patterns in negative feedback
  improvement_opportunities JSONB, -- Specific areas to improve
  user_satisfaction_trend DECIMAL(3,2), -- Trend over time
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add unique constraint for ON CONFLICT to work
  CONSTRAINT unique_period UNIQUE(period_start, period_end)
);

-- 3. Create feedback learning table for AI training data
CREATE TABLE IF NOT EXISTS public.feedback_learning_data (
  id SERIAL PRIMARY KEY,
  
  -- Training data
  user_profile_features JSONB, -- User preferences as features
  job_features JSONB, -- Job characteristics as features
  match_features JSONB, -- How AI matched them
  feedback_label TEXT NOT NULL, -- What user thought (positive/negative)
  
  -- Learning context
  learning_weight DECIMAL(3,2) DEFAULT 1.0, -- How important this example is
  confidence_score DECIMAL(3,2), -- AI's confidence in this match
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_for_training BOOLEAN DEFAULT FALSE,
  training_iteration INTEGER DEFAULT 0
);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_email ON public.user_feedback(user_email);
CREATE INDEX IF NOT EXISTS idx_user_feedback_job_hash ON public.user_feedback(job_hash);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON public.user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON public.user_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_user_feedback_verdict ON public.user_feedback(verdict);

CREATE INDEX IF NOT EXISTS idx_feedback_analytics_period ON public.feedback_analytics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_feedback_learning_used ON public.feedback_learning_data(used_for_training);

-- 5. Add comments for documentation
COMMENT ON TABLE public.user_feedback IS 'Rich user feedback data for AI learning and continuous improvement';
COMMENT ON COLUMN public.user_feedback.feedback_type IS 'Type of feedback: job_relevance, match_quality, email_experience, overall_satisfaction';
COMMENT ON COLUMN public.user_feedback.verdict IS 'User verdict: positive, negative, neutral';
COMMENT ON COLUMN public.user_feedback.relevance_score IS '1-5 scale: 1=completely irrelevant, 5=perfect match';
COMMENT ON COLUMN public.user_feedback.match_quality_score IS '1-5 scale: 1=very poor match, 5=excellent match';
COMMENT ON COLUMN public.user_feedback.user_preferences_snapshot IS 'JSON snapshot of user preferences at time of match for context';
COMMENT ON COLUMN public.user_feedback.job_context IS 'JSON snapshot of job details at time of match for context';
COMMENT ON COLUMN public.user_feedback.match_context IS 'JSON snapshot of how AI arrived at this match for learning';

COMMENT ON TABLE public.feedback_analytics IS 'Aggregated feedback insights for trend analysis and AI improvement';
COMMENT ON TABLE public.feedback_learning_data IS 'Structured training data for AI model improvement';

-- 6. Create views for easy querying
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

-- 7. Create function to update analytics
CREATE OR REPLACE FUNCTION public.update_feedback_analytics()
RETURNS void AS $$
BEGIN
  -- Update daily analytics
  INSERT INTO public.feedback_analytics (period_start, period_end, total_feedback_count, positive_feedback_count, negative_feedback_count, neutral_feedback_count, avg_relevance_score, avg_match_quality_score)
  SELECT 
    CURRENT_DATE - INTERVAL '1 day',
    CURRENT_DATE,
    COUNT(*),
    COUNT(CASE WHEN verdict = 'positive' THEN 1 END),
    COUNT(CASE WHEN verdict = 'negative' THEN 1 END),
    COUNT(CASE WHEN verdict = 'neutral' THEN 1 END),
    AVG(relevance_score),
    AVG(match_quality_score)
  FROM public.user_feedback
  WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
    AND created_at < CURRENT_DATE
  ON CONFLICT (period_start, period_end) DO UPDATE SET
    total_feedback_count = EXCLUDED.total_feedback_count,
    positive_feedback_count = EXCLUDED.positive_feedback_count,
    negative_feedback_count = EXCLUDED.negative_feedback_count,
    neutral_feedback_count = EXCLUDED.neutral_feedback_count,
    avg_relevance_score = EXCLUDED.avg_relevance_score,
    avg_match_quality_score = EXCLUDED.avg_match_quality_score,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to auto-update analytics
CREATE OR REPLACE FUNCTION public.trigger_update_analytics()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.update_feedback_analytics();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_analytics_trigger
  AFTER INSERT OR UPDATE ON public.user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_analytics();

-- 9. Insert sample data for testing
INSERT INTO public.user_feedback (user_email, job_hash, feedback_type, verdict, relevance_score, match_quality_score, explanation, user_preferences_snapshot, job_context, match_context)
VALUES 
  ('test@example.com', 'sample_job_hash_1', 'job_relevance', 'positive', 5, 4, 'Perfect match for my skills and location', '{"professional_expertise": "software development", "target_cities": ["London"]}', '{"title": "Software Engineer", "company": "Tech Corp", "location": "London"}', '{"match_algorithm": "ai", "ai_model": "gpt-4", "match_score": 85}'),
  ('test@example.com', 'sample_job_hash_2', 'job_relevance', 'negative', 2, 3, 'Not interested in this type of role', '{"professional_expertise": "software development", "target_cities": ["London"]}', '{"title": "Sales Manager", "company": "Sales Corp", "location": "London"}', '{"match_algorithm": "rules", "match_score": 65}');

-- 10. Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.user_feedback TO authenticated;
GRANT SELECT ON public.feedback_analytics TO authenticated;
GRANT SELECT ON public.feedback_summary TO authenticated;
GRANT SELECT ON public.feedback_learning_data TO authenticated;

-- 11. Enable RLS (Row Level Security)
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_learning_data ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies
CREATE POLICY "Users can view their own feedback" ON public.user_feedback
  FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can insert their own feedback" ON public.user_feedback
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can update their own feedback" ON public.user_feedback
  FOR UPDATE USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Analytics are viewable by authenticated users" ON public.feedback_analytics
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Learning data is viewable by authenticated users" ON public.feedback_learning_data
  FOR SELECT USING (auth.role() = 'authenticated');

-- 13. Create feedback insights function
CREATE OR REPLACE FUNCTION public.get_feedback_insights(user_email_param TEXT DEFAULT NULL)
RETURNS TABLE (
  insight_type TEXT,
  insight_description TEXT,
  confidence DECIMAL(3,2),
  action_items JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'user_satisfaction'::TEXT,
    CASE 
      WHEN avg_score >= 4.0 THEN 'User is highly satisfied with matches'
      WHEN avg_score >= 3.0 THEN 'User is moderately satisfied with matches'
      ELSE 'User is dissatisfied with matches'
    END,
    CASE 
      WHEN feedback_count >= 10 THEN 0.9
      WHEN feedback_count >= 5 THEN 0.7
      ELSE 0.5
    END,
    CASE 
      WHEN avg_score < 3.0 THEN '[{"action": "review_matching_algorithm", "priority": "high"}, {"action": "check_user_preferences", "priority": "medium"}]'::JSONB
      WHEN avg_score < 4.0 THEN '[{"action": "optimize_match_weights", "priority": "medium"}]'::JSONB
      ELSE '[{"action": "maintain_current_quality", "priority": "low"}]'::JSONB
    END
  FROM (
    SELECT 
      AVG(relevance_score) as avg_score,
      COUNT(*) as feedback_count
    FROM public.user_feedback
    WHERE user_email = COALESCE(user_email_param, auth.jwt() ->> 'email')
  ) user_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_feedback_insights(TEXT) TO authenticated;

-- Migration complete
SELECT 'Enhanced feedback system migration completed successfully!' as status;
