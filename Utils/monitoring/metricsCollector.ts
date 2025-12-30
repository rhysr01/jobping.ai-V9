/**
 * Metrics Collection System
 * Collects and aggregates system metrics for monitoring
 */

import { createClient } from "@supabase/supabase-js";
import { getProductionRateLimiter } from "@/Utils/productionRateLimiter";

export interface SystemMetrics {
	timestamp: string;
	performance: {
		response_time: number;
		memory_usage: NodeJS.MemoryUsage;
		cpu_usage?: number;
		uptime: number;
	};
	business: {
		total_users: number;
		active_users: number;
		total_jobs: number;
		recent_jobs: number;
		total_matches: number;
		recent_matches: number;
		email_sends_today: number;
		failed_emails: number;
	};
	queue: {
		pending_jobs: number;
		processing_jobs: number;
		failed_jobs: number;
		completed_jobs_today: number;
	};
	errors: {
		api_errors_24h: number;
		database_errors_24h: number;
		email_errors_24h: number;
		queue_errors_24h: number;
	};
	rate_limiter: {
		redis_connected: boolean;
		redis_keys: number;
		memory_keys: number;
		scraper: Record<string, any>;
	};
}

export class MetricsCollector {
	private supabase: any;
	private metricsCache: Map<string, any> = new Map();
	private cacheTimeout = 5 * 60 * 1000; // 5 minutes

	constructor() {
		this.supabase = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!,
		);
	}

	async collectMetrics(): Promise<SystemMetrics> {
		const timestamp = new Date().toISOString();
		const startTime = Date.now();

		console.log(" Collecting system metrics...");

		// Collect all metrics in parallel
		const [
			performanceMetrics,
			businessMetrics,
			queueMetrics,
			errorMetrics,
			rateLimiterMetrics,
		] = await Promise.allSettled([
			this.collectPerformanceMetrics(),
			this.collectBusinessMetrics(),
			this.collectQueueMetrics(),
			this.collectErrorMetrics(),
			this.collectRateLimiterMetrics(),
		]);

		const responseTime = Date.now() - startTime;

		const metrics: SystemMetrics = {
			timestamp,
			performance: {
				response_time: responseTime,
				memory_usage: process.memoryUsage(),
				uptime: process.uptime(),
				...(performanceMetrics.status === "fulfilled"
					? performanceMetrics.value
					: {}),
			},
			business:
				businessMetrics.status === "fulfilled"
					? businessMetrics.value
					: {
							total_users: 0,
							active_users: 0,
							total_jobs: 0,
							recent_jobs: 0,
							total_matches: 0,
							recent_matches: 0,
							email_sends_today: 0,
							failed_emails: 0,
						},
			queue:
				queueMetrics.status === "fulfilled"
					? queueMetrics.value
					: {
							pending_jobs: 0,
							processing_jobs: 0,
							failed_jobs: 0,
							completed_jobs_today: 0,
						},
			errors:
				errorMetrics.status === "fulfilled"
					? errorMetrics.value
					: {
							api_errors_24h: 0,
							database_errors_24h: 0,
							email_errors_24h: 0,
							queue_errors_24h: 0,
						},
			rate_limiter:
				rateLimiterMetrics.status === "fulfilled"
					? rateLimiterMetrics.value
					: {
							redis_connected: false,
							redis_keys: 0,
							memory_keys: 0,
							scraper: {},
						},
		};

		console.log(` Metrics collected in ${responseTime}ms`);
		return metrics;
	}

	private async collectRateLimiterMetrics(): Promise<{
		redis_connected: boolean;
		redis_keys: number;
		memory_keys: number;
		scraper: Record<string, any>;
	}> {
		try {
			const limiter = getProductionRateLimiter();
			const [stats, scraperStats] = await Promise.all([
				limiter.getStats(),
				Promise.resolve(limiter.getScraperStats()),
			]);

			return {
				redis_connected: stats.redisConnected,
				redis_keys: stats.totalKeys,
				memory_keys: stats.memoryKeys,
				scraper: scraperStats,
			};
		} catch (error) {
			console.error("Error collecting rate limiter metrics:", error);
			return {
				redis_connected: false,
				redis_keys: 0,
				memory_keys: 0,
				scraper: {},
			};
		}
	}

	private async collectPerformanceMetrics(): Promise<any> {
		// Basic performance metrics
		return {
			// CPU usage would require additional libraries
			// For now, we'll focus on memory and uptime
		};
	}

	private async collectBusinessMetrics(): Promise<any> {
		const cacheKey = "business_metrics";
		const cached = this.metricsCache.get(cacheKey);

		if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
			return cached.data;
		}

		try {
			// Get user counts
			const { count: totalUsers } = await this.supabase
				.from("users")
				.select("*", { count: "exact", head: true });

			const { count: activeUsers } = await this.supabase
				.from("users")
				.select("*", { count: "exact", head: true })
				.eq("active", true);

			// Get job counts
			const { count: totalJobs } = await this.supabase
				.from("jobs")
				.select("*", { count: "exact", head: true });

			const { count: recentJobs } = await this.supabase
				.from("jobs")
				.select("*", { count: "exact", head: true })
				.gte(
					"created_at",
					new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
				);

			// Get match counts
			const { count: totalMatches } = await this.supabase
				.from("matches")
				.select("*", { count: "exact", head: true });

			const { count: recentMatches } = await this.supabase
				.from("matches")
				.select("*", { count: "exact", head: true })
				.gte(
					"matched_at",
					new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
				);

			// Get email metrics
			const { count: emailSendsToday } = await this.supabase
				.from("email_send_ledger")
				.select("*", { count: "exact", head: true })
				.gte("sent_at", new Date().toISOString().split("T")[0]);

			const { count: failedEmails } = await this.supabase
				.from("email_send_ledger")
				.select("*", { count: "exact", head: true })
				.eq("status", "failed")
				.gte(
					"sent_at",
					new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
				);

			const metrics = {
				total_users: totalUsers || 0,
				active_users: activeUsers || 0,
				total_jobs: totalJobs || 0,
				recent_jobs: recentJobs || 0,
				total_matches: totalMatches || 0,
				recent_matches: recentMatches || 0,
				email_sends_today: emailSendsToday || 0,
				failed_emails: failedEmails || 0,
			};

			// Cache the results
			this.metricsCache.set(cacheKey, {
				timestamp: Date.now(),
				data: metrics,
			});

			return metrics;
		} catch (error) {
			console.error("Error collecting business metrics:", error);
			return {
				total_users: 0,
				active_users: 0,
				total_jobs: 0,
				recent_jobs: 0,
				total_matches: 0,
				recent_matches: 0,
				email_sends_today: 0,
				failed_emails: 0,
			};
		}
	}

	private async collectQueueMetrics(): Promise<any> {
		const cacheKey = "queue_metrics";
		const cached = this.metricsCache.get(cacheKey);

		if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
			return cached.data;
		}

		try {
			// Get queue status
			const { data: queueStats } = await this.supabase
				.from("job_queue")
				.select("status")
				.gte(
					"created_at",
					new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
				);

			const pendingJobs =
				queueStats?.filter((job: any) => job.status === "pending").length || 0;
			const processingJobs =
				queueStats?.filter((job: any) => job.status === "processing").length ||
				0;
			const failedJobs =
				queueStats?.filter((job: any) => job.status === "failed").length || 0;
			const completedJobsToday =
				queueStats?.filter((job: any) => job.status === "completed").length ||
				0;

			const metrics = {
				pending_jobs: pendingJobs,
				processing_jobs: processingJobs,
				failed_jobs: failedJobs,
				completed_jobs_today: completedJobsToday,
			};

			// Cache the results
			this.metricsCache.set(cacheKey, {
				timestamp: Date.now(),
				data: metrics,
			});

			return metrics;
		} catch (error) {
			console.error("Error collecting queue metrics:", error);
			return {
				pending_jobs: 0,
				processing_jobs: 0,
				failed_jobs: 0,
				completed_jobs_today: 0,
			};
		}
	}

	private async collectErrorMetrics(): Promise<any> {
		try {
			// For now, we'll return basic error counts
			// In a real implementation, you'd query error logs or monitoring systems
			return {
				api_errors_24h: 0,
				database_errors_24h: 0,
				email_errors_24h: 0,
				queue_errors_24h: 0,
			};
		} catch (error) {
			console.error("Error collecting error metrics:", error);
			return {
				api_errors_24h: 0,
				database_errors_24h: 0,
				email_errors_24h: 0,
				queue_errors_24h: 0,
			};
		}
	}

	async getMetricsHistory(_hours: number = 24): Promise<SystemMetrics[]> {
		try {
			// In a real implementation, you'd store metrics in a time-series database
			// For now, we'll return current metrics
			const currentMetrics = await this.collectMetrics();
			return [currentMetrics];
		} catch (error) {
			console.error("Error getting metrics history:", error);
			return [];
		}
	}

	clearCache(): void {
		this.metricsCache.clear();
	}
}

// Singleton instance
export const metricsCollector = new MetricsCollector();
