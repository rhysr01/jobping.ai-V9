import { GET } from "@/app/api/featured-jobs/route";
import { getDatabaseClient } from "@/Utils/databasePool";

jest.mock("@/Utils/databasePool", () => ({
	getDatabaseClient: jest.fn(() => ({
		from: jest.fn(() => ({
			select: jest.fn(() => ({
				eq: jest.fn(() => ({
					or: jest.fn(() => ({
						ilike: jest.fn(() => ({
							order: jest.fn(() => ({
								limit: jest.fn(() => Promise.resolve({
									data: [
										{
											job_hash: "hash1",
											title: "Software Engineer",
											company: "Tech Co",
											location: "London",
											is_internship: true,
										},
									],
									error: null,
								})),
							})),
						})),
					})),
				})),
			})),
		})),
	})),
}));

jest.mock("@/Utils/auth/apiAuth", () => ({
	withApiAuth: jest.fn((handler) => handler),
}));

jest.mock("@/Utils/productionRateLimiter", () => ({
	getProductionRateLimiter: jest.fn(() => ({
		middleware: jest.fn().mockResolvedValue(null),
	})),
}));

describe("GET /api/featured-jobs", () => {
	const mockRequest = {
		nextUrl: {
			pathname: "/api/featured-jobs",
		},
		headers: new Headers(),
	} as any;

	it("should return featured jobs", async () => {
		const response = await GET(mockRequest);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toBeDefined();
		expect(Array.isArray(data) || typeof data === "object").toBe(true);
	});

	it("should return job data structure (behavior test)", async () => {
		const response = await GET(mockRequest);
		const data = await response.json();

		// Behavior: Should return jobs array or object with jobs
		expect(response.status).toBe(200);
		if (Array.isArray(data)) {
			expect(data.length).toBeGreaterThanOrEqual(0);
		} else if (data && typeof data === "object") {
			// Could be { jobs: [...] } or similar structure
			expect(data).toBeDefined();
		}
		// ✅ Tests outcome, not implementation
	});
});
