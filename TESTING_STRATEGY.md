# Testing Strategy Guide

**Reference this document before writing, running, or modifying tests.**

## 🎯 Current Status
- **Test Pass Rate:** ~85% (1,655 passed / 1,951 total)
- **Test Suites:** 165 of 168 total (3 skipped)
- **Coverage:** 41.05% statements | 29.38% branches | 45.21% functions | 41.07% lines

## ❌ Problems with Current Tests

### 1. **Too Many Brittle Unit Tests**
- Tests break when implementation changes (not when functionality breaks)
- Complex mocking chains that are hard to maintain
- Tests that verify implementation details, not business value

### 2. **Integration Tests Require Extensive Setup**
- Database mocks that don't match real Supabase behavior
- External service mocks that drift from actual APIs
- Tests that are slow and flaky

### 3. **Poor Test-to-Code Ratio**
- Spending 50%+ of development time fixing/maintaining tests
- Tests that don't catch real bugs
- False confidence from high pass rates

### 4. **Wrong Focus Areas**
- Testing implementation details instead of user behavior
- Over-testing utility functions, under-testing critical paths
- No clear prioritization of what to test

## ✅ Optimal Testing Strategy

### 🏗️ Testing Pyramid for Job Matching Platform

```
E2E Tests (5-10%)
├── Critical user journeys (signup → match → apply)
├── Payment flows
├── Job matching end-to-end

Integration Tests (15-20%)
├── API contract tests
├── Database operations
├── External service integrations (Stripe, Resend, OpenAI)

Unit Tests (75-80%)
├── Pure business logic (matching algorithms)
├── Utility functions
├── Data transformations
└── Core validation logic
```

### 📋 Test Categories & Guidelines

## 1. 🔗 Contract Testing for APIs

**Purpose:** Test API contracts, not internal implementation.

### ✅ Good Examples

```typescript
describe("Match Users API", () => {
  it("should return matches for valid user preferences", async () => {
    const request = buildValidUserPreferences();
    const response = await callMatchUsersAPI(request);

    expect(response.success).toBe(true);
    expect(Array.isArray(response.data.matches)).toBe(true);
    expect(response.data.matches[0]).toHaveProperty("job_hash");
    expect(response.data.matches[0]).toHaveProperty("match_score");
  });

  it("should return 400 for invalid preferences", async () => {
    const request = buildInvalidUserPreferences();
    const response = await callMatchUsersAPI(request);

    expect(response.status).toBe(400);
    expect(response.error).toContain("validation");
  });
});
```

### ❌ Bad Examples (Delete These)

```typescript
// Tests internal Supabase calls
it("should call Supabase with correct table name", () => {
  // ...
});

// Tests private methods
it("should call _validateUserPreferences with correct params", () => {
  // ...
});

// Complex mocking chains
jest.mock("supabaseClient");
jest.mock("matchingEngine");
// ... 15 more mocks
```

**Criteria for Deletion:** Any test that mocks internal functions or verifies implementation details.

## 2. 🗄️ Integration Tests with Real Database

**Purpose:** Test complete workflows with real database operations.

### ✅ Good Examples

```typescript
describe("User Registration Flow", () => {
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await createTestDatabase();
  });

  it("should create user and store preferences", async () => {
    const userData = buildUserRegistrationData();
    const userId = await registerUser(userData);

    const storedUser = await testDb.getUserById(userId);
    expect(storedUser.email).toBe(userData.email);
    expect(storedUser.preferences).toEqual(userData.preferences);
  });
});
```

### ❌ Bad Examples (Delete These)

```typescript
// Complex Supabase mocks
const mockSupabase = {
  from: () => ({
    select: () => ({
      eq: () => ({
        data: mockData,
        error: null
      })
    })
  })
};
```

**Criteria for Deletion:** Tests with extensive database mocking instead of using test database.

## 3. 🎲 Property-Based Testing for Business Logic

**Purpose:** Test algorithms with generated edge cases.

### ✅ Good Examples

```typescript
import { fc } from 'fast-check';

describe("Job Matching Algorithm", () => {
  it("should always return valid match scores", () => {
    fc.assert(
      fc.property(
        fc.record({
          job: jobArbitrary,
          user: userPreferencesArbitrary
        }),
        ({ job, user }) => {
          const result = calculateMatchScore(job, user);
          return result.score >= 0 &&
                 result.score <= 100 &&
                 typeof result.reason === 'string';
        }
      )
    );
  });

  it("should handle edge cases gracefully", () => {
    fc.assert(
      fc.property(
        fc.record({
          job: malformedJobArbitrary,
          user: malformedUserArbitrary
        }),
        ({ job, user }) => {
          const result = calculateMatchScore(job, user);
          // Should not throw, should return sensible defaults
          return !isNaN(result.score);
        }
      )
    );
  });
});
```

**Criteria for Deletion:** Simple input/output tests that don't cover edge cases.

## 4. 🌐 E2E Tests for Critical Paths

**Purpose:** Test complete user journeys that matter most to business.

### ✅ Good Examples

```typescript
describe("Job Application Critical Path", () => {
  it("should allow user to signup, get matches, and apply", async () => {
    // Use Playwright or similar
    await page.goto('/signup');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="preferences"]', validPreferences);
    await page.click('[data-testid="signup-button"]');

    // Should redirect to matches
    await page.waitForURL('/matches');
    expect(await page.locator('[data-testid="job-card"]').count()).toBeGreaterThan(0);

    // Apply to first job
    await page.click('[data-testid="apply-button"]:first-child');
    await page.waitForURL('/application-success');
  });
});
```

**Critical Paths to Test:**
1. User signup → preferences → first matches
2. Job matching → application → confirmation
3. Payment flow (if applicable)
4. Email notifications
5. Password reset

**Criteria for Deletion:** Tests that duplicate integration test coverage.

## 🗑️ Test Deletion Criteria

### Delete Immediately:
- Tests that only verify implementation details
- Tests with complex mocking chains (>5 mocks)
- Tests that break on every refactor
- Tests that take >5 seconds to run
- Tests that don't catch real bugs
- Duplicate tests

### Keep But Improve:
- Tests that verify important business rules
- Tests that prevent regression bugs
- Tests that are fast and reliable
- Tests that cover edge cases

### Questions to Ask:
1. **Does this test verify business value or implementation details?**
2. **Would a user care if this test fails?**
3. **Does this test catch bugs that would affect users?**
4. **Is this test fast and reliable?**
5. **Is there a simpler way to test this behavior?**

## 🛠️ Test Maintenance Checklist

### Before Writing Tests:
- [ ] Read this guide
- [ ] Identify which testing level (Unit/Integration/E2E)
- [ ] Ensure test adds business value
- [ ] Check if similar test already exists

### During Test Runs:
- [ ] Run `npm test` to check current status
- [ ] Delete failing tests that don't provide value
- [ ] Skip complex tests temporarily if blocking progress
- [ ] Update README coverage stats

### After Code Changes:
- [ ] Run affected tests
- [ ] Delete tests that no longer provide value
- [ ] Update mocks only if absolutely necessary
- [ ] Consider integration tests over complex unit tests

## 📊 Quality Metrics to Track

### Primary Metrics:
- **Mutation Test Score:** >80% (tests catch actual bugs)
- **Test Execution Time:** <5 minutes for full suite
- **Test Maintenance Time:** <20% of development time

### Secondary Metrics:
- **Lines of Test Code per Production Code:** <1:1 ratio
- **Test Reliability:** >95% pass rate consistently
- **Business Logic Coverage:** >90% of critical paths

## 🔧 Tools & Setup

### Recommended Tools:
- **fast-check** for property-based testing
- **testcontainers** for integration test databases
- **Playwright** for E2E tests
- **Jest** with minimal mocking

### Test Database Setup:
```bash
# Use testcontainers or local test DB
# Avoid complex Supabase mocks
```

### CI/CD Integration:
```yaml
# Run tests in order: unit → integration → e2e
# Fail fast on critical path failures
# Skip flaky tests automatically
```

## 📝 Examples in This Codebase

### Good Tests to Keep:
- `Utils/matching/validators.test.ts` - Tests business logic
- `api/tracking-implicit.test.ts` - Simple contract test
- `Utils/embedding-extended.test.ts` - Focused on core functionality

### Tests to Delete/Refactor:
- `api/stats.test.ts` - Overly complex mocking
- `integration/api/match-users.test.ts` - Too complex for integration
- `Utils/databasePool-comprehensive.test.ts` - Tests implementation details

## 🎯 Next Steps

1. **Audit existing tests** - Delete 30-50% of low-value tests
2. **Set up test database** - Replace complex mocks with real DB tests
3. **Add property-based tests** - For matching algorithms
4. **Create comprehensive E2E tests** - For critical user journeys (Free + Premium tiers)
5. **Establish test review process** - Code reviews must include test strategy

---

**Remember:** Tests should give confidence that the system works for users, not that the code is implemented a certain way. Focus on behavior, not implementation details.
