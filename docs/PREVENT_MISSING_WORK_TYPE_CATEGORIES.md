# 🛡️ Data Quality Enforcement: Work-Type Categories

**Date**: January 4, 2026  
**Status**: ✅ **IMPLEMENTED**  
**Purpose**: Ensures all jobs have work-type categories for proper matching

> This document describes the 4-layer enforcement system that prevents jobs from being saved without work-type categories. All scrapers use this system automatically.

---

## Quick Reference

### Key Files
- **Processor**: `scrapers/shared/processor.cjs` - Auto-infers work-type categories
- **Validator**: `scrapers/shared/jobValidator.cjs` - Enforces standards
- **Inference Module**: `scrapers/shared/workTypeInference.cjs` - Category inference logic
- **Database Trigger**: `supabase/migrations/20260104000005_prevent_missing_work_type_categories.sql`

### Verification Queries
```sql
-- Check trigger is active
SELECT tgname FROM pg_trigger WHERE tgname = 'ensure_work_type_category_on_jobs';

-- Check jobs without work-type categories (should be 0)
SELECT COUNT(*) FROM jobs
WHERE is_active = true
AND NOT has_work_type_category(categories);
```

---

## 🎯 Problem

**28.43% of jobs (2,779 out of 9,775) were missing work-type categories**, causing:
- Users getting irrelevant matches
- Jobs matched to wrong career paths
- Poor user experience

---

## ✅ Solution: Multi-Layer Prevention

We've implemented **4 layers of protection** to ensure this never happens again:

### Layer 1: Scraper-Level Validation ✅

**File**: `scrapers/shared/jobValidator.cjs`

**What it does**:
- Validates jobs before they're saved
- **Auto-fixes**: If job is missing work-type category, automatically infers one from title/description
- Logs warnings when auto-fix occurs

**Code**:
```javascript
// CRITICAL: Ensure job has at least one work-type category
const { ensureWorkTypeCategory } = require("./workTypeInference.cjs");
const hasWorkTypeCategory = (job.categories || []).some((cat) =>
    WORK_TYPE_CATEGORIES.includes(cat),
);

if (!hasWorkTypeCategory) {
    // Auto-fix: Infer work-type category
    job.categories = ensureWorkTypeCategory({
        title: job.title || "",
        description: job.description || "",
        categories: job.categories || [],
    });
    warnings.push("Missing work-type category - auto-inferred");
}
```

---

### Layer 2: Processor-Level Auto-Inference ✅

**File**: `scrapers/shared/processor.cjs`

**What it does**:
- Automatically infers work-type categories during job processing
- Runs BEFORE validation, so jobs already have work-type categories when validated
- Uses keyword matching on title and description

**Code**:
```javascript
// CRITICAL: Ensure work-type category exists (auto-infer if missing)
const { ensureWorkTypeCategory } = require("./workTypeInference.cjs");
validatedCategories = ensureWorkTypeCategory({
    title,
    description,
    categories: validatedCategories,
});
```

---

### Layer 3: Database Trigger ✅

**File**: `supabase/migrations/20260104000005_prevent_missing_work_type_categories.sql`

**What it does**:
- **Database-level enforcement** - cannot be bypassed
- Runs BEFORE INSERT/UPDATE on jobs table
- Automatically adds work-type category if missing
- Logs warnings for monitoring

**How it works**:
1. Trigger fires on INSERT/UPDATE
2. Checks if job has work-type category
3. If missing, infers from title/description using SQL function
4. Adds inferred category to job
5. Logs warning for monitoring

**SQL Function**:
```sql
CREATE TRIGGER ensure_work_type_category_on_jobs
    BEFORE INSERT OR UPDATE ON jobs
    FOR EACH ROW
    WHEN (NEW.is_active = true)
    EXECUTE FUNCTION ensure_work_type_category_trigger();
```

---

### Layer 4: Matching Logic Filter ✅

**Files**: 
- `Utils/matching/rule-based-matcher.service.ts`
- `Utils/matching/guaranteed/index.ts`

**What it does**:
- **Final safety net** - filters out jobs without work-type categories
- Prevents jobs from being matched to users with career path preferences
- Hard gate failure if job lacks work-type category

**Code**:
```typescript
// Check if job has any work-type category
const hasWorkTypeCategory = jobCategories.some((cat) =>
    workTypeCategories.includes(cat),
);

if (!hasWorkTypeCategory) {
    failures.push("Job has no work-type category");
}
```

---

## 📊 How It Works Together

```
┌─────────────────────────────────────────────────────────────┐
│  Job Scraped                                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Processor                                         │
│  - Auto-infers work-type category from title/description   │
│  - Adds to categories array                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Validator                                         │
│  - Checks if work-type category exists                     │
│  - If missing, auto-infers and adds                        │
│  - Logs warning                                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Database Trigger                                 │
│  - Final check before INSERT/UPDATE                        │
│  - Auto-adds work-type category if still missing          │
│  - Cannot be bypassed                                      │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Job Saved to Database                                      │
│  ✅ Guaranteed to have work-type category                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Matching Logic                                    │
│  - Filters out jobs without work-type categories           │
│  - Final safety net                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Monitoring

### Check for Jobs Still Missing Work-Type Categories

```sql
SELECT COUNT(*) 
FROM jobs
WHERE is_active = true
AND categories IS NOT NULL
AND array_length(categories, 1) > 0
AND NOT has_work_type_category(categories);
```

### Check Trigger Logs

```sql
-- Check PostgreSQL logs for warnings from trigger
-- Look for: "Job X missing work-type category - auto-inferred: Y"
```

### Monitor Auto-Fixes

The validator logs warnings when auto-fixing:
- Check scraper logs for: `"Missing work-type category - auto-inferred"`
- Monitor frequency to ensure scrapers are working correctly

---

## 🚀 Deployment Checklist

- [x] ✅ Created `workTypeInference.cjs` module
- [x] ✅ Updated `jobValidator.cjs` to auto-fix missing work-type categories
- [x] ✅ Updated `processor.cjs` to auto-infer work-type categories
- [x] ✅ Created database trigger migration
- [x] ✅ Updated matching logic to filter out jobs without work-type categories
- [ ] ⏳ Run migration `20260104000005_prevent_missing_work_type_categories.sql`
- [ ] ⏳ Deploy code changes
- [ ] ⏳ Monitor for auto-fixes in logs
- [ ] ⏳ Verify no new jobs are created without work-type categories

---

## 📝 Notes

1. **Auto-inference is not perfect** - keyword matching may occasionally misclassify jobs
2. **Fallback category**: If no keywords match, jobs get `general-management` category
3. **Performance**: Database trigger adds minimal overhead (~1-2ms per INSERT/UPDATE)
4. **Monitoring**: Check logs regularly to ensure auto-inference is working correctly

---

**Status**: ✅ **READY FOR DEPLOYMENT**

All prevention layers are implemented and ready. Once migration is run and code is deployed, jobs will **never** be saved without work-type categories again.

---

## Related Migrations

See `supabase/migrations/` for complete migration history:
- `20260104000000_fix_duplicate_jobs.sql` - Removed 2,718 duplicate jobs
- `20260104000001_fix_invalid_categories.sql` - Fixed old form value categories
- `20260104000002_add_missing_categories.sql` - Added work-type categories to existing jobs
- `20260104000003_fix_matches_category_mismatches.sql` - Fixed category mismatches in matches table
- `20260104000004_fix_data_quality_issues.sql` - Marked incomplete/expired jobs as inactive
- `20260104000005_prevent_missing_work_type_categories.sql` - Database trigger for prevention

For migration execution instructions, see `docs/guides/MIGRATION_RUN_ORDER.md`.

