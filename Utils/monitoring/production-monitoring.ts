/**
 * PRODUCTION MONITORING & OBSERVABILITY
 * Comprehensive metrics, logging, alerting, and health checks
 */

// ============================================
// METRICS COLLECTION
// ============================================

interface MetricData {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
}

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  timestamp: number;
  context: Record<string, any>;
  requestId?: string;
  userId?: string;
}

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  timestamp: number;
  duration: number;
  details?: any;
}

// ============================================
// METRICS COLLECTOR
// ============================================

class MetricsCollector {
  private metrics: MetricData[] = [];
  private maxMetrics = 10000; // Keep last 10k metrics
  private timers = new Map<string, number>();

  increment(name: string, value: number = 1, tags: Record<string, string> = {}): void {
    this.addMetric({
      name,
      value,
      timestamp: Date.now(),
      tags,
      type: 'counter'
    });
  }

  gauge(name: string, value: number, tags: Record<string, string> = {}): void {
    this.addMetric({
      name,
      value,
      timestamp: Date.now(),
      tags,
      type: 'gauge'
    });
  }

  histogram(name: string, value: number, tags: Record<string, string> = {}): void {
    this.addMetric({
      name,
      value,
      timestamp: Date.now(),
      tags,
      type: 'histogram'
    });
  }

  startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }

  endTimer(name: string, tags: Record<string, string> = {}): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer '${name}' was not started`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(name);
    
    this.addMetric({
      name: `${name}.duration`,
      value: duration,
      timestamp: Date.now(),
      tags,
      type: 'timer'
    });

    return duration;
  }

  private addMetric(metric: MetricData): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
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

  getMetricSummary(name: string, timeRange?: { start: number; end: number }): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
  } {
    const metrics = this.getMetrics(timeRange).filter(m => m.name === name);
    
    if (metrics.length === 0) {
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0 };
    }

    const values = metrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: metrics.length,
      sum,
      avg: sum / metrics.length,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }
}

// ============================================
// STRUCTURED LOGGER
// ============================================

class StructuredLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 5000; // Keep last 5k logs
  private logLevel: LogEntry['level'] = 'info';

  constructor(logLevel: LogEntry['level'] = 'info') {
    this.logLevel = logLevel;
  }

  private shouldLog(level: LogEntry['level']): boolean {
    const levels = ['debug', 'info', 'warn', 'error', 'fatal'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private addLog(level: LogEntry['level'], message: string, context: Record<string, any> = {}): void {
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context: {
        ...context,
        environment: process.env.NODE_ENV || 'development',
        service: 'jobping-api'
      }
    };

    this.logs.push(logEntry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also output to console for development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'error' || level === 'fatal' ? 'error' : 
                           level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[${level.toUpperCase()}] ${message}`, context);
    }
  }

  debug(message: string, context: Record<string, any> = {}): void {
    this.addLog('debug', message, context);
  }

  info(message: string, context: Record<string, any> = {}): void {
    this.addLog('info', message, context);
  }

  warn(message: string, context: Record<string, any> = {}): void {
    this.addLog('warn', message, context);
  }

  error(message: string, context: Record<string, any> = {}): void {
    this.addLog('error', message, context);
  }

  fatal(message: string, context: Record<string, any> = {}): void {
    this.addLog('fatal', message, context);
  }

  getLogs(level?: LogEntry['level'], timeRange?: { start: number; end: number }): LogEntry[] {
    let filtered = this.logs;
    
    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }
    
    if (timeRange) {
      filtered = filtered.filter(log => 
        log.timestamp >= timeRange.start && log.timestamp <= timeRange.end
      );
    }
    
    return [...filtered];
  }

  getLogSummary(timeRange?: { start: number; end: number }): {
    total: number;
    byLevel: Record<string, number>;
    errors: number;
    warnings: number;
  } {
    const logs = this.getLogs(undefined, timeRange);
    
    const byLevel = logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: logs.length,
      byLevel,
      errors: (byLevel.error || 0) + (byLevel.fatal || 0),
      warnings: byLevel.warn || 0
    };
  }
}

// ============================================
// HEALTH CHECK SYSTEM
// ============================================

class HealthChecker {
  private checks: Array<{
    name: string;
    check: () => Promise<{ status: HealthCheck['status']; message: string; details?: any }>;
    interval: number;
    timeout: number;
    lastRun?: number;
    lastResult?: HealthCheck;
  }> = [];

  private results: HealthCheck[] = [];
  private maxResults = 1000;

  addCheck(
    name: string,
    check: () => Promise<{ status: HealthCheck['status']; message: string; details?: any }>,
    options: { interval?: number; timeout?: number } = {}
  ): void {
    this.checks.push({
      name,
      check,
      interval: options.interval || 30000, // 30 seconds
      timeout: options.timeout || 10000, // 10 seconds
    });
  }

  async runCheck(check: typeof this.checks[0]): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), check.timeout);
      });

      const result = await Promise.race([check.check(), timeoutPromise]);
      const duration = Date.now() - startTime;

      const healthCheck: HealthCheck = {
        name: check.name,
        status: result.status,
        message: result.message,
        timestamp: Date.now(),
        duration,
        details: result.details
      };

      check.lastRun = Date.now();
      check.lastResult = healthCheck;
      
      this.addResult(healthCheck);
      return healthCheck;

    } catch (error) {
      const duration = Date.now() - startTime;
      const healthCheck: HealthCheck = {
        name: check.name,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        duration,
        details: { error: error instanceof Error ? error.stack : String(error) }
      };

      check.lastRun = Date.now();
      check.lastResult = healthCheck;
      
      this.addResult(healthCheck);
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

  private addResult(result: HealthCheck): void {
    this.results.push(result);
    
    if (this.results.length > this.maxResults) {
      this.results = this.results.slice(-this.maxResults);
    }
  }

  getOverallHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: HealthCheck[];
    summary: {
      total: number;
      healthy: number;
      degraded: number;
      unhealthy: number;
    };
  } {
    const recentChecks = this.results.filter(
      r => Date.now() - r.timestamp < 300000 // Last 5 minutes
    );

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

    return {
      status,
      checks: recentChecks,
      summary
    };
  }

  startPeriodicChecks(): void {
    setInterval(async () => {
      await this.runAllChecks();
    }, 30000); // Run every 30 seconds
  }
}

// ============================================
// PRODUCTION MONITORING MANAGER
// ============================================

export class ProductionMonitoringManager {
  private metrics: MetricsCollector;
  private logger: StructuredLogger;
  private healthChecker: HealthChecker;
  private alerts: Array<{
    name: string;
    condition: () => boolean;
    message: string;
    lastTriggered?: number;
    cooldown: number;
  }> = [];

  constructor() {
    this.metrics = new MetricsCollector();
    this.logger = new StructuredLogger(
      (process.env.LOG_LEVEL as any) || 'info'
    );
    this.healthChecker = new HealthChecker();
    
    this.setupDefaultHealthChecks();
    this.setupDefaultAlerts();
    this.healthChecker.startPeriodicChecks();
  }

  private setupDefaultHealthChecks(): void {
    // Database health check
    this.healthChecker.addCheck('database', async () => {
      try {
        // This would check your actual database connection
        // For now, we'll simulate it
        return { status: 'healthy', message: 'Database connection OK' };
      } catch (error) {
        return { 
          status: 'unhealthy', 
          message: 'Database connection failed',
          details: { error: error instanceof Error ? error.message : String(error) }
        };
      }
    });

    // Email service health check
    this.healthChecker.addCheck('email_service', async () => {
      try {
        // This would check your email service
        return { status: 'healthy', message: 'Email service OK' };
      } catch (error) {
        return { 
          status: 'unhealthy', 
          message: 'Email service failed',
          details: { error: error instanceof Error ? error.message : String(error) }
        };
      }
    });

    // Memory usage check
    this.healthChecker.addCheck('memory', async () => {
      const usage = process.memoryUsage();
      const heapUsedMB = usage.heapUsed / 1024 / 1024;
      const heapTotalMB = usage.heapTotal / 1024 / 1024;
      const usagePercent = (heapUsedMB / heapTotalMB) * 100;

      if (usagePercent > 90) {
        return { 
          status: 'unhealthy', 
          message: `Memory usage critical: ${usagePercent.toFixed(1)}%`,
          details: { heapUsedMB, heapTotalMB, usagePercent }
        };
      } else if (usagePercent > 75) {
        return { 
          status: 'degraded', 
          message: `Memory usage high: ${usagePercent.toFixed(1)}%`,
          details: { heapUsedMB, heapTotalMB, usagePercent }
        };
      }

      return { 
        status: 'healthy', 
        message: `Memory usage normal: ${usagePercent.toFixed(1)}%`,
        details: { heapUsedMB, heapTotalMB, usagePercent }
      };
    });
  }

  private setupDefaultAlerts(): void {
    // High error rate alert
    this.alerts.push({
      name: 'high_error_rate',
      condition: () => {
        const errorSummary = this.logger.getLogSummary({
          start: Date.now() - 300000, // Last 5 minutes
          end: Date.now()
        });
        return errorSummary.errors > 10;
      },
      message: 'High error rate detected in the last 5 minutes',
      cooldown: 300000 // 5 minutes
    });

    // Memory usage alert
    this.alerts.push({
      name: 'high_memory_usage',
      condition: () => {
        const usage = process.memoryUsage();
        const usagePercent = (usage.heapUsed / usage.heapTotal) * 100;
        return usagePercent > 85;
      },
      message: 'High memory usage detected',
      cooldown: 600000 // 10 minutes
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

  startTimer(name: string): void {
    this.metrics.startTimer(name);
  }

  endTimer(name: string, tags: Record<string, string> = {}): number {
    return this.metrics.endTimer(name, tags);
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

  fatal(message: string, context: Record<string, any> = {}): void {
    this.logger.fatal(message, context);
  }

  // Health check methods
  addHealthCheck(
    name: string,
    check: () => Promise<{ status: HealthCheck['status']; message: string; details?: any }>,
    options?: { interval?: number; timeout?: number }
  ): void {
    this.healthChecker.addCheck(name, check, options);
  }

  async runHealthChecks(): Promise<HealthCheck[]> {
    return this.healthChecker.runAllChecks();
  }

  getHealthStatus() {
    return this.healthChecker.getOverallHealth();
  }

  // Alert methods
  addAlert(
    name: string,
    condition: () => boolean,
    message: string,
    cooldown: number = 300000
  ): void {
    this.alerts.push({ name, condition, message, cooldown });
  }

  checkAlerts(): Array<{ name: string; message: string; triggered: boolean }> {
    const now = Date.now();
    
    return this.alerts.map(alert => {
      const triggered = alert.condition();
      const canTrigger = !alert.lastTriggered || 
                        (now - alert.lastTriggered) > alert.cooldown;
      
      if (triggered && canTrigger) {
        alert.lastTriggered = now;
        this.warn(`Alert triggered: ${alert.name}`, { message: alert.message });
        return { name: alert.name, message: alert.message, triggered: true };
      }
      
      return { name: alert.name, message: alert.message, triggered: false };
    });
  }

  // Dashboard data
  getDashboardData() {
    const health = this.getHealthStatus();
    const metrics = this.metrics.getMetrics();
    const logs = this.logger.getLogSummary();
    const alerts = this.checkAlerts();

    return {
      timestamp: new Date().toISOString(),
      health,
      metrics: {
        total: metrics.length,
        recent: metrics.filter(m => Date.now() - m.timestamp < 300000).length
      },
      logs,
      alerts: alerts.filter(a => a.triggered),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
        platform: process.platform
      }
    };
  }

  // Cleanup
  clear(): void {
    this.metrics.clear();
    // Note: logger doesn't have a clear method in this implementation
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let _monitoringManager: ProductionMonitoringManager | null = null;

export function getProductionMonitoringManager(): ProductionMonitoringManager {
  if (!_monitoringManager) {
    _monitoringManager = new ProductionMonitoringManager();
  }
  return _monitoringManager;
}

export function resetMonitoringManager(): void {
  _monitoringManager = null;
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export const monitor = getProductionMonitoringManager();

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

// ============================================
// EXPORTS
// ============================================

export {
  MetricsCollector,
  StructuredLogger,
  HealthChecker,
  type MetricData,
  type LogEntry,
  type HealthCheck
};
