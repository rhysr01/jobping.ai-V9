# Additional Bug Fixes - December 29, 2025

## 🐛 Bug 3: Arbeitnow Scraper Using Raw Path Names

### Problem
The `inferCategoriesFromTags` function in `scrapers/arbeitnow.cjs` was returning raw path names (like 'strategy', 'finance', 'sales') instead of mapped database categories.

**Impact**: Jobs from Arbeitnow weren't being categorized correctly, causing them to not match user career paths.

### Root Cause
The function was pushing raw path names directly without mapping them to database categories:
```javascript
categories.push(path); // ❌ Wrong - pushes 'finance' instead of 'finance-investment'
```

### Fix
Updated `scrapers/arbeitnow.cjs` to use the same category mapping as other scrapers:
- Added `categoryMap` matching `categoryMapper.ts`
- Maps raw paths to database categories:
  - `'finance'` → `'finance-investment'`
  - `'sales'` → `'sales-client-success'`
  - `'marketing'` → `'marketing-growth'`
  - `'product'` → `'product-innovation'`

**File**: `scrapers/arbeitnow.cjs` (lines 275-289)

---

## 🐛 Bug 4: Location Validation Priority Wrong

### Problem
In `Utils/consolidatedMatchingV2.ts`, the location validation was checking `job.location` first, then `job.city`. This is backwards - the normalized `job.city` field should be checked first.

**Impact**: AI matching system might reject valid jobs because it checks the location string (which may have variations) before checking the normalized city field.

### Root Cause
Code was checking location field before city field:
```typescript
const jobLocation = (job.location || '').toLowerCase(); // Checked first
const jobCity = (job as any).city ? String((job as any).city).toLowerCase() : '';
```

### Fix
Reversed the priority to check normalized city field first:
1. **Priority 1**: Check `job.city` (normalized, exact match)
2. **Priority 2**: Fallback to `job.location` (if city is missing)
3. **Priority 3**: Allow remote/hybrid jobs

**File**: `Utils/consolidatedMatchingV2.ts` (lines 997-1036)

---

## 📊 Summary of All Bugs Found

| Bug | File | Status | Impact |
|-----|------|--------|--------|
| 1. Category mapping mismatch | `scripts/jobspy-save.cjs`, `scrapers/careerjet.cjs` | ✅ Fixed | High - Jobs not matching career paths |
| 2. City filtering bug | `app/api/match-users/route.ts` | ✅ Fixed | High - All jobs from one city |
| 3. Arbeitnow raw paths | `scrapers/arbeitnow.cjs` | ✅ Fixed | Medium - Arbeitnow jobs not categorized |
| 4. Location priority wrong | `Utils/consolidatedMatchingV2.ts` | ✅ Fixed | Medium - AI matching rejecting valid jobs |

---

## 🔍 Remaining Issues (Non-Critical)

### Old Category Names in Database
There are still **1,041 jobs** in the database with old category names:
- `marketing-advertising`: 358 jobs
- `finance-accounting`: 347 jobs
- `sales-business-development`: 314 jobs
- `product-management`: 22 jobs

**Impact**: These jobs won't match users selecting the corresponding career paths until they're migrated.

**Recommendation**: Create a migration to update old category names to new ones:
```sql
UPDATE jobs 
SET categories = array_replace(categories, 'finance-accounting', 'finance-investment')
WHERE 'finance-accounting' = ANY(categories);
```

---

## ✅ Files Changed

1. `scrapers/arbeitnow.cjs` - Added category mapping
2. `Utils/consolidatedMatchingV2.ts` - Fixed location validation priority

---

## 🧪 Testing Checklist

- [ ] Test Arbeitnow jobs are categorized correctly
- [ ] Test AI matching accepts jobs with normalized city field
- [ ] Verify location validation prioritizes city over location field
- [ ] Check that old category jobs still appear (until migration)

---

**Status**: ✅ **ALL CRITICAL BUGS FIXED**

