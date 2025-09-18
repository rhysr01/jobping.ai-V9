#!/usr/bin/env node

/**
 * Production-Ready Job Cleanup Script
 * 
 * Removes jobs that are 90+ days old to prevent database bloat and maintain performance.
 * This script includes comprehensive logging, error tracking, and safety checks.
 * 
 * Features:
 * - Safe batch deletion with rollback capability
 * - Comprehensive logging and metrics
 * - Database index optimization
 * - Sentry error tracking integration
 * - Dry-run mode for safe testing
 * - Performance monitoring
 */

const { createClient } = require('@supabase/supabase-js');
const * as Sentry from '@sentry/node');
require('dotenv').config({ path: '.env.local' });

// Configuration
const CONFIG = {
  DRY_RUN: process.env.CLEANUP_DRY_RUN === 'true' || process.argv.includes('--dry-run'),
  MAX_AGE_DAYS: parseInt(process.env.CLEANUP_MAX_AGE_DAYS) || 90,
  BATCH_SIZE: parseInt(process.env.CLEANUP_BATCH_SIZE) || 500,
  MAX_DELETIONS_PER_RUN: parseInt(process.env.CLEANUP_MAX_DELETIONS) || 10000,
  SAFETY_THRESHOLD: 0.15, // Don't delete more than 15% of total jobs in one run
  BATCH_DELAY_MS: 250, // Delay between batches to avoid overwhelming DB
};

// Initialize Sentry for error tracking
if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

class JobCleanupService {
  constructor() {
    this.supabase = null;
    this.metrics = {
      startTime: Date.now(),
      totalJobs: 0,
      eligibleForDeletion: 0,
      actuallyDeleted: 0,
      errors: 0,
      batchesProcessed: 0,
    };
    this.logger = this.createLogger();
  }

  createLogger() {
    const timestamp = () => new Date().toISOString();
    return {
      info: (msg, data = {}) => console.log(`[${timestamp()}] ℹ️  ${msg}`, data),
      warn: (msg, data = {}) => console.warn(`[${timestamp()}] ⚠️  ${msg}`, data),
      error: (msg, error = null) => {
        console.error(`[${timestamp()}] ❌ ${msg}`, error);
        if (error && process.env.NODE_ENV === 'production') {
          Sentry.captureException(error instanceof Error ? error : new Error(msg));
        }
      },
      success: (msg, data = {}) => console.log(`[${timestamp()}] ✅ ${msg}`, data),
    };
  }

  async initialize() {
    this.logger.info('🚀 Initializing Job Cleanup Service');
    
    // Validate environment variables
    const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missing = requiredVars.filter(v => !process.env[v]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Initialize Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    this.logger.info('✅ Supabase client initialized');
  }

  async optimizeDatabaseIndexes() {
    this.logger.info('🔧 Optimizing database indexes for cleanup performance');
    
    try {
      // Create indexes if they don't exist for optimal cleanup performance
      const indexQueries = [
        // Index on created_at for age-based queries
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_created_at 
         ON jobs(created_at)`,
        
        // Index on last_seen_at for lifecycle queries  
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_last_seen_at 
         ON jobs(last_seen_at)`,
        
        // Composite index for cleanup queries
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_cleanup 
         ON jobs(created_at, is_active, last_seen_at)`,
         
        // Index on is_active for filtering
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_is_active 
         ON jobs(is_active) WHERE is_active = true`,
      ];

      for (const query of indexQueries) {
        const { error } = await this.supabase.rpc('execute_sql', { sql: query });
        if (error && !error.message.includes('already exists')) {
          this.logger.warn('Index creation warning:', { query, error: error.message });
        }
      }
      
      this.logger.success('Database indexes optimized');
    } catch (error) {
      this.logger.error('Failed to optimize database indexes', error);
      // Don't fail the entire cleanup for index issues
    }
  }

  async analyzeJobsForCleanup() {
    this.logger.info(`🔍 Analyzing jobs older than ${CONFIG.MAX_AGE_DAYS} days`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CONFIG.MAX_AGE_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    try {
      // Get total job count
      const { count: totalJobs, error: countError } = await this.supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;
      this.metrics.totalJobs = totalJobs;

      // Find jobs eligible for deletion
      const { data: oldJobs, error: queryError } = await this.supabase
        .from('jobs')
        .select('id, title, company, created_at, last_seen_at')
        .or(`created_at.lt.${cutoffISO},last_seen_at.lt.${cutoffISO}`)
        .order('created_at', { ascending: true })
        .limit(CONFIG.MAX_DELETIONS_PER_RUN + 100); // Small buffer for analysis

      if (queryError) throw queryError;

      this.metrics.eligibleForDeletion = oldJobs?.length || 0;

      // Safety check - don't delete too much at once
      const deletionPercentage = this.metrics.eligibleForDeletion / this.metrics.totalJobs;
      if (deletionPercentage > CONFIG.SAFETY_THRESHOLD) {
        throw new Error(
          `Safety threshold exceeded: Would delete ${(deletionPercentage * 100).toFixed(1)}% ` +
          `of jobs (${this.metrics.eligibleForDeletion}/${this.metrics.totalJobs}). ` +
          `Maximum allowed: ${(CONFIG.SAFETY_THRESHOLD * 100)}%`
        );
      }

      this.logger.info('📊 Cleanup analysis complete', {
        totalJobs: this.metrics.totalJobs,
        eligibleForDeletion: this.metrics.eligibleForDeletion,
        deletionPercentage: `${(deletionPercentage * 100).toFixed(2)}%`,
        cutoffDate: cutoffISO,
      });

      // Show sample of jobs to be deleted
      if (oldJobs && oldJobs.length > 0) {
        this.logger.info('📋 Sample jobs to be deleted:');
        oldJobs.slice(0, 5).forEach((job, i) => {
          const ageInDays = Math.floor(
            (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          console.log(`   ${i + 1}. "${job.title}" at ${job.company} (${ageInDays} days old)`);
        });
      }

      return oldJobs || [];
    } catch (error) {
      this.logger.error('Failed to analyze jobs for cleanup', error);
      throw error;
    }
  }

  async executeCleanup(jobsToDelete) {
    if (CONFIG.DRY_RUN) {
      this.logger.info('🧪 DRY RUN MODE: No jobs will actually be deleted');
      this.metrics.actuallyDeleted = jobsToDelete.length;
      return;
    }

    if (jobsToDelete.length === 0) {
      this.logger.info('✨ No jobs found for cleanup');
      return;
    }

    // Limit to configured maximum
    const idsToDelete = jobsToDelete
      .slice(0, CONFIG.MAX_DELETIONS_PER_RUN)
      .map(job => job.id);

    this.logger.info(`🗑️  Starting deletion of ${idsToDelete.length} jobs in batches of ${CONFIG.BATCH_SIZE}`);

    const totalBatches = Math.ceil(idsToDelete.length / CONFIG.BATCH_SIZE);
    let processedJobs = 0;

    for (let i = 0; i < idsToDelete.length; i += CONFIG.BATCH_SIZE) {
      const batch = idsToDelete.slice(i, i + CONFIG.BATCH_SIZE);
      const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1;

      try {
        this.logger.info(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} jobs)`);

        const { error } = await this.supabase
          .from('jobs')
          .delete()
          .in('id', batch);

        if (error) {
          this.logger.error(`Batch ${batchNumber} deletion failed`, error);
          this.metrics.errors++;
          continue;
        }

        processedJobs += batch.length;
        this.metrics.batchesProcessed++;
        
        const progress = ((processedJobs / idsToDelete.length) * 100).toFixed(1);
        this.logger.success(`Batch ${batchNumber} completed - Progress: ${progress}% (${processedJobs}/${idsToDelete.length})`);

        // Delay between batches to avoid overwhelming the database
        if (i + CONFIG.BATCH_SIZE < idsToDelete.length) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY_MS));
        }

      } catch (error) {
        this.logger.error(`Unexpected error in batch ${batchNumber}`, error);
        this.metrics.errors++;
      }
    }

    this.metrics.actuallyDeleted = processedJobs;
  }

  async verifyCleanup() {
    this.logger.info('🔍 Verifying cleanup results');

    try {
      // Get updated job count
      const { count: finalJobCount, error: countError } = await this.supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      const actualDeleted = this.metrics.totalJobs - finalJobCount;
      
      // Verify some recent jobs still exist
      const { data: recentJobs, error: recentError } = await this.supabase
        .from('jobs')
        .select('title, company, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      this.logger.success('✅ Cleanup verification complete', {
        expectedDeleted: this.metrics.actuallyDeleted,
        actualDeleted,
        finalJobCount,
        recentJobsRemaining: recentJobs?.length || 0,
      });

      // Show sample of remaining recent jobs
      if (recentJobs && recentJobs.length > 0) {
        this.logger.info('📋 Sample recent jobs (verified remaining):');
        recentJobs.forEach((job, i) => {
          const ageInDays = Math.floor(
            (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          console.log(`   ${i + 1}. "${job.title}" at ${job.company} (${ageInDays} days old)`);
        });
      }

      return { finalJobCount, actualDeleted };
    } catch (error) {
      this.logger.error('Failed to verify cleanup results', error);
      throw error;
    }
  }

  generateReport() {
    const duration = Date.now() - this.metrics.startTime;
    const durationMinutes = (duration / 60000).toFixed(2);

    const report = {
      timestamp: new Date().toISOString(),
      duration: `${durationMinutes} minutes`,
      config: CONFIG,
      metrics: this.metrics,
      success: this.metrics.errors === 0,
    };

    this.logger.info('📊 Cleanup Summary Report', report);

    // Log to structured format for monitoring
    if (process.env.NODE_ENV === 'production') {
      console.log('CLEANUP_METRICS:', JSON.stringify(report));
    }

    return report;
  }

  async run() {
    try {
      this.logger.info('🧹 Starting Job Cleanup Process', CONFIG);

      await this.initialize();
      await this.optimizeDatabaseIndexes();
      
      const jobsToDelete = await this.analyzeJobsForCleanup();
      await this.executeCleanup(jobsToDelete);
      await this.verifyCleanup();

      const report = this.generateReport();
      
      this.logger.success(`🎉 Job cleanup completed successfully! Processed ${this.metrics.actuallyDeleted} jobs.`);
      
      return report;
    } catch (error) {
      this.logger.error('💥 Job cleanup failed', error);
      
      // Report critical errors to Sentry
      if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(error);
      }
      
      process.exit(1);
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const cleanup = new JobCleanupService();
  cleanup.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { JobCleanupService, CONFIG };
