/**
 * AI Performance Monitoring & Alerting System
 * Monitors AI quality, failures, and performance degradation
 */

import { apiLogger } from "@/lib/api-logger";

interface AIMetrics {
	timestamp: string;
	requestCount: number;
	errorCount: number;
	rateLimitHits: number;
	averageLatency: number;
	averageTokens: number;
	averageCost: number;
	qualityScore: number;
	alertsTriggered: string[];
}

interface AIQualityThresholds {
	maxErrorRate: number; // 0.05 = 5% errors
	maxRateLimitRate: number; // 0.02 = 2% rate limits
	maxLatencyMs: number; // 15000 = 15 seconds
	minQualityScore: number; // 0.7 = 70% quality
	maxCostPerRequest: number; // $0.01 per request
}

export class AIMonitor {
	private metrics: AIMetrics[] = [];
	private thresholds: AIQualityThresholds;
	private alertCooldowns = new Map<string, number>();

	constructor(thresholds?: Partial<AIQualityThresholds>) {
		this.thresholds = {
			maxErrorRate: 0.05,
			maxRateLimitRate: 0.02,
			maxLatencyMs: 15000,
			minQualityScore: 0.7,
			maxCostPerRequest: 0.01,
			...thresholds
		};
	}

	/**
	 * Record AI request metrics
	 */
	recordRequest(
		_model: string,
		latencyMs: number,
		tokens: number,
		cost: number,
		success: boolean,
		rateLimited: boolean = false,
		qualityScore?: number
	): void {
		const currentMetrics = this.getCurrentMetrics();

		currentMetrics.requestCount++;
		currentMetrics.averageLatency =
			(currentMetrics.averageLatency * (currentMetrics.requestCount - 1) + latencyMs) / currentMetrics.requestCount;
		currentMetrics.averageTokens =
			(currentMetrics.averageTokens * (currentMetrics.requestCount - 1) + tokens) / currentMetrics.requestCount;
		currentMetrics.averageCost =
			(currentMetrics.averageCost * (currentMetrics.requestCount - 1) + cost) / currentMetrics.requestCount;

		if (!success) {
			currentMetrics.errorCount++;
		}

		if (rateLimited) {
			currentMetrics.rateLimitHits++;
		}

		if (qualityScore !== undefined) {
			currentMetrics.qualityScore = qualityScore;
		}

		// Check for alerts
		this.checkForAlerts(currentMetrics);
	}

	/**
	 * Get current metrics window
	 */
	private getCurrentMetrics(): AIMetrics {
		const now = new Date().toISOString();
		const currentWindow = this.metrics[this.metrics.length - 1];

		// Start new 5-minute window if needed
		if (!currentWindow || Date.now() - new Date(currentWindow.timestamp).getTime() > 5 * 60 * 1000) {
			const newMetrics: AIMetrics = {
				timestamp: now,
				requestCount: 0,
				errorCount: 0,
				rateLimitHits: 0,
				averageLatency: 0,
				averageTokens: 0,
				averageCost: 0,
				qualityScore: 0,
				alertsTriggered: []
			};
			this.metrics.push(newMetrics);
			return newMetrics;
		}

		return currentWindow;
	}

	/**
	 * Check for alert conditions
	 */
	private checkForAlerts(metrics: AIMetrics): void {
		const alerts: string[] = [];
		const errorRate = metrics.errorCount / metrics.requestCount;
		const rateLimitRate = metrics.rateLimitHits / metrics.requestCount;

		// Error rate alert
		if (errorRate > this.thresholds.maxErrorRate) {
			alerts.push(`High error rate: ${(errorRate * 100).toFixed(1)}% (threshold: ${(this.thresholds.maxErrorRate * 100).toFixed(1)}%)`);
		}

		// Rate limit alert
		if (rateLimitRate > this.thresholds.maxRateLimitRate) {
			alerts.push(`High rate limit rate: ${(rateLimitRate * 100).toFixed(1)}% (threshold: ${(this.thresholds.maxRateLimitRate * 100).toFixed(1)}%)`);
		}

		// Latency alert
		if (metrics.averageLatency > this.thresholds.maxLatencyMs) {
			alerts.push(`High latency: ${metrics.averageLatency.toFixed(0)}ms (threshold: ${this.thresholds.maxLatencyMs}ms)`);
		}

		// Quality alert
		if (metrics.qualityScore > 0 && metrics.qualityScore < this.thresholds.minQualityScore) {
			alerts.push(`Low quality score: ${(metrics.qualityScore * 100).toFixed(1)}% (threshold: ${(this.thresholds.minQualityScore * 100).toFixed(1)}%)`);
		}

		// Cost alert
		if (metrics.averageCost > this.thresholds.maxCostPerRequest) {
			alerts.push(`High cost per request: $${metrics.averageCost.toFixed(4)} (threshold: $${this.thresholds.maxCostPerRequest.toFixed(4)})`);
		}

		// Trigger alerts (with cooldown to prevent spam)
		for (const alert of alerts) {
			this.triggerAlert(alert, metrics);
		}
	}

	/**
	 * Trigger an alert with cooldown
	 */
	private triggerAlert(alertMessage: string, metrics: AIMetrics): void {
		const alertKey = alertMessage.split(':')[0]; // Use alert type as key
		const now = Date.now();
		const lastAlert = this.alertCooldowns.get(alertKey) || 0;

		// 5-minute cooldown per alert type
		if (now - lastAlert < 5 * 60 * 1000) {
			return;
		}

		this.alertCooldowns.set(alertKey, now);
		metrics.alertsTriggered.push(alertMessage);

		// Log alert
		apiLogger.error(`AI SYSTEM ALERT: ${alertMessage} - Requests: ${metrics.requestCount}, Errors: ${metrics.errorCount}, Latency: ${Math.round(metrics.averageLatency)}ms`);

		// In production, this would trigger external alerts (Slack, PagerDuty, etc.)
		console.error(`🚨 AI ALERT: ${alertMessage}`);
	}

	/**
	 * Get current health status
	 */
	getHealthStatus(): {
		status: "healthy" | "warning" | "critical";
		message: string;
		metrics: AIMetrics | null;
	} {
		const currentMetrics = this.getCurrentMetrics();

		if (currentMetrics.requestCount === 0) {
			return {
				status: "healthy",
				message: "No AI requests in current window",
				metrics: null
			};
		}

		const errorRate = currentMetrics.errorCount / currentMetrics.requestCount;
		const rateLimitRate = currentMetrics.rateLimitHits / currentMetrics.requestCount;

		if (errorRate > 0.1 || rateLimitRate > 0.05) {
			return {
				status: "critical",
				message: `Critical AI issues: ${Math.round(errorRate * 100)}% errors, ${Math.round(rateLimitRate * 100)}% rate limits`,
				metrics: currentMetrics
			};
		}

		if (errorRate > 0.05 || currentMetrics.averageLatency > 5000) {
			return {
				status: "warning",
				message: `AI performance degraded: ${Math.round(errorRate * 100)}% errors, ${Math.round(currentMetrics.averageLatency)}ms latency`,
				metrics: currentMetrics
			};
		}

		return {
			status: "healthy",
			message: `AI performing well: ${currentMetrics.requestCount} requests, ${(errorRate * 100).toFixed(1)}% error rate`,
			metrics: currentMetrics
		};
	}

	/**
	 * Get historical metrics
	 */
	getHistoricalMetrics(hours: number = 24): AIMetrics[] {
		const cutoff = Date.now() - (hours * 60 * 60 * 1000);
		return this.metrics.filter(m => new Date(m.timestamp).getTime() > cutoff);
	}

	/**
	 * Calculate quality score from match results
	 */
	calculateQualityScore(matches: any[]): number {
		if (!matches || matches.length === 0) return 0;

		let totalScore = 0;
		let validMatches = 0;

		for (const match of matches) {
			if (match.match_score && match.match_reason) {
				totalScore += match.match_score;

				// Bonus for detailed reasons
				const reasonLength = match.match_reason?.length || 0;
				if (reasonLength > 50) {
					totalScore += 5; // Quality bonus
				}

				validMatches++;
			}
		}

		return validMatches > 0 ? (totalScore / validMatches) / 100 : 0;
	}
}

// Singleton instance
export const aiMonitor = new AIMonitor();
