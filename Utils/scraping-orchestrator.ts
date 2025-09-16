/**
 * Smart Scraping Orchestrator
 * Manages rate limits and distributes scraping across time
 */

import { redisState } from './redis-state.service';

interface ScrapingSchedule {
  company: string;
  lastScraped: Date;
  priority: number;
  successRate: number;
  avgJobsFound: number;
}

interface ScrapingLimits {
  maxCallsPerHour: number;
  maxCallsPerDay: number;
  minIntervalBetweenCalls: number; // ms
  maxConcurrentScrapers: number;
}

export class ScrapingOrchestrator {
  private limits: ScrapingLimits;
  private schedule: Map<string, ScrapingSchedule> = new Map();

  constructor() {
    this.limits = {
      maxCallsPerHour: parseInt(process.env.SCRAPING_MAX_CALLS_PER_HOUR || '50'),
      maxCallsPerDay: parseInt(process.env.SCRAPING_MAX_CALLS_PER_DAY || '500'),
      minIntervalBetweenCalls: parseInt(process.env.SCRAPING_MIN_INTERVAL || '2000'), // 2s
      maxConcurrentScrapers: parseInt(process.env.SCRAPING_MAX_CONCURRENT || '3')
    };
  }

  /**
   * Get companies that should be scraped now
   */
  async getCompaniesToScrape(): Promise<string[]> {
    const now = new Date();
    const companiesToScrape: string[] = [];

    // Load scraping schedule from Redis
    await this.loadScrapingSchedule();

    for (const [company, schedule] of this.schedule) {
      const timeSinceLastScrape = now.getTime() - schedule.lastScraped.getTime();
      const shouldScrape = timeSinceLastScrape > this.getScrapingInterval(company);

      if (shouldScrape && await this.canMakeScrapingCall()) {
        companiesToScrape.push(company);
      }
    }

    // Sort by priority (high success rate + high job count = high priority)
    return companiesToScrape
      .sort((a, b) => {
        const aSchedule = this.schedule.get(a)!;
        const bSchedule = this.schedule.get(b)!;
        return (bSchedule.successRate * bSchedule.avgJobsFound) - 
               (aSchedule.successRate * aSchedule.avgJobsFound);
      })
      .slice(0, this.limits.maxConcurrentScrapers);
  }

  /**
   * Record scraping result and update schedule
   */
  async recordScrapingResult(
    company: string, 
    success: boolean, 
    jobsFound: number,
    error?: string
  ): Promise<void> {
    const now = new Date();
    const existing = this.schedule.get(company) || {
      company,
      lastScraped: new Date(0),
      priority: 1,
      successRate: 0.5,
      avgJobsFound: 0
    };

    // Update success rate (exponential moving average)
    const alpha = 0.1; // Learning rate
    existing.successRate = existing.successRate * (1 - alpha) + (success ? 1 : 0) * alpha;
    
    // Update average jobs found
    existing.avgJobsFound = existing.avgJobsFound * (1 - alpha) + jobsFound * alpha;
    
    // Update last scraped time
    existing.lastScraped = now;

    // Adjust priority based on performance
    if (success && jobsFound > 0) {
      existing.priority = Math.min(existing.priority * 1.1, 10); // Increase priority
    } else if (!success) {
      existing.priority = Math.max(existing.priority * 0.9, 0.1); // Decrease priority
    }

    this.schedule.set(company, existing);

    // Save to Redis
    await redisState.setCompanyCache(company, {
      lastCheck: now.getTime(),
      jobCount: jobsFound
    });

    // Log scraping attempt
    await this.logScrapingAttempt(company, success, jobsFound, error);
  }

  /**
   * Get optimal scraping interval for a company
   */
  private getScrapingInterval(company: string): number {
    const schedule = this.schedule.get(company);
    if (!schedule) return 4 * 60 * 60 * 1000; // 4 hours default

    // High-performing companies get scraped more frequently
    if (schedule.successRate > 0.8 && schedule.avgJobsFound > 5) {
      return 2 * 60 * 60 * 1000; // 2 hours
    }
    
    // Low-performing companies get scraped less frequently
    if (schedule.successRate < 0.3 || schedule.avgJobsFound < 1) {
      return 12 * 60 * 60 * 1000; // 12 hours
    }

    return 4 * 60 * 60 * 1000; // 4 hours default
  }

  /**
   * Check if we can make a scraping call without hitting limits
   */
  private async canMakeScrapingCall(): Promise<boolean> {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check hourly limit
    const hourlyCalls = await this.getScrapingCallsInPeriod(hourAgo, now);
    if (hourlyCalls >= this.limits.maxCallsPerHour) {
      return false;
    }

    // Check daily limit
    const dailyCalls = await this.getScrapingCallsInPeriod(dayAgo, now);
    if (dailyCalls >= this.limits.maxCallsPerDay) {
      return false;
    }

    return true;
  }

  /**
   * Get scraping calls in a time period
   */
  private async getScrapingCallsInPeriod(start: Date, end: Date): Promise<number> {
    // This would query your scraping logs table
    // For now, return a mock value
    return 0;
  }

  /**
   * Load scraping schedule from Redis
   */
  private async loadScrapingSchedule(): Promise<void> {
    // Load from Redis or database
    // For now, initialize with default values
    if (this.schedule.size === 0) {
      const companies = [
        'google', 'microsoft', 'amazon', 'meta', 'apple', 'netflix',
        'spotify', 'uber', 'airbnb', 'stripe', 'deloitte', 'pwc'
      ];

      companies.forEach(company => {
        this.schedule.set(company, {
          company,
          lastScraped: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
          priority: 1,
          successRate: 0.7,
          avgJobsFound: 3
        });
      });
    }
  }

  /**
   * Log scraping attempt for monitoring
   */
  private async logScrapingAttempt(
    company: string, 
    success: boolean, 
    jobsFound: number, 
    error?: string
  ): Promise<void> {
    // Log to database for monitoring
    console.log(`📊 Scraping ${company}: ${success ? '✅' : '❌'} - ${jobsFound} jobs${error ? ` - ${error}` : ''}`);
  }

  /**
   * Get scraping statistics
   */
  async getScrapingStats(): Promise<{
    totalCompanies: number;
    activeCompanies: number;
    avgSuccessRate: number;
    totalJobsToday: number;
    callsToday: number;
  }> {
    await this.loadScrapingSchedule();
    
    const companies = Array.from(this.schedule.values());
    const activeCompanies = companies.filter(c => 
      Date.now() - c.lastScraped.getTime() < 24 * 60 * 60 * 1000
    ).length;

    return {
      totalCompanies: companies.length,
      activeCompanies,
      avgSuccessRate: companies.reduce((sum, c) => sum + c.successRate, 0) / companies.length,
      totalJobsToday: companies.reduce((sum, c) => sum + c.avgJobsFound, 0),
      callsToday: 0 // Would query from logs
    };
  }
}

// Singleton instance
export const scrapingOrchestrator = new ScrapingOrchestrator();
