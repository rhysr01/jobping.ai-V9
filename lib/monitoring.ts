/**
 * Comprehensive Monitoring and Error Tracking System
 *
 * This module provides centralized error tracking, performance monitoring,
 * and structured logging for the JobPing application.
 *
 * Features:
 * - Structured logging with multiple output formats (Axiom integration via Vercel)
 * - Performance monitoring and metrics collection
 * - Business metrics tracking for key operations
 * - Context-aware error reporting
 * - Development vs production logging strategies
 */

// Environment detection
	// const _isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

// Configuration
const MONITORING_CONFIG = {
	logging: {
		level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
		structured: process.env.STRUCTURED_LOGS !== "false",
		console: !isTest,
	},
	environment: process.env.NODE_ENV || "development",
	release:
		process.env.VERCEL_GIT_COMMIT_SHA ||
		process.env.npm_package_version ||
		"1.0.0",
};

export function initializeMonitoring(): void {
	// Monitoring initialized - logs go to Axiom via Vercel integration
	if (isTest) return;

	logger.info("Monitoring initialized", {
		metadata: {
			environment: MONITORING_CONFIG.environment,
			release: MONITORING_CONFIG.release,
			service: "jobping",
		},
	});
}

// Enhanced logging system
export enum LogLevel {
	DEBUG = "debug",
	INFO = "info",
	WARN = "warn",
	ERROR = "error",
	CRITICAL = "critical",
}

export interface LogContext {
	userId?: string;
	requestId?: string;
	operation?: string;
	component?: string;
	duration?: number;
	action?: string;
	timestamp?: string;
	metadata?: Record<string, any>;
	error?: Error;
	[key: string]: any; // Allow additional properties
}

export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	context: LogContext;
	environment: string;
	service: string;
}

class Logger {
	private serviceName = "jobping";

	private shouldLog(level: LogLevel): boolean {
		if (isTest && level !== LogLevel.ERROR && level !== LogLevel.CRITICAL) {
			return false;
		}

		const configLevel = MONITORING_CONFIG.logging.level;
		const levels = [
			LogLevel.DEBUG,
			LogLevel.INFO,
			LogLevel.WARN,
			LogLevel.ERROR,
			LogLevel.CRITICAL,
		];
		const currentLevelIndex = levels.indexOf(level);
		const configLevelIndex = levels.indexOf(configLevel as LogLevel);

		return currentLevelIndex >= configLevelIndex;
	}

	private formatLog(
		level: LogLevel,
		message: string,
		context: LogContext = {},
	): void {
		if (!this.shouldLog(level)) return;

		const timestamp = new Date().toISOString();
		const logEntry: LogEntry = {
			timestamp,
			level,
			message,
			context,
			environment: MONITORING_CONFIG.environment,
			service: this.serviceName,
		};

		if (MONITORING_CONFIG.logging.structured) {
			// Structured JSON logging for production
			if (MONITORING_CONFIG.logging.console) {
				console.log(JSON.stringify(logEntry));
			}
		} else {
			// Human-readable logging for development
			const emoji = {
				[LogLevel.DEBUG]: "",
				[LogLevel.INFO]: "",
				[LogLevel.WARN]: "",
				[LogLevel.ERROR]: "",
				[LogLevel.CRITICAL]: "",
			}[level];

			const contextStr =
				Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : "";

			if (MONITORING_CONFIG.logging.console) {
				console.log(
					`[${timestamp}] ${emoji} ${level.toUpperCase()}: ${message}${contextStr}`,
				);
			}
		}

		// Errors are automatically logged to Axiom via Vercel integration
	}

	debug(message: string, context: LogContext = {}): void {
		this.formatLog(LogLevel.DEBUG, message, context);
	}

	info(message: string, context: LogContext = {}): void {
		this.formatLog(LogLevel.INFO, message, context);
	}

	warn(message: string, context: LogContext = {}): void {
		this.formatLog(LogLevel.WARN, message, context);
	}

	error(message: string, context: LogContext = {}): void {
		this.formatLog(LogLevel.ERROR, message, context);
	}

	critical(message: string, context: LogContext = {}): void {
		this.formatLog(LogLevel.CRITICAL, message, context);
	}

	// Business metrics logging
	metric(
		metricName: string,
		value: number,
		unit: string = "count",
		context: LogContext = {},
	): void {
		this.info(`METRIC: ${metricName}`, {
			...context,
			metadata: {
				...context.metadata,
				metric: {
					name: metricName,
					value,
					unit,
				},
			},
		});

		// Metrics are logged to Axiom via Vercel integration
	}

	// Performance timing
	timer(operation: string, context: LogContext = {}) {
		const startTime = Date.now();

		return {
			end: (additionalContext: LogContext = {}) => {
				const duration = Date.now() - startTime;
				this.info(`TIMING: ${operation}`, {
					...context,
					...additionalContext,
					duration,
					metadata: {
						...context.metadata,
						...additionalContext.metadata,
						timing: {
							operation,
							duration,
							startTime,
							endTime: Date.now(),
						},
					},
				});

				// Timing metrics are logged to Axiom via Vercel integration

				return duration;
			},
		};
	}
}

// Export singleton logger instance
export const logger = new Logger();

/**
 * USER ACTION TRACKING - Simple helper for debugging user flows
 * Usage: logUserAction('signup', { email: user.email, tier: 'free' })
 */
export function logUserAction(
	action: string,
	metadata?: Record<string, any>,
): void {
	logger.info(`USER_ACTION: ${action}`, {
		action,
		timestamp: new Date().toISOString(),
		...metadata,
	});
}

// Performance monitoring utilities
export class PerformanceMonitor {
	private static instance: PerformanceMonitor;
	private readonly metrics: Map<string, number[]> = new Map();
	private readonly maxSamples = 2000;

	static getInstance(): PerformanceMonitor {
		if (!PerformanceMonitor.instance) {
			PerformanceMonitor.instance = new PerformanceMonitor();
		}
		return PerformanceMonitor.instance;
	}

	recordMetric(name: string, value: number): void {
		const bucket = this.metrics.get(name) ?? [];
		bucket.push(value);

		if (bucket.length > this.maxSamples) {
			bucket.splice(0, bucket.length - this.maxSamples);
		}

		this.metrics.set(name, bucket);

		if (name.includes("error") || name.includes("failure")) {
			logger.warn(`Performance metric: ${name} = ${value}`);
		}
	}

	getMetricValues(name: string): number[] {
		const values = this.metrics.get(name);
		return values ? [...values] : [];
	}

	getMetricStats(
		name: string,
	): { count: number; avg: number; min: number; max: number } | null {
		const values = this.getMetricValues(name);
		if (values.length === 0) return null;

		return {
			count: values.length,
			avg: values.reduce((a, b) => a + b, 0) / values.length,
			min: Math.min(...values),
			max: Math.max(...values),
		};
	}

	getPercentiles(
		name: string,
		percentiles: number[],
	): Record<string, number> | null {
		const values = this.getMetricValues(name).sort((a, b) => a - b);
		if (values.length === 0) return null;

		const result: Record<string, number> = {};
		percentiles.forEach((p) => {
			const rank = (p / 100) * (values.length - 1);
			const lower = Math.floor(rank);
			const upper = Math.ceil(rank);
			if (lower === upper) {
				result[`p${p}`] = values[lower];
			} else {
				const weight = rank - lower;
				result[`p${p}`] = values[lower] * (1 - weight) + values[upper] * weight;
			}
		});
		return result;
	}

	getHistogram(
		name: string,
		buckets: number[],
	): Array<{ bucket: string; count: number }> {
		const values = this.getMetricValues(name);
		if (values.length === 0) return [];

		const sortedBuckets = [...buckets].sort((a, b) => a - b);
		const counts = new Array(sortedBuckets.length + 1).fill(0);

		values.forEach((value) => {
			let placed = false;
			for (let i = 0; i < sortedBuckets.length; i++) {
				if (value <= sortedBuckets[i]) {
					counts[i] += 1;
					placed = true;
					break;
				}
			}
			if (!placed) {
				counts[counts.length - 1] += 1;
			}
		});

		const histogram: Array<{ bucket: string; count: number }> = [];
		for (let i = 0; i < sortedBuckets.length; i++) {
			const label =
				i === 0
					? `<=${sortedBuckets[i]}`
					: `${sortedBuckets[i - 1] + 1}-${sortedBuckets[i]}`;
			histogram.push({ bucket: label, count: counts[i] });
		}
		histogram.push({
			bucket: `>${sortedBuckets[sortedBuckets.length - 1]}`,
			count: counts[counts.length - 1],
		});

		return histogram;
	}

	getMetricsByPrefix(
		prefix: string,
	): Record<string, { count: number; avg: number; min: number; max: number }> {
		const result: Record<
			string,
			{ count: number; avg: number; min: number; max: number }
		> = {};
		for (const name of this.metrics.keys()) {
			if (name.startsWith(prefix)) {
				const stats = this.getMetricStats(name);
				if (stats) {
					result[name] = stats;
				}
			}
		}
		return result;
	}

	getAllMetrics(): Record<string, any> {
		const result: Record<string, any> = {};
		for (const name of this.metrics.keys()) {
			result[name] = this.getMetricStats(name);
		}
		return result;
	}

	reset(): void {
		this.metrics.clear();
	}
}

// Business metrics tracking - using object instead of class for better tree-shaking
export const BusinessMetrics = {
	recordJobCleanup(deleted: number, total: number, duration: number): void {
		logger.metric("jobs.cleanup.deleted", deleted, "count", {
			operation: "job-cleanup",
			component: "database",
			duration,
			metadata: { total, deletionPercentage: (deleted / total) * 100 },
		});
	},

	recordUserMatching(
		users: number,
		jobsMatched: number,
		duration: number,
	): void {
		logger.metric("users.matched", users, "count", {
			operation: "user-matching",
			component: "ai-service",
			duration,
			metadata: { jobsMatched, avgJobsPerUser: jobsMatched / users },
		});
	},

	recordEmailSent(emails: number, success: number, duration: number): void {
		logger.metric("emails.sent", emails, "count", {
			operation: "email-sending",
			component: "email-service",
			duration,
			metadata: { success, successRate: (success / emails) * 100 },
		});
	},

	recordScraperRun(
		scraper: string,
		jobsFound: number,
		duration: number,
		errors: number = 0,
	): void {
		logger.metric("scraper.jobs.found", jobsFound, "count", {
			operation: "scraper-execution",
			component: scraper,
			duration,
			metadata: { errors, successRate: errors === 0 ? 100 : 0 },
		});
	},

	recordAPICall(
		endpoint: string,
		method: string,
		statusCode: number,
		duration: number,
	): void {
		logger.metric("api.calls", 1, "count", {
			operation: "api-call",
			component: "api",
			duration,
			metadata: { endpoint, method, statusCode, success: statusCode < 400 },
		});

		const monitor = PerformanceMonitor.getInstance();
		monitor.recordMetric("api.latency", duration);
		const endpointKey = endpoint.replace(/\s+/g, "").replace(/[:]/g, "_");
		monitor.recordMetric(`api.latency:${endpointKey}`, duration);
	},
};

// Context management for request tracking
export class RequestContext {
	private static context: Map<string, LogContext> = new Map();

	static set(requestId: string, context: LogContext): void {
		RequestContext.context.set(requestId, context);
	}

	static get(requestId: string): LogContext | undefined {
		return RequestContext.context.get(requestId);
	}

	static update(requestId: string, updates: Partial<LogContext>): void {
		const existing = RequestContext.context.get(requestId) || {};
		RequestContext.context.set(requestId, { ...existing, ...updates });
	}

	static clear(requestId: string): void {
		RequestContext.context.delete(requestId);
	}

	static cleanup(): void {
		// Clean up old contexts (older than 1 hour)
		const oneHourAgo = Date.now() - 60 * 60 * 1000;
		for (const [requestId, context] of RequestContext.context.entries()) {
			if (
				context.metadata?.timestamp &&
				context.metadata.timestamp < oneHourAgo
			) {
				RequestContext.context.delete(requestId);
			}
		}
	}
}

// Initialize monitoring when module is imported
if (!isTest) {
	initializeMonitoring();
}

// Export monitoring utilities
export const performanceMonitor = PerformanceMonitor.getInstance();
