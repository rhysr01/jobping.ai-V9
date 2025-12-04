# Data Quality & Matching Optimization Audit Summary

## 🔍 Overview

This document summarizes the data quality audit and matching optimization recommendations for the JobPing database.

## 🚨 Critical Issues Found

### 1. Missing Critical Database Indexes

**Problem**: The `idx_jobs_city` index was removed in `remove_unused_indexes.sql`, but it's **CRITICAL** for matching performance.

**Impact**: 
- Matching queries filter by `city IN (...)` - without this index, PostgreSQL scans all active jobs
- Matching queries filter by `categories && ARRAY[...]` - needs GIN index for efficient array queries
- Matching queries filter by `is_active = true AND status = 'active'` - needs composite index

**Fix**: Run migration `20250129_add_critical_matching_indexes.sql`

### 2. Missing City Data

**Problem**: Some jobs have `location` but `city` is NULL, preventing efficient city-based filtering.

**Impact**: 
- Matching queries can't filter by city efficiently
- Jobs may be missed in matching if city isn't extracted

**Fix**: 
- Run `parse_and_update_location()` function (already exists in `20250128_fix_job_data_quality.sql`)
- Ensure scraper always extracts city (check `jobspy-save.cjs` line 370)

### 3. Missing Categories Data

**Problem**: Some jobs have NULL or empty `categories` array.

**Impact**: 
- Can't filter by career path in matching queries
- Jobs won't match user career path preferences

**Fix**: 
- Scraper should always set `categories` array (check `jobspy-save.cjs` line 412)
- Added validation in scraper to ensure categories are never null

### 4. Scraper Data Validation Issues

**Problem**: Scraper doesn't validate data before saving, allowing:
- Empty titles
- Missing work_environment
- Remote jobs slipping through filter

**Impact**: 
- Poor data quality affects matching accuracy
- Remote jobs may be saved despite filter at line 368

**Fix**: 
- Added validation in `jobspy-save.cjs` before upsert (lines 425-436)
- Ensures required fields are present
- Ensures categories and work_environment are never null

## 📊 Data Quality Checks

### Run Audit Scripts

1. **SQL Audit** (comprehensive):
   ```bash
   # Run in Supabase SQL editor
   psql < scripts/audit-data-quality.sql
   ```

2. **TypeScript Audit** (connects to DB):
   ```bash
   npx tsx scripts/run-data-quality-audit.ts
   ```

3. **Scraper Validation**:
   ```bash
   npx tsx scripts/validate-scraper-data.ts
   ```

### Fix Data Quality Issues

```bash
# Run in Supabase SQL editor
psql < scripts/fix-data-quality-issues.sql
```

## 🔧 Scraper Improvements Made

### 1. Added Data Validation

**File**: `scripts/jobspy-save.cjs`

**Changes**:
- Validate required fields before saving (title, company, location, job_hash)
- Ensure `categories` is never null/empty (defaults to `['early-career']`)
- Ensure `work_environment` is never null (defaults to `'on-site'`)
- Log validation warnings for debugging

**Lines**: 425-436

### 2. Improved Error Logging

- Log first failed row when upsert fails
- Log validation statistics (validated → unique → saved)

## 📈 Database Optimization

### Critical Indexes for Matching

1. **`idx_jobs_city`** - City-based filtering
2. **`idx_jobs_categories_gin`** - Category/career path filtering (GIN for arrays)
3. **`idx_jobs_is_active_status`** - Active job filtering
4. **`idx_jobs_created_at_desc`** - Recency sorting
5. **`idx_jobs_posted_at_desc`** - Freshness sorting
6. **`idx_jobs_city_categories`** - Composite for common query pattern

### Query Patterns Optimized

```sql
-- Pattern 1: City filtering (uses idx_jobs_city)
SELECT * FROM jobs 
WHERE is_active = true 
  AND city IN ('London', 'Paris', 'Berlin')
  AND status = 'active';

-- Pattern 2: Category filtering (uses idx_jobs_categories_gin)
SELECT * FROM jobs 
WHERE is_active = true 
  AND categories && ARRAY['early-career', 'internship']
  AND status = 'active';

-- Pattern 3: Combined (uses idx_jobs_city_categories)
SELECT * FROM jobs 
WHERE is_active = true 
  AND city IN ('London', 'Paris')
  AND categories && ARRAY['early-career']
  AND status = 'active'
ORDER BY created_at DESC;
```

## ✅ Action Items

### Immediate (Critical)

1. ✅ **Run migration**: `migrations/20250129_add_critical_matching_indexes.sql`
2. ✅ **Fix scraper validation**: Already done in `jobspy-save.cjs`
3. ⏳ **Backfill missing city data**: Run `parse_and_update_location()` function
4. ⏳ **Fix data inconsistencies**: Run `scripts/fix-data-quality-issues.sql`

### Short-term (Important)

1. ⏳ **Run data quality audit**: `npx tsx scripts/run-data-quality-audit.ts`
2. ⏳ **Monitor scraper data quality**: Add to CI/CD pipeline
3. ⏳ **Deactivate stale jobs**: Jobs >60 days old should be deactivated

### Long-term (Monitoring)

1. ⏳ **Set up data quality alerts**: Alert when >10% of jobs missing city/categories
2. ⏳ **Regular audits**: Run data quality audit weekly
3. ⏳ **Index usage monitoring**: Track which indexes are actually used

## 📝 Files Created

1. **`scripts/audit-data-quality.sql`** - Comprehensive SQL audit queries
2. **`scripts/fix-data-quality-issues.sql`** - SQL fixes for data quality issues
3. **`scripts/run-data-quality-audit.ts`** - TypeScript audit script (connects to DB)
4. **`scripts/validate-scraper-data.ts`** - Scraper-specific validation
5. **`migrations/20250129_add_critical_matching_indexes.sql`** - Critical indexes migration
6. **`docs/DATA_QUALITY_AUDIT_SUMMARY.md`** - This document

## 🔍 How to Verify

### Check Indexes Exist

```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'jobs' 
  AND indexname IN (
    'idx_jobs_city',
    'idx_jobs_categories_gin',
    'idx_jobs_is_active_status',
    'idx_jobs_created_at_desc',
    'idx_jobs_posted_at_desc',
    'idx_jobs_city_categories'
  );
```

### Check Data Quality

```sql
-- Missing city
SELECT COUNT(*) FROM jobs 
WHERE is_active = true 
  AND city IS NULL 
  AND location IS NOT NULL;

-- Missing categories
SELECT COUNT(*) FROM jobs 
WHERE is_active = true 
  AND (categories IS NULL OR categories = '{}');

-- Status inconsistency
SELECT COUNT(*) FROM jobs 
WHERE is_active = true 
  AND status != 'active';
```

## 🎯 Expected Results After Fixes

- **Matching query performance**: 10-100x faster with proper indexes
- **Data completeness**: >95% of jobs have city and categories
- **Scraper validation**: 0 jobs saved with missing required fields
- **Index usage**: All critical indexes showing usage in `pg_stat_user_indexes`

