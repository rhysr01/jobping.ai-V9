/**
 * Tests for Resend Webhook API Route
 * Tests Resend webhook event handling
 */

import type { NextRequest } from "next/server";
import { POST } from "@/app/api/resend-webhook/route";

describe("Resend Webhook API Route", () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: "POST",
      json: jest.fn(),
      headers: new Headers(),
    } as any;
  });

  describe("POST /api/resend-webhook", () => {
    it("should process webhook event", async () => {
      const event = {
        type: "email.delivered",
        id: "evt_test123",
        data: {
          email: "user@example.com",
          timestamp: new Date().toISOString(),
        },
      };

      mockRequest.json.mockResolvedValue(event);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it("should handle email.bounced event", async () => {
      const event = {
        type: "email.bounced",
        id: "evt_bounce123",
        data: {
          email: "bounced@example.com",
        },
      };

      mockRequest.json.mockResolvedValue(event);

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });

    it("should handle email.complained event", async () => {
      const event = {
        type: "email.complained",
        id: "evt_complaint123",
        data: {
          email: "complaint@example.com",
        },
      };

      mockRequest.json.mockResolvedValue(event);

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });

    it("should handle errors gracefully", async () => {
      mockRequest.json.mockRejectedValue(new Error("Parse error"));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it("should log webhook events", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const event = {
        type: "email.delivered",
        id: "evt_test123",
        data: {},
      };

      mockRequest.json.mockResolvedValue(event);

      await POST(mockRequest);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[RESEND_WEBHOOK]",
        expect.objectContaining({
          type: "email.delivered",
          id: "evt_test123",
        }),
      );

      consoleSpy.mockRestore();
    });
  });
});
