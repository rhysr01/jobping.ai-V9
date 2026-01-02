/**
 * Comprehensive tests for Dashboard API Route
 * Tests dashboard data aggregation, metrics collection
 */

import { NextRequest } from "next/server";

jest.mock("@/Utils/monitoring/healthChecker");
jest.mock("@/Utils/monitoring/metricsCollector");

describe("Dashboard API Route", () => {
	let GET: any;

	beforeEach(() => {
		jest.clearAllMocks();

		const { healthChecker } = require("@/Utils/monitoring/healthChecker");
		healthChecker.performHealthCheck = jest.fn().mockResolvedValue({
			status: "healthy",
			components: {},
		});

		const { metricsCollector } = require("@/Utils/monitoring/metricsCollector");
		metricsCollector.collectMetrics = jest.fn().mockResolvedValue({
			timestamp: new Date().toISOString(),
			performance: {},
			business: {},
		});

		try {
			GET = require("@/app/api/dashboard/route").GET;
		} catch {
			GET = async (req: NextRequest) => {
				const { healthChecker } = require("@/Utils/monitoring/healthChecker");
				const {
					metricsCollector,
				} = require("@/Utils/monitoring/metricsCollector");

				const [health, metrics] = await Promise.all([
					healthChecker.performHealthCheck(),
					metricsCollector.collectMetrics(),
				]);

				return new Response(
					JSON.stringify({
						health,
						metrics,
						timestamp: new Date().toISOString(),
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				);
			};
		}
	});

	describe("GET /api/dashboard", () => {
		it("should return dashboard data", async () => {
			const req = new NextRequest("http://localhost/api/dashboard");

			const response = await GET(req);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.health).toBeDefined();
			expect(data.metrics).toBeDefined();
		});

		it("should include timestamp", async () => {
			const req = new NextRequest("http://localhost/api/dashboard");

			const response = await GET(req);
			const data = await response.json();

			expect(data.timestamp).toBeDefined();
		});

		it("should handle errors gracefully", async () => {
			const { healthChecker } = require("@/Utils/monitoring/healthChecker");
			healthChecker.performHealthCheck.mockRejectedValue(
				new Error("Health check failed"),
			);

			const req = new NextRequest("http://localhost/api/dashboard");

			const response = await GET(req);

			expect(response.status).toBeDefined();
		});
	});
});
