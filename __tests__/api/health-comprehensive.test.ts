/**
 * Comprehensive tests for Health API Route
 * Tests health checks, SLO monitoring, database checks
 */

import type { NextRequest } from "next/server";
import { GET } from "@/app/api/health/route";

jest.mock("@/Utils/databasePool");

describe("Health API Route", () => {
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
			limit: jest.fn().mockResolvedValue({ error: null }),
		};

		const { getDatabaseClient } = require("@/Utils/databasePool");
		getDatabaseClient.mockReturnValue(mockSupabase);

		process.env.SUPABASE_URL = "https://test.supabase.co";
		process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
		process.env.OPEN_API_KEY = "test-openai-key";
		process.env.RESEND_API_KEY = "re_test_key";
	});

	describe("GET /api/health", () => {
		it("should return healthy status", async () => {
			const response = await GET(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.ok).toBe(true);
			expect(data.status).toBe("healthy");
		});

		it("should include database check", async () => {
			const response = await GET(mockRequest);
			const data = await response.json();

			expect(data.checks.database).toBeDefined();
			expect(data.checks.database.status).toBe("healthy");
		});

		it("should include environment check", async () => {
			const response = await GET(mockRequest);
			const data = await response.json();

			expect(data.checks.environment).toBeDefined();
			expect(data.checks.environment.status).toBe("healthy");
		});

		it("should include uptime", async () => {
			const response = await GET(mockRequest);
			const data = await response.json();

			expect(data.checks.uptime).toBeDefined();
			expect(typeof data.checks.uptime).toBe("number");
		});

		it("should detect database failures", async () => {
			mockSupabase.select.mockReturnThis();
			mockSupabase.limit.mockResolvedValue({
				error: new Error("Database error"),
			});

			const response = await GET(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(200); // Route returns 200 even with degraded services
			expect(data.services.database.status).toBe("unhealthy");
		});

		it("should detect missing environment variables", async () => {
			const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
			delete process.env.SUPABASE_SERVICE_ROLE_KEY;

			const response = await GET(mockRequest);
			const data = await response.json();

			expect(data.environment.status).toBe("unhealthy");

			// Restore
			process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
		});

		it("should include SLO information", async () => {
			const response = await GET(mockRequest);
			const data = await response.json();

			expect(data.slo).toBeDefined();
			expect(data.slo.targetMs).toBe(100);
			expect(data.slo.actualMs).toBeDefined();
			expect(data.slo.met).toBeDefined();
		});

		it("should include response time", async () => {
			const response = await GET(mockRequest);
			const data = await response.json();

			expect(data.responseTime).toBeDefined();
			// duration is only in error case, responseTime is in success case
		});

		it("should handle errors gracefully", async () => {
			mockSupabase.from.mockImplementation(() => {
				throw new Error("Unexpected error");
			});

			const response = await GET(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(503);
			expect(data.status).toBe("unhealthy");
		});

		it("should include timestamp", async () => {
			const response = await GET(mockRequest);
			const data = await response.json();

			expect(data.timestamp).toBeDefined();
			expect(new Date(data.timestamp).getTime()).toBeLessThanOrEqual(
				Date.now(),
			);
		});
	});
});
