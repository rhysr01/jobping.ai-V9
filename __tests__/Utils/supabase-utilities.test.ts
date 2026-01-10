import {
	checkDatabaseHealth,
	type DatabaseResponse,
	executeWithRetry,
	wrapDatabaseResponse,
} from "@/utils/supabase";

jest.mock("@/utils/databasePool", () => {
	const mockSupabase = {
		from: jest.fn(() => ({
			select: jest.fn(() => ({
				limit: jest.fn().mockResolvedValue({
					data: [{ id: 1 }],
					error: null,
				}),
			})),
		})),
	};
	return {
		getDatabaseClient: jest.fn(() => mockSupabase),
	};
});

describe("supabase utilities", () => {
	describe("wrapDatabaseResponse", () => {
		it("should wrap successful response", () => {
			const response = wrapDatabaseResponse({
				data: { id: 1 },
				error: null,
			});
			expect(response.success).toBe(true);
			expect(response.data).toEqual({ id: 1 });
			expect(response.error).toBeNull();
		});

		it("should wrap error response", () => {
			const response = wrapDatabaseResponse({
				data: null,
				error: { message: "Database error" },
			});
			expect(response.success).toBe(false);
			expect(response.error).toBeInstanceOf(Error);
			expect(response.error?.message).toBe("Database error");
		});

		it("should handle null data", () => {
			const response = wrapDatabaseResponse({
				data: null,
				error: null,
			});
			expect(response.success).toBe(false);
		});
	});

	describe("executeWithRetry", () => {
		it("should execute function successfully", async () => {
			const fn = jest.fn().mockResolvedValue({ data: "success", error: null });
			const result = await executeWithRetry(fn, { maxRetries: 3 });
			expect(result.success).toBe(true);
			expect(result.data).toBe("success");
			expect(fn).toHaveBeenCalledTimes(1);
		});

		it("should retry on failure", async () => {
			const fn = jest
				.fn()
				.mockResolvedValueOnce({ data: null, error: new Error("fail") })
				.mockResolvedValueOnce({ data: "success", error: null });
			const result = await executeWithRetry(fn, {
				maxRetries: 3,
				retryDelay: 10,
			});
			expect(result.success).toBe(true);
			expect(result.data).toBe("success");
			expect(fn).toHaveBeenCalledTimes(2);
		});

		it("should fail after max retries", async () => {
			const fn = jest
				.fn()
				.mockResolvedValue({ data: null, error: new Error("fail") });
			const result = await executeWithRetry(fn, {
				maxRetries: 2,
				retryDelay: 10,
			});
			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(Error);
			expect(fn).toHaveBeenCalledTimes(2);
		});

		it("should respect timeout", async () => {
			jest.useFakeTimers();

			const fn = jest.fn().mockImplementation(
				() =>
					new Promise((resolve) => {
						// Never resolve - should timeout
						setTimeout(() => resolve({ data: "slow", error: null }), 10000);
					}),
			);

			const resultPromise = executeWithRetry(fn, {
				maxRetries: 1,
				timeout: 100,
				retryDelay: 10,
			});

			// Advance timers to trigger timeout
			jest.advanceTimersByTime(200);

			const result = await resultPromise;

			expect(result.success).toBe(false);
			expect(result.error?.message).toContain("timeout");

			jest.useRealTimers();
		});
	});

	describe("checkDatabaseHealth", () => {
		it("should check database health", async () => {
			const health = await checkDatabaseHealth();
			expect(health).toBeDefined();
			expect(health).toHaveProperty("healthy");
			expect(health).toHaveProperty("message");
			expect(typeof health.healthy).toBe("boolean");
		});

		it("should return health status with database info (behavior test)", async () => {
			const health = await checkDatabaseHealth();

			// Behavior: Health check should return status information
			expect(health).toBeDefined();
			expect(health).toHaveProperty("healthy");
			expect(typeof health.healthy).toBe("boolean");
			// ✅ Tests outcome, not implementation
		});
	});
});
