//  EMAIL SENDER - PRODUCTION READY

import { getResendClient, EMAIL_CONFIG, assertValidFrom } from './clients';
import { createWelcomeEmail, createJobMatchesEmail } from './productionReadyTemplates';
import { EmailJobCard } from './types';

// Welcome email sender using production templates
export async function sendWelcomeEmail(args: { to: string; userName?: string; matchCount: number; tier?: 'free' | 'premium'; }) {
  const startTime = Date.now();
  const resend = getResendClient();
  
  try {
    // Use production template
    const htmlContent = createWelcomeEmail(args.userName, args.matchCount);
    const textContent = `Welcome to JobPing!\n\nYour first ${args.matchCount} job matches will arrive within 48 hours.\n\nBest regards,\nThe JobPing Team`;
    
    assertValidFrom(EMAIL_CONFIG.from);
    
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [args.to],
      subject: `Welcome to JobPing - Your First ${args.matchCount} Matches Arriving Soon!`,
      text: textContent,
      html: htmlContent,
    });
    
    // Track successful send
    trackEmailSend(true, Date.now() - startTime);
    return result;
  } catch (error) {
    // Track failed send
    trackEmailSend(false, Date.now() - startTime);
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
  const resend = getResendClient();
  
  try {
    // Convert jobs to EmailJobCard format for template
    const jobCards: EmailJobCard[] = args.jobs.map(job => ({
      job: {
        id: job.id || '',
        title: job.title || 'Job Title',
        company: job.company || 'Company',
        location: job.location || 'Location',
        description: job.description || '',
        job_url: job.job_url || '',
        user_email: args.to
      },
      matchResult: {
        match_score: job.match_score || 85,
        reasoning: job.reasoning || 'AI-matched based on your preferences'
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
      args.isSignupEmail || false
    );
    
    const textContent = `Hi ${args.userName || 'there'},\n\nHere are your latest job matches:\n\n${args.jobs.map((job, i) => `${i + 1}. ${job.title} at ${job.company}`).join('\n')}`;
    
    assertValidFrom(EMAIL_CONFIG.from);
    
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [args.to],
      subject,
      text: textContent,
      html: htmlContent,
    });
    
    // Track successful send
    trackEmailSend(true, Date.now() - startTime);
    return result;
  } catch (error) {
    // Track failed send
    trackEmailSend(false, Date.now() - startTime);
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
      
      console.warn(`Email send attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
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
