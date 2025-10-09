-- Remove non-business school relevant jobs
-- Focus: Keep finance, consulting, sales, marketing, operations, general business roles
-- Remove: Technical engineering, trades, specialized roles

-- DELETE jobs that are clearly NOT business school relevant

DELETE FROM jobs
WHERE 
  -- Trades & Manual Labor
  title ILIKE '%hairdresser%' OR
  title ILIKE '%HGV%' OR
  title ILIKE '%driver%' OR
  title ILIKE '%electrician%' OR
  title ILIKE '%plumber%' OR
  title ILIKE '%mechanic%' OR
  title ILIKE '%welder%' OR
  
  -- Highly Technical Engineering (not business roles)
  title ILIKE '%rust engineer%' OR
  title ILIKE '%C++ developer%' OR
  title ILIKE '%firmware%' OR
  title ILIKE '%embedded%' OR
  title ILIKE '%commissioning technician%' OR
  title ILIKE '%field engineer%' OR
  title ILIKE '%integration developer%' OR
  title ILIKE '%DevOps%' OR
  title ILIKE '%SRE %' OR
  title ILIKE '%blockchain developer%' OR
  
  -- Specialized Technical (unless Business Analyst)
  (title ILIKE '%AI engineer%' AND title NOT ILIKE '%business%') OR
  (title ILIKE '%machine learning engineer%' AND title NOT ILIKE '%business%') OR
  (title ILIKE '%data engineer%' AND title NOT ILIKE '%analyst%' AND title NOT ILIKE '%business%') OR
  
  -- Specialized Non-Business Roles
  title ILIKE '%acoustic consultant%' OR
  title ILIKE '%environmental scientist%' OR
  title ILIKE '%laboratory%' OR
  title ILIKE '%nurse%' OR
  title ILIKE '%pharmacist%' OR
  title ILIKE '%veterinary%' OR
  
  -- Senior roles (should have been filtered but double check)
  title ILIKE '%senior %' OR
  title ILIKE '%sr. %' OR
  title ILIKE '%principal %' OR
  title ILIKE '%lead %' OR
  title ILIKE '%head of%' OR
  title ILIKE '%director%' OR
  title ILIKE '%VP %' OR
  title ILIKE '%chief %' OR
  
  -- Require 5+ years experience
  (company_description ILIKE '%5+ years%' OR 
   company_description ILIKE '%5 years%' OR
   company_description ILIKE '%minimum 5 years%' OR
   company_description ILIKE '%at least 5 years%');

-- Show what we're keeping (business school relevant)
SELECT 
  'Jobs Remaining' as status,
  COUNT(*) as count,
  COUNT(DISTINCT company) as companies
FROM jobs
WHERE created_at > NOW() - INTERVAL '1 hour';

