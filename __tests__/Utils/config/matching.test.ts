import {
	getConfigSection,
	getScoringWeights,
	isTestOrPerfMode,
	MATCHING_CONFIG,
	validateConfig,
} from "@/Utils/config/matching";

describe("matching config", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		jest.resetModules();
		process.env = { ...originalEnv };
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe("MATCHING_CONFIG", () => {
		it("should have ai configuration", () => {
			expect(MATCHING_CONFIG.ai).toBeDefined();
			expect(MATCHING_CONFIG.ai.model).toBe("gpt-4o-mini");
			expect(MATCHING_CONFIG.ai.maxTokens).toBe(2000);
			expect(MATCHING_CONFIG.ai.temperature).toBe(0.3);
		});

		it("should have cache configuration", () => {
			expect(MATCHING_CONFIG.cache).toBeDefined();
			expect(MATCHING_CONFIG.cache.ttl).toBeGreaterThan(0);
			expect(MATCHING_CONFIG.cache.maxSize).toBeGreaterThan(0);
		});

		it("should have scoring configuration", () => {
			expect(MATCHING_CONFIG.scoring).toBeDefined();
			expect(MATCHING_CONFIG.scoring.weights).toBeDefined();
			expect(MATCHING_CONFIG.scoring.thresholds).toBeDefined();
		});

		it("should have fallback configuration", () => {
			expect(MATCHING_CONFIG.fallback).toBeDefined();
			expect(MATCHING_CONFIG.fallback.maxMatches).toBeGreaterThan(0);
		});

		it("should have tier distribution", () => {
			expect(MATCHING_CONFIG.tierDistribution).toBeDefined();
			expect(MATCHING_CONFIG.tierDistribution.free).toBeDefined();
			expect(MATCHING_CONFIG.tierDistribution.premium).toBeDefined();
		});

		it("should have testing configuration", () => {
			expect(MATCHING_CONFIG.testing).toBeDefined();
			expect(MATCHING_CONFIG.testing.userCap).toBeGreaterThan(0);
		});

		it("should have production configuration", () => {
			expect(MATCHING_CONFIG.production).toBeDefined();
			expect(MATCHING_CONFIG.production.userCap).toBeGreaterThan(0);
		});
	});

	describe("getScoringWeights", () => {
		it("should return scoring weights", () => {
			const weights = getScoringWeights();
			expect(weights).toBeDefined();
			expect(weights.eligibility).toBeGreaterThan(0);
			expect(weights.careerPath).toBeGreaterThan(0);
			expect(weights.location).toBeGreaterThan(0);
		});

		it("should return weights that sum to 100", () => {
			const weights = getScoringWeights();
			const sum = weights.eligibility + weights.careerPath + weights.location;
			expect(sum).toBe(100);
		});
	});

	describe("getConfigSection", () => {
		it("should return ai section", () => {
			const section = getConfigSection("ai");
			expect(section).toBeDefined();
			expect(section.model).toBe("gpt-4o-mini");
		});

		it("should return cache section", () => {
			const section = getConfigSection("cache");
			expect(section).toBeDefined();
			expect(section.ttl).toBeGreaterThan(0);
		});

		it("should return scoring section", () => {
			const section = getConfigSection("scoring");
			expect(section).toBeDefined();
			expect(section.weights).toBeDefined();
		});

		it("should return fallback section", () => {
			const section = getConfigSection("fallback");
			expect(section).toBeDefined();
			expect(section.maxMatches).toBeGreaterThan(0);
		});
	});

	describe("validateConfig", () => {
		it("should validate correct config", () => {
			const result = validateConfig();
			expect(result).toHaveProperty("valid");
			expect(result).toHaveProperty("errors");
			expect(Array.isArray(result.errors)).toBe(true);
		});

		it("should check scoring weights sum", () => {
			const result = validateConfig();
			// Config should be valid by default
			expect(result.valid).toBe(true);
		});
	});

	describe("isTestOrPerfMode", () => {
		it("should detect test mode", () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "test";
			expect(isTestOrPerfMode()).toBe(true);
			process.env.NODE_ENV = originalEnv;
		});

		it("should detect perf mode flag", () => {
			const originalFlag = process.env.JOBPING_TEST_MODE;
			process.env.JOBPING_TEST_MODE = "1";
			expect(isTestOrPerfMode()).toBe(true);
			process.env.JOBPING_TEST_MODE = originalFlag;
		});

		it("should return false in production", () => {
			const originalEnv = process.env.NODE_ENV;
			delete process.env.JOBPING_TEST_MODE;
			process.env.NODE_ENV = "production";
			expect(isTestOrPerfMode()).toBe(false);
			process.env.NODE_ENV = originalEnv;
		});
	});
});
