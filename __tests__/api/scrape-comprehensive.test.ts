/**
 * Tests for Scrape API Route
 * Tests scrape endpoint
 */

import type { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/scrape/route";

jest.mock("@/Utils/errorResponse");

describe("Scrape API Route", () => {
	let mockRequest: NextRequest;

	beforeEach(() => {
		jest.clearAllMocks();

		mockRequest = {
			method: "POST",
			json: jest.fn(),
			headers: new Headers(),
		} as any;
	});

	describe("POST /api/scrape", () => {
		it("should return automation message", async () => {
			mockRequest.json.mockResolvedValue({
				platforms: ["all"],
			});

			const response = await POST(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.message).toContain("automated");
		});

		it("should accept platform parameter", async () => {
			mockRequest.json.mockResolvedValue({
				platforms: ["reed", "adzuna"],
			});

			const response = await POST(mockRequest);
			const data = await response.json();

			expect(data.platforms).toEqual(["reed", "adzuna"]);
		});

		it("should use default platforms if not provided", async () => {
			mockRequest.json.mockResolvedValue({});

			const response = await POST(mockRequest);
			const data = await response.json();

			expect(data.platforms).toEqual(["all"]);
		});

		it("should handle errors", async () => {
			mockRequest.json.mockRejectedValue(new Error("Parse error"));

			const response = await POST(mockRequest);

			expect(response.status).toBeGreaterThanOrEqual(500);
		});
	});

	describe("GET /api/scrape", () => {
		beforeEach(() => {
			mockRequest.method = "GET";
		});

		it("should return endpoint information", async () => {
			const response = await GET();
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toBeDefined();
			expect(data.automation).toBeDefined();
		});
	});
});
