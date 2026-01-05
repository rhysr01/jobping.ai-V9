# Database Optimization Progress

**Date:** January 2025  
**Status:** 🟡 **IN PROGRESS**

---

## ✅ COMPLETED

### SELECT \* Replacement - Count Queries

**Fixed Files:**

- ✅ `app/api/dashboard/route.ts` - 3 queries fixed
- ✅ `app/api/stats/route.ts` - 4 queries fixed

**Pattern Applied:**

```typescript
// Before
.select("*", { count: "exact", head: true })

// After
.select("id", { count: "exact", head: true })
```

**Impact:** Reduced data transfer for count-only queries (head: true means no data returned, only count)

---

## 🟡 IN PROGRESS

### SELECT \* Replacement - Data Queries

**Remaining Files:** 13 files

**Files to Fix:**

1. `app/api/process-embedding-queue/route.ts`
2. `app/api/signup/free/route.ts`
3. `app/api/signup/route.ts`
4. `app/api/preview-matches/route.ts`
5. `app/api/matches/ghost/route.ts`
6. `app/api/cron/process-scraping-queue/route.ts`
7. `app/api/send-scheduled-emails/route.ts`
8. `app/api/resend-email/route.ts`
9. `app/api/preferences/route.ts`
10. `app/api/cron/process-digests/route.ts`
11. `app/api/generate-embeddings/route.ts`
12. `app/api/feedback/enhanced/route.ts`
13. `app/api/billing/route.ts`

**Pattern to Apply:**

```typescript
import { JOB_COLUMNS, USER_COLUMNS, MATCH_COLUMNS } from "@/Utils/database/columns";

// For job queries
.select(JOB_COLUMNS.minimal)  // or .standard or .full

// For user queries
.select(USER_COLUMNS.minimal)  // or .standard or .full

// For match queries
.select(MATCH_COLUMNS.minimal)  // or .standard or .full
```

**Estimated Time:** 2-3 hours

---

## ⏳ PENDING

### N+1 Query Pattern Audit

**Status:** Needs manual audit

**What to Look For:**

```typescript
// BAD: N+1 pattern
for (const job of jobs) {
  const { data: company } = await supabase
    .from("companies")
    .select("visa_sponsorship")
    .eq("id", job.company_id)
    .single();
}

// GOOD: Single query with join
const { data: jobsWithCompanies } = await supabase
  .from("jobs")
  .select(
    `
    *,
    company:companies(visa_sponsorship, name, size)
  `,
  )
  .in("id", jobIds);
```

**Files to Audit:**

- `Utils/matching/consolidated/engine.ts`
- `app/api/match-users/handlers/orchestration.ts`
- `Utils/matching/semanticRetrieval.ts`
- `Utils/matching/guaranteed/coordinator.ts`

**Estimated Time:** 3-4 hours

---

## 📊 Metrics

### Before Optimization

- **SELECT \* queries:** 23+ instances
- **Count queries with SELECT \*:** 7 instances

### After Optimization (Current)

- **SELECT \* queries:** 13 instances remaining
- **Count queries fixed:** 7/7 (100%)

### Target

- **SELECT \* queries:** 0 instances
- **N+1 patterns:** 0 instances

---

## 🎯 Next Steps

1. **Continue SELECT \* replacement** (2-3 hours)
   - Review each of the 13 remaining files
   - Determine appropriate column set
   - Replace and test

2. **Audit N+1 queries** (3-4 hours)
   - Review matching logic
   - Identify patterns
   - Refactor to joins

3. **Add query performance monitoring** (1 hour)
   - Log slow queries
   - Track query patterns
   - Monitor database performance

---

**Last Updated:** January 2025
