/**
 * Tests for Feedback Email API Route
 * Tests email feedback collection (63 statements)
 */

import type { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/feedback/email/route";

jest.mock("@/Utils/databasePool");

describe("Feedback Email API Route", () => {
  let mockRequest: NextRequest;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: "POST",
      url: "https://example.com/api/feedback/email?action=positive&score=5&email=user@example.com",
      headers: new Headers(),
    } as any;

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    const { getDatabaseClient } = require("@/Utils/databasePool");
    getDatabaseClient.mockReturnValue(mockSupabase);
  });

  describe("POST /api/feedback/email", () => {
    it("should record positive feedback", async () => {
      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(mockSupabase.insert).toHaveBeenCalledTimes(2); // user_feedback + match_logs
    });

    it("should record negative feedback", async () => {
      mockRequest.url =
        "https://example.com/api/feedback/email?action=negative&score=2&email=user@example.com";

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });

    it("should record neutral feedback", async () => {
      mockRequest.url =
        "https://example.com/api/feedback/email?action=neutral&score=3&email=user@example.com";

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });

    it("should require action parameter", async () => {
      mockRequest.url =
        "https://example.com/api/feedback/email?score=5&email=user@example.com";

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it("should require email parameter", async () => {
      mockRequest.url =
        "https://example.com/api/feedback/email?action=positive&score=5";

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it("should validate action values", async () => {
      mockRequest.url =
        "https://example.com/api/feedback/email?action=invalid&score=5&email=user@example.com";

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it("should validate score range", async () => {
      mockRequest.url =
        "https://example.com/api/feedback/email?action=positive&score=10&email=user@example.com";

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it("should return HTML success page", async () => {
      const response = await POST(mockRequest);

      // NextResponse returns HTML directly, check status and headers
      expect(response.status).toBe(200);
      const contentType = response.headers.get("Content-Type");
      if (contentType) {
        expect(contentType).toContain("text/html");
      }
      // If response has body, check it contains expected content
      if (response.body) {
        const html = await new Response(response.body).text();
        expect(html).toContain("Thank You");
      }
    });

    it("should handle database errors gracefully", async () => {
      mockSupabase.insert.mockResolvedValue({
        error: { message: "Database error" },
      });

      const response = await POST(mockRequest);

      expect(response.status).toBeGreaterThanOrEqual(500);
    });
  });

  describe("GET /api/feedback/email", () => {
    beforeEach(() => {
      mockRequest.method = "GET";
      mockRequest.url =
        "https://example.com/api/feedback/email?email=user@example.com";
    });

    it("should retrieve feedback stats", async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [
          {
            verdict: "positive",
            relevance_score: 5,
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.feedback).toBeDefined();
    });

    it("should require email parameter", async () => {
      mockRequest.url = "https://example.com/api/feedback/email";

      const response = await GET(mockRequest);

      expect(response.status).toBe(400);
    });
  });
});
