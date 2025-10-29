/**
 * ENHANCED MONITORING
 * Integrates with existing Sentry setup + adds lightweight metrics
 */

import * as Sentry from '@sentry/nextjs';

// ============================================
// METRICS COLLECTION (Lightweight)
// ============================================

interface MetricData {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
}

class SimpleMetricsCollector {
  private metrics: MetricData[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics

  increment(name: string, value: number = 1, tags: Record<string, string> = {}): void {
    this.addMetric({ name, value, timestamp: Date.now(), tags, type: 'counter' });
  }

  gauge(name: string, value: number, tags: Record<string, string> = {}): void {
    this.addMetric({ name, value, timestamp: Date.now(), tags, type: 'gauge' });
  }

  histogram(name: string, value: number, tags: Record<string, string> = {}): void {
    this.addMetric({ name, value, timestamp: Date.now(), tags, type: 'histogram' });
  }

  private addMetric(metric: MetricData & { type: string }): void {
    this.metrics.push(metric);
    
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetrics(timeRange?: { start: number; end: number }): MetricData[] {
    if (!timeRange) return [...this.metrics];
    
    return this.metrics.filter(m => 
      m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );
  }

  getSummary(name: string, timeRange?: { start: number; end: number }): {
    count: number;
    sum: number;
    avg: number;
  } {
    const metrics = this.getMetrics(timeRange).filter(m => m.name === name);
    
    if (metrics.length === 0) {
      return { count: 0, sum: 0, avg: 0 };
    }

    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return {
      count: metrics.length,
      sum,
      avg: sum / metrics.length
    };
  }

  clear(): void {
    this.metrics = [];
  }
}

// ============================================
// ENHANCED LOGGER
// ============================================

class EnhancedLogger {
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';

  constructor(logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    this.logLevel = logLevel;
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context: Record<string, any> = {}): void {
    if (!this.shouldLog(level)) return;

    const logData = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        environment: process.env.NODE_ENV || 'development',
        service: 'jobping-api'
      }
    };

    // Send to Sentry for error/warn levels
    if (level === 'error' || level === 'warn') {
      Sentry.addBreadcrumb({
        message,
        level: level as any,
        data: context
      });
    }

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'error' ? 'error' : 
                           level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[${level.toUpperCase()}] ${message}`, context);
    }
  }

  debug(message: string, context: Record<string, any> = {}): void {
    this.log('debug', message, context);
  }

  info(message: string, context: Record<string, any> = {}): void {
    this.log('info', message, context);
  }

  warn(message: string, context: Record<string, any> = {}): void {
    this.log('warn', message, context);
  }

  error(message: string, context: Record<string, any> = {}): void {
    this.log('error', message, context);
  }
}

// ============================================
// HEALTH CHECKER
// ============================================

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  timestamp: number;
  duration: number;
}

class HealthChecker {
  private checks: Array<{
    name: string;
    check: () => Promise<{ status: HealthCheck['status']; message: string }>;
    interval: number;
    lastRun?: number;
    lastResult?: HealthCheck;
  }> = [];

  addCheck(
    name: string,
    check: () => Promise<{ status: HealthCheck['status']; message: string }>,
    interval: number = 30000
  ): void {
    this.checks.push({ name, check, interval });
  }

  async runCheck(check: typeof this.checks[0]): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const result = await Promise.race([
        check.check(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 10000)
        )
      ]);

      const duration = Date.now() - startTime;
      const healthCheck: HealthCheck = {
        name: check.name,
        status: result.status,
        message: result.message,
        timestamp: Date.now(),
        duration
      };

      check.lastRun = Date.now();
      check.lastResult = healthCheck;
      
      return healthCheck;
    } catch (error) {
      const duration = Date.now() - startTime;
      const healthCheck: HealthCheck = {
        name: check.name,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        duration
      };

      check.lastRun = Date.now();
      check.lastResult = healthCheck;
      
      return healthCheck;
    }
  }

  async runAllChecks(): Promise<HealthCheck[]> {
    const results = await Promise.allSettled(
      this.checks.map(check => this.runCheck(check))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<HealthCheck> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  getOverallHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: HealthCheck[];
    summary: { total: number; healthy: number; degraded: number; unhealthy: number };
  } {
    const recentChecks = this.checks
      .map(c => c.lastResult)
      .filter((r): r is HealthCheck => r !== undefined)
      .filter(r => Date.now() - r.timestamp < 300000); // Last 5 minutes

    const summary = recentChecks.reduce(
      (acc, check) => {
        acc.total++;
        acc[check.status]++;
        return acc;
      },
      { total: 0, healthy: 0, degraded: 0, unhealthy: 0 }
    );

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (summary.unhealthy > 0) {
      status = 'unhealthy';
    } else if (summary.degraded > 0) {
      status = 'degraded';
    }

    return { status, checks: recentChecks, summary };
  }
}

// ============================================
// ENHANCED MONITORING MANAGER
// ============================================

export class EnhancedMonitoringManager {
  private metrics: SimpleMetricsCollector;
  private logger: EnhancedLogger;
  private healthChecker: HealthChecker;

  constructor() {
    this.metrics = new SimpleMetricsCollector();
    this.logger = new EnhancedLogger(
      (process.env.LOG_LEVEL as any) || 'info'
    );
    this.healthChecker = new HealthChecker();
    
    this.setupDefaultHealthChecks();
  }

  private setupDefaultHealthChecks(): void {
    // Database health check
    this.healthChecker.addCheck('database', async () => {
      try {
        const { getSupabaseClient } = await import('@/Utils/supabase');
        const supabase = getSupabaseClient();
        const { error } = await supabase.from('users').select('count').limit(1);
        
        if (error) {
          return { status: 'unhealthy', message: 'Database connection failed' };
        }
        
        return { status: 'healthy', message: 'Database connection OK' };
      } catch (error) {
        return { 
          status: 'unhealthy', 
          message: error instanceof Error ? error.message : 'Unknown database error' 
        };
      }
    });

    // Environment health check
    this.healthChecker.addCheck('environment', async () => {
      const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPEN_API_KEY', 'RESEND_API_KEY'];
      const missing = requiredVars.filter(varName => !process.env[varName]);
      
      if (missing.length > 0) {
        return { 
          status: 'unhealthy', 
          message: `Missing environment variables: ${missing.join(', ')}` 
        };
      }
      
      return { status: 'healthy', message: 'All required environment variables present' };
    });

    // Memory health check
    this.healthChecker.addCheck('memory', async () => {
      const usage = process.memoryUsage();
      const heapUsedMB = usage.heapUsed / 1024 / 1024;
      const heapTotalMB = usage.heapTotal / 1024 / 1024;
      const usagePercent = (heapUsedMB / heapTotalMB) * 100;

      if (usagePercent > 90) {
        return { 
          status: 'unhealthy', 
          message: `Memory usage critical: ${usagePercent.toFixed(1)}%` 
        };
      } else if (usagePercent > 75) {
        return { 
          status: 'degraded', 
          message: `Memory usage high: ${usagePercent.toFixed(1)}%` 
        };
      }

      return { 
        status: 'healthy', 
        message: `Memory usage normal: ${usagePercent.toFixed(1)}%` 
      };
    });
  }

  // Metrics methods
  incrementCounter(name: string, value: number = 1, tags: Record<string, string> = {}): void {
    this.metrics.increment(name, value, tags);
  }

  setGauge(name: string, value: number, tags: Record<string, string> = {}): void {
    this.metrics.gauge(name, value, tags);
  }

  recordHistogram(name: string, value: number, tags: Record<string, string> = {}): void {
    this.metrics.histogram(name, value, tags);
  }

  // Logging methods
  debug(message: string, context: Record<string, any> = {}): void {
    this.logger.debug(message, context);
  }

  info(message: string, context: Record<string, any> = {}): void {
    this.logger.info(message, context);
  }

  warn(message: string, context: Record<string, any> = {}): void {
    this.logger.warn(message, context);
  }

  error(message: string, context: Record<string, any> = {}): void {
    this.logger.error(message, context);
  }

  // Health check methods
  async runHealthChecks(): Promise<HealthCheck[]> {
    return this.healthChecker.runAllChecks();
  }

  getHealthStatus() {
    return this.healthChecker.getOverallHealth();
  }

  // Dashboard data
  getDashboardData() {
    const health = this.getHealthStatus();
    const recentMetrics = this.metrics.getMetrics({
      start: Date.now() - 300000, // Last 5 minutes
      end: Date.now()
    });

    return {
      timestamp: new Date().toISOString(),
      health,
      metrics: {
        total: recentMetrics.length,
        byType: recentMetrics.reduce((acc, m) => {
          acc[m.name] = (acc[m.name] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
        platform: process.platform
      }
    };
  }

  clear(): void {
    this.metrics.clear();
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let _monitoringManager: EnhancedMonitoringManager | null = null;

export function getEnhancedMonitoringManager(): EnhancedMonitoringManager {
  if (!_monitoringManager) {
    _monitoringManager = new EnhancedMonitoringManager();
  }
  return _monitoringManager;
}

export function resetMonitoringManager(): void {
  _monitoringManager = null;
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export const monitor = getEnhancedMonitoringManager();

export function trackAPICall(endpoint: string, method: string, duration: number, statusCode: number): void {
  monitor.incrementCounter('api.calls', 1, { endpoint, method, status: statusCode.toString() });
  monitor.recordHistogram('api.duration', duration, { endpoint, method });
  
  if (statusCode >= 400) {
    monitor.incrementCounter('api.errors', 1, { endpoint, method, status: statusCode.toString() });
  }
}

export function trackDatabaseQuery(table: string, operation: string, duration: number, success: boolean): void {
  monitor.incrementCounter('database.queries', 1, { table, operation, success: success.toString() });
  monitor.recordHistogram('database.duration', duration, { table, operation });
  
  if (!success) {
    monitor.incrementCounter('database.errors', 1, { table, operation });
  }
}

export function trackEmailSent(type: string, success: boolean, duration?: number): void {
  monitor.incrementCounter('email.sent', 1, { type, success: success.toString() });
  
  if (duration) {
    monitor.recordHistogram('email.duration', duration, { type });
  }
  
  if (!success) {
    monitor.incrementCounter('email.errors', 1, { type });
  }
}
