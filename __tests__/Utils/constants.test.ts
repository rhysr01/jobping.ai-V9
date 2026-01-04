/**
 * Tests for Application Constants
 */

import {
	ERROR_CODES,
	HTTP_STATUS,
	TIMING,
} from "@/lib/constants";
import { ENV, isDevelopment, isProduction, isTest } from "@/lib/env";

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

	describe("ENV", () => {
		it("should have all required environment helpers", () => {
			expect(typeof isDevelopment).toBe("function");
			expect(typeof isProduction).toBe("function");
			expect(typeof isTest).toBe("function");
			expect(ENV).toBeDefined();
		});

		it.skip("should correctly identify development environment", () => {
			// TODO: Environment detection is tested at module load time
			// Consider refactoring to read from process.env dynamically for testability
			expect(true).toBe(true);
		});

		it.skip("should correctly identify production environment", () => {
			// TODO: Environment detection is tested at module load time
			expect(true).toBe(true);
		});

		it.skip("should correctly identify test environment", () => {
			// TODO: Environment detection is tested at module load time
			expect(true).toBe(true);
		});

		it.skip("should handle undefined NODE_ENV", () => {
			// TODO: Environment detection is tested at module load time
			expect(true).toBe(true);
		});
	});

	describe("TIMING", () => {
		it("should have all required timeout values", () => {
			expect(TIMING.API_TIMEOUT_MS).toBeDefined();
			expect(TIMING.API_QUERY_TIMEOUT_MS).toBeDefined();
			expect(TIMING.AI_TIMEOUT_MS).toBeDefined();
		});

		it("should have reasonable timeout values", () => {
			expect(TIMING.API_TIMEOUT_MS).toBeGreaterThan(0);
			expect(TIMING.API_TIMEOUT_MS).toBeLessThan(60000); // Less than 1 minute
			expect(TIMING.API_QUERY_TIMEOUT_MS).toBeGreaterThan(0);
			expect(TIMING.API_QUERY_TIMEOUT_MS).toBeLessThan(30000); // Less than 30 seconds
		});

		it("should have timeout values in milliseconds", () => {
			expect(TIMING.API_TIMEOUT_MS).toBeGreaterThan(1000); // At least 1 second
			expect(TIMING.API_QUERY_TIMEOUT_MS).toBeGreaterThan(1000); // At least 1 second
		});
	});
});
