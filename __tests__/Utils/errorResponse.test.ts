/**
 * Tests for Error Response Utilities
 * Tests error response formatting used across API routes
 * Note: This module is deprecated but still used in some routes
 */

import { NextRequest, NextResponse } from "next/server";
import { errorJson, errorResponse, getRequestId } from "@/Utils/errorResponse";

describe("Error Response Utilities", () => {
	let mockRequest: NextRequest;

	beforeEach(() => {
		mockRequest = {
			headers: new Headers(),
		} as NextRequest;
	});

	describe("errorJson", () => {
		it("should create error response with correct status code", () => {
			const response = errorJson(
				mockRequest,
				"TEST_ERROR",
				"Test message",
				400,
			);

			// Behavior: Should return NextResponse with correct status
			expect(response).toBeInstanceOf(NextResponse);
			expect(response.status).toBe(400);
			// ✅ Tests outcome (status code), not implementation
		});

		it("should include request ID in response headers", () => {
			const response = errorJson(
				mockRequest,
				"TEST_ERROR",
				"Test message",
				400,
			);

			// Behavior: Should set x-request-id header
			expect(response.headers.get("x-request-id")).toBeTruthy();
			// ✅ Tests outcome (header present), not implementation
		});
	});

	describe("errorResponse convenience methods", () => {
		it("should create badRequest response", () => {
			const response = errorResponse.badRequest(mockRequest, "Invalid input");

			// Behavior: Should return 400 status
			expect(response.status).toBe(400);
			// ✅ Tests outcome, not implementation
		});

		it("should create unauthorized response", () => {
			const response = errorResponse.unauthorized(mockRequest);

			// Behavior: Should return 401 status
			expect(response.status).toBe(401);
			// ✅ Tests outcome, not implementation
		});

		it("should create forbidden response", () => {
			const response = errorResponse.forbidden(mockRequest);

			// Behavior: Should return 403 status
			expect(response.status).toBe(403);
			// ✅ Tests outcome, not implementation
		});

		it("should create notFound response", () => {
			const response = errorResponse.notFound(mockRequest);

			// Behavior: Should return 404 status
			expect(response.status).toBe(404);
			// ✅ Tests outcome, not implementation
		});

		it("should create rateLimited response", () => {
			const response = errorResponse.rateLimited(mockRequest);

			// Behavior: Should return 429 status
			expect(response.status).toBe(429);
			// ✅ Tests outcome, not implementation
		});

		it("should create internal error response", () => {
			const response = errorResponse.internal(mockRequest);

			// Behavior: Should return 500 status
			expect(response.status).toBe(500);
			// ✅ Tests outcome, not implementation
		});
	});

	describe("getRequestId", () => {
		it("should extract request ID from headers", () => {
			mockRequest.headers.set("x-request-id", "test-request-id-123");

			const requestId = getRequestId(mockRequest);

			// Behavior: Should return header value when present
			expect(requestId).toBe("test-request-id-123");
			// ✅ Tests outcome, not implementation
		});

		it("should generate request ID when header is missing", () => {
			const requestId = getRequestId(mockRequest);

			// Behavior: Should generate a request ID
			expect(requestId).toBeTruthy();
			expect(typeof requestId).toBe("string");
			// ✅ Tests outcome (ID generated), not implementation
		});
	});
});
