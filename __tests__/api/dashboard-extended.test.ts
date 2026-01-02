/**
 * Tests for Dashboard API Route
 * Tests admin dashboard data retrieval
 */

import type { NextRequest } from "next/server";
import { GET } from "@/app/api/dashboard/route";

jest.mock("@/Utils/databasePool");
jest.mock("@/Utils/auth/withAuth");

describe("Dashboard API Route", () => {
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
			count: jest.fn().mockResolvedValue({ count: 100, error: null }),
			eq: jest.fn().mockReturnThis(),
			single: jest.fn(),
		};

		const { getDatabaseClient } = require("@/Utils/databasePool");
		getDatabaseClient.mockReturnValue(mockSupabase);
	});

	describe("GET /api/dashboard", () => {
		it("should return dashboard statistics", async () => {
			const response = await GET(mockRequest);
			const data = await response.json();

			expect(response.status).toBeLessThan(500);
			expect(data).toBeDefined();
		});

		it("should handle database errors", async () => {
			mockSupabase.count.mockRejectedValue(new Error("DB error"));

			const response = await GET(mockRequest);

			expect(response.status).toBeGreaterThanOrEqual(500);
		});
	});
});
