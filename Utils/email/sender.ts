//  EMAIL SENDER - PRODUCTION READY

import { apiLogger } from '@/lib/api-logger';
import { getResendClient, EMAIL_CONFIG, assertValidFrom } from './clients';
import { getBaseUrl } from '../url-helpers';
import { createWelcomeEmail, createJobMatchesEmail } from './productionReadyTemplates';
import { EmailJobCard } from './types';

// Welcome email sender using production templates
export async function sendWelcomeEmail(args: { to: string; userName?: string; matchCount: number; tier?: 'free' | 'premium'; }) {
  const startTime = Date.now();
  
  apiLogger.info('sendWelcomeEmail called', { 
    to: args.to, 
    userName: args.userName, 
    matchCount: args.matchCount,
    tier: args.tier
  });
  console.log(`[EMAIL] sendWelcomeEmail called for ${args.to}`);
  
  // Check API key BEFORE creating client
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const error = new Error('RESEND_API_KEY environment variable is not set');
    console.error(`[EMAIL] ❌ Missing API key`);
    apiLogger.error('RESEND_API_KEY missing', error);
    throw error;
  }
  
  if (!apiKey.startsWith('re_')) {
    const error = new Error(`Invalid RESEND_API_KEY format: must start with "re_"`);
    console.error(`[EMAIL] ❌ Invalid API key format`);
    apiLogger.error('Invalid RESEND_API_KEY format', error);
    throw error;
  }
  
  try {
    const resend = getResendClient();
    console.log(`[EMAIL] Resend client initialized. API Key present: true`);
    
    // Use production template
    const matchesLabel = args.matchCount === 1 ? 'match' : 'matches';
    const htmlContent = createWelcomeEmail(args.userName, args.matchCount, args.to);
    const baseUrl = getBaseUrl();
    const textContent =
`Welcome to JobPing!

We've already queued your first ${args.matchCount} ${matchesLabel}. Expect them within the next 24 hours, followed by fresh drops each week.

Tip: add hello@getjobping.com to your contacts so nothing hits spam. Need to tweak your preferences? Visit ${baseUrl}/preferences or reply to this email and we'll help.

— The JobPing Team`;
    
    apiLogger.info('Email content generated', { from: EMAIL_CONFIG.from });
    assertValidFrom(EMAIL_CONFIG.from);
    
    apiLogger.info('Attempting to send welcome email', { to: args.to, from: EMAIL_CONFIG.from });
    console.log(`[EMAIL] Attempting to send welcome email from ${EMAIL_CONFIG.from} to ${args.to}`);
    
    // Add timeout to prevent hanging
    const sendPromise = resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [args.to],
      subject: `Welcome to JobPing – ${args.matchCount} ${matchesLabel} already in progress`,
      text: textContent,
      html: htmlContent,
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email send timeout after 15 seconds')), 15000)
    );
    
    const result = await Promise.race([sendPromise, timeoutPromise]) as any;
    
    // Handle Resend response format
    if (result?.error) {
      throw new Error(`Resend API error: ${JSON.stringify(result.error)}`);
    }
    
    const emailId = result?.data?.id || result?.id || 'unknown';
    
    // Track successful send
    trackEmailSend(true, Date.now() - startTime);
    apiLogger.info('Welcome email sent successfully', { 
      to: args.to, 
      emailId,
      duration: Date.now() - startTime 
    });
    console.log(`[EMAIL] ✅ Welcome email sent successfully to ${args.to}. Email ID: ${emailId}`);
    return result;
  } catch (error) {
    // Track failed send
    trackEmailSend(false, Date.now() - startTime);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const apiKeyPrefix = process.env.RESEND_API_KEY?.substring(0, 10) || 'none';
    console.error(`[EMAIL] ❌ sendWelcomeEmail failed for ${args.to}:`, errorMessage);
    console.error(`[EMAIL] API Key prefix: ${apiKeyPrefix}...`);
    console.error(`[EMAIL] Error stack:`, errorStack);
    apiLogger.error('sendWelcomeEmail failed', error as Error, { 
      to: args.to,
      errorMessage,
      errorStack,
      errorType: error?.constructor?.name,
      apiKeyPrefix,
      duration: Date.now() - startTime
    });
    throw error;
  }
}

// Job matches email sender using production templates
export async function sendMatchedJobsEmail(args: {
  to: string;
  jobs: any[];
  userName?: string;
  subscriptionTier?: 'free' | 'premium';
  isSignupEmail?: boolean;
  subjectOverride?: string;
}) {
  const startTime = Date.now();
  
  apiLogger.info('sendMatchedJobsEmail called', { 
    to: args.to, 
    jobsCount: args.jobs.length,
    userName: args.userName,
    isSignupEmail: args.isSignupEmail
  });
  console.log(`[EMAIL] sendMatchedJobsEmail called for ${args.to} with ${args.jobs.length} jobs`);
  
  // Check API key BEFORE creating client
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const error = new Error('RESEND_API_KEY environment variable is not set');
    console.error(`[EMAIL] ❌ Missing API key`);
    apiLogger.error('RESEND_API_KEY missing', error);
    throw error;
  }
  
  if (!apiKey.startsWith('re_')) {
    const error = new Error(`Invalid RESEND_API_KEY format: must start with "re_"`);
    console.error(`[EMAIL] ❌ Invalid API key format`);
    apiLogger.error('Invalid RESEND_API_KEY format', error);
    throw error;
  }
  
  try {
    const resend = getResendClient();
    console.log(`[EMAIL] Resend client initialized for matched jobs. API Key present: true`);
    
    // Convert jobs to EmailJobCard format for template
    // Include ALL fields needed for email template (tags, formatting, etc.)
    const jobCards: EmailJobCard[] = args.jobs.map(job => ({
      job: {
        id: job.id || '',
        title: job.title || 'Job Title',
        company: job.company || 'Company',
        location: job.location || 'Location',
        description: job.description || '',
        job_url: job.job_url || job.jobUrl || '',
        job_hash: job.job_hash || job.jobHash || '', // Explicitly include job_hash for feedback
        user_email: args.to,
        // Fields needed for formatJobTags
        career_path: job.career_path,
        careerPath: job.careerPath,
        primary_category: job.primary_category || (Array.isArray(job.categories) ? job.categories[0] : undefined),
        categories: job.categories || [],
        career_paths: job.career_paths || job.categories || [],
        work_environment: job.work_environment,
        work_arrangement: job.work_arrangement,
        work_mode: job.work_mode,
        employment_type: job.employment_type,
        job_type: job.job_type,
        contract_type: job.contract_type,
        source: job.source,
        language_requirement: job.language_requirement,
        language: job.language,
        primary_language: job.primary_language,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        salary: job.salary,
        salary_currency: job.salary_currency,
        currency: job.currency,
        compensation_min: job.compensation_min,
        compensation_max: job.compensation_max,
        // Include any other fields that might be present
        ...(job as any)
      },
      matchResult: {
        match_score: job.match_score || 85,
        reasoning: job.reasoning || job.match_reason || 'AI-matched based on your preferences'
      },
      isConfident: (job.match_score || 85) >= 80,
      isPromising: (job.match_score || 85) >= 70,
      hasManualLocator: false,
      searchHint: job.search_hint || ''
    }));
    
    const subject = args.subjectOverride || `Your ${args.jobs.length} New Job Matches - JobPing`;
    
    // Use production template
    const htmlContent = createJobMatchesEmail(
      jobCards,
      args.userName,
      args.subscriptionTier || 'free',
      args.isSignupEmail || false,
      args.to // Pass user email explicitly for links
    );
    
    const textContent = `Hi ${args.userName || 'there'},\n\nHere are your latest job matches:\n\n${args.jobs.map((job, i) => `${i + 1}. ${job.title} at ${job.company}`).join('\n')}`;
    
    apiLogger.info('Email content generated for matched jobs', { from: EMAIL_CONFIG.from, subject });
    assertValidFrom(EMAIL_CONFIG.from);
    
    apiLogger.info('Attempting to send matched jobs email', { to: args.to, from: EMAIL_CONFIG.from });
    console.log(`[EMAIL] Attempting to send matched jobs email from ${EMAIL_CONFIG.from} to ${args.to}`);
    
    // Add timeout to prevent hanging
    const sendPromise = resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [args.to],
      subject,
      text: textContent,
      html: htmlContent,
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email send timeout after 15 seconds')), 15000)
    );
    
    const result = await Promise.race([sendPromise, timeoutPromise]) as any;
    
    // Handle Resend response format
    if (result?.error) {
      throw new Error(`Resend API error: ${JSON.stringify(result.error)}`);
    }
    
    const emailId = result?.data?.id || result?.id || 'unknown';
    
    // Track successful send
    trackEmailSend(true, Date.now() - startTime);
    apiLogger.info('Matched jobs email sent successfully', { 
      to: args.to, 
      emailId,
      jobsCount: args.jobs.length,
      duration: Date.now() - startTime 
    });
    console.log(`[EMAIL] ✅ Matched jobs email sent successfully to ${args.to}. Email ID: ${emailId}`);
    return result;
  } catch (error) {
    // Track failed send
    trackEmailSend(false, Date.now() - startTime);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const apiKeyPrefix = process.env.RESEND_API_KEY?.substring(0, 10) || 'none';
    console.error(`[EMAIL] ❌ sendMatchedJobsEmail failed for ${args.to}:`, errorMessage);
    console.error(`[EMAIL] API Key prefix: ${apiKeyPrefix}...`);
    console.error(`[EMAIL] Error stack:`, errorStack);
    apiLogger.error('sendMatchedJobsEmail failed', error as Error, { 
      to: args.to,
      jobsCount: args.jobs.length,
      errorMessage,
      errorStack,
      errorType: error?.constructor?.name,
      apiKeyPrefix,
      duration: Date.now() - startTime
    });
    throw error;
  }
}

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
};

// Exponential backoff retry function
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = RETRY_CONFIG.maxRetries
): Promise<T> {
  let lastError: Error;
  let retryCount = 0;
  let rateLimited = false;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      retryCount = attempt;
      
      // Check for rate limiting
      if (error instanceof Error && error.message.includes('rate limit')) {
        rateLimited = true;
      }
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
        RETRY_CONFIG.maxDelay
      );
      
      apiLogger.warn(`Email send attempt ${attempt + 1} failed, retrying in ${delay}ms`, error as Error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Batch email sender with retry logic and rate limiting
export async function sendBatchEmails(
  emails: Array<{
    to: string;
    jobs: any[];
    userName?: string;
    subscriptionTier?: 'free' | 'premium';
    isSignupEmail?: boolean;
  }>,
  concurrency: number = 3
): Promise<any[]> {
  const results: any[] = [];
  let rateLimitDelay = 0;
  
  // Process emails in batches for controlled concurrency
  for (let i = 0; i < emails.length; i += concurrency) {
    const batch = emails.slice(i, i + concurrency);
    
    // Apply rate limiting delay if needed
    if (rateLimitDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
      rateLimitDelay = 0; // Reset after applying delay
    }
    
    const batchPromises = batch.map(async (emailData) => {
      const startTime = Date.now();
      let retryCount = 0;
      let rateLimited = false;
      
      try {
        return await withRetry(() => sendMatchedJobsEmail(emailData));
      } catch (error) {
        // Check for rate limiting errors
        if (error instanceof Error && error.message.includes('rate limit')) {
          rateLimitDelay = 5000; // 5 second delay for next batch
          rateLimited = true;
        }
        
        // Track failed send with retry info
        trackEmailSend(false, Date.now() - startTime, retryCount, rateLimited);
        
        return {
          error: error instanceof Error ? error.message : 'Unknown error',
          email: emailData.to,
          status: 'failed'
        };
      }
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults.map(result => 
      result.status === 'fulfilled' ? result.value : result.reason
    ));
    
    // Adaptive delay between batches (longer if we hit rate limits)
    const delay = rateLimitDelay > 0 ? 2000 : 500; // 2s if rate limited, 500ms otherwise
    if (i + concurrency < emails.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
}

// Real performance monitoring
interface EmailMetrics {
  totalSent: number;
  totalFailed: number;
  retryAttempts: number;
  rateLimitHits: number;
  averageResponseTime: number;
  lastReset: Date;
}

const emailMetrics: EmailMetrics = {
  totalSent: 0,
  totalFailed: 0,
  retryAttempts: 0,
  rateLimitHits: 0,
  averageResponseTime: 0,
  lastReset: new Date()
};

// Track email send attempt
function trackEmailSend(success: boolean, responseTime: number, retries: number = 0, rateLimited: boolean = false) {
  if (success) {
    emailMetrics.totalSent++;
  } else {
    emailMetrics.totalFailed++;
  }
  
  emailMetrics.retryAttempts += retries;
  if (rateLimited) {
    emailMetrics.rateLimitHits++;
  }
  
  // Update average response time
  const totalAttempts = emailMetrics.totalSent + emailMetrics.totalFailed;
  emailMetrics.averageResponseTime = 
    (emailMetrics.averageResponseTime * (totalAttempts - 1) + responseTime) / totalAttempts;
}

export const EMAIL_PERFORMANCE_METRICS = {
  getTotalSent: () => emailMetrics.totalSent,
  getTotalFailed: () => emailMetrics.totalFailed,
  getSuccessRate: () => {
    const total = emailMetrics.totalSent + emailMetrics.totalFailed;
    return total > 0 ? `${((emailMetrics.totalSent / total) * 100).toFixed(1)}%` : '0%';
  },
  getRetryAttempts: () => emailMetrics.retryAttempts,
  getRateLimitHits: () => emailMetrics.rateLimitHits,
  getAverageResponseTime: () => `${emailMetrics.averageResponseTime.toFixed(0)}ms`,
  getMetrics: () => ({ ...emailMetrics }),
  reset: () => {
    emailMetrics.totalSent = 0;
    emailMetrics.totalFailed = 0;
    emailMetrics.retryAttempts = 0;
    emailMetrics.rateLimitHits = 0;
    emailMetrics.averageResponseTime = 0;
    emailMetrics.lastReset = new Date();
  }
};

// Export tracking function for internal use
export { trackEmailSend };
