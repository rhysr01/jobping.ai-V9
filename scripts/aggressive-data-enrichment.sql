-- ============================================================================
-- AGGRESSIVE DATA ENRICHMENT - Maximum Metadata Extraction
-- ============================================================================
-- Extracts and fills EVERY possible field from title/description/company
-- Goal: 95%+ completeness on all matching-critical fields
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: EXTRACT & NORMALIZE LOCATION DATA
-- ============================================================================

-- Extract city from location if not already normalized
UPDATE jobs
SET city = CASE
  WHEN location ~ '^London' THEN 'London'
  WHEN location ~ '^Paris' THEN 'Paris'
  WHEN location ~ '^Mila(n|no)' THEN 'Milan'
  WHEN location ~ '^Berlin' THEN 'Berlin'
  WHEN location ~ '^Madrid' THEN 'Madrid'
  WHEN location ~ '^Amsterdam' THEN 'Amsterdam'
  WHEN location ~ '^M(u|ü)nchen' OR location ~ '^Munich' THEN 'Munich'
  WHEN location ~ '^Hamburg' THEN 'Hamburg'
  WHEN location ~ '^Z(u|ü)rich' THEN 'Zurich'
  WHEN location ~ '^Rom(a|e)' THEN 'Rome'
  WHEN location ~ '^Dublin' THEN 'Dublin'
  WHEN location ~ '^Bru(xelles|ssels)' THEN 'Brussels'
  ELSE SPLIT_PART(location, ',', 1)
END
WHERE status = 'active' AND city IS NULL;

-- Extract country from location
UPDATE jobs
SET country = CASE
  WHEN location ~ 'GB|UK|England|United Kingdom' THEN 'GB'
  WHEN location ~ 'FR|France' THEN 'FR'
  WHEN location ~ 'IT|Italy' THEN 'IT'
  WHEN location ~ 'DE|Germany|Deutschland' THEN 'DE'
  WHEN location ~ 'ES|Spain|España' THEN 'ES'
  WHEN location ~ 'NL|Netherlands|Nederland' THEN 'NL'
  WHEN location ~ 'CH|Switzerland|Schweiz' THEN 'CH'
  WHEN location ~ 'IE|Ireland' THEN 'IE'
  WHEN location ~ 'BE|Belgium|België' THEN 'BE'
  ELSE SPLIT_PART(location, ',', -1)
END
WHERE status = 'active' AND country IS NULL;

-- ============================================================================
-- PART 2: EXTRACT CAREER LEVEL & SENIORITY FROM TITLE
-- ============================================================================

-- Mark as internship if title says so (case-insensitive)
UPDATE jobs
SET is_internship = true
WHERE status = 'active'
  AND is_internship = false
  AND LOWER(title) ~ '(intern|internship|stage(?! )|stagiaire|praktikum|praktikant|prácticas|becario|tirocinio|stagista)';

-- Mark as graduate if title indicates graduate program
UPDATE jobs
SET is_graduate = true
WHERE status = 'active'
  AND is_graduate = false
  AND LOWER(title) ~ '(graduate|grad |trainee|junior|entry level|entry-level|absolvent|recién graduado|neolaureato|laureato|jeune diplômé|débutant|nachwuchskraft|berufseinsteiger|afgestudeerd|starter)';

-- Mark roles from year-specific programs (2025, 2026)
UPDATE jobs
SET is_graduate = true
WHERE status = 'active'
  AND is_graduate = false
  AND title ~ '202[56]';

-- Mark alternance/dual study programs
UPDATE jobs
SET is_graduate = true
WHERE status = 'active'
  AND is_graduate = false
  AND LOWER(title) ~ '(alternance|duales studium|dual study|vie |apprentice|rotational)';

-- ============================================================================
-- PART 3: EXTRACT LANGUAGE REQUIREMENTS FROM TITLE/DESCRIPTION
-- ============================================================================

-- Extract English requirement
UPDATE jobs
SET language_requirements = array_append(
    COALESCE(language_requirements, '{}'),
    'English'
  )
WHERE status = 'active'
  AND NOT ('English' = ANY(COALESCE(language_requirements, '{}')))
  AND (
    LOWER(description) ~ '(english.?(fluent|required|essential|native|proficient))'
    OR LOWER(title) ~ '(english.?speaking|english.?fluent)'
    OR country IN ('GB', 'IE')  -- UK/Ireland always need English
  );

-- Extract Spanish requirement
UPDATE jobs
SET language_requirements = array_append(
    COALESCE(language_requirements, '{}'),
    'Spanish'
  )
WHERE status = 'active'
  AND NOT ('Spanish' = ANY(COALESCE(language_requirements, '{}')))
  AND (
    LOWER(description) ~ '(spanish.?(fluent|required|essential|native|proficient))'
    OR LOWER(title) ~ '(spanish.?speaking|spanish.?fluent)'
    OR country = 'ES'  -- Spain always needs Spanish
  );

-- Extract French requirement
UPDATE jobs
SET language_requirements = array_append(
    COALESCE(language_requirements, '{}'),
    'French'
  )
WHERE status = 'active'
  AND NOT ('French' = ANY(COALESCE(language_requirements, '{}')))
  AND (
    LOWER(description) ~ '(french.?(fluent|required|essential|native|proficient|speaking))'
    OR LOWER(title) ~ '(french.?speaking|french.?fluent)'
    OR country = 'FR'  -- France always needs French
  );

-- Extract German requirement
UPDATE jobs
SET language_requirements = array_append(
    COALESCE(language_requirements, '{}'),
    'German'
  )
WHERE status = 'active'
  AND NOT ('German' = ANY(COALESCE(language_requirements, '{}')))
  AND (
    LOWER(description) ~ '(german.?(fluent|required|essential|native|proficient|speaking))'
    OR LOWER(title) ~ '(german.?speaking|german.?fluent|m/w/d|w/m/d)'
    OR country = 'DE'  -- Germany always needs German
    OR country = 'CH'  -- Switzerland often needs German
  );

-- Extract Italian requirement
UPDATE jobs
SET language_requirements = array_append(
    COALESCE(language_requirements, '{}'),
    'Italian'
  )
WHERE status = 'active'
  AND NOT ('Italian' = ANY(COALESCE(language_requirements, '{}')))
  AND (
    LOWER(description) ~ '(italian.?(fluent|required|essential|native|proficient))'
    OR LOWER(title) ~ '(italian.?speaking|italian.?fluent)'
    OR country = 'IT'  -- Italy always needs Italian
  );

-- Extract Dutch requirement
UPDATE jobs
SET language_requirements = array_append(
    COALESCE(language_requirements, '{}'),
    'Dutch'
  )
WHERE status = 'active'
  AND NOT ('Dutch' = ANY(COALESCE(language_requirements, '{}')))
  AND (
    LOWER(description) ~ '(dutch.?(fluent|required|essential|native|proficient))'
    OR LOWER(title) ~ '(dutch.?speaking|dutch.?fluent)'
    OR country = 'NL'  -- Netherlands always needs Dutch
    OR country = 'BE'  -- Belgium often needs Dutch
  );

-- ============================================================================
-- PART 4: EXTRACT WORK ENVIRONMENT FROM TITLE/DESCRIPTION
-- ============================================================================

-- Mark as remote
UPDATE jobs
SET work_environment = 'remote'
WHERE status = 'active'
  AND work_environment IS NULL
  AND LOWER(title || ' ' || COALESCE(description, '')) ~ '(remote|work from home|wfh|fully remote|100%% remote)';

-- Mark as hybrid
UPDATE jobs
SET work_environment = 'hybrid'
WHERE status = 'active'
  AND work_environment IS NULL
  AND LOWER(title || ' ' || COALESCE(description, '')) ~ '(hybrid|flexible work|part remote|teilweise remote)';

-- Default to on-site for jobs with city location
UPDATE jobs
SET work_environment = 'on-site'
WHERE status = 'active'
  AND work_environment IS NULL
  AND location IN ('London, GB', 'Paris, FR', 'Milan, IT', 'Berlin, DE', 'Madrid, ES', 
                   'Amsterdam, NL', 'Munich, DE', 'Hamburg, DE', 'Zurich, CH', 
                   'Rome, IT', 'Dublin, IE', 'Brussels, BE');

-- ============================================================================
-- PART 5: EXTRACT SALARY INFORMATION FROM TITLE/DESCRIPTION
-- ============================================================================

-- Extract salary from title or description (£, €, $)
UPDATE jobs
SET salary_info = CASE
  WHEN title ~ '£[0-9,]+' THEN substring(title from '£[0-9,]+[kK]?')
  WHEN title ~ '€[0-9,]+' THEN substring(title from '€[0-9,]+[kK]?')
  WHEN title ~ '\$[0-9,]+' THEN substring(title from '\$[0-9,]+[kK]?')
  WHEN description ~ '£[0-9,]+ ?- ?£[0-9,]+' THEN substring(description from '£[0-9,]+ ?- ?£[0-9,]+')
  WHEN description ~ '€[0-9,]+ ?- ?€[0-9,]+' THEN substring(description from '€[0-9,]+ ?- ?€[0-9,]+')
  ELSE NULL
END
WHERE status = 'active'
  AND salary_info IS NULL
  AND (title || ' ' || COALESCE(description, '')) ~ '(£|€|\$)[0-9,]+';

-- ============================================================================
-- PART 6: ADD INDUSTRY TAGS FROM COMPANY NAMES
-- ============================================================================

-- Tag financial services companies
UPDATE jobs
SET ai_labels = array_append(
    COALESCE(ai_labels, '{}'),
    'financial-services'
  )
WHERE status = 'active'
  AND NOT ('financial-services' = ANY(COALESCE(ai_labels, '{}')))
  AND company ~ '(Bank|Goldman|Morgan|Citi|Barclays|UBS|Deutsche Bank|BNP|HSBC|Credit|JPMorgan|Wells Fargo)';

-- Tag consulting firms
UPDATE jobs
SET ai_labels = array_append(
    COALESCE(ai_labels, '{}'),
    'consulting-firm'
  )
WHERE status = 'active'
  AND NOT ('consulting-firm' = ANY(COALESCE(ai_labels, '{}')))
  AND company ~ '(McKinsey|BCG|Bain|Deloitte|PwC|EY|KPMG|Accenture|Oliver Wyman|Roland Berger|Alvarez)';

-- Tag tech companies
UPDATE jobs
SET ai_labels = array_append(
    COALESCE(ai_labels, '{}'),
    'tech-company'
  )
WHERE status = 'active'
  AND NOT ('tech-company' = ANY(COALESCE(ai_labels, '{}')))
  AND company ~ '(Amazon|Google|Microsoft|Apple|Meta|Facebook|Netflix|Uber|Airbnb|Tesla|Salesforce|Oracle|SAP|IBM)';

-- Tag Big 4
UPDATE jobs
SET ai_labels = array_append(
    COALESCE(ai_labels, '{}'),
    'big-4'
  )
WHERE status = 'active'
  AND NOT ('big-4' = ANY(COALESCE(ai_labels, '{}')))
  AND company IN ('Deloitte', 'PwC', 'EY', 'KPMG');

-- Tag investment banks
UPDATE jobs
SET ai_labels = array_append(
    COALESCE(ai_labels, '{}'),
    'investment-bank'
  )
WHERE status = 'active'
  AND NOT ('investment-bank' = ANY(COALESCE(ai_labels, '{}')))
  AND company ~ '(Goldman Sachs|Morgan Stanley|JP Morgan|Citi|Barclays Investment|UBS Investment|Deutsche Bank|Credit Suisse|Bank of America|Merrill Lynch)';

-- ============================================================================
-- PART 7: ADD PROGRAM TYPE LABELS
-- ============================================================================

-- Tag summer programs
UPDATE jobs
SET ai_labels = array_append(COALESCE(ai_labels, '{}'), 'summer-program')
WHERE status = 'active'
  AND NOT ('summer-program' = ANY(COALESCE(ai_labels, '{}')))
  AND LOWER(title) ~ '(summer|spring|winter) (program|programme|internship|analyst)';

-- Tag rotational programs
UPDATE jobs
SET ai_labels = array_append(COALESCE(ai_labels, '{}'), 'rotational-program')
WHERE status = 'active'
  AND NOT ('rotational-program' = ANY(COALESCE(ai_labels, '{}')))
  AND LOWER(title) ~ '(rotational|rotation|management trainee)';

-- Tag work-study programs
UPDATE jobs
SET ai_labels = array_append(COALESCE(ai_labels, '{}'), 'work-study')
WHERE status = 'active'
  AND NOT ('work-study' = ANY(COALESCE(ai_labels, '{}')))
  AND LOWER(title) ~ '(alternance|duales studium|dual study|apprentice|werkstudent|working student)';

-- Tag year-specific programs
UPDATE jobs
SET ai_labels = array_append(COALESCE(ai_labels, '{}'), 'class-of-2026')
WHERE status = 'active'
  AND NOT ('class-of-2026' = ANY(COALESCE(ai_labels, '{}')))
  AND title ~ '2026';

UPDATE jobs
SET ai_labels = array_append(COALESCE(ai_labels, '{}'), 'class-of-2025')
WHERE status = 'active'
  AND NOT ('class-of-2025' = ANY(COALESCE(ai_labels, '{}')))
  AND title ~ '2025';

-- ============================================================================
-- PART 8: EXTRACT SPECIFIC SKILLS/REQUIREMENTS FROM DESCRIPTIONS
-- ============================================================================

-- Tag Excel/Data skills
UPDATE jobs
SET ai_labels = array_append(COALESCE(ai_labels, '{}'), 'excel-required')
WHERE status = 'active'
  AND NOT ('excel-required' = ANY(COALESCE(ai_labels, '{}')))
  AND LOWER(description) ~ '(excel|spreadsheet|vlookup|pivot)';

-- Tag SQL/Database skills
UPDATE jobs
SET ai_labels = array_append(COALESCE(ai_labels, '{}'), 'sql-required')
WHERE status = 'active'
  AND NOT ('sql-required' = ANY(COALESCE(ai_labels, '{}')))
  AND LOWER(description) ~ '(sql|database|postgresql|mysql)';

-- Tag Python/Programming
UPDATE jobs
SET ai_labels = array_append(COALESCE(ai_labels, '{}'), 'programming-required')
WHERE status = 'active'
  AND NOT ('programming-required' = ANY(COALESCE(ai_labels, '{}')))
  AND LOWER(description) ~ '(python|java|javascript|c\+\+|programming|coding)';

-- Tag MBA/Masters preferred
UPDATE jobs
SET ai_labels = array_append(COALESCE(ai_labels, '{}'), 'masters-preferred')
WHERE status = 'active'
  AND NOT ('masters-preferred' = ANY(COALESCE(ai_labels, '{}')))
  AND LOWER(description) ~ '(mba|master.?s degree|masters|postgraduate)';

-- ============================================================================
-- PART 9: INFER MISSING EXPERIENCE_REQUIRED
-- ============================================================================

-- If title has "junior" or "entry" but not flagged
UPDATE jobs
SET experience_required = 'entry-level'
WHERE status = 'active'
  AND experience_required IS NULL
  AND LOWER(title) ~ '(junior|jr\.|entry|trainee|graduate|intern)';

-- If flagged as internship/graduate, set entry-level
UPDATE jobs
SET experience_required = 'entry-level'
WHERE status = 'active'
  AND experience_required IS NULL
  AND (is_graduate = true OR is_internship = true);

-- Default remaining to entry-level (they passed all senior filters)
UPDATE jobs
SET experience_required = 'entry-level'
WHERE status = 'active'
  AND experience_required IS NULL;

-- ============================================================================
-- PART 10: ENSURE ALL BUSINESS FUNCTION CATEGORIES
-- ============================================================================

-- Ensure early-career category
UPDATE jobs
SET categories = COALESCE(categories, '{}') || ARRAY['early-career']
WHERE status = 'active' 
  AND NOT ('early-career' = ANY(COALESCE(categories, '{}')));

-- Add specific business function if missing (use title analysis)
UPDATE jobs
SET categories = COALESCE(categories, '{}') || ARRAY['finance-accounting']
WHERE status = 'active'
  AND NOT ('finance-accounting' = ANY(COALESCE(categories, '{}')))
  AND NOT ('investment-banking' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(finance|financial|accounting|treasury|controller|audit)';

UPDATE jobs
SET categories = COALESCE(categories, '{}') || ARRAY['consulting-strategy']
WHERE status = 'active'
  AND NOT ('consulting-strategy' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(consult|strategy|advisory)';

UPDATE jobs
SET categories = COALESCE(categories, '{}') || ARRAY['marketing-comms']
WHERE status = 'active'
  AND NOT ('marketing-comms' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(marketing|brand|communication|pr|media)';

UPDATE jobs
SET categories = COALESCE(categories, '{}') || ARRAY['analytics']
WHERE status = 'active'
  AND NOT ('analytics' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(analyst|analytics|business intelligence)';

UPDATE jobs
SET categories = COALESCE(categories, '{}') || ARRAY['technology']
WHERE status = 'active'
  AND NOT ('technology' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(software|developer|engineer|tech|programmer)';

UPDATE jobs
SET categories = COALESCE(categories, '{}') || ARRAY['sales-commercial']
WHERE status = 'active'
  AND NOT ('sales-commercial' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(sales|commercial|business development|account executive)';

UPDATE jobs
SET categories = COALESCE(categories, '{}') || ARRAY['operations']
WHERE status = 'active'
  AND NOT ('operations' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(operations|supply chain|logistics|procurement)';

UPDATE jobs
SET categories = COALESCE(categories, '{}') || ARRAY['hr-talent']
WHERE status = 'active'
  AND NOT ('hr-talent' = ANY(COALESCE(categories, '{}')))
  AND LOWER(title) ~ '(hr|human resources|talent|recruitment|people)';

-- ============================================================================
-- PART 11: SET FRESHNESS TIER BASED ON JOB AGE
-- ============================================================================

UPDATE jobs
SET freshness_tier = CASE
  WHEN created_at > NOW() - INTERVAL '7 days' THEN 'hot'
  WHEN created_at > NOW() - INTERVAL '14 days' THEN 'warm'
  WHEN created_at > NOW() - INTERVAL '21 days' THEN 'fresh'
  ELSE 'standard'
END
WHERE status = 'active';

-- ============================================================================
-- FINAL STATISTICS & COMPLETENESS REPORT
-- ============================================================================

SELECT '========================================' as divider;
SELECT 'AGGRESSIVE DATA ENRICHMENT COMPLETE' as status;

-- Field completeness report
SELECT
  COUNT(*) as total_active_jobs,
  COUNT(CASE WHEN city IS NOT NULL THEN 1 END) as has_city,
  COUNT(CASE WHEN country IS NOT NULL THEN 1 END) as has_country,
  COUNT(CASE WHEN experience_required IS NOT NULL THEN 1 END) as has_experience,
  COUNT(CASE WHEN categories IS NOT NULL AND array_length(categories, 1) >= 2 THEN 1 END) as has_multiple_categories,
  COUNT(CASE WHEN language_requirements IS NOT NULL AND array_length(language_requirements, 1) > 0 THEN 1 END) as has_languages,
  COUNT(CASE WHEN work_environment IS NOT NULL THEN 1 END) as has_work_env,
  COUNT(CASE WHEN freshness_tier IS NOT NULL THEN 1 END) as has_freshness,
  COUNT(CASE WHEN ai_labels IS NOT NULL AND array_length(ai_labels, 1) > 0 THEN 1 END) as has_ai_labels,
  COUNT(CASE WHEN salary_info IS NOT NULL THEN 1 END) as has_salary,
  ROUND(100.0 * COUNT(CASE WHEN city IS NOT NULL THEN 1 END) / COUNT(*), 1) || '%' as pct_city,
  ROUND(100.0 * COUNT(CASE WHEN categories IS NOT NULL AND array_length(categories, 1) >= 2 THEN 1 END) / COUNT(*), 1) || '%' as pct_categorized,
  ROUND(100.0 * COUNT(CASE WHEN language_requirements IS NOT NULL AND array_length(language_requirements, 1) > 0 THEN 1 END) / COUNT(*), 1) || '%' as pct_languages
FROM jobs
WHERE status = 'active';

-- Category distribution
SELECT 
  category,
  COUNT(*) as job_count
FROM (
  SELECT UNNEST(categories) as category
  FROM jobs
  WHERE status = 'active'
) sub
GROUP BY category
ORDER BY job_count DESC;

-- AI Labels distribution (company types, program types)
SELECT 
  label,
  COUNT(*) as job_count
FROM (
  SELECT UNNEST(ai_labels) as label
  FROM jobs
  WHERE status = 'active' AND ai_labels IS NOT NULL
) sub
GROUP BY label
ORDER BY job_count DESC;

-- Language requirements distribution
SELECT 
  lang,
  COUNT(*) as job_count
FROM (
  SELECT UNNEST(language_requirements) as lang
  FROM jobs
  WHERE status = 'active' AND language_requirements IS NOT NULL
) sub
GROUP BY lang
ORDER BY job_count DESC;

COMMIT;

-- ============================================================================
-- END - Database maximally enriched for perfect AI matching
-- ============================================================================

