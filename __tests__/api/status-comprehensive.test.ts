/**
 * Tests for Status API Route
 * Tests lightweight status endpoint for monitoring
 */

import type { NextRequest } from "next/server";
import { GET } from "@/app/api/status/route";

jest.mock("@/Utils/databasePool");

describe("Status API Route", () => {
  let mockRequest: NextRequest;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: "GET",
      headers: new Headers(),
    } as any;

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    const { getDatabaseClient } = require("@/Utils/databasePool");
    getDatabaseClient.mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/status", () => {
    it("should return healthy status", async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("healthy");
      expect(data.uptime).toBeDefined();
      expect(data.responseTime).toBeDefined();
    });

    it("should include database check", async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.checks).toBeDefined();
      expect(data.checks.database).toBeDefined();
    });

    it("should return fast response (non-blocking)", async () => {
      const start = Date.now();
      await GET(mockRequest);
      const duration = Date.now() - start;

      // Should respond quickly even if DB is slow
      expect(duration).toBeLessThan(100);
    });

    it("should handle database timeout gracefully", async () => {
      mockSupabase.limit.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ error: null }), 300),
          ),
      );

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("healthy");
    });

    it("should include response time headers", async () => {
      const response = await GET(mockRequest);

      expect(response.headers.get("X-Response-Time")).toBeDefined();
      expect(response.headers.get("Cache-Control")).toContain("no-cache");
    });

    it("should handle errors gracefully", async () => {
      const { getDatabaseClient } = require("@/Utils/databasePool");
      getDatabaseClient.mockImplementation(() => {
        throw new Error("Database error");
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe("unhealthy");
    });
  });
});
