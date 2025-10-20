-- Remove ALL legal/law jobs from database
-- Legal jobs are not business school-appropriate

BEGIN;

UPDATE jobs
SET status = 'inactive', filtered_reason = 'Legal/Law profession'
WHERE status = 'active'
AND (
  -- Job titles with legal keywords
  title ~* '\y(lawyer|solicitor|attorney|barrister|legal counsel|legal advisor|legal officer)\y'
  OR title ~* '\y(avocat|avvocato|anwalt|rechtsanwalt|abogado|juriste|jurist)\y'
  OR title ~* '\y(paralegal|legal secretary|legal assistant|legal trainee|legal praktikant)\y'
  
  -- Legal departments/specializations
  OR title ~* 'legal (intern|internship|trainee|junior|associate|specialist|department)'
  OR title ~* '\y(droit|diritto|recht|derecho)\y' -- Law in French/Italian/German/Spanish
  
  -- Specific legal areas
  OR title ~* 'employment law|corporate law|M&A.*law|competition law|regulatory law'
  OR title ~* 'droit (social|des affaires|public)|diritto|gesellschaftsrecht|vergaberecht'
  
  -- Law firms
  OR company ~* 'law firm|cabinet.*avocat|studio.*legale|kanzlei|despacho.*abogados|legal|rechtsanwälte'
)
-- KEEP these business-adjacent roles (NOT practicing law)
AND title !~* 'legal operations|legal tech|legal analytics|compliance analyst|regulatory compliance analyst|risk & compliance|legal risk analyst';

COMMIT;

-- Results
SELECT 
  'Legal/Law jobs removed' as summary,
  COUNT(*) as count
FROM jobs
WHERE status = 'inactive'
AND filtered_reason = 'Legal/Law profession';

SELECT 
  'Business jobs remaining' as summary,
  COUNT(*) as count
FROM jobs
WHERE status = 'active';

-- Verify: Check if any legal jobs remain
SELECT 
  title,
  company,
  city
FROM jobs
WHERE status = 'active'
AND (title ~* 'legal|law|lawyer|avocat|abogado|anwalt|juriste')
LIMIT 10;

