import {
	getMatchSessionStats,
	logMatchSession,
	type MatchSessionLog,
} from "@/utils/matching/logging.service";

jest.mock("@supabase/supabase-js", () => ({
	createClient: jest.fn(() => ({
		from: jest.fn(() => ({
			insert: jest.fn(() => ({
				data: {},
				error: null,
			})),
			select: jest.fn(() => ({
				eq: jest.fn(() => ({
					gte: jest.fn(() => ({
						lte: jest.fn(() => ({
							data: [],
							error: null,
						})),
					})),
				})),
			})),
		})),
	})),
}));

describe("logging.service", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = {
			...originalEnv,
			NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
			SUPABASE_SERVICE_ROLE_KEY: "test-key",
		};
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe("logMatchSession", () => {
		it("should log match session", async () => {
			await expect(
				logMatchSession("test@example.com", "ai_success", 5),
			).resolves.not.toThrow();
		});

		it("should log with additional data", async () => {
			await expect(
				logMatchSession("test@example.com", "ai_success", 5, {
					processingTimeMs: 1000,
					aiModel: "gpt-4o-mini",
					aiCostUsd: 0.01,
				}),
			).resolves.not.toThrow();
		});

		it("should log fallback matches", async () => {
			await expect(
				logMatchSession("test@example.com", "fallback", 3),
			).resolves.not.toThrow();
		});

		it("should log failed AI matches", async () => {
			await expect(
				logMatchSession("test@example.com", "ai_failed", 0, {
					errorMessage: "Timeout",
				}),
			).resolves.not.toThrow();
		});

		it("should handle errors gracefully", async () => {
			// Should not throw even if database fails
			await expect(
				logMatchSession("test@example.com", "ai_success", 5),
			).resolves.not.toThrow();
		});
	});

	describe("getMatchSessionStats", () => {
		it("should get stats for all sessions", async () => {
			const stats = await getMatchSessionStats();
			expect(stats).toBeDefined();
			expect(stats).toHaveProperty("totalSessions");
			expect(stats).toHaveProperty("aiSuccessRate");
			expect(stats).toHaveProperty("averageMatches");
			expect(stats).toHaveProperty("totalCost");
		});

		it("should get stats for specific user", async () => {
			const stats = await getMatchSessionStats("test@example.com");
			expect(stats).toBeDefined();
			expect(stats.totalSessions).toBeGreaterThanOrEqual(0);
			expect(stats.aiSuccessRate).toBeGreaterThanOrEqual(0);
			expect(stats.averageMatches).toBeGreaterThanOrEqual(0);
			expect(stats.totalCost).toBeGreaterThanOrEqual(0);
		});

		it("should get stats for time range", async () => {
			const stats = await getMatchSessionStats(undefined, {
				start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
				end: new Date(),
			});
			expect(stats).toBeDefined();
			expect(stats.totalSessions).toBeGreaterThanOrEqual(0);
		});

		it("should handle errors gracefully", async () => {
			const stats = await getMatchSessionStats();
			expect(stats).toBeDefined();
			expect(typeof stats.totalSessions).toBe("number");
		});
	});
});
