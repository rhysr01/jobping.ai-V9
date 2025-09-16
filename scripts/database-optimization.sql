-- Database Performance Optimization for 50+ Users
-- Run these indexes to improve query performance

-- 1. Jobs table indexes (most critical)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_freshness_tier 
ON jobs(freshness_tier) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_created_at_active 
ON jobs(created_at DESC) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_location_active 
ON jobs(location) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_company_active 
ON jobs(company) WHERE is_active = true;

-- Composite index for common job queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_composite_matching 
ON jobs(freshness_tier, is_active, created_at DESC) 
WHERE is_active = true;

-- 2. Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified 
ON users(email_verified) WHERE email_verified = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_subscription_tier 
ON users(subscription_tier);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_email_sent 
ON users(last_email_sent) WHERE email_verified = true;

-- 3. Match logs table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_match_logs_user_email 
ON match_logs(user_email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_match_logs_created_at 
ON match_logs(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_match_logs_match_type 
ON match_logs(match_type);

-- 4. AI usage logs table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_logs_user_email 
ON ai_usage_logs(user_email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_logs_created_at 
ON ai_usage_logs(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_logs_model 
ON ai_usage_logs(model);

-- 5. Job matching performance optimization
-- Partial index for active jobs with recent timestamps
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_recent_active 
ON jobs(created_at DESC, job_hash) 
WHERE is_active = true AND created_at > NOW() - INTERVAL '7 days';

-- 6. User preference queries optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_target_cities_gin 
ON users USING GIN(target_cities) WHERE email_verified = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_career_path_gin 
ON users USING GIN(career_path) WHERE email_verified = true;

-- 7. Email tracking optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_phase_tier 
ON users(email_phase, subscription_tier) WHERE email_verified = true;

-- 8. Job deduplication optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_hash_unique 
ON jobs(job_hash) WHERE is_active = true;

-- 9. Performance monitoring queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_source_created 
ON jobs(source, created_at DESC) WHERE is_active = true;

-- 10. User activity tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_activity 
ON users(created_at DESC, last_email_sent) WHERE email_verified = true;

-- Analyze tables after creating indexes
ANALYZE jobs;
ANALYZE users;
ANALYZE match_logs;
ANALYZE ai_usage_logs;

-- Query performance monitoring
-- Use these queries to monitor performance:

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE mean_time > 100 -- queries taking more than 100ms
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
