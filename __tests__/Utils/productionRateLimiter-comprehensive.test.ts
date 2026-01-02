/**
 * Comprehensive tests for Production Rate Limiter
 * Tests Redis-backed rate limiting, fallback, scraper limits
 */

import type { NextRequest } from "next/server";
import {
	ProductionRateLimiter,
	RATE_LIMIT_CONFIG,
	SCRAPER_RATE_LIMITS,
} from "@/Utils/productionRateLimiter";

jest.mock("redis", () => ({
	createClient: jest.fn(),
}));

describe("Production Rate Limiter", () => {
	let rateLimiter: ProductionRateLimiter;
	let mockRedisClient: any;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env.NODE_ENV = "production";
		delete process.env.JOBPING_TEST_MODE;
		delete process.env.JEST_WORKER_ID;

		mockRedisClient = {
			connect: jest.fn().mockResolvedValue(undefined),
			quit: jest.fn().mockResolvedValue(undefined),
			get: jest.fn(),
			set: jest.fn(),
			incr: jest.fn(),
			expire: jest.fn(),
			on: jest.fn(),
			isOpen: true,
		};

		const { createClient } = require("redis");
		createClient.mockReturnValue(mockRedisClient);

		rateLimiter = new ProductionRateLimiter();
	});

	describe("Initialization", () => {
		it("should initialize Redis client", async () => {
			process.env.REDIS_URL = "redis://localhost:6379";

			await rateLimiter.initializeRedis();

			expect(mockRedisClient.connect).toHaveBeenCalled();
		});

		it("should use fallback when Redis URL not set", async () => {
			delete process.env.REDIS_URL;

			await rateLimiter.initializeRedis();

			expect(mockRedisClient.connect).not.toHaveBeenCalled();
		});

		it("should bypass in test mode", async () => {
			process.env.NODE_ENV = "test";

			await rateLimiter.initializeRedis();

			const result = await rateLimiter.checkRateLimit("default", "test-id");
			expect(result.allowed).toBe(true);
		});
	});

	describe("Rate Limit Checking", () => {
		beforeEach(async () => {
			await rateLimiter.initializeRedis();
		});

		it("should allow request within limit", async () => {
			mockRedisClient.get.mockResolvedValue("5");
			mockRedisClient.incr.mockResolvedValue(6);
			mockRedisClient.expire.mockResolvedValue(1);

			const result = await rateLimiter.checkRateLimit("default", "user123");

			expect(result.allowed).toBe(true);
			expect(result.remaining).toBeGreaterThan(0);
		});

		it("should deny request exceeding limit", async () => {
			mockRedisClient.get.mockResolvedValue("20");
			mockRedisClient.incr.mockResolvedValue(21);

			const result = await rateLimiter.checkRateLimit("default", "user123");

			expect(result.allowed).toBe(false);
		});

		it("should use custom config when provided", async () => {
			mockRedisClient.get.mockResolvedValue(null);
			mockRedisClient.incr.mockResolvedValue(1);
			mockRedisClient.expire.mockResolvedValue(1);

			const result = await rateLimiter.checkRateLimit("default", "user123", {
				windowMs: 60000,
				maxRequests: 10,
			});

			expect(result.allowed).toBe(true);
		});

		it("should fallback to memory when Redis unavailable", async () => {
			mockRedisClient.get.mockRejectedValue(new Error("Redis error"));

			const result = await rateLimiter.checkRateLimit("default", "user123");

			expect(result.allowed).toBe(true); // First request should pass
		});
	});

	describe("Middleware", () => {
		beforeEach(async () => {
			await rateLimiter.initializeRedis();
		});

		it("should return null when request allowed", async () => {
			mockRedisClient.get.mockResolvedValue("5");
			mockRedisClient.incr.mockResolvedValue(6);
			mockRedisClient.expire.mockResolvedValue(1);

			const request = {
				headers: new Headers({ "x-forwarded-for": "1.2.3.4" }),
				url: "https://example.com/api/test",
			} as NextRequest;

			const result = await rateLimiter.middleware(request, "default");

			expect(result).toBeNull();
		});

		it("should return rate limit response when exceeded", async () => {
			mockRedisClient.get.mockResolvedValue("20");
			mockRedisClient.incr.mockResolvedValue(21);

			const request = {
				headers: new Headers({ "x-forwarded-for": "1.2.3.4" }),
				url: "https://example.com/api/test",
			} as NextRequest;

			const result = await rateLimiter.middleware(request, "default");

			expect(result).not.toBeNull();
			expect(result?.status).toBe(429);
		});
	});

	describe("Scraper Rate Limits", () => {
		it("should have scraper rate limit configs", () => {
			expect(SCRAPER_RATE_LIMITS.greenhouse).toBeDefined();
			expect(SCRAPER_RATE_LIMITS.lever).toBeDefined();
			expect(SCRAPER_RATE_LIMITS.workday).toBeDefined();
		});

		it("should check scraper rate limit", async () => {
			await rateLimiter.initializeRedis();

			const result = await rateLimiter.checkScraperRateLimit(
				"greenhouse",
				"scraper1",
			);

			expect(result).toBeDefined();
			expect(result.allowed).toBeDefined();
		});
	});

	describe("Configuration", () => {
		it("should have rate limit configs for all endpoints", () => {
			expect(RATE_LIMIT_CONFIG["scrape"]).toBeDefined();
			expect(RATE_LIMIT_CONFIG["match-users"]).toBeDefined();
			expect(RATE_LIMIT_CONFIG["default"]).toBeDefined();
		});

		it("should have default config", () => {
			expect(RATE_LIMIT_CONFIG.default.windowMs).toBe(60000);
			expect(RATE_LIMIT_CONFIG.default.maxRequests).toBe(20);
		});
	});

	describe("Teardown", () => {
		it("should close Redis connection", async () => {
			process.env.REDIS_URL = "redis://localhost:6379";
			await rateLimiter.initializeRedis();

			await rateLimiter.teardown();

			expect(mockRedisClient.quit).toHaveBeenCalled();
		});
	});
});
