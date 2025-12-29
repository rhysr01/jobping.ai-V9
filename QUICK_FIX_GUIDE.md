# Quick Fix Guide - Data Quality Issues

## 🚀 Immediate Actions Required

### Step 1: Run Migration (Fix Existing Data)
**File**: `migrations/fix_all_data_quality_issues.sql`

Run this SQL in Supabase SQL Editor. It will:
- ✅ Fix 7,206 jobs: Set `company_name` from `company`
- ✅ Fix 2,036 jobs: Extract city from location
- ✅ Fix 2,051 jobs: Extract country from location  
- ✅ Fix 1,800 jobs: Build descriptions from title+company
- ✅ Flag 9 jobs: Job board companies
- ✅ Fix 154 jobs: Backfill posted dates

**Time**: ~30 seconds

### Step 2: Verify Fixes
Run these queries after migration:

```sql
-- Check company_name fix
SELECT COUNT(*) as total, 
       COUNT(*) FILTER (WHERE company_name IS NOT NULL) as with_company_name
FROM jobs;

-- Check location fix
SELECT COUNT(*) as total,
       COUNT(*) FILTER (WHERE city IS NOT NULL) as with_city,
       COUNT(*) FILTER (WHERE country IS NOT NULL) as with_country
FROM jobs;

-- Check description fix
SELECT COUNT(*) as total,
       COUNT(*) FILTER (WHERE description IS NOT NULL AND LENGTH(description) >= 20) as good_descriptions
FROM jobs;
```

## ✅ Prevention Already Implemented

All prevention is **already in place**! No action needed:

1. ✅ **Processor** (`scrapers/shared/processor.cjs`)
   - Always sets `company_name`
   - Rejects job board companies
   - Extracts location data
   - Ensures descriptions

2. ✅ **Validator** (`scrapers/shared/jobValidator.cjs`)
   - Validates before save
   - Auto-fixes issues
   - Rejects invalid jobs

3. ✅ **Location Normalizer** (both TS and CJS)
   - Normalizes 200+ city variations
   - Rejects country names

## 📊 Expected Results After Migration

| Metric | Before | After |
|--------|--------|-------|
| Jobs with company_name | 0% | 100% |
| Jobs with city | 71% | ~95% |
| Jobs with country | 71% | ~95% |
| Jobs with good descriptions | 74% | ~95% |
| Job board companies | 9 | 0 (flagged) |

## 🎯 What's Protected Now

✅ **Company names** - Always set automatically
✅ **Job boards** - Rejected at ingestion
✅ **City variations** - Normalized automatically
✅ **Country names** - Rejected as cities
✅ **Descriptions** - Minimum length enforced
✅ **Dates** - Validated and fixed
✅ **Categories** - Always set

## 📝 Files to Review

- `migrations/fix_all_data_quality_issues.sql` - Run this!
- `scrapers/shared/processor.cjs` - See prevention logic
- `scrapers/shared/jobValidator.cjs` - See validation logic
- `docs/DATA_QUALITY_PREVENTION_PLAN.md` - Full details

## 🚨 If Issues Reappear

1. Check scraper logs for validation warnings
2. Run daily data quality check query
3. Review `jobValidator.cjs` logs
4. Check if new scrapers are using processor/validator

---

**Status**: ✅ All fixes ready, prevention implemented, just run the migration!

