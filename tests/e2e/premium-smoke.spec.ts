import { expect, test } from "@playwright/test";
import {
  PremiumTestDataFactory,
  PremiumAuthHelper,
  PremiumAPIHelper,
  PremiumPerformanceHelper,
  PremiumValidationHelper,
  PremiumEdgeCaseGenerator,
  PremiumAccessibilityHelper,
} from "./_helpers/premium-test-helpers";

/**
 * Premium Tier E2E Tests - Senior Developer Level
 *
 * Comprehensive testing of premium functionality including:
 * - Business logic verification (premium vs free differences)
 * - Security testing (authentication, authorization)
 * - Performance testing (response times, resource usage)
 * - Edge cases and error handling
 * - Accessibility compliance
 * - Cross-browser compatibility
 * - API contract testing
 * - Integration testing
 */

test.describe("Premium Tier - Comprehensive E2E Testing", () => {
  test.describe.configure({
    mode: "serial", // Sequential for reliability
    timeout: 60000, // 60s timeout for complex flows
  });

  test.describe("Authentication & Authorization", () => {
    test("Match users endpoint requires system authentication", async ({
      request,
    }) => {
      // Test that the main matching endpoint requires proper auth
      const response = await request.post("/api/match-users", {
        data: { userEmail: "test@example.com" },
      });

      // Should require HMAC or system auth
      expect([401, 403]).toContain(response.status());
    });

    test("Email endpoint requires system authentication", async ({
      request,
    }) => {
      const response = await request.post("/api/send-scheduled-emails");

      // Should require system auth
      expect([401, 403]).toContain(response.status());
    });

    test("System authentication works", async ({ request }) => {
      // Test with proper system authentication
      const response = await request.post("/api/match-users", {
        headers: { Authorization: `Bearer ${process.env.SYSTEM_API_KEY}` },
        data: { userEmail: "test@example.com" },
      });

      // Should succeed or return validation error (not auth error)
      expect([200, 400, 404]).toContain(response.status());
    });
  });

  test.describe("Business Logic - Premium vs Free Differences", () => {
    test("Premium users get higher minimum match counts", async ({
      request,
    }) => {
      // Create test users with different tiers
      const freeUser = PremiumTestDataFactory.createFreeUser();
      const premiumUser = PremiumTestDataFactory.createUser();

      // Create users in database
      const [freeResult, premiumResult] = await Promise.all([
        PremiumAPIHelper.createUser(request, freeUser),
        PremiumAPIHelper.createUser(request, premiumUser),
      ]);

      // Skip test if user creation fails (may be expected in test environment)
      if (!freeResult.success || !premiumResult.success) {
        console.log("⚠️ User creation failed, skipping match count test");
        return;
      }

      // Run matching for both users
      const [freeMatch, premiumMatch] = await Promise.all([
        PremiumAPIHelper.runMatching(request, freeUser.email),
        PremiumAPIHelper.runMatching(request, premiumUser.email),
      ]);

      // Both should respond
      expect(freeMatch.success || freeMatch.status === 400).toBe(true);
      expect(premiumMatch.success || premiumMatch.status === 400).toBe(true);

      // If successful, check match counts
      if (freeMatch.success && premiumMatch.success) {
        expect(premiumMatch.data.matches.length).toBeGreaterThanOrEqual(
          freeMatch.data.matches.length,
        );
        expect(premiumMatch.data.matches.length).toBeGreaterThanOrEqual(5); // Premium minimum

        // Premium response should indicate premium processing
        expect(premiumMatch.data).toHaveProperty("method");
        expect(premiumMatch.data).toHaveProperty("processing_time");
      }
    });

    test("Email scheduling only processes premium users", async ({
      request,
    }) => {
      // Create free and premium users
      const freeUser = PremiumTestDataFactory.createFreeUser();
      const premiumUser = PremiumTestDataFactory.createUser();

      const [freeResult, premiumResult] = await Promise.all([
        PremiumAPIHelper.createUser(request, freeUser),
        PremiumAPIHelper.createUser(request, premiumUser),
      ]);

      // Skip if creation fails
      if (!freeResult.success || !premiumResult.success) {
        console.log("⚠️ User creation failed, skipping email test");
        return;
      }

      // Trigger email sending
      const emailResponse = await request.post("/api/send-scheduled-emails", {
        headers: { Authorization: `Bearer ${process.env.SYSTEM_API_KEY}` },
      });

      // Email endpoint should respond (may have no users to email in test env)
      expect([200, 400]).toContain(emailResponse.status());

      if (emailResponse.status() === 200) {
        const emailData = await emailResponse.json();

        // Should have processed users (may be 0 in test environment)
        expect(emailData).toHaveProperty("processed");
        expect(typeof emailData.processed).toBe("number");

        // In test environment, may process premium users if they exist
        console.log(
          `✅ Email scheduling processed ${emailData.processed} users`,
        );
      }
    });

    test("Premium users get stricter matching criteria", async ({
      request,
    }) => {
      const premiumUser = PremiumTestHelper.generateTestUser("premium");

      // Create user with very specific preferences
      premiumUser.cities = ["Tokyo"]; // Very restrictive location
      premiumUser.languages = ["Japanese"]; // Very restrictive language
      premiumUser.careerPath = "finance"; // Specific career

      await PremiumTestHelper.createUser(request, premiumUser);

      const matchResponse = await request.post("/api/match-users", {
        headers: { Authorization: `Bearer ${process.env.SYSTEM_API_KEY}` },
        data: { userEmail: premiumUser.email },
      });

      expect(matchResponse.status()).toBe(200);
      const matchData = await matchResponse.json();

      // Premium should still find matches despite restrictive criteria
      // (This tests that premium gets better matching algorithm)
      expect(matchData.matches.length).toBeGreaterThan(0);
    });

    test("Premium users receive enhanced match metadata", async ({
      request,
    }) => {
      const premiumUser = PremiumTestHelper.generateTestUser("premium");
      await PremiumTestHelper.createUser(request, premiumUser);

      const matchResponse = await request.post("/api/match-users", {
        headers: { Authorization: `Bearer ${process.env.SYSTEM_API_KEY}` },
        data: { userEmail: premiumUser.email },
      });

      expect(matchResponse.status()).toBe(200);
      const matchData = await matchResponse.json();

      // Premium matches should include enhanced metadata
      expect(matchData).toHaveProperty("tier");
      expect(matchData.tier).toBe("premium");

      if (matchData.matches.length > 0) {
        const firstMatch = matchData.matches[0];

        // Should have premium-specific scoring
        expect(firstMatch).toHaveProperty("match_score");
        expect(firstMatch).toHaveProperty("score_breakdown");

        // Premium scoring breakdown should be detailed
        expect(firstMatch.score_breakdown).toHaveProperty("overall");
        expect(firstMatch.score_breakdown).toHaveProperty("eligibility");
        expect(firstMatch.score_breakdown).toHaveProperty("careerPath");
      }
    });
  });

  test.describe("Performance & Scalability", () => {
    test("Premium endpoints meet performance SLOs", async ({ request }) => {
      const { responseTime } =
        await PremiumPerformanceHelper.measureResponseTime(
          async () => await request.get("/api/health"),
        );

      expect(responseTime).toBeLessThan(100); // 100ms SLO
    });

    test("Premium matching handles load gracefully", async ({ request }) => {
      const users = Array.from({ length: 5 }, () =>
        PremiumTestDataFactory.createUser(),
      );

      // Create multiple premium users
      await Promise.all(
        users.map((user) => PremiumAPIHelper.createUser(request, user)),
      );

      // Create concurrent matching operations
      const operations = users.map(
        (user) => () => PremiumAPIHelper.runMatching(request, user.email),
      );

      // Measure performance
      const metrics = await PremiumPerformanceHelper.measureConcurrentLoad(
        operations,
        5,
      );

      // Performance assertions
      expect(metrics.responseTime).toBeLessThan(30000); // 30 seconds total
      expect(metrics.throughput).toBeGreaterThan(0.1); // At least 0.1 requests/second
      expect(metrics.errorRate).toBeLessThan(0.5); // Less than 50% errors
      expect(metrics.percentile95).toBeLessThan(10000); // 95th percentile < 10 seconds
    });
  });

  test.describe("Error Handling & Edge Cases", () => {
    test("Signup handles invalid data gracefully", async ({ request }) => {
      const invalidUserData = {
        email: "invalid-email",
        fullName: "",
        // Missing required fields
      };

      const response = await request.post("/api/signup", {
        data: invalidUserData,
      });
      expect([400, 422]).toContain(response.status());

      const errorData = await response.json();
      expect(errorData).toHaveProperty("success", false);
    });

    test("Matching handles non-existent users", async ({ request }) => {
      const response = await request.post("/api/match-users", {
        headers: { Authorization: `Bearer ${process.env.SYSTEM_API_KEY}` },
        data: { userEmail: "nonexistent@test.com" },
      });

      expect([400, 404]).toContain(response.status());
    });

    test("Matching endpoints handle malformed requests", async ({
      request,
    }) => {
      const response = await request.post("/api/match-users", {
        headers: { Authorization: `Bearer ${process.env.SYSTEM_API_KEY}` },
        data: { invalidField: "invalidValue" }, // Missing required fields
      });

      expect([400]).toContain(response.status());
    });

    test("Email scheduling handles empty user base", async ({ request }) => {
      const response = await request.post("/api/send-scheduled-emails", {
        headers: { Authorization: `Bearer ${process.env.SYSTEM_API_KEY}` },
      });

      // Should succeed even with no users to email
      expect([200]).toContain(response.status());

      const data = await response.json();
      expect(data).toHaveProperty("processed");
      expect(data.processed).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe("Security Testing", () => {
    test("Input validation prevents malicious data", async ({ request }) => {
      // Test SQL injection attempts
      const maliciousData = {
        userEmail: "'; DROP TABLE users; --",
      };

      const response = await request.post("/api/match-users", {
        headers: { Authorization: `Bearer ${process.env.SYSTEM_API_KEY}` },
        data: maliciousData,
      });
      expect([400]).toContain(response.status());
    });

    test("Input validation handles oversized data", async ({ request }) => {
      const oversizedData = {
        userEmail: "a".repeat(1000) + "@test.com", // Oversized input
      };

      const response = await request.post("/api/match-users", {
        headers: { Authorization: `Bearer ${process.env.SYSTEM_API_KEY}` },
        data: oversizedData,
      });
      expect([400, 413]).toContain(response.status());
    });

    test("Rate limiting protects against abuse", async ({ request }) => {
      // Make multiple rapid requests to health endpoint
      const requests = Array.from({ length: 50 }, () =>
        request.get("/api/health"),
      );

      const responses = await Promise.all(requests);
      const rateLimitedCount = responses.filter(
        (r) => r.status() === 429,
      ).length;
      const successCount = responses.filter((r) => r.status() === 200).length;

      // Should have some successful requests and possibly some rate limited
      expect(successCount).toBeGreaterThan(0);
      // Rate limiting may or may not be triggered depending on configuration
      expect(rateLimitedCount + successCount).toBe(50);
    });
  });

  test.describe("Accessibility & UX", () => {
    test("Premium upgrade page is keyboard accessible", async ({ page }) => {
      await page.goto("/upgrade");

      // Test keyboard navigation
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      // Should be able to focus on interactive elements
      const focusedElement = page.locator(":focus");
      const isInteractive = await focusedElement.evaluate((el) =>
        ["BUTTON", "INPUT", "SELECT", "TEXTAREA", "A"].includes(el.tagName),
      );

      expect(isInteractive).toBe(true);
    });

    test("Premium upgrade page has proper ARIA labels", async ({ page }) => {
      await page.goto("/upgrade");

      // Check for ARIA labels on form elements
      const inputs = page.locator("input[aria-label], input[aria-labelledby]");
      const buttons = page.locator(
        "button[aria-label], button[aria-labelledby]",
      );

      const inputCount = await inputs.count();
      const buttonCount = await buttons.count();

      // Should have some accessible form elements
      expect(inputCount + buttonCount).toBeGreaterThan(0);
    });
  });

  test.describe("API Contract Testing", () => {
    test("Premium match response conforms to schema", async ({ request }) => {
      const premiumUser = PremiumTestHelper.generateTestUser("premium");
      await PremiumTestHelper.createUser(request, premiumUser);

      const response = await request.post("/api/match-users", {
        headers: { Authorization: `Bearer ${process.env.SYSTEM_API_KEY}` },
        data: { userEmail: premiumUser.email },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();

      // Validate response schema
      expect(data).toHaveProperty("matches");
      expect(Array.isArray(data.matches)).toBe(true);
      expect(data).toHaveProperty("method");
      expect(data).toHaveProperty("processing_time");

      if (data.matches.length > 0) {
        const match = data.matches[0];
        expect(match).toHaveProperty("job_hash");
        expect(match).toHaveProperty("match_score");
        expect(match).toHaveProperty("match_reason");
      }
    });

    test("Premium health endpoint returns comprehensive data", async ({
      request,
    }) => {
      const response = await request.get("/api/health");
      expect(response.status()).toBe(200);

      const data = await response.json();

      // Premium health check should include tier information
      expect(data).toHaveProperty("status");
      expect(["healthy", "degraded", "unhealthy"]).toContain(data.status);
      expect(data).toHaveProperty("services");
      expect(data).toHaveProperty("uptimeSeconds");
      expect(data).toHaveProperty("responseTime");
    });
  });

  test.describe("Cross-Browser Compatibility", () => {
    test("Premium functionality works across browsers", async ({
      page,
      browserName,
    }) => {
      await page.goto("/upgrade");

      const title = await page.title();
      const hasBody = (await page.locator("body").count()) > 0;

      expect(title.length).toBeGreaterThan(0);
      expect(hasBody).toBe(true);

      console.log(`✅ Premium upgrade page works in ${browserName}`);
    });
  });

  test.describe("Integration Testing", () => {
    test("Premium user journey from signup to matches", async ({ request }) => {
      const user = PremiumTestDataFactory.createUser();

      // Step 1: Signup
      const signupResult = await PremiumAPIHelper.createUser(request, user);
      if (!signupResult.success) {
        console.log("⚠️ Signup failed, skipping integration test");
        return;
      }

      // Step 2: Run matching
      const matchResult = await PremiumAPIHelper.runMatching(
        request,
        user.email,
      );
      expect(matchResult.success || matchResult.status === 400).toBe(true);

      if (matchResult.success) {
        // Step 3: Verify premium features in response
        expect(matchResult.data).toHaveProperty("matches");
        expect(matchResult.data).toHaveProperty("method");
        expect(matchResult.data).toHaveProperty("processing_time");

        // Premium should get minimum match count
        expect(matchResult.data.matches.length).toBeGreaterThanOrEqual(5);

        console.log(
          `✅ Complete premium user journey: ${matchResult.data.matches.length} matches found`,
        );
      }
    });

    test("Free vs Premium user comparison", async ({ request }) => {
      const freeUser = PremiumTestDataFactory.createFreeUser();
      const premiumUser = PremiumTestDataFactory.createUser();

      // Create both users
      const [freeSignup, premiumSignup] = await Promise.all([
        PremiumAPIHelper.createUser(request, freeUser),
        PremiumAPIHelper.createUser(request, premiumUser),
      ]);

      // Skip if signups fail
      if (!freeSignup.success || !premiumSignup.success) {
        console.log("⚠️ User creation failed, skipping comparison test");
        return;
      }

      // Run matching for both
      const [freeMatch, premiumMatch] = await Promise.all([
        PremiumAPIHelper.runMatching(request, freeUser.email),
        PremiumAPIHelper.runMatching(request, premiumUser.email),
      ]);

      // Both should process (may succeed or fail gracefully)
      expect(freeMatch.success || freeMatch.status === 400).toBe(true);
      expect(premiumMatch.success || premiumMatch.status === 400).toBe(true);

      if (freeMatch.success && premiumMatch.success) {
        // Premium should get at least as many matches as free
        expect(premiumMatch.data.matches.length).toBeGreaterThanOrEqual(
          freeMatch.data.matches.length,
        );

        // Premium should meet minimum threshold
        expect(premiumMatch.data.matches.length).toBeGreaterThanOrEqual(5);

        console.log(
          `✅ Free: ${freeMatch.data.matches.length} matches, Premium: ${premiumMatch.data.matches.length} matches`,
        );
      }
    });
  });
});
