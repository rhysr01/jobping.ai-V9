-- ============================================
-- JOBPING: Remove ALL Irrelevant Jobs from Database
-- ============================================
-- Run this in Supabase SQL Editor
-- Scans ALL 11,468 jobs in database
-- ============================================

-- Count before deletion
SELECT 'BEFORE CLEANUP' as status, COUNT(*) as total_jobs FROM jobs;

-- ============================================
-- DELETE IRRELEVANT JOBS
-- ============================================

DELETE FROM jobs
WHERE 
  -- 1. HAIRDRESSER (4 jobs)
  title ILIKE '%hairdresser%' OR
  
  -- 2. DRIVERS - Keep "test driver", "product driver" (product management)
  title ILIKE '%HGV%' OR 
  title ILIKE '%truck driver%' OR 
  title ILIKE '%delivery driver%' OR
  title ILIKE '%bus driver%' OR
  (title ILIKE '%driver%' AND title NOT ILIKE '%test driver%' AND title NOT ILIKE '%product driver%' AND title NOT ILIKE '%screw driver%') OR
  
  -- 3. HEALTHCARE (9 jobs)
  title ILIKE '%dental nurse%' OR
  title ILIKE '%doctor%' OR
  title ILIKE '%nurse%' OR
  title ILIKE '%veterinary%' OR
  title ILIKE '%WCA Doctor%' OR
  
  -- 4. TRADES - Keep mechanical/electrical engineers
  title ILIKE '%apprentice mechanic%' OR
  title ILIKE '%apprentice plumber%' OR
  title ILIKE '%plumber%' OR
  (title ILIKE '%mechanic%' AND title NOT ILIKE '%mechanical engineer%' AND title NOT ILIKE '%mechanical design%') OR
  title ILIKE '%electrician%' AND title NOT ILIKE '%electrical engineer%' OR
  
  -- 5. MANUAL LABOR (5 jobs)
  title ILIKE '%warehouse operative%' OR
  title ILIKE '%warehouse employee%' OR
  title ILIKE '%cleaner%' OR
  
  -- 6. RETAIL (4 jobs)
  title ILIKE '%cashier%' OR
  title ILIKE '%retail assistant%' OR
  
  -- 7. SPECIALIZED NON-BUSINESS (10 jobs)
  title ILIKE '%acoustic consultant%' OR
  title ILIKE '%laboratory technician%' OR
  title ILIKE '%laboratory assistant%' OR
  title ILIKE '%laboratory analyst%' OR
  
  -- 8. SENIOR/LEADERSHIP ROLES - But keep "(Senior)" in parentheses (flexible roles)
  (LOWER(title) LIKE 'senior %' OR LOWER(title) LIKE '% senior %' OR LOWER(title) LIKE '% senior') AND title NOT ILIKE '%(senior)%' OR
  title ILIKE '%sr. %' OR
  (title ILIKE '%director%' AND title NOT ILIKE '%trainee%' AND title NOT ILIKE '%junior%' AND title NOT ILIKE '%art director%') OR
  title ILIKE '%head of%' OR
  title ILIKE '%VP %' OR
  title ILIKE '%vice president%' OR
  title ILIKE '%principal %' AND title NOT ILIKE '%principal consultant%' OR
  
  -- 9. ELDERLY CARE (German "Seniorenresidenz" jobs)
  title ILIKE '%seniorenresidenz%' OR
  title ILIKE '%pflegefachkraft%' OR
  
  -- 10. IRRELEVANT FOOD SERVICE
  (title ILIKE '%kok%' AND title ILIKE '%zelfstandig%') OR  -- Dutch chef
  
  -- 11. OTHER IRRELEVANT
  title ILIKE '%veterinary surgeon%';

-- Count after deletion
SELECT 'AFTER CLEANUP' as status, COUNT(*) as total_jobs FROM jobs;

-- Show breakdown of remaining jobs by category
SELECT 
  CASE 
    WHEN title ILIKE '%analyst%' THEN 'Analyst Roles'
    WHEN title ILIKE '%engineer%' OR title ILIKE '%developer%' THEN 'Engineering/Tech'
    WHEN title ILIKE '%consultant%' THEN 'Consulting'
    WHEN title ILIKE '%graduate%' OR title ILIKE '%trainee%' THEN 'Graduate Programs'
    WHEN title ILIKE '%sales%' OR title ILIKE '%account%' THEN 'Sales/Account Management'
    WHEN title ILIKE '%marketing%' THEN 'Marketing'
    WHEN title ILIKE '%finance%' OR title ILIKE '%accountant%' THEN 'Finance/Accounting'
    WHEN title ILIKE '%product%' THEN 'Product Management'
    ELSE 'Other Business Roles'
  END as category,
  COUNT(*) as job_count
FROM jobs
GROUP BY category
ORDER BY job_count DESC;

-- Sample of remaining jobs (should all be business school relevant)
SELECT title, company, location
FROM jobs
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- EXPECTED RESULTS:
-- ============================================
-- Before: 11,468 jobs (all historical data)
-- Expected removal: ~50-100 jobs
-- All remaining jobs should be business school relevant:
--   ✅ Analyst roles (Business, Data, Finance, etc.)
--   ✅ Graduate programs/schemes
--   ✅ Junior/trainee business roles
--   ✅ Entry-level consulting, sales, marketing
--   ✅ (Senior) roles in parentheses (flexible level)
--   ✅ Junior Art Director, Mechanical Engineers, etc.
--   ❌ Senior Data Analyst, Directors, VPs removed
--   ❌ Hairdressers, Drivers, Nurses removed
--   ❌ Elderly care (Pflegefachkraft) removed
-- ============================================

