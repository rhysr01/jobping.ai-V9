# 🧹 DEAD CODE AUDIT REPORT

## ❌ COMPLETELY UNUSED FILES (DELETE THESE):

### **1. Utils Files (NOT imported anywhere)**:
```
Utils/apiKeyManager.ts          - NOT USED
Utils/emailUtils.ts             - NOT USED  
Utils/embeddingBoost.ts         - NOT USED
Utils/httpClient.ts             - NOT USED
Utils/jobDeduplication.ts       - NOT USED
Utils/jobIngestion.ts           - NOT USED
Utils/jobMatching.ts            - NOT USED (replaced by new matching system)
Utils/languageNormalization.ts  - NOT USED
Utils/paymentRetry.ts           - NOT USED
Utils/simple-cost-effective.ts  - NOT USED
Utils/synonymPacks.ts           - NOT USED
```

**Impact**: 11 unused utility files
**Action**: Safe to delete

---

### **2. lib/ Files (Flagged by ts-prune)**:
```
lib/date-helpers.ts exports:
  - getDateHoursAgo         - UNUSED
  - getDateMinutesAgo       - UNUSED
  - toUTCString             - UNUSED
  - isWithinDays            - UNUSED
  - getStartOfToday         - UNUSED
  - getEndOfToday           - UNUSED

lib/copy.ts exports (unused constants):
  - CTA_FREE
  - CTA_PREMIUM
  - HERO_TITLE
  - HERO_SUBTITLE
  - HOW_IT_WORKS_TITLE
  - HOW_IT_WORKS_STEPS
  - BUILT_FOR_STUDENTS_TITLE
  - BUILT_FOR_STUDENTS_SUBTITLE
  - BUILT_FOR_STUDENTS_FEATURES
  - PRICING_TITLE
  - PRICING_SUBTITLE
  - FREE_PLAN_TITLE/SUBTITLE/FEATURES
  - PREMIUM_PLAN_TITLE/SUBTITLE/PRICE/FEATURES
  - REASSURANCE_ITEMS

lib/auth.ts exports:
  - validateProductionSecrets   - UNUSED
  - validateEnvHygiene         - UNUSED

lib/config.ts:
  - targetCities               - UNUSED
```

**Impact**: Multiple unused exports in lib files
**Action**: Remove unused functions/constants or mark as dead code

---

## ⚠️ CRITICAL BUG FOUND:

### **GitHub Workflow Mismatch**:
```
.github/workflows/scrape-jobs.yml calls:
  node scripts/cleanup-jobs.js

But the actual file is:
  scripts/cleanup-jobs.ts

This will FAIL in GitHub Actions!
```

**Fix Required**: Either:
1. Change workflow to: `tsx scripts/cleanup-jobs.ts`, OR
2. Compile TypeScript to JS, OR  
3. Create a .js wrapper

---

## ✅ USED FILES (Keep):

### **Utils (actively imported)**:
- ✅ `ai-cost-manager.ts` - Used in send-scheduled-emails
- ✅ `consolidatedMatching.ts` - Core matching logic (3 imports)
- ✅ `emailVerification.ts` - Used in verify-email, webhook-tally
- ✅ `engagementTracker.ts` - Used in send-scheduled-emails, track-engagement
- ✅ `errorResponse.ts` - Used in create-checkout-session
- ✅ `job-queue.service.ts` - Used in send-scheduled-emails
- ✅ `productionRateLimiter.ts` - Used in checkout, re-engagement
- ✅ `stripe.ts` - Payment processing
- ✅ `supabase.ts` - Database client

### **Scripts (actively used)**:
- ✅ `automation/real-job-runner.cjs` - Main automation
- ✅ `scripts/jobspy-save.cjs` - JobSpy scraper
- ✅ `scripts/adzuna-categories-scraper.cjs` - Adzuna scraper
- ✅ `scripts/cleanup-jobs.ts` - Job cleanup (but has workflow bug!)

---

## 📊 SUMMARY:

**Total Dead Code**:
- 11 completely unused Utils files
- 15+ unused exports in lib/ files
- 1 critical workflow bug (cleanup-jobs.js vs .ts)

**Recommendation**:
1. 🔴 **CRITICAL**: Fix `.github/workflows/scrape-jobs.yml` to call `tsx scripts/cleanup-jobs.ts`
2. 🟡 **MEDIUM**: Delete 11 unused Utils files (saves ~2000+ LOC)
3. 🟢 **LOW**: Clean up unused lib/ exports (or comment as future use)

**Cleanup Impact**:
- Reduce codebase by ~2500 lines
- Improve build times
- Reduce confusion for new developers
- Fix critical GitHub Actions bug

