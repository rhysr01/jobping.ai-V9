/**
 * Job Queue System for Background Processing
 * Handles email sending, job scraping, and AI matching asynchronously
 */

import { createClient } from '@supabase/supabase-js';
import { redisState } from './redis-state.service';

export interface JobQueueItem {
  id: string;
  type: 'email_send' | 'job_scrape' | 'ai_match' | 'user_processing';
  priority: number; // 1-10, higher = more urgent
  payload: any;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledFor: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  error?: string;
  result?: any;
}

export class JobQueueService {
  private supabase: any;
  private processing = false;
  private workers: Map<string, Worker> = new Map();

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Add job to queue
   */
  async addJob(
    type: JobQueueItem['type'],
    payload: any,
    priority: number = 5,
    scheduledFor?: Date
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: JobQueueItem = {
      id: jobId,
      type,
      priority,
      payload,
      attempts: 0,
      maxAttempts: this.getMaxAttempts(type),
      createdAt: new Date(),
      scheduledFor: scheduledFor || new Date(),
      status: 'pending'
    };

    // Store in database
    await this.supabase
      .from('job_queue')
      .insert({
        id: job.id,
        type: job.type,
        priority: job.priority,
        payload: job.payload,
        attempts: job.attempts,
        max_attempts: job.maxAttempts,
        created_at: job.createdAt.toISOString(),
        scheduled_for: job.scheduledFor.toISOString(),
        status: job.status
      });

    // Also store in Redis for fast access
    await redisState.setCompanyCache(`queue:${jobId}`, {
      lastCheck: Date.now(),
      jobCount: 1
    });

    console.log(`📋 Added job ${jobId} of type ${type} with priority ${priority}`);
    return jobId;
  }

  /**
   * Start processing jobs
   */
  async startProcessing(): Promise<void> {
    if (this.processing) return;
    
    this.processing = true;
    console.log('🚀 Starting job queue processing...');

    // Start different worker types
    this.startWorker('email_send', this.processEmailJob.bind(this), 2);
    this.startWorker('job_scrape', this.processScrapingJob.bind(this), 1);
    this.startWorker('ai_match', this.processAIMatchingJob.bind(this), 3);
    this.startWorker('user_processing', this.processUserJob.bind(this), 2);
  }

  /**
   * Stop processing jobs
   */
  async stopProcessing(): Promise<void> {
    this.processing = false;
    
    for (const [type, worker] of this.workers) {
      clearInterval(worker.interval);
      console.log(`🛑 Stopped ${type} worker`);
    }
    
    this.workers.clear();
  }

  /**
   * Start a worker for a specific job type
   */
  private startWorker(
    type: string, 
    processor: (job: JobQueueItem) => Promise<any>,
    concurrency: number
  ): void {
    const worker: Worker = {
      type,
      processor,
      concurrency,
      running: 0,
      interval: setInterval(async () => {
        if (worker.running < concurrency) {
          await this.processNextJob(type, processor);
        }
      }, 1000) // Check every second
    };

    this.workers.set(type, worker);
    console.log(`👷 Started ${type} worker with concurrency ${concurrency}`);
  }

  /**
   * Process next job of a specific type
   */
  private async processNextJob(
    type: string, 
    processor: (job: JobQueueItem) => Promise<any>
  ): Promise<void> {
    const worker = this.workers.get(type);
    if (!worker || worker.running >= worker.concurrency) return;

    try {
      // Get next job from database
      const { data: jobs } = await this.supabase
        .from('job_queue')
        .select('*')
        .eq('type', type)
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1);

      if (!jobs || jobs.length === 0) return;

      const jobData = jobs[0];
      const job: JobQueueItem = {
        id: jobData.id,
        type: jobData.type,
        priority: jobData.priority,
        payload: jobData.payload,
        attempts: jobData.attempts,
        maxAttempts: jobData.max_attempts,
        createdAt: new Date(jobData.created_at),
        scheduledFor: new Date(jobData.scheduled_for),
        status: jobData.status
      };

      // Mark as processing
      await this.updateJobStatus(job.id, 'processing');
      worker.running++;

      try {
        // Process the job
        const result = await processor(job);
        
        // Mark as completed
        await this.updateJobStatus(job.id, 'completed', undefined, result);
        console.log(`✅ Completed job ${job.id} of type ${type}`);

      } catch (error) {
        // Handle failure
        await this.handleJobFailure(job, error);
      } finally {
        worker.running--;
      }

    } catch (error) {
      console.error(`❌ Error processing ${type} jobs:`, error);
    }
  }

  /**
   * Process email sending job
   */
  private async processEmailJob(job: JobQueueItem): Promise<any> {
    const { userEmail, jobs, subscriptionTier } = job.payload;
    
    // Import email service dynamically to avoid circular dependencies
    const { sendMatchedJobsEmail } = await import('./email');
    
    await sendMatchedJobsEmail({
      to: userEmail,
      jobs: jobs,
      userName: userEmail.split('@')[0],
      subscriptionTier: subscriptionTier,
      isSignupEmail: false
    });

    return { emailsSent: 1 };
  }

  /**
   * Process job scraping
   */
  private async processScrapingJob(job: JobQueueItem): Promise<any> {
    const { companies, scraperType } = job.payload;
    
    // Import scraper dynamically
    const scraper = await import(`../scrapers/${scraperType}`);
    const scraperInstance = new scraper.default();
    
    const results = await scraperInstance.scrapeCompanies(companies);
    
    return { jobsScraped: results.jobs.length, companiesProcessed: companies.length };
  }

  /**
   * Process AI matching job
   */
  private async processAIMatchingJob(job: JobQueueItem): Promise<any> {
    const { userEmail, jobs, userPreferences } = job.payload;
    
    // Import AI matching service
    const { createConsolidatedMatcher } = await import('./consolidatedMatching');
    const matcher = createConsolidatedMatcher(process.env.OPENAI_API_KEY);
    
    const result = await matcher.performMatching(jobs, userPreferences);
    
    return { matches: result.matches, method: result.method };
  }

  /**
   * Process user processing job
   */
  private async processUserJob(job: JobQueueItem): Promise<any> {
    const { userEmail, action } = job.payload;
    
    switch (action) {
      case 'welcome_email':
        const { sendWelcomeEmail } = await import('./email');
        await sendWelcomeEmail(userEmail);
        break;
        
      case 'update_preferences':
        // Update user preferences logic
        break;
        
      default:
        throw new Error(`Unknown user action: ${action}`);
    }
    
    return { action, userEmail };
  }

  /**
   * Handle job failure
   */
  private async handleJobFailure(job: JobQueueItem, error: any): Promise<void> {
    const newAttempts = job.attempts + 1;
    
    if (newAttempts >= job.maxAttempts) {
      // Max attempts reached, mark as failed
      await this.updateJobStatus(job.id, 'failed', error.message);
      console.error(`❌ Job ${job.id} failed permanently after ${newAttempts} attempts:`, error);
    } else {
      // Retry with exponential backoff
      const retryDelay = Math.min(1000 * Math.pow(2, newAttempts), 300000); // Max 5 minutes
      const retryTime = new Date(Date.now() + retryDelay);
      
      await this.supabase
        .from('job_queue')
        .update({
          attempts: newAttempts,
          status: 'retrying',
          scheduled_for: retryTime.toISOString(),
          error: error.message
        })
        .eq('id', job.id);
      
      console.log(`🔄 Job ${job.id} will retry in ${retryDelay}ms (attempt ${newAttempts}/${job.maxAttempts})`);
    }
  }

  /**
   * Update job status
   */
  private async updateJobStatus(
    jobId: string, 
    status: JobQueueItem['status'], 
    error?: string, 
    result?: any
  ): Promise<void> {
    await this.supabase
      .from('job_queue')
      .update({
        status,
        error,
        result,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }

  /**
   * Get max attempts for job type
   */
  private getMaxAttempts(type: JobQueueItem['type']): number {
    const maxAttempts = {
      'email_send': 3,
      'job_scrape': 2,
      'ai_match': 2,
      'user_processing': 3
    };
    
    return maxAttempts[type] || 3;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    byType: Record<string, number>;
  }> {
    const { data: stats } = await this.supabase
      .from('job_queue')
      .select('status, type')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const result = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      byType: {} as Record<string, number>
    };

    stats?.forEach((stat: any) => {
      result[stat.status as keyof typeof result]++;
      result.byType[stat.type] = (result.byType[stat.type] || 0) + 1;
    });

    return result;
  }
}

interface Worker {
  type: string;
  processor: (job: JobQueueItem) => Promise<any>;
  concurrency: number;
  running: number;
  interval: NodeJS.Timeout;
}

// Singleton instance
export const jobQueue = new JobQueueService();
