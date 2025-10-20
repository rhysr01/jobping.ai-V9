-- ULTRA-SMART BUSINESS SCHOOL FILTER
-- Multilingual + context-aware filtering

BEGIN;

-- 1. Healthcare Professionals
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Healthcare professional'
WHERE status = 'active'
AND (
  title ~* '\y(chirurgien-dentiste|dentiste|médecin|infirmier|infirmiere|sage-femme|kinésithérapeute|pédiatre)\y'
  OR title ~* '\y(nurse|doctor|physician|surgeon|therapist|paramedic|radiographer|pharmacist|dentist|psychologist|counsellor)\y'
  OR title ~* '\y(clinical fellow|junior physician|assistant physician)\y'
  OR title ~* '\y(massage therapist|spa therapist)\y'
)
AND title !~* 'healthcare consultant|healthcare analyst|medical sales|health economist|healthcare operations|clinical research coordinator|clinical trial';

-- 2. Pharmacists (Farmacista in Italian)
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Pharmacist'
WHERE status = 'active'
AND title ~* '\y(farmacista|farmaceutico)\y'
AND title !~* 'sales|consultant|analyst|marketing|informatore scientifico';

-- 3. Education/Teaching
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Education/teaching'
WHERE status = 'active'
AND title ~* '\y(teacher|professor|lecturer|tutor|instructor|teaching assistant|academic staff)\y'
AND title !~* 'corporate trainer|training consultant|education technology|education consultant';

-- 4. Retail Workers (Sales Assistant = Retail, NOT Business Sales)
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Retail worker'
WHERE status = 'active'
AND (
  title ~* '\y(sales assistant|shop assistant|store assistant|cashier|checkout|shelf stacker|stock assistant)\y'
  OR title ~* '\y(produktionshelfer|produktionsmitarbeiter)\y' -- German: Production helper
  OR title ~* 'stage sales assistant' -- Italian internship as sales assistant
)
AND title !~* 'assistant manager|sales coordinator|visual merchandiser';

-- 5. Hospitality Workers (BUT keep "Commissioning Engineer")
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Hospitality worker'
WHERE status = 'active'
AND (
  title ~* '\y(waiter|waitress|bartender|barista|housekeeper|room attendant)\y'
  OR title ~* '\y(commis de cuisine|commis de salle|commis de bar|chef de rang)\y' -- French: Waiter/Kitchen staff
  OR title ~* '\y(commis di cucina)\y' -- Italian: Kitchen staff
)
AND title !~* 'commissioning (engineer|technician|manager)'; -- Keep engineering roles!

-- 6. Kitchen Workers (excluding "Chef de Projet")
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Kitchen/culinary worker'
WHERE status = 'active'
AND title ~* '\y(kitchen trainee|kitchen assistant|kitchen porter|dishwasher|prep cook|line cook|pastry chef|sous chef)\y'
AND title !~* 'chef de projet|chef de produit|chef d''équipe';

-- 7. Manual Labor
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Manual labor'
WHERE status = 'active'
AND title ~* '\y(warehouse operative|forklift|loader|packer|driver|courier|delivery operative|assembler|cleaner|janitor|maintenance worker|security guard)\y'
AND title !~* 'warehouse manager|delivery manager|solution delivery';

-- 8. Legal Support (NOT legal ops)
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Legal support'
WHERE status = 'active'
AND title ~* '\y(paralegal|legal secretary|court clerk|notary)\y'
AND title !~* 'legal analyst|compliance|regulatory|legal operations';

-- 9. Agriculture
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Agriculture'
WHERE status = 'active'
AND title ~* '\y(farm worker|agriculture|farming|livestock|gardener|groundskeeper)\y';

-- 10. Manufacturing Line Workers
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Manufacturing line worker'
WHERE status = 'active'
AND title ~* '\y(production operative|assembly line|factory worker|machine operator)\y'
AND title !~* 'production manager|production analyst|operations';

COMMIT;

-- RESULTS
SELECT 
  filtered_reason,
  COUNT(*) as removed
FROM jobs
WHERE status = 'inactive'
AND filtered_reason IN (
  'Healthcare professional',
  'Pharmacist',
  'Education/teaching',
  'Retail worker',
  'Hospitality worker',
  'Kitchen/culinary worker',
  'Manual labor',
  'Legal support',
  'Agriculture',
  'Manufacturing line worker'
)
GROUP BY filtered_reason
ORDER BY removed DESC;

-- Total active business-appropriate jobs remaining
SELECT COUNT(*) as total_active_business_jobs
FROM jobs
WHERE status = 'active';

