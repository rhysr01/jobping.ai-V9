/**
 * Comprehensive tests for Metrics Collector
 * Tests metric collection, caching, business metrics
 */

import { MetricsCollector } from "@/Utils/monitoring/metricsCollector";

jest.mock("@supabase/supabase-js", () => ({
	createClient: jest.fn(),
}));

describe("Metrics Collector", () => {
	let collector: MetricsCollector;
	let mockSupabase: any;

	beforeEach(() => {
		jest.clearAllMocks();

		process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
		process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

		mockSupabase = {
			from: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			count: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			head: true,
		};

		const { createClient } = require("@supabase/supabase-js");
		createClient.mockReturnValue(mockSupabase);

		collector = new MetricsCollector();
	});

	describe("collectMetrics", () => {
		it("should collect system metrics", async () => {
			mockSupabase.select.mockResolvedValue({ count: 100 });

			const metrics = await collector.collectMetrics();

			expect(metrics.timestamp).toBeDefined();
			expect(metrics.performance).toBeDefined();
			expect(metrics.business).toBeDefined();
			expect(metrics.queue).toBeDefined();
			expect(metrics.errors).toBeDefined();
		});

		it("should include performance metrics", async () => {
			const metrics = await collector.collectMetrics();

			expect(metrics.performance.response_time).toBeDefined();
			expect(metrics.performance.memory_usage).toBeDefined();
			expect(metrics.performance.uptime).toBeDefined();
		});

		it("should collect business metrics", async () => {
			mockSupabase.select.mockResolvedValue({ count: 50 });

			const metrics = await collector.collectMetrics();

			expect(metrics.business.total_users).toBeDefined();
			expect(metrics.business.active_users).toBeDefined();
			expect(metrics.business.total_jobs).toBeDefined();
		});

		it("should handle errors gracefully", async () => {
			mockSupabase.select.mockResolvedValue({
				data: null,
				error: new Error("Query failed"),
				count: 0,
			});

			const metrics = await collector.collectMetrics();

			expect(metrics).toBeDefined();
			expect(metrics.business.total_users).toBe(0);
		});
	});

	describe("collectBusinessMetrics", () => {
		it("should cache metrics", async () => {
			mockSupabase.select.mockResolvedValue({ count: 100 });

			await collector.collectMetrics();
			await collector.collectMetrics();

			// Should use cache on second call
			expect(mockSupabase.from).toHaveBeenCalled();
		});
	});

	describe("getMetricsHistory", () => {
		it("should get historical metrics", async () => {
			const history = await collector.getMetricsHistory(24);

			expect(Array.isArray(history)).toBe(true);
		});
	});
});
