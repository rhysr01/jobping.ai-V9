import type { NextRequest } from "next/server";
import { ERROR_CODES, HTTP_STATUS } from "@/lib/constants";
import { errorJson, errorResponse, getRequestId } from "@/Utils/errorResponse";

// Mock NextRequest
function createMockRequest(headers?: Record<string, string>): NextRequest {
  const mockHeaders = new Headers();
  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      mockHeaders.set(key, value);
    });
  }

  return {
    headers: mockHeaders,
  } as NextRequest;
}

describe("errorResponse", () => {
  describe("getRequestId", () => {
    it("should use x-request-id header if present", () => {
      const req = createMockRequest({ "x-request-id": "custom-id-123" });
      const id = getRequestId(req);
      expect(id).toBe("custom-id-123");
    });

    it("should generate random ID if header not present", () => {
      const req = createMockRequest();
      const id = getRequestId(req);
      expect(id).toBeTruthy();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });

    it("should generate new ID if header is empty", () => {
      const req = createMockRequest({ "x-request-id": "" });
      const id = getRequestId(req);
      expect(id).toBeTruthy();
      expect(id).not.toBe("");
    });
  });

  describe("errorJson", () => {
    it("should create error response with all fields", async () => {
      const req = createMockRequest();
      const res = errorJson(
        req,
        ERROR_CODES.VALIDATION_ERROR,
        "Test error",
        HTTP_STATUS.BAD_REQUEST,
        { field: "test" },
      );

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
      const json = await res.json();
      expect(json).toMatchObject({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: "Test error",
        details: { field: "test" },
      });
      expect(json.requestId).toBeTruthy();
    });

    it("should include request ID in response", () => {
      const req = createMockRequest({ "x-request-id": "test-id" });
      const res = errorJson(req, ERROR_CODES.VALIDATION_ERROR, "Test error");
      expect(res.headers.get("x-request-id")).toBe("test-id");
    });

    it("should generate request ID if not in header", () => {
      const req = createMockRequest();
      const res = errorJson(req, ERROR_CODES.VALIDATION_ERROR, "Test error");
      expect(res.headers.get("x-request-id")).toBeTruthy();
    });

    it("should use default status code", () => {
      const req = createMockRequest();
      const res = errorJson(req, ERROR_CODES.VALIDATION_ERROR, "Test error");
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe("errorResponse.badRequest", () => {
    it("should create bad request response", async () => {
      const req = createMockRequest();
      const res = errorResponse.badRequest(req, "Invalid input", {
        field: "email",
      });

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
      const json = await res.json();
      expect(json.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(json.message).toBe("Invalid input");
      expect(json.details).toEqual({ field: "email" });
    });
  });

  describe("errorResponse.unauthorized", () => {
    it("should create unauthorized response with default message", async () => {
      const req = createMockRequest();
      const res = errorResponse.unauthorized(req);

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      const json = await res.json();
      expect(json.code).toBe(ERROR_CODES.UNAUTHORIZED);
      expect(json.message).toBe("Authentication required");
    });

    it("should use custom message", async () => {
      const req = createMockRequest();
      const res = errorResponse.unauthorized(req, "Custom auth error");

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      const json = await res.json();
      expect(json.message).toBe("Custom auth error");
    });
  });

  describe("errorResponse.forbidden", () => {
    it("should create forbidden response", async () => {
      const req = createMockRequest();
      const res = errorResponse.forbidden(req);

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
      const json = await res.json();
      expect(json.code).toBe(ERROR_CODES.FORBIDDEN);
      expect(json.message).toBe("Access denied");
    });
  });

  describe("errorResponse.notFound", () => {
    it("should create not found response", async () => {
      const req = createMockRequest();
      const res = errorResponse.notFound(req);

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
      const json = await res.json();
      expect(json.code).toBe(ERROR_CODES.NOT_FOUND);
      expect(json.message).toBe("Resource not found");
    });
  });

  describe("errorResponse.rateLimited", () => {
    it("should create rate limited response", async () => {
      const req = createMockRequest();
      const res = errorResponse.rateLimited(req);

      expect(res.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
      const json = await res.json();
      expect(json.code).toBe(ERROR_CODES.RATE_LIMITED);
      expect(json.message).toBe("Too many requests");
    });
  });

  describe("errorResponse.internal", () => {
    it("should create internal error response", async () => {
      const req = createMockRequest();
      const res = errorResponse.internal(req, "Server error", {
        stack: "trace",
      });

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_ERROR);
      const json = await res.json();
      expect(json.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(json.message).toBe("Server error");
      expect(json.details).toEqual({ stack: "trace" });
    });

    it("should use default message", async () => {
      const req = createMockRequest();
      const res = errorResponse.internal(req);

      const json = await res.json();
      expect(json.message).toBe("Internal server error");
    });
  });
});
