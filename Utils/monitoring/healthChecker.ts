/**
 * Comprehensive Health Check System
 * Monitors all critical system components
 */

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export interface HealthCheckResult {
	status: "healthy" | "degraded" | "unhealthy";
	timestamp: string;
	duration: number;
	components: {
		database: ComponentHealth;
		email: ComponentHealth;
		queue: ComponentHealth;
		storage: ComponentHealth;
		external_apis: ComponentHealth;
	};
	metrics: {
		response_time: number;
		memory_usage: NodeJS.MemoryUsage;
		uptime: number;
	};
}

export interface ComponentHealth {
	status: "healthy" | "degraded" | "unhealthy";
	message: string;
	response_time?: number;
	last_check: string;
	details?: any;
}

export class HealthChecker {
	private supabase: any;
	private resend: any;

	constructor() {
		this.supabase = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!,
		);

		this.resend = new Resend(process.env.RESEND_API_KEY);
	}

	async performHealthCheck(): Promise<HealthCheckResult> {
		const startTime = Date.now();
		const timestamp = new Date().toISOString();

		console.log(" Starting comprehensive health check...");

		// Run all health checks in parallel
		const [
			databaseHealth,
			emailHealth,
			queueHealth,
			storageHealth,
			externalApisHealth,
		] = await Promise.allSettled([
			this.checkDatabase(),
			this.checkEmailService(),
			this.checkQueueSystem(),
			this.checkStorage(),
			this.checkExternalApis(),
		]);

		const duration = Date.now() - startTime;

		// Determine overall status
		const componentResults = {
			database: this.getResult(databaseHealth),
			email: this.getResult(emailHealth),
			queue: this.getResult(queueHealth),
			storage: this.getResult(storageHealth),
			external_apis: this.getResult(externalApisHealth),
		};

		const overallStatus = this.determineOverallStatus(componentResults);

		const result: HealthCheckResult = {
			status: overallStatus,
			timestamp,
			duration,
			components: componentResults,
			metrics: {
				response_time: duration,
				memory_usage: process.memoryUsage(),
				uptime: process.uptime(),
			},
		};

		console.log(` Health check complete: ${overallStatus} (${duration}ms)`);
		return result;
	}

	private async checkDatabase(): Promise<ComponentHealth> {
		const startTime = Date.now();

		try {
			// Test basic connectivity
			const { error } = await this.supabase
				.from("users")
				.select("count")
				.limit(1);

			if (error) {
				return {
					status: "unhealthy",
					message: `Database connection failed: ${error.message}`,
					response_time: Date.now() - startTime,
					last_check: new Date().toISOString(),
				};
			}

			// Check for recent activity
			const { data: recentJobs } = await this.supabase
				.from("jobs")
				.select("created_at")
				.gte(
					"created_at",
					new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
				)
				.limit(1);

			const hasRecentActivity = recentJobs && recentJobs.length > 0;

			return {
				status: hasRecentActivity ? "healthy" : "degraded",
				message: hasRecentActivity
					? "Database healthy with recent activity"
					: "Database connected but no recent job activity",
				response_time: Date.now() - startTime,
				last_check: new Date().toISOString(),
				details: {
					recent_activity: hasRecentActivity,
					connection_test: "passed",
				},
			};
		} catch (error) {
			return {
				status: "unhealthy",
				message: `Database check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				response_time: Date.now() - startTime,
				last_check: new Date().toISOString(),
			};
		}
	}

	private async checkEmailService(): Promise<ComponentHealth> {
		const startTime = Date.now();

		try {
			// Test Resend API key
			if (!process.env.RESEND_API_KEY) {
				return {
					status: "unhealthy",
					message: "RESEND_API_KEY not configured",
					response_time: Date.now() - startTime,
					last_check: new Date().toISOString(),
				};
			}

			// Check email send ledger for recent activity
			const { data: recentEmails, error } = await this.supabase
				.from("email_send_ledger")
				.select("sent_at, status")
				.gte(
					"sent_at",
					new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
				)
				.limit(10);

			if (error) {
				return {
					status: "degraded",
					message: `Email service check failed: ${error.message}`,
					response_time: Date.now() - startTime,
					last_check: new Date().toISOString(),
				};
			}

			const hasRecentEmails = recentEmails && recentEmails.length > 0;
			const failedEmails =
				recentEmails?.filter((email: any) => email.status === "failed")
					.length || 0;

			return {
				status: failedEmails > 0 ? "degraded" : "healthy",
				message: hasRecentEmails
					? `Email service healthy (${recentEmails.length} recent sends, ${failedEmails} failed)`
					: "Email service configured but no recent activity",
				response_time: Date.now() - startTime,
				last_check: new Date().toISOString(),
				details: {
					recent_sends: recentEmails?.length || 0,
					failed_sends: failedEmails,
					api_key_configured: true,
				},
			};
		} catch (error) {
			return {
				status: "unhealthy",
				message: `Email service check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				response_time: Date.now() - startTime,
				last_check: new Date().toISOString(),
			};
		}
	}

	private async checkQueueSystem(): Promise<ComponentHealth> {
		const startTime = Date.now();

		try {
			// Check job queue status
			const { data: queueStats, error } = await this.supabase
				.from("job_queue")
				.select("status, type")
				.gte(
					"created_at",
					new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
				);

			if (error) {
				return {
					status: "degraded",
					message: `Queue system check failed: ${error.message}`,
					response_time: Date.now() - startTime,
					last_check: new Date().toISOString(),
				};
			}

			const pendingJobs =
				queueStats?.filter((job: any) => job.status === "pending").length || 0;
			const failedJobs =
				queueStats?.filter((job: any) => job.status === "failed").length || 0;
			const processingJobs =
				queueStats?.filter((job: any) => job.status === "processing").length ||
				0;

			let status: "healthy" | "degraded" | "unhealthy" = "healthy";
			let message = "Queue system healthy";

			if (failedJobs > 10) {
				status = "unhealthy";
				message = `Queue system unhealthy: ${failedJobs} failed jobs`;
			} else if (failedJobs > 0 || pendingJobs > 50) {
				status = "degraded";
				message = `Queue system degraded: ${failedJobs} failed, ${pendingJobs} pending`;
			}

			return {
				status,
				message,
				response_time: Date.now() - startTime,
				last_check: new Date().toISOString(),
				details: {
					pending_jobs: pendingJobs,
					failed_jobs: failedJobs,
					processing_jobs: processingJobs,
					total_jobs: queueStats?.length || 0,
				},
			};
		} catch (error) {
			return {
				status: "unhealthy",
				message: `Queue system check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				response_time: Date.now() - startTime,
				last_check: new Date().toISOString(),
			};
		}
	}

	private async checkStorage(): Promise<ComponentHealth> {
		const startTime = Date.now();

		try {
			// Check Supabase storage (if configured)
			const { data, error } = await this.supabase.storage.listBuckets();

			if (error) {
				return {
					status: "degraded",
					message: `Storage check failed: ${error.message}`,
					response_time: Date.now() - startTime,
					last_check: new Date().toISOString(),
				};
			}

			return {
				status: "healthy",
				message: `Storage healthy (${data?.length || 0} buckets)`,
				response_time: Date.now() - startTime,
				last_check: new Date().toISOString(),
				details: {
					buckets_accessible: true,
					bucket_count: data?.length || 0,
				},
			};
		} catch (error) {
			return {
				status: "degraded",
				message: `Storage check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				response_time: Date.now() - startTime,
				last_check: new Date().toISOString(),
			};
		}
	}

	private async checkExternalApis(): Promise<ComponentHealth> {
		const startTime = Date.now();

		try {
			const apiChecks = [];

			// Check OpenAI API (if configured)
			if (process.env.OPENAI_API_KEY) {
				apiChecks.push(this.checkOpenAI());
			}

			// Check other external APIs
			if (process.env.ADZUNA_API_KEY) {
				apiChecks.push(this.checkAdzuna());
			}

			if (apiChecks.length === 0) {
				return {
					status: "healthy",
					message: "No external APIs configured to check",
					response_time: Date.now() - startTime,
					last_check: new Date().toISOString(),
				};
			}

			const results = await Promise.allSettled(apiChecks);
			const failures = results.filter((r) => r.status === "rejected").length;

			return {
				status:
					failures === 0
						? "healthy"
						: failures === results.length
							? "unhealthy"
							: "degraded",
				message: `${results.length - failures}/${results.length} external APIs healthy`,
				response_time: Date.now() - startTime,
				last_check: new Date().toISOString(),
				details: {
					total_apis: results.length,
					healthy_apis: results.length - failures,
					failed_apis: failures,
				},
			};
		} catch (error) {
			return {
				status: "unhealthy",
				message: `External APIs check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				response_time: Date.now() - startTime,
				last_check: new Date().toISOString(),
			};
		}
	}

	private async checkOpenAI(): Promise<void> {
		// Simple OpenAI API check
		const response = await fetch("https://api.openai.com/v1/models", {
			headers: {
				Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(`OpenAI API check failed: ${response.status}`);
		}
	}

	private async checkAdzuna(): Promise<void> {
		// Simple Adzuna API check
		const response = await fetch(
			`https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${process.env.ADZUNA_API_ID}&app_key=${process.env.ADZUNA_API_KEY}&results_per_page=1`,
		);

		if (!response.ok) {
			throw new Error(`Adzuna API check failed: ${response.status}`);
		}
	}

	private getResult(
		promiseResult: PromiseSettledResult<ComponentHealth>,
	): ComponentHealth {
		if (promiseResult.status === "fulfilled") {
			return promiseResult.value;
		} else {
			return {
				status: "unhealthy",
				message: `Health check failed: ${promiseResult.reason}`,
				last_check: new Date().toISOString(),
			};
		}
	}

	private determineOverallStatus(
		components: Record<string, ComponentHealth>,
	): "healthy" | "degraded" | "unhealthy" {
		const statuses = Object.values(components).map((c) => c.status);

		if (statuses.includes("unhealthy")) {
			return "unhealthy";
		} else if (statuses.includes("degraded")) {
			return "degraded";
		} else {
			return "healthy";
		}
	}
}

// Singleton instance
export const healthChecker = new HealthChecker();
