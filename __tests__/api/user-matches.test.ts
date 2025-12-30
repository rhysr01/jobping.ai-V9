/**
 * Tests for User Matches API Route
 * Tests user match retrieval endpoint
 */

import type { NextRequest } from "next/server";
import { GET } from "@/app/api/user-matches/route";

jest.mock("@/Utils/databasePool");
jest.mock("@/Utils/productionRateLimiter");
jest.mock("@/Utils/auth/hmac");
// Sentry removed - using Axiom for error tracking

describe("User Matches API Route", () => {
  let mockRequest: NextRequest;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: "GET",
      url: "https://example.com/api/user-matches?email=user@example.com&limit=10&signature=test&timestamp=1234567890",
      headers: new Headers(),
    } as any;

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [
          {
            match_score: 85,
            jobs: {
              id: 1,
              title: "Software Engineer",
              company: "Tech Corp",
            },
          },
        ],
        error: null,
      }),
    };

    const { getDatabaseClient } = require("@/Utils/databasePool");
    getDatabaseClient.mockReturnValue(mockSupabase);

    const {
      getProductionRateLimiter,
    } = require("@/Utils/productionRateLimiter");
    getProductionRateLimiter.mockReturnValue({
      middleware: jest.fn().mockResolvedValue(null),
    });

    const { verifyHMAC } = require("@/Utils/auth/hmac");
    verifyHMAC.mockReturnValue({ isValid: true });
  });

  describe("GET /api/user-matches", () => {
    it("should return user matches", async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.matches).toBeDefined();
    });

    it("should return 400 for invalid email", async () => {
      mockRequest.url =
        "https://example.com/api/user-matches?email=invalid&signature=test&timestamp=1234567890";

      const response = await GET(mockRequest);

      expect(response.status).toBe(400);
    });

    it("should return 400 for missing signature", async () => {
      mockRequest.url =
        "https://example.com/api/user-matches?email=user@example.com&timestamp=1234567890";

      const response = await GET(mockRequest);

      expect(response.status).toBe(400);
    });

    it("should return 401 for invalid HMAC signature", async () => {
      const { verifyHMAC } = require("@/Utils/auth/hmac");
      verifyHMAC.mockReturnValue({
        isValid: false,
        error: "Invalid signature",
      });

      const response = await GET(mockRequest);

      expect(response.status).toBe(401);
    });

    it("should respect limit parameter", async () => {
      mockRequest.url =
        "https://example.com/api/user-matches?email=user@example.com&limit=5&signature=test&timestamp=1234567890";

      await GET(mockRequest);

      expect(mockSupabase.limit).toHaveBeenCalledWith(5);
    });

    it("should respect minScore parameter", async () => {
      mockRequest.url =
        "https://example.com/api/user-matches?email=user@example.com&minScore=80&signature=test&timestamp=1234567890";

      await GET(mockRequest);

      expect(mockSupabase.gte).toHaveBeenCalledWith("match_score", 80);
    });

    it("should handle database errors", async () => {
      mockSupabase.limit.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const response = await GET(mockRequest);

      expect(response.status).toBeGreaterThanOrEqual(500);
    });

    it("should handle query timeout", async () => {
      jest.useFakeTimers();
      mockSupabase.limit.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 15000)),
      );

      const promise = GET(mockRequest);
      jest.advanceTimersByTime(11000);

      const response = await promise;
      expect(response.status).toBeGreaterThanOrEqual(500);
      jest.useRealTimers();
    });
  });
});
