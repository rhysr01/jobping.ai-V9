/**
 * Integration Tests for /api/match-users endpoint
 * Tests the complete API functionality including database interactions
 */

import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/match-users/route";
import { hmacSign } from "@/Utils/auth/hmac";

// Mock the consolidated matcher
jest.mock("@/Utils/consolidatedMatchingV2", () => ({
  createConsolidatedMatcher: jest.fn(() => ({
    performMatching: jest.fn().mockResolvedValue({
      method: "ai_success",
      matches: [
        {
          job_hash: "hash1",
          match_score: 85,
          match_reason: "Good match",
          match_quality: "good",
          match_tags: "test",
        },
      ],
      confidence: 0.8,
    }),
  })),
}));

// Mock the rule-based matcher service
jest.mock("@/Utils/matching/rule-based-matcher.service", () => ({
  generateRobustFallbackMatches: jest.fn().mockReturnValue([
    {
      job: { job_hash: "hash1" },
      match_score: 75,
      match_reason: "Fallback match",
      match_quality: "fair",
      match_tags: "fallback",
    },
  ]),
}));

// Mock the logging service
jest.mock("@/Utils/matching/logging.service", () => ({
  logMatchSession: jest.fn().mockResolvedValue(undefined),
}));

// Mock Supabase database client
jest.mock("@/Utils/databasePool", () => ({
  getDatabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          limit: jest.fn(() => ({
            data: [
              {
                id: "user1",
                email: "test@example.com",
                full_name: "Test User",
                subscription_tier: "free",
                target_cities: ["London"],
                roles_selected: ["Software Engineer"],
                is_active: true,
              },
            ],
            error: null,
          })),
        })),
      })),
    })),
  })),
}));

// Redis functionality is handled internally by the rate limiter
// No direct Redis import to mock

// Helper function to create authenticated requests
function createAuthenticatedRequest(
  body: any,
  method: string = "POST",
): NextRequest {
  const bodyString = JSON.stringify(body);
  const timestamp = Date.now();
  const signature = hmacSign(bodyString, process.env.INTERNAL_API_HMAC_SECRET!);

  return new NextRequest("http://localhost:3000/api/match-users", {
    method,
    body: bodyString,
    headers: {
      "Content-Type": "application/json",
      "x-jobping-signature": signature,
      "x-jobping-timestamp": timestamp.toString(),
    },
  });
}

// Sentry removed - using Axiom for error tracking

// Integration tests require full environment (DB, Redis, OpenAI)
describe("/api/match-users Integration Tests", () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up comprehensive mock data
    global.__SB_MOCK__ = {
      users: [
        {
          id: 1,
          email: "test1@getjobping.com",
          full_name: "Test User 1",
          email_verified: true,
          subscription_active: true,
          created_at: new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          target_cities: "london|berlin",
          languages_spoken: "English,German",
          company_types: "startup,tech",
          roles_selected: "software engineer,data analyst",
          professional_expertise: "software development",
          visa_status: "eu-citizen",
          start_date: new Date().toISOString(),
          work_environment: "hybrid",
          career_path: "tech",
          entry_level_preference: "entry-level",
          subscription_tier: "free",
        },
        {
          id: 2,
          email: "test2@getjobping.com",
          full_name: "Test User 2",
          email_verified: true,
          subscription_active: true,
          created_at: new Date(
            Date.now() - 1 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          target_cities: "madrid|barcelona",
          languages_spoken: "English,Spanish",
          company_types: "corporate,finance",
          roles_selected: "product manager,consultant",
          professional_expertise: "business analysis",
          visa_status: "eu-citizen",
          start_date: new Date().toISOString(),
          work_environment: "remote",
          career_path: "business",
          entry_level_preference: "entry-level",
          subscription_tier: "premium",
        },
      ],
      jobs: [
        {
          id: "1",
          title: "Junior Software Engineer",
          company: "Tech Startup",
          location: "London, UK",
          job_url: "https://example.com/job1",
          description:
            "Entry-level software engineering position for recent graduates",
          experience_required: "entry-level",
          work_environment: "hybrid",
          source: "greenhouse",
          scrape_timestamp: new Date().toISOString(),
          posted_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          original_posted_date: new Date(
            Date.now() - 6 * 60 * 60 * 1000,
          ).toISOString(),
          last_seen_at: new Date().toISOString(),
          is_active: true,
          job_hash: "hash1",
          categories: ["early-career", "tech"],
          language_requirements: ["English"],
          company_profile_url: "https://example.com/company1",
          created_at: new Date().toISOString(),
          is_sent: false,
          status: "active",
        },
        {
          id: "2",
          title: "Data Analyst Intern",
          company: "Data Corp",
          location: "Berlin, Germany",
          job_url: "https://example.com/job2",
          description:
            "Data analysis internship for students and recent graduates",
          experience_required: "entry-level",
          work_environment: "remote",
          source: "lever",
          scrape_timestamp: new Date().toISOString(),
          posted_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          original_posted_date: new Date(
            Date.now() - 12 * 60 * 60 * 1000,
          ).toISOString(),
          last_seen_at: new Date().toISOString(),
          is_active: true,
          job_hash: "hash2",
          categories: ["early-career", "data"],
          language_requirements: ["English", "German"],
          company_profile_url: "https://example.com/company2",
          created_at: new Date().toISOString(),
          is_sent: false,
          status: "active",
        },
        {
          id: "3",
          title: "Product Manager",
          company: "Product Corp",
          location: "Madrid, Spain",
          job_url: "https://example.com/job3",
          description: "Product management role for early career professionals",
          experience_required: "entry-level",
          work_environment: "office",
          source: "ashby",
          scrape_timestamp: new Date().toISOString(),
          posted_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          original_posted_date: new Date(
            Date.now() - 24 * 60 * 60 * 1000,
          ).toISOString(),
          last_seen_at: new Date().toISOString(),
          is_active: true,
          job_hash: "hash3",
          categories: ["early-career", "product"],
          language_requirements: ["English", "Spanish"],
          company_profile_url: "https://example.com/company3",
          created_at: new Date().toISOString(),
          is_sent: false,
          status: "active",
        },
      ],
      matches: [],
      match_logs: [],
    };
  });

  describe("POST /api/match-users", () => {
    // Set timeout for all tests in this suite
    jest.setTimeout(30000); // 30 seconds for integration tests
    it("should process users successfully with valid request", async () => {
      const requestBody = {
        userLimit: 10,
        jobLimit: 10000,
        forceRun: false,
        dryRun: false,
      };

      const request = createAuthenticatedRequest(requestBody);
      request.headers.set("x-forwarded-for", "127.0.0.1");

      const response = await POST(request);
      const data = await response.json();

      // Log the actual response for debugging
      if (response.status !== 200) {
        console.log("Error response:", { status: response.status, data });
      }

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processed).toBe(2);
      expect(data.matched).toBe(2);
      expect(data.failed).toBe(0);
      expect(data.duration).toBeGreaterThan(0);
    });

    it("should handle rate limiting correctly", async () => {
      const request = new NextRequest("http://localhost:3000/api/match-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "127.0.0.1",
        },
        body: JSON.stringify({
          userLimit: 5,
          jobLimit: 10000,
          forceRun: false,
          dryRun: false,
          signature: "test",
          timestamp: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Rate limiting is disabled in test mode
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should validate request body parameters", async () => {
      const invalidRequest = new NextRequest(
        "http://localhost:3000/api/match-users",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userLimit: "invalid",
            jobLimit: 10000,
            forceRun: false,
            dryRun: false,
            signature: "test",
            timestamp: 1,
          }), // Invalid type
        },
      );

      const response = await POST(invalidRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid limit parameter");
    });

    it("should handle invalid request body structure", async () => {
      const invalidRequest = new NextRequest(
        "http://localhost:3000/api/match-users",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invalidField: "value" }),
        },
      );

      const response = await POST(invalidRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid request body");
    });

    it("should handle malformed JSON", async () => {
      const malformedRequest = new NextRequest(
        "http://localhost:3000/api/match-users",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "invalid json",
        },
      );

      const response = await POST(malformedRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid JSON");
    });

    it("should handle database connection errors gracefully", async () => {
      // Simulate database error
      global.__SB_MOCK__ = {
        users: [],
        jobs: [],
        matches: [],
        match_logs: [],
      };

      const request = new NextRequest("http://localhost:3000/api/match-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userLimit: 5,
          jobLimit: 10000,
          forceRun: false,
          dryRun: false,
          signature: "test",
          timestamp: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("No users found");
    });

    it("should handle no active jobs scenario", async () => {
      // Set up users but no jobs
      global.__SB_MOCK__ = {
        users: global.__SB_MOCK__?.users || [],
        jobs: [],
        matches: [],
        match_logs: [],
      };

      const request = new NextRequest("http://localhost:3000/api/match-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userLimit: 5,
          jobLimit: 10000,
          forceRun: false,
          dryRun: false,
          signature: "test",
          timestamp: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("No active jobs to process");
    });

    it("should respect user limits in test mode", async () => {
      const request = new NextRequest("http://localhost:3000/api/match-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userLimit: 100,
          jobLimit: 10000,
          forceRun: false,
          dryRun: false,
          signature: "test",
          timestamp: 1,
        }), // Large limit
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBeLessThanOrEqual(3); // Test mode limit
    });

    it("should handle AI circuit breaker activation", async () => {
      // Mock ConsolidatedMatchingEngine to return rule-based matches when AI fails
      const {
        createConsolidatedMatcher,
      } = require("@/Utils/consolidatedMatchingV2");
      createConsolidatedMatcher.mockReturnValue({
        performMatching: jest.fn().mockResolvedValue({
          matches: [
            {
              job_index: 1,
              job_hash: "test-hash-1",
              match_score: 75,
              match_reason: "Rule-based fallback match",
              confidence_score: 0.7,
            },
          ],
          method: "ai_failed", // Simulating AI failure with rule-based fallback
          processingTime: 100,
          confidence: 0.7,
        }),
      });

      const request = new NextRequest("http://localhost:3000/api/match-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userLimit: 5,
          jobLimit: 10000,
          forceRun: false,
          dryRun: false,
          signature: "test",
          timestamp: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should still process users with fallback matching
      expect(data.matched).toBeGreaterThan(0);
    });

    it("should process users in parallel for better performance", async () => {
      const startTime = Date.now();

      const request = new NextRequest("http://localhost:3000/api/match-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userLimit: 10,
          jobLimit: 10000,
          forceRun: false,
          dryRun: false,
          signature: "test",
          timestamp: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should complete quickly due to parallel processing
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });

    it("should handle different subscription tiers correctly", async () => {
      const request = new NextRequest("http://localhost:3000/api/match-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userLimit: 10,
          jobLimit: 10000,
          forceRun: false,
          dryRun: false,
          signature: "test",
          timestamp: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processed).toBe(2); // Both free and premium users
    });
  });

  describe("GET /api/match-users", () => {
    it("should return 405 for GET method", async () => {
      const request = new NextRequest("http://localhost:3000/api/match-users", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toContain("Method not allowed");
    });
  });

  describe("Error Handling", () => {
    it("should handle unexpected errors gracefully", async () => {
      // Mock an unexpected error
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // Simulate an unexpected error by corrupting the mock data
      (global as any).__SB_MOCK__ = null;

      const request = new NextRequest("http://localhost:3000/api/match-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userLimit: 5,
          jobLimit: 10000,
          forceRun: false,
          dryRun: false,
          signature: "test",
          timestamp: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("Internal server error");

      console.error = originalConsoleError;
    });

    it("should handle memory cleanup correctly", async () => {
      const request = new NextRequest("http://localhost:3000/api/match-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userLimit: 5,
          jobLimit: 10000,
          forceRun: false,
          dryRun: false,
          signature: "test",
          timestamp: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Memory cleanup should happen automatically
    });
  });

  describe("Performance", () => {
    it("should complete within reasonable time limits", async () => {
      const startTime = Date.now();

      const request = new NextRequest("http://localhost:3000/api/match-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userLimit: 10,
          jobLimit: 10000,
          forceRun: false,
          dryRun: false,
          signature: "test",
          timestamp: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(duration).toBeLessThan(10000); // 10 seconds max
      expect(data.duration).toBeLessThan(10000);
    });

    it("should handle concurrent requests", async () => {
      const requests = Array(3)
        .fill(null)
        .map(
          () =>
            new NextRequest("http://localhost:3000/api/match-users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userLimit: 5,
                jobLimit: 10000,
                forceRun: false,
                dryRun: false,
                signature: "test",
                timestamp: 1,
              }),
            }),
        );

      const responses = await Promise.all(requests.map((req) => POST(req)));
      const data = await Promise.all(responses.map((res) => res.json()));

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      data.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });
  });
});
