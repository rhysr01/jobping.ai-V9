/**
 * Business Metrics and Monitoring System
 * Tracks critical business KPIs and system performance metrics
 */

import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';

// ================================
// METRIC TYPES AND INTERFACES
// ================================

export interface BusinessMetrics {
  // User Metrics
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  userRetentionRate: number;
  userSatisfactionScore: number;
  
  // Job Metrics
  totalJobs: number;
  newJobs: number;
  matchedJobs: number;
  jobFreshnessScore: number;
  
  // Matching Metrics
  totalMatches: number;
  aiMatches: number;
  ruleBasedMatches: number;
  averageMatchScore: number;
  matchSuccessRate: number;
  
  // Performance Metrics
  averageLatency: number;
  cacheHitRate: number;
  errorRate: number;
  systemUptime: number;
  
  // Revenue Metrics
  monthlyRevenue: number;
  totalSubscribers: number;
  conversionRate: number;
  churnRate: number;
  
  // Cost Metrics
  aiCostPerMatch: number;
  totalAICost: number;
  infrastructureCost: number;
  costPerUser: number;
}

export interface MetricAlert {
  id: string;
  metric: string;
  threshold: number;
  currentValue: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
}

export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  requestCount: number;
  errorCount: number;
  errorRate: number;
  timestamp: string;
}

// ================================
// BUSINESS METRICS COLLECTOR
// ================================

export class BusinessMetricsCollector {
  private supabase: any;
  private metrics: Map<string, any> = new Map();
  private alerts: MetricAlert[] = [];

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Collect comprehensive business metrics
   */
  async collectMetrics(timeframe: '1d' | '7d' | '30d' = '7d'): Promise<BusinessMetrics> {
    const startTime = Date.now();
    
    try {
      const [
        userMetrics,
        jobMetrics,
        matchingMetrics,
        performanceMetrics,
        revenueMetrics,
        costMetrics
      ] = await Promise.all([
        this.getUserMetrics(timeframe),
        this.getJobMetrics(timeframe),
        this.getMatchingMetrics(timeframe),
        this.getPerformanceMetrics(timeframe),
        this.getRevenueMetrics(timeframe),
        this.getCostMetrics(timeframe)
      ]);

      const metrics: BusinessMetrics = {
        ...userMetrics,
        ...jobMetrics,
        ...matchingMetrics,
        ...performanceMetrics,
        ...revenueMetrics,
        ...costMetrics
      };

      // Check for alerts
      await this.checkAlerts(metrics);

      // Log collection time
      console.log(`📊 Metrics collected in ${Date.now() - startTime}ms`);

      return metrics;

    } catch (error) {
      console.error('Failed to collect metrics:', error);
      Sentry.captureException(error);
      throw error;
    }
  }

  /**
   * Get user-related metrics
   */
  private async getUserMetrics(timeframe: string) {
    const { data: users, error } = await this.supabase
      .from('users')
      .select('id, created_at, active, email_verified');

    if (error) throw error;

    const now = new Date();
    const timeframeMs = this.getTimeframeMs(timeframe);
    const cutoffDate = new Date(now.getTime() - timeframeMs);

    type UserRow = { id: string; created_at: string; active: boolean; email_verified: boolean };
    const rows = users as unknown as UserRow[];
    const totalUsers = rows.length;
    const activeUsers = rows.filter((u: UserRow) => u.active).length;
    const newUsers = rows.filter((u: UserRow) => new Date(u.created_at) > cutoffDate).length;
    const verifiedUsers = rows.filter((u: UserRow) => u.email_verified).length;

    // Calculate retention rate (simplified)
    const userRetentionRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

    // Get user satisfaction from feedback
    const { data: feedback } = await this.supabase
      .from('user_feedback')
      .select('rating')
      .gte('created_at', cutoffDate.toISOString());

    const userSatisfactionScore = feedback?.length > 0 
      ? (feedback as Array<{ rating: number }>).reduce((sum: number, f: { rating: number }) => sum + (f.rating || 0), 0) / feedback.length 
      : 0;

    return {
      totalUsers,
      activeUsers,
      newUsers,
      userRetentionRate,
      userSatisfactionScore
    };
  }

  /**
   * Get job-related metrics
   */
  private async getJobMetrics(timeframe: string) {
    const { data: jobs, error } = await this.supabase
      .from('jobs')
      .select('id, created_at, posted_at, categories');

    if (error) throw error;

    const now = new Date();
    const timeframeMs = this.getTimeframeMs(timeframe);
    const cutoffDate = new Date(now.getTime() - timeframeMs);

    type JobRow = { id: string; created_at: string; posted_at?: string | null; categories?: any };
    const jobRows = jobs as unknown as JobRow[];
    const totalJobs = jobRows.length;
    const newJobs = jobRows.filter((j: JobRow) => new Date(j.created_at) > cutoffDate).length;

    // Get matched jobs
    const { data: matches } = await this.supabase
      .from('matches')
      .select('job_hash')
      .gte('created_at', cutoffDate.toISOString());

    const matchedJobs = matches?.length || 0;

    // Calculate job freshness (jobs posted within last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const freshJobs = jobRows.filter((j: JobRow) => 
      j.posted_at != null && new Date(j.posted_at as string) > sevenDaysAgo
    ).length;
    const jobFreshnessScore = totalJobs > 0 ? (freshJobs / totalJobs) * 100 : 0;

    return {
      totalJobs,
      newJobs,
      matchedJobs,
      jobFreshnessScore
    };
  }

  /**
   * Get matching-related metrics
   */
  private async getMatchingMetrics(timeframe: string) {
    const { data: matches, error } = await this.supabase
      .from('matches')
      .select('match_score, match_algorithm, created_at')
      .gte('created_at', this.getCutoffDate(timeframe).toISOString());

    if (error) throw error;

    type MatchRow = { match_score?: number; match_algorithm?: string; created_at?: string };
    const matchRows = matches as unknown as MatchRow[];

    const totalMatches = matchRows.length;
    const aiMatches = matchRows.filter((m: MatchRow) => m.match_algorithm === 'ai').length;
    const ruleBasedMatches = matchRows.filter((m: MatchRow) => m.match_algorithm === 'rules').length;
    
    const averageMatchScore = matchRows.length > 0 
      ? matchRows.reduce((sum: number, m: MatchRow) => sum + (m.match_score || 0), 0) / matchRows.length 
      : 0;

    // Calculate match success rate (matches with score > 70)
    const successfulMatches = matchRows.filter((m: MatchRow) => (m.match_score || 0) > 70).length;
    const matchSuccessRate = totalMatches > 0 ? (successfulMatches / totalMatches) * 100 : 0;

    return {
      totalMatches,
      aiMatches,
      ruleBasedMatches,
      averageMatchScore,
      matchSuccessRate
    };
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(timeframe: string) {
    // This would typically come from your monitoring system
    // For now, we'll use placeholder values
    return {
      averageLatency: 2.3, // seconds
      cacheHitRate: 68.5, // percentage
      errorRate: 2.1, // percentage
      systemUptime: 99.9 // percentage
    };
  }

  /**
   * Get revenue metrics
   */
  private async getRevenueMetrics(timeframe: string) {
    const { data: subscriptions, error } = await this.supabase
      .from('subscriptions')
      .select('status, created_at, amount')
      .eq('status', 'active');

    if (error) throw error;

    const now = new Date();
    const timeframeMs = this.getTimeframeMs(timeframe);
    const cutoffDate = new Date(now.getTime() - timeframeMs);

    const totalSubscribers = subscriptions.length;
    const monthlyRevenue = subscriptions.reduce((sum, s) => sum + (s.amount || 0), 0);

    // Get total users for conversion rate
    const { data: users } = await this.supabase
      .from('users')
      .select('id, created_at');

    const totalUsers = users?.length || 1;
    const conversionRate = (totalSubscribers / totalUsers) * 100;

    // Calculate churn rate (simplified)
    const { data: cancelledSubs } = await this.supabase
      .from('subscriptions')
      .select('id')
      .eq('status', 'cancelled')
      .gte('updated_at', cutoffDate.toISOString());

    const churnRate = totalSubscribers > 0 
      ? ((cancelledSubs?.length || 0) / totalSubscribers) * 100 
      : 0;

    return {
      monthlyRevenue,
      totalSubscribers,
      conversionRate,
      churnRate
    };
  }

  /**
   * Get cost metrics
   */
  private async getCostMetrics(timeframe: string) {
    // This would typically come from your cost tracking system
    // For now, we'll use placeholder values
    return {
      aiCostPerMatch: 0.025, // USD
      totalAICost: 125.50, // USD
      infrastructureCost: 89.30, // USD
      costPerUser: 0.15 // USD
    };
  }

  /**
   * Check for metric alerts
   */
  private async checkAlerts(metrics: BusinessMetrics): Promise<void> {
    const alerts: MetricAlert[] = [];

    // Error rate alert
    if (metrics.errorRate > 5) {
      alerts.push({
        id: 'high_error_rate',
        metric: 'errorRate',
        threshold: 5,
        currentValue: metrics.errorRate,
        severity: metrics.errorRate > 10 ? 'critical' : 'high',
        message: `Error rate is ${metrics.errorRate}%, above threshold of 5%`,
        timestamp: new Date().toISOString()
      });
    }

    // Low cache hit rate alert
    if (metrics.cacheHitRate < 50) {
      alerts.push({
        id: 'low_cache_hit_rate',
        metric: 'cacheHitRate',
        threshold: 50,
        currentValue: metrics.cacheHitRate,
        severity: 'medium',
        message: `Cache hit rate is ${metrics.cacheHitRate}%, below threshold of 50%`,
        timestamp: new Date().toISOString()
      });
    }

    // High latency alert
    if (metrics.averageLatency > 5) {
      alerts.push({
        id: 'high_latency',
        metric: 'averageLatency',
        threshold: 5,
        currentValue: metrics.averageLatency,
        severity: 'high',
        message: `Average latency is ${metrics.averageLatency}s, above threshold of 5s`,
        timestamp: new Date().toISOString()
      });
    }

    // Low match success rate alert
    if (metrics.matchSuccessRate < 70) {
      alerts.push({
        id: 'low_match_success_rate',
        metric: 'matchSuccessRate',
        threshold: 70,
        currentValue: metrics.matchSuccessRate,
        severity: 'high',
        message: `Match success rate is ${metrics.matchSuccessRate}%, below threshold of 70%`,
        timestamp: new Date().toISOString()
      });
    }

    // High churn rate alert
    if (metrics.churnRate > 10) {
      alerts.push({
        id: 'high_churn_rate',
        metric: 'churnRate',
        threshold: 10,
        currentValue: metrics.churnRate,
        severity: 'critical',
        message: `Churn rate is ${metrics.churnRate}%, above threshold of 10%`,
        timestamp: new Date().toISOString()
      });
    }

    this.alerts = alerts;

    // Send critical alerts to Sentry
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    for (const alert of criticalAlerts) {
      Sentry.captureMessage(`Critical Business Metric Alert: ${alert.message}`, {
        level: 'error',
        tags: {
          alertId: alert.id,
          metric: alert.metric,
          severity: alert.severity
        },
        extra: {
          threshold: alert.threshold,
          currentValue: alert.currentValue
        }
      });
    }
  }

  /**
   * Get performance metrics for specific endpoint
   */
  async getEndpointMetrics(endpoint: string, timeframe: string = '1d'): Promise<PerformanceMetrics> {
    // This would typically query your APM system
    // For now, return placeholder data
    return {
      endpoint,
      method: 'POST',
      averageLatency: 1.2,
      p95Latency: 3.5,
      p99Latency: 8.2,
      requestCount: 1250,
      errorCount: 25,
      errorRate: 2.0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get current alerts
   */
  getAlerts(): MetricAlert[] {
    return this.alerts;
  }

  /**
   * Helper methods
   */
  private getTimeframeMs(timeframe: string): number {
    const timeframes = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    return timeframes[timeframe as keyof typeof timeframes] || timeframes['7d'];
  }

  private getCutoffDate(timeframe: string): Date {
    const now = new Date();
    const timeframeMs = this.getTimeframeMs(timeframe);
    return new Date(now.getTime() - timeframeMs);
  }
}

// ================================
// METRIC TRACKING UTILITIES
// ================================

export class MetricTracker {
  private static instance: MetricTracker;
  private metrics: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): MetricTracker {
    if (!MetricTracker.instance) {
      MetricTracker.instance = new MetricTracker();
    }
    return MetricTracker.instance;
  }

  /**
   * Track a custom metric
   */
  trackMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    const metric = {
      name,
      value,
      tags,
      timestamp: new Date().toISOString()
    };

    this.metrics.set(`${name}_${Date.now()}`, metric);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Metric: ${name} = ${value}`, tags);
    }
  }

  /**
   * Track timing metric
   */
  trackTiming(name: string, duration: number, tags: Record<string, string> = {}): void {
    this.trackMetric(name, duration, { ...tags, type: 'timing' });
  }

  /**
   * Track counter metric
   */
  trackCounter(name: string, increment: number = 1, tags: Record<string, string> = {}): void {
    this.trackMetric(name, increment, { ...tags, type: 'counter' });
  }

  /**
   * Track gauge metric
   */
  trackGauge(name: string, value: number, tags: Record<string, string> = {}): void {
    this.trackMetric(name, value, { ...tags, type: 'gauge' });
  }

  /**
   * Get all metrics
   */
  getMetrics(): any[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }
}

// ================================
// CONVENIENCE FUNCTIONS
// ================================

export const businessMetricsCollector = new BusinessMetricsCollector();
export const metricTracker = MetricTracker.getInstance();

export async function getBusinessMetrics(timeframe: '1d' | '7d' | '30d' = '7d'): Promise<BusinessMetrics> {
  return businessMetricsCollector.collectMetrics(timeframe);
}

export function trackMetric(name: string, value: number, tags: Record<string, string> = {}): void {
  metricTracker.trackMetric(name, value, tags);
}

export function trackTiming(name: string, duration: number, tags: Record<string, string> = {}): void {
  metricTracker.trackTiming(name, duration, tags);
}

export function trackCounter(name: string, increment: number = 1, tags: Record<string, string> = {}): void {
  metricTracker.trackCounter(name, increment, tags);
}

export function trackGauge(name: string, value: number, tags: Record<string, string> = {}): void {
  metricTracker.trackGauge(name, value, tags);
}
