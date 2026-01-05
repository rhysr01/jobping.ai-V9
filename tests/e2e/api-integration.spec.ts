import { expect, test } from "@playwright/test";

/**
 * API Integration E2E Tests
 *
 * Tests the full API flow including signup, matching, and email sending
 * with real database interactions
 */

test.describe("API Integration - Full User Flow", () => {
  const testUsers = [
    {
      fullName: "Test User 1",
      email: "testuser1@example.com",
      tier: "free",
      cities: ["London", "Paris"],
      languages: ["English", "French"],
      experience: "0",
      careerPath: "finance",
      roles: ["Financial Analyst", "Investment Banking Analyst"],
    },
    {
      fullName: "Test User 2",
      email: "testuser2@example.com",
      tier: "premium",
      cities: ["Berlin", "Amsterdam"],
      languages: ["English", "German"],
      experience: "1 year",
      careerPath: "tech",
      roles: ["Software Engineer Intern", "DevOps Engineer Intern"],
    },
  ];

  test("Complete API flow - Signup to Email", async ({ request }) => {
    const user = testUsers[0];

    console.log(` Testing complete API flow for ${user.email}`);

    // Step 1: Signup API
    const signupResponse = await request.post("/api/signup", {
      data: {
        fullName: user.fullName,
        email: user.email,
        cities: user.cities,
        languages: user.languages,
        startDate: "2024-06-01",
        experience: user.experience,
        workEnvironment: ["Office", "Hybrid"],
        visaStatus: "EU citizen",
        entryLevelPreferences: ["Graduate Programmes"],
        targetCompanies: ["Global Consulting Firms"],
        careerPath: user.careerPath,
        roles: user.roles,
        industries: ["Technology", "Finance"],
        companySizePreference: "enterprise",
        skills: ["Excel", "Python"],
        careerKeywords: "data-driven, analytical",
        gdprConsent: true,
        tier: user.tier,
      },
    });

    expect(signupResponse.status()).toBe(200);
    const signupData = await signupResponse.json();
    expect(signupData).toHaveProperty("success", true);

    console.log(" Signup API successful");

    // Step 2: Verify user was created in database
    const userCheckResponse = await request.get(`/api/users/${user.email}`);
    expect(userCheckResponse.status()).toBe(200);

    // Step 3: Trigger matching process
    const matchResponse = await request.post("/api/match-users", {
      headers: {
        Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
      },
      data: {
        userEmail: user.email,
      },
    });

    expect(matchResponse.status()).toBe(200);
    const matchData = await matchResponse.json();
    expect(matchData).toHaveProperty("matches");
    expect(matchData.matches.length).toBeGreaterThan(0);

    console.log(
      ` Matching API successful - ${matchData.matches.length} matches found`,
    );

    // Step 4: Check email was queued
    const emailQueueResponse = await request.get("/api/email-queue");
    expect(emailQueueResponse.status()).toBe(200);

    console.log(" Complete API flow successful");
  });

  test("Bulk user signup and matching", async ({ request }) => {
    console.log(" Testing bulk user operations");

    // Signup multiple users
    const signupPromises = testUsers.map((user) =>
      request.post("/api/signup", {
        data: {
          fullName: user.fullName,
          email: user.email,
          cities: user.cities,
          languages: user.languages,
          startDate: "2024-06-01",
          experience: user.experience,
          workEnvironment: ["Office"],
          visaStatus: "EU citizen",
          entryLevelPreferences: ["Graduate Programmes"],
          targetCompanies: ["Global Consulting Firms"],
          careerPath: user.careerPath,
          roles: user.roles,
          industries: ["Technology"],
          companySizePreference: "enterprise",
          skills: ["Excel"],
          careerKeywords: "analytical",
          gdprConsent: true,
          tier: user.tier,
        },
      }),
    );

    const signupResponses = await Promise.all(signupPromises);

    // Verify all signups successful
    for (const response of signupResponses) {
      expect(response.status()).toBe(200);
    }

    console.log(" Bulk signup successful");

    // Trigger bulk matching
    const matchResponse = await request.post("/api/match-users", {
      headers: {
        Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
      },
      data: {
        batchSize: 10,
      },
    });

    expect(matchResponse.status()).toBe(200);
    const matchData = await matchResponse.json();
    expect(matchData).toHaveProperty("processed");
    expect(matchData.processed).toBeGreaterThan(0);

    console.log(
      ` Bulk matching successful - ${matchData.processed} users processed`,
    );
  });

  test("Error handling and edge cases", async ({ request }) => {
    console.log(" Testing error handling");

    // Test 1: Invalid email format
    const invalidEmailResponse = await request.post("/api/signup", {
      data: {
        fullName: "Test User",
        email: "invalid-email",
        cities: ["London"],
        languages: ["English"],
        startDate: "2024-06-01",
        experience: "0",
        workEnvironment: ["Office"],
        visaStatus: "EU citizen",
        entryLevelPreferences: ["Graduate Programmes"],
        targetCompanies: ["Global Consulting Firms"],
        careerPath: "finance",
        roles: ["Financial Analyst"],
        industries: ["Finance"],
        companySizePreference: "enterprise",
        skills: ["Excel"],
        careerKeywords: "analytical",
        gdprConsent: true,
        tier: "free",
      },
    });

    expect(invalidEmailResponse.status()).toBe(400);

    // Test 2: Missing required fields
    const missingFieldsResponse = await request.post("/api/signup", {
      data: {
        fullName: "Test User",
        email: "test@example.com",
        // Missing required fields
      },
    });

    expect(missingFieldsResponse.status()).toBe(400);

    // Test 3: Duplicate email
    const duplicateResponse = await request.post("/api/signup", {
      data: {
        fullName: "Test User",
        email: "testuser1@example.com", // Already exists
        cities: ["London"],
        languages: ["English"],
        startDate: "2024-06-01",
        experience: "0",
        workEnvironment: ["Office"],
        visaStatus: "EU citizen",
        entryLevelPreferences: ["Graduate Programmes"],
        targetCompanies: ["Global Consulting Firms"],
        careerPath: "finance",
        roles: ["Financial Analyst"],
        industries: ["Finance"],
        companySizePreference: "enterprise",
        skills: ["Excel"],
        careerKeywords: "analytical",
        gdprConsent: true,
        tier: "free",
      },
    });

    expect(duplicateResponse.status()).toBe(409);

    console.log(" Error handling working correctly");
  });

  test("Performance and load testing", async ({ request }) => {
    console.log(" Testing performance under load");

    const startTime = Date.now();

    // Create multiple concurrent requests
    const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
      request.post("/api/signup", {
        data: {
          fullName: `Load Test User ${i}`,
          email: `loadtest${i}@example.com`,
          cities: ["London"],
          languages: ["English"],
          startDate: "2024-06-01",
          experience: "0",
          workEnvironment: ["Office"],
          visaStatus: "EU citizen",
          entryLevelPreferences: ["Graduate Programmes"],
          targetCompanies: ["Global Consulting Firms"],
          careerPath: "finance",
          roles: ["Financial Analyst"],
          industries: ["Finance"],
          companySizePreference: "enterprise",
          skills: ["Excel"],
          careerKeywords: "analytical",
          gdprConsent: true,
          tier: "free",
        },
      }),
    );

    const responses = await Promise.all(concurrentRequests);
    const endTime = Date.now();

    // Verify all requests succeeded
    for (const response of responses) {
      expect(response.status()).toBe(200);
    }

    const totalTime = endTime - startTime;
    const avgTime = totalTime / responses.length;

    console.log(
      ` Load test completed - ${responses.length} requests in ${totalTime}ms (avg: ${avgTime}ms)`,
    );

    // Performance assertions
    expect(avgTime).toBeLessThan(2000); // Average response time under 2 seconds
  });

  test("Database consistency and data integrity", async ({ request }) => {
    console.log(" Testing database consistency");

    const user = {
      fullName: "DB Test User",
      email: "dbtest@example.com",
      cities: ["London", "Paris"],
      languages: ["English", "French"],
      startDate: "2024-06-01",
      experience: "1 year",
      workEnvironment: ["Office", "Hybrid"],
      visaStatus: "EU citizen",
      entryLevelPreferences: ["Graduate Programmes"],
      targetCompanies: ["Global Consulting Firms"],
      careerPath: "finance",
      roles: ["Financial Analyst"],
      industries: ["Finance"],
      companySizePreference: "enterprise",
      skills: ["Excel", "Python"],
      careerKeywords: "data-driven, analytical",
      gdprConsent: true,
      tier: "premium",
    };

    // Signup user
    const signupResponse = await request.post("/api/signup", { data: user });
    expect(signupResponse.status()).toBe(200);

    // Verify user data integrity
    const userResponse = await request.get(`/api/users/${user.email}`);
    expect(userResponse.status()).toBe(200);

    const userData = await userResponse.json();
    expect(userData.email).toBe(user.email);
    expect(userData.fullName).toBe(user.fullName);
    expect(userData.tier).toBe(user.tier);
    expect(userData.cities).toEqual(user.cities);
    expect(userData.languages).toEqual(user.languages);

    // Test data updates
    const updateResponse = await request.put(`/api/users/${user.email}`, {
      data: {
        cities: ["Berlin", "Amsterdam"],
        experience: "2 years",
      },
    });

    expect(updateResponse.status()).toBe(200);

    // Verify update
    const updatedUserResponse = await request.get(`/api/users/${user.email}`);
    const updatedUserData = await updatedUserResponse.json();
    expect(updatedUserData.cities).toEqual(["Berlin", "Amsterdam"]);
    expect(updatedUserData.experience).toBe("2 years");

    console.log(" Database consistency verified");
  });

  test("Email delivery and tracking", async ({ request }) => {
    console.log(" Testing email delivery");

    const user = {
      fullName: "Email Test User",
      email: "emailtest@example.com",
      cities: ["London"],
      languages: ["English"],
      startDate: "2024-06-01",
      experience: "0",
      workEnvironment: ["Office"],
      visaStatus: "EU citizen",
      entryLevelPreferences: ["Graduate Programmes"],
      targetCompanies: ["Global Consulting Firms"],
      careerPath: "finance",
      roles: ["Financial Analyst"],
      industries: ["Finance"],
      companySizePreference: "enterprise",
      skills: ["Excel"],
      careerKeywords: "analytical",
      gdprConsent: true,
      tier: "free",
    };

    // Signup user
    await request.post("/api/signup", { data: user });

    // Trigger email sending
    const emailResponse = await request.post("/api/send-scheduled-emails", {
      headers: {
        Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
      },
    });

    expect(emailResponse.status()).toBe(200);

    // Check email queue
    const queueResponse = await request.get("/api/email-queue");
    expect(queueResponse.status()).toBe(200);

    const queueData = await queueResponse.json();
    expect(queueData).toHaveProperty("emails");

    // Check email tracking
    const trackingResponse = await request.get(
      `/api/email-tracking/${user.email}`,
    );
    expect(trackingResponse.status()).toBe(200);

    console.log(" Email delivery system working");
  });
});
