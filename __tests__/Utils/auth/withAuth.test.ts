/**
 * Tests for withAuth
 * Tests authentication middleware wrapper
 */

import { type NextRequest, NextResponse } from "next/server";
import { requireSystemKey, withAuth } from "@/Utils/auth/withAuth";

describe("withAuth", () => {
	let mockRequest: NextRequest;

	beforeEach(() => {
		jest.clearAllMocks();

		mockRequest = {
			method: "GET",
			headers: new Headers(),
		} as NextRequest;

		process.env.SYSTEM_API_KEY = "test-system-key";
	});

	afterEach(() => {
		delete process.env.SYSTEM_API_KEY;
	});

	describe("requireSystemKey", () => {
		it("should pass with valid system key", () => {
			mockRequest.headers.set("x-api-key", "test-system-key");
			expect(() => requireSystemKey(mockRequest)).not.toThrow();
		});

		it("should throw when system key is missing", () => {
			delete process.env.SYSTEM_API_KEY;
			expect(() => requireSystemKey(mockRequest)).toThrow(
				"SYSTEM_API_KEY not configured",
			);
		});

		it("should throw when API key header is missing", () => {
			expect(() => requireSystemKey(mockRequest)).toThrow("Unauthorized");
		});

		it("should throw when API key is invalid", () => {
			mockRequest.headers.set("x-api-key", "wrong-key");
			expect(() => requireSystemKey(mockRequest)).toThrow("Unauthorized");
		});
	});

	describe("withAuth wrapper", () => {
		const mockHandler = jest.fn(async (req: NextRequest) => {
			return NextResponse.json({ success: true });
		});

		it("should call handler when no auth required", async () => {
			const wrappedHandler = withAuth(mockHandler);
			await wrappedHandler(mockRequest);

			expect(mockHandler).toHaveBeenCalledWith(mockRequest);
		});

		it("should validate system key when required", async () => {
			mockRequest.headers.set("x-api-key", "test-system-key");
			const wrappedHandler = withAuth(mockHandler, { requireSystemKey: true });
			await wrappedHandler(mockRequest);

			expect(mockHandler).toHaveBeenCalled();
		});

		it("should reject when system key is invalid", async () => {
			mockRequest.headers.set("x-api-key", "wrong-key");
			const wrappedHandler = withAuth(mockHandler, { requireSystemKey: true });
			const response = await wrappedHandler(mockRequest);

			expect(mockHandler).not.toHaveBeenCalled();
			expect(response.status).toBe(401);
			const json = await response.json();
			expect(json.error).toContain("Unauthorized");
		});

		it("should validate HTTP methods", async () => {
			mockRequest.method = "POST";
			const wrappedHandler = withAuth(mockHandler, { allowedMethods: ["GET"] });
			const response = await wrappedHandler(mockRequest);

			expect(mockHandler).not.toHaveBeenCalled();
			expect(response.status).toBe(405);
			const json = await response.json();
			expect(json.error).toBe("Method not allowed");
		});

		it("should allow multiple methods", async () => {
			mockRequest.method = "POST";
			const wrappedHandler = withAuth(mockHandler, {
				allowedMethods: ["GET", "POST"],
			});
			await wrappedHandler(mockRequest);

			expect(mockHandler).toHaveBeenCalled();
		});

		it("should handle handler errors", async () => {
			const errorHandler = jest.fn(async () => {
				throw new Error("Handler error");
			});

			const wrappedHandler = withAuth(errorHandler);
			const response = await wrappedHandler(mockRequest);

			expect(response.status).toBe(500);
			const json = await response.json();
			expect(json.error).toBe("Internal server error");
		});

		it("should handle authentication errors with 401", async () => {
			const errorHandler = jest.fn(async () => {
				throw new Error("Unauthorized: Invalid token");
			});

			const wrappedHandler = withAuth(errorHandler);
			const response = await wrappedHandler(mockRequest);

			expect(response.status).toBe(401);
			const json = await response.json();
			expect(json.error).toContain("Unauthorized");
		});

		it("should combine method and auth validation", async () => {
			mockRequest.method = "POST";
			mockRequest.headers.set("x-api-key", "test-system-key");
			const wrappedHandler = withAuth(mockHandler, {
				requireSystemKey: true,
				allowedMethods: ["POST", "PUT"],
			});
			await wrappedHandler(mockRequest);

			expect(mockHandler).toHaveBeenCalled();
		});
	});
});
