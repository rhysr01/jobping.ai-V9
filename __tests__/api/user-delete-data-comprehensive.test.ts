/**
 * Tests for User Delete Data API Route
 * Tests GDPR-compliant user data deletion
 */

import type { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/user/delete-data/route";

jest.mock("@/Utils/databasePool");
jest.mock("@/lib/errors", () => ({
	asyncHandler: (fn: any) => fn,
	ValidationError: class extends Error {
		constructor(message: string) {
			super(message);
			this.name = "ValidationError";
		}
	},
}));

describe("User Delete Data API Route", () => {
	let mockRequest: NextRequest;
	let mockSupabase: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockRequest = {
			method: "POST",
			json: jest.fn(),
			headers: new Headers(),
		} as any;

		mockSupabase = {
			from: jest.fn().mockReturnThis(),
			delete: jest.fn().mockReturnThis(),
			eq: jest.fn().mockResolvedValue({
				data: [{ id: 1 }],
				error: null,
			}),
		};

		const { getDatabaseClient } = require("@/Utils/databasePool");
		getDatabaseClient.mockReturnValue(mockSupabase);
	});

	describe("POST /api/user/delete-data", () => {
		it("should delete user data from all tables", async () => {
			mockRequest.json.mockResolvedValue({
				email: "user@example.com",
			});

			const response = await POST(mockRequest);
			const data = await response.json();

			// Behavior: Deletion should succeed and return summary
			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.summary).toBeDefined();
			expect(data.summary.totalTables).toBe(8);
			expect(data.summary.successful).toBeGreaterThanOrEqual(0);
			// ✅ Tests outcome, not implementation (which tables were called)
		});

		it("should require email", async () => {
			mockRequest.json.mockResolvedValue({});

			await expect(POST(mockRequest)).rejects.toThrow();
		});

		it("should return deletion details for all tables (behavior test)", async () => {
			mockRequest.json.mockResolvedValue({
				email: "user@example.com",
			});

			const response = await POST(mockRequest);
			const data = await response.json();

			// Behavior: Summary should include details for all deletion operations
			expect(response.status).toBe(200);
			expect(data.summary.details).toBeDefined();
			expect(Array.isArray(data.summary.details)).toBe(true);
			expect(data.summary.details.length).toBe(8);
			// ✅ Tests outcome (summary structure), not which tables were called
		});

		it("should handle partial deletion failures", async () => {
			mockRequest.json.mockResolvedValue({
				email: "user@example.com",
			});

			// Mock Promise.allSettled behavior - some succeed, some fail
			let callCount = 0;
			mockSupabase.eq.mockImplementation(() => {
				callCount++;
				// Make first 2 calls fail, rest succeed
				if (callCount <= 2) {
					return Promise.resolve({ data: null, error: { message: "Error" } });
				}
				return Promise.resolve({ data: [{ id: 1 }], error: null });
			});

			const response = await POST(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(200);
			// Route uses Promise.allSettled, so it returns 200 even with some failures
			expect(data.summary).toBeDefined();
			expect(data.summary.totalTables).toBe(8);
			// Some deletions may have failed
			expect(data.summary.successful + data.summary.failed).toBe(8);
		});

		it("should return deletion summary", async () => {
			mockRequest.json.mockResolvedValue({
				email: "user@example.com",
			});

			const response = await POST(mockRequest);
			const data = await response.json();

			expect(data.summary.details).toBeDefined();
			expect(data.summary.details.length).toBe(8);
		});
	});

	describe("GET /api/user/delete-data", () => {
		beforeEach(() => {
			mockRequest.method = "GET";
		});

		it("should return endpoint information", async () => {
			const response = await GET();
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toBeDefined();
			expect(data.usage).toBeDefined();
		});
	});
});
