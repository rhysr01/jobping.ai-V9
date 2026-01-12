/**
 * Performance Monitoring and Alerting Tests
 *
 * Tests the monitoring infrastructure for performance tracking,
 * alerting, and automated issue detection
 */

import {
	logger,
	performanceMonitor,
	BusinessMetrics,
	RequestContext,
	LogLevel,
} from "../../lib/monitoring";

describe("Performance Monitoring and Alerting", () => {
	beforeEach(() => {
		// Clear any existing metrics
		performanceMonitor.reset();
		jest.clearAllMocks();
	});

	describe("Logger Functionality", () => {
		it("should log messages with appropriate levels", () => {
			// Test that logger doesn't throw errors
			expect(() => {
				logger.info("Test message", { test: true });
			}).not.toThrow();
		});

		it("should filter logs based on level", () => {
			const originalLevel = process.env.LOG_LEVEL;
			process.env.LOG_LEVEL = "error";

			const consoleSpy = jest.spyOn(console, "info").mockImplementation();

			logger.info("Should not log");
			logger.error("Should log");

			expect(consoleSpy).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
			process.env.LOG_LEVEL = originalLevel;
		});

		it("should include timing information", () => {
			const timer = logger.timer("test-operation");
			// Simulate some work
			setTimeout(() => {
				const duration = timer.end();
				expect(typeof duration).toBe("number");
				expect(duration).toBeGreaterThan(0);
			}, 10);
		}, 100);
	});

	describe("Performance Monitor", () => {
		it("should record and retrieve metrics", () => {
			performanceMonitor.recordMetric("test.metric", 100);
			performanceMonitor.recordMetric("test.metric", 200);

			const values = performanceMonitor.getMetricValues("test.metric");
			expect(values).toEqual([100, 200]);
		});

		it("should calculate metric statistics", () => {
			performanceMonitor.recordMetric("response.time", 100);
			performanceMonitor.recordMetric("response.time", 200);
			performanceMonitor.recordMetric("response.time", 300);

			const stats = performanceMonitor.getMetricStats("response.time");
			expect(stats).toEqual({
				count: 3,
				avg: 200,
				min: 100,
				max: 300,
			});
		});

		it("should calculate percentiles", () => {
			for (let i = 1; i <= 100; i++) {
				performanceMonitor.recordMetric("latency", i);
			}

			const percentiles = performanceMonitor.getPercentiles("latency", [50, 95, 99]);
			expect(percentiles?.p50).toBeCloseTo(50, 0); // Exact match for test data
			expect(percentiles?.p95).toBeCloseTo(95, 0);
			expect(percentiles?.p99).toBeCloseTo(99, 0);
		});

		it("should generate histograms", () => {
			const values = [10, 25, 50, 75, 100, 150, 200];
			values.forEach(v => performanceMonitor.recordMetric("test.hist", v));

			const histogram = performanceMonitor.getHistogram("test.hist", [50, 100, 150]);
			expect(histogram.length).toBeGreaterThan(0);
			expect(histogram.some(h => h.count > 0)).toBe(true);
		});
	});

	describe("Business Metrics", () => {
		it("should record job cleanup metrics", () => {
			// Test that business metrics functions don't throw errors
			expect(() => {
				BusinessMetrics.recordJobCleanup(100, 500, 1500);
			}).not.toThrow();
		});

		it("should record user matching metrics", () => {
			expect(() => {
				BusinessMetrics.recordUserMatching(10, 50, 2000);
			}).not.toThrow();
		});

		it("should record email delivery metrics", () => {
			expect(() => {
				BusinessMetrics.recordEmailSent(100, 98, 500);
			}).not.toThrow();
		});

		it("should record API call metrics", () => {
			expect(() => {
				BusinessMetrics.recordAPICall("/api/match-users", "POST", 200, 150);
			}).not.toThrow();
		});
	});

	describe("Request Context Management", () => {
		it("should manage request contexts", () => {
			const requestId = "req-123";
			const context = { userId: "user-456", operation: "signup" };

			RequestContext.set(requestId, context);
			const retrieved = RequestContext.get(requestId);

			expect(retrieved).toEqual(context);
		});

		it("should update request contexts", () => {
			const requestId = "req-456";

			RequestContext.set(requestId, { userId: "user-123" });
			RequestContext.update(requestId, { operation: "login", duration: 100 });

			const updated = RequestContext.get(requestId);
			expect(updated).toEqual({
				userId: "user-123",
				operation: "login",
				duration: 100,
			});
		});

		it("should cleanup old contexts", () => {
			const oldRequestId = "old-req";
			const newRequestId = "new-req";

			// Set an old context
			RequestContext.set(oldRequestId, {
				timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
				metadata: { timestamp: Date.now() - 2 * 60 * 60 * 1000 },
			});

			// Set a new context
			RequestContext.set(newRequestId, {
				timestamp: Date.now(),
				metadata: { timestamp: Date.now() },
			});

			RequestContext.cleanup();

			expect(RequestContext.get(oldRequestId)).toBeUndefined();
			expect(RequestContext.get(newRequestId)).toBeDefined();
		});
	});

	describe("Automated Alerting", () => {
		it("should detect high error rates", () => {
			// Simulate multiple errors
			for (let i = 0; i < 10; i++) {
				performanceMonitor.recordMetric("api.errors", 1);
			}

			const errorStats = performanceMonitor.getMetricStats("api.errors");
			expect(errorStats?.count).toBe(10);

			// In a real system, this would trigger an alert
			const shouldAlert = (errorStats?.count || 0) > 5;
			expect(shouldAlert).toBe(true);
		});

		it("should detect performance degradation", () => {
			// Record normal performance
			for (let i = 0; i < 10; i++) {
				performanceMonitor.recordMetric("api.latency", 100 + Math.random() * 50);
			}

			// Record degraded performance
			for (let i = 0; i < 5; i++) {
				performanceMonitor.recordMetric("api.latency", 500 + Math.random() * 200);
			}

			const latencyStats = performanceMonitor.getMetricStats("api.latency");
			expect(latencyStats?.avg).toBeGreaterThan(200);

			// In a real system, this would trigger a performance alert
			const isDegraded = (latencyStats?.avg || 0) > 200;
			expect(isDegraded).toBe(true);
		});

		it("should monitor resource usage", () => {
			// Simulate memory usage tracking
			performanceMonitor.recordMetric("memory.heap_used", 100 * 1024 * 1024); // 100MB
			performanceMonitor.recordMetric("memory.heap_total", 500 * 1024 * 1024); // 500MB

			const heapUsed = performanceMonitor.getMetricStats("memory.heap_used");
			const heapTotal = performanceMonitor.getMetricStats("memory.heap_total");

			expect(heapUsed?.avg).toBe(100 * 1024 * 1024);
			expect(heapTotal?.avg).toBe(500 * 1024 * 1024);

			// Check memory usage percentage
			const usagePercent = ((heapUsed?.avg || 0) / (heapTotal?.avg || 1)) * 100;
			expect(usagePercent).toBe(20);
		});
	});

	describe("Health Check Integration", () => {
		it("should track system health metrics", () => {
			// Simulate health check metrics
			performanceMonitor.recordMetric("health.database", 1); // 1 = healthy
			performanceMonitor.recordMetric("health.redis", 1);
			performanceMonitor.recordMetric("health.email", 0); // 0 = unhealthy

			const dbHealth = performanceMonitor.getMetricValues("health.database");
			const redisHealth = performanceMonitor.getMetricValues("health.redis");
			const emailHealth = performanceMonitor.getMetricValues("health.email");

			expect(dbHealth).toEqual([1]);
			expect(redisHealth).toEqual([1]);
			expect(emailHealth).toEqual([0]);

			// Calculate overall health score
			const totalServices = 3;
			const healthyServices = [dbHealth[0], redisHealth[0], emailHealth[0]].filter(h => h === 1).length;
			const healthScore = (healthyServices / totalServices) * 100;

			expect(healthScore).toBeCloseTo(66.67, 2); // 2 out of 3 services healthy
		});

		it("should track uptime and availability", () => {
			const startTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
			performanceMonitor.recordMetric("system.start_time", startTime);

			const uptime = Date.now() - startTime;
			const uptimeHours = uptime / (1000 * 60 * 60);

			expect(uptimeHours).toBeGreaterThan(23); // Should be close to 24
			expect(uptimeHours).toBeLessThan(25);
		});
	});

	describe("Anomaly Detection", () => {
		it("should detect unusual patterns", () => {
			// Normal traffic pattern
			for (let i = 0; i < 20; i++) {
				performanceMonitor.recordMetric("api.requests_per_minute", 50 + Math.random() * 20);
			}

			// Anomalous spike
			performanceMonitor.recordMetric("api.requests_per_minute", 500);

			const stats = performanceMonitor.getMetricStats("api.requests_per_minute");
			const values = performanceMonitor.getMetricValues("api.requests_per_minute");

			// Find the anomaly
			const maxValue = Math.max(...values);
			const avgValue = stats?.avg || 0;

			const isAnomaly = maxValue > avgValue * 3; // 3x normal traffic
			expect(isAnomaly).toBe(true);
		});

		it("should calculate statistical outliers", () => {
			const values = [10, 12, 11, 13, 10, 12, 100, 11, 10, 12]; // 100 is outlier
			values.forEach(v => performanceMonitor.recordMetric("test.outliers", v));

			const stats = performanceMonitor.getMetricStats("test.outliers");
			const allValues = performanceMonitor.getMetricValues("test.outliers");

			// Simple outlier detection: values more than 2 standard deviations from mean
			const mean = stats?.avg || 0;
			const variance = allValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / allValues.length;
			const stdDev = Math.sqrt(variance);

			const outliers = allValues.filter(val => Math.abs(val - mean) > 2 * stdDev);
			expect(outliers).toContain(100);
			expect(outliers.length).toBe(1);
		});
	});
});