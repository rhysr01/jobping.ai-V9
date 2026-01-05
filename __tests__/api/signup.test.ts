/**
 * Contract Tests for /api/signup
 *
 * Tests the premium signup API contract - what the endpoint returns, not internal implementation.
 * This API is premium-only (free users use /api/signup/free).
 * Uses real database operations for reliable integration testing.
 */

import { createMocks } from "node-mocks-http";
import { POST } from "@/app/api/signup/route";
import { getDatabaseClient } from "@/Utils/databasePool";
import { apiLogger } from "@/lib/api-logger";

// Mock external dependencies but keep database real
jest.mock("@/lib/api-logger", () => ({
  apiLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock rate limiter
jest.mock("@/Utils/productionRateLimiter", () => ({
  getProductionRateLimiter: () => ({
    middleware: jest.fn().mockResolvedValue(null), // No rate limiting for tests
  }),
}));

// Mock email sender to avoid actual emails
jest.mock("@/Utils/email/sender", () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendMatchedJobsEmail: jest.fn().mockResolvedValue(true),
}));

// Mock matching engine
jest.mock("@/Utils/consolidatedMatchingV2", () => ({
  createConsolidatedMatcher: jest.fn().mockReturnValue({
    performMatching: jest.fn().mockResolvedValue({
      method: "ai_success",
      matches: [],
      confidence: 0.8,
      processingTime: 100,
    }),
  }),
}));

describe("POST /api/signup - Contract Tests", () => {
  let supabase: any;

  beforeAll(async () => {
    supabase = getDatabaseClient();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Input Validation", () => {
    it("should return 400 for missing required fields", async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({}), // Empty body
      } as any;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
    });

    it("should return 400 for missing email", async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          fullName: "Test User",
          cities: ["London"],
        }),
      } as any;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
    });

    it("should return 400 for missing fullName", async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          email: "test@example.com",
          cities: ["London"],
        }),
      } as any;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
    });

    it("should return 400 for missing cities", async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          email: "test@example.com",
          fullName: "Test User",
        }),
      } as any;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
    });

    it("should return 400 for empty cities array", async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          email: "test@example.com",
          fullName: "Test User",
          cities: [],
        }),
      } as any;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
    });
  });

  describe("Email Validation & Duplicates", () => {
    let existingUserEmail: string;

    beforeEach(async () => {
      existingUserEmail = `existing-${Date.now()}@example.com`;

      // Create existing user
      await supabase.from("users").insert({
        email: existingUserEmail,
        subscription_tier: "premium",
        active: true,
      });
    });

    afterEach(async () => {
      // Cleanup
      await supabase.from("users").delete().eq("email", existingUserEmail);
    });

    it("should return 409 for duplicate email", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          email: existingUserEmail,
          fullName: "New User",
          cities: ["London"],
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("Email already registered");
      expect(data.code).toBe("DUPLICATE_EMAIL");
    });

    it("should normalize email case", async () => {
      // Create user with uppercase email
      const upperCaseEmail = `uppercase-${Date.now()}@EXAMPLE.COM`;

      const { req } = createMocks({
        method: "POST",
        body: {
          email: upperCaseEmail,
          fullName: "Test User",
          cities: ["London"],
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(409); // Should still detect duplicate
      expect(data.error).toBe("Email already registered");
    });
  });

  describe("Successful Registration", () => {
    let testEmail: string;

    beforeEach(() => {
      testEmail = `signup-test-${Date.now()}@example.com`;
    });

    afterEach(async () => {
      // Cleanup created user
      try {
        await supabase.from("users").delete().eq("email", testEmail);
        await supabase.from("matches").delete().eq("user_email", testEmail);
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    it("should create premium user successfully", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          email: testEmail,
          fullName: "Test User",
          cities: ["London", "Berlin"],
          careerPath: "tech",
          workEnvironment: ["hybrid"],
          visaStatus: "eu-citizen",
          entryLevelPreferences: ["entry"],
          languages: ["English", "German"],
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("user");
      expect(data).toHaveProperty("matches");

      expect(data.user).toHaveProperty("email", testEmail.toLowerCase());
      expect(data.user).toHaveProperty("subscription_tier", "premium");
      expect(data.user).toHaveProperty("active", true);

      // Verify user was created in database
      const { data: dbUser } = await supabase
        .from("users")
        .select("*")
        .eq("email", testEmail.toLowerCase())
        .single();

      expect(dbUser).toBeTruthy();
      expect(dbUser.email).toBe(testEmail.toLowerCase());
      expect(dbUser.subscription_tier).toBe("premium");
      expect(dbUser.full_name).toBe("Test User");
      expect(dbUser.target_cities).toEqual(["London", "Berlin"]);
    });

    it("should handle minimal required data", async () => {
      const minimalEmail = `minimal-${Date.now()}@example.com`;

      const { req } = createMocks({
        method: "POST",
        body: {
          email: minimalEmail,
          fullName: "Minimal User",
          cities: ["London"],
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify user was created with defaults
      const { data: dbUser } = await supabase
        .from("users")
        .select("*")
        .eq("email", minimalEmail.toLowerCase())
        .single();

      expect(dbUser).toBeTruthy();
      expect(dbUser.target_cities).toEqual(["London"]);
      expect(dbUser.subscription_tier).toBe("premium");
    });

    it("should return matches in response", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          email: testEmail,
          fullName: "Test User",
          cities: ["London"],
          careerPath: "tech",
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("matches");
      expect(Array.isArray(data.matches)).toBe(true);

      // Matches structure should follow contract
      if (data.matches.length > 0) {
        const match = data.matches[0];
        expect(match).toHaveProperty("job_hash");
        expect(match).toHaveProperty("match_score");
        expect(match).toHaveProperty("match_reason");
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle rate limiting", async () => {
      // Mock rate limiter to return rate limit response
      const mockRateLimitResponse = new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429 },
      );

      const {
        getProductionRateLimiter,
      } = require("@/Utils/productionRateLimiter");
      getProductionRateLimiter().middleware.mockResolvedValue(
        mockRateLimitResponse,
      );

      const { req } = createMocks({
        method: "POST",
        body: {
          email: "test@example.com",
          fullName: "Test User",
          cities: ["London"],
        },
      });

      const response = await POST(req as any);

      expect(response.status).toBe(429);
    });

    it("should handle malformed JSON", async () => {
      const { req } = createMocks({
        method: "POST",
        headers: { "content-type": "application/json" },
      });

      // Mock req.json() to throw
      (req as any).json = jest
        .fn()
        .mockRejectedValue(new Error("Invalid JSON"));

      const response = await POST(req as any);

      expect(response.status).toBe(500);
    });
  });

  describe("Data Transformation", () => {
    let testEmail: string;

    beforeEach(() => {
      testEmail = `transform-test-${Date.now()}@example.com`;
    });

    afterEach(async () => {
      await supabase.from("users").delete().eq("email", testEmail);
    });

    it("should transform array fields correctly", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          email: testEmail,
          fullName: "Array Test User",
          cities: ["London", "Berlin", "Paris"],
          workEnvironment: ["remote", "hybrid"],
          entryLevelPreferences: ["entry", "junior"],
          languages: ["English", "French", "German"],
        },
      });

      const response = await POST(req as any);
      expect(response.status).toBe(200);

      // Verify database storage
      const { data: dbUser } = await supabase
        .from("users")
        .select("*")
        .eq("email", testEmail.toLowerCase())
        .single();

      expect(dbUser.target_cities).toEqual(["London", "Berlin", "Paris"]);
      expect(dbUser.languages_spoken).toEqual(["English", "French", "German"]);

      // Array fields should be stored as comma-separated strings or arrays
      if (dbUser.work_environment) {
        expect(typeof dbUser.work_environment).toBe("string");
      }
    });

    it("should handle optional fields gracefully", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          email: testEmail,
          fullName: "Optional Fields User",
          cities: ["London"],
          // No optional fields provided
        },
      });

      const response = await POST(req as any);
      expect(response.status).toBe(200);

      const { data: dbUser } = await supabase
        .from("users")
        .select("*")
        .eq("email", testEmail.toLowerCase())
        .single();

      expect(dbUser).toBeTruthy();
      // Optional fields should be null or have sensible defaults
      expect(dbUser.work_environment).toBeNull();
      expect(dbUser.visa_status).toBeNull();
    });
  });

  describe("Response Format Contract", () => {
    let testEmail: string;

    beforeEach(() => {
      testEmail = `contract-test-${Date.now()}@example.com`;
    });

    afterEach(async () => {
      await supabase.from("users").delete().eq("email", testEmail);
      await supabase.from("matches").delete().eq("user_email", testEmail);
    });

    it("should return correct success response format", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          email: testEmail,
          fullName: "Contract Test User",
          cities: ["London"],
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Success response contract
      expect(data).toEqual(
        expect.objectContaining({
          success: true,
          user: expect.objectContaining({
            id: expect.any(Number),
            email: testEmail.toLowerCase(),
            subscription_tier: "premium",
            active: true,
          }),
          matches: expect.any(Array),
        }),
      );

      // Each match should follow contract
      data.matches.forEach((match: any) => {
        expect(match).toEqual(
          expect.objectContaining({
            job_hash: expect.any(String),
            match_score: expect.any(Number),
            match_reason: expect.any(String),
          }),
        );
      });
    });
  });
});
