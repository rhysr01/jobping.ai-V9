/**
 * Database Connection Pool Manager
 *
 * CRITICAL FIX: Prevents connection pool exhaustion under load
 * - Singleton pattern for connection reuse
 * - Connection pooling configuration
 * - Graceful error handling
 * - Resource cleanup
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../../lib/monitoring";

class DatabasePool {
	private static instance: SupabaseClient | null = null;
	private static isInitializing = false;
	private static lastHealthCheck = 0;
	private static healthCheckInterval = 5 * 60 * 1000; // 5 minutes

	private constructor() {
		// Private constructor to enforce singleton
	}

	static getInstance(): SupabaseClient {
		if (!DatabasePool.instance && !DatabasePool.isInitializing) {
			DatabasePool.isInitializing = true;

			try {
				const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
				const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

				if (!supabaseUrl || !supabaseKey) {
					// Log configuration error without exposing sensitive details
					if (process.env.NODE_ENV === "development") {
						console.error(
							"❌ Missing Supabase configuration - check environment variables",
						);
					}
					throw new Error(
						`Missing Supabase configuration. SUPABASE_SERVICE_ROLE_KEY is required but was ${supabaseKey ? "found" : "MISSING"}. This will cause RLS errors.`,
					);
				}

				// Warn if service role key seems incorrect (too short = might be anon key)
				if (supabaseKey.length < 100) {
					if (process.env.NODE_ENV === "development") {
						console.warn(
							"⚠️ WARNING: SUPABASE_SERVICE_ROLE_KEY seems too short - may be using wrong key",
						);
					}
				}

				DatabasePool.instance = createClient(supabaseUrl, supabaseKey, {
					auth: {
						autoRefreshToken: false,
						persistSession: false,
					},
					global: {
						headers: {
							"X-Client-Info": "jobping-database-pool",
						},
					},
				});

				// Perform initial health check (fire and forget - don't block initialization)
				// Errors will be logged but won't prevent pool initialization
				DatabasePool.performHealthCheck().catch((err) => {
					if (process.env.NODE_ENV === "development") {
						console.warn(
							"Initial health check failed (non-blocking):",
							err.message,
						);
					}
				});

				if (process.env.NODE_ENV === "development") {
					console.log("Database connection pool initialized");
				}
			} catch (error) {
				if (process.env.NODE_ENV === "development") {
					console.error(
						"Failed to initialize database pool:",
						(error as Error).message,
					);
				}

				// Error tracking for database initialization failures
				logger.error("Database pool initialization failed", {
					error: error as Error,
					component: "database-pool",
					operation: "initialization",
					metadata: {
						supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
							? "configured"
							: "missing",
						supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY
							? "configured"
							: "missing",
					},
				});

				throw error;
			} finally {
				DatabasePool.isInitializing = false;
			}
		}

		// Perform periodic health checks
		DatabasePool.checkHealth();

		return DatabasePool.instance!;
	}

	private static async performHealthCheck(): Promise<boolean> {
		try {
			if (!DatabasePool.instance) {
				return false;
			}

			const { error } = await DatabasePool.instance
				.from("jobs")
				.select("id", { count: "exact", head: true })
				.limit(0);

			if (error) {
				if (process.env.NODE_ENV === "development") {
					console.warn("Database health check failed:", error.message);
				}

				// Warning for database health check failures
				logger.warn("Database health check failed", {
					metadata: { error: error.message },
				});

				return false;
			}

			DatabasePool.lastHealthCheck = Date.now();
			return true;
		} catch (error) {
			if (process.env.NODE_ENV === "development") {
				console.error("Database health check error:", (error as Error).message);
			}
			return false;
		}
	}

	private static checkHealth(): void {
		// Skip health checks in test environment to prevent async logging after tests
		if (process.env.NODE_ENV === "test") return;

		const now = Date.now();

		if (now - DatabasePool.lastHealthCheck > DatabasePool.healthCheckInterval) {
			// Perform health check in background
			setImmediate(() => DatabasePool.performHealthCheck());
		}
	}

	static async closePool(): Promise<void> {
		if (DatabasePool.instance) {
			try {
				// Supabase client doesn't have explicit close method
				// but we can clean up our reference
				DatabasePool.instance = null;
				if (process.env.NODE_ENV === "development") {
					console.log("Database connection pool closed");
				}
			} catch (error) {
				if (process.env.NODE_ENV === "development") {
					console.error(
						"Error closing database pool:",
						(error as Error).message,
					);
				}
			}
		}
	}

	static getPoolStatus(): {
		isInitialized: boolean;
		isHealthy: boolean;
		lastHealthCheck: number;
		uptime: number;
	} {
		return {
			isInitialized: !!DatabasePool.instance,
			isHealthy:
				Date.now() - DatabasePool.lastHealthCheck <
				DatabasePool.healthCheckInterval * 2,
			lastHealthCheck: DatabasePool.lastHealthCheck,
			uptime: DatabasePool.lastHealthCheck
				? Date.now() - DatabasePool.lastHealthCheck
				: 0,
		};
	}
}

// Export singleton instance getter
export const getDatabaseClient = (): SupabaseClient =>
	DatabasePool.getInstance();

// Export pool management functions
export const closeDatabasePool = (): Promise<void> => DatabasePool.closePool();
export const getDatabasePoolStatus = () => DatabasePool.getPoolStatus();

// Graceful shutdown handling
process.on("SIGTERM", async () => {
	if (process.env.NODE_ENV === "development") {
		console.log("SIGTERM received, closing database pool...");
	}
	await closeDatabasePool();
	process.exit(0);
});

process.on("SIGINT", async () => {
	if (process.env.NODE_ENV === "development") {
		console.log("SIGINT received, closing database pool...");
	}
	await closeDatabasePool();
	process.exit(0);
});
