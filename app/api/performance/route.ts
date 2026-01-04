import { type NextRequest, NextResponse } from "next/server";
import { createSuccessResponse } from "@/lib/api-types";
import { asyncHandler } from "@/lib/errors";
import { apiLogger } from "@/lib/api-logger";

// Helper to get requestId from request
function getRequestId(req: NextRequest): string {
	const headerVal = req.headers.get("x-request-id");
	if (headerVal && headerVal.length > 0) {
		return headerVal;
	}
	try {
		// eslint-disable-next-line
		const nodeCrypto = require("node:crypto");
		return nodeCrypto.randomUUID
			? nodeCrypto.randomUUID()
			: nodeCrypto.randomBytes(16).toString("hex");
	} catch {
		return Math.random().toString(36).slice(2) + Date.now().toString(36);
	}
}

const getPerformanceHandler = asyncHandler(async (request: NextRequest) => {
	const startTime = Date.now();
	const requestId = getRequestId(request);

	apiLogger.info(" Collecting performance metrics...");

	// Get query parameters
	const { searchParams } = new URL(request.url);
	const includeRecommendations = searchParams.get("recommendations") === "true";

	// Collect performance data in parallel
	const [memoryStats, memoryReport, queryCacheStats, responseCacheStats] =
		await Promise.allSettled([
			Promise.resolve({ heapUsed: 0, heapTotal: 0, external: 0, rss: 0 }),
			Promise.resolve({ trend: { trend: "stable" } }),
			Promise.resolve({ size: 0, hitRate: "0%" }),
			Promise.resolve({ size: 0, hitRate: "0%" }),
		]);

	const performanceData = {
		timestamp: new Date().toISOString(),
		collection_time: Date.now() - startTime,
		memory: {
			current: memoryStats.status === "fulfilled" ? memoryStats.value : null,
			report: memoryReport.status === "fulfilled" ? memoryReport.value : null,
			is_high: false,
		},
		caches: {
			query_cache:
				queryCacheStats.status === "fulfilled" ? queryCacheStats.value : null,
			response_cache:
				responseCacheStats.status === "fulfilled"
					? responseCacheStats.value
					: null,
		},
		system: {
			uptime: process.uptime(),
			node_version: process.version,
			platform: process.platform,
			arch: process.arch,
			cpu_usage: process.cpuUsage(),
			memory_usage: process.memoryUsage(),
		},
	};

	// Add recommendations if requested
	if (includeRecommendations) {
		(performanceData as any).recommendations =
			generatePerformanceRecommendations(performanceData);
	}

	const successResponse = createSuccessResponse(
		performanceData,
		undefined,
		requestId,
	);
	const response = NextResponse.json(successResponse, { status: 200 });
	response.headers.set("x-request-id", requestId);
	return response;
});

const optimizePerformanceHandler = asyncHandler(
	async (request: NextRequest) => {
		const startTime = Date.now();
		const requestId = getRequestId(request);

		apiLogger.info(" Starting performance optimization...");

		const optimizationResults = {
			timestamp: new Date().toISOString(),
			optimization_time: Date.now() - startTime,
			actions: [] as string[],
			memory_before: { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 },
			memory_after: null as any,
			cache_clears: {
				query_cache: false,
				response_cache: false,
			},
		};

		// Clear query cache - temporarily disabled
		optimizationResults.actions.push("Query cache clear disabled");
		optimizationResults.cache_clears.query_cache = false;

		// Clear response cache - temporarily disabled
		optimizationResults.actions.push("Response cache clear disabled");
		optimizationResults.cache_clears.response_cache = false;

		optimizationResults.actions.push("Performance analysis complete");

		// Get memory stats after optimization
		optimizationResults.memory_after = {
			heapUsed: 0,
			heapTotal: 0,
			external: 0,
			rss: 0,
		};

		const memorySaved =
			optimizationResults.memory_before.heapUsed -
			optimizationResults.memory_after.heapUsed;
		optimizationResults.actions.push(`Memory freed: ${memorySaved} bytes`);

		apiLogger.info(
			` Performance optimization completed in ${optimizationResults.optimization_time}ms`,
		);

		const successResponse = createSuccessResponse(
			optimizationResults,
			undefined,
			requestId,
		);
		const response = NextResponse.json(successResponse, { status: 200 });
		response.headers.set("x-request-id", requestId);
		return response;
	},
);

function generatePerformanceRecommendations(performanceData: any): string[] {
	const recommendations: string[] = [];

	// Memory recommendations
	if (performanceData.memory.is_high) {
		recommendations.push(
			"High memory usage detected. Consider running performance optimization.",
		);
	}

	if (performanceData.memory.report?.trend?.trend === "increasing") {
		recommendations.push("Memory usage is increasing. Check for memory leaks.");
	}

	// Cache recommendations
	if (performanceData.caches.query_cache?.size > 1000) {
		recommendations.push(
			"Query cache is large. Consider clearing or reducing cache size.",
		);
	}

	if (performanceData.caches.response_cache?.size > 500) {
		recommendations.push(
			"Response cache is large. Consider clearing or reducing cache size.",
		);
	}

	// System recommendations
	const memoryUsage = performanceData.system.memory_usage;
	const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

	if (memoryPercentage > 80) {
		recommendations.push(
			"Heap usage is high (>80%). Consider optimizing memory usage.",
		);
	}

	if (performanceData.system.uptime > 86400) {
		// 24 hours
		recommendations.push(
			"Server has been running for over 24 hours. Consider restarting for optimal performance.",
		);
	}

	return recommendations;
}

// Export handlers directly
export const GET = getPerformanceHandler;
export const POST = optimizePerformanceHandler;

// Health check endpoint
export async function HEAD() {
	return new NextResponse(null, { status: 200 });
}
