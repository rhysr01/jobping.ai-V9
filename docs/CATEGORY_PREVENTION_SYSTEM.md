# Category Name Prevention System
**Date**: December 29, 2025

## Overview

Multi-layer protection system to prevent old category names from being created again.

## Protection Layers

### 1. ✅ Shared Category Mapper (`scrapers/shared/categoryMapper.cjs`)

**Single Source of Truth** for all scrapers:
- Centralized category mapping
- Validates and fixes categories
- Removes deprecated categories automatically

**Used by**:
- `scripts/jobspy-save.cjs`
- `scrapers/careerjet.cjs`
- `scrapers/arbeitnow.cjs`

### 2. ✅ Job Validator (`scrapers/shared/jobValidator.cjs`)

**Validates categories before saving**:
- Checks for deprecated categories
- Auto-removes old category names
- Logs warnings when old categories are detected

### 3. ✅ Database Trigger (`supabase/migrations/20251229210000_prevent_old_categories_trigger.sql`)

**Final safety net at database level**:
- Automatically replaces old categories on INSERT/UPDATE
- Runs BEFORE data is saved
- Cannot be bypassed

## Category Mappings

| Form Value | Database Category | Old (Deprecated) |
|------------|-------------------|------------------|
| `finance` | `finance-investment` | ❌ `finance-accounting` |
| `sales` | `sales-client-success` | ❌ `sales-business-development` |
| `marketing` | `marketing-growth` | ❌ `marketing-advertising` |
| `product` | `product-innovation` | ❌ `product-management` |

## How It Works

### Layer 1: Scraper Level
```javascript
const { addCategoryFromPath, validateAndFixCategories } = require('./shared/categoryMapper.cjs');
categories = addCategoryFromPath('finance', categories);
categories = validateAndFixCategories(categories); // Removes old categories
```

### Layer 2: Validator Level
```javascript
// In jobValidator.cjs
job.categories = validateAndFixCategories(job.categories);
// Auto-removes deprecated categories and logs warnings
```

### Layer 3: Database Level
```sql
-- Trigger automatically runs on INSERT/UPDATE
-- Replaces old categories before data is saved
```

## Testing

### Test Scraper Level
```javascript
const { validateAndFixCategories } = require('./scrapers/shared/categoryMapper.cjs');
const result = validateAndFixCategories(['marketing-advertising', 'early-career']);
// Should return: ['marketing-growth', 'early-career']
```

### Test Database Trigger
```sql
INSERT INTO jobs (title, company, categories, ...) 
VALUES ('Test', 'Test Co', ARRAY['finance-accounting', 'early-career'], ...);

-- Should result in: categories = ARRAY['finance-investment', 'early-career']
```

## Files Changed

1. ✅ `scrapers/shared/categoryMapper.cjs` - **NEW** - Shared category mapping
2. ✅ `scrapers/shared/jobValidator.cjs` - Added category validation
3. ✅ `scripts/jobspy-save.cjs` - Uses shared mapper
4. ✅ `scrapers/careerjet.cjs` - Uses shared mapper
5. ✅ `scrapers/arbeitnow.cjs` - Uses shared mapper
6. ✅ `supabase/migrations/20251229210000_prevent_old_categories_trigger.sql` - **NEW** - Database trigger

## Benefits

1. **Single Source of Truth**: All scrapers use the same mapping
2. **Automatic Validation**: Categories are validated at multiple levels
3. **Database Protection**: Trigger ensures old categories never persist
4. **Easy Updates**: Change mapping in one place (`categoryMapper.cjs`)
5. **Prevention**: Old categories are caught and fixed before saving

## Maintenance

**To update category mappings**:
1. Update `scrapers/shared/categoryMapper.cjs`
2. Update `Utils/matching/categoryMapper.ts` (keep in sync)
3. All scrapers automatically use new mappings

**To add new deprecated categories**:
1. Add to `DEPRECATED_CATEGORIES` in `categoryMapper.cjs`
2. Add replacement logic in database trigger
3. Update validator

---

**Status**: ✅ **FULLY PROTECTED** - Old categories cannot be created again

