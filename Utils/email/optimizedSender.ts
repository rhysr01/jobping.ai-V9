// 🚀 OPTIMIZED EMAIL SENDER - PRODUCTION READY

import { EmailJobCard } from './types';
import { getResendClient, getSupabaseClient, EMAIL_CONFIG } from './clients';
import { createWelcomeEmailOptimized, createJobMatchesEmailOptimized } from './gmailOptimized';
import { createWelcomeEmailText, createJobMatchesEmailText } from './textGenerator';
import { addEngagementTracking } from './engagementTracking';
import crypto from 'crypto';

// Performance optimizations
const EMAIL_CACHE = new Map<string, { html: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Optimized job data processing
function processJobData(jobs: any[], recipientEmail: string): EmailJobCard[] {
  return jobs.map(job => ({
    job: {
      title: job.title || job.job_title || 'Job Title',
      company: job.company || job.company_name || 'Company',
      location: job.location || job.job_location || 'Location',
      job_url: job.job_url || job.url || '', // CRITICAL: Include job URL for Apply buttons
      description: job.description || job.job_description || '',
      job_hash: job.job_hash || job.id || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_email: recipientEmail
    },
    matchResult: {
      match_score: job.match_score || job.matchResult?.match_score || 85,
      confidence: job.confidence || job.matchResult?.confidence || 0.8
    },
    isConfident: job.isConfident ?? true,
    isPromising: job.isPromising ?? false,
    hasManualLocator: job.hasManualLocator ?? false
  }));
}

// Efficient idempotency token generation
function generateSendToken(recipientEmail: string, jobs: any[]): string {
  const date = new Date().toISOString().split('T')[0];
  const jobsHash = crypto.createHash('md5')
    .update(jobs.map(j => j.job_hash || j.id).join('|'))
    .digest('hex').slice(0, 8);
  return `${recipientEmail}_${date}_${jobsHash}`;
}

// Generate unsubscribe token for List-Unsubscribe header
function generateUnsubscribeToken(email: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET || 'fallback-secret';
  return crypto.createHmac('sha256', secret)
    .update(email)
    .digest('hex').slice(0, 16);
}

// Create enhanced deliverability headers with plain-text support
function createDeliverabilityHeaders(email: string): Record<string, string> {
  const token = generateUnsubscribeToken(email);
  const oneClickUrl = `${EMAIL_CONFIG.unsubscribeBase}/one-click?u=${encodeURIComponent(email)}&t=${token}`;
  
  return {
    'List-Unsubscribe': `<mailto:${EMAIL_CONFIG.listUnsubscribeEmail}>, <${oneClickUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'X-Mailer': 'JobPing Email System v1.0',
    'X-Priority': '3',
    'X-MSMail-Priority': 'Normal',
    'Importance': 'Normal'
  };
}

// Cached email generation
function getCachedEmail(key: string, generator: () => string): string {
  const cached = EMAIL_CACHE.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.html;
  }
  
  const html = generator();
  EMAIL_CACHE.set(key, { html, timestamp: Date.now() });
  return html;
}

// Check email suppression before sending
async function isEmailSuppressed(email: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('email_suppression')
      .select('user_email')
      .eq('user_email', email)
      .single();
    
    return !!data;
  } catch {
    // If table doesn't exist or query fails, don't suppress
    return false;
  }
}

// Optimized welcome email sender
export async function sendWelcomeEmail({
  to,
  userName,
  matchCount,
  tier = 'free',
}: {
  to: string;
  userName?: string;
  matchCount: number;
  tier?: 'free' | 'premium';
}) {
  try {
    // Check suppression list
    if (await isEmailSuppressed(to)) {
      console.log(`📧 Email suppressed: ${to}`);
      return { suppressed: true };
    }

    const resend = getResendClient();
    
    // Generate email with caching (include tier in cache key)
    const cacheKey = `welcome_${userName}_${matchCount}_${tier}`;
    const baseHtml = getCachedEmail(cacheKey, () => createWelcomeEmailOptimized(userName, matchCount, tier));
    
    // Add engagement tracking to HTML
    const html = addEngagementTracking(baseHtml, to);
    const text = createWelcomeEmailText(userName, matchCount, tier);
    const unsubscribeHeaders = createDeliverabilityHeaders(to);
    
    console.log(`📧 Sending welcome email from: ${EMAIL_CONFIG.from} to: ${to}`);
    
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [to],
      subject: '🎯 Welcome to JobPing - Your AI Career Assistant is Ready!',
      html: html,
      text: text,
      headers: unsubscribeHeaders,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      throw error;
    }

    console.log('✅ Welcome email sent successfully, Email ID:', data?.id);
    return data;
  } catch (error) {
    console.error('❌ Welcome email failed:', error);
    throw error;
  }
}

// Optimized job matches email sender
export async function sendMatchedJobsEmail({
  to,
  jobs,
  userName,
  subscriptionTier = 'free',
  isSignupEmail = false,
  subjectOverride,
  personalization,
}: {
  to: string;
  jobs: any[];
  userName?: string;
  subscriptionTier?: 'free' | 'premium';
  isSignupEmail?: boolean;
  subjectOverride?: string;
  personalization?: {
    role?: string;
    location?: string;
    salaryRange?: string;
    dayText?: string;
    entryLevelLabel?: string;
  };
}) {
  try {
    // Check suppression list first
    if (await isEmailSuppressed(to)) {
      console.log(`📧 Email suppressed: ${to}`);
      return { suppressed: true };
    }

    // Generate idempotency token
    const sendToken = generateSendToken(to, jobs);
    
    // Check if email already sent (idempotency)
    const supabase = getSupabaseClient();
    const { data: existingSend } = await supabase
      .from('email_sends')
      .select('id')
      .eq('send_token', sendToken)
      .single();
    
    if (existingSend) {
      console.log(`📧 Email already sent: ${sendToken}`);
      return { id: existingSend.id, alreadySent: true };
    }

    // Process job data efficiently
    const jobCards = processJobData(jobs, to);
    
    // Generate email with caching
    const cacheKey = `matches_${jobs.length}_${subscriptionTier}_${isSignupEmail}`;
    const baseHtml = getCachedEmail(cacheKey, () => 
      createJobMatchesEmailOptimized(jobCards, userName, subscriptionTier, isSignupEmail, personalization)
    );
    
    // Add engagement tracking to HTML
    const html = addEngagementTracking(baseHtml, to);
    const text = createJobMatchesEmailText(jobs, userName, subscriptionTier, isSignupEmail, personalization);
    
    const subject = subjectOverride ?? (isSignupEmail 
      ? `🎯 Welcome to JobPing - ${jobs.length} Job Matches Found!`
      : `🎯 ${jobs.length} Fresh Job Matches - JobPing`);

    // Send email with optimized retry logic
    const resend = getResendClient();
    let lastError: any;
    
    for (let attempt = 1; attempt <= EMAIL_CONFIG.maxRetries; attempt++) {
      try {
        const { data, error } = await resend.emails.send({
          from: EMAIL_CONFIG.from,
          to: [to],
          subject: subject,
          html: html,
          text: text,
          headers: createDeliverabilityHeaders(to),
        });

        if (error) throw error;

        // Record successful send
        await supabase.from('email_sends').insert({
          send_token: sendToken,
          user_email: to,
          email_type: isSignupEmail ? 'welcome' : 'job_matches',
          jobs_count: jobs.length,
          sent_at: new Date().toISOString(),
          status: 'sent'
        });

        console.log(`✅ Email sent successfully (attempt ${attempt})`);
        return { ...data, sendToken };
        
      } catch (error) {
        lastError = error;
        console.error(`❌ Email attempt ${attempt} failed:`, error instanceof Error ? error.message : String(error));
        
        if (attempt < EMAIL_CONFIG.maxRetries) {
          const delay = Math.pow(2, attempt) * EMAIL_CONFIG.retryDelay;
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // Record failure
    await supabase.from('email_sends').insert({
      send_token: sendToken,
      user_email: to,
      email_type: isSignupEmail ? 'welcome' : 'job_matches',
      jobs_count: jobs.length,
      sent_at: new Date().toISOString(),
      status: 'failed',
      error_message: lastError?.message || 'Unknown error'
    });
    
    throw lastError;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
}

// Batch email sender for multiple recipients
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
  
  // Process emails in batches for controlled concurrency
  for (let i = 0; i < emails.length; i += concurrency) {
    const batch = emails.slice(i, i + concurrency);
    const batchPromises = batch.map(emailData => 
      sendMatchedJobsEmail(emailData).catch(error => ({
        error: error.message,
        email: emailData.to,
        status: 'failed'
      }))
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults.map(result => 
      result.status === 'fulfilled' ? result.value : result.reason
    ));
    
    // Small delay between batches to avoid overwhelming the email service
    if (i + concurrency < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// Performance monitoring
export const EMAIL_PERFORMANCE_METRICS = {
  cacheHitRate: () => {
    const total = EMAIL_CACHE.size;
    const hits = Array.from(EMAIL_CACHE.values()).filter(c => Date.now() - c.timestamp < CACHE_TTL).length;
    return total > 0 ? (hits / total * 100).toFixed(1) + '%' : '0%';
  },
  cacheSize: () => EMAIL_CACHE.size,
  clearCache: () => EMAIL_CACHE.clear(),
  getCacheStats: () => ({
    size: EMAIL_CACHE.size,
    hitRate: EMAIL_PERFORMANCE_METRICS.cacheHitRate(),
    ttl: CACHE_TTL / 1000 + 's'
  })
};
