/**
 * Tests for Track Engagement API Route
 * Tests email engagement tracking (opens/clicks)
 */

import type { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/track-engagement/route";

jest.mock("@/Utils/engagementTracker");
jest.mock("@/lib/errors", () => ({
  asyncHandler: (fn: any) => fn,
  ValidationError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ValidationError";
    }
  },
}));

describe("Track Engagement API Route", () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: "POST",
      json: jest.fn(),
      headers: new Headers(),
    } as any;
  });

  describe("POST /api/track-engagement", () => {
    it("should track email opened", async () => {
      mockRequest.json.mockResolvedValue({
        email: "user@example.com",
        type: "email_opened",
      });

      const { updateUserEngagement } = require("@/Utils/engagementTracker");
      updateUserEngagement.mockResolvedValue(undefined);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(updateUserEngagement).toHaveBeenCalledWith(
        "user@example.com",
        "email_opened",
      );
    });

    it("should track email clicked", async () => {
      mockRequest.json.mockResolvedValue({
        email: "user@example.com",
        type: "email_clicked",
      });

      const { updateUserEngagement } = require("@/Utils/engagementTracker");
      updateUserEngagement.mockResolvedValue(undefined);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(updateUserEngagement).toHaveBeenCalledWith(
        "user@example.com",
        "email_clicked",
      );
    });

    it("should require email and type", async () => {
      mockRequest.json.mockResolvedValue({
        email: "user@example.com",
        // Missing type
      });

      await expect(POST(mockRequest)).rejects.toThrow();
    });

    it("should validate type values", async () => {
      mockRequest.json.mockResolvedValue({
        email: "user@example.com",
        type: "invalid_type",
      });

      await expect(POST(mockRequest)).rejects.toThrow();
    });
  });

  describe("GET /api/track-engagement", () => {
    beforeEach(() => {
      mockRequest.method = "GET";
    });

    it("should track email opened and return pixel", async () => {
      mockRequest.url =
        "https://example.com/api/track-engagement?email=user@example.com&type=email_opened";

      const { updateUserEngagement } = require("@/Utils/engagementTracker");
      updateUserEngagement.mockResolvedValue(undefined);

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/png");
      expect(updateUserEngagement).toHaveBeenCalledWith(
        "user@example.com",
        "email_opened",
      );
    });

    it("should track email clicked and redirect", async () => {
      mockRequest.url =
        "https://example.com/api/track-engagement?email=user@example.com&type=email_clicked&url=https%3A%2F%2Fexample.com%2Fjob";

      const { updateUserEngagement } = require("@/Utils/engagementTracker");
      updateUserEngagement.mockResolvedValue(undefined);

      const response = await GET(mockRequest);

      expect(response.status).toBeGreaterThanOrEqual(300);
      expect(response.status).toBeLessThan(400);
      expect(updateUserEngagement).toHaveBeenCalledWith(
        "user@example.com",
        "email_clicked",
      );
    });

    it("should require email and type parameters", async () => {
      mockRequest.url =
        "https://example.com/api/track-engagement?email=user@example.com";

      await expect(GET(mockRequest)).rejects.toThrow();
    });

    it("should validate type parameter", async () => {
      mockRequest.url =
        "https://example.com/api/track-engagement?email=user@example.com&type=invalid";

      await expect(GET(mockRequest)).rejects.toThrow();
    });
  });
});
