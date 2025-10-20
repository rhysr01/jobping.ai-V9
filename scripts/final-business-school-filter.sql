-- FINAL BUSINESS SCHOOL FILTER
-- Remove all non-business school appropriate jobs
-- Intelligent multilingual pattern matching

BEGIN;

-- 1. Healthcare Professionals (NOT business roles)
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Healthcare professional (non-business)'
WHERE status = 'active'
AND title ~* '\y(nurse|doctor|physician|surgeon|therapist|paramedic|radiographer|pharmacist|dentist|psychologist|counsellor|medical assistant|clinical nurse|hospital worker|infermiere|infirmier|cadre de santé|agent technique hospitalier)\y'
AND title !~* 'healthcare consultant|healthcare analyst|healthcare manager|healthcare coordinator|healthcare operations|medical sales|health economist';

-- 2. Education/Teaching (NOT corporate training)
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Education/teaching (non-business)'
WHERE status = 'active'
AND title ~* '\y(teacher|professor|lecturer|tutor|instructor|teaching assistant|education officer|academic staff)\y'
AND title !~* 'corporate trainer|training consultant|learning & development|education technology|education consultant|education analyst';

-- 3. Legal Support (NOT legal ops/compliance)
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Legal support (non-business)'
WHERE status = 'active'
AND title ~* '\y(paralegal|legal secretary|court clerk|notary)\y'
AND title !~* 'legal analyst|compliance|regulatory|legal operations|legal tech';

-- 4. Manual Labor
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Manual labor (non-business)'
WHERE status = 'active'
AND title ~* '\y(warehouse operative|forklift|loader|packer|assembler|maintenance worker|cleaner|janitor|security guard|van driver|courier|delivery driver|delivery operative)\y';

-- 5. Retail Workers (NOT retail management)
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Retail worker (non-business)'
WHERE status = 'active'
AND title ~* '\y(cashier|sales assistant|shop assistant|store assistant|checkout|shelf stacker|stock assistant|merchandiser assistant)\y'
AND title !~* 'visual merchandiser|merchandising manager|retail analyst|retail coordinator';

-- 6. Hospitality Workers (NOT hospitality management)
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Hospitality worker (non-business)'
WHERE status = 'active'
AND title ~* '\y(waiter|waitress|bartender|barista|chef de rang|housekeeper|room attendant|receptionist|concierge)\y'
AND title !~* 'hospitality manager|hospitality coordinator|hospitality consultant|hospitality analyst|hospitality engineer';

-- 7. Kitchen Workers (excluding "Chef de Projet" which is Project Manager in French)
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Kitchen/culinary worker (non-business)'
WHERE status = 'active'
AND (
  title ~* '\y(kitchen trainee|kitchen assistant|kitchen porter|dishwasher|prep cook|line cook|commis chef|sous chef|pastry chef)\y'
  OR (title ~* '\y(chef|cook)\y' AND (company ~* 'restaurant|catering|marriott.*hotel|hilton' OR title ~* 'kitchen|culinary|cuisine'))
)
AND title !~* 'chef de projet|chef de produit|chef d''équipe|chef des ventes|responsable';

-- 8. Remove jobs from clearly non-business companies
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Non-business company'
WHERE status = 'active'
AND company ~* '\y(hospital|nhs trust|healthcare foundation|school|university|restaurant|hotel kitchen|nursing home|care home)\y'
AND company !~* 'hospital consultant|hospital management|education technology|restaurant group|hotel group|healthcare consulting';

COMMIT;

-- Verification Query
SELECT 
  'Jobs removed' as summary,
  filtered_reason,
  COUNT(*) as count
FROM jobs
WHERE status = 'inactive'
AND filtered_reason LIKE '%(non-business)%'
GROUP BY filtered_reason
ORDER BY count DESC;

-- Check remaining active jobs for any issues
SELECT 
  COUNT(*) as total_active_jobs
FROM jobs
WHERE status = 'active';

