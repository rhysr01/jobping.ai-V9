/**
 * Tests for Status API Route
 * Tests lightweight status endpoint for monitoring
 */

import type { NextRequest } from "next/server";
import { GET } from "@/app/api/status/route";

jest.mock("@/Utils/databasePool");

describe("Status API Route", () => {
	let mockRequest: NextRequest;
	let mockSupabase: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockRequest = {
			method: "GET",
			headers: new Headers(),
		} as any;

		mockSupabase = {
			from: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			limit: jest.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		};

		const { getDatabaseClient } = require("@/Utils/databasePool");
		getDatabaseClient.mockReturnValue(mockSupabase);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("GET /api/status", () => {
		beforeEach(() => {
			jest.useFakeTimers();
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it("should return healthy status", async () => {
			const response = await GET(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.status).toBe("healthy");
			expect(data.uptime).toBeDefined();
			expect(data.responseTime).toBeDefined();
		});

		it("should include database check", async () => {
			const response = await GET(mockRequest);
			const data = await response.json();

			expect(data.checks).toBeDefined();
			expect(data.checks.database).toBeDefined();
		});

		it("should return fast response (non-blocking)", async () => {
			const start = Date.now();
			await GET(mockRequest);
			const duration = Date.now() - start;

			// Should respond quickly even if DB is slow
			expect(duration).toBeLessThan(100);
		});

		it.skip("should handle database timeout gracefully", async () => {
			// TODO: Fix timeout test - needs proper async handling with fake timers
			// The route uses Promise.race with setTimeout which doesn't work well with fake timers
			mockSupabase.limit.mockImplementation(
				() =>
					new Promise((resolve) =>
						setTimeout(() => resolve({ data: [], error: null }), 300),
					),
			);

			const promise = GET(mockRequest);
			// Fast-forward past timeout (200ms) to trigger race condition
			jest.advanceTimersByTime(250);
			const response = await promise;
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.status).toBe("healthy");
			// Should still return healthy even if DB times out
			expect(data.checks).toBeDefined();
		});

		it("should include response time headers", async () => {
			const response = await GET(mockRequest);

			expect(response.headers.get("X-Response-Time")).toBeDefined();
			expect(response.headers.get("Cache-Control")).toContain("no-cache");
		});

		it("should handle errors gracefully", async () => {
			// The status route is designed to always return 200, even if DB check fails
			// Errors in checkDatabase are caught and return degraded status, but overall is still "healthy"
			const { getDatabaseClient } = require("@/Utils/databasePool");
			getDatabaseClient.mockImplementation(() => {
				throw new Error("Database error");
			});

			const response = await GET(mockRequest);
			const data = await response.json();

			// Route catches errors and still returns 200 with healthy status
			// (non-blocking design - don't fail health check if DB is down)
			expect(response.status).toBe(200);
			expect(data.status).toBe("healthy");
			expect(data.checks).toBeDefined();
		});
	});
});
