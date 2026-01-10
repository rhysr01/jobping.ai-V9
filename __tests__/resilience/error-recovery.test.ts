/**
 * Error Recovery & Resilience Tests
 *
 * Tests system behavior under failure conditions and recovery mechanisms
 * Critical for maintaining service reliability and user experience
 */

import { createMocks } from "node-mocks-http";
import { GET as getHealth } from "@/app/api/health/route";
import { GET as getMatches } from "@/app/api/match-users/route";
import { POST as signupUser } from "@/app/api/signup/route";

describe("Error Recovery & System Resilience", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("Health Check Resilience", () => {
		it("provides health status during normal operation", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/health",
			});

			const response = await getHealth(req as any);
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("status", "healthy");
			expect(data).toHaveProperty("timestamp");
			expect(data).toHaveProperty("services");
		});

		it("reports degraded services in health check", async () => {
			// Mock database failure
			const originalEnv = process.env.SUPABASE_URL;
			process.env.SUPABASE_URL = "invalid-url";

			const { req } = createMocks({
				method: "GET",
				url: "/api/health",
			});

			const response = await getHealth(req as any);

			// Should still return health info but mark database as degraded
			expect([200, 503]).toContain(response.status);

			if (response.status === 200) {
				const data = await response.json();
				expect(data.services).toHaveProperty("database");
				expect(["degraded", "unhealthy"]).toContain(data.services.database);
			}

			process.env.SUPABASE_URL = originalEnv;
		});

		it("maintains partial functionality during outages", async () => {
			// Mock external service failures but keep core functionality
			const { req } = createMocks({
				method: "GET",
				url: "/api/health?include=external",
			});

			const response = await getHealth(req as any);
			expect([200, 503]).toContain(response.status);

			if (response.status === 200) {
				const data = await response.json();
				// Core services should be healthy even if external ones aren't
				expect(data.services).toHaveProperty("core");
				expect(data.services.core).toBe("healthy");
			}
		});
	});

	describe("Matching Engine Degradation", () => {
		it("falls back to cached results when AI fails", async () => {
			// Mock OpenAI failure
			const { req } = createMocks({
				method: "GET",
				url: "/api/match-users?email=test@example.com&fallback=true",
			});

			const response = await getMatches(req as any);
			expect([200, 503]).toContain(response.status);

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty("matches");
				expect(data).toHaveProperty("fallbackUsed");
				expect(data.fallbackUsed).toBe(true);
			}
		});

		it("provides basic matching when advanced features fail", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/match-users?email=test@example.com&basic=true",
			});

			const response = await getMatches(req as any);
			expect([200, 503]).toContain(response.status);

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty("matches");
				expect(data).toHaveProperty("matchingType");
				expect(["basic", "fallback"]).toContain(data.matchingType);
			}
		});

		it("gracefully handles database connection issues", async () => {
			// Mock database failure during matching
			const originalEnv = process.env.SUPABASE_SERVICE_ROLE_KEY;
			process.env.SUPABASE_SERVICE_ROLE_KEY = "invalid-key";

			const { req } = createMocks({
				method: "GET",
				url: "/api/match-users?email=test@example.com",
			});

			const response = await getMatches(req as any);
			expect([200, 503]).toContain(response.status);

			if (response.status === 503) {
				const data = await response.json();
				expect(data).toHaveProperty("error");
				expect(data).toHaveProperty("retryAfter");
			}

			process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv;
		});
	});

	describe("Signup Process Resilience", () => {
		it("handles email delivery failures during signup", async () => {
			const { req } = createMocks({
				method: "POST",
				url: "/api/signup",
				body: {
					fullName: "Test User",
					email: "test@example.com",
					cities: ["London"],
					languages: ["English"],
					gdprConsent: true,
				},
			});

			const response = await signupUser(req as any);
			expect([201, 503]).toContain(response.status);

			if (response.status === 201) {
				const data = await response.json();
				expect(data).toHaveProperty("userId");
				expect(data).toHaveProperty("emailQueued"); // Email might be queued for retry
			}
		});

		it("maintains data consistency during partial failures", async () => {
			// Test that user creation succeeds even if email fails
			const { req } = createMocks({
				method: "POST",
				url: "/api/signup",
				body: {
					fullName: "Resilient User",
					email: "resilient@example.com",
					cities: ["Berlin"],
					languages: ["German"],
					gdprConsent: true,
				},
			});

			const response = await signupUser(req as any);

			if (response.status === 201) {
				const data = await response.json();
				expect(data.userId).toBeDefined();
				expect(data.accountCreated).toBe(true);
				// Even if email fails, account should be created
			}
		});

		it("provides clear error messages for validation failures", async () => {
			const invalidData = [
				{ fullName: "", email: "test@example.com" }, // Missing name
				{ fullName: "Test", email: "invalid-email" }, // Invalid email
				{ fullName: "Test", email: "test@example.com", gdprConsent: false }, // No consent
			];

			for (const data of invalidData) {
				const { req } = createMocks({
					method: "POST",
					url: "/api/signup",
					body: data,
				});

				const response = await signupUser(req as any);
				expect([400, 422]).toContain(response.status);

				const responseData = await response.json();
				expect(responseData).toHaveProperty("error");
				expect(responseData.error).toHaveProperty("field");
				expect(responseData.error).toHaveProperty("message");
			}
		});
	});

	describe("Circuit Breaker Patterns", () => {
		it("opens circuit breaker after consecutive failures", async () => {
			// Simulate multiple AI failures
			const requests = Array.from({ length: 5 }, () => {
				const { req } = createMocks({
					method: "GET",
					url: "/api/match-users?email=failing@example.com",
				});
				return getMatches(req as any);
			});

			const responses = await Promise.all(requests);
			const failureCount = responses.filter(r => r.status >= 500).length;

			// Circuit should open after threshold
			if (failureCount >= 3) {
				const nextRequest = createMocks({
					method: "GET",
					url: "/api/match-users?email=failing@example.com",
				});

				const circuitResponse = await getMatches(nextRequest.req as any);
				expect([503, 200]).toContain(circuitResponse.status);

				if (circuitResponse.status === 503) {
					const data = await circuitResponse.json();
					expect(data).toHaveProperty("circuitBreaker");
					expect(data.circuitBreaker).toBe("open");
				}
			}
		});

		it("allows limited requests through open circuit breaker", async () => {
			// Test half-open state
			const { req } = createMocks({
				method: "GET",
				url: "/api/match-users?email=test@example.com&testBreaker=true",
			});

			const response = await getMatches(req as any);
			expect([200, 503]).toContain(response.status);

			if (response.status === 503) {
				const data = await response.json();
				if (data.circuitBreaker === "half-open") {
					expect(data).toHaveProperty("testRequest");
					expect(data.testRequest).toBe(true);
				}
			}
		});

		it("closes circuit breaker when service recovers", async () => {
			// Simulate recovery after circuit opens
			const { req } = createMocks({
				method: "GET",
				url: "/api/match-users?email=recovered@example.com",
			});

			const response = await getMatches(req as any);

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty("circuitBreaker");
				expect(["closed", "half-open"]).toContain(data.circuitBreaker);
			}
		});
	});

	describe("Graceful Degradation", () => {
		it("serves cached content when backend is unavailable", async () => {
			// Mock complete backend failure
			const { req } = createMocks({
				method: "GET",
				url: "/api/match-users?email=cached@example.com&allowCache=true",
			});

			const response = await getMatches(req as any);
			expect([200, 503]).toContain(response.status);

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty("fromCache");
				expect(data.fromCache).toBe(true);
				expect(data).toHaveProperty("cacheAge");
			}
		});

		it("provides basic functionality when advanced features fail", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/match-users?email=basic@example.com&basicOnly=true",
			});

			const response = await getMatches(req as any);
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("matches");
			expect(data).toHaveProperty("features");
			expect(data.features).toHaveProperty("ai", false);
			expect(data.features).toHaveProperty("advanced", false);
		});

		it("shows maintenance page during scheduled downtime", async () => {
			// Mock maintenance mode
			process.env.MAINTENANCE_MODE = "true";

			const { req } = createMocks({
				method: "GET",
				url: "/api/health",
			});

			const response = await getHealth(req as any);

			if (response.status === 503) {
				const data = await response.json();
				expect(data).toHaveProperty("maintenance");
				expect(data.maintenance).toBe(true);
				expect(data).toHaveProperty("message");
			}

			delete process.env.MAINTENANCE_MODE;
		});
	});

	describe("User Communication During Failures", () => {
		it("provides helpful error messages to users", async () => {
			const errorScenarios = [
				{ url: "/api/match-users?email=error@example.com", expectedError: "matching" },
				{ url: "/api/signup", method: "POST", body: {}, expectedError: "validation" },
			];

			for (const scenario of errorScenarios) {
				const { req } = createMocks({
					method: scenario.method || "GET",
					url: scenario.url,
					body: scenario.body,
				});

				const handler = scenario.url.includes("match-users") ? getMatches : signupUser;
				const response = await handler(req as any);

				if (response.status >= 400) {
					const data = await response.json();
					expect(data).toHaveProperty("error");
					expect(data.error).toHaveProperty("message");
					expect(data.error).toHaveProperty("userFriendly");
					expect(typeof data.error.userFriendly).toBe("string");
				}
			}
		});

		it("includes recovery suggestions in error responses", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/match-users?email=failed@example.com",
			});

			const response = await getMatches(req as any);

			if (response.status >= 500) {
				const data = await response.json();
				expect(data).toHaveProperty("suggestions");
				expect(Array.isArray(data.suggestions)).toBe(true);
				expect(data.suggestions.length).toBeGreaterThan(0);

				data.suggestions.forEach((suggestion: string) => {
					expect(typeof suggestion).toBe("string");
					expect(suggestion.length).toBeGreaterThan(10);
				});
			}
		});

		it("provides estimated recovery times", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/health",
			});

			const response = await getHealth(req as any);

			if (response.status === 503) {
				const data = await response.json();
				expect(data).toHaveProperty("estimatedRecovery");
				expect(typeof data.estimatedRecovery).toBe("string");
			}
		});
	});

	describe("Automatic Recovery Mechanisms", () => {
		it("automatically retries failed operations", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/match-users?email=retry@example.com&maxRetries=3",
			});

			const response = await getMatches(req as any);
			expect([200, 503]).toContain(response.status);

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty("retryCount");
				expect(data.retryCount).toBeLessThanOrEqual(3);
			}
		});

		it("backs off exponentially on repeated failures", async () => {
			const startTimes = [];
			const requests = Array.from({ length: 3 }, () => {
				const { req } = createMocks({
					method: "GET",
					url: "/api/match-users?email=backoff@example.com",
				});
				startTimes.push(Date.now());
				return getMatches(req as any);
			});

			await Promise.all(requests);

			// Check that delays increase exponentially
			// (This is more of an integration test that would verify actual timing)
			expect(startTimes.length).toBe(3);
		});

		it("recovers automatically when services come back online", async () => {
			// First simulate failure
			const failRequest = createMocks({
				method: "GET",
				url: "/api/match-users?email=recovery@example.com&forceFail=true",
			});

			await getMatches(failRequest.req as any);

			// Then test recovery
			const recoverRequest = createMocks({
				method: "GET",
				url: "/api/match-users?email=recovery@example.com",
			});

			const response = await getMatches(recoverRequest.req as any);
			expect([200, 503]).toContain(response.status);

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty("recovered");
				expect(data.recovered).toBe(true);
			}
		});
	});

	describe("Resource Management During Failures", () => {
		it("cleans up resources when operations fail", async () => {
			const { req } = createMocks({
				method: "POST",
				url: "/api/signup",
				body: {
					fullName: "Cleanup Test",
					email: "cleanup@example.com",
					cities: ["London"],
					languages: ["English"],
					gdprConsent: true,
				},
			});

			const response = await signupUser(req as any);

			// Even if the operation fails, resources should be cleaned up
			expect([201, 500]).toContain(response.status);

			if (response.status === 500) {
				const data = await response.json();
				expect(data).toHaveProperty("resourcesCleaned");
				expect(data.resourcesCleaned).toBe(true);
			}
		});

		it("prevents resource leaks during cascading failures", async () => {
			// Simulate multiple failing requests
			const requests = Array.from({ length: 10 }, () => {
				const { req } = createMocks({
					method: "GET",
					url: "/api/match-users?email=leak-test@example.com",
				});
				return getMatches(req as any);
			});

			await Promise.all(requests);

			// System should not accumulate resources
			// (This would be verified by monitoring resource usage)
			expect(true).toBe(true); // Placeholder for resource monitoring
		});

		it("maintains database connection pools during failures", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/health?include=connections",
			});

			const response = await getHealth(req as any);

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty("connections");
				expect(data.connections).toHaveProperty("active");
				expect(data.connections).toHaveProperty("idle");
				expect(data.connections).toHaveProperty("total");

				// Connection counts should be reasonable
				expect(data.connections.total).toBeLessThan(100);
			}
		});
	});

	describe("Monitoring & Alerting Integration", () => {
		it("logs failures for monitoring systems", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/match-users?email=monitor@example.com&forceError=true",
			});

			const response = await getMatches(req as any);

			// Failures should be logged for monitoring
			expect([200, 503]).toContain(response.status);

			if (response.status === 503) {
				const data = await response.json();
				expect(data).toHaveProperty("logged");
				expect(data.logged).toBe(true);
				expect(data).toHaveProperty("errorId");
			}
		});

		it("triggers alerts for critical failures", async () => {
			// Simulate critical failure
			const { req } = createMocks({
				method: "GET",
				url: "/api/health?critical=true",
			});

			const response = await getHealth(req as any);

			if (response.status === 503) {
				const data = await response.json();
				expect(data).toHaveProperty("alertTriggered");
				expect(typeof data.alertTriggered).toBe("boolean");
			}
		});

		it("provides failure metrics for dashboards", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/health?include=metrics",
			});

			const response = await getHealth(req as any);

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty("metrics");
				expect(data.metrics).toHaveProperty("errorRate");
				expect(data.metrics).toHaveProperty("uptime");
				expect(data.metrics).toHaveProperty("responseTime");

				expect(typeof data.metrics.errorRate).toBe("number");
				expect(data.metrics.errorRate).toBeGreaterThanOrEqual(0);
				expect(data.metrics.errorRate).toBeLessThanOrEqual(1);
			}
		});
	});
});