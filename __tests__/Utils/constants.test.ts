/**
 * Tests for Application Constants
 */

import {
	API_MESSAGES,
	ENV,
	ERROR_CODES,
	HTTP_STATUS,
	TIMEOUTS,
} from "@/lib/constants";

describe("Application Constants", () => {
	describe("HTTP_STATUS", () => {
		it("should have all required HTTP status codes", () => {
			expect(HTTP_STATUS.OK).toBe(200);
			expect(HTTP_STATUS.CREATED).toBe(201);
			expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
			expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
			expect(HTTP_STATUS.NOT_FOUND).toBe(404);
			expect(HTTP_STATUS.INTERNAL_ERROR).toBe(500);
		});

		it("should have correct status code ranges", () => {
			// Success codes (200-299)
			expect(HTTP_STATUS.OK).toBeGreaterThanOrEqual(200);
			expect(HTTP_STATUS.OK).toBeLessThan(300);

			// Client error codes (400-499)
			expect(HTTP_STATUS.BAD_REQUEST).toBeGreaterThanOrEqual(400);
			expect(HTTP_STATUS.BAD_REQUEST).toBeLessThan(500);

			// Server error codes (500-599)
			expect(HTTP_STATUS.INTERNAL_ERROR).toBeGreaterThanOrEqual(500);
			expect(HTTP_STATUS.INTERNAL_ERROR).toBeLessThan(600);
		});
	});

	describe("ERROR_CODES", () => {
		it("should have all required error codes", () => {
			expect(ERROR_CODES.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
			expect(ERROR_CODES.UNAUTHORIZED).toBe("UNAUTHORIZED");
			expect(ERROR_CODES.FORBIDDEN).toBe("FORBIDDEN");
			expect(ERROR_CODES.NOT_FOUND).toBe("NOT_FOUND");
			expect(ERROR_CODES.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
			expect(ERROR_CODES.RATE_LIMITED).toBe("RATE_LIMITED");
		});

		it("should have consistent naming convention", () => {
			const errorCodes = Object.values(ERROR_CODES);
			errorCodes.forEach((code) => {
				expect(code).toMatch(/^[A-Z_]+$/);
			});
		});
	});

	describe("API_MESSAGES", () => {
		it("should have all required API messages", () => {
			expect(API_MESSAGES.SUCCESS).toBe("Operation completed successfully");
			expect(API_MESSAGES.INTERNAL_ERROR).toBe(
				"An internal server error occurred",
			);
			expect(API_MESSAGES.VALIDATION_FAILED).toBe("Request validation failed");
			expect(API_MESSAGES.UNAUTHORIZED).toBe("Authentication required");
			expect(API_MESSAGES.FORBIDDEN).toBe("Access denied");
			expect(API_MESSAGES.NOT_FOUND).toBe("Resource not found");
		});

		it("should have non-empty messages", () => {
			const messages = Object.values(API_MESSAGES);
			messages.forEach((message) => {
				expect(message).toBeTruthy();
				expect(typeof message).toBe("string");
				expect(message.length).toBeGreaterThan(0);
			});
		});
	});

	describe("ENV", () => {
		it("should have all required environment helpers", () => {
			expect(typeof ENV.isDevelopment).toBe("function");
			expect(typeof ENV.isProduction).toBe("function");
			expect(typeof ENV.isTest).toBe("function");
		});

		it("should correctly identify development environment", () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "development";
			expect(ENV.isDevelopment()).toBe(true);
			expect(ENV.isProduction()).toBe(false);
			expect(ENV.isTest()).toBe(false);
			process.env.NODE_ENV = originalEnv;
		});

		it("should correctly identify production environment", () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "production";
			expect(ENV.isDevelopment()).toBe(false);
			expect(ENV.isProduction()).toBe(true);
			expect(ENV.isTest()).toBe(false);
			process.env.NODE_ENV = originalEnv;
		});

		it("should correctly identify test environment", () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "test";
			expect(ENV.isDevelopment()).toBe(false);
			expect(ENV.isProduction()).toBe(false);
			expect(ENV.isTest()).toBe(true);
			process.env.NODE_ENV = originalEnv;
		});

		it("should handle undefined NODE_ENV", () => {
			const originalEnv = process.env.NODE_ENV;
			delete process.env.NODE_ENV;
			expect(ENV.isDevelopment()).toBe(false);
			expect(ENV.isProduction()).toBe(false);
			expect(ENV.isTest()).toBe(false);
			process.env.NODE_ENV = originalEnv;
		});
	});

	describe("TIMEOUTS", () => {
		it("should have all required timeout values", () => {
			expect(TIMEOUTS.API_REQUEST).toBeDefined();
			expect(TIMEOUTS.DATABASE_QUERY).toBeDefined();
			expect(TIMEOUTS.EMAIL_SEND).toBeDefined();
			expect(TIMEOUTS.AI_MATCHING).toBeDefined();
		});

		it("should have reasonable timeout values", () => {
			expect(TIMEOUTS.API_REQUEST).toBeGreaterThan(0);
			expect(TIMEOUTS.API_REQUEST).toBeLessThan(60000); // Less than 1 minute
			expect(TIMEOUTS.DATABASE_QUERY).toBeGreaterThan(0);
			expect(TIMEOUTS.DATABASE_QUERY).toBeLessThan(30000); // Less than 30 seconds
		});

		it("should have timeout values in milliseconds", () => {
			expect(TIMEOUTS.API_REQUEST).toBeGreaterThan(1000); // At least 1 second
			expect(TIMEOUTS.DATABASE_QUERY).toBeGreaterThan(1000); // At least 1 second
		});
	});
});
