/**
 * Comprehensive tests for Supabase Utilities
 * Tests all functions including retry logic, health checks, and error handling
 */

import { getDatabaseClient } from "@/Utils/databasePool";
import {
	checkDatabaseHealth,
	createSupabaseClient,
	executeWithRetry,
	wrapDatabaseResponse,
} from "@/Utils/supabase";

jest.mock("@supabase/supabase-js", () => ({
	createClient: jest.fn(),
}));
jest.mock("@/Utils/databasePool");

describe("Supabase Utilities - Comprehensive", () => {
	const originalEnv = process.env;
	let mockCreateClient: any;
	let mockSupabase: any;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };

		mockSupabase = {
			from: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			limit: jest.fn().mockResolvedValue({ data: [], error: null }),
		};

		const { createClient } = require("@supabase/supabase-js");
		mockCreateClient = createClient;
		mockCreateClient.mockReturnValue(mockSupabase);

		process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
		process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
	});

	afterEach(() => {
		process.env = originalEnv;
		jest.restoreAllMocks();
	});

	describe("getSupabaseClient (deprecated - delegates to getDatabaseClient)", () => {
		it.skip("getSupabaseClient is deprecated - use getDatabaseClient instead", () => {
			// This test suite is skipped as getSupabaseClient is deprecated
			// All functionality now delegates to getDatabaseClient
		});
	});

	describe("createSupabaseClient", () => {
		it("should create new client instance", () => {
			const client = createSupabaseClient();

			expect(client).toBeDefined();
			expect(mockCreateClient).toHaveBeenCalled();
		});

		it("should create different instances on each call", () => {
			const client1 = createSupabaseClient();
			const client2 = createSupabaseClient();

			expect(client1).not.toBe(client2);
			expect(mockCreateClient).toHaveBeenCalledTimes(2);
		});

		it("should throw error in browser environment", () => {
			const originalWindow = global.window;
			(global as any).window = {};

			expect(() => {
				createSupabaseClient();
			}).toThrow("Supabase client should only be used server-side");

			global.window = originalWindow;
		});
	});

	describe("wrapDatabaseResponse", () => {
		it("should wrap successful response", () => {
			const response = { data: { id: 1 }, error: null };
			const wrapped = wrapDatabaseResponse(response);

			expect(wrapped.success).toBe(true);
			expect(wrapped.data).toEqual({ id: 1 });
			expect(wrapped.error).toBeNull();
		});

		it("should wrap error response", () => {
			const response = { data: null, error: { message: "Database error" } };
			const wrapped = wrapDatabaseResponse(response);

			expect(wrapped.success).toBe(false);
			expect(wrapped.data).toBeNull();
			expect(wrapped.error).toBeInstanceOf(Error);
			expect(wrapped.error?.message).toBe("Database error");
		});

		it("should handle error without message", () => {
			const response = { data: null, error: {} };
			const wrapped = wrapDatabaseResponse(response);

			expect(wrapped.success).toBe(false);
			expect(wrapped.error).toBeInstanceOf(Error);
			expect(wrapped.error?.message).toBe("Database error");
		});

		it("should handle null data with no error", () => {
			const response = { data: null, error: null };
			const wrapped = wrapDatabaseResponse(response);

			expect(wrapped.success).toBe(false);
			expect(wrapped.data).toBeNull();
			expect(wrapped.error).toBeNull();
		});
	});

	describe("executeWithRetry", () => {
		it("should execute operation successfully on first attempt", async () => {
			const operation = jest
				.fn()
				.mockResolvedValue({ data: { id: 1 }, error: null });

			const result = await executeWithRetry(operation);

			expect(result.success).toBe(true);
			expect(result.data).toEqual({ id: 1 });
			expect(operation).toHaveBeenCalledTimes(1);
		});

		it("should retry on failure", async () => {
			const operation = jest
				.fn()
				.mockRejectedValueOnce(new Error("Temporary error"))
				.mockResolvedValueOnce({ data: { id: 1 }, error: null });

			const result = await executeWithRetry(operation, {
				maxRetries: 2,
				retryDelay: 10,
			});

			expect(result.success).toBe(true);
			expect(operation).toHaveBeenCalledTimes(2);
		});

		it("should fail after max retries", async () => {
			const operation = jest
				.fn()
				.mockRejectedValue(new Error("Persistent error"));

			const result = await executeWithRetry(operation, {
				maxRetries: 2,
				retryDelay: 10,
			});

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(Error);
			expect(operation).toHaveBeenCalledTimes(2);
		});

		it("should respect timeout", async () => {
			jest.useFakeTimers();
			const operation = jest.fn(
				() => new Promise(() => {}), // Never resolves
			);

			const promise = executeWithRetry(operation, {
				timeout: 100,
				maxRetries: 1,
			});

			// Fast-forward time to trigger timeout
			jest.advanceTimersByTime(200);
			await promise;

			const result = await promise;

			expect(result.success).toBe(false);
			expect(result.error?.message).toBe("Database operation timeout");
			jest.useRealTimers();
		});

		it("should not retry non-retryable errors", async () => {
			const operation = jest.fn().mockResolvedValue({
				data: null,
				error: { code: "PGRST116" }, // Not found - non-retryable
			});

			const result = await executeWithRetry(operation, { maxRetries: 3 });

			expect(result.success).toBe(false);
			expect(operation).toHaveBeenCalledTimes(1);
		});

		it("should use default retry options", async () => {
			const operation = jest
				.fn()
				.mockResolvedValue({ data: { id: 1 }, error: null });

			const result = await executeWithRetry(operation);

			expect(result.success).toBe(true);
			expect(operation).toHaveBeenCalledTimes(1);
		});

		it("should handle operation with error field", async () => {
			const operation = jest.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error" },
			});

			const result = await executeWithRetry(operation, { maxRetries: 1 });

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(Error);
		});
	});

	describe("checkDatabaseHealth", () => {
		beforeEach(() => {
			const { getDatabaseClient } = require("@/Utils/databasePool");
			getDatabaseClient.mockReturnValue(mockSupabase);
		});

		it("should return healthy when database is accessible", async () => {
			mockSupabase.from.mockReturnThis();
			mockSupabase.select.mockReturnThis();
			mockSupabase.limit.mockResolvedValue({ data: [], error: null });

			const health = await checkDatabaseHealth();

			expect(health.healthy).toBe(true);
			expect(health.message).toBe("Database connection OK");
		});

		it("should return unhealthy when database has error", async () => {
			mockSupabase.from.mockReturnThis();
			mockSupabase.select.mockReturnThis();
			mockSupabase.limit.mockResolvedValue({
				data: null,
				error: { message: "Connection failed" },
			});

			const health = await checkDatabaseHealth();

			expect(health.healthy).toBe(false);
			expect(health.message).toBe("Database connection failed");
		});

		it("should return unhealthy when exception thrown", async () => {
			mockSupabase.from.mockImplementation(() => {
				throw new Error("Connection error");
			});

			const health = await checkDatabaseHealth();

			expect(health.healthy).toBe(false);
			expect(health.message).toBe("Connection error");
		});

		it("should handle unknown error types", async () => {
			mockSupabase.from.mockImplementation(() => {
				throw "String error";
			});

			const health = await checkDatabaseHealth();

			expect(health.healthy).toBe(false);
			expect(health.message).toBe("Unknown database error");
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty environment variables", () => {
			delete process.env.SUPABASE_URL;
			delete process.env.NEXT_PUBLIC_SUPABASE_URL;
			delete process.env.SUPABASE_SERVICE_ROLE_KEY;
			delete process.env.SUPABASE_KEY;
			delete process.env.SUPABASE_ANON_KEY;

			expect(() => {
				getDatabaseClient();
			}).toThrow();
		});

		it("should handle operation that returns string error", async () => {
			const operation = jest.fn().mockResolvedValue({
				data: null,
				error: "String error",
			});

			const result = await executeWithRetry(operation, { maxRetries: 1 });

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(Error);
		});
	});
});
