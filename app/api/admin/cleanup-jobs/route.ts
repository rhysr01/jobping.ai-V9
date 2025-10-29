/**
 * Admin API Endpoint: Job Cleanup
 * 
 * Provides a secure API endpoint for automated job cleanup that can be called
 * by cron jobs, monitoring systems, or manual admin actions.
 * 
 * Features:
 * - Secure admin authentication
 * - Comprehensive error tracking with Sentry
 * - Structured logging for monitoring
 * - Safety checks and dry-run mode
 * - Performance metrics and reporting
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppError, ValidationError, UnauthorizedError } from '@/lib/errors';
import type { CleanupLogEntry, CleanupContext } from '@/lib/types';
import * as Sentry from '@sentry/nextjs';

// Security configuration
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const CLEANUP_SECRET = process.env.CLEANUP_SECRET;

// Cleanup configuration with environment overrides
const CONFIG = {
  MAX_AGE_DAYS: parseInt(process.env.CLEANUP_MAX_AGE_DAYS!) || 90,
  BATCH_SIZE: parseInt(process.env.CLEANUP_BATCH_SIZE!) || 500,
  MAX_DELETIONS_PER_RUN: parseInt(process.env.CLEANUP_MAX_DELETIONS!) || 10000,
  SAFETY_THRESHOLD: parseFloat(process.env.CLEANUP_SAFETY_THRESHOLD!) || 0.15,
  BATCH_DELAY_MS: parseInt(process.env.CLEANUP_BATCH_DELAY_MS!) || 250,
};

interface CleanupMetrics {
  startTime: number;
  totalJobs: number;
  eligibleForDeletion: number;
  actuallyDeleted: number;
  errors: number;
  batchesProcessed: number;
  duration: number;
  deletionPercentage: number;
}

interface CleanupRequest {
  dryRun?: boolean;
  maxAge?: number;
  batchSize?: number;
  force?: boolean; // Override safety checks
}

class JobCleanupAPI {
  private supabase: SupabaseClient;
  private metrics: CleanupMetrics;
  private requestId: string;

  constructor(requestId: string) {
    this.requestId = requestId;
    this.metrics = {
      startTime: Date.now(),
      totalJobs: 0,
      eligibleForDeletion: 0,
      actuallyDeleted: 0,
      errors: 0,
      batchesProcessed: 0,
      duration: 0,
      deletionPercentage: 0,
    };

    // Initialize Supabase with service role
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
    const timestamp = new Date().toISOString();
    const baseEntry: CleanupLogEntry = {
      timestamp,
      requestId: this.requestId,
      level,
      message,
    };
    const extra = (data && typeof data === 'object') ? data as Record<string, unknown> : (data !== undefined ? { detail: data } : undefined);
    const logEntry = extra ? { ...baseEntry, ...extra } : baseEntry;

    console.log(`[${timestamp}] [${this.requestId}] ${level.toUpperCase()}: ${message}`, data || '');
    
    // Structured logging for monitoring systems
    if (process.env.NODE_ENV === 'production') {
      console.log('CLEANUP_LOG:', JSON.stringify(logEntry));
    }
  }

  async validateRequest(request: CleanupRequest): Promise<void> {
    // Validate numeric parameters
    if (request.maxAge && (request.maxAge < 7 || request.maxAge > 365)) {
      throw new ValidationError('maxAge must be between 7 and 365 days');
    }

    if (request.batchSize && (request.batchSize < 10 || request.batchSize > 1000)) {
      throw new ValidationError('batchSize must be between 10 and 1000');
    }

    this.log('info', 'Request validation passed', request);
  }

  async analyzeJobsForCleanup(maxAge: number): Promise<Array<{id: string; created_at: string}>> {
    this.log('info', `Analyzing jobs older than ${maxAge} days`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);
    const cutoffISO = cutoffDate.toISOString();

    try {
      // Get total job count
      const { count: totalJobs, error: countError } = await this.supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        throw new AppError(`Failed to count total jobs: ${countError.message}`, 500, 'DATABASE_ERROR');
      }

      this.metrics.totalJobs = totalJobs || 0;

      // Find jobs eligible for deletion
      const { data: oldJobs, error: queryError } = await this.supabase
        .from('jobs')
        .select('id, title, company, created_at, last_seen_at')
        .or(`created_at.lt.${cutoffISO},last_seen_at.lt.${cutoffISO}`)
        .order('created_at', { ascending: true })
        .limit(CONFIG.MAX_DELETIONS_PER_RUN + 100);

      if (queryError) {
        throw new AppError(`Failed to query old jobs: ${queryError.message}`, 500, 'DATABASE_ERROR');
      }

      this.metrics.eligibleForDeletion = oldJobs?.length || 0;
      this.metrics.deletionPercentage = this.metrics.totalJobs > 0 
        ? this.metrics.eligibleForDeletion / this.metrics.totalJobs 
        : 0;

      this.log('info', 'Job analysis complete', {
        totalJobs: this.metrics.totalJobs,
        eligibleForDeletion: this.metrics.eligibleForDeletion,
        deletionPercentage: `${(this.metrics.deletionPercentage * 100).toFixed(2)}%`,
        cutoffDate: cutoffISO,
      });

      return oldJobs || [];
    } catch (error) {
      this.log('error', 'Failed to analyze jobs for cleanup', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  async executeCleanup(jobsToDelete: Array<{id: string}>, dryRun: boolean, force: boolean): Promise<void> {
    if (dryRun) {
      this.log('info', 'DRY RUN MODE: No jobs will actually be deleted');
      this.metrics.actuallyDeleted = Math.min(jobsToDelete.length, CONFIG.MAX_DELETIONS_PER_RUN);
      return;
    }

    // Safety check - don't delete too much at once unless forced
    if (!force && this.metrics.deletionPercentage > CONFIG.SAFETY_THRESHOLD) {
      throw new ValidationError(
        `Safety threshold exceeded: Would delete ${(this.metrics.deletionPercentage * 100).toFixed(1)}% ` +
        `of jobs (${this.metrics.eligibleForDeletion}/${this.metrics.totalJobs}). ` +
        `Maximum allowed: ${(CONFIG.SAFETY_THRESHOLD * 100)}%. Use force=true to override.`
      );
    }

    if (jobsToDelete.length === 0) {
      this.log('info', 'No jobs found for cleanup');
      return;
    }

    // Limit to configured maximum
    const idsToDelete = jobsToDelete
      .slice(0, CONFIG.MAX_DELETIONS_PER_RUN)
      .map(job => job.id);

    this.log('info', `Starting deletion of ${idsToDelete.length} jobs in batches of ${CONFIG.BATCH_SIZE}`);

    const totalBatches = Math.ceil(idsToDelete.length / CONFIG.BATCH_SIZE);
    let processedJobs = 0;

    for (let i = 0; i < idsToDelete.length; i += CONFIG.BATCH_SIZE) {
      const batch = idsToDelete.slice(i, i + CONFIG.BATCH_SIZE);
      const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1;

      try {
        this.log('info', `Processing batch ${batchNumber}/${totalBatches}`, { 
          batchSize: batch.length,
          progress: `${((processedJobs / idsToDelete.length) * 100).toFixed(1)}%`
        });

        const { error } = await this.supabase
          .from('jobs')
          .delete()
          .in('id', batch);

        if (error) {
          this.log('error', `Batch ${batchNumber} deletion failed`, { error: error.message });
          this.metrics.errors++;
          
          // Report batch errors to Sentry
          Sentry.captureException(new AppError(`Batch deletion failed: ${error.message}`, 500, 'DATABASE_ERROR'));
          continue;
        }

        processedJobs += batch.length;
        this.metrics.batchesProcessed++;

        // Delay between batches to avoid overwhelming the database
        if (i + CONFIG.BATCH_SIZE < idsToDelete.length) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY_MS));
        }

      } catch (error) {
        this.log('error', `Unexpected error in batch ${batchNumber}`, { error });
        this.metrics.errors++;
        Sentry.captureException(error instanceof Error ? error : new Error('Batch processing error'));
      }
    }

    this.metrics.actuallyDeleted = processedJobs;
    this.log('info', `Cleanup execution complete. Deleted ${processedJobs} jobs with ${this.metrics.errors} errors.`);
  }

  async generateReport(): Promise<any> {
    this.metrics.duration = Date.now() - this.metrics.startTime;
    
    // Get current job count for verification
    const { count: finalJobCount } = await this.supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true });

    const report = {
      requestId: this.requestId,
      timestamp: new Date().toISOString(),
      duration: `${(this.metrics.duration / 60000).toFixed(2)} minutes`,
      config: CONFIG,
      metrics: this.metrics,
      finalJobCount: finalJobCount || 0,
      success: this.metrics.errors === 0,
    };

    this.log('info', 'Cleanup report generated', report);

    // Log structured metrics for monitoring
    if (process.env.NODE_ENV === 'production') {
      console.log('CLEANUP_METRICS:', JSON.stringify(report));
    }

    return report;
  }
}

function authenticateRequest(req: NextRequest): void {
  const authHeader = req.headers.get('authorization');
  const apiKey = req.headers.get('x-api-key');
  const cleanupSecret = req.headers.get('x-cleanup-secret');

  // Check for admin API key
  if (ADMIN_API_KEY && apiKey === ADMIN_API_KEY) {
    return; // Authenticated
  }

  // Check for cleanup secret
  if (CLEANUP_SECRET && cleanupSecret === CLEANUP_SECRET) {
    return; // Authenticated
  }

  // Check for bearer token
  if (authHeader?.startsWith('Bearer ') && ADMIN_API_KEY) {
    const token = authHeader.slice(7);
    if (token === ADMIN_API_KEY) {
      return; // Authenticated
    }
  }

  throw new UnauthorizedError('Invalid authentication credentials');
}

export const POST = async (req: NextRequest) => {
  const requestId = crypto.randomUUID();
  
  try {
    // Set Sentry context
    Sentry.setTag('operation', 'job-cleanup');
    Sentry.setContext('request', { requestId });

    // Authenticate the request
    authenticateRequest(req);

    // Parse request body
    const requestData: CleanupRequest = await req.json().catch(() => ({}));
    
    // Initialize cleanup service
    const cleanup = new JobCleanupAPI(requestId);
    
    // Validate request parameters
    await cleanup.validateRequest(requestData);

    // Configure cleanup parameters
    const maxAge = requestData.maxAge || CONFIG.MAX_AGE_DAYS;
    const dryRun = requestData.dryRun || false;
    const force = requestData.force || false;

    // Execute cleanup process
    const jobsToDelete = await cleanup.analyzeJobsForCleanup(maxAge);
    await cleanup.executeCleanup(jobsToDelete, dryRun, force);
    const report = await cleanup.generateReport();

    return NextResponse.json({
      success: true,
      message: dryRun ? 'Dry run completed successfully' : 'Cleanup completed successfully',
      data: report
    });

  } catch (error) {
    console.error(`[${requestId}] Cleanup API error:`, error);
    
    // Report errors to Sentry
    Sentry.captureException(error instanceof Error ? error : new Error('Cleanup API error'));
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId
    }, { status: error instanceof AppError ? error.statusCode : 500 });
  }
};

// Health check endpoint
export const GET = async (req: NextRequest) => {
  try {
    authenticateRequest(req);
    
    return NextResponse.json({
      success: true,
      message: 'Job cleanup API is healthy',
      config: {
        maxAge: CONFIG.MAX_AGE_DAYS,
        batchSize: CONFIG.BATCH_SIZE,
        maxDeletions: CONFIG.MAX_DELETIONS_PER_RUN,
        safetyThreshold: CONFIG.SAFETY_THRESHOLD,
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed'
    }, { status: 500 });
  }
};
