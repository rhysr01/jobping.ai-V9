-- ============================================================================
-- BACKFILL NORMALIZATION: Raw Jobs → Clean Jobs
-- Uses deterministic functions to normalize existing data
-- ============================================================================

-- ============================================================================
-- BACKFILL EXISTING JOBS WITH NORMALIZED DATA
-- ============================================================================

-- Update existing jobs with normalized data using our functions
UPDATE jobs 
SET 
  title = normalize_title(title),
  company = normalize_company(company),
  job_url = canonicalize_url(job_url),
  work_environment = COALESCE(
    work_environment,
    infer_remote_type(title, description)
  ),
  fingerprint = job_fingerprint(
    normalize_company(company),
    normalize_title(title),
    location_name,
    canonicalize_url(job_url),
    posted_at
  ),
  updated_at = NOW()
WHERE 
  fingerprint IS NULL 
  OR title != normalize_title(title)
  OR company != normalize_company(company);

-- ============================================================================
-- POPULATE RAW_JOBS FROM EXISTING DATA
-- ============================================================================

-- Insert existing jobs into raw_jobs for historical tracking
INSERT INTO raw_jobs (source, external_id, raw_data, processing_status, fetched_at, processed_at)
SELECT 
  COALESCE(source, 'legacy_import') as source,
  id::text as external_id,
  jsonb_build_object(
    'original_title', title,
    'original_company', company,
    'original_location', location_name,
    'original_url', job_url,
    'original_description', description,
    'posted_at', posted_at,
    'created_at', created_at,
    'imported_from', 'existing_jobs_table'
  ) as raw_data,
  'processed' as processing_status,
  COALESCE(created_at, NOW()) as fetched_at,
  NOW() as processed_at
FROM jobs 
WHERE NOT EXISTS (
  SELECT 1 FROM raw_jobs 
  WHERE external_id = jobs.id::text 
  AND source = COALESCE(jobs.source, 'legacy_import')
);

-- ============================================================================
-- CREATE SAMPLE RAW JOBS FOR TESTING
-- ============================================================================

-- Insert some test raw jobs to demonstrate the pipeline
INSERT INTO raw_jobs (source, external_id, raw_data, processing_status)
VALUES 
  (
    'test_scraper',
    'test_job_001',
    '{
      "title": "  Software Engineer  ",
      "company": "  ACME Corp. Ltd.  ",
      "location": "Amsterdam, Netherlands",
      "url": "https://example.com/job?utm_source=google&ref=test",
      "description": "Great opportunity for early career developers",
      "posted_at": "2024-01-15T10:00:00Z",
      "salary": "€50,000 - €70,000",
      "requirements": ["JavaScript", "React", "Node.js"]
    }'::jsonb,
    'pending'
  ),
  (
    'test_scraper',
    'test_job_002',
    '{
      "title": "Remote Product Manager",
      "company": "Tech Startup Inc.",
      "location": "Berlin, Germany",
      "url": "https://startup.com/jobs/pm-role",
      "description": "Lead product development for our B2B platform. Work from home friendly.",
      "posted_at": "2024-01-16T14:30:00Z",
      "employment_type": "full-time",
      "remote_work": "hybrid"
    }'::jsonb,
    'pending'
  ),
  (
    'test_scraper',
    'test_job_003',
    '{
      "title": "Marketing Intern",
      "company": "Marketing Agency B.V.",
      "location": "Rotterdam, Netherlands",
      "url": "https://agency.com/careers/internship",
      "description": "Support our marketing team with social media and content creation",
      "posted_at": "2024-01-17T09:15:00Z",
      "employment_type": "internship",
      "duration": "6 months"
    }'::jsonb,
    'pending'
  );

-- ============================================================================
-- PROCESS PENDING RAW JOBS INTO CLEAN JOBS
-- ============================================================================

-- Process pending raw jobs using our normalization functions
INSERT INTO jobs (
  title,
  company,
  location_name,
  job_url,
  description,
  posted_at,
  source,
  job_hash,
  fingerprint,
  work_environment,
  status,
  work_location,
  is_active,
  created_at,
  updated_at
)
SELECT 
  normalize_title((raw_data->>'title')::text) as title,
  normalize_company((raw_data->>'company')::text) as company,
  (raw_data->>'location')::text as location_name,
  canonicalize_url((raw_data->>'url')::text) as job_url,
  summarize_job((raw_data->>'description')::text) as description,
  COALESCE(
    (raw_data->>'posted_at')::timestamptz,
    NOW()
  ) as posted_at,
  source,
  encode(digest(
    COALESCE(normalize_company((raw_data->>'company')::text), '') || '|' ||
    COALESCE(normalize_title((raw_data->>'title')::text), '') || '|' ||
    COALESCE((raw_data->>'location')::text, '') || '|' ||
    COALESCE((raw_data->>'posted_at')::text, ''),
    'sha256'
  ), 'hex') as job_hash,
  job_fingerprint(
    normalize_company((raw_data->>'company')::text),
    normalize_title((raw_data->>'title')::text),
    (raw_data->>'location')::text,
    canonicalize_url((raw_data->>'url')::text),
    COALESCE((raw_data->>'posted_at')::timestamptz, NOW())
  ) as fingerprint,
  COALESCE(
    (raw_data->>'remote_work')::text,
    infer_remote_type(
      (raw_data->>'title')::text,
      (raw_data->>'description')::text
    )
  ) as work_environment,
  'active' as status,
  COALESCE((raw_data->>'location')::text, 'Unknown') as work_location,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM raw_jobs 
WHERE processing_status = 'pending'
AND NOT EXISTS (
  SELECT 1 FROM jobs 
  WHERE fingerprint = job_fingerprint(
    normalize_company((raw_jobs.raw_data->>'company')::text),
    normalize_title((raw_jobs.raw_data->>'title')::text),
    (raw_jobs.raw_data->>'location')::text,
    canonicalize_url((raw_jobs.raw_data->>'url')::text),
    COALESCE((raw_jobs.raw_data->>'posted_at')::timestamptz, NOW())
  )
);

-- Update raw_jobs status to processed
UPDATE raw_jobs 
SET 
  processing_status = 'processed',
  processed_at = NOW(),
  updated_at = NOW()
WHERE processing_status = 'pending'
AND EXISTS (
  SELECT 1 FROM jobs 
  WHERE fingerprint = job_fingerprint(
    normalize_company((raw_jobs.raw_data->>'company')::text),
    normalize_title((raw_jobs.raw_data->>'title')::text),
    (raw_jobs.raw_data->>'location')::text,
    canonicalize_url((raw_jobs.raw_data->>'url')::text),
    COALESCE((raw_jobs.raw_data->>'posted_at')::timestamptz, NOW())
  )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check backfill results
SELECT 
  'BACKFILL RESULTS' as status,
  COUNT(*) as total_jobs,
  COUNT(DISTINCT fingerprint) as unique_fingerprints,
  COUNT(*) - COUNT(DISTINCT fingerprint) as potential_duplicates
FROM jobs;

-- Check raw jobs processing
SELECT 
  'RAW JOBS STATUS' as status,
  processing_status,
  COUNT(*) as count
FROM raw_jobs 
GROUP BY processing_status;

-- Sample normalized data
SELECT 
  'SAMPLE NORMALIZED DATA' as info,
  title,
  company,
  work_environment,
  fingerprint
FROM jobs 
WHERE source = 'test_scraper'
ORDER BY created_at DESC
LIMIT 5;

-- Check for any processing errors
SELECT 
  'PROCESSING ERRORS' as status,
  COUNT(*) as failed_jobs
FROM raw_jobs 
WHERE processing_status = 'failed';

-- Final status
SELECT 
  '🎉 BACKFILL COMPLETE' as result,
  CASE 
    WHEN (SELECT COUNT(*) FROM jobs WHERE fingerprint IS NOT NULL) > 0
    AND (SELECT COUNT(*) FROM raw_jobs WHERE processing_status = 'processed') > 0
    THEN '✅ SUCCESS: Normalization pipeline working correctly'
    ELSE '❌ ISSUES: Check errors above'
  END as final_status;
