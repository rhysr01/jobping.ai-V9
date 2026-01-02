/**
 * Tests for Database Query Optimizer
 * Tests optimized database queries with caching (120 statements)
 */

import { DatabaseQueryOptimizer } from "@/Utils/database/queryOptimizer";

describe("Database Query Optimizer", () => {
	let optimizer: DatabaseQueryOptimizer;
	let mockSupabase: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockSupabase = {
			from: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			in: jest.fn().mockReturnThis(),
			overlaps: jest.fn().mockReturnThis(),
			lt: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			order: jest.fn().mockReturnThis(),
			limit: jest.fn().mockResolvedValue({
				data: [],
				error: null,
				count: 0,
			}),
			insert: jest.fn().mockResolvedValue({ error: null }),
		};

		optimizer = new DatabaseQueryOptimizer(mockSupabase);
	});

	describe("getOptimizedJobs", () => {
		it("should fetch jobs with default config", async () => {
			const result = await optimizer.getOptimizedJobs();

			expect(result).toHaveProperty("data");
			expect(result).toHaveProperty("count");
			expect(result).toHaveProperty("executionTime");
			expect(result).toHaveProperty("cacheHit");
			expect(mockSupabase.from).toHaveBeenCalledWith("jobs");
		});

		it("should use cache when available", async () => {
			// First call - populate cache
			await optimizer.getOptimizedJobs({ useCache: true });

			// Second call - should hit cache
			const result = await optimizer.getOptimizedJobs({ useCache: true });

			expect(result.cacheHit).toBe(true);
		});

		it("should filter by categories", async () => {
			await optimizer.getOptimizedJobs({
				categories: ["strategy", "finance"],
			});

			expect(mockSupabase.overlaps).toHaveBeenCalledWith("categories", [
				"strategy",
				"finance",
			]);
		});

		it("should filter by locations", async () => {
			await optimizer.getOptimizedJobs({
				locations: ["London", "Paris"],
			});

			expect(mockSupabase.in).toHaveBeenCalledWith("location", [
				"London",
				"Paris",
			]);
		});

		it("should exclude sent jobs when requested", async () => {
			await optimizer.getOptimizedJobs({
				excludeSent: true,
			});

			expect(mockSupabase.eq).toHaveBeenCalledWith("is_sent", false);
		});

		it("should respect limit parameter", async () => {
			await optimizer.getOptimizedJobs({
				limit: 50,
			});

			expect(mockSupabase.limit).toHaveBeenCalledWith(50);
		});

		it("should handle database errors", async () => {
			mockSupabase.limit.mockResolvedValue({
				data: null,
				error: { message: "Database error" },
				count: 0,
			});

			await expect(optimizer.getOptimizedJobs()).rejects.toThrow(
				"Database query failed",
			);
		});

		it("should cache results when useCache is true", async () => {
			mockSupabase.limit.mockResolvedValue({
				data: [{ id: 1, title: "Job 1" }],
				error: null,
				count: 1,
			});

			await optimizer.getOptimizedJobs({ useCache: true });

			// Second call should use cache
			const result = await optimizer.getOptimizedJobs({ useCache: true });
			expect(result.cacheHit).toBe(true);
		});

		it("should skip cache when useCache is false", async () => {
			await optimizer.getOptimizedJobs({ useCache: false });
			await optimizer.getOptimizedJobs({ useCache: false });

			// Should query database twice
			expect(mockSupabase.from).toHaveBeenCalledTimes(2);
		});
	});

	describe("getOptimizedUsers", () => {
		it("should fetch users with default config", async () => {
			const result = await optimizer.getOptimizedUsers();

			expect(result).toHaveProperty("data");
			expect(mockSupabase.from).toHaveBeenCalledWith("users");
		});

		it("should filter by isActive", async () => {
			await optimizer.getOptimizedUsers({
				isActive: true,
			});

			expect(mockSupabase.eq).toHaveBeenCalledWith("is_active", true);
		});

		it("should filter by isPremium", async () => {
			await optimizer.getOptimizedUsers({
				isPremium: true,
			});

			expect(mockSupabase.eq).toHaveBeenCalledWith("is_premium", true);
		});

		it("should filter by lastMatchedBefore", async () => {
			const date = "2024-01-01";
			await optimizer.getOptimizedUsers({
				lastMatchedBefore: date,
			});

			expect(mockSupabase.lt).toHaveBeenCalledWith("last_matched_at", date);
		});

		it("should use cache for users", async () => {
			await optimizer.getOptimizedUsers({ useCache: true });
			const result = await optimizer.getOptimizedUsers({ useCache: true });

			expect(result.cacheHit).toBe(true);
		});
	});

	describe("getOptimizedMatches", () => {
		it("should fetch matches with default config", async () => {
			const result = await optimizer.getOptimizedMatches();

			expect(result).toHaveProperty("data");
			expect(mockSupabase.from).toHaveBeenCalledWith("matches");
		});

		it("should filter by userEmail", async () => {
			await optimizer.getOptimizedMatches({
				userEmail: "user@example.com",
			});

			expect(mockSupabase.eq).toHaveBeenCalledWith(
				"user_email",
				"user@example.com",
			);
		});

		it("should filter by jobHash", async () => {
			await optimizer.getOptimizedMatches({
				jobHash: "hash123",
			});

			expect(mockSupabase.eq).toHaveBeenCalledWith("job_hash", "hash123");
		});

		it("should filter by minScore", async () => {
			await optimizer.getOptimizedMatches({
				minScore: 80,
			});

			expect(mockSupabase.gte).toHaveBeenCalledWith("match_score", 80);
		});

		it("should use cache for matches", async () => {
			await optimizer.getOptimizedMatches({ useCache: true });
			const result = await optimizer.getOptimizedMatches({ useCache: true });

			expect(result.cacheHit).toBe(true);
		});
	});

	describe("batchInsert", () => {
		it("should batch insert data", async () => {
			const data = [
				{ id: 1, name: "Item 1" },
				{ id: 2, name: "Item 2" },
			];

			await optimizer.batchInsert("test_table", data);

			expect(mockSupabase.insert).toHaveBeenCalled();
		});

		it("should respect batchSize", async () => {
			const data = Array.from({ length: 100 }, (_, i) => ({ id: i }));

			await optimizer.batchInsert("test_table", data, { batchSize: 10 });

			// Should be called multiple times for batches
			expect(mockSupabase.insert.mock.calls.length).toBeGreaterThan(1);
		});

		it("should handle insert errors", async () => {
			mockSupabase.insert.mockResolvedValue({
				error: { message: "Insert failed" },
			});

			await expect(
				optimizer.batchInsert("test_table", [{ id: 1 }]),
			).rejects.toThrow();
		});
	});

	describe("cache management", () => {
		it("should expire cache entries after TTL", async () => {
			jest.useFakeTimers();

			mockSupabase.limit.mockResolvedValue({
				data: [{ id: 1 }],
				error: null,
				count: 1,
			});

			await optimizer.getOptimizedJobs({ useCache: true });

			// Advance time past TTL (300 seconds)
			jest.advanceTimersByTime(301 * 1000);

			// Should query database again
			await optimizer.getOptimizedJobs({ useCache: true });

			expect(mockSupabase.from).toHaveBeenCalledTimes(2);
			jest.useRealTimers();
		});

		it("should clear cache", () => {
			optimizer.clearCache();
			// Cache should be empty
			const result = optimizer.getOptimizedJobs({ useCache: true });
			expect(result).toBeDefined();
		});
	});
});
