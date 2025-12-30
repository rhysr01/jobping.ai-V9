/**
 * Tests for Stats API Route
 * Tests statistics endpoint
 */

import type { NextRequest } from "next/server";
import { GET } from "@/app/api/stats/route";

jest.mock("@/Utils/databasePool");

describe("Stats API Route", () => {
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
      count: jest.fn().mockResolvedValue({ count: 50, error: null }),
    };

    const { getDatabaseClient } = require("@/Utils/databasePool");
    getDatabaseClient.mockReturnValue(mockSupabase);
  });

  describe("GET /api/stats", () => {
    it("should return statistics", async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeDefined();
    });

    it("should include user statistics", async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data).toHaveProperty("users");
    });

    it("should include job statistics", async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data).toHaveProperty("jobs");
    });
  });
});
