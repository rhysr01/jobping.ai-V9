# ¯ OPTION A: FULL FIX IMPLEMENTATION PLAN

##  OVERVIEW:

**Total Time**: 6 hours over 3 weeks  
**Goal**: Migrate all 55 routes to standardized error handling + fix type safety gaps  
**Status**:  STARTING NOW

---

##  WEEK 1: CRITICAL ROUTES (2 hours)

### **Day 1: Error Handler Migration (1.5 hours)**

1. **`/api/webhook-tally/route.ts`** (30 min)  COMPLEX
   - 773 lines, multiple try/catch blocks
   - Strategy: Wrap main POST handler, keep internal try/catch
   - Test with: Mock Tally webhook payload

2. **`/api/subscribe/route.ts`** (20 min)
   - Simpler route, email subscription
   - Full asyncHandler migration
   - Test with: Email submission

3. **`/api/send-scheduled-emails/route.ts`** (40 min)  COMPLEX
   - Large route with email logic
   - Wrap main handler, keep internal error handling
   - Test with: Cron trigger

### **Day 2: Type Safety Fixes (30 min)**

4. **Fix `/app/api/match-users/route.ts` type gaps**
   - Line 129: `metrics: any` † create `MatchMetrics` interface
   - Line 719: `job: any` † use `Job` type from types
   - Line 789: `userProvenance: any` † create `MatchProvenance` interface
   - Lines 766-769: Debug logs (skip - acceptable)

---

##  WEEK 2: USER-FACING ROUTES (2 hours)

### **High-Traffic Routes (1 hour)**

5. **`/api/dashboard/route.ts`** (15 min)
   - User dashboard data
   - Full migration

6. **`/api/apply-promo/route.ts`** (15 min)
   - Promo code application
   - Full migration

7. **`/api/sample-email-preview/route.ts`** (15 min)
   - Email preview generation
   - Full migration

8. **`/api/health/route.ts`** (15 min)
   - Health check endpoint
   - Full migration

### **Additional Routes (1 hour)**

9. **`/api/scrape/*/route.ts`** (Various scrapers)
   - Adzuna, Reed, Greenhouse
   - Template-based migration

10. **`/api/redirect-to-job/route.ts`**
    - Job URL redirect
    - Simple migration

---

##  WEEK 3: ADMIN & CRON ROUTES (2 hours)

### **Admin Routes (1 hour)**

11. **`/api/admin/cleanup-jobs/route.ts`**
12. **`/api/admin/*/route.ts`** (Any others)
    - Batch migration
    - Less critical, can be more aggressive

### **Cron Routes (30 min)**

13. **`/api/cron/process-ai-matching/route.ts`**
14. **`/api/cron/*/route.ts`** (Any others)
    - Batch migration

### **Verification & Testing (30 min)**

15. **Run full test suite**
    - Verify no regressions
    - Test critical user flows
    - Update documentation

---

##  MIGRATION TEMPLATES:

### **Template A: Simple Route (Most routes)**

```typescript
// BEFORE
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // ... logic ...
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// AFTER
import { asyncHandler, ValidationError } from '@/lib/errors';

export const POST = asyncHandler(async (req: NextRequest) => {
  const body = await req.json();
  if (!body.requiredField) {
    throw new ValidationError('Missing required field');
  }
  // ... logic ...
  return NextResponse.json({ success: true });
});
```

### **Template B: Complex Route (webhook-tally, send-emails)**

```typescript
// BEFORE
export async function POST(req: NextRequest) {
  try {
    // Complex logic with internal try/catch blocks
    try {
      // Sub-operation
    } catch (subError) {
      // Handle sub-error
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// AFTER
import { asyncHandler, ValidationError, AppError } from '@/lib/errors';

export const POST = asyncHandler(async (req: NextRequest) => {
  // Complex logic with internal try/catch blocks
  try {
    // Sub-operation
  } catch (subError) {
    // Log but don't throw (let main handler continue)
    console.error('Sub-operation failed:', subError);
    // Or throw AppError if should fail
  }
  
  return NextResponse.json({ success: true });
  // Any unhandled errors auto-caught by asyncHandler
});
```

---

##  PROGRESS TRACKING:

### **Week 1: Critical Routes**
- [ ] webhook-tally (30 min)
- [ ] subscribe (20 min)
- [ ] send-scheduled-emails (40 min)
- [ ] match-users type fixes (30 min)

**Subtotal**: 2 hours

### **Week 2: User Routes**
- [ ] dashboard (15 min)
- [ ] apply-promo (15 min)
- [ ] sample-email-preview (15 min)
- [ ] health (15 min)
- [ ] scrape routes (45 min)
- [ ] redirect-to-job (15 min)

**Subtotal**: 2 hours

### **Week 3: Admin & Verification**
- [ ] admin routes (1 hour)
- [ ] cron routes (30 min)
- [ ] testing & verification (30 min)

**Subtotal**: 2 hours

**Grand Total**: 6 hours

---

##  SUCCESS CRITERIA:

1. **All 55+ routes use asyncHandler**
2. **Consistent error responses across all APIs**
3. **All tests passing**
4. **No production regressions**
5. **Documentation updated**

---

##  GETTING STARTED:

**Right now**: Start with webhook-tally (most complex first!)

**Testing Strategy**:
- Unit tests for each migrated route
- Integration tests for critical flows
- Manual testing in development
- Staged rollout if possible

**Rollback Plan**:
- Git commits per route migration
- Easy to revert individual routes if issues
- Keep old pattern in comments temporarily

---

##  NOTES:

**Why asyncHandler is better**:
1.  Consistent error logging
2.  Structured error responses
3.  Automatic error handling
4.  Less boilerplate
5.  Type-safe error classes

**Special Considerations**:
- webhook-tally: Keep internal try/catch for sub-operations
- send-scheduled-emails: Keep internal error handling
- Admin routes: Can be more aggressive (less critical)
- Scraper routes: May need different error handling

**Let's go!** ¯

