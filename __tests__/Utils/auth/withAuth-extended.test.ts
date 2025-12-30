/**
 * Comprehensive tests for WithAuth Middleware
 * Tests system key validation, method checking, error handling
 */

import { type NextRequest, NextResponse } from "next/server";
import { requireSystemKey, withAuth } from "@/Utils/auth/withAuth";

describe("WithAuth Middleware", () => {
  let mockRequest: NextRequest;
  let mockHandler: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SYSTEM_API_KEY;

    mockRequest = {
      method: "POST",
      headers: new Headers(),
    } as any;

    mockHandler = jest
      .fn()
      .mockResolvedValue(NextResponse.json({ success: true }));
  });

  describe("requireSystemKey", () => {
    it("should throw if SYSTEM_API_KEY not configured", () => {
      expect(() => {
        requireSystemKey(mockRequest);
      }).toThrow("SYSTEM_API_KEY not configured");
    });

    it("should throw if API key missing", () => {
      process.env.SYSTEM_API_KEY = "test-key";

      expect(() => {
        requireSystemKey(mockRequest);
      }).toThrow("Unauthorized");
    });

    it("should throw if API key invalid", () => {
      process.env.SYSTEM_API_KEY = "test-key";
      mockRequest.headers.set("x-api-key", "wrong-key");

      expect(() => {
        requireSystemKey(mockRequest);
      }).toThrow("Unauthorized");
    });

    it("should pass with valid API key", () => {
      process.env.SYSTEM_API_KEY = "test-key";
      mockRequest.headers.set("x-api-key", "test-key");

      expect(() => {
        requireSystemKey(mockRequest);
      }).not.toThrow();
    });
  });

  describe("withAuth", () => {
    it("should call handler when auth passes", async () => {
      process.env.SYSTEM_API_KEY = "test-key";
      mockRequest.headers.set("x-api-key", "test-key");

      const wrapped = withAuth(mockHandler, { requireSystemKey: true });
      const response = await wrapped(mockRequest);

      expect(mockHandler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it("should return 401 for invalid API key", async () => {
      process.env.SYSTEM_API_KEY = "test-key";
      mockRequest.headers.set("x-api-key", "wrong-key");

      const wrapped = withAuth(mockHandler, { requireSystemKey: true });
      const response = await wrapped(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it("should validate HTTP method", async () => {
      mockRequest.method = "GET";

      const wrapped = withAuth(mockHandler, { allowedMethods: ["POST"] });
      const response = await wrapped(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toContain("Method not allowed");
    });

    it("should allow multiple methods", async () => {
      mockRequest.method = "GET";

      const wrapped = withAuth(mockHandler, {
        allowedMethods: ["GET", "POST"],
      });
      const response = await wrapped(mockRequest);

      expect(mockHandler).toHaveBeenCalled();
    });

    it("should handle handler errors", async () => {
      process.env.SYSTEM_API_KEY = "test-key";
      mockRequest.headers.set("x-api-key", "test-key");
      mockHandler.mockRejectedValue(new Error("Handler error"));

      const wrapped = withAuth(mockHandler, { requireSystemKey: true });
      const response = await wrapped(mockRequest);

      expect(response.status).toBe(500);
    });
  });
});
