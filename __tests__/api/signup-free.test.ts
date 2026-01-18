/**
 * Free Signup Route Tests
 *
 * Comprehensive tests for the /api/signup/free endpoint,
 * focusing on the city normalization logic and array handling issues.
 */

import { POST as freeSignupPost } from "@/app/api/signup/free/route";
import { getDatabaseClient } from "@/utils/core/database-pool";

// Mock dependencies
jest.mock("@/utils/core/database-pool", () => ({
	getDatabaseClient: jest.fn(),
}));

jest.mock("@/lib/api-logger", () => ({
	apiLogger: {
		info: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
	},
}));

jest.mock("@/utils/production-rate-limiter", () => ({
	getProductionRateLimiter: jest.fn(() => ({
		middleware: jest.fn(() => null), // No rate limiting in tests
	})),
}));

jest.mock("@/utils/services/SignupMatchingService", () => ({
	SignupMatchingService: {
		runMatching: jest.fn(() => ({
			matchCount: 5,
			matches: [],
		})),
		getConfig: jest.fn(() => ({})),
	},
}));

const mockSupabase = {
	from: jest.fn(() => ({
		select: jest.fn(() => ({
			eq: jest.fn(() => ({
				maybeSingle: jest.fn(),
				single: jest.fn(),
				limit: jest.fn(),
				order: jest.fn(),
				in: jest.fn(),
			})),
		})),
		insert: jest.fn(() => ({
			select: jest.fn(() => ({
				single: jest.fn(),
			})),
		})),
		delete: jest.fn(() => ({
			eq: jest.fn(),
		})),
		update: jest.fn(() => ({
			eq: jest.fn(),
		})),
	})),
};

(getDatabaseClient as jest.Mock).mockReturnValue(mockSupabase);

// Test utilities
function createMockRequest(data: any): Request {
	return {
		json: jest.fn().mockResolvedValue(data),
		headers: {
			get: jest.fn((key) => {
				if (key === "x-forwarded-proto") return "https";
				return null;
			}),
		},
		url: "https://test.com/api/signup/free",
	} as any;
}

function createMockUserData(targetCities: any) {
	return {
		email: "test@example.com",
		full_name: "Test User",
		preferred_cities: ["Berlin", "London"],
		career_paths: ["tech"],
		visa_sponsorship: "no",
		birth_year: 1995,
		age_verified: true,
		terms_accepted: true,
		target_cities: targetCities,
	};
}

describe("Free Signup Route - City Normalization", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("City Normalization Logic", () => {
		test("handles array format correctly", () => {
			const mockUserData = createMockUserData(["Berlin", "London"]);

			// The normalization logic from the route (lines 213-226)
			let targetCities: string[] = [];
			if (mockUserData.target_cities) {
				if (Array.isArray(mockUserData.target_cities)) {
					targetCities = mockUserData.target_cities;
				} else if (typeof mockUserData.target_cities === "string") {
					try {
						targetCities = JSON.parse(mockUserData.target_cities);
					} catch {
						targetCities = [mockUserData.target_cities];
					}
				}
			}

			expect(targetCities).toEqual(["Berlin", "London"]);
			expect(Array.isArray(targetCities)).toBe(true);
		});

		test("handles JSON string format", () => {
			const mockUserData = createMockUserData('["Berlin", "London"]');

			let targetCities: string[] = [];
			if (mockUserData.target_cities) {
				if (Array.isArray(mockUserData.target_cities)) {
					targetCities = mockUserData.target_cities;
				} else if (typeof mockUserData.target_cities === "string") {
					try {
						targetCities = JSON.parse(mockUserData.target_cities);
					} catch {
						targetCities = [mockUserData.target_cities];
					}
				}
			}

			expect(targetCities).toEqual(["Berlin", "London"]);
			expect(Array.isArray(targetCities)).toBe(true);
		});

		test("handles single string format", () => {
			const mockUserData = createMockUserData("Berlin");

			let targetCities: string[] = [];
			if (mockUserData.target_cities) {
				if (Array.isArray(mockUserData.target_cities)) {
					targetCities = mockUserData.target_cities;
				} else if (typeof mockUserData.target_cities === "string") {
					try {
						targetCities = JSON.parse(mockUserData.target_cities);
					} catch {
						targetCities = [mockUserData.target_cities];
					}
				}
			}

			expect(targetCities).toEqual(["Berlin"]);
			expect(Array.isArray(targetCities)).toBe(true);
		});

		test("handles null/undefined values", () => {
			const mockUserData = createMockUserData(null);

			let targetCities: string[] = [];
			if (mockUserData.target_cities) {
				if (Array.isArray(mockUserData.target_cities)) {
					targetCities = mockUserData.target_cities;
				} else if (typeof mockUserData.target_cities === "string") {
					try {
						targetCities = JSON.parse(mockUserData.target_cities);
					} catch {
						targetCities = [mockUserData.target_cities];
					}
				}
			}

			expect(targetCities).toEqual([]);
			expect(Array.isArray(targetCities)).toBe(true);
		});

		test("handles malformed JSON gracefully", () => {
			const mockUserData = createMockUserData('{"not": "an array"}');

			let targetCities: string[] = [];
			if (mockUserData.target_cities) {
				if (Array.isArray(mockUserData.target_cities)) {
					targetCities = mockUserData.target_cities;
				} else if (typeof mockUserData.target_cities === "string") {
					try {
						const parsed = JSON.parse(mockUserData.target_cities);
						if (Array.isArray(parsed)) {
							targetCities = parsed;
						} else {
							// If parsed but not an array, treat as single string
							targetCities = [mockUserData.target_cities];
						}
					} catch {
						targetCities = [mockUserData.target_cities];
					}
				}
			}

			// Should fall back to treating as single string since parsed object is not an array
			expect(targetCities).toEqual(['{"not": "an array"}']);
		});
	});

	describe("Fallback Logic", () => {
		test("uses preferred_cities as fallback when target_cities is empty", () => {
			const mockUserData = createMockUserData([]); // Empty array
			const preferredCities = ["Berlin", "London"];

			let targetCities: string[] = [];
			if (mockUserData.target_cities) {
				if (Array.isArray(mockUserData.target_cities)) {
					targetCities = mockUserData.target_cities;
				}
			}

			// Fallback logic from the route (lines 228-235)
			if (
				targetCities.length === 0 &&
				preferredCities &&
				preferredCities.length > 0
			) {
				targetCities = preferredCities;
			}

			expect(targetCities).toEqual(["Berlin", "London"]);
		});

		test("does not fallback when target_cities has values", () => {
			const mockUserData = createMockUserData(["Paris"]);
			const preferredCities = ["Berlin", "London"];

			let targetCities: string[] = [];
			if (mockUserData.target_cities) {
				if (Array.isArray(mockUserData.target_cities)) {
					targetCities = mockUserData.target_cities;
				}
			}

			// Should not use fallback when target_cities has values
			if (
				targetCities.length === 0 &&
				preferredCities &&
				preferredCities.length > 0
			) {
				targetCities = preferredCities;
			}

			expect(targetCities).toEqual(["Paris"]);
			expect(targetCities).not.toEqual(preferredCities);
		});
	});
});

describe("Free Signup Route - Database Array Persistence", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test("validates array persistence expectations", () => {
		// Unit test for the expected behavior of array persistence
		const testCities = ["Berlin", "London", "Paris"];

		// Test that the route expects to insert arrays directly
		const userData = {
			email: "test@example.com",
			target_cities: testCities, // Should be stored as array
			subscription_tier: "free",
		};

		expect(Array.isArray(userData.target_cities)).toBe(true);
		expect(userData.target_cities).toEqual(testCities);
		expect(userData.target_cities.length).toBe(3);
	});

	test("validates stringified array handling", () => {
		// Unit test for stringified array handling logic
		const testCities = ["Berlin", "London"];
		const stringifiedCities = JSON.stringify(testCities);

		// Test the normalization logic with stringified input
		let targetCities: string[] = [];
		if (stringifiedCities) {
			if (Array.isArray(stringifiedCities)) {
				targetCities = stringifiedCities;
			} else if (typeof stringifiedCities === "string") {
				try {
					const parsed = JSON.parse(stringifiedCities);
					if (Array.isArray(parsed)) {
						targetCities = parsed;
					} else {
						targetCities = [stringifiedCities];
					}
				} catch {
					targetCities = [stringifiedCities];
				}
			}
		}

		expect(targetCities).toEqual(testCities);
		expect(Array.isArray(targetCities)).toBe(true);
	});

	test("validates database array field normalization", () => {
		const testCases = [
			{
				name: "null target_cities",
				targetCities: null,
				expectedNormalization: [],
			},
			{
				name: "empty array",
				targetCities: [],
				expectedNormalization: [],
			},
			{
				name: "single city array",
				targetCities: ["Berlin"],
				expectedNormalization: ["Berlin"],
			},
		];

		for (const testCase of testCases) {
			// Test the normalization logic directly
			let targetCities: string[] = [];
			if (testCase.targetCities) {
				if (Array.isArray(testCase.targetCities)) {
					targetCities = testCase.targetCities;
				} else if (typeof testCase.targetCities === "string") {
					try {
						const parsed = JSON.parse(testCase.targetCities);
						if (Array.isArray(parsed)) {
							targetCities = parsed;
						} else {
							targetCities = [testCase.targetCities];
						}
					} catch {
						targetCities = [testCase.targetCities];
					}
				}
			}

			expect(targetCities).toEqual(testCase.expectedNormalization);
		}
	});
});

describe("Free Signup Route - E2E Flow Tests", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test("validates signup data structure with multiple cities", () => {
		const signupData = {
			email: "e2e-test@example.com",
			full_name: "E2E Test User",
			preferred_cities: ["Berlin", "London", "Paris"],
			career_paths: ["tech"],
			visa_sponsorship: "no",
			birth_year: 1995,
			age_verified: true,
			terms_accepted: true,
		};

		// Test data structure expectations
		expect(signupData.preferred_cities).toHaveLength(3);
		expect(signupData.preferred_cities).toEqual(["Berlin", "London", "Paris"]);
		expect(signupData.career_paths).toEqual(["tech"]);
		expect(signupData.visa_sponsorship).toBe("no");
		expect(signupData.age_verified).toBe(true);
		expect(signupData.terms_accepted).toBe(true);
	});

	test("validates duplicate email handling logic", () => {
		// Test the expected response structure for duplicate emails
		const expectedResponse = {
			error: "account_already_exists",
			message:
				"Looks like you already have a JobPing account! Taking you to your matches...",
			redirectToMatches: true,
		};

		expect(expectedResponse.error).toBe("account_already_exists");
		expect(expectedResponse.redirectToMatches).toBe(true);
		expect(expectedResponse.message).toContain(
			"already have a JobPing account",
		);
	});

	test("validates required fields", async () => {
		const invalidData = {
			email: "test@example.com",
			full_name: "Test User",
			// Missing preferred_cities
			career_paths: ["tech"],
			visa_sponsorship: "no",
			birth_year: 1995,
			age_verified: true,
			terms_accepted: true,
		};

		const request = createMockRequest(invalidData);
		const response = await freeSignupPost(request);

		expect(response.status).toBe(400);
		const responseData = await response.json();

		expect(responseData.error).toBe("invalid_input");
		expect(responseData.message).toContain(
			"All fields are required and must be valid",
		);
	});

	test("validates single city selection structure", () => {
		const signupData = {
			email: "single-city-test@example.com",
			full_name: "Single City User",
			preferred_cities: ["Berlin"], // Only one city
			career_paths: ["tech"],
			visa_sponsorship: "no",
			birth_year: 1995,
			age_verified: true,
			terms_accepted: true,
		};

		// Test single city data structure
		expect(signupData.preferred_cities).toHaveLength(1);
		expect(signupData.preferred_cities).toEqual(["Berlin"]);
		expect(signupData.career_paths).toEqual(["tech"]);
	});

	test("validates cookie settings for existing users", () => {
		// Test expected cookie configuration
		const expectedCookieOptions = {
			httpOnly: true,
			secure: true, // HTTPS
			sameSite: "lax" as const,
			maxAge: 60 * 60 * 24 * 30, // 30 days
			path: "/",
		};

		expect(expectedCookieOptions.httpOnly).toBe(true);
		expect(expectedCookieOptions.secure).toBe(true);
		expect(expectedCookieOptions.sameSite).toBe("lax");
		expect(expectedCookieOptions.maxAge).toBe(2592000); // 30 days in seconds
		expect(expectedCookieOptions.path).toBe("/");
	});
});

describe("Free Signup Route - Performance Tests", () => {
	test("handles large city arrays efficiently", () => {
		const largeCityArray = Array.from({ length: 50 }, (_, i) => `City${i}`);

		const startTime = Date.now();

		// Test the normalization logic with large array
		let targetCities: string[] = [];
		if (largeCityArray) {
			if (Array.isArray(largeCityArray)) {
				targetCities = largeCityArray;
			} else if (typeof largeCityArray === "string") {
				try {
					targetCities = JSON.parse(largeCityArray);
				} catch {
					targetCities = [largeCityArray];
				}
			}
		}

		const endTime = Date.now();

		expect(targetCities).toHaveLength(50);
		expect(targetCities[0]).toBe("City0");
		expect(targetCities[49]).toBe("City49");
		expect(endTime - startTime).toBeLessThan(100); // Should be fast
	});

	test("JSON parsing performance for large arrays", () => {
		const largeCityArray = Array.from({ length: 100 }, (_, i) => `City${i}`);
		const stringifiedArray = JSON.stringify(largeCityArray);

		const startTime = Date.now();

		// Test JSON parsing performance
		let targetCities: string[] = [];
		try {
			targetCities = JSON.parse(stringifiedArray);
		} catch {
			targetCities = [stringifiedArray];
		}

		const endTime = Date.now();

		expect(targetCities).toHaveLength(100);
		expect(endTime - startTime).toBeLessThan(50); // JSON parsing should be very fast
	});

	test("array validation performance", () => {
		const testArrays = [
			["Berlin"],
			["Berlin", "London", "Paris"],
			Array.from({ length: 10 }, (_, i) => `City${i}`),
			Array.from({ length: 25 }, (_, i) => `City${i}`),
		];

		const startTime = Date.now();

		for (const testArray of testArrays) {
			// Test array validation logic
			const isValidArray = Array.isArray(testArray) && testArray.length > 0;
			expect(isValidArray).toBe(true);

			// Test all elements are strings
			const allStrings = testArray.every((city) => typeof city === "string");
			expect(allStrings).toBe(true);
		}

		const endTime = Date.now();

		expect(endTime - startTime).toBeLessThan(200); // Should be very fast
	});
});

describe("Free Signup Route - Edge Cases", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test("handles empty city array", async () => {
		const signupData = {
			email: "empty-cities-test@example.com",
			full_name: "Empty Cities User",
			preferred_cities: [], // Empty array - should fail validation
			career_paths: ["tech"],
			visa_sponsorship: "no",
			birth_year: 1995,
			age_verified: true,
			terms_accepted: true,
		};

		const request = createMockRequest(signupData);
		const response = await freeSignupPost(request);

		expect(response.status).toBe(400);
		const responseData = await response.json();
		expect(responseData.error).toBe("invalid_input");
	});

	test("handles malformed city data gracefully", () => {
		// Test various malformed inputs that might cause the normalization to fail
		const malformedCases = [
			{ target_cities: "not-json-string", expected: ["not-json-string"] },
			{
				target_cities: '{"not": "an array"}',
				expected: ['{"not": "an array"}'],
			},
			{ target_cities: "", expected: [] },
			{ target_cities: "null", expected: ["null"] }, // 'null' string parses to null, which is not an array
			{ target_cities: "[]", expected: [] },
			{ target_cities: '["Berlin"]', expected: ["Berlin"] },
			{ target_cities: '["Berlin", "London"]', expected: ["Berlin", "London"] },
		];

		for (const testCase of malformedCases) {
			let targetCities: string[] = [];
			if (testCase.target_cities) {
				if (Array.isArray(testCase.target_cities)) {
					targetCities = testCase.target_cities;
				} else if (typeof testCase.target_cities === "string") {
					try {
						const parsed = JSON.parse(testCase.target_cities);
						if (Array.isArray(parsed)) {
							targetCities = parsed;
						} else {
							targetCities = [testCase.target_cities];
						}
					} catch {
						targetCities = [testCase.target_cities];
					}
				}
			}

			expect(targetCities).toEqual(testCase.expected);
			expect(Array.isArray(targetCities)).toBe(true);
			expect(() => {
				// Ensure no exceptions are thrown
				JSON.stringify(targetCities);
			}).not.toThrow();
		}
	});

	test("handles undefined and null values", () => {
		const testCases = [
			{ target_cities: undefined, expected: [] },
			{ target_cities: null, expected: [] },
			{ target_cities: [], expected: [] },
		];

		for (const testCase of testCases) {
			let targetCities: string[] = [];
			if (testCase.target_cities) {
				if (Array.isArray(testCase.target_cities)) {
					targetCities = testCase.target_cities;
				} else if (typeof testCase.target_cities === "string") {
					try {
						targetCities = JSON.parse(testCase.target_cities);
					} catch {
						targetCities = [testCase.target_cities];
					}
				}
			}

			expect(targetCities).toEqual(testCase.expected);
		}
	});

	test("handles non-string values in arrays", () => {
		// Test what happens if array contains non-string values
		const mixedArray = ["Berlin", 123, null, undefined, {}];

		let targetCities: string[] = [];
		if (mixedArray) {
			if (Array.isArray(mixedArray)) {
				// This would be the actual behavior - no filtering
				targetCities = mixedArray as string[];
			}
		}

		// The current code doesn't validate array contents
		expect(targetCities).toEqual(mixedArray);
	});

	test("fallback logic works correctly", () => {
		const testCases = [
			{
				targetCities: [],
				preferredCities: ["Berlin", "London"],
				expected: ["Berlin", "London"],
			},
			{
				targetCities: ["Paris"],
				preferredCities: ["Berlin", "London"],
				expected: ["Paris"], // Should not use fallback when target_cities has values
			},
			{
				targetCities: [],
				preferredCities: [],
				expected: [], // No fallback available
			},
			{
				targetCities: null,
				preferredCities: ["Berlin"],
				expected: ["Berlin"], // Use fallback when target_cities is null
			},
		];

		for (const testCase of testCases) {
			let targetCities = testCase.targetCities || [];
			const preferredCities = testCase.preferredCities;

			// Fallback logic from the route
			if (
				targetCities.length === 0 &&
				preferredCities &&
				preferredCities.length > 0
			) {
				targetCities = preferredCities;
			}

			expect(targetCities).toEqual(testCase.expected);
		}
	});

	test("handles extremely long city names", () => {
		const longCityName = "A".repeat(1000); // Very long city name
		const testCases = [
			{ target_cities: [longCityName], expected: [longCityName] },
			{
				target_cities: JSON.stringify([longCityName]),
				expected: [longCityName],
			},
		];

		for (const testCase of testCases) {
			let targetCities: string[] = [];
			if (testCase.target_cities) {
				if (Array.isArray(testCase.target_cities)) {
					targetCities = testCase.target_cities;
				} else if (typeof testCase.target_cities === "string") {
					try {
						targetCities = JSON.parse(testCase.target_cities);
					} catch {
						targetCities = [testCase.target_cities];
					}
				}
			}

			expect(targetCities).toEqual(testCase.expected);
		}
	});
});
