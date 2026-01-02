/**
 * Tests for Cleanup Jobs API Route
 * Tests job cleanup functionality
 */

import type { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/cleanup-jobs/route";

jest.mock("@/Utils/databasePool");
jest.mock("@/Utils/productionRateLimiter", () => ({
	getProductionRateLimiter: jest.fn(() => ({
		middleware: jest.fn().mockResolvedValue(null),
	})),
}));

describe("Cleanup Jobs API Route", () => {
	let mockRequest: NextRequest;
	let mockSupabase: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockRequest = {
			method: "POST",
			headers: new Headers({
				"x-api-key": "test-key",
			}),
			json: jest.fn(),
		} as any;

		mockSupabase = {
			from: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			update: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			lt: jest.fn().mockReturnThis(),
			select: jest.fn().mockResolvedValue({
				data: [],
				error: null,
				count: 0,
			}),
		};

		const { getDatabaseClient } = require("@/Utils/databasePool");
		getDatabaseClient.mockReturnValue(mockSupabase);

		process.env.SCRAPE_API_KEY = "test-key";
	});

	describe("POST /api/cleanup-jobs", () => {
		it("should mark old jobs as inactive", async () => {
			mockRequest.json.mockResolvedValue({ daysThreshold: 7 });

			mockSupabase.select.mockResolvedValue({
				data: [{ id: "1", title: "Old Job" }],
				error: null,
			});

			const response = await POST(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.cleanup).toBeDefined();
		});

		it("should require API key", async () => {
			mockRequest.headers.delete("x-api-key");

			const response = await POST(mockRequest);

			expect(response.status).toBe(401);
		});

		it("should use default daysThreshold if not provided", async () => {
			mockRequest.json.mockResolvedValue({});

			mockSupabase.select.mockResolvedValue({
				data: [],
				error: null,
			});

			const response = await POST(mockRequest);

			expect(response.status).toBe(200);
		});

		it("should return job statistics", async () => {
			mockRequest.json.mockResolvedValue({ daysThreshold: 7 });

			mockSupabase.select.mockResolvedValue({
				data: [],
				error: null,
				count: 100,
			});

			const response = await POST(mockRequest);
			const data = await response.json();

			expect(data.stats).toBeDefined();
			expect(data.stats.totalActive).toBeDefined();
			expect(data.stats.totalInactive).toBeDefined();
		});

		it("should handle database errors", async () => {
			mockRequest.json.mockResolvedValue({ daysThreshold: 7 });

			mockSupabase.select.mockResolvedValue({
				data: null,
				error: { message: "Database error" },
			});

			const response = await POST(mockRequest);

			expect(response.status).toBeGreaterThanOrEqual(500);
		});
	});

	describe("GET /api/cleanup-jobs", () => {
		beforeEach(() => {
			mockRequest.method = "GET";
		});

		it("should return job statistics", async () => {
			mockSupabase.select.mockResolvedValue({
				data: [],
				error: null,
				count: 100,
			});

			const response = await GET();
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.stats).toBeDefined();
			expect(data.endpoints).toBeDefined();
		});

		it("should return source breakdown", async () => {
			mockSupabase.select.mockResolvedValue({
				data: [
					{ source: "reed", is_active: true },
					{ source: "adzuna", is_active: true },
				],
				error: null,
				count: 2,
			});

			const response = await GET();
			const data = await response.json();

			expect(data.stats.sourceBreakdown).toBeDefined();
		});
	});
});
