# Remaining Data Quality Issues

## ✅ FIXED Issues (From Migration)

1. **Company Name** ✅
   - Before: 7,206 jobs (100%) missing
   - After: 7,401/7,410 (99.9%) have company_name
   - Status: **FIXED**

2. **Descriptions** ✅
   - Before: 1,282 jobs with short descriptions
   - After: 0 jobs with NULL/empty/short descriptions
   - Status: **FIXED**

3. **Posted Dates** ✅
   - Before: 154 jobs with NULL posted_at
   - After: 0 jobs with NULL posted_at
   - Status: **FIXED**

4. **Categories** ✅
   - Before: 11 jobs with empty categories
   - After: 0 jobs with empty categories
   - Status: **FIXED**

5. **Job Board Companies** ✅
   - Before: 9 jobs with job boards as companies
   - After: 7 jobs properly flagged
   - Status: **FIXED**

## ⚠️ REMAINING Issues

### 1. Missing City (310 jobs - 4.2%) ⚠️ **HIGH PRIORITY**

**Problem**: Location field doesn't have comma-separated format, so extraction failed.

**Breakdown**:
- **168 Reed jobs**: `location="London"` → Has city but no country (city extracted, country missing)
- **93 Jooble jobs**: `location="Sweden"` → Country name, not city
- **62 JobSpy jobs**: `location="España"` → Country name, not city  
- **62 Jooble jobs**: `location="Germany"` → Country name, not city
- **15 JobSpy jobs**: `location="Österreich"` → Country name, not city
- **15 JobSpy jobs**: `location="Deutschland"` → Country name, not city
- **11 JobSpy jobs**: `location="Ireland"` → Country name, not city
- **9 JobSpy jobs**: `location="W"` → Invalid code
- **9 JobSpy jobs**: `location="Nederland"` → Country name, not city

**Root Cause**: 
- Location field contains country names instead of cities
- Some locations don't have comma format ("City, Country")
- Invalid codes like "W" slipped through

**Fix Needed**: 
- Extract country from location when it's a country name
- Set city=NULL for jobs where location is just a country
- Clean up invalid codes

### 2. Missing Country (326 jobs - 4.4%) ⚠️ **HIGH PRIORITY**

**Problem**: Many jobs have city but no country, or location is just a country name.

**Breakdown**:
- **168 Reed jobs**: Have city="London" but country=NULL (location="London" without comma)
- **158 other jobs**: Have country names in location but not extracted

**Root Cause**:
- Location field format inconsistent
- Some have "City" only (no country)
- Some have "Country" only (should be in country field, not location)

**Fix Needed**:
- For Reed jobs with city but no country: Infer country from city (e.g., "London" → "United Kingdom")
- For jobs with country names in location: Extract to country field, set city=NULL
- Use city-to-country mapping for known cities

## Recommended Fixes

### Migration: Fix Remaining Location Issues

```sql
-- 1. Fix Reed jobs: Infer country from city
UPDATE jobs
SET country = CASE
  WHEN city = 'London' THEN 'United Kingdom'
  WHEN city = 'Dublin' THEN 'Ireland'
  WHEN city = 'Paris' THEN 'France'
  WHEN city = 'Berlin' THEN 'Germany'
  WHEN city = 'Amsterdam' THEN 'Netherlands'
  WHEN city = 'Brussels' THEN 'Belgium'
  WHEN city = 'Madrid' THEN 'Spain'
  WHEN city = 'Barcelona' THEN 'Spain'
  WHEN city = 'Milan' THEN 'Italy'
  WHEN city = 'Rome' THEN 'Italy'
  WHEN city = 'Vienna' THEN 'Austria'
  WHEN city = 'Zurich' THEN 'Switzerland'
  WHEN city = 'Copenhagen' THEN 'Denmark'
  WHEN city = 'Stockholm' THEN 'Sweden'
  WHEN city = 'Warsaw' THEN 'Poland'
  WHEN city = 'Prague' THEN 'Czech Republic'
  WHEN city = 'Munich' THEN 'Germany'
  WHEN city = 'Frankfurt' THEN 'Germany'
  WHEN city = 'Hamburg' THEN 'Germany'
  WHEN city = 'Cologne' THEN 'Germany'
  WHEN city = 'Stuttgart' THEN 'Germany'
  WHEN city = 'Düsseldorf' THEN 'Germany'
  WHEN city = 'Manchester' THEN 'United Kingdom'
  WHEN city = 'Birmingham' THEN 'United Kingdom'
  ELSE country
END
WHERE country IS NULL 
  AND city IS NOT NULL
  AND source = 'reed';

-- 2. Extract country from location when location is a country name
UPDATE jobs
SET country = CASE
  WHEN location = 'Sweden' OR location = 'Sverige' THEN 'Sweden'
  WHEN location = 'Germany' OR location = 'Deutschland' THEN 'Germany'
  WHEN location = 'Spain' OR location = 'España' THEN 'Spain'
  WHEN location = 'Austria' OR location = 'Österreich' THEN 'Austria'
  WHEN location = 'Netherlands' OR location = 'Nederland' THEN 'Netherlands'
  WHEN location = 'Belgium' OR location = 'Belgique' THEN 'Belgium'
  WHEN location = 'Ireland' THEN 'Ireland'
  WHEN location = 'United Kingdom' OR location = 'UK' THEN 'United Kingdom'
  WHEN location = 'France' THEN 'France'
  WHEN location = 'Italy' OR location = 'Italia' THEN 'Italy'
  WHEN location = 'Switzerland' OR location = 'Schweiz' THEN 'Switzerland'
  WHEN location = 'Denmark' OR location = 'Danmark' THEN 'Denmark'
  WHEN location = 'Poland' OR location = 'Polska' THEN 'Poland'
  WHEN location = 'Czech Republic' OR location = 'Czechia' THEN 'Czech Republic'
  ELSE country
END,
city = NULL
WHERE country IS NULL
  AND city IS NULL
  AND location IN (
    'Sweden', 'Sverige', 'Germany', 'Deutschland', 'Spain', 'España',
    'Austria', 'Österreich', 'Netherlands', 'Nederland', 'Belgium', 'Belgique',
    'Ireland', 'United Kingdom', 'UK', 'France', 'Italy', 'Italia',
    'Switzerland', 'Schweiz', 'Denmark', 'Danmark', 'Poland', 'Polska',
    'Czech Republic', 'Czechia'
  );

-- 3. Clean up invalid location codes
UPDATE jobs
SET location = NULL, city = NULL, country = NULL
WHERE location IN ('W', 'Md', 'Ct') OR LENGTH(TRIM(location)) <= 2;
```

## Summary

**Fixed**: 5/7 critical issues ✅
**Remaining**: 2 location-related issues ⚠️

**Impact**: 
- 310 jobs (4.2%) missing city
- 326 jobs (4.4%) missing country
- These jobs can't be properly filtered/searched by location

**Priority**: HIGH - Location filtering is critical for job matching

