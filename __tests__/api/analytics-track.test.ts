/**
 * Contract Tests for /api/analytics/track
 *
 * Tests the analytics tracking API contract - business metrics collection.
 * This API tracks user events for analytics and business intelligence.
 * Uses mocked database to avoid dependencies on analytics tables.
 */

import { createMocks } from "node-mocks-http";
import { POST } from "@/app/api/analytics/track/route";
import { apiLogger } from "@/lib/api-logger";

// Mock external dependencies
jest.mock("@/lib/api-logger", () => ({
  apiLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock database to avoid requiring analytics tables
const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn().mockResolvedValue({}),
  })),
};

jest.mock("@/Utils/databasePool", () => ({
  getDatabaseClient: jest.fn(() => mockSupabase),
}));

describe("POST /api/analytics/track - Contract Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Input Validation", () => {
    it("should return 400 for missing event", async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          properties: { userId: "123" },
        }),
      } as any;

      const response = await POST(mockRequest);
      expect(response.status).toBe(400); // API validates input

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Invalid event name");
    });

    it("should return 400 for non-string event", async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          event: 123,
          properties: { userId: "123" },
        }),
      } as any;

      const response = await POST(mockRequest);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Invalid event name");
    });

    it("should accept valid event with properties", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          event: "user_signup",
          properties: {
            userId: "123",
            tier: "free",
            source: "landing_page",
          },
        },
      });

      const response = await POST(req as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should accept valid event without properties", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          event: "page_view",
        },
      });

      const response = await POST(req as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe("Database Storage", () => {
    it("should store event in database when table exists", async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({}),
      });

      const { req } = createMocks({
        method: "POST",
        body: {
          event: "user_action",
          properties: { action: "click", element: "button" },
        },
      });

      await POST(req as any);

      expect(mockSupabase.from).toHaveBeenCalledWith("analytics_events");
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        event_name: "user_action",
        properties: { action: "click", element: "button" },
        created_at: expect.any(String),
      });
    });

    it("should handle missing analytics table gracefully", async () => {
      const tableNotFoundError = {
        code: "42P01",
        message: 'relation "analytics_events" does not exist',
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockRejectedValue(tableNotFoundError),
      });

      const { req } = createMocks({
        method: "POST",
        body: {
          event: "test_event",
        },
      });

      const response = await POST(req as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      expect(apiLogger.debug).toHaveBeenCalledWith(
        "Analytics table not found, skipping storage",
        { event: "test_event" },
      );
    });

    it("should handle other database errors gracefully", async () => {
      const dbError = new Error("Connection timeout");
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockRejectedValue(dbError),
      });

      const { req } = createMocks({
        method: "POST",
        body: {
          event: "test_event",
        },
      });

      const response = await POST(req as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      expect(apiLogger.warn).toHaveBeenCalledWith(
        "Analytics storage failed",
        dbError,
        { event: "test_event" },
      );
    });
  });

  describe("Logging and Monitoring", () => {
    it("should log successful event tracking", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          event: "successful_event",
          properties: { key: "value" },
        },
      });

      await POST(req as any);

      expect(apiLogger.debug).toHaveBeenCalledWith("Analytics event tracked", {
        event: "successful_event",
        hasProperties: true,
      });
    });

    it("should log events without properties", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          event: "simple_event",
        },
      });

      await POST(req as any);

      expect(apiLogger.debug).toHaveBeenCalledWith("Analytics event tracked", {
        event: "simple_event",
        hasProperties: false,
      });
    });

    it("should log JSON parsing errors", async () => {
      const { req } = createMocks({
        method: "POST",
        body: "invalid json",
      });

      await POST(req as any);

      expect(apiLogger.error).toHaveBeenCalledWith(
        "Analytics tracking failed",
        expect.any(SyntaxError),
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid JSON gracefully", async () => {
      const { req } = createMocks({
        method: "POST",
        body: "invalid json",
      });

      const response = await POST(req as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it("should handle empty request body", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {},
      });

      const response = await POST(req as any);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Invalid event name");
    });

    it("should handle null properties", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          event: "test_event",
          properties: null,
        },
      });

      const response = await POST(req as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        event_name: "test_event",
        properties: {},
        created_at: expect.any(String),
      });
    });
  });

  describe("Business Event Types", () => {
    const businessEvents = [
      "user_signup",
      "job_applied",
      "matches_viewed",
      "email_opened",
      "payment_completed",
      "feature_used",
      "page_view",
      "button_click",
    ];

    it.each(businessEvents)(
      "should accept business event: %s",
      async (eventName) => {
        const { req } = createMocks({
          method: "POST",
          body: {
            event: eventName,
            properties: {
              userId: "123",
              timestamp: Date.now(),
            },
          },
        });

        const response = await POST(req as any);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
      },
    );
  });

  describe("Properties Handling", () => {
    it("should handle complex properties object", async () => {
      const complexProperties = {
        user: {
          id: "123",
          email: "user@example.com",
          tier: "premium",
        },
        context: {
          page: "/matches",
          referrer: "https://google.com",
          userAgent: "Mozilla/5.0...",
        },
        metadata: {
          timestamp: Date.now(),
          sessionId: "sess_123",
          experiment: "variant_a",
        },
      };

      const { req } = createMocks({
        method: "POST",
        body: {
          event: "complex_event",
          properties: complexProperties,
        },
      });

      const response = await POST(req as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        event_name: "complex_event",
        properties: complexProperties,
        created_at: expect.any(String),
      });
    });

    it("should handle empty properties object", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          event: "empty_props_event",
          properties: {},
        },
      });

      const response = await POST(req as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        event_name: "empty_props_event",
        properties: {},
        created_at: expect.any(String),
      });
    });
  });

  describe("Response Format Contract", () => {
    it("should return consistent success response", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          event: "test_event",
          properties: { key: "value" },
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
      });
    });

    it("should return consistent error response", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          properties: { key: "value" },
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        error: "Invalid event name",
      });
    });

    it("should return success response even on JSON parsing errors", async () => {
      const { req } = createMocks({
        method: "POST",
        body: "invalid json",
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: false,
      });
    });
  });

  describe("Performance and Reliability", () => {
    it("should not throw errors that could break user experience", async () => {
      // Simulate database completely failing
      mockSupabase.from.mockImplementation(() => {
        throw new Error("Database completely down");
      });

      const { req } = createMocks({
        method: "POST",
        body: {
          event: "critical_event",
        },
      });

      // Should not throw - analytics should never break user flow
      const response = await POST(req as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should handle very long event names", async () => {
      const longEventName = "a".repeat(1000);

      const { req } = createMocks({
        method: "POST",
        body: {
          event: longEventName,
        },
      });

      const response = await POST(req as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should handle very large properties objects", async () => {
      const largeProperties = {};
      for (let i = 0; i < 100; i++) {
        largeProperties[`key${i}`] = "value".repeat(100); // 500 chars per value
      }

      const { req } = createMocks({
        method: "POST",
        body: {
          event: "large_props_event",
          properties: largeProperties,
        },
      });

      const response = await POST(req as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
