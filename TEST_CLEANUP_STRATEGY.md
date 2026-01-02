# Test Cleanup Strategy

## Current State
- **165 test files** total
- **60 files** contain `toHaveBeenCalled` (testing implementation details)
- **229 instances** of `toHaveBeenCalled` across all tests

## Strategy: Refactor > Delete

### ✅ REFACTOR (Priority 1 - High Value Tests)
These tests verify important behavior but use implementation details. Convert to behavior tests:

1. **API Route Tests** - Test outcomes (status codes, response data) instead of internal calls
   - `__tests__/api/status.test.ts` - Test health status, not `getDatabaseClient` calls
   - `__tests__/api/featured-jobs.test.ts` - Test job data returned, not DB calls
   - `__tests__/api/dashboard.test.ts` - Test dashboard data, not internal calls
   - `__tests__/api/cleanup-jobs.test.ts` - Test cleanup results, not DB operations

2. **Database Utility Tests** - Test results, not function calls
   - `__tests__/Utils/supabase-utilities.test.ts` - Test return values, not calls
   - `__tests__/Utils/databasePool.test.ts` - Test client availability, not creation

3. **Email/Webhook Tests** - Test outcomes, not internal operations
   - `__tests__/api/webhooks-resend.test.ts` - Test webhook processing results
   - `__tests__/Utils/email/deliverability-comprehensive.test.ts` - Already partially refactored

### ⚠️ REVIEW (Priority 2 - May Need Refactoring)
These might be testing legitimate behavior through mocks, but need review:

1. **Matching Service Tests** - Check if testing behavior or implementation
   - `__tests__/Utils/matching/integrated-matching-extended.test.ts`
   - `__tests__/Utils/matching/embedding-extended.test.ts`
   - `__tests__/Utils/matching/semanticRetrieval-comprehensive.test.ts`

2. **Logger/Monitoring Tests** - May be testing side effects (logging) which is legitimate
   - `__tests__/Utils/monitoring/logger-extended.test.ts` - Logging IS observable behavior

### ❌ DELETE (Priority 3 - Low Value/Redundant)
Only delete if:
- Test has no observable behavior to verify
- Test is redundant (same behavior tested elsewhere)
- Test is testing implementation that can't be converted

**Candidates for deletion:**
- Tests that ONLY check `getDatabaseClient` was called (no other assertions)
- Tests that verify mock setup but don't test behavior
- Duplicate tests (same behavior tested in multiple files)

## Action Plan

### Phase 1: Quick Wins (Refactor Simple Cases)
1. Fix the 6 files that only test `getDatabaseClient` calls:
   - `__tests__/api/status.test.ts`
   - `__tests__/api/featured-jobs.test.ts`
   - `__tests__/api/dashboard.test.ts`
   - `__tests__/api/cleanup-jobs.test.ts`
   - `__tests__/Utils/supabase-utilities.test.ts`
   - `__tests__/api/webhooks-resend.test.ts`

### Phase 2: Systematic Review
1. For each file with `toHaveBeenCalled`:
   - Can it be converted to test behavior? → Refactor
   - Is it testing legitimate side effects (logging, metrics)? → Keep as-is
   - Is it redundant or testing nothing? → Delete

### Phase 3: Document Exceptions
Some tests legitimately need to verify internal calls:
- **Logger tests** - Logging IS the behavior
- **Metrics tests** - Metrics collection IS the behavior
- **Cache tests** - Cache hits/misses ARE the behavior

## Decision Tree

```
Does the test verify observable behavior?
├─ YES → Can it be tested without checking internal calls?
│   ├─ YES → Refactor to test outcome
│   └─ NO → Keep (e.g., logging, metrics, cache)
└─ NO → Does it test anything useful?
    ├─ YES → Refactor to test behavior
    └─ NO → DELETE
```

## Metrics to Track
- Files refactored: ___
- Files deleted: ___
- Tests improved: ___
- Test coverage maintained: ___
