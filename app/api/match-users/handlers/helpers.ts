/**
 * Helpers Domain - Utility functions for matching orchestration
 */

/**
 * Performance monitoring utility
 */
export function trackPerformance(): {
	startTime: number;
	startMemory: number;
	getMetrics: () => {
		jobFetchTime: number;
		tierDistributionTime: number;
		aiMatchingTime: number;
		totalProcessingTime: number;
		memoryUsage: number;
		errors: number;
		totalRequests: number;
	};
} {
	const startTime = Date.now();
	const startMemory = process.memoryUsage().heapUsed;

	return {
		startTime,
		startMemory,
		getMetrics: () => ({
			jobFetchTime: 0,
			tierDistributionTime: 0,
			aiMatchingTime: 0,
			totalProcessingTime: Date.now() - startTime,
			memoryUsage: process.memoryUsage().heapUsed - startMemory,
			errors: 0,
			totalRequests: 1,
		}),
	};
}

/**
 * Check if job location matches target city
 */
export function matchesLocation(
	jobLocation: string,
	targetCity: string,
): boolean {
	const locLower = jobLocation.toLowerCase();
	const cityLower = targetCity.toLowerCase();
	return locLower.includes(cityLower) || cityLower.includes(locLower);
}

/**
 * Query with timeout wrapper
 */
export async function queryWithTimeout<T>(
	queryPromise: Promise<any>,
	timeoutMs: number = 10000,
): Promise<{
	data: T | null;
	error: { code: string; message: string; details?: unknown } | null;
}> {
	try {
		const timeoutPromise = new Promise((_, reject) =>
			setTimeout(() => reject(new Error("Query timeout")), timeoutMs),
		);

		const result = await Promise.race([queryPromise, timeoutPromise]);
		return {
			data: result as T,
			error: null,
		};
	} catch (err) {
		const error =
			err instanceof Error
				? {
						code: "QUERY_ERROR",
						message: err.message,
						details: err,
					}
				: {
						code: "UNKNOWN_ERROR",
						message: "Unknown query error",
						details: err,
					};

		return {
			data: null,
			error,
		};
	}
}
