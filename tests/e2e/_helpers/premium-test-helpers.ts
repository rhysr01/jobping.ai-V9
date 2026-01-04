import { APIRequestContext } from "@playwright/test";

/**
 * Premium Test Helpers - Senior Developer Level
 *
 * Comprehensive test utilities for premium tier testing including:
 * - Test data factories
 * - Authentication helpers
 * - Performance measurement
 * - Response validation
 * - Edge case generators
 */

export interface PremiumUser {
	email: string;
	fullName: string;
	tier: "free" | "premium";
	cities: string[];
	languages: string[];
	startDate: string;
	experience: string;
	workEnvironment: string[];
	visaStatus: string;
	entryLevelPreferences: string[];
	targetCompanies: string[];
	careerPath: string;
	roles: string[];
	industries: string[];
	companySizePreference: string;
	skills: string[];
	careerKeywords: string;
	gdprConsent: boolean;
}

export interface MatchResult {
	matches: any[];
	method: string;
	processing_time: number;
	tier: string;
	confidence?: number;
}

export interface PerformanceMetrics {
	responseTime: number;
	throughput: number;
	errorRate: number;
	percentile95: number;
}

/**
 * Test Data Factories
 */
export class PremiumTestDataFactory {
	static createUser(overrides: Partial<PremiumUser> = {}): PremiumUser {
		const timestamp = Date.now();
		const baseUser: PremiumUser = {
			email: `test-premium-${timestamp}@e2e.test`,
			fullName: `Premium Test User ${timestamp}`,
			tier: "premium",
			cities: ["London", "Berlin"],
			languages: ["English", "German"],
			startDate: "2024-06-01",
			experience: "1 year",
			workEnvironment: ["Hybrid"],
			visaStatus: "EU citizen",
			entryLevelPreferences: ["Mid-level"],
			targetCompanies: ["Tech Companies"],
			careerPath: "tech",
			roles: ["Software Engineer"],
			industries: ["Technology"],
			companySizePreference: "large",
			skills: ["JavaScript", "Python"],
			careerKeywords: "web development",
			gdprConsent: true,
		};

		return { ...baseUser, ...overrides };
	}

	static createFreeUser(overrides: Partial<PremiumUser> = {}): PremiumUser {
		return this.createUser({ ...overrides, tier: "free", experience: "0" });
	}

	static createRestrictiveUser(): PremiumUser {
		return this.createUser({
			cities: ["Tokyo"],
			languages: ["Japanese"],
			careerPath: "finance",
			roles: ["Financial Analyst Intern"],
			visaStatus: "Japan citizen",
		});
	}

	static createInvalidUser(): Partial<PremiumUser> {
		return {
			email: "invalid-email",
			fullName: "",
			// Missing required fields
		};
	}

	static createOversizedUser(): PremiumUser {
		const user = this.createUser();
		user.email = "a".repeat(1000) + "@test.com";
		user.skills = Array.from({ length: 100 }, (_, i) => `skill${i}`);
		return user;
	}
}

/**
 * Authentication & Authorization Helpers
 */
export class PremiumAuthHelper {
	static async authenticatePremiumUser(request: APIRequestContext, user: PremiumUser) {
		// Simulate premium authentication
		const authToken = `premium-token-${user.email}`;
		return {
			headers: {
				"Authorization": `Bearer ${authToken}`,
				"X-Premium-Tier": "true",
			},
			cookies: [
				{
					name: "premium_session",
					value: `session-${user.email}`,
					domain: "localhost",
					path: "/",
					httpOnly: true,
				},
			],
		};
	}

	static async authenticateFreeUser(request: APIRequestContext, user: PremiumUser) {
		return {
			headers: {
				"X-Tier": "free",
			},
			cookies: [
				{
					name: "free_session",
					value: `session-${user.email}`,
					domain: "localhost",
					path: "/",
				},
			],
		};
	}

	static async getSystemAuth() {
		return {
			headers: {
				"Authorization": `Bearer ${process.env.SYSTEM_API_KEY}`,
			},
		};
	}
}

/**
 * API Testing Helpers
 */
export class PremiumAPIHelper {
	static async createUser(request: APIRequestContext, userData: PremiumUser) {
		const response = await request.post("/api/signup", { data: userData });
		const success = response.status() === 200;

		let responseData;
		try {
			responseData = await response.json();
		} catch {
			responseData = null;
		}

		return {
			response,
			success,
			data: responseData,
			user: userData,
			status: response.status(),
		};
	}

	static async runMatching(request: APIRequestContext, userEmail: string, options: any = {}) {
		const auth = await PremiumAuthHelper.getSystemAuth();
		const response = await request.post("/api/match-users", {
			headers: auth.headers,
			data: { userEmail, ...options },
		});

		const data = await response.json().catch(() => ({}));

		return {
			response,
			status: response.status(),
			data: data as MatchResult,
			success: response.status() === 200,
		};
	}

	static async getPremiumMatches(request: APIRequestContext, user: PremiumUser) {
		// Premium matches use the same endpoint but with premium user data
		return PremiumAPIHelper.runMatching(request, user.email);
	}
}

/**
 * Performance Testing Helpers
 */
export class PremiumPerformanceHelper {
	static async measureResponseTime<T>(
		operation: () => Promise<T>
	): Promise<{ result: T; responseTime: number }> {
		const startTime = Date.now();
		const result = await operation();
		const responseTime = Date.now() - startTime;

		return { result, responseTime };
	}

	static async measureConcurrentLoad<T>(
		operations: (() => Promise<T>)[],
		concurrency: number = 5
	): Promise<PerformanceMetrics> {
		const startTime = Date.now();
		const results: { success: boolean; responseTime: number }[] = [];

		// Run operations in batches
		for (let i = 0; i < operations.length; i += concurrency) {
			const batch = operations.slice(i, i + concurrency);
			const batchResults = await Promise.all(
				batch.map(async (op) => {
					try {
						const { responseTime } = await this.measureResponseTime(op);
						return { success: true, responseTime };
					} catch {
						return { success: false, responseTime: 0 };
					}
				})
			);
			results.push(...batchResults);
		}

		const totalTime = Date.now() - startTime;
		const successfulRequests = results.filter(r => r.success).length;
		const totalRequests = results.length;
		const errorRate = (totalRequests - successfulRequests) / totalRequests;
		const responseTimes = results.filter(r => r.success).map(r => r.responseTime);
		const percentile95 = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)] || 0;

		return {
			responseTime: totalTime,
			throughput: totalRequests / (totalTime / 1000),
			errorRate,
			percentile95,
		};
	}
}

/**
 * Response Validation Helpers
 */
export class PremiumValidationHelper {
	static validateMatchResponse(data: MatchResult, expectedTier: "free" | "premium") {
		expect(data).toHaveProperty("matches");
		expect(Array.isArray(data.matches)).toBe(true);
		expect(data).toHaveProperty("method");
		expect(data).toHaveProperty("processing_time");
		expect(typeof data.processing_time).toBe("number");
		expect(data.processing_time).toBeGreaterThan(0);

		// Premium-specific validations
		if (expectedTier === "premium") {
			expect(data).toHaveProperty("tier");
			expect(data.tier).toBe("premium");

			// Premium should have minimum match count
			expect(data.matches.length).toBeGreaterThanOrEqual(5);

			// Premium matches should have enhanced metadata
			if (data.matches.length > 0) {
				const match = data.matches[0];
				expect(match).toHaveProperty("score_breakdown");
				expect(match.score_breakdown).toHaveProperty("overall");
				expect(match.score_breakdown).toHaveProperty("eligibility");
				expect(match.score_breakdown).toHaveProperty("careerPath");
			}
		}
	}

	static validatePremiumVsFreeComparison(freeData: MatchResult, premiumData: MatchResult) {
		// Premium should return at least as many matches as free
		expect(premiumData.matches.length).toBeGreaterThanOrEqual(freeData.matches.length);

		// Premium should have tier metadata
		expect(premiumData.tier).toBe("premium");
		expect(freeData.tier).toBe("free");

		// Premium processing might be different but should be reasonable
		expect(premiumData.processing_time).toBeLessThan(30000); // 30 seconds max
		expect(freeData.processing_time).toBeLessThan(30000);
	}

	static validateSecurityResponse(response: any, expectedStatus: number[]) {
		expect(expectedStatus).toContain(response.status);

		if (response.status === 400) {
			expect(response.data).toHaveProperty("error");
		}

		if (response.status === 401 || response.status === 403) {
			// Should not leak sensitive information
			expect(response.data).not.toHaveProperty("internal_details");
			expect(response.data).not.toHaveProperty("stack_trace");
		}
	}
}

/**
 * Edge Case Generators
 */
export class PremiumEdgeCaseGenerator {
	static generateMaliciousInputs() {
		return [
			{ userEmail: "'; DROP TABLE users; --" },
			{ userEmail: "<script>alert('xss')</script>" },
			{ userEmail: "../../../../etc/passwd" },
			{ userEmail: "a".repeat(10000) + "@test.com" },
		];
	}

	static generateInvalidUserData() {
		return [
			{ email: "", fullName: "Test User" },
			{ email: "invalid-email", fullName: "" },
			{ email: "test@test.com", fullName: "", tier: "invalid" },
			{ email: null, fullName: undefined },
		];
	}

	static generateRateLimitTests(count: number = 20) {
		return Array.from({ length: count }, () => ({
			endpoint: "/api/health",
			method: "GET",
			headers: {},
		}));
	}
}

/**
 * Accessibility Testing Helpers
 */
export class PremiumAccessibilityHelper {
	static async checkKeyboardNavigation(page: any) {
		// Test Tab navigation
		const tabbableElements = await page.locator('[tabindex]:not([tabindex="-1"]), button, input, select, textarea, a[href]').all();
		expect(tabbableElements.length).toBeGreaterThan(0);

		// Test focus management
		await page.keyboard.press("Tab");
		const focusedElement = page.locator(":focus");
		await expect(focusedElement).toBeVisible();

		return { tabbableElements: tabbableElements.length };
	}

	static async checkAriaLabels(page: any) {
		const ariaElements = await page.locator('[aria-label], [aria-labelledby]').all();
		const totalFormElements = await page.locator('input, button, select, textarea').all();

		return {
			ariaElements: ariaElements.length,
			totalFormElements: totalFormElements.length,
			coverage: ariaElements.length / Math.max(totalFormElements.length, 1),
		};
	}
}
