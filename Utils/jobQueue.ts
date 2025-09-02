import Queue from 'bull';
import { createClient } from '@supabase/supabase-js';
import { AIMatchingCache } from './jobMatching';
import { PerformanceMonitor } from './performanceMonitor';
import { AdvancedMonitoringOracle } from './advancedMonitoring';

// Initialize Redis connection
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Job queue configuration
const QUEUE_CONFIG = {
  // Chunk size for user processing
  CHUNK_SIZE: 100,
  
  // Backoff configuration
  BACKOFF: {
    type: 'exponential',
    delay: 60000, // 1 minute
    maxDelay: 300000, // 5 minutes max
  },
  
  // Rate limiting
  RATE_LIMIT: {
    max: 10, // Max 10 jobs per
    duration: 60000, // 1 minute
  },
  
  // Job retention
  JOB_RETENTION: {
    completed: 24 * 60 * 60 * 1000, // 24 hours
    failed: 7 * 24 * 60 * 60 * 1000, // 7 days
  }
};

// Job types
export enum JobType {
  MATCH_USERS = 'match-users',
  SEND_EMAILS = 'send-emails',
  SCRAPE_JOBS = 'scrape-jobs',
  CLEANUP_JOBS = 'cleanup-jobs'
}

// Job data interfaces
export interface MatchUsersJobData {
  userIds: string[];
  runId: string;
  priority: 'high' | 'normal' | 'low';
  retryCount?: number;
}

export interface SendEmailsJobData {
  emailData: Array<{
    to: string;
    jobs: any[];
    userName?: string;
    subscriptionTier?: 'free' | 'premium';
    isSignupEmail?: boolean;
  }>;
  runId: string;
  priority: 'high' | 'normal' | 'low';
  retryCount?: number;
}

export interface ScrapeJobsJobData {
  platforms: string[];
  runId: string;
  priority: 'high' | 'normal' | 'low';
  retryCount?: number;
}

export interface CleanupJobsJobData {
  olderThanDays: number;
  runId: string;
  priority: 'high' | 'normal' | 'low';
  retryCount?: number;
}

// Job result interfaces
export interface JobResult {
  success: boolean;
  processed: number;
  errors: string[];
  duration: number;
  cacheHits?: number;
  cacheMisses?: number;
}

// Enhanced job queue manager
export class JobQueueManager {
  private static instance: JobQueueManager;
  private queues: Map<JobType, Queue.Queue> = new Map();
  private supabase: any;
  private monitoringOracle: AdvancedMonitoringOracle;

  private constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.monitoringOracle = new AdvancedMonitoringOracle();
    this.initializeQueues();
  }

  static getInstance(): JobQueueManager {
    if (!JobQueueManager.instance) {
      JobQueueManager.instance = new JobQueueManager();
    }
    return JobQueueManager.instance;
  }

  private initializeQueues() {
    // Initialize match-users queue
    const matchUsersQueue = new Queue<MatchUsersJobData>(
      JobType.MATCH_USERS,
      REDIS_URL,
      {
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: QUEUE_CONFIG.BACKOFF,
        },
        limiter: {
          max: QUEUE_CONFIG.RATE_LIMIT.max,
          duration: QUEUE_CONFIG.RATE_LIMIT.duration,
        },
      }
    );

    // Initialize send-emails queue
    const sendEmailsQueue = new Queue<SendEmailsJobData>(
      JobType.SEND_EMAILS,
      REDIS_URL,
      {
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: QUEUE_CONFIG.BACKOFF,
        },
        limiter: {
          max: QUEUE_CONFIG.RATE_LIMIT.max,
          duration: QUEUE_CONFIG.RATE_LIMIT.duration,
        },
      }
    );

    // Initialize scrape-jobs queue
    const scrapeJobsQueue = new Queue<ScrapeJobsJobData>(
      JobType.SCRAPE_JOBS,
      REDIS_URL,
      {
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 2,
          backoff: QUEUE_CONFIG.BACKOFF,
        },
        limiter: {
          max: 5, // Lower rate limit for scraping
          duration: 300000, // 5 minutes
        },
      }
    );

    // Initialize cleanup-jobs queue
    const cleanupJobsQueue = new Queue<CleanupJobsJobData>(
      JobType.CLEANUP_JOBS,
      REDIS_URL,
      {
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 2,
          backoff: QUEUE_CONFIG.BACKOFF,
        },
        limiter: {
          max: 2, // Very low rate limit for cleanup
          duration: 600000, // 10 minutes
        },
      }
    );

    // Store queues
    this.queues.set(JobType.MATCH_USERS, matchUsersQueue);
    this.queues.set(JobType.SEND_EMAILS, sendEmailsQueue);
    this.queues.set(JobType.SCRAPE_JOBS, scrapeJobsQueue);
    this.queues.set(JobType.CLEANUP_JOBS, cleanupJobsQueue);

    // Set up job processors
    this.setupJobProcessors();
    this.setupQueueMonitoring();
  }

  private setupJobProcessors() {
    // Match users processor
    const matchUsersQueue = this.queues.get(JobType.MATCH_USERS)!;
    matchUsersQueue.process(async (job) => {
      return await this.processMatchUsersJob(job);
    });

    // Send emails processor
    const sendEmailsQueue = this.queues.get(JobType.SEND_EMAILS)!;
    sendEmailsQueue.process(async (job) => {
      return await this.processSendEmailsJob(job);
    });

    // Scrape jobs processor
    const scrapeJobsQueue = this.queues.get(JobType.SCRAPE_JOBS)!;
    scrapeJobsQueue.process(async (job) => {
      return await this.processScrapeJobsJob(job);
    });

    // Cleanup jobs processor
    const cleanupJobsQueue = this.queues.get(JobType.CLEANUP_JOBS)!;
    cleanupJobsQueue.process(async (job) => {
      return await this.processCleanupJobsJob(job);
    });
  }

  private setupQueueMonitoring() {
    // Monitor all queues
    this.queues.forEach((queue, jobType) => {
      // Job completed
      queue.on('completed', (job, result) => {
        console.log(`✅ Job ${jobType} completed:`, {
          jobId: job.id,
          processed: result.processed,
          duration: result.duration,
          cacheHits: result.cacheHits,
          cacheMisses: result.cacheMisses
        });
        
        PerformanceMonitor.trackDuration(`job_${jobType}_completed`, Date.now());
      });

      // Job failed
      queue.on('failed', (job, err) => {
        console.error(`❌ Job ${jobType} failed:`, {
          jobId: job.id,
          error: err.message,
          attempts: job.attemptsMade
        });
        
        PerformanceMonitor.trackDuration(`job_${jobType}_failed`, Date.now());
      });

      // Job stalled
      queue.on('stalled', (job) => {
        console.warn(`⚠️ Job ${jobType} stalled:`, {
          jobId: job.id,
          attempts: job.attemptsMade
        });
      });

      // Queue error
      queue.on('error', (err) => {
        console.error(`🚨 Queue ${jobType} error:`, err);
      });
    });
  }

  // Add match users job (chunked)
  async addMatchUsersJob(userIds: string[], runId: string, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<void> {
    const queue = this.queues.get(JobType.MATCH_USERS)!;
    
    // Chunk users into groups of CHUNK_SIZE
    const chunks = this.chunkArray(userIds, QUEUE_CONFIG.CHUNK_SIZE);
    
    console.log(`📦 Adding ${chunks.length} match-users jobs for ${userIds.length} users (chunk size: ${QUEUE_CONFIG.CHUNK_SIZE})`);
    
    for (const chunk of chunks) {
      const jobData: MatchUsersJobData = {
        userIds: chunk,
        runId,
        priority
      };
      
      const jobOptions: Queue.JobOptions = {
        priority: this.getPriorityValue(priority),
        delay: priority === 'low' ? 30000 : 0, // 30s delay for low priority
      };
      
      await queue.add(jobData, jobOptions);
    }
  }

  // Add send emails job (chunked)
  async addSendEmailsJob(emailData: SendEmailsJobData['emailData'], runId: string, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<void> {
    const queue = this.queues.get(JobType.SEND_EMAILS)!;
    
    // Chunk emails into groups
    const chunks = this.chunkArray(emailData, 50); // Smaller chunks for emails
    
    console.log(`📧 Adding ${chunks.length} send-emails jobs for ${emailData.length} emails`);
    
    for (const chunk of chunks) {
      const jobData: SendEmailsJobData = {
        emailData: chunk,
        runId,
        priority
      };
      
      const jobOptions: Queue.JobOptions = {
        priority: this.getPriorityValue(priority),
        delay: priority === 'low' ? 60000 : 0, // 1min delay for low priority
      };
      
      await queue.add(jobData, jobOptions);
    }
  }

  // Add scrape jobs job
  async addScrapeJobsJob(platforms: string[], runId: string, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<void> {
    const queue = this.queues.get(JobType.SCRAPE_JOBS)!;
    
    const jobData: ScrapeJobsJobData = {
      platforms,
      runId,
      priority
    };
    
    const jobOptions: Queue.JobOptions = {
      priority: this.getPriorityValue(priority),
      delay: priority === 'low' ? 300000 : 0, // 5min delay for low priority
    };
    
    await queue.add(jobData, jobOptions);
    console.log(`🔍 Added scrape-jobs job for platforms: ${platforms.join(', ')}`);
  }

  // Add cleanup jobs job
  async addCleanupJobsJob(olderThanDays: number, runId: string, priority: 'high' | 'normal' | 'low' = 'low'): Promise<void> {
    const queue = this.queues.get(JobType.CLEANUP_JOBS)!;
    
    const jobData: CleanupJobsJobData = {
      olderThanDays,
      runId,
      priority
    };
    
    const jobOptions: Queue.JobOptions = {
      priority: this.getPriorityValue(priority),
      delay: 600000, // 10min delay for cleanup jobs
    };
    
    await queue.add(jobData, jobOptions);
    console.log(`🧹 Added cleanup-jobs job for jobs older than ${olderThanDays} days`);
  }

  // Process match users job
  private async processMatchUsersJob(job: Queue.Job<MatchUsersJobData>): Promise<JobResult> {
    const startTime = Date.now();
    const { userIds, runId } = job.data;
    
    console.log(`🎯 Processing match-users job for ${userIds.length} users`);
    
    try {
      // Get users from database
      const { data: users, error } = await this.supabase
        .from('users')
        .select('*')
        .in('id', userIds);
      
      if (error) throw error;
      
      // Process users in batches
      const results = [];
      let cacheHits = 0;
      let cacheMisses = 0;
      
      for (const user of users) {
        try {
          // Check cache first
          const cachedMatches = await AIMatchingCache.getCachedMatches([user]);
          if (cachedMatches) {
            cacheHits++;
            results.push({ userId: user.id, success: true, matches: cachedMatches });
            continue;
          }
          
          cacheMisses++;
          
          // Process user matching (simplified for this example)
          // In reality, you'd call your existing match-users logic here
          const matches = await this.processUserMatching(user);
          results.push({ userId: user.id, success: true, matches });
          
        } catch (error) {
          console.error(`Error processing user ${user.id}:`, error);
          results.push({ userId: user.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Match-users job completed: ${results.filter(r => r.success).length}/${results.length} users processed`);
      
      return {
        success: true,
        processed: results.length,
        errors: results.filter(r => !r.success).map(r => r.error).filter((error): error is string => error !== undefined),
        duration,
        cacheHits,
        cacheMisses
      };
      
    } catch (error) {
      console.error('❌ Match-users job failed:', error);
      throw error;
    }
  }

  // Process send emails job
  private async processSendEmailsJob(job: Queue.Job<SendEmailsJobData>): Promise<JobResult> {
    const startTime = Date.now();
    const { emailData, runId } = job.data;
    
    console.log(`📧 Processing send-emails job for ${emailData.length} emails`);
    
    try {
      // const { sendMatchedJobsEmail } = await import('./emailUtils');
      
      const results = [];
      
      for (const email of emailData) {
        try {
          await sendMatchedJobsEmail(email);
          results.push({ success: true, to: email.to });
        } catch (error) {
          console.error(`Error sending email to ${email.to}:`, error);
          results.push({ success: false, to: email.to, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Send-emails job completed: ${results.filter(r => r.success).length}/${results.length} emails sent`);
      
      return {
        success: true,
        processed: results.length,
        errors: results.filter(r => !r.success).map(r => r.error).filter((error): error is string => error !== undefined),
        duration
      };
      
    } catch (error) {
      console.error('❌ Send-emails job failed:', error);
      throw error;
    }
  }

  // Process scrape jobs job
  private async processScrapeJobsJob(job: Queue.Job<ScrapeJobsJobData>): Promise<JobResult> {
    const startTime = Date.now();
    const { platforms, runId } = job.data;
    
    console.log(`🔍 Processing scrape-jobs job for platforms: ${platforms.join(', ')}`);
    
    try {
      // Call your existing scrape endpoint logic
      const results = [];
      
      for (const platform of platforms) {
        try {
          // Skip problematic Puppeteer-based scrapers in production build
          if (platform === 'jobteaser-puppeteer') {
            console.warn(`⚠️ Skipping ${platform} - Puppeteer not supported in Edge runtime`);
            results.push({ platform, success: false, error: 'Puppeteer not supported in Edge runtime' });
            continue;
          }

          // Import and call the appropriate scraper
          const scraperModule = await import(`../scrapers/${platform}`);
          const scraperFunction = scraperModule[`scrape${platform.charAt(0).toUpperCase() + platform.slice(1)}`];
          
          if (scraperFunction) {
            const jobs = await scraperFunction(runId);
            results.push({ platform, success: true, jobs: jobs.length });
          } else {
            results.push({ platform, success: false, error: 'Scraper function not found' });
          }
        } catch (error) {
          console.error(`Error scraping ${platform}:`, error);
          results.push({ platform, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Scrape-jobs job completed: ${results.filter(r => r.success).length}/${results.length} platforms processed`);
      
      return {
        success: true,
        processed: results.length,
        errors: results.filter(r => !r.success).map(r => r.error).filter((error): error is string => error !== undefined),
        duration
      };
      
    } catch (error) {
      console.error('❌ Scrape-jobs job failed:', error);
      throw error;
    }
  }

  // Process cleanup jobs job
  private async processCleanupJobsJob(job: Queue.Job<CleanupJobsJobData>): Promise<JobResult> {
    const startTime = Date.now();
    const { olderThanDays, runId } = job.data;
    
    console.log(`🧹 Processing cleanup-jobs job for jobs older than ${olderThanDays} days`);
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const { data, error } = await this.supabase
        .from('jobs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');
      
      if (error) throw error;
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Cleanup-jobs job completed: ${data?.length || 0} jobs deleted`);
      
      return {
        success: true,
        processed: data?.length || 0,
        errors: [],
        duration
      };
      
    } catch (error) {
      console.error('❌ Cleanup-jobs job failed:', error);
      throw error;
    }
  }

  // Helper methods
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private getPriorityValue(priority: 'high' | 'normal' | 'low'): number {
    switch (priority) {
      case 'high': return 1;
      case 'normal': return 5;
      case 'low': return 10;
      default: return 5;
    }
  }

  private async processUserMatching(user: any): Promise<any[]> {
    // Simplified user matching logic
    // In reality, you'd call your existing match-users endpoint logic here
    return [];
  }

  // Get queue statistics
  async getQueueStats(): Promise<any> {
    const stats: Record<string, any> = {};
    
    for (const [jobType, queue] of this.queues) {
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed()
      ]);
      
      stats[jobType as string] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length
      };
    }
    
    return stats;
  }

  // Clean up queues
  async cleanup(): Promise<void> {
    for (const [jobType, queue] of this.queues) {
      await queue.close();
    }
    this.queues.clear();
  }
}

// Export singleton instance
export const jobQueueManager = JobQueueManager.getInstance();
