-- ============================================================================
-- AGGRESSIVE NON-BUSINESS JOB REMOVAL
-- Removes ALL non-business school jobs regardless of categories
-- ============================================================================

BEGIN;

-- 1. HEALTHCARE - All roles
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Healthcare'
WHERE status = 'active'
AND (
  -- French
  title ~* '\y(chirurgien|dentiste|médecin|infirmier|sage-femme|kinésithérapeute|masseur-kinésithérapeute|pédiatre|aide médico-psychologique|assistant secteur médico-social)\y'
  -- Italian
  OR title ~* '\y(farmacista|dottore|infermiere|terapisti|terapista)\y' AND title !~* 'sales|marketing|informatore'
  -- German
  OR title ~* '\y(arzt|krankenschwester|apotheker)\y'
  -- Dutch
  OR title ~* '\y(verpleegkundige)\y'
  -- English
  OR title ~* '\y(nurse|doctor|physician|surgeon|dentist|pharmacist|therapist|psychologist|counsellor|paramedic|radiographer)\y'
  OR title ~* '\y(clinical fellow|junior physician|assistant physician|medical assistant)\y'
)
AND title !~* 'healthcare (consultant|analyst|manager|coordinator|operations)|medical (sales|device|technology)|health economist|clinical research (coordinator|manager)|clinical trial';

-- 2. RETAIL WORKERS - All sales assistants
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Retail worker'
WHERE status = 'active'
AND (
  -- English
  title ~* '\y(sales assistant|shop assistant|store assistant|cashier|checkout operator|shelf stacker|stock assistant|stock replenisher)\y'
  -- Italian
  OR title ~* '\y(commesso|commessa|addetto.*vendite|addetto vendite|magazziniere)\y' AND title !~* 'manager|coordinator'
  -- French
  OR title ~* '\y(vendeur|vendeuse)\y' AND title !~* 'conseil|manager'
  -- German
  OR title ~* '\y(verkäufer|verkaufsmitarbeiter)\y'
  -- Italian retail internships
  OR title ~* 'stage sales assistant|tirocinio.*commesso|tirocinio sales'
)
AND title !~* 'sales (development|operations|analyst|coordinator|manager|executive|representative)|inside sales|account executive|business development|visual merchandiser';

-- 3. HOSPITALITY - Waiters/Service
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Hospitality: Service staff'
WHERE status = 'active'
AND (
  -- French
  title ~* '\y(serveur|serveuse|commis de salle|commis de bar|chef de rang|officier barman)\y'
  -- Italian
  OR title ~* '\y(cameriere|camerieri|addetti ristorazione)\y'
  -- German/Dutch
  OR title ~* '\y(kellner|ober)\y'
  -- English
  OR title ~* '\y(waiter|waitress|server|bartender|barman|barista)\y'
)
AND title !~* 'commissioning'; -- Keep commissioning engineers!

-- 4. HOSPITALITY - Kitchen/Culinary
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Hospitality: Kitchen staff'
WHERE status = 'active'
AND (
  -- French
  title ~* '\y(commis de cuisine|cuisinier|chef de cuisine)\y' AND title !~* 'chef de projet'
  -- Italian
  OR title ~* '\y(commis di cucina|cuoco|aiuto cuoco|stagista aiuto cuoco)\y'
  -- German
  OR title ~* '\y(koch|köchin)\y' AND title !~* 'projekt'
  -- English
  OR title ~* '\y(cook|kitchen (trainee|assistant|porter)|dishwasher|prep cook|line cook|pastry chef|sous chef)\y'
)
AND title !~* 'chef de projet|chef de produit';

-- 5. HOSPITALITY - Housekeeping
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Hospitality: Housekeeping'
WHERE status = 'active'
AND title ~* '\y(housekeeper|housekeeping|room attendant|femme de chambre|governante|addetto.*pulizie|addetto pulizie)\y'
AND title !~* 'manager|supervisor|operations';

-- 6. HOSPITALITY - Hotel Reception
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Hospitality: Reception'
WHERE status = 'active'
AND title ~* '\y(front desk (agent|trainee)|hotel receptionist)\y';

-- 7. MANUAL LABOR - Production/Manufacturing
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Manual Labor: Production'
WHERE status = 'active'
AND (
  -- German
  title ~* '\y(produktionshelfer|produktionsmitarbeiter|helfer)\y'
  -- Italian
  OR title ~* '\y(operaio|tornitore cnc)\y'
  -- English
  OR title ~* '\y(production operative|assembly line|factory worker|machine operator|manufacturing operative)\y'
  -- French
  OR title ~* '\y(opérateur de production)\y'
)
AND title !~* 'production (manager|analyst|coordinator|planner)|manufacturing (engineer|manager)';

-- 8. MANUAL LABOR - Drivers/Delivery
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Manual Labor: Driver'
WHERE status = 'active'
AND title ~* '\y(chauffeur|autista|fahrer|lkw fahrer|c-chauffeur|driver|courier|delivery operative)\y'
AND title !~* 'delivery manager|solution delivery|service delivery';

-- 9. MANUAL LABOR - Cleaning/Maintenance
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Manual Labor: Cleaning'
WHERE status = 'active'
AND title ~* '\y(addetto.*lavaggio|addetto pulizie|cleaner|janitor|nettoyeur|maintenance worker|pulizie)\y'
AND title !~* 'maintenance engineer|maintenance planner';

-- 10. TECHNICAL WORKERS - Opticians/Technicians (non-engineering)
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Technical worker (non-business)'
WHERE status = 'active'
AND title ~* '\y(ottico|optician|optical assistant)\y';

-- 11. LEGAL SUPPORT
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Legal support'
WHERE status = 'active'
AND title ~* '\y(paralegal|legal secretary|court clerk)\y'
AND title !~* 'legal (analyst|operations|coordinator)';

-- 12. EDUCATION/TEACHING
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Education/teaching'
WHERE status = 'active'
AND title ~* '\y(teacher|professor|lecturer|tutor|instructor|enseignant|professeur|lehrer)\y'
AND title !~* 'education (tech|consultant)|corporate trainer|training consultant';

-- 13. SOCIAL WORK
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Social work'
WHERE status = 'active'
AND title ~* '\y(éducateur|moniteur éducateur|social worker|care worker|youth worker|childcare)\y'
AND title !~* 'social (impact|enterprise|innovation)';

-- 14. EMERGENCY SERVICES
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Emergency services'
WHERE status = 'active'
AND title ~* '\y(firefighter|police|pompier|vigile del fuoco)\y';

-- 15. AGRICULTURE
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Agriculture'
WHERE status = 'active'
AND title ~* '\y(farm worker|agriculture|farming|livestock|gardener|groundskeeper|agriculteur)\y';

-- 16. CREATIVE ARTS (non-corporate)
UPDATE jobs
SET status = 'inactive', filtered_reason = 'Creative arts'
WHERE status = 'active'
AND title ~* '\y(technical artist cfx|artist|musician|actor|performer)\y'
AND title !~* 'makeup artist|graphic designer|ux designer|product designer';

COMMIT;

-- ============================================================================
-- COMPREHENSIVE RESULTS
-- ============================================================================

-- Breakdown by category
SELECT 
  filtered_reason,
  COUNT(*) as jobs_removed
FROM jobs
WHERE status = 'inactive'
AND (
  filtered_reason IN (
    'Healthcare',
    'Retail worker',
    'Hospitality: Service staff',
    'Hospitality: Kitchen staff',
    'Hospitality: Housekeeping',
    'Hospitality: Reception',
    'Manual Labor: Production',
    'Manual Labor: Driver',
    'Manual Labor: Cleaning',
    'Technical worker (non-business)',
    'Legal support',
    'Education/teaching',
    'Social work',
    'Emergency services',
    'Agriculture',
    'Creative arts'
  )
)
GROUP BY filtered_reason
ORDER BY jobs_removed DESC;

-- Total removed
SELECT 
  COUNT(*) as total_non_business_removed
FROM jobs
WHERE status = 'inactive'
AND filtered_reason IN (
  'Healthcare', 'Retail worker', 'Hospitality: Service staff', 'Hospitality: Kitchen staff',
  'Hospitality: Housekeeping', 'Hospitality: Reception', 'Manual Labor: Production',
  'Manual Labor: Driver', 'Manual Labor: Cleaning', 'Technical worker (non-business)',
  'Legal support', 'Education/teaching', 'Social work', 'Emergency services',
  'Agriculture', 'Creative arts'
);

-- Active business jobs remaining
SELECT COUNT(*) as business_jobs_remaining FROM jobs WHERE status = 'active';

-- Verify quality: Sample of remaining jobs
SELECT 
  title,
  company,
  city,
  categories
FROM jobs
WHERE status = 'active'
AND title ~* 'analyst|consultant|manager|coordinator|engineer|specialist|developer|designer'
ORDER BY RANDOM()
LIMIT 30;

