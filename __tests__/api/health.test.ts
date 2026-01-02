import { GET } from "@/app/api/health/route";
import { getDatabaseClient } from "@/Utils/databasePool";

jest.mock("@/Utils/databasePool", () => ({
	getDatabaseClient: jest.fn(() => ({
		from: jest.fn(() => ({
			select: jest.fn(() => ({
				limit: jest.fn(() => ({
					data: [],
					error: null,
				})),
			})),
		})),
	})),
}));

describe("GET /api/health", () => {
	it("should return health status", async () => {
		const mockRequest = {
			headers: new Headers(),
		} as any;
		const response = await GET(mockRequest);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toHaveProperty("status");
		expect(data).toHaveProperty("checks");
	});

	it("should include database check", async () => {
		const mockRequest = {
			headers: new Headers(),
		} as any;
		const response = await GET(mockRequest);
		const data = await response.json();

		expect(data.services).toHaveProperty("database");
		expect(data.services.database).toHaveProperty("status");
	});

	it("should include database health status (behavior test)", async () => {
		const mockRequest = {
			headers: new Headers(),
		} as any;
		const response = await GET(mockRequest);
		const data = await response.json();

		// Behavior: Health check should include database status
		expect(data.services.database).toBeDefined();
		expect(data.services.database.status).toBeDefined();
		// ✅ Tests outcome, not internal implementation
	});

	it("should include timestamp", async () => {
		const mockRequest = {
			headers: new Headers(),
		} as any;
		const response = await GET(mockRequest);
		const data = await response.json();

		expect(data).toHaveProperty("timestamp");
		expect(typeof data.timestamp).toBe("string");
	});
});
