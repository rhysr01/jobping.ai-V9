# Data Quality Prevention Plan

## Overview
Comprehensive prevention system to ensure data quality issues don't happen again.

## Issues Fixed & Prevention

### 1. ✅ Company Name Field Mismatch
**Problem**: 7,206 jobs had NULL `company_name` but data in `company` field

**Fix Applied**:
- ✅ Updated `processIncomingJob()` to always set `company_name` from `company`
- ✅ Added auto-fix in `jobValidator.cjs` to set `company_name` if missing
- ✅ Migration created to sync existing data

**Prevention**:
- ✅ Processor now always sets `company_name = company`
- ✅ Validator checks and auto-fixes missing `company_name`
- ✅ All scrapers use processor which ensures this

### 2. ✅ Job Board Companies
**Problem**: 9 jobs had job boards (Reed, Indeed, Google) as company names

**Fix Applied**:
- ✅ Processor now rejects job board companies (returns null)
- ✅ Validator detects and rejects job boards
- ✅ Migration flags existing job board companies

**Prevention**:
- ✅ Processor checks against `JOB_BOARDS` list and rejects matches
- ✅ Validator validates before save
- ✅ All scrapers use processor/validator

### 3. ✅ Missing Location Data
**Problem**: 2,036 jobs missing city, 2,051 missing country

**Fix Applied**:
- ✅ Processor extracts city/country from `location` field if missing
- ✅ Validator auto-extracts from location field
- ✅ Migration extracts from location for existing data

**Prevention**:
- ✅ Processor tries to extract from `location` if city/country missing
- ✅ Validator warns and auto-extracts
- ✅ Location normalizer handles city normalization

### 4. ✅ Missing Descriptions
**Problem**: 518 NULL descriptions, 1,282 very short descriptions

**Fix Applied**:
- ✅ Processor ensures minimum 20-char description
- ✅ Validator auto-generates minimal description if missing
- ✅ Migration builds descriptions from title + company

**Prevention**:
- ✅ Processor builds minimal description if too short
- ✅ Validator enforces minimum length
- ✅ Scrapers enriched to get better descriptions

### 5. ✅ City Normalization
**Problem**: 612 unique cities with variations (Wien/Vienna, etc.)

**Fix Applied**:
- ✅ Enhanced location normalizers with 200+ city mappings
- ✅ Migration normalized all existing cities

**Prevention**:
- ✅ `normalizeCity()` automatically maps variations
- ✅ All scrapers use location normalizer
- ✅ City variations prevented at ingestion

### 6. ✅ Country Names as Cities
**Problem**: Countries (Österreich, Deutschland) used as cities

**Fix Applied**:
- ✅ Location normalizer rejects country names
- ✅ Migration removed countries from city field

**Prevention**:
- ✅ `normalizeCity()` checks against country list and returns empty
- ✅ Validator detects and fixes country names as cities
- ✅ Processor validates city is not a country

### 7. ✅ Missing Posted Dates
**Problem**: 154 jobs with NULL `posted_at`

**Fix Applied**:
- ✅ Processor uses `created_at` as fallback
- ✅ Validator fixes future dates
- ✅ Migration backfills from `created_at`

**Prevention**:
- ✅ Processor always sets `posted_at` (uses current time if missing)
- ✅ Validator fixes future dates
- ✅ Normalize date function handles edge cases

### 8. ✅ Empty Categories
**Problem**: 11 jobs with empty categories

**Fix Applied**:
- ✅ Processor always sets default categories
- ✅ Validator adds default if missing
- ✅ Migration sets default categories

**Prevention**:
- ✅ Processor always includes 'early-career' category
- ✅ Validator ensures categories array is never empty
- ✅ All scrapers use processor

## Implementation Details

### Files Modified

1. **`scrapers/shared/processor.cjs`**
   - ✅ Always sets `company_name` from `company`
   - ✅ Rejects job board companies
   - ✅ Extracts city/country from location if missing
   - ✅ Ensures minimum description length
   - ✅ Validates dates

2. **`scrapers/shared/jobValidator.cjs`** (NEW)
   - ✅ Comprehensive validation before save
   - ✅ Auto-fixes common issues
   - ✅ Rejects invalid jobs
   - ✅ Tracks validation stats

3. **`lib/locationNormalizer.ts`** & **`scrapers/shared/locationNormalizer.cjs`**
   - ✅ 200+ city name mappings
   - ✅ Rejects country names as cities
   - ✅ Handles district variations

4. **`scripts/jobspy-save.cjs`**
   - ✅ Uses new validator
   - ✅ Ensures `company_name` is set

### Migration Files

1. **`migrations/fix_all_data_quality_issues.sql`**
   - Fixes all existing data issues
   - Run once to clean up database

## How It Works

### Job Ingestion Flow

```
Raw Job → processIncomingJob() → validateJob() → Database
           ↓                        ↓
      - Sets company_name      - Validates required fields
      - Rejects job boards     - Auto-fixes issues
      - Normalizes location    - Rejects invalid jobs
      - Ensures description    - Logs warnings
      - Validates dates
```

### Validation Layers

1. **Processor Layer** (First line of defense)
   - Normalizes and enriches data
   - Rejects job boards
   - Sets required fields

2. **Validator Layer** (Second line of defense)
   - Validates all required fields
   - Auto-fixes common issues
   - Rejects invalid jobs

3. **Database Layer** (Final check)
   - Unique constraints on `job_hash`
   - NOT NULL constraints on critical fields

## Testing

After implementing:
1. Run scrapers and check logs for validation warnings
2. Monitor database for new data quality issues
3. Check that `company_name` is always set
4. Verify no new job board companies appear
5. Confirm city normalization working

## Monitoring

Add these queries to monitor data quality:

```sql
-- Daily data quality check
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE company_name IS NULL) as missing_company_name,
  COUNT(*) FILTER (WHERE city IS NULL) as missing_city,
  COUNT(*) FILTER (WHERE description IS NULL OR LENGTH(description) < 20) as bad_descriptions,
  COUNT(*) FILTER (WHERE filtered_reason LIKE '%job_board%') as job_boards
FROM jobs
WHERE created_at > NOW() - INTERVAL '24 hours';
```

## Success Criteria

✅ All new jobs have `company_name` set
✅ No job board companies saved
✅ All jobs have normalized cities
✅ All jobs have adequate descriptions
✅ No countries saved as cities
✅ All jobs have valid dates

