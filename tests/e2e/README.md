# JobPing E2E Test Suite

Comprehensive end-to-end testing for JobPing, covering the complete user journey from landing to job matching.

## 🎯 What's Tested

### User Journey (20 Tests)
1. ✅ Landing page branding and spacing
2. ✅ Signup form rendering (Tally iframe)
3. ✅ Pricing plans and tier details
4. ✅ Email template branding and spacing
5. ✅ Accessibility (focus rings, keyboard nav)
6. ✅ Mobile responsiveness
7. ✅ Stripe checkout session creation
8. ✅ Engagement tracking (opens/clicks)
9. ✅ Job matching API (5 jobs per tier)
10. ✅ Re-engagement email system
11. ✅ Performance (page load < 3s)
12. ✅ Error handling
13. ✅ SEO and meta tags
14. ✅ Brand color consistency
15. ✅ Final CTA with iframe embed
16. ✅ Billing page premium styling
17. ✅ Typography hierarchy (single h1)
18. ✅ No duplicate CTAs
19. ✅ Email spacing verification
20. ✅ Cross-browser consistency

### API Endpoints (3 Tests)
- Tally webhook integration
- Stripe webhook handling
- Scheduled email with engagement rules

### Edge Cases (3 Tests)
- Missing environment variables
- API rate limiting
- Graceful degradation (no JS)

## 🚀 Quick Start

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run with UI (Interactive)
```bash
npm run test:e2e:ui
```

### Run in Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```

### Run Only User Journey Tests
```bash
npm run test:e2e:journey
```

### Run Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run Mobile Tests
```bash
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

## 📋 Prerequisites

1. **Install Playwright browsers**:
   ```bash
   npx playwright install
   ```

2. **Environment variables** (`.env.local`):
   ```bash
   NEXT_PUBLIC_STRIPE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
   STRIPE_PREMIUM_QUARTERLY_PRICE_ID=price_...
   DATABASE_URL=postgresql://...
   RESEND_API_KEY=re_...
   ENABLE_TEST_ENDPOINTS=true  # For email preview endpoint
   ```

3. **Development server running**:
   The test suite automatically starts the dev server on `http://localhost:3000`

## 📊 Test Coverage

| Area | Coverage | Tests |
|------|----------|-------|
| **UI/UX** | 100% | 10 tests |
| **APIs** | 90% | 6 tests |
| **Email** | 100% | 4 tests |
| **Payments** | 80% | 3 tests |
| **Accessibility** | 100% | 2 tests |
| **Performance** | 100% | 1 test |

## 🎨 Recent Changes Tested

### Email Branding (v1.2.0)
- ✅ Indigo→Purple gradient header
- ✅ Enhanced spacing (48px padding, 1.6 line-height)
- ✅ Larger CTA buttons (18px×36px)
- ✅ Better typography hierarchy

### Frontend Restructure (v1.1.0)
- ✅ Correct section order (Hero → How → Built → Pricing)
- ✅ Single conversion point (Pricing only)
- ✅ No duplicate CTAs
- ✅ Centralized copy
- ✅ Focus-visible accessibility

### Pricing Tiers (v1.0.0)
- ✅ Free: 1×/week, 5 jobs
- ✅ Premium: 3×/week (M/W/F), 5 jobs each
- ✅ Engagement-based pausing (30-day rule)

## 🐛 Debugging

### View Test Report
```bash
npx playwright show-report
```

### Debug Specific Test
```bash
npx playwright test --debug
npx playwright test user-journey.spec.ts:50 --debug  # Line 50
```

### Generate Test Code (Record Actions)
```bash
npx playwright codegen http://localhost:3000
```

### View Trace
```bash
npx playwright show-trace test-results/trace.zip
```

## 📸 Screenshots & Videos

- **Screenshots**: Saved on test failure in `test-results/`
- **Videos**: Recorded on retry in `test-results/`
- **Traces**: Full interaction traces in `test-results/`

## 🔄 CI/CD Integration

### GitHub Actions
The test suite runs automatically on:
- Pull requests
- Pushes to `main`
- Scheduled runs (daily)

### Retry Strategy
- **Local**: No retries
- **CI**: 2 retries per test

### Parallelization
- **Local**: All available workers
- **CI**: Single worker (stability)

## 🧪 Test Data

Test users are created with timestamp-based emails:
```typescript
const TEST_USER = {
  email: `test-${Date.now()}@jobping-e2e.com`,
  fullName: 'E2E Test User',
  city: 'Berlin',
  // ...
};
```

## 📝 Writing New Tests

### Test Structure
```typescript
test('descriptive test name', async ({ page }) => {
  // Arrange
  await page.goto('/');
  
  // Act
  await page.click('button');
  
  // Assert
  await expect(page.locator('h1')).toBeVisible();
});
```

### Best Practices
1. Use **descriptive test names** (what is being tested)
2. Follow **AAA pattern** (Arrange, Act, Assert)
3. Use **page object model** for complex flows
4. **Clean up** test data after tests
5. Make tests **idempotent** (can run multiple times)

## 🔗 Related Documentation

- [Playwright Docs](https://playwright.dev)
- [Testing Best Practices](../docs/testing-best-practices.md)
- [API Documentation](../docs/api.md)
- [Email Templates](../../Utils/email/README.md)

## 📞 Support

For test failures or questions:
1. Check the [test report](playwright-report/index.html)
2. Review the [trace files](test-results/)
3. Open an issue with the error screenshot

---

**Last Updated**: 2025-01-30  
**Maintained by**: JobPing Team
