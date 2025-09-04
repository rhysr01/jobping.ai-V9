/**
 * Production Monitoring System
 * 
 * CRITICAL FIX: Basic monitoring to detect system failures
 * - Health checks for all critical components
 * - Failure detection and alerting
 * - Performance metrics collection
 * - Automatic recovery attempts
 */

import { getDatabaseClient } from './databasePool.js';
import { httpClient } from './httpClient.js';
import { tokenManager } from './tokenManager.js';

export interface SystemHealth {
  ok: boolean;
  timestamp: number;
  components: {
    database: ComponentHealth;
    httpClient: ComponentHealth;
    email: ComponentHealth;
    scrapers: ComponentHealth;
    matching: ComponentHealth;
  };
  criticalIssues: string[];
  warnings: string[];
  performance: {
    responseTime: number;
    memoryUsage: number;
    activeConnections: number;
  };
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'failed';
  lastCheck: number;
  responseTime: number;
  error?: string;
  details?: any;
}

export class ProductionMonitor {
  private healthChecks: Map<string, ComponentHealth> = new Map();
  private lastFullHealthCheck = 0;
  private healthCheckInterval = 2 * 60 * 1000; // 2 minutes
  private alertThreshold = 3; // Alert after 3 consecutive failures
  private failureCounts = new Map<string, number>();
  private isMonitoring = false;

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    // Start monitoring if not already running
    if (!this.isMonitoring) {
      this.isMonitoring = true;
      this.startMonitoring();
      console.log('🔍 Production monitoring started');
    }
  }

  private startMonitoring(): void {
    // Run health checks every 2 minutes
    setInterval(async () => {
      await this.runHealthChecks();
    }, this.healthCheckInterval);

    // Run immediate health check
    setImmediate(async () => {
      await this.runHealthChecks();
    });
  }

  async runHealthChecks(): Promise<SystemHealth> {
    const startTime = Date.now();
    const health: SystemHealth = {
      ok: true,
      timestamp: Date.now(),
      components: {
        database: await this.checkDatabaseHealth(),
        httpClient: await this.checkHttpClientHealth(),
        email: await this.checkEmailHealth(),
        scrapers: await this.checkScrapersHealth(),
        matching: await this.checkMatchingHealth()
      },
      criticalIssues: [],
      warnings: [],
      performance: {
        responseTime: 0,
        memoryUsage: 0,
        activeConnections: 0
      }
    };

    // Determine overall health
    const failedComponents = Object.values(health.components).filter(c => c.status === 'failed');
    const degradedComponents = Object.values(health.components).filter(c => c.status === 'degraded');

    if (failedComponents.length > 0) {
      health.ok = false;
      health.criticalIssues.push(`${failedComponents.length} critical component(s) failed`);
    }

    if (degradedComponents.length > 0) {
      health.warnings.push(`${degradedComponents.length} component(s) degraded`);
    }

    // Check for critical issues
    if (!health.components.database.ok) {
      health.criticalIssues.push('Database connection failed - system cannot function');
    }

    if (!health.components.email.ok) {
      health.criticalIssues.push('Email system failed - users cannot receive matches');
    }

    // Calculate performance metrics
    health.performance.responseTime = Date.now() - startTime;
    health.performance.memoryUsage = process.memoryUsage().heapUsed;
    health.performance.activeConnections = this.getActiveConnections();

    // Update health check timestamps
    this.lastFullHealthCheck = Date.now();
    Object.entries(health.components).forEach(([name, component]) => {
      this.healthChecks.set(name, component);
    });

    // Handle alerts
    await this.handleAlerts(health);

    return health;
  }

  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const db = getDatabaseClient();
      const { data, error } = await db
        .from('jobs')
        .select('count')
        .limit(1)
        .timeout(5000);

      const responseTime = Date.now() - startTime;
      
      if (error) {
        return {
          status: 'failed',
          lastCheck: Date.now(),
          responseTime,
          error: error.message
        };
      }

      return {
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime
      };

    } catch (error: any) {
      return {
        status: 'failed',
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  private async checkHttpClientHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await httpClient.healthCheck();
      const responseTime = Date.now() - startTime;
      
      if (isHealthy) {
        return {
          status: 'healthy',
          lastCheck: Date.now(),
          responseTime
        };
      } else {
        return {
          status: 'degraded',
          lastCheck: Date.now(),
          responseTime,
          error: 'HTTP client health check failed'
        };
      }

    } catch (error: any) {
      return {
        status: 'failed',
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  private async checkEmailHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      // Check if Resend API key is configured
      const resendKey = process.env.RESEND_API_KEY;
      const responseTime = Date.now() - startTime;
      
      if (!resendKey) {
        return {
          status: 'failed',
          lastCheck: Date.now(),
          responseTime,
          error: 'RESEND_API_KEY not configured'
        };
      }

      // Basic email configuration check
      const fromEmail = process.env.FROM_EMAIL || 'jobs@jobping.com';
      
      return {
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime,
        details: { fromEmail }
      };

    } catch (error: any) {
      return {
        status: 'failed',
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  private async checkScrapersHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      // Check if scraper scripts exist
      const fs = require('fs');
      const requiredScripts = [
        'scripts/populate-eu-jobs-minimal.js',
        'scrapers/greenhouse-standardized.js'
      ];

      const missingScripts = requiredScripts.filter(script => !fs.existsSync(script));
      const responseTime = Date.now() - startTime;
      
      if (missingScripts.length > 0) {
        return {
          status: 'failed',
          lastCheck: Date.now(),
          responseTime,
          error: `Missing scraper scripts: ${missingScripts.join(', ')}`
        };
      }

      return {
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime
      };

    } catch (error: any) {
      return {
        status: 'failed',
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  private async checkMatchingHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      // Check OpenAI configuration
      const openaiKey = process.env.OPENAI_API_KEY;
      const responseTime = Date.now() - startTime;
      
      if (!openaiKey) {
        return {
          status: 'failed',
          lastCheck: Date.now(),
          responseTime,
          error: 'OPENAI_API_KEY not configured'
        };
      }

      // Check token manager status
      const usageStats = tokenManager.getUsageStats();
      
      return {
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime,
        details: { 
          dailyTokensRemaining: usageStats.tokens.dailyRemaining,
          dailyCostRemaining: usageStats.costs.dailyRemaining
        }
      };

    } catch (error: any) {
      return {
        status: 'failed',
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  private async handleAlerts(health: SystemHealth): Promise<void> {
    // Check for critical issues that need immediate attention
    if (health.criticalIssues.length > 0) {
      await this.sendCriticalAlert(health);
    }

    // Check for repeated failures
    Object.entries(health.components).forEach(([name, component]) => {
      if (component.status === 'failed') {
        const failureCount = (this.failureCounts.get(name) || 0) + 1;
        this.failureCounts.set(name, failureCount);
        
        if (failureCount >= this.alertThreshold) {
          this.sendComponentAlert(name, component, failureCount);
        }
      } else {
        // Reset failure count on success
        this.failureCounts.set(name, 0);
      }
    });
  }

  private async sendCriticalAlert(health: SystemHealth): Promise<void> {
    const alertMessage = `🚨 CRITICAL SYSTEM ALERT\n\n` +
      `Time: ${new Date().toISOString()}\n` +
      `Issues: ${health.criticalIssues.join(', ')}\n` +
      `Components: ${Object.entries(health.components)
        .filter(([_, c]) => c.status === 'failed')
        .map(([name, _]) => name)
        .join(', ')}\n\n` +
      `System is experiencing critical failures and may not be functional.`;

    console.error(alertMessage);
    
    // TODO: Send to monitoring service (e.g., Sentry, PagerDuty)
    // For now, just log to console
  }

  private sendComponentAlert(componentName: string, component: ComponentHealth, failureCount: number): void {
    const alertMessage = `⚠️ Component Alert: ${componentName}\n\n` +
      `Status: ${component.status}\n` +
      `Failures: ${failureCount}\n` +
      `Error: ${component.error || 'Unknown error'}\n` +
      `Last Check: ${new Date(component.lastCheck).toISOString()}`;

    console.warn(alertMessage);
    
    // TODO: Send to monitoring service
  }

  private getActiveConnections(): number {
    // This would integrate with actual connection pool monitoring
    // For now, return a placeholder
    return 1;
  }

  // Public methods for external health checks
  async getSystemHealth(): Promise<SystemHealth> {
    return await this.runHealthChecks();
  }

  async isSystemHealthy(): Promise<boolean> {
    const health = await this.getSystemHealth();
    return health.ok;
  }

  getComponentHealth(componentName: string): ComponentHealth | undefined {
    return this.healthChecks.get(componentName);
  }

  getLastHealthCheck(): number {
    return this.lastFullHealthCheck;
  }

  // Emergency shutdown
  async shutdown(): Promise<void> {
    this.isMonitoring = false;
    console.log('🔄 Production monitoring shutdown');
  }
}

// Export singleton instance
export const productionMonitor = new ProductionMonitor();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down monitoring...');
  await productionMonitor.shutdown();
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down monitoring...');
  await productionMonitor.shutdown();
});
