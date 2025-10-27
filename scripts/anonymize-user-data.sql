-- Anonymize User Data Script
-- Safely removes personal information while preserving functionality

-- STEP 1: BACKUP FIRST (IMPORTANT!)
-- Run this first to create a backup
-- SELECT * FROM users INTO users_backup_$(date +%Y%m%d_%H%M%S);

-- STEP 2: ANONYMIZE PERSONAL DATA
-- Replace emails with anonymized versions
UPDATE users
SET
  email = 'user' || id || '@anonymized.local',
  full_name = 'Anonymous User ' || id,
  professional_experience = CASE
    WHEN professional_experience IS NOT NULL AND professional_experience != ''
    THEN 'Anonymized Experience'
    ELSE NULL
  END,
  languages_spoken = CASE
    WHEN languages_spoken IS NOT NULL AND array_length(languages_spoken, 1) > 0
    THEN ARRAY['Anonymized']
    ELSE NULL
  END,
  visa_status = CASE
    WHEN visa_status IS NOT NULL AND visa_status != ''
    THEN 'Anonymized'
    ELSE NULL
  END,
  cv_url = NULL, -- Remove CV links
  verification_token = NULL, -- Remove verification tokens
  updated_at = NOW()
WHERE active = true;

-- STEP 3: CLEAR SENSITIVE TRACKING DATA
-- Remove email engagement and tracking data
UPDATE users
SET
  last_email_opened = NULL,
  last_email_clicked = NULL,
  email_engagement_score = 100, -- Reset to neutral
  last_engagement_date = NULL,
  re_engagement_sent = false
WHERE active = true;

-- STEP 4: ANONYMIZE MATCH LOGS
-- Remove personal data from match logs
UPDATE match_logs
SET
  user_email = 'user' || SUBSTRING(user_email FROM 'user(\d+)@') || '@anonymized.local'
WHERE user_email LIKE 'user%@anonymized.local';

-- STEP 5: ANONYMIZE MATCHES
-- Remove personal data from matches
UPDATE matches
SET
  user_email = 'user' || SUBSTRING(user_email FROM 'user(\d+)@') || '@anonymized.local'
WHERE user_email LIKE 'user%@anonymized.local';

-- STEP 6: CLEAR API KEYS
-- Remove API keys for security
UPDATE api_keys
SET
  key_hash = NULL,
  description = 'Anonymized API Key',
  disabled = true
WHERE disabled = false;

-- STEP 7: VALIDATE RESULTS
-- Check that anonymization worked
SELECT
  'ANONYMIZATION RESULTS' as status,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE email LIKE '%@anonymized.local') as anonymized_users,
  COUNT(*) FILTER (WHERE full_name LIKE 'Anonymous User%') as anonymized_names,
  COUNT(*) FILTER (WHERE cv_url IS NULL) as cleared_cvs,
  COUNT(*) FILTER (WHERE verification_token IS NULL) as cleared_tokens
FROM users
WHERE active = true;

-- STEP 8: CHECK FOREIGN KEY INTEGRITY
-- Verify that anonymized emails match across tables
SELECT
  'CROSS-TABLE CONSISTENCY' as check,
  COUNT(DISTINCT u.email) as unique_user_emails,
  COUNT(DISTINCT m.user_email) as unique_match_emails,
  COUNT(DISTINCT ml.user_email) as unique_log_emails
FROM users u
LEFT JOIN matches m ON u.email = m.user_email
LEFT JOIN match_logs ml ON u.email = ml.user_email
WHERE u.active = true;

-- STEP 9: FINAL VERIFICATION
-- Show sample of anonymized data
SELECT
  'SAMPLE ANONYMIZED DATA' as sample,
  email,
  full_name,
  subscription_tier,
  email_count,
  onboarding_complete
FROM users
WHERE active = true
ORDER BY id
LIMIT 5;
