# Testing Principles

## Core Philosophy: Test Behavior, Not Implementation

### ✅ DO: Test Behavior and Outcomes
- Test what the code **does** from a user/business perspective
- Test the **outcome** of operations (return values, state changes)
- Test the **contract/API** (what inputs produce what outputs)
- Test **user-visible behavior** (what users experience)

### ❌ DON'T: Test Implementation Details
- Don't test specific internal function calls (`expect(mock.fn).toHaveBeenCalled()`)
- Don't test implementation-specific data structures (unless they're the contract)
- Don't test mock chains - test the final result
- Don't test internal variable values - test the observable outcome

## Examples

### ❌ Bad: Testing Implementation Details
```typescript
it("should call getDatabaseClient", async () => {
  await myFunction();
  expect(getDatabaseClient).toHaveBeenCalled(); // ❌ Tests how, not what
});

it("should have specific array values", () => {
  expect(config.days).toEqual(["Mon", "Wed", "Fri"]); // ❌ Tests implementation
});
```

### ✅ Good: Testing Behavior
```typescript
it("should successfully process request (behavior test)", async () => {
  const result = await myFunction();
  expect(result.status).toBe(200); // ✅ Tests outcome
  expect(result.data).toBeDefined();
});

it("should prevent free tier from receiving emails", () => {
  expect(isSendDay("free")).toBe(false); // ✅ Tests behavior
  expect(getSignupBonusJobs("free")).toBe(0); // ✅ Tests business logic
});
```

## When Testing Mocks

### ❌ Bad: Testing Mock Calls
```typescript
it("should update database", async () => {
  await unsubscribeUser(email);
  expect(mockSupabase.update).toHaveBeenCalled(); // ❌ Implementation detail
  expect(mockSupabase.insert).toHaveBeenCalled(); // ❌ Implementation detail
});
```

### ✅ Good: Testing Outcomes
```typescript
it("should successfully unsubscribe user", async () => {
  const result = await unsubscribeUser(email);
  expect(result).toBe(true); // ✅ Tests outcome - did it work?
});

it("should return false when unsubscribe fails", async () => {
  // Mock failure
  const result = await unsubscribeUser(email);
  expect(result).toBe(false); // ✅ Tests error handling behavior
});
```

## Testing Philosophy Checklist

Before writing/updating a test, ask:
1. **What behavior am I testing?** (What should the code do from a user perspective?)
2. **What's the observable outcome?** (What can I verify without knowing internals?)
3. **Would this test catch a regression?** (Would it fail if behavior broke?)
4. **Is this testing "how" or "what"?** (If "how", refactor to test "what")

## Remember
- Tests should be **maintainable** - they shouldn't break when refactoring internals
- Tests should be **readable** - they should document expected behavior
- Tests should be **reliable** - they should catch real bugs, not implementation changes
