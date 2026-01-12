/**
 * AI Health Check Endpoint
 * Provides detailed AI system health and performance metrics
 */

import { NextResponse } from "next/server";
import { aiMonitor } from "../../../../utils/monitoring/ai-monitor";

export async function GET() {
	try {
		const healthStatus = await aiMonitor.getHealthStatus();

		// Simplified metrics - historical data not available in simple monitor
		const totalRequests = 0;
		const totalErrors = 0;
		const totalRateLimits = 0;

		const response = {
			status: healthStatus.status,
			message: healthStatus.message,
			timestamp: new Date().toISOString(),
			metrics: {
				current: null, // Simplified monitor doesn't provide detailed metrics
				historical: {
					totalRequests,
					totalErrors,
					totalRateLimits,
					errorRate:
						totalRequests > 0
							? Math.round((totalErrors / totalRequests) * 1000) / 10
							: 0,
					rateLimitRate:
						totalRequests > 0
							? Math.round((totalRateLimits / totalRequests) * 1000) / 10
							: 0,
					timeWindows: 0, // No historical data available
				},
			},
		};

		// Return appropriate HTTP status based on health
		const statusCode =
			healthStatus.status === "unhealthy"
				? 503
				: healthStatus.status === "degraded"
					? 200
					: 200;

		return NextResponse.json(response, { status: statusCode });
	} catch (error) {
		console.error("AI health check failed:", error);
		return NextResponse.json(
			{
				status: "error",
				message: "Health check failed",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}
