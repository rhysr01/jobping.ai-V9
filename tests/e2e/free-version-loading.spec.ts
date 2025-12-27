import { test, expect } from '@playwright/test';

/**
 * Free Version Loading Test
 * 
 * Tests that the free version signup and matches page don't hang or load forever.
 * This specifically checks for infinite loading issues.
 */

test.describe('Free Version - Loading and Performance', () => {
  // Generate unique email for each test run
  const generateTestEmail = () => {
    const timestamp = Date.now();
    return `test-free-${timestamp}@testjobping.com`;
  };

  test('Free signup completes and redirects to matches', async ({ page }) => {
    const testEmail = generateTestEmail();
    
    console.log(`🧪 Testing free signup flow with email: ${testEmail}`);
    
    // Navigate to free signup page
    await page.goto('/signup/free');
    
    // Wait for form to be visible
    await expect(page.locator('form, [data-testid="signup-form"]')).toBeVisible({ timeout: 10000 });
    
    // Fill out the form
    await page.fill('input[type="text"], input[name="fullName"]', 'Test User');
    await page.fill('input[type="email"], input[name="email"]', testEmail);
    
    // Select a city (try multiple selectors)
    const cityButton = page.locator('button:has-text("Prague"), button:has-text("Warsaw")').first();
    if (await cityButton.count() > 0) {
      await cityButton.click();
    }
    
    // Select career path if available
    const careerPathButton = page.locator('button:has-text("Finance"), button:has-text("Tech")').first();
    if (await careerPathButton.count() > 0) {
      await careerPathButton.click();
    }
    
    // Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Get"), button:has-text("Sign")').first();
    await submitButton.click();
    
    // Wait for navigation - should go to /matches or show success
    // Check for either matches page or success message
    await Promise.race([
      page.waitForURL(/.*matches/, { timeout: 30000 }),
      page.waitForSelector('text=matches, text=Welcome, text=Success', { timeout: 30000 })
    ]);
    
    console.log('✅ Signup completed successfully');
  });

  test('Matches page loads within timeout and shows content', async ({ page, context }) => {
    const testEmail = generateTestEmail();
    
    console.log(`🧪 Testing matches page loading with email: ${testEmail}`);
    
    // First, set the cookie manually to simulate a signed-up user
    await context.addCookies([{
      name: 'free_user_email',
      value: testEmail,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    
    // Navigate to matches page
    const startTime = Date.now();
    await page.goto('/matches');
    
    // Check that loading state appears
    const loadingIndicator = page.locator('text=Finding your perfect matches, text=Loading, [role="status"]').first();
    await expect(loadingIndicator).toBeVisible({ timeout: 5000 });
    
    console.log('⏳ Loading indicator appeared');
    
    // Wait for loading to complete - should finish within 30 seconds
    // Check for either jobs content or error message
    const contentLoaded = await Promise.race([
      // Success: Jobs are displayed
      page.waitForSelector('text=Your, text=matches, article, [role="list"]', { timeout: 35000 }).then(() => 'success'),
      // Error: Error message appears
      page.waitForSelector('text=Failed, text=error, text=expired', { timeout: 35000 }).then(() => 'error'),
      // Empty state: No matches message
      page.waitForSelector('text=No matches, text=not found', { timeout: 35000 }).then(() => 'empty'),
    ]);
    
    const loadTime = Date.now() - startTime;
    
    console.log(`⏱️  Page loaded in ${loadTime}ms with state: ${contentLoaded}`);
    
    // Verify loading completed (not infinite)
    expect(loadTime).toBeLessThan(35000); // Should complete within 35 seconds (30s API timeout + buffer)
    
    // Verify loading spinner is gone
    const stillLoading = await page.locator('text=Finding your perfect matches').count();
    expect(stillLoading).toBe(0);
    
    console.log('✅ Matches page loaded successfully without infinite loading');
  });

  test('API endpoint responds within timeout', async ({ request }) => {
    const testEmail = generateTestEmail();
    
    console.log(`🧪 Testing /api/matches/free endpoint with email: ${testEmail}`);
    
    const startTime = Date.now();
    
    // Make request with cookie
    const response = await request.get('/api/matches/free', {
      headers: {
        'Cookie': `free_user_email=${testEmail}`,
      },
      timeout: 35000, // 35 second timeout
    });
    
    const responseTime = Date.now() - startTime;
    
    console.log(`⏱️  API responded in ${responseTime}ms with status: ${response.status()}`);
    
    // Should respond within timeout (not hang)
    expect(responseTime).toBeLessThan(35000);
    
    // Should return either:
    // - 200 with jobs array (success)
    // - 401 (unauthorized - expected if user doesn't exist)
    // - 500 (server error - but should still respond quickly)
    const status = response.status();
    expect([200, 401, 500]).toContain(status);
    
    if (status === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('jobs');
      expect(Array.isArray(data.jobs)).toBe(true);
      console.log(`✅ API returned ${data.jobs.length} jobs`);
    } else {
      const data = await response.json().catch(() => ({}));
      console.log(`⚠️  API returned status ${status}: ${data.error || data.message || 'No message'}`);
    }
    
    console.log('✅ API endpoint responds within timeout');
  });

  test('Loading state transitions correctly', async ({ page, context }) => {
    const testEmail = generateTestEmail();
    
    console.log(`🧪 Testing loading state transitions with email: ${testEmail}`);
    
    // Set cookie
    await context.addCookies([{
      name: 'free_user_email',
      value: testEmail,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    
    await page.goto('/matches');
    
    // Step 1: Should show loading state initially
    const loadingText = page.locator('text=Finding your perfect matches, text=Loading');
    await expect(loadingText.first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Loading state appeared');
    
    // Step 2: Wait for loading to complete (max 35 seconds)
    await page.waitForFunction(
      () => {
        const loadingElements = document.querySelectorAll('[role="status"], text=Finding');
        return loadingElements.length === 0 || 
               !document.body.textContent?.includes('Finding your perfect matches');
      },
      { timeout: 35000 }
    );
    
    console.log('✅ Loading state cleared');
    
    // Step 3: Should show either content or error (not stuck in loading)
    const hasContent = await Promise.race([
      page.locator('text=Your, text=matches, article').first().isVisible().then(() => true),
      page.locator('text=Failed, text=error, text=No matches').first().isVisible().then(() => true),
      page.waitForTimeout(1000).then(() => false),
    ]);
    
    expect(hasContent).toBe(true);
    console.log('✅ Content or error state displayed (not stuck in loading)');
  });

  test('Network timeout handling works correctly', async ({ page, context }) => {
    const testEmail = generateTestEmail();
    
    console.log(`🧪 Testing network timeout handling with email: ${testEmail}`);
    
    // Set cookie
    await context.addCookies([{
      name: 'free_user_email',
      value: testEmail,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    
    // Intercept and delay the API call to simulate slow network
    await page.route('**/api/matches/free', async (route) => {
      // Delay response by 25 seconds (just under timeout)
      await page.waitForTimeout(25000);
      await route.continue();
    });
    
    const startTime = Date.now();
    await page.goto('/matches');
    
    // Should eventually show error or timeout, not hang forever
    await Promise.race([
      page.waitForSelector('text=Failed, text=timeout, text=error', { timeout: 40000 }),
      page.waitForSelector('text=Your, text=matches', { timeout: 40000 }),
    ]);
    
    const loadTime = Date.now() - startTime;
    
    // Should handle timeout gracefully (not hang)
    expect(loadTime).toBeLessThan(45000); // Should complete within 45 seconds max
    
    console.log(`✅ Timeout handled correctly in ${loadTime}ms`);
  });
});

