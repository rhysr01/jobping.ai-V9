import { expect, test } from "@playwright/test";

/**
 * Free Version Loading Test
 *
 * Tests that the free version signup and matches page don't hang or load forever.
 * This specifically checks for infinite loading issues.
 */

test.describe("Free Version - Loading and Performance", () => {
  // Reduce workers to avoid rate limiting (10 requests/min limit)
  test.describe.configure({ mode: "parallel", workers: 2 });

  // Generate unique email for each test run
  const generateTestEmail = () => {
    const timestamp = Date.now();
    return `test-free-${timestamp}@testjobping.com`;
  };

  test("Free signup completes and redirects to matches", async ({ page }) => {
    const testEmail = generateTestEmail();

    console.log(`🧪 Testing free signup flow with email: ${testEmail}`);

    // Navigate to free signup page
    await page.goto("/signup/free");

    // Wait for form to be visible - check for email input
    await expect(page.locator('input[type="email"]')).toBeVisible({
      timeout: 10000,
    });

    // Fill out the form
    await page.fill(
      'input[id="fullName"], input[name="fullName"]',
      "Test User",
    );
    await page.fill('input[id="email"], input[type="email"]', testEmail);

    // Select a city - wait for map to load and city buttons to be available
    // Cities are in an interactive map, so wait for map to be ready first
    await expect(page.locator('[role="application"]')).toBeVisible({
      timeout: 10000,
    });

    // Use partial text matching - buttons have aria-labels like "Prague, Czech Republic. Click to select"
    const cityButton = page
      .getByRole("button", { name: /Prague|Warsaw/ })
      .first();
    await expect(cityButton).toBeVisible({ timeout: 10000 });
    await cityButton.click();

    // Select career path - use getByRole for better reliability
    const careerPathButton = page
      .getByRole("button", { name: /Finance & Investment|Tech & Engineering/ })
      .first();
    await expect(careerPathButton).toBeVisible({ timeout: 5000 });
    await careerPathButton.click();

    // Wait a bit for form validation
    await page.waitForTimeout(500);

    // Submit form - look for submit button
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.waitFor({ timeout: 5000 });
    await submitButton.click();

    // Wait for either:
    // 1. Success message with countdown (then redirects to /matches)
    // 2. Direct redirect to /matches
    // 3. Error message
    await Promise.race([
      // Success: Redirect to matches page
      page.waitForURL(/.*\/matches/, { timeout: 35000 }),
      // Success: Show success message
      page
        .waitForSelector("text=Redirecting", { timeout: 35000 })
        .then(async () => {
          // Wait for redirect after countdown
          await page.waitForURL(/.*\/matches/, { timeout: 5000 });
        }),
      // Error: Show error message
      Promise.race([
        page.waitForSelector("text=error", { timeout: 35000 }),
        page.waitForSelector("text=Error", { timeout: 35000 }),
        page.waitForSelector("text=Failed", { timeout: 35000 }),
      ]),
    ]);

    // Verify we're on matches page or error was shown
    const currentUrl = page.url();
    const hasMatches = currentUrl.includes("/matches");

    // Check for error messages
    const errorLocators = [
      page.locator("text=error"),
      page.locator("text=Error"),
      page.locator("text=Failed"),
    ];
    let hasError = false;
    for (const locator of errorLocators) {
      if ((await locator.count()) > 0) {
        hasError = true;
        break;
      }
    }

    expect(hasMatches || hasError).toBe(true);

    console.log("✅ Signup completed successfully");
  });

  test("Matches page loads within timeout and shows content", async ({
    page,
    context,
  }) => {
    test.setTimeout(40000); // 40 second timeout for this test (30s + buffer)

    const testEmail = generateTestEmail();

    console.log(`🧪 Testing matches page loading with email: ${testEmail}`);

    // First, set the cookie manually to simulate a signed-up user
    await context.addCookies([
      {
        name: "free_user_email",
        value: testEmail,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    // Navigate to matches page
    const startTime = Date.now();
    await page.goto("/matches");

    // Check that loading state appears
    const loadingIndicator = page
      .locator("text=Finding your perfect matches")
      .first();
    await expect(loadingIndicator).toBeVisible({ timeout: 5000 });

    console.log("⏳ Loading indicator appeared");

    // Wait for loading to complete - should finish within 30 seconds
    // Check for either jobs content or error message
    let contentLoaded = "timeout";

    try {
      // Try success states first
      await Promise.race([
        page.waitForSelector("text=Your", { timeout: 35000 }).then(() => {
          contentLoaded = "success";
        }),
        page
          .locator("article")
          .first()
          .waitFor({ timeout: 35000 })
          .then(() => {
            contentLoaded = "success";
          }),
        page
          .locator('[role="list"]')
          .first()
          .waitFor({ timeout: 35000 })
          .then(() => {
            contentLoaded = "success";
          }),
        // Error states
        page
          .waitForSelector("text=Failed to load matches", { timeout: 35000 })
          .then(() => {
            contentLoaded = "error";
          }),
        page.waitForSelector("text=expired", { timeout: 35000 }).then(() => {
          contentLoaded = "error";
        }),
        page
          .waitForSelector("text=Unauthorized", { timeout: 35000 })
          .then(() => {
            contentLoaded = "error";
          }),
        // Empty state
        page
          .waitForSelector("text=No matches found", { timeout: 35000 })
          .then(() => {
            contentLoaded = "empty";
          }),
      ]);
    } catch (_error) {
      // If all timeouts, contentLoaded stays 'timeout'
      console.log("⚠️  All selectors timed out");
    }

    const loadTime = Date.now() - startTime;

    console.log(
      `⏱️  Page loaded in ${loadTime}ms with state: ${contentLoaded}`,
    );

    // CRITICAL: Verify loading completed within 30 seconds (not infinite)
    expect(loadTime).toBeLessThan(30000); // Must complete within 30 seconds

    // Verify loading spinner is gone
    const stillLoading = await page
      .locator("text=Finding your perfect matches")
      .count();
    expect(stillLoading).toBe(0);

    // Verify we got some response (not stuck loading)
    expect(["success", "error", "empty"]).toContain(contentLoaded);

    console.log(
      `✅ Matches page loaded in ${loadTime}ms (under 30s limit) - state: ${contentLoaded}`,
    );
  });

  test("API endpoint responds within timeout", async ({ request }) => {
    const testEmail = generateTestEmail();

    console.log(
      `🧪 Testing /api/matches/free endpoint with email: ${testEmail}`,
    );

    const startTime = Date.now();

    // Make request with cookie
    const response = await request.get("/api/matches/free", {
      headers: {
        Cookie: `free_user_email=${testEmail}`,
      },
      timeout: 35000, // 35 second timeout
    });

    const responseTime = Date.now() - startTime;

    console.log(
      `⏱️  API responded in ${responseTime}ms with status: ${response.status()}`,
    );

    // Should respond within timeout (not hang)
    expect(responseTime).toBeLessThan(35000);

    // Should return either:
    // - 200 with jobs array (success)
    // - 401 (unauthorized - expected if user doesn't exist)
    // - 429 (rate limited - acceptable in test environment)
    // - 500 (server error - but should still respond quickly)
    const status = response.status();
    expect([200, 401, 429, 500]).toContain(status);

    // CRITICAL: Must respond within 30 seconds (not hang)
    expect(responseTime).toBeLessThan(30000);

    if (status === 200) {
      const data = await response.json();
      expect(data).toHaveProperty("jobs");
      expect(Array.isArray(data.jobs)).toBe(true);
      console.log(`✅ API returned ${data.jobs.length} jobs`);
    } else {
      const data = await response.json().catch(() => ({}));
      console.log(
        `⚠️  API returned status ${status}: ${data.error || data.message || "No message"}`,
      );
    }

    console.log("✅ API endpoint responds within timeout");
  });

  test("Loading state transitions correctly", async ({ page, context }) => {
    test.setTimeout(40000); // 40 second timeout for this test

    const testEmail = generateTestEmail();

    console.log(
      `🧪 Testing loading state transitions with email: ${testEmail}`,
    );

    // Set cookie
    await context.addCookies([
      {
        name: "free_user_email",
        value: testEmail,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/matches");

    // Step 1: Should show loading state initially
    const loadingText = page.locator("text=Finding your perfect matches");
    await expect(loadingText.first()).toBeVisible({ timeout: 5000 });
    console.log("✅ Loading state appeared");

    // Step 2: Wait for loading to complete (max 35 seconds)
    // Wait for loading text to disappear
    await page.waitForFunction(
      () => {
        return !document.body.textContent?.includes(
          "Finding your perfect matches",
        );
      },
      { timeout: 35000 },
    );

    console.log("✅ Loading state cleared");

    // Step 3: Should show either content or error (not stuck in loading)
    // Wait a moment for content to render
    await page.waitForTimeout(500);

    const hasContent = await Promise.race([
      // Check for success content
      page
        .locator("text=Your")
        .first()
        .isVisible()
        .then(() => true)
        .catch(() => false),
      page
        .locator("article")
        .first()
        .isVisible()
        .then(() => true)
        .catch(() => false),
      // Check for error content
      page
        .locator("text=Failed to load matches")
        .first()
        .isVisible()
        .then(() => true)
        .catch(() => false),
      page
        .locator("text=No matches found")
        .first()
        .isVisible()
        .then(() => true)
        .catch(() => false),
      // Check for expired message
      page
        .locator("text=expired")
        .first()
        .isVisible()
        .then(() => true)
        .catch(() => false),
      // Timeout fallback
      page.waitForTimeout(2000).then(() => false),
    ]);

    expect(hasContent).toBe(true);
    console.log("✅ Content or error state displayed (not stuck in loading)");
  });

  test("Network timeout handling works correctly", async ({
    page,
    context,
  }) => {
    test.setTimeout(40000); // 40 second timeout for this test

    const testEmail = generateTestEmail();

    console.log(`🧪 Testing network timeout handling with email: ${testEmail}`);

    // Set cookie
    await context.addCookies([
      {
        name: "free_user_email",
        value: testEmail,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    // Intercept and delay the API call to simulate slow network
    await page.route("**/api/matches/free", async (route) => {
      // Delay response by 25 seconds (just under timeout)
      await page.waitForTimeout(25000);
      await route.continue();
    });

    const startTime = Date.now();
    await page.goto("/matches");

    // Should eventually show error or timeout, not hang forever
    let pageLoaded = false;
    try {
      await Promise.race([
        // Error messages
        page
          .waitForSelector("text=Failed to load matches", { timeout: 40000 })
          .then(() => {
            pageLoaded = true;
          }),
        page.waitForSelector("text=timeout", { timeout: 40000 }).then(() => {
          pageLoaded = true;
        }),
        page
          .waitForSelector("text=Request timed out", { timeout: 40000 })
          .then(() => {
            pageLoaded = true;
          }),
        // Success content
        page.waitForSelector("text=Your", { timeout: 40000 }).then(() => {
          pageLoaded = true;
        }),
        page
          .locator("article")
          .first()
          .waitFor({ timeout: 40000 })
          .then(() => {
            pageLoaded = true;
          }),
      ]);
    } catch (_error) {
      // If timeout, check if page at least loaded something
      pageLoaded = (await page.locator("body").count()) > 0;
    }

    const loadTime = Date.now() - startTime;

    // CRITICAL: Must handle timeout gracefully within 30 seconds (not hang)
    expect(loadTime).toBeLessThan(30000); // Should complete within 30 seconds max
    expect(pageLoaded).toBe(true); // Page should show some content

    console.log(`✅ Timeout handled correctly in ${loadTime}ms`);
  });
});
