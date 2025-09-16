-- Job Queue System Database Schema
-- Run this to create the necessary tables for the queue system

-- 1. Job Queue Table
CREATE TABLE IF NOT EXISTS job_queue (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    priority INTEGER DEFAULT 5,
    payload JSONB NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    status VARCHAR(20) DEFAULT 'pending',
    error TEXT,
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_for TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for job queue
CREATE INDEX IF NOT EXISTS idx_job_queue_status_type ON job_queue(status, type);
CREATE INDEX IF NOT EXISTS idx_job_queue_priority_created ON job_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_job_queue_scheduled ON job_queue(scheduled_for) WHERE status = 'pending';

-- 2. AI Usage Logs Table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    model VARCHAR(50) NOT NULL,
    cost_usd DECIMAL(10, 6) NOT NULL,
    tokens_used INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for AI usage logs
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_email ON ai_usage_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_model ON ai_usage_logs(model);

-- 3. Scraping Logs Table
CREATE TABLE IF NOT EXISTS scraping_logs (
    id SERIAL PRIMARY KEY,
    company VARCHAR(255) NOT NULL,
    scraper_type VARCHAR(50) NOT NULL,
    success BOOLEAN NOT NULL,
    jobs_found INTEGER DEFAULT 0,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for scraping logs
CREATE INDEX IF NOT EXISTS idx_scraping_logs_company ON scraping_logs(company);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_created_at ON scraping_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_success ON scraping_logs(success);

-- 4. Performance Metrics Table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15, 6) NOT NULL,
    metric_unit VARCHAR(20),
    tags JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at DESC);

-- 5. System Health Table
CREATE TABLE IF NOT EXISTS system_health (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    response_time_ms INTEGER,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for system health
CREATE INDEX IF NOT EXISTS idx_system_health_service ON system_health(service_name);
CREATE INDEX IF NOT EXISTS idx_system_health_created_at ON system_health(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON system_health(status);

-- 6. Cleanup functions
-- Auto-cleanup old job queue items (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_job_queue()
RETURNS void AS $$
BEGIN
    DELETE FROM job_queue 
    WHERE created_at < NOW() - INTERVAL '7 days' 
    AND status IN ('completed', 'failed');
END;
$$ LANGUAGE plpgsql;

-- Auto-cleanup old AI usage logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_ai_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM ai_usage_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Auto-cleanup old scraping logs (keep last 14 days)
CREATE OR REPLACE FUNCTION cleanup_old_scraping_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM scraping_logs 
    WHERE created_at < NOW() - INTERVAL '14 days';
END;
$$ LANGUAGE plpgsql;

-- 7. Monitoring views
CREATE OR REPLACE VIEW queue_stats AS
SELECT 
    type,
    status,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time_seconds
FROM job_queue 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY type, status;

CREATE OR REPLACE VIEW ai_cost_summary AS
SELECT 
    DATE(created_at) as date,
    model,
    COUNT(*) as calls,
    SUM(cost_usd) as total_cost,
    SUM(tokens_used) as total_tokens
FROM ai_usage_logs 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), model
ORDER BY date DESC;

CREATE OR REPLACE VIEW scraping_performance AS
SELECT 
    company,
    scraper_type,
    COUNT(*) as total_attempts,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_attempts,
    ROUND(AVG(CASE WHEN success THEN jobs_found ELSE 0 END), 2) as avg_jobs_found,
    ROUND(AVG(CASE WHEN success THEN duration_ms ELSE NULL END), 2) as avg_duration_ms
FROM scraping_logs 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY company, scraper_type
ORDER BY successful_attempts DESC;

-- 8. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_queue_updated_at 
    BEFORE UPDATE ON job_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
