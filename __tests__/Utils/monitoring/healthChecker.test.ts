/**
 * Tests for Health Checker
 * Tests system health monitoring
 */

jest.mock("@supabase/supabase-js", () => ({
	createClient: jest.fn(),
}));

jest.mock("resend", () => ({
	Resend: jest.fn(),
}));

import { HealthChecker } from "../../../utils/monitoring/healthChecker";

describe("HealthChecker", () => {
	let healthChecker: HealthChecker;
	let mockSupabase: any;
	let mockResendInstance: any;
	let mockCreateClient: any;
	let mockResend: any;

	beforeEach(() => {
		jest.clearAllMocks();

		const { createClient } = require("@supabase/supabase-js");
		const { Resend } = require("resend");
		mockCreateClient = createClient;
		mockResend = Resend;

		const createQuery = () => {
			const query: any = {
				select: jest.fn(() => query),
				limit: jest.fn(() =>
					Promise.resolve({
						data: [{ created_at: new Date().toISOString() }],
						error: null,
					}),
				),
				gte: jest.fn(() => query),
				eq: jest.fn(() => query),
				then: (resolve: any) =>
					Promise.resolve(
						resolve({ data: [{ status: "completed" }], error: null }),
					),
				catch: () => Promise.resolve(),
			};
			return query;
		};

		mockSupabase = {
			from: jest.fn(() => createQuery()),
			storage: {
				listBuckets: jest
					.fn()
					.mockResolvedValue({ data: ["public"], error: null }),
			},
		};

		mockResendInstance = {
			emails: {
				send: jest
					.fn()
					.mockResolvedValue({ data: { id: "test" }, error: null }),
			},
		};

		mockCreateClient.mockReturnValue(mockSupabase);
		mockResend.mockImplementation(() => mockResendInstance);

		process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
		process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
		process.env.RESEND_API_KEY = "re_test_key";

		global.fetch = jest.fn().mockResolvedValue({ ok: true });

		healthChecker = new HealthChecker();
	});

	describe("performHealthCheck", () => {
		it("should perform comprehensive health check", async () => {
			const result = await healthChecker.performHealthCheck();

			expect(result).toHaveProperty("status");
			expect(result).toHaveProperty("timestamp");
			expect(result).toHaveProperty("duration");
			expect(result).toHaveProperty("components");
			expect(result).toHaveProperty("metrics");
		});

		it("should check database health", async () => {
			const result = await healthChecker.performHealthCheck();

			expect(result.components.database).toBeDefined();
			expect(result.components.database).toHaveProperty("status");
		});

		it("should check email service health", async () => {
			const result = await healthChecker.performHealthCheck();

			expect(result.components.email).toBeDefined();
			expect(result.components.email).toHaveProperty("status");
		});

		it("should include performance metrics", async () => {
			const result = await healthChecker.performHealthCheck();

			expect(result.metrics).toHaveProperty("response_time");
			expect(result.metrics).toHaveProperty("memory_usage");
			expect(result.metrics).toHaveProperty("uptime");
		});
	});
});
