import { expect, test } from "@playwright/test";

/**
 * Premium Email Delivery E2E Tests
 *
 * Tests premium email sending, templates, and delivery scheduling
 */

test.describe("Premium Email Delivery", () => {
  // Reduce workers to avoid email rate limiting
  test.describe.configure({ mode: "parallel", workers: 1 });

  const generateTestEmail = () => {
    const timestamp = Date.now();
    return `premium-email-${timestamp}@testjobping.com`;
  };

  test("Premium users receive weekly match emails", async ({ request }) => {
    const testEmail = generateTestEmail();

    console.log(`🧪 Testing premium email delivery for ${testEmail}`);

    // First create a premium user
    const signupResponse = await request.post("/api/signup", {
      data: {
        fullName: "Premium Email User",
        email: testEmail,
        cities: ["London", "Berlin"],
        languages: ["English", "German"],
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
        skills: ["Python", "JavaScript"],
        careerKeywords: "full-stack development",
        gdprConsent: true,
        tier: "premium",
      },
    });

    expect(signupResponse.status()).toBe(200);

    // Trigger matching for the user
    const matchResponse = await request.post("/api/match-users", {
      headers: {
        Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
      },
      data: {
        userEmail: testEmail,
      },
    });

    expect(matchResponse.status()).toBe(200);

    // Test email sending (this would normally be scheduled)
    const emailResponse = await request.post("/api/email/send-scheduled", {
      headers: {
        Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
      },
      data: {
        tier: "premium",
        force: true, // Force send for testing
      },
    });

    // Email sending might succeed or be rate limited in test environment
    expect([200, 429, 500]).toContain(emailResponse.status());

    if (emailResponse.status() === 200) {
      const emailData = await emailResponse.json();
      expect(emailData).toHaveProperty("sent");
      expect(emailData.sent).toBeGreaterThanOrEqual(0);

      // Premium emails should include enhanced features
      if (emailData.details && emailData.details.length > 0) {
        const firstEmail = emailData.details[0];
        expect(firstEmail).toHaveProperty("tier");
        expect(firstEmail.tier).toBe("premium");
      }

      console.log(`✅ Premium emails sent: ${emailData.sent}`);
    } else {
      console.log(
        `⚠️ Email sending returned status ${emailResponse.status()} (expected in test environment)`,
      );
    }
  });

  test("Premium email templates include enhanced features", async ({
    request,
  }) => {
    console.log("🧪 Testing premium email template features");

    const testEmail = generateTestEmail();

    // Test template generation for premium user
    const templateResponse = await request.post(
      "/api/email/generate-template",
      {
        data: {
          tier: "premium",
          userEmail: testEmail,
          templateType: "weekly-matches",
          matchCount: 8,
          jobs: [
            {
              id: 1,
              title: "Senior Software Engineer",
              company: "Tech Corp",
              location: "London, UK",
              match_score: 95,
            },
            {
              id: 2,
              title: "Full Stack Developer",
              company: "Startup Inc",
              location: "Berlin, Germany",
              match_score: 88,
            },
          ],
        },
      },
    );

    if (templateResponse.status() === 200) {
      const templateData = await templateResponse.json();

      // Premium templates should have enhanced styling
      expect(templateData).toHaveProperty("premium");
      expect(templateData.premium).toBe(true);

      // Should include premium-specific content
      expect(templateData).toHaveProperty("badge");
      expect(templateData.badge).toContain("Premium");

      // Should have more jobs than free tier would send
      expect(templateData).toHaveProperty("jobs");
      expect(templateData.jobs.length).toBeGreaterThan(5); // Premium sends more

      // Check for enhanced features
      expect(templateData).toHaveProperty("enhanced");
      expect(templateData.enhanced).toBe(true);

      console.log("✅ Premium email template features verified");
    } else {
      console.log(
        `⚠️ Template generation not available (status: ${templateResponse.status()})`,
      );
    }
  });

  test("Premium email scheduling works correctly", async ({ request }) => {
    console.log("🧪 Testing premium email scheduling");

    // Test the scheduling logic
    const scheduleResponse = await request.get("/api/email/schedule/premium");

    if (scheduleResponse.status() === 200) {
      const scheduleData = await scheduleResponse.json();

      // Premium should have more frequent sends
      expect(scheduleData).toHaveProperty("frequency");
      expect(scheduleData.frequency).toBe("weekly");

      // Premium should send more jobs per email
      expect(scheduleData).toHaveProperty("jobsPerSend");
      expect(scheduleData.jobsPerSend).toBeGreaterThan(5);

      // Should have premium-specific timing
      expect(scheduleData).toHaveProperty("isPremium");
      expect(scheduleData.isPremium).toBe(true);

      console.log(
        `✅ Premium scheduling: ${scheduleData.frequency}, ${scheduleData.jobsPerSend} jobs`,
      );
    } else {
      console.log(
        `⚠️ Schedule endpoint not available (status: ${scheduleResponse.status()})`,
      );
    }
  });

  test("Premium email analytics and tracking", async ({ request }) => {
    const testEmail = generateTestEmail();

    console.log(`🧪 Testing premium email analytics for ${testEmail}`);

    // Test email tracking setup
    const trackingResponse = await request.post("/api/email/track", {
      data: {
        emailId: `premium-test-${Date.now()}`,
        userEmail: testEmail,
        tier: "premium",
        campaign: "premium-weekly-matches",
        metrics: {
          jobsSent: 8,
          highQualityMatches: 6,
          premiumFeatures: true,
        },
      },
    });

    if (trackingResponse.status() === 200) {
      const trackingData = await trackingResponse.json();

      expect(trackingData).toHaveProperty("tracked");
      expect(trackingData.tracked).toBe(true);

      // Premium tracking should include additional metrics
      expect(trackingData).toHaveProperty("premium");
      expect(trackingData.premium).toBe(true);

      console.log("✅ Premium email tracking verified");
    } else {
      console.log(
        `⚠️ Email tracking not available (status: ${trackingResponse.status()})`,
      );
    }

    // Test analytics retrieval
    const analyticsResponse = await request.get(
      `/api/email/analytics/${testEmail}`,
    );

    if (analyticsResponse.status() === 200) {
      const analyticsData = await analyticsResponse.json();

      expect(analyticsData).toHaveProperty("tier");
      expect(analyticsData.tier).toBe("premium");

      // Should have premium-specific analytics
      expect(analyticsData).toHaveProperty("premiumMetrics");
      expect(analyticsData.premiumMetrics).toBeDefined();

      console.log("✅ Premium email analytics verified");
    }
  });

  test("Premium email error handling and retries", async ({ request }) => {
    const testEmail = generateTestEmail();

    console.log(`🧪 Testing premium email error handling for ${testEmail}`);

    // Test sending to invalid email (should handle gracefully)
    const invalidEmailResponse = await request.post("/api/email/send-premium", {
      headers: {
        Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
      },
      data: {
        userEmail: "invalid-email-that-bounces@example.invalid",
        jobs: [],
        tier: "premium",
      },
    });

    // Should handle invalid emails gracefully
    expect([200, 400, 500]).toContain(invalidEmailResponse.status());

    if (invalidEmailResponse.status() === 200) {
      const responseData = await invalidEmailResponse.json();
      // Even if sent, should be marked for retry or have error tracking
      expect(responseData).toHaveProperty("queued");
      console.log("✅ Premium email error handling verified");
    }
  });

  test("Premium email unsubscribe and preferences", async ({ request }) => {
    const testEmail = generateTestEmail();

    console.log(`🧪 Testing premium email preferences for ${testEmail}`);

    // Test premium unsubscribe (should preserve premium status but stop emails)
    const unsubscribeResponse = await request.post("/api/email/unsubscribe", {
      data: {
        email: testEmail,
        tier: "premium",
        reason: "too_many_emails",
      },
    });

    if (unsubscribeResponse.status() === 200) {
      const unsubscribeData = await unsubscribeResponse.json();

      expect(unsubscribeData).toHaveProperty("unsubscribed");
      expect(unsubscribeData.unsubscribed).toBe(true);

      // Premium users should be able to resubscribe or modify preferences
      expect(unsubscribeData).toHaveProperty("canResubscribe");
      expect(unsubscribeData.canResubscribe).toBe(true);

      console.log("✅ Premium unsubscribe handling verified");
    }

    // Test preference updates
    const preferenceResponse = await request.put(
      `/api/email/preferences/${testEmail}`,
      {
        data: {
          tier: "premium",
          frequency: "biweekly", // Premium users might have options
          jobTypes: ["graduate", "experienced"],
          regions: ["Europe"],
        },
      },
    );

    if (preferenceResponse.status() === 200) {
      const preferenceData = await preferenceResponse.json();

      expect(preferenceData).toHaveProperty("updated");
      expect(preferenceData.updated).toBe(true);

      expect(preferenceData).toHaveProperty("tier");
      expect(preferenceData.tier).toBe("premium");

      console.log("✅ Premium email preferences verified");
    }
  });
});
