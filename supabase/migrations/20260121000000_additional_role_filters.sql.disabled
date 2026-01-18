-- ============================================================================
-- ADDITIONAL ROLE FILTERS FOR BUSINESS GRADUATES
-- Comprehensive filtering of additional irrelevant job categories
-- Date: January 21, 2026
-- ============================================================================
-- This migration filters additional job categories that are not suitable
-- for business school graduates and international students
-- Estimated impact: 200-500 additional jobs filtered
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FILTER GOVERNMENT AND POLITICAL ROLES
-- ============================================================================

UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'government_political_role',
  updated_at = NOW()
WHERE is_active = true
  AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%government_political_role%')
  AND (
    LOWER(title) LIKE '%politician%' OR
    LOWER(title) LIKE '%government%' OR
    LOWER(title) LIKE '%minister%' OR
    LOWER(title) LIKE '%ambassador%' OR
    LOWER(title) LIKE '%diplomat%' OR
    LOWER(title) LIKE '%parliament%' OR
    LOWER(title) LIKE '%council%' OR
    LOWER(title) LIKE '%civil servant%' OR
    LOWER(title) LIKE '%public sector%' OR
    LOWER(title) LIKE '%policy%' OR
    LOWER(title) LIKE '%legislation%' OR
    LOWER(description) LIKE '%government%' OR
    LOWER(description) LIKE '%public administration%'
  );

-- ============================================================================
-- 2. FILTER MILITARY AND DEFENSE ROLES
-- ============================================================================

UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'military_defense_role',
  updated_at = NOW()
WHERE is_active = true
  AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%military_defense_role%')
  AND (
    LOWER(title) LIKE '%military%' OR
    LOWER(title) LIKE '%armed forces%' OR
    LOWER(title) LIKE '%navy%' OR
    LOWER(title) LIKE '%army%' OR
    LOWER(title) LIKE '%air force%' OR
    LOWER(title) LIKE '%defense%' OR
    LOWER(title) LIKE '%security guard%' OR
    LOWER(title) LIKE '%security officer%' OR
    LOWER(description) LIKE '%military%' OR
    LOWER(description) LIKE '%defense contractor%'
  );

-- ============================================================================
-- 3. FILTER ENTERTAINMENT AND SPORTS ROLES
-- ============================================================================

UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'entertainment_sports_role',
  updated_at = NOW()
WHERE is_active = true
  AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%entertainment_sports_role%')
  AND (
    LOWER(title) LIKE '%athlete%' OR
    LOWER(title) LIKE '%actor%' OR
    LOWER(title) LIKE '%actress%' OR
    LOWER(title) LIKE '%musician%' OR
    LOWER(title) LIKE '%singer%' OR
    LOWER(title) LIKE '%performer%' OR
    LOWER(title) LIKE '%entertainment%' OR
    LOWER(title) LIKE '%fitness trainer%' OR
    LOWER(title) LIKE '%gym instructor%' OR
    LOWER(title) LIKE '%personal trainer%' OR
    LOWER(description) LIKE '%sports%' OR
    LOWER(description) LIKE '%entertainment industry%'
  );

-- ============================================================================
-- 4. FILTER HOSPITALITY AND SERVICE INDUSTRY ROLES
-- ============================================================================

UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'hospitality_service_role',
  updated_at = NOW()
WHERE is_active = true
  AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%hospitality_service_role%')
  AND (
    LOWER(title) LIKE '%waiter%' OR
    LOWER(title) LIKE '%waitress%' OR
    LOWER(title) LIKE '%bartender%' OR
    LOWER(title) LIKE '%barista%' OR
    LOWER(title) LIKE '%hotel%' OR
    LOWER(title) LIKE '%receptionist%' OR
    LOWER(title) LIKE '%housekeeper%' OR
    LOWER(title) LIKE '%tour guide%' OR
    LOWER(title) LIKE '%tourism%' OR
    LOWER(title) LIKE '%restaurant%' OR
    LOWER(description) LIKE '%hospitality%' OR
    LOWER(description) LIKE '%food service%'
  );

-- ============================================================================
-- 5. FILTER RETAIL AND SALES ASSISTANT ROLES
-- ============================================================================

UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'retail_sales_role',
  updated_at = NOW()
WHERE is_active = true
  AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%retail_sales_role%')
  AND (
    LOWER(title) LIKE '%cashier%' OR
    LOWER(title) LIKE '%sales assistant%' OR
    LOWER(title) LIKE '%shop assistant%' OR
    LOWER(title) LIKE '%retail assistant%' OR
    LOWER(title) LIKE '%store assistant%' OR
    LOWER(title) LIKE '%checkout%' OR
    LOWER(description) LIKE '%retail%' OR
    LOWER(description) LIKE '%fast food%' OR
    LOWER(description) LIKE '%supermarket%'
  );

-- ============================================================================
-- 6. FILTER MANUAL LABOR AND TECHNICAL TRADES (NON-IT)
-- ============================================================================

UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'manual_labor_trade_role',
  updated_at = NOW()
WHERE is_active = true
  AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%manual_labor_trade_role%')
  AND (
    LOWER(title) LIKE '%mechanic%' OR
    LOWER(title) LIKE '%electrician%' OR
    LOWER(title) LIKE '%plumber%' OR
    LOWER(title) LIKE '%carpenter%' OR
    LOWER(title) LIKE '%welder%' OR
    LOWER(title) LIKE '%painter%' OR
    LOWER(title) LIKE '%driver%' OR
    LOWER(title) LIKE '%delivery driver%' OR
    LOWER(title) LIKE '%taxi driver%' OR
    LOWER(title) LIKE '%truck driver%' OR
    LOWER(description) LIKE '%manual labor%' OR
    LOWER(description) LIKE '%trade work%'
  )
  -- Keep IT-related technical roles
  AND NOT (
    LOWER(title) LIKE '%it%' OR
    LOWER(title) LIKE '%software%' OR
    LOWER(title) LIKE '%developer%' OR
    LOWER(title) LIKE '%engineer%' OR
    LOWER(description) LIKE '%technology%' OR
    LOWER(description) LIKE '%computer%'
  );

-- ============================================================================
-- 7. FILTER REAL ESTATE AND INSURANCE SALES ROLES
-- ============================================================================

UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'real_estate_insurance_role',
  updated_at = NOW()
WHERE is_active = true
  AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%real_estate_insurance_role%')
  AND (
    LOWER(title) LIKE '%real estate agent%' OR
    LOWER(title) LIKE '%property agent%' OR
    LOWER(title) LIKE '%insurance agent%' OR
    LOWER(title) LIKE '%insurance broker%' OR
    LOWER(title) LIKE '%loan officer%' OR
    LOWER(title) LIKE '%mortgage%' OR
    LOWER(title) LIKE '%financial advisor%' OR
    LOWER(description) LIKE '%real estate%' OR
    LOWER(description) LIKE '%insurance sales%'
  );

-- ============================================================================
-- 8. FILTER CALL CENTER AND TELEMARKETING ROLES
-- ============================================================================

UPDATE jobs
SET
  is_active = false,
  status = 'inactive',
  filtered_reason = COALESCE(filtered_reason || '; ', '') || 'call_center_telemarketing_role',
  updated_at = NOW()
WHERE is_active = true
  AND (filtered_reason IS NULL OR filtered_reason NOT LIKE '%call_center_telemarketing_role%')
  AND (
    LOWER(title) LIKE '%telemarketer%' OR
    LOWER(title) LIKE '%telemarketing%' OR
    LOWER(title) LIKE '%call center%' OR
    LOWER(title) LIKE '%call centre%' OR
    LOWER(title) LIKE '%customer service rep%' OR
    LOWER(title) LIKE '%phone operator%' OR
    LOWER(title) LIKE '%door to door%' OR
    LOWER(description) LIKE '%cold calling%' OR
    LOWER(description) LIKE '%telemarketing%'
  );

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check how many additional jobs were filtered:
-- SELECT
--     filtered_reason,
--     COUNT(*) as job_count
-- FROM jobs
-- WHERE filtered_reason LIKE '%government_political_role%'
--    OR filtered_reason LIKE '%military_defense_role%'
--    OR filtered_reason LIKE '%entertainment_sports_role%'
--    OR filtered_reason LIKE '%hospitality_service_role%'
--    OR filtered_reason LIKE '%retail_sales_role%'
--    OR filtered_reason LIKE '%manual_labor_trade_role%'
--    OR filtered_reason LIKE '%real_estate_insurance_role%'
--    OR filtered_reason LIKE '%call_center_telemarketing_role%'
-- GROUP BY filtered_reason
-- ORDER BY job_count DESC;

-- Check remaining active jobs:
-- SELECT COUNT(*) as active_jobs FROM jobs WHERE is_active = true;