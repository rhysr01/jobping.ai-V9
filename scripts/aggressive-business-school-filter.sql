-- ============================================================================
-- AGGRESSIVE BUSINESS SCHOOL FILTER
-- ============================================================================
-- Removes ALL non-business school roles while keeping legitimate ones
-- ============================================================================

BEGIN;

-- ============================================================================
-- REMOVE: Healthcare & Medical (including apprenticeships)
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'healthcare_medical', updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(pflege|kinderkrankenpflege|nurse|nursing|medecin|arzt|doctor|basisarts|medical|healthcare|therapist|paramedic)';

-- ============================================================================
-- REMOVE: Law/Legal (ALL instances)
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'law_legal', updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(legal|lawyer|solicitor|attorney|avocat|rechtsanwalt|jurist|paralegal|law clerk|urheberrecht)';

-- ============================================================================
-- REMOVE: Teaching/Education
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'teaching_education', updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(teacher|tutor|professor|lecturer|teaching|education coordinator)';

-- ============================================================================
-- REMOVE: Transport/Driving
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'transport_driving', updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(chauffeur|driver|courier|delivery(?! ))'
  AND LOWER(title) !~ '(business|sales|commercial)';

-- ============================================================================
-- REMOVE: Hospitality & Food Service
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'hospitality_food', updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(f&b|food & beverage|bar|reception|sidekick|hospitality|chargé d.accueil|receptionist)'
  AND LOWER(title) !~ '(business|finance|operations)';

-- ============================================================================
-- REMOVE: Production/Manufacturing Workers
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'production_manufacturing', updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(operaio|production worker|assembly|manufacturing worker|warehouse worker)';

-- ============================================================================
-- REMOVE: Technical Trades & Facilities
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'technical_trades', updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(electrician|electromonteur|mechanic|plumber|technician|fachkraft für)';

-- ============================================================================
-- REMOVE: Pure Science/Research (Not Data Science)
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'science_research', updated_at = now()
WHERE status = 'active'
  AND LOWER(title) ~ '(scientist|biologist|chemist|physicist|laboratory|phd position)'
  AND LOWER(title) !~ '(data|business|analyst)';

-- ============================================================================
-- REMOVE: Creative/Design (Non-Product/Business)
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'creative_design', updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false  
  AND LOWER(title) ~ '(graphic designer|grafikdesign|ux designer|ui designer|illustrator|photographer)'
  AND LOWER(title) !~ '(product|business|digital strategy)';

-- ============================================================================
-- REMOVE: Customer Support/Service (Non-Graduate)
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'customer_support_nongrad', updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND LOWER(title) ~ '(customer support|customer service|support specialist)'
  AND LOWER(title) !~ '(manager|analyst|business)';

-- ============================================================================
-- REMOVE: Generic Admin (Non-Graduate)
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'admin_nongrad', updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND LOWER(title) ~ '(admin assistant|administrative assistant|office assistant|secretary|segreteria)'
  AND LOWER(title) !~ '(business|executive|pa to)';

-- ============================================================================
-- REMOVE: Retail/Store Workers
-- ============================================================================

UPDATE jobs
SET status = 'inactive', filtered_reason = 'retail_workers', updated_at = now()
WHERE status = 'active'
  AND is_graduate = false
  AND is_internship = false
  AND LOWER(title) ~ '(filialleiter|store|retail|shop|versmedewerker|supermarket)';

-- ============================================================================
-- FINAL STATS
-- ============================================================================

SELECT 'AGGRESSIVE BUSINESS SCHOOL FILTER COMPLETE' as status;

SELECT
  COUNT(*) as total_active,
  COUNT(CASE WHEN is_graduate = true OR is_internship = true THEN 1 END) as flagged,
  ROUND(100.0 * COUNT(CASE WHEN is_graduate = true OR is_internship = true THEN 1 END) / COUNT(*), 1) || '%' as pct_flagged,
  COUNT(CASE WHEN LOWER(title) ~ '(finance|consult|marketing|analyst|operations|product|sales|commercial|hr|software|developer|engineer|strategy|data|investment|bank|risk|audit)' THEN 1 END) as business_keywords
FROM jobs
WHERE status = 'active';

COMMIT;

