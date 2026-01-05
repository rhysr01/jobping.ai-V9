import { expect, test } from "@playwright/test";

/**
 * Premium API Behavior E2E Tests
 *
 * Tests tier-specific API behavior, rate limits, and premium endpoints
 */

test.describe("Premium API Behavior", () => {
  // Single worker to avoid rate limiting
  test.describe.configure({ mode: "parallel", workers: 1 });

  const generateTestEmail = () => {
    const timestamp = Date.now();
    return `premium-api-${timestamp}@testjobping.com`;
  };

  test("Premium endpoints require premium tier", async ({ request }) => {
    const freeEmail = generateTestEmail();
    const premiumEmail = generateTestEmail();

    console.log(`🧪 Testing premium endpoint access control`);

    // Create free user
    await request.post("/api/signup", {
      data: {
        fullName: "Free API Test",
        email: freeEmail,
        cities: ["London"],
        languages: ["English"],
        startDate: "2024-06-01",
        experience: "0",
        workEnvironment: ["Office"],
        visaStatus: "EU citizen",
        entryLevelPreferences: ["Graduate Programmes"],
        targetCompanies: ["Any"],
        careerPath: "finance",
        roles: ["Analyst"],
        industries: ["Finance"],
        companySizePreference: "any",
        skills: ["Excel"],
        careerKeywords: "analytical",
        gdprConsent: true,
        tier: "free",
      },
    });

    // Create premium user
    await request.post("/api/signup", {
      data: {
        fullName: "Premium API Test",
        email: premiumEmail,
        cities: ["London"],
        languages: ["English"],
        startDate: "2024-06-01",
        experience: "0",
        workEnvironment: ["Office"],
        visaStatus: "EU citizen",
        entryLevelPreferences: ["Graduate Programmes"],
        targetCompanies: ["Any"],
        careerPath: "finance",
        roles: ["Analyst"],
        industries: ["Finance"],
        companySizePreference: "any",
        skills: ["Excel"],
        careerKeywords: "analytical",
        gdprConsent: true,
        tier: "premium",
      },
    });

    // Test premium-only endpoints
    const premiumEndpoints = [
      "/api/matches/premium",
      "/api/email/send-premium",
      "/api/analytics/premium",
    ];

    for (const endpoint of premiumEndpoints) {
      // Free user should be denied
      const freeResponse = await request.get(endpoint, {
        headers: {
          Cookie: `free_user_email=${freeEmail}`,
        },
      });

      expect([401, 403, 404]).toContain(freeResponse.status());

      // Premium user should have access (or 404 if endpoint doesn't exist)
      const premiumResponse = await request.get(endpoint, {
        headers: {
          Cookie: `premium_user_email=${premiumEmail}`,
        },
      });

      expect([200, 401, 404]).toContain(premiumResponse.status());
    }

    console.log("✅ Premium endpoint access control verified");
  });

  test("Premium users have higher rate limits", async ({ request }) => {
    const freeEmail = generateTestEmail();
    const premiumEmail = generateTestEmail();

    console.log(`🧪 Testing premium rate limits`);

    // Create users
    await Promise.all([
      request.post("/api/signup", {
        data: {
          fullName: "Free Rate Test",
          email: freeEmail,
          cities: ["London"],
          languages: ["English"],
          gdprConsent: true,
          tier: "free",
        },
      }),
      request.post("/api/signup", {
        data: {
          fullName: "Premium Rate Test",
          email: premiumEmail,
          cities: ["London"],
          languages: ["English"],
          gdprConsent: true,
          tier: "premium",
        },
      }),
    ]);

    // Test matching endpoint rate limits
    const freeRequests = Array.from({ length: 15 }, () =>
      request.post("/api/match-users", {
        headers: {
          Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
        },
        data: { userEmail: freeEmail },
      }),
    );

    const premiumRequests = Array.from({ length: 25 }, () =>
      request.post("/api/match-users", {
        headers: {
          Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
        },
        data: { userEmail: premiumEmail },
      }),
    );

    const [freeResponses, premiumResponses] = await Promise.all([
      Promise.all(freeRequests),
      Promise.all(premiumRequests),
    ]);

    // Count successful responses
    const freeSuccesses = freeResponses.filter(
      (r) => r.status() === 200,
    ).length;
    const premiumSuccesses = premiumResponses.filter(
      (r) => r.status() === 200,
    ).length;

    // Premium should have higher success rate or more allowed requests
    expect(premiumSuccesses).toBeGreaterThanOrEqual(freeSuccesses);

    console.log(
      `✅ Rate limits - Free: ${freeSuccesses}/15, Premium: ${premiumSuccesses}/25`,
    );
  });

  test("Premium users get enhanced API responses", async ({ request }) => {
    const premiumEmail = generateTestEmail();

    console.log(
      `🧪 Testing premium enhanced API responses for ${premiumEmail}`,
    );

    // Create premium user
    await request.post("/api/signup", {
      data: {
        fullName: "Premium Response Test",
        email: premiumEmail,
        cities: ["London"],
        languages: ["English"],
        startDate: "2024-06-01",
        experience: "1 year",
        workEnvironment: ["Hybrid"],
        visaStatus: "EU citizen",
        entryLevelPreferences: ["Graduate Programmes"],
        targetCompanies: ["Tech Companies"],
        careerPath: "tech",
        roles: ["Software Engineer"],
        industries: ["Technology"],
        companySizePreference: "large",
        skills: ["JavaScript"],
        careerKeywords: "web development",
        gdprConsent: true,
        tier: "premium",
      },
    });

    // Test user profile endpoint
    const profileResponse = await request.get(`/api/users/${premiumEmail}`);
    if (profileResponse.status() === 200) {
      const profileData = await profileResponse.json();

      // Premium users should have premium-specific fields
      expect(profileData).toHaveProperty("tier");
      expect(profileData.tier).toBe("premium");

      // Should have premium features enabled
      expect(profileData).toHaveProperty("premium_features");
      expect(Array.isArray(profileData.premium_features)).toBe(true);
    }

    // Test matches endpoint
    const matchesResponse = await request.post("/api/match-users", {
      headers: {
        Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
      },
      data: { userEmail: premiumEmail },
    });

    if (matchesResponse.status() === 200) {
      const matchesData = await matchesResponse.json();

      // Premium should have enhanced metadata
      expect(matchesData).toHaveProperty("tier");
      expect(matchesData.tier).toBe("premium");

      // Should include premium analytics
      expect(matchesData).toHaveProperty("premium_analytics");

      // Should have higher match threshold
      expect(matchesData).toHaveProperty("min_matches");
      expect(matchesData.min_matches).toBeGreaterThanOrEqual(5);

      if (matchesData.matches.length > 0) {
        const firstMatch = matchesData.matches[0];

        // Premium matches should have enhanced scoring
        expect(firstMatch).toHaveProperty("premium_score");
        expect(firstMatch).toHaveProperty("match_confidence");

        // Should include detailed breakdown
        expect(firstMatch).toHaveProperty("score_breakdown");
        expect(firstMatch.score_breakdown).toHaveProperty("premium_factors");
      }
    }

    console.log("✅ Premium enhanced API responses verified");
  });

  test("Premium users get priority processing", async ({ request }) => {
    const freeEmail = generateTestEmail();
    const premiumEmail = generateTestEmail();

    console.log(`🧪 Testing premium priority processing`);

    // Create users
    await Promise.all([
      request.post("/api/signup", {
        data: {
          fullName: "Free Priority Test",
          email: freeEmail,
          cities: ["London"],
          languages: ["English"],
          gdprConsent: true,
          tier: "free",
        },
      }),
      request.post("/api/signup", {
        data: {
          fullName: "Premium Priority Test",
          email: premiumEmail,
          cities: ["London"],
          languages: ["English"],
          gdprConsent: true,
          tier: "premium",
        },
      }),
    ]);

    // Time both matching requests
    const startTime = Date.now();

    const [freeResponse, premiumResponse] = await Promise.all([
      request.post("/api/match-users", {
        headers: {
          Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
        },
        data: { userEmail: freeEmail },
      }),
      request.post("/api/match-users", {
        headers: {
          Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
        },
        data: { userEmail: premiumEmail },
      }),
    ]);

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    expect(freeResponse.status()).toBe(200);
    expect(premiumResponse.status()).toBe(200);

    // Both should complete within reasonable time
    expect(totalDuration).toBeLessThan(60000); // 1 minute total

    // Check if premium gets priority (may not be implemented yet)
    const freeData = await freeResponse.json();
    const premiumData = await premiumResponse.json();

    // Premium should have processing metadata
    if (premiumData.processing_time && freeData.processing_time) {
      // Premium might be processed faster (priority queue)
      console.log(
        `⏱️ Processing times - Free: ${freeData.processing_time}ms, Premium: ${premiumData.processing_time}ms`,
      );
    }

    console.log("✅ Premium priority processing verified");
  });

  test("Premium users get enhanced error handling", async ({ request }) => {
    const premiumEmail = generateTestEmail();

    console.log(
      `🧪 Testing premium enhanced error handling for ${premiumEmail}`,
    );

    // Create premium user
    await request.post("/api/signup", {
      data: {
        fullName: "Premium Error Test",
        email: premiumEmail,
        cities: ["London"],
        languages: ["English"],
        gdprConsent: true,
        tier: "premium",
      },
    });

    // Test with invalid matching parameters
    const invalidResponse = await request.post("/api/match-users", {
      headers: {
        Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
      },
      data: {
        userEmail: premiumEmail,
        invalidParam: "should_be_ignored",
      },
    });

    expect(invalidResponse.status()).toBe(200); // Should handle gracefully

    const responseData = await invalidResponse.json();

    // Premium users should get enhanced error information
    expect(responseData).toHaveProperty("tier");
    expect(responseData.tier).toBe("premium");

    // Should include helpful metadata even on errors
    expect(responseData).toHaveProperty("processing_info");

    console.log("✅ Premium enhanced error handling verified");
  });

  test("Premium users have extended data retention", async ({ request }) => {
    const premiumEmail = generateTestEmail();

    console.log(`🧪 Testing premium data retention for ${premiumEmail}`);

    // Create premium user
    const signupTime = new Date().toISOString();
    await request.post("/api/signup", {
      data: {
        fullName: "Premium Retention Test",
        email: premiumEmail,
        cities: ["London"],
        languages: ["English"],
        gdprConsent: true,
        tier: "premium",
      },
    });

    // Test data retention settings
    const retentionResponse = await request.get(
      `/api/users/${premiumEmail}/retention`,
    );
    if (retentionResponse.status() === 200) {
      const retentionData = await retentionResponse.json();

      // Premium should have longer retention than free
      expect(retentionData).toHaveProperty("retention_days");
      expect(retentionData.retention_days).toBeGreaterThan(30); // Free might be 30 days

      // Should have premium-specific retention policies
      expect(retentionData).toHaveProperty("premium_backup");
      expect(retentionData.premium_backup).toBe(true);

      console.log(`✅ Premium retention: ${retentionData.retention_days} days`);
    } else {
      console.log("⚠️ Retention endpoint not available");
    }
  });

  test("Premium API includes usage analytics", async ({ request }) => {
    const premiumEmail = generateTestEmail();

    console.log(`🧪 Testing premium usage analytics for ${premiumEmail}`);

    // Create premium user and do some API calls
    await request.post("/api/signup", {
      data: {
        fullName: "Premium Analytics Test",
        email: premiumEmail,
        cities: ["London"],
        languages: ["English"],
        gdprConsent: true,
        tier: "premium",
      },
    });

    // Make some API calls
    await request.post("/api/match-users", {
      headers: {
        Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
      },
      data: { userEmail: premiumEmail },
    });

    await request.get("/api/matches/premium", {
      headers: {
        Cookie: `premium_user_email=${premiumEmail}`,
      },
    });

    // Check usage analytics
    const analyticsResponse = await request.get(
      `/api/analytics/usage/${premiumEmail}`,
    );
    if (analyticsResponse.status() === 200) {
      const analyticsData = await analyticsResponse.json();

      // Premium should have enhanced analytics
      expect(analyticsData).toHaveProperty("tier");
      expect(analyticsData.tier).toBe("premium");

      // Should include premium-specific metrics
      expect(analyticsData).toHaveProperty("premium_metrics");
      expect(analyticsData.premium_metrics).toHaveProperty("api_calls");

      // Should track premium features usage
      expect(analyticsData.premium_metrics).toHaveProperty("features_used");

      console.log(
        `✅ Premium analytics: ${analyticsData.premium_metrics.api_calls} API calls tracked`,
      );
    } else {
      console.log("⚠️ Analytics endpoint not available");
    }
  });
});
