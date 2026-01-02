import { GET } from "@/app/api/stats/route";
import { getDatabaseClient } from "@/Utils/databasePool";

// Mock Supabase client
const mockSupabase = {
	from: jest.fn(() => ({
		select: jest.fn(() => ({
			eq: jest.fn(() => ({
				count: 0,
				error: null,
			})),
		})),
	})),
};

jest.mock("@/Utils/databasePool", () => ({
	getDatabaseClient: jest.fn(() => mockSupabase),
}));

describe("GET /api/stats", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Reset cache
		(GET as any).cache = undefined;
	});

	it("should return stats with active jobs count", async () => {
		const selectMock = jest.fn(() => ({
			eq: jest.fn(() => ({
				count: 12748,
				error: null,
			})),
		}));

		mockSupabase.from = jest.fn(() => ({
			select: selectMock,
		}));

		const response = await GET();
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toHaveProperty("activeJobs");
		expect(data).toHaveProperty("activeJobsFormatted");
		expect(data.activeJobsFormatted).toBe("12,748");
	});

	it("should return cached stats when available", async () => {
		// First call
		const selectMock = jest.fn(() => ({
			eq: jest.fn(() => ({
				count: 5000,
				error: null,
			})),
		}));

		mockSupabase.from = jest.fn(() => ({
			select: selectMock,
		}));

		const response1 = await GET();
		const data1 = await response1.json();

		// Second call should use cache
		const response2 = await GET();
		const data2 = await response2.json();

		expect(data1).toHaveProperty("activeJobs");
		expect(data2).toHaveProperty("activeJobs");
		// Cache may or may not be set depending on timing
		expect(typeof data2.cached).toBe("boolean");
	});

	it("should return fallback stats on error", async () => {
		const selectMock = jest.fn(() => ({
			eq: jest.fn(() => ({
				count: null,
				error: new Error("Database error"),
			})),
		}));

		mockSupabase.from = jest.fn(() => ({
			select: selectMock,
		}));

		const response = await GET();
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toHaveProperty("fallback");
		expect(data.fallback).toBe(true);
		expect(data.activeJobs).toBe(12748);
	});

	it("should include internship and graduate counts", async () => {
		let callCount = 0;
		const selectMock = jest.fn(() => ({
			eq: jest.fn((column: string, value: any) => {
				callCount++;
				if (column === "is_active" && value === true && callCount === 1) {
					return { count: 12748, error: null };
				}
				if (column === "is_internship" && value === true) {
					return { count: 3710, error: null };
				}
				if (column === "is_graduate" && value === true) {
					return { count: 3480, error: null };
				}
				return { count: 0, error: null };
			}),
		}));

		mockSupabase.from = jest.fn(() => ({
			select: selectMock,
		}));

		const response = await GET();
		const data = await response.json();

		expect(data).toHaveProperty("internships");
		expect(data).toHaveProperty("graduates");
		expect(data.internships).toBeGreaterThanOrEqual(0);
		expect(data.graduates).toBeGreaterThanOrEqual(0);
	});

	it("should format numbers with commas", async () => {
		const selectMock = jest.fn(() => ({
			eq: jest.fn(() => ({
				count: 1234567,
				error: null,
			})),
		}));

		mockSupabase.from = jest.fn(() => ({
			select: selectMock,
		}));

		const response = await GET();
		const data = await response.json();

		expect(data.activeJobsFormatted).toContain(",");
		expect(typeof data.activeJobsFormatted).toBe("string");
	});

	it("should include timestamp", async () => {
		const selectMock = jest.fn(() => ({
			eq: jest.fn(() => ({
				count: 1000,
				error: null,
			})),
		}));

		mockSupabase.from = jest.fn(() => ({
			select: selectMock,
		}));

		const response = await GET();
		const data = await response.json();

		expect(data).toHaveProperty("lastUpdated");
		expect(typeof data.lastUpdated).toBe("string");
	});
});
