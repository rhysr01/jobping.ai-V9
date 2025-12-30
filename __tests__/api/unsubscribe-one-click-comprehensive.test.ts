/**
 * Tests for Unsubscribe One-Click API Route
 * Tests one-click unsubscribe functionality (45 statements)
 */

import type { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/unsubscribe/one-click/route";

jest.mock("@/Utils/databasePool");
jest.mock("@/Utils/url-helpers", () => ({
  getBaseUrl: jest.fn(() => "https://jobping.com"),
}));

describe("Unsubscribe One-Click API Route", () => {
  let mockRequest: NextRequest;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: "POST",
      url: "https://example.com/api/unsubscribe/one-click?u=user@example.com&t=test-token",
      formData: jest.fn(),
      headers: new Headers(),
    } as any;

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockResolvedValue({ error: null }),
    };

    const { getDatabaseClient } = require("@/Utils/databasePool");
    getDatabaseClient.mockReturnValue(mockSupabase);

    process.env.UNSUBSCRIBE_SECRET = "test-secret";
  });

  describe("POST /api/unsubscribe/one-click", () => {
    it("should process one-click unsubscribe", async () => {
      const formData = new FormData();
      formData.append("List-Unsubscribe", "One-Click");
      mockRequest.formData.mockResolvedValue(formData);

      // Mock token generation
      const crypto = require("crypto");
      const token = crypto
        .createHmac("sha256", "test-secret")
        .update("user@example.com")
        .digest("hex")
        .slice(0, 16);

      mockRequest.url = `https://example.com/api/unsubscribe/one-click?u=user@example.com&t=${token}`;

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(mockSupabase.upsert).toHaveBeenCalled();
    });

    it("should require email and token", async () => {
      mockRequest.url = "https://example.com/api/unsubscribe/one-click";
      mockRequest.formData.mockResolvedValue(new FormData());

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it("should validate unsubscribe token", async () => {
      const formData = new FormData();
      formData.append("List-Unsubscribe", "One-Click");
      mockRequest.formData.mockResolvedValue(formData);

      mockRequest.url =
        "https://example.com/api/unsubscribe/one-click?u=user@example.com&t=invalid-token";

      const response = await POST(mockRequest);

      expect(response.status).toBe(401);
    });

    it("should validate List-Unsubscribe header", async () => {
      const formData = new FormData();
      formData.append("List-Unsubscribe", "Invalid");
      mockRequest.formData.mockResolvedValue(formData);

      const crypto = require("crypto");
      const token = crypto
        .createHmac("sha256", "test-secret")
        .update("user@example.com")
        .digest("hex")
        .slice(0, 16);

      mockRequest.url = `https://example.com/api/unsubscribe/one-click?u=user@example.com&t=${token}`;

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it("should handle database errors", async () => {
      const formData = new FormData();
      formData.append("List-Unsubscribe", "One-Click");
      mockRequest.formData.mockResolvedValue(formData);

      mockSupabase.upsert.mockResolvedValue({
        error: { message: "Database error" },
      });

      const crypto = require("crypto");
      const token = crypto
        .createHmac("sha256", "test-secret")
        .update("user@example.com")
        .digest("hex")
        .slice(0, 16);

      mockRequest.url = `https://example.com/api/unsubscribe/one-click?u=user@example.com&t=${token}`;

      const response = await POST(mockRequest);

      expect(response.status).toBeGreaterThanOrEqual(500);
    });
  });

  describe("GET /api/unsubscribe/one-click", () => {
    beforeEach(() => {
      mockRequest.method = "GET";
    });

    it("should show unsubscribe page for valid token", async () => {
      const crypto = require("crypto");
      const token = crypto
        .createHmac("sha256", "test-secret")
        .update("user@example.com")
        .digest("hex")
        .slice(0, 16);

      mockRequest.url = `https://example.com/api/unsubscribe/one-click?u=user@example.com&t=${token}`;

      const response = await GET(mockRequest);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/html");
      expect(html).toContain("Successfully Unsubscribed");
      expect(html).toContain("user@example.com");
    });

    it("should show error page for missing parameters", async () => {
      mockRequest.url = "https://example.com/api/unsubscribe/one-click";

      const response = await GET(mockRequest);
      const html = await response.text();

      expect(response.status).toBe(400);
      expect(html).toContain("Invalid Unsubscribe Link");
    });

    it("should show error page for invalid token", async () => {
      mockRequest.url =
        "https://example.com/api/unsubscribe/one-click?u=user@example.com&t=invalid";

      const response = await GET(mockRequest);
      const html = await response.text();

      expect(response.status).toBe(401);
      expect(html).toContain("Invalid Unsubscribe Link");
    });

    it("should handle database errors gracefully", async () => {
      const crypto = require("crypto");
      const token = crypto
        .createHmac("sha256", "test-secret")
        .update("user@example.com")
        .digest("hex")
        .slice(0, 16);

      mockRequest.url = `https://example.com/api/unsubscribe/one-click?u=user@example.com&t=${token}`;

      mockSupabase.upsert.mockResolvedValue({
        error: { message: "Database error" },
      });

      const response = await GET(mockRequest);
      const html = await response.text();

      expect(response.status).toBeGreaterThanOrEqual(500);
      expect(html).toContain("Error");
    });
  });
});
