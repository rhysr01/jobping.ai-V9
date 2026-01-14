/**
 * Performance Metrics Tracker for Matching Strategies
 *
 * Tracks and compares performance metrics between free and premium matching
 * Provides insights into matching quality, speed, and success rates
 */

import { apiLogger } from "../../lib/api-logger";

export interface MatchingMetricsData {
  tier: "free" | "premium_pending";
  duration: number;
  matchCount: number;
  jobsProcessed: number;
  aiRequests?: number;
  fallbackUsed?: boolean;
  confidence?: "high" | "medium" | "low";
  method: string;
  timestamp: Date;
}

export interface PerformanceStats {
  averageDuration: number;
  averageMatches: number;
  successRate: number;
  aiUsageRate: number;
  fallbackRate: number;
  totalRequests: number;
}

export interface TierComparison {
  free: PerformanceStats;
  premium: PerformanceStats;
  ratio: {
    duration: number; // premium/free
    matches: number; // premium/free
    quality: number; // premium/free quality score
  };
}

/**
 * Tracks matching performance metrics with tier comparison
 */
export class MatchingMetrics {
  private static metrics: MatchingMetricsData[] = [];
  private static readonly MAX_METRICS_HISTORY = 1000;

  /**
   * Records a matching operation's performance data
   */
  static recordMetrics(data: Omit<MatchingMetricsData, "timestamp">): void {
    const metricsData: MatchingMetricsData = {
      ...data,
      timestamp: new Date()
    };

    this.metrics.push(metricsData);

    // Maintain bounded history
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_HISTORY);
    }

    // Log significant events
    this.logSignificantMetrics(metricsData);
  }

  /**
   * Gets performance statistics for a specific tier
   */
  static getTierStats(tier: "free" | "premium_pending"): PerformanceStats {
    const tierMetrics = this.metrics.filter(m => m.tier === tier);

    if (tierMetrics.length === 0) {
      return {
        averageDuration: 0,
        averageMatches: 0,
        successRate: 0,
        aiUsageRate: 0,
        fallbackRate: 0,
        totalRequests: 0
      };
    }

    const totalRequests = tierMetrics.length;
    const successfulRequests = tierMetrics.filter(m => m.matchCount > 0).length;
    const aiRequests = tierMetrics.filter(m => m.aiRequests && m.aiRequests > 0).length;
    const fallbackRequests = tierMetrics.filter(m => m.fallbackUsed).length;

    return {
      averageDuration: tierMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests,
      averageMatches: tierMetrics.reduce((sum, m) => sum + m.matchCount, 0) / totalRequests,
      successRate: successfulRequests / totalRequests,
      aiUsageRate: aiRequests / totalRequests,
      fallbackRate: fallbackRequests / totalRequests,
      totalRequests
    };
  }

  /**
   * Compares performance between free and premium tiers
   */
  static getTierComparison(): TierComparison {
    const freeStats = this.getTierStats("free");
    const premiumStats = this.getTierStats("premium_pending");

    const ratio = {
      duration: premiumStats.averageDuration > 0 ? freeStats.averageDuration / premiumStats.averageDuration : 0,
      matches: premiumStats.averageMatches > 0 ? premiumStats.averageMatches / freeStats.averageMatches : 0,
      quality: this.calculateQualityRatio(freeStats, premiumStats)
    };

    return {
      free: freeStats,
      premium: premiumStats,
      ratio
    };
  }

  /**
   * Calculates quality ratio based on multiple factors
   */
  private static calculateQualityRatio(free: PerformanceStats, premium: PerformanceStats): number {
    if (premium.totalRequests === 0) return 0;

    // Quality factors: success rate, AI usage, inverse of fallback rate
    const freeQuality = free.successRate * 0.4 + free.aiUsageRate * 0.4 + (1 - free.fallbackRate) * 0.2;
    const premiumQuality = premium.successRate * 0.4 + premium.aiUsageRate * 0.4 + (1 - premium.fallbackRate) * 0.2;

    return premiumQuality / freeQuality;
  }

  /**
   * Gets recent metrics for monitoring dashboard
   */
  static getRecentMetrics(hours: number = 24): MatchingMetricsData[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Analyzes matching performance trends
   */
  static analyzeTrends(): {
    performance: "improving" | "stable" | "degrading";
    quality: "improving" | "stable" | "degrading";
    insights: string[];
  } {
    const recent = this.getRecentMetrics(24);
    const older = this.getRecentMetrics(168); // Last 7 days

    const insights: string[] = [];

    // Performance trend (duration)
    const recentAvgDuration = recent.reduce((sum, m) => sum + m.duration, 0) / recent.length;
    const olderAvgDuration = older.reduce((sum, m) => sum + m.duration, 0) / older.length;

    let performance: "improving" | "stable" | "degrading" = "stable";
    if (recentAvgDuration < olderAvgDuration * 0.9) {
      performance = "improving";
      insights.push("Matching speed has improved by >10%");
    } else if (recentAvgDuration > olderAvgDuration * 1.1) {
      performance = "degrading";
      insights.push("Matching speed has slowed by >10%");
    }

    // Quality trend (matches and success rate)
    const recentAvgMatches = recent.reduce((sum, m) => sum + m.matchCount, 0) / recent.length;
    const olderAvgMatches = older.reduce((sum, m) => sum + m.matchCount, 0) / older.length;

    let quality: "improving" | "stable" | "degrading" = "stable";
    if (recentAvgMatches > olderAvgMatches * 1.05) {
      quality = "improving";
      insights.push("Average matches per request has increased");
    } else if (recentAvgMatches < olderAvgMatches * 0.95) {
      quality = "degrading";
      insights.push("Average matches per request has decreased");
    }

    // Additional insights
    const fallbackRate = recent.filter(m => m.fallbackUsed).length / recent.length;
    if (fallbackRate > 0.1) {
      insights.push(`High fallback rate: ${(fallbackRate * 100).toFixed(1)}%`);
    }

    const lowConfidenceRate = recent.filter(m => m.confidence === "low").length / recent.length;
    if (lowConfidenceRate > 0.2) {
      insights.push(`High low-confidence rate: ${(lowConfidenceRate * 100).toFixed(1)}%`);
    }

    return { performance, quality, insights };
  }

  /**
   * Logs significant metrics events
   */
  private static logSignificantMetrics(data: MatchingMetricsData): void {
    // Log slow requests (>5 seconds)
    if (data.duration > 5000) {
      apiLogger.warn("Slow matching request", {
        tier: data.tier,
        duration: data.duration,
        matchCount: data.matchCount,
        method: data.method
      });
    }

    // Log zero matches
    if (data.matchCount === 0) {
      apiLogger.warn("Zero matches returned", {
        tier: data.tier,
        jobsProcessed: data.jobsProcessed,
        method: data.method,
        fallbackUsed: data.fallbackUsed
      });
    }

    // Log high match counts (potential quality issues)
    if (data.matchCount > 20) {
      apiLogger.info("High match count", {
        tier: data.tier,
        matchCount: data.matchCount,
        method: data.method
      });
    }

    // Log fallback usage
    if (data.fallbackUsed) {
      apiLogger.info("Fallback matching used", {
        tier: data.tier,
        method: data.method,
        confidence: data.confidence
      });
    }
  }

  /**
   * Exports metrics for external analysis
   */
  static exportMetrics(): {
    summary: TierComparison;
    recentActivity: MatchingMetricsData[];
    trends: ReturnType<typeof MatchingMetrics.analyzeTrends>;
  } {
    return {
      summary: this.getTierComparison(),
      recentActivity: this.getRecentMetrics(24),
      trends: this.analyzeTrends()
    };
  }

  /**
   * Clears all metrics (for testing)
   */
  static clearMetrics(): void {
    this.metrics = [];
  }
}