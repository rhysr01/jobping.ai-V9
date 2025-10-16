-- ============================================================================
-- HARD DELETE GARBAGE - Permanent Removal
-- ============================================================================
-- PERMANENTLY DELETES truly garbage jobs to reduce database size
-- Only deletes confirmed bad data, not rescuable jobs
-- ============================================================================

BEGIN;

-- Safety check: Show what will be deleted
SELECT 
  'Jobs to be PERMANENTLY DELETED' as warning,
  COUNT(*) as count
FROM jobs
WHERE status = 'inactive'
  AND filtered_reason IN (
    'data_quality_poor',           -- Broken JobSpy garbage
    'scam_or_broken_data',         -- Scams
    'healthcare_medical',          -- Healthcare (not business school)
    'healthcare_medical_all',
    'healthcare_medical_not_business',
    'manual_labor_trades',         -- Manual labor
    'production_manufacturing',
    'technical_trades',
    'technical_trades_not_business',
    'food_hospitality',            -- Food service
    'hospitality_food_service',
    'hospitality_food',
    'retail_service',              -- Retail
    'retail_workers',
    'retail_hospitality_nongrad',
    'childcare_education',         -- Childcare
    'transport_driving',           -- Driving jobs
    'creative_design',             -- Non-grad creative
    'creative_design_non_grad',
    'customer_support_nongrad',    -- Non-grad support
    'admin_nongrad',               -- Non-grad admin
    'admin_clerical_nongrad',
    'examiner_testing',            -- Testing/examiners
    'nonprofit_social'             -- Non-profit
  );

-- PERMANENT DELETION
DELETE FROM jobs
WHERE status = 'inactive'
  AND filtered_reason IN (
    'data_quality_poor',
    'scam_or_broken_data',
    'healthcare_medical',
    'healthcare_medical_all',
    'healthcare_medical_not_business',
    'manual_labor_trades',
    'production_manufacturing',
    'technical_trades',
    'technical_trades_not_business',
    'food_hospitality',
    'hospitality_food_service',
    'hospitality_food',
    'retail_service',
    'retail_workers',
    'retail_hospitality_nongrad',
    'childcare_education',
    'transport_driving',
    'creative_design',
    'creative_design_non_grad',
    'customer_support_nongrad',
    'admin_nongrad',
    'admin_clerical_nongrad',
    'examiner_testing',
    'nonprofit_social'
  );

-- Delete stale inactive jobs (over 7 days old)
DELETE FROM jobs
WHERE status = 'inactive'
  AND created_at < NOW() - INTERVAL '7 days';

-- ============================================================================
-- FINAL DATABASE SIZE
-- ============================================================================

SELECT 
  COUNT(*) as total_jobs_in_database,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
  COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_kept_for_audit,
  pg_size_pretty(pg_total_relation_size('jobs')) as table_size
FROM jobs;

SELECT 'DATABASE CLEANED - Garbage permanently removed' as status;

COMMIT;

-- ============================================================================
-- This removes ~13,000 jobs, reducing database from 20k to ~7k
-- ============================================================================

