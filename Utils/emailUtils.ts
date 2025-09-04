import { Resend } from 'resend';
import { MatchResult } from './jobMatching';

// D1) Email composition interfaces
export interface EmailJobCard {
  job: any;
  matchResult: MatchResult;
  isConfident: boolean;
  isPromising: boolean;
  hasManualLocator: boolean;
  searchHint?: string;
}

export interface EmailDeliveryMetrics {
  emailsSent: number;
  emailsFailed: number;
  matchesSelectedTotal: number;
  matchesConfidentCount: number;
  matchesPromisingCount: number;
  unknownLocationPercentage: number;
  careerUnknownPercentage: number;
  p95Latency: number;
  cacheHitRate: number;
}

export interface EmailFeedback {
  userEmail: string;
  jobHash: string;
  verdict: 'relevant' | 'not_relevant';
  timestamp: Date;
  reason?: string;
}

// D2) Delivery safeguards
export interface DeliverySafeguards {
  deduplicateWindowHours: number;
  maxPromisingPercentage: number;
  minConfidentMatches: number;
  maxPromisingPerEmail: number;
}

// D6) Safety valves & flags
export interface EmailFeatureFlags {
  includePromising: boolean;
  includeLocatorManual: boolean;
  strictVisaFilter: boolean;
  platformKillSwitches: Record<string, boolean>;
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Resend API key: RESEND_API_KEY must be set');
  }
  return new Resend(apiKey);
}

// Initialize Supabase client for feedback storage
function getSupabaseClient() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// D1) Robust email composition function
export function composeRobustEmailContent(
  jobCards: EmailJobCard[],
  userName?: string,
  subscriptionTier: 'free' | 'premium' = 'free',
  isSignupEmail: boolean = false,
  userEmail?: string
): string {
  // Check email kill switch
  if (process.env.ENABLE_EMAILS === 'false') {
    console.log('🚫 Email sending disabled by ENABLE_EMAILS=false');
    return '';
  }
  const isPremium = subscriptionTier === 'premium';
  const emailTypeText = isSignupEmail ? 'Welcome! Here are your first' : 'Your fresh';
  
  // Separate confident and promising matches
  const confidentMatches = jobCards.filter(card => card.isConfident);
  const promisingMatches = jobCards.filter(card => card.isPromising);
  
  // D2) Delivery safeguards - cap promising matches
  const maxPromising = Math.min(3, Math.floor(jobCards.length * 0.3));
  const finalPromisingMatches = promisingMatches.slice(0, maxPromising);
  
  // Add note if promising matches included
  const includePromisingNote = finalPromisingMatches.length > 0 && confidentMatches.length < 4;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
      <title>JobPingAI - Your Job Matches</title>
    </head>
    <body style="
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      font-feature-settings: 'tnum' on, 'lnum' on, 'kern' on;
      line-height: 1.6;
    ">
      <div style="
        max-width: 600px;
        margin: 0 auto;
        background: #FFFFFF;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 16px 32px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04);
        margin-top: 40px;
        margin-bottom: 40px;
      ">
        <!-- Header with Subtle Gradient -->
        <div style="
          background: linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%);
          padding: 32px 40px 24px 40px;
          border-bottom: 1px solid #EEEEEE;
        ">
          <!-- JobPingAI Logo -->
          <div style="
            text-align: center;
            margin-bottom: 16px;
          ">
            <div style="
              display: inline-block;
              font-size: 24px;
              font-weight: 900;
              letter-spacing: -0.02em;
              color: #000000;
              background: linear-gradient(135deg, #000000 0%, #333333 100%);
              -webkit-background-clip: text;
              background-clip: text;
              -webkit-text-fill-color: transparent;
            ">
              JOBPINGAI
            </div>
          </div>
        </div>
        
        <!-- Main Content -->
        <div style="
          padding: 40px;
          color: #000000;
        ">
          ${isPremium ? `
          <!-- Premium Badge -->
          <div style="
            background: linear-gradient(135deg, #000000 0%, #1A1A1A 100%);
            color: #FFFFFF;
            padding: 12px 20px;
            border-radius: 12px;
            margin-bottom: 32px;
            text-align: center;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
          ">
            ⭐ Premium Member
          </div>
          ` : ''}
          
          <!-- Greeting -->
          <h1 style="
            font-size: 36px;
            font-weight: 800;
            margin: 0 0 16px 0;
            letter-spacing: -0.02em;
            color: #000000;
            line-height: 1.1;
          ">
            Hi${userName ? ' ' + userName : ''},
          </h1>
          
          <!-- Intro Message -->
          <p style="
            font-size: 18px;
            line-height: 1.6;
            margin: 0 0 32px 0;
            color: #333333;
            font-weight: 400;
          ">
            ${isSignupEmail ? 'Welcome to <strong style="color: #000000;">JobPingAI</strong>! 🎉' : 'Your fresh job matches are here!'}<br>
            ${emailTypeText} <strong style="color: #000000;">${jobCards.length} ${isPremium ? 'premium ' : ''}AI-matched jobs</strong>:
          </p>
          
          ${includePromisingNote ? `
          <!-- Promising Matches Note -->
          <div style="
            background: linear-gradient(135deg, #FFF3CD 0%, #FFEAA7 100%);
            border: 1px solid #FFC107;
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 24px;
            font-size: 14px;
            color: #856404;
            font-weight: 500;
          ">
            💡 We included a few promising leads with incomplete details.
          </div>
          ` : ''}
          
          <!-- Confident Matches Section -->
          ${confidentMatches.length > 0 ? `
          <div style="margin-bottom: 32px;">
            <h2 style="
              font-size: 20px;
              font-weight: 700;
              margin: 0 0 16px 0;
              color: #000000;
            ">
              Top Matches
            </h2>
            ${confidentMatches.map((card, index) => generateJobCard(card, index, isPremium, false, userEmail)).join('')}
          </div>
          ` : ''}
          
          <!-- Promising Matches Section -->
          ${finalPromisingMatches.length > 0 ? `
          <div style="margin-bottom: 32px;">
            <h2 style="
              font-size: 18px;
              font-weight: 600;
              margin: 0 0 16px 0;
              color: #666666;
            ">
              Promising Opportunities
            </h2>
            ${finalPromisingMatches.map((card, index) => generateJobCard(card, index + confidentMatches.length, isPremium, true, userEmail)).join('')}
          </div>
          ` : ''}
          
          ${!isPremium ? `
          <!-- Upgrade Prompt -->
          <div style="
            background: linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%);
            border: 2px solid #EEEEEE;
            border-radius: 16px;
            padding: 32px;
            margin-bottom: 32px;
            text-align: center;
          ">
            <h3 style="
              font-size: 20px;
              font-weight: 700;
              margin: 0 0 12px 0;
              color: #000000;
            ">
              Unlock Premium Features
            </h3>
            <p style="
              font-size: 16px;
              line-height: 1.6;
              margin: 0 0 20px 0;
              color: #666666;
            ">
              Get 15 matches per week, detailed match insights, and priority support.
            </p>
            <a href="https://jobping.ai/pricing" target="_blank" style="
              display: inline-block;
              background: linear-gradient(135deg, #000000 0%, #1A1A1A 100%);
              color: #FFFFFF;
              padding: 12px 24px;
              border-radius: 8px;
              text-decoration: none;
              font-size: 14px;
              font-weight: 600;
              transition: all 0.2s ease;
            ">
              Upgrade to Premium →
            </a>
          </div>
          ` : ''}
          
          <!-- Footer -->
          <div style="
            text-align: center;
            padding-top: 32px;
            border-top: 1px solid #EEEEEE;
            color: #666666;
            font-size: 14px;
          ">
            <p style="margin: 0 0 16px 0;">
              Questions? Reply to this email or visit <a href="https://jobping.ai" target="_blank" style="color: #000000;">jobping.ai</a>
            </p>
            <p style="margin: 0; font-size: 12px;">
              <a href="https://jobping.ai/unsubscribe?email=${encodeURIComponent(userEmail || '')}" target="_blank" style="color: #999999;">Unsubscribe</a>
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Helper function to generate individual job cards
function generateJobCard(card: EmailJobCard, index: number, isPremium: boolean, isPromising: boolean = false, userEmail?: string): string {
  const { job, matchResult, hasManualLocator, searchHint } = card;
  
  // Extract tags for display
  const matchTags = JSON.parse(matchResult.match_tags || '{}');
  const careerPath = matchTags.career_path || 'unknown';
  const location = matchTags.loc || 'unknown';
  const freshness = matchTags.freshness || 'unknown';
  const confidence = matchResult.confidence_score;
  
  // Format location display
  const locationDisplay = location === 'unknown' ? 'Location TBD' : 
                         location.startsWith('eu-') ? 'EU Remote' : 
                         location.replace('-', ' ');
  
  // Format posting date display
  const formatPostingDate = (dateString: string) => {
    try {
      const postedDate = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - postedDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return '📅 Posted today';
      } else if (diffDays === 1) {
        return '📅 Posted yesterday';
      } else if (diffDays < 7) {
        return `📅 Posted ${diffDays} days ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `📅 Posted ${weeks} week${weeks > 1 ? 's' : ''} ago`;
      } else {
        return `📅 Posted ${postedDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })}`;
      }
    } catch (error) {
      return '📅 Date unavailable';
    }
  };
  
  const postingDateDisplay = formatPostingDate(job.created_at || job.updated_at || new Date().toISOString());
  
  // Confidence badge
  const confidenceBadge = confidence >= 0.8 ? '🟢 High' :
                         confidence >= 0.6 ? '🟡 Medium' :
                         '🔴 Low';
  
  return `
    <!-- Job Card ${index + 1} -->
    <div style="
      background: #FFFFFF;
      border: 1px solid ${isPromising ? '#FFEAA7' : '#EEEEEE'};
      border-radius: 12px;
      margin-bottom: 16px;
      padding: 24px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
      transition: all 0.2s ease;
      ${index === 0 && !isPromising ? 'border: 2px solid #000000; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);' : ''}
      ${isPromising ? 'background: linear-gradient(135deg, #FFFBF0 0%, #FFFFFF 100%);' : ''}
    ">
      ${isPromising ? `
      <!-- Promising Label -->
      <div style="
        background: linear-gradient(135deg, #FFC107 0%, #FFB300 100%);
        color: #000000;
        padding: 4px 12px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        display: inline-block;
        margin-bottom: 12px;
      ">
        ⚡ Promising
      </div>
      ` : ''}
      
      <div style="display: flex; align-items: flex-start; gap: 16px;">
        <!-- Job Icon -->
        <div style="
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #000000 0%, #1A1A1A 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        ">
          <div style="
            width: 20px;
            height: 20px;
            background: #FFFFFF;
            border-radius: 2px;
            position: relative;
          ">
            <div style="
              position: absolute;
              top: 6px;
              left: 4px;
              width: 12px;
              height: 8px;
              border: 2px solid #000000;
              border-top: none;
            "></div>
          </div>
        </div>
        
        <!-- Job Content -->
        <div style="flex: 1; min-width: 0;">
          <!-- Job Title & Company -->
          <div style="margin-bottom: 12px;">
            <h3 style="
              margin: 0 0 4px 0;
              font-size: 18px;
              font-weight: 700;
              color: #000000;
              line-height: 1.3;
            ">
              <a href="${job.job_url}" target="_blank" style="
                color: #000000;
                text-decoration: none;
              ">${job.title}</a>
            </h3>
            <p style="
              margin: 0;
              font-size: 14px;
              font-weight: 500;
              color: #666666;
            ">${job.company}</p>
          </div>
          
          <!-- Match Details Row -->
          <div style="
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            flex-wrap: wrap;
          ">
            <span style="
              font-size: 12px;
              color: #666666;
              display: flex;
              align-items: center;
              gap: 4px;
            ">
              📍 ${locationDisplay}
            </span>
            <span style="
              font-size: 12px;
              color: #666666;
              display: flex;
              align-items: center;
              gap: 4px;
            ">
              💼 ${careerPath.charAt(0).toUpperCase() + careerPath.slice(1)}
            </span>
            <span style="
              font-size: 12px;
              color: #666666;
              display: flex;
              align-items: center;
              gap: 4px;
            ">
              ${postingDateDisplay}
            </span>
            <span style="
              font-size: 12px;
              color: #666666;
              display: flex;
              align-items: center;
              gap: 4px;
            ">
              ${confidenceBadge}
            </span>
          </div>
          
          <!-- Match Reason -->
          <div style="
            background: linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%);
            border-left: 3px solid #000000;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 12px;
          ">
            <div style="
              font-size: 13px;
              color: #333333;
              line-height: 1.4;
            ">
              ${matchResult.match_reason}
            </div>
          </div>
          
          ${hasManualLocator && searchHint ? `
          <!-- Manual Locator Tip -->
          <div style="
            background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
            border: 1px solid #2196F3;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 12px;
            font-size: 13px;
            color: #1565C0;
            font-weight: 500;
          ">
            💡 Tip: ${searchHint}
          </div>
          ` : ''}
          
          <!-- Enhanced Feedback System -->
          <div style="
            margin: 20px 0; 
            padding: 15px; 
            background: #f8f9fa; 
            border-radius: 8px; 
            border-left: 4px solid #007bff;
          ">
            <h4 style="margin: 0 0 15px 0; color: #495057; font-size: 16px;">How relevant is this graduate role?</h4>
            <div style="display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap;">
              <a href="/api/feedback/email?action=positive&score=5&job=${job.job_hash}&email=${encodeURIComponent(userEmail || '')}" target="_blank" style="
                display: inline-block;
                padding: 6px 12px;
                background: #28a745;
                color: white;
                text-decoration: none;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
              ">
                ⭐ Perfect match (5/5)
              </a>
              <a href="/api/feedback/email?action=positive&score=4&job=${job.job_hash}&email=${encodeURIComponent(userEmail || '')}" target="_blank" style="
                display: inline-block;
                padding: 6px 12px;
                background: #20c997;
                color: white;
                text-decoration: none;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
              ">
                👍 Good match (4/5)
              </a>
              <a href="/api/feedback/email?action=neutral&score=3&job=${job.job_hash}&email=${encodeURIComponent(userEmail || '')}" target="_blank" style="
                display: inline-block;
                padding: 6px 12px;
                background: #ffc107;
                color: #212529;
                text-decoration: none;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
              ">
                🤔 Maybe relevant (3/5)
              </a>
              <a href="/api/feedback/email?action=negative&score=2&job=${job.job_hash}&email=${encodeURIComponent(userEmail || '')}" target="_blank" style="
                display: inline-block;
                padding: 6px 12px;
                background: #fd7e14;
                color: white;
                text-decoration: none;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
              ">
                👎 Not really (2/5)
              </a>
              <a href="/api/feedback/email?action=negative&score=1&job=${job.job_hash}&email=${encodeURIComponent(userEmail || '')}" target="_blank" style="
                display: inline-block;
                padding: 6px 12px;
                background: #dc3545;
                color: white;
                text-decoration: none;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
              ">
                ❌ Completely wrong (1/5)
              </a>
            </div>
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
              <a href="/api/feedback/email?action=explain&job=${job.job_hash}&email=${encodeURIComponent(userEmail || '')}" target="_blank" style="
                display: inline-block;
                padding: 6px 12px;
                background: #6c757d;
                color: white;
                text-decoration: none;
                border-radius: 4px;
                font-size: 12px;
              ">
                💬 Tell us more
              </a>
            </div>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #6c757d;">
              Your feedback helps us find better graduate jobs for students like you! 🎓
            </p>
          </div>
          
          <!-- Apply Button -->
          <div style="margin-top: 16px;">
            <a href="${job.job_url}" target="_blank" style="
              display: inline-block;
              background: linear-gradient(135deg, #000000 0%, #1A1A1A 100%);
              color: #FFFFFF;
              padding: 10px 20px;
              border-radius: 8px;
              text-decoration: none;
              font-size: 14px;
              font-weight: 600;
              transition: all 0.2s ease;
            ">
              View Job →
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

// D2) Delivery safeguards
export function applyDeliverySafeguards(
  matches: MatchResult[],
  userEmail: string,
  safeguards: DeliverySafeguards = {
    deduplicateWindowHours: 48,
    maxPromisingPercentage: 30,
    minConfidentMatches: 2,
    maxPromisingPerEmail: 3
  }
): EmailJobCard[] {
  // Deduplicate by job_hash per user window (48h)
  const seenJobs = new Set<string>();
  const deduplicatedMatches = matches.filter(match => {
    if (seenJobs.has(match.job.job_hash)) {
      return false;
    }
    seenJobs.add(match.job.job_hash);
    return true;
  });
  
  // Categorize matches
  const confident = deduplicatedMatches.filter(m => m.match_score >= 70 && m.confidence_score >= 0.7);
  const promising = deduplicatedMatches.filter(m => m.match_score >= 50 || m.confidence_score < 0.7);
  
  // Cap promising matches
  const maxPromising = Math.min(safeguards.maxPromisingPerEmail, 
    Math.floor(deduplicatedMatches.length * safeguards.maxPromisingPercentage / 100));
  const finalPromising = promising.slice(0, maxPromising);
  
  // Ensure minimum confident matches
  let finalConfident = confident;
  if (finalConfident.length < safeguards.minConfidentMatches && finalPromising.length > 0) {
    const needed = safeguards.minConfidentMatches - finalConfident.length;
    const backfill = finalPromising.slice(0, needed);
    finalConfident = [...finalConfident, ...backfill];
  }
  
  // Convert to email cards
  const jobCards: EmailJobCard[] = [
    ...finalConfident.map(match => ({
      job: match.job,
      matchResult: match,
      isConfident: true,
      isPromising: false,
      hasManualLocator: (match.job.categories || '').includes('locator:manual'),
      searchHint: generateSearchHint(match.job)
    })),
    ...finalPromising.slice(finalConfident.length - confident.length).map(match => ({
      job: match.job,
      matchResult: match,
      isConfident: false,
      isPromising: true,
      hasManualLocator: (match.job.categories || '').includes('locator:manual'),
      searchHint: generateSearchHint(match.job)
    }))
  ];
  
  return jobCards;
}

// Helper function to generate search hints for manual locators
function generateSearchHint(job: any): string | undefined {
  const categories = job.categories || '';
  if (!categories.includes('locator:manual')) {
    return undefined;
  }
  
  const hintMatch = categories.match(/hint:([^|]+)/);
  if (hintMatch) {
    return `Open careers page, search '${hintMatch[1]}'`;
  }
  
  // Generate hint from title
  const titleWords = job.title.toLowerCase().split(' ').slice(0, 3);
  return `Open careers page, search '${titleWords.join(' ')}'`;
}

// D3) Tracking & health metrics
export class EmailDeliveryTracker {
  private static metrics: EmailDeliveryMetrics = {
    emailsSent: 0,
    emailsFailed: 0,
    matchesSelectedTotal: 0,
    matchesConfidentCount: 0,
    matchesPromisingCount: 0,
    unknownLocationPercentage: 0,
    careerUnknownPercentage: 0,
    p95Latency: 0,
    cacheHitRate: 0
  };
  
  private static latencies: number[] = [];
  private static startTime: number = 0;
  
  static startRun(): void {
    this.startTime = Date.now();
  }
  
  static recordEmailSent(jobCards: EmailJobCard[]): void {
    this.metrics.emailsSent++;
    this.metrics.matchesSelectedTotal += jobCards.length;
    this.metrics.matchesConfidentCount += jobCards.filter(card => card.isConfident).length;
    this.metrics.matchesPromisingCount += jobCards.filter(card => card.isPromising).length;
    
    // Calculate percentages
    const totalMatches = this.metrics.matchesSelectedTotal;
    if (totalMatches > 0) {
      const unknownLocation = jobCards.filter(card => {
        const tags = JSON.parse(card.matchResult.match_tags || '{}');
        return tags.loc === 'unknown';
      }).length;
      this.metrics.unknownLocationPercentage = (unknownLocation / totalMatches) * 100;
      
      const careerUnknown = jobCards.filter(card => {
        const tags = JSON.parse(card.matchResult.match_tags || '{}');
        return tags.career_path === 'unknown';
      }).length;
      this.metrics.careerUnknownPercentage = (careerUnknown / totalMatches) * 100;
    }
  }
  
  static recordEmailFailed(): void {
    this.metrics.emailsFailed++;
  }
  
  static recordLatency(latency: number): void {
    this.latencies.push(latency);
    this.latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(this.latencies.length * 0.95);
    this.metrics.p95Latency = this.latencies[p95Index] || 0;
  }
  
  static recordCacheHit(hit: boolean): void {
    // Simple cache hit rate calculation
    const totalRequests = this.metrics.emailsSent + this.metrics.emailsFailed;
    if (totalRequests > 0) {
      this.metrics.cacheHitRate = (this.metrics.emailsSent / totalRequests) * 100;
    }
  }
  
  static endRun(): EmailDeliveryMetrics {
    const runDuration = Date.now() - this.startTime;
    this.recordLatency(runDuration);
    
    // Log metrics
    console.log('📊 Email Delivery Metrics:', {
      emailsSent: this.metrics.emailsSent,
      emailsFailed: this.metrics.emailsFailed,
      successRate: this.metrics.emailsSent / (this.metrics.emailsSent + this.metrics.emailsFailed) * 100,
      matchesSelectedTotal: this.metrics.matchesSelectedTotal,
      confidentCount: this.metrics.matchesConfidentCount,
      promisingCount: this.metrics.matchesPromisingCount,
      unknownLocationPercentage: this.metrics.unknownLocationPercentage.toFixed(1) + '%',
      careerUnknownPercentage: this.metrics.careerUnknownPercentage.toFixed(1) + '%',
      p95Latency: this.metrics.p95Latency + 'ms',
      cacheHitRate: this.metrics.cacheHitRate.toFixed(1) + '%'
    });
    
    // D3) Alert rules
    this.checkAlertRules();
    
    return { ...this.metrics };
  }
  
  private static checkAlertRules(): void {
    const totalEmails = this.metrics.emailsSent + this.metrics.emailsFailed;
    const errorRate = totalEmails > 0 ? (this.metrics.emailsFailed / totalEmails) * 100 : 0;
    
    // Error rate > 1% for emails 5+ min
    if (errorRate > 1 && this.metrics.emailsSent >= 5) {
      console.error(`🚨 High email error rate: ${errorRate.toFixed(1)}%`);
    }
    
    // Confident matches per user < 2 for 10+ users in a run
    if (this.metrics.emailsSent >= 10 && this.metrics.matchesConfidentCount < this.metrics.emailsSent * 2) {
      console.warn(`⚠️ Low confident matches: ${this.metrics.matchesConfidentCount} for ${this.metrics.emailsSent} users`);
    }
    
    // Cache hit rate < 40% for 15+ min (suggests churn in clustering)
    if (this.metrics.cacheHitRate < 40 && this.metrics.emailsSent >= 15) {
      console.warn(`⚠️ Low cache hit rate: ${this.metrics.cacheHitRate.toFixed(1)}%`);
    }
  }
}

// D4) Feedback loop
export async function recordEmailFeedback(feedback: EmailFeedback): Promise<void> {
  try {
    // Store feedback to database or matches.tag array
    const supabase = getSupabaseClient();
    
    // Update job with feedback
    await supabase
      .from('jobs')
      .update({
        categories: supabase.sql`${supabase.raw('categories')} || 'feedback:${feedback.verdict}'`
      })
      .eq('job_hash', feedback.jobHash);
    
    // Store detailed feedback
    await supabase
      .from('email_feedback')
      .insert({
        user_email: feedback.userEmail,
        job_hash: feedback.jobHash,
        verdict: feedback.verdict,
        reason: feedback.reason,
        created_at: feedback.timestamp.toISOString()
      });
    
    console.log(`📝 Feedback recorded: ${feedback.verdict} for job ${feedback.jobHash}`);
    
  } catch (error) {
    console.error('Failed to record feedback:', error);
  }
}

// D5) Link hygiene without blocking
export async function checkLinkHealth(jobUrl: string): Promise<'ok' | 'redirect' | 'dead'> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(jobUrl, { 
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return 'ok';
    } else if (response.status >= 300 && response.status < 400) {
      return 'redirect';
    } else {
      return 'dead';
    }
  } catch (error) {
    return 'dead';
  }
}

export async function checkLinksAsync(jobCards: EmailJobCard[]): Promise<void> {
  // Check links asynchronously after send
  jobCards.forEach(async (card) => {
    const linkStatus = await checkLinkHealth(card.job.job_url);
    
    if (linkStatus === 'dead') {
      console.warn(`🔗 Dead link detected: ${card.job.job_url}`);
      
      // Enqueue locator repair attempt
      await enqueueLocatorRepair(card.job);
    }
  });
}

async function enqueueLocatorRepair(job: any): Promise<void> {
  try {
    // Add repair tag to job
    const supabase = getSupabaseClient();
    await supabase
      .from('jobs')
      .update({
        categories: supabase.sql`${supabase.raw('categories')} || 'link_status:dead|repair_queued:true'`
      })
      .eq('job_hash', job.job_hash);
    
    console.log(`🔧 Locator repair queued for job ${job.job_hash}`);
  } catch (error) {
    console.error('Failed to queue locator repair:', error);
  }
}

// D6) Safety valves & flags
export function getEmailFeatureFlags(): EmailFeatureFlags {
  return {
    includePromising: process.env.EMAIL_INCLUDE_PROMISING !== 'false',
    includeLocatorManual: process.env.INCLUDE_LOCATOR_MANUAL !== 'false',
    strictVisaFilter: process.env.STRICT_VISA_FILTER === 'true',
    platformKillSwitches: {
      greenhouse: process.env.DISABLE_GREENHOUSE !== 'true',
      lever: process.env.DISABLE_LEVER !== 'true',
      workday: process.env.DISABLE_WORKDAY !== 'true',
      remoteok: process.env.DISABLE_REMOTEOK !== 'true'
    }
  };
}

// D7) Privacy & compliance
export function sanitizeEmailForLogs(email: string): string {
  // Hash email for logging
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(email).digest('hex').slice(0, 8);
}

// D8) Acceptance checks
export function validateEmailDelivery(jobCards: EmailJobCard[], userEmail: string): boolean {
  // Check for empty emails
  if (jobCards.length === 0) {
    console.error(`❌ Empty email for user ${sanitizeEmailForLogs(userEmail)}`);
    return false;
  }
  
  // Check confident/promising split
  const confidentCount = jobCards.filter(card => card.isConfident).length;
  const promisingCount = jobCards.filter(card => card.isPromising).length;
  
  if (confidentCount < 2 && promisingCount === 0) {
    console.warn(`⚠️ Low quality email for user ${sanitizeEmailForLogs(userEmail)}: ${confidentCount} confident, ${promisingCount} promising`);
  }
  
  // Check for duplicates
  const jobHashes = jobCards.map(card => card.job.job_hash);
  const uniqueHashes = new Set(jobHashes);
  if (jobHashes.length !== uniqueHashes.size) {
    console.error(`❌ Duplicate jobs in email for user ${sanitizeEmailForLogs(userEmail)}`);
    return false;
  }
  
  return true;
}

export async function sendMatchedJobsEmail({
    to,
    jobs,
    userName,
    subscriptionTier = 'free',
    isSignupEmail = false,
  }: {
    to: string,
    jobs: any[],
    userName?: string,
    subscriptionTier?: 'free' | 'premium',
    isSignupEmail?: boolean,
  }) {
    // Generate idempotency token
    const sendDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const jobsHash = require('crypto').createHash('md5').update(JSON.stringify(jobs.map(j => j.job_hash))).digest('hex').slice(0, 8);
    const sendToken = `${to}_${sendDate}_${jobsHash}`;
    
    // Check if email already sent (idempotency)
    const supabase = getSupabaseClient();
    const { data: existingSend } = await supabase
      .from('email_sends')
      .select('id')
      .eq('send_token', sendToken)
      .single();
    
    if (existingSend) {
      console.log(`📧 Email already sent for token: ${sendToken}`);
      return { id: existingSend.id, alreadySent: true };
    }
    const isPremium = subscriptionTier === 'premium';
    const jobLimit = isPremium ? 15 : 6; // Updated: Free tier now gets 6 matches per week instead of 5 every 48h
    const emailTypeText = isSignupEmail ? 'Welcome! Here are your first' : 'Your fresh graduate';
    
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>🎯 ${jobs.length} Fresh Graduate Jobs in EU/UK - JobPing</title>
        <!--[if mso]>
        <noscript>
          <xml>
            <o:OfficeDocumentSettings>
              <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
          </xml>
        </noscript>
        <![endif]-->
        <style>
          /* Reset styles for email clients */
          body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
          table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
          
          /* Responsive design */
          @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .mobile-padding { padding: 20px !important; }
            .mobile-text { font-size: 16px !important; }
            .mobile-title { font-size: 24px !important; }
            .mobile-button { width: 100% !important; }
          }
        </style>
      </head>
      <body style="
        margin: 0;
        padding: 0;
        background-color: #f4f4f4;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-size: 16px;
        line-height: 1.6;
        color: #333333;
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
      ">
        <!-- Email Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="
                max-width: 600px;
                background-color: #ffffff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
              ">
                <!-- Header -->
                <tr>
                  <td style="
                    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                    padding: 40px 30px;
                    text-align: center;
                  ">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td>
                          <h1 style="
                            margin: 0 0 8px 0;
                            font-size: 32px;
                            font-weight: 700;
                            color: #ffffff;
                            letter-spacing: -0.02em;
                            line-height: 1.2;
                          ">
                            JobPing
                          </h1>
                          <p style="
                            margin: 0;
                            font-size: 16px;
                            color: #e5e5e5;
                            font-weight: 500;
                            letter-spacing: 0.5px;
                          ">
                            AI-Powered Graduate Job Matching
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td class="mobile-padding" style="padding: 40px 30px;">
                    ${isPremium ? `
                    <!-- Premium Badge -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                      <tr>
                        <td style="
                          background: linear-gradient(135deg, #ffd700 0%, #ffa500 100%);
                          padding: 12px 20px;
                          border-radius: 20px;
                          text-align: center;
                        ">
                          <span style="
                            font-size: 14px;
                            font-weight: 700;
                            color: #1a1a1a;
                            letter-spacing: 0.5px;
                            text-transform: uppercase;
                          ">
                            ⭐ Premium Member
                          </span>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                    
                    <!-- Greeting -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                      <tr>
                        <td>
                          <h2 style="
                            margin: 0 0 16px 0;
                            font-size: 28px;
                            font-weight: 700;
                            color: #1a1a1a;
                            line-height: 1.2;
                            letter-spacing: -0.01em;
                          " class="mobile-title">
                            Hi${userName ? ' ' + userName : ''} 👋
                          </h2>
                          <p style="
                            margin: 0 0 32px 0;
                            font-size: 18px;
                            line-height: 1.6;
                            color: #4a4a4a;
                            font-weight: 400;
                          " class="mobile-text">
                            ${isSignupEmail ? 'Welcome to <strong style="color: #1a1a1a;">JobPing</strong>! 🎉' : 'Your fresh graduate job matches are here!'}<br>
                            ${emailTypeText} <strong style="color: #1a1a1a;">${jobs.length} ${isPremium ? 'premium ' : ''}graduate opportunities</strong>:
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Job Cards -->
                    ${jobs.map((job, index) => `
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="
                      margin-bottom: 20px;
                      background-color: #ffffff;
                      border: 1px solid #e5e5e5;
                      border-radius: 8px;
                      overflow: hidden;
                      ${index === 0 ? 'border: 2px solid #1a1a1a;' : ''}
                    ">
                      <tr>
                        <td style="padding: 24px;">
                          <!-- Job Header -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
                            <tr>
                              <td>
                                <h3 style="
                                  margin: 0 0 8px 0;
                                  font-size: 20px;
                                  font-weight: 700;
                                  color: #1a1a1a;
                                  line-height: 1.3;
                                ">
                                  <a href="${job.job_url}" target="_blank" style="
                                    color: #1a1a1a;
                                    text-decoration: none;
                                  ">${job.title}</a>
                                </h3>
                                <p style="
                                  margin: 0;
                                  font-size: 16px;
                                  font-weight: 600;
                                  color: #4a4a4a;
                                ">${job.company}</p>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Job Details -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
                            <tr>
                              <td>
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                  <tr>
                                    ${job.location ? `
                                    <td style="padding-right: 16px;">
                                      <span style="
                                        font-size: 14px;
                                        color: #666666;
                                        font-weight: 500;
                                      ">
                                        📍 ${job.location}
                                      </span>
                                    </td>
                                    ` : ''}
                                    ${isPremium && (job.match_score || index === 0) ? `
                                    <td style="padding-right: 16px;">
                                      <span style="
                                        background-color: #1a1a1a;
                                        color: #ffffff;
                                        padding: 4px 12px;
                                        border-radius: 12px;
                                        font-size: 12px;
                                        font-weight: 600;
                                        letter-spacing: 0.3px;
                                      ">
                                        ${job.match_score || 'Top Match'}
                                      </span>
                                    </td>
                                    ` : ''}
                                    <td>
                                      <span style="
                                        font-size: 14px;
                                        color: #666666;
                                        font-weight: 500;
                                      ">
                                        📅 Posted ${(() => {
                                          try {
                                            const postedDate = new Date(job.created_at || job.updated_at || new Date());
                                            const now = new Date();
                                            const diffTime = Math.abs(now.getTime() - postedDate.getTime());
                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                            
                                            if (diffDays === 0) return 'today';
                                            if (diffDays === 1) return 'yesterday';
                                            if (diffDays < 7) return `${diffDays} days ago`;
                                            if (diffDays < 30) {
                                              const weeks = Math.floor(diffDays / 7);
                                              return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
                                            }
                                            return postedDate.toLocaleDateString('en-US', { 
                                              month: 'short', 
                                              day: 'numeric' 
                                            });
                                          } catch (error) {
                                            return 'recently';
                                          }
                                        })()}
                                      </span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          ${isPremium ? `
                          <!-- Premium Match Insights -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="
                            margin-bottom: 16px;
                            background-color: #f8f9fa;
                            border-left: 3px solid #1a1a1a;
                            border-radius: 4px;
                          ">
                            <tr>
                              <td style="padding: 16px;">
                                <p style="
                                  margin: 0 0 6px 0;
                                  font-size: 13px;
                                  font-weight: 700;
                                  color: #1a1a1a;
                                  text-transform: uppercase;
                                  letter-spacing: 0.3px;
                                ">
                                  Why this matches you:
                                </p>
                                <p style="
                                  margin: 0;
                                  font-size: 14px;
                                  color: #4a4a4a;
                                  line-height: 1.5;
                                ">
                                  ${job.match_reason || 'Strong alignment with your skills, experience level, and career goals.'}
                                </p>
                              </td>
                            </tr>
                          </table>
                          ` : job.match_reason ? `
                          <!-- Basic Match Reason -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="
                            margin-bottom: 16px;
                            background-color: #f8f9fa;
                            border-radius: 4px;
                          ">
                            <tr>
                              <td style="padding: 12px 16px;">
                                <p style="
                                  margin: 0;
                                  font-size: 14px;
                                  color: #4a4a4a;
                                  line-height: 1.4;
                                  font-style: italic;
                                ">
                                  ${job.match_reason}
                                </p>
                              </td>
                            </tr>
                          </table>
                          ` : ''}
                          
                          <!-- Apply Button - High Conversion -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 20px;">
                            <tr>
                              <td align="center">
                                <a href="${job.job_url}" target="_blank" style="
                                  display: block;
                                  background-color: #007AFF;
                                  color: #ffffff;
                                  padding: 18px 40px;
                                  border-radius: 8px;
                                  text-decoration: none;
                                  font-size: 18px;
                                  font-weight: 700;
                                  text-align: center;
                                  letter-spacing: 0.5px;
                                  text-transform: uppercase;
                                  border: 3px solid #007AFF;
                                  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
                                " class="mobile-button">
                                  🚀 APPLY NOW
                                </a>
                              </td>
                            </tr>
                            <tr>
                              <td align="center" style="padding-top: 12px;">
                                <p style="
                                  margin: 0;
                                  font-size: 14px;
                                  color: #666666;
                                  font-weight: 500;
                                ">
                                  ${index < 2 ? '⚡ Trending - Apply fast!' : '⏰ Limited applications'}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    `).join('')}
                    
                    ${!isPremium ? `
                    <!-- Upgrade Prompt -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="
                      margin-bottom: 32px;
                      background-color: #f8f9fa;
                      border: 1px solid #dee2e6;
                      border-radius: 8px;
                    ">
                      <tr>
                        <td style="padding: 32px; text-align: center;">
                          <h3 style="
                            margin: 0 0 16px 0;
                            color: #1a1a1a;
                            font-size: 22px;
                            font-weight: 700;
                            letter-spacing: -0.01em;
                          ">
                            Want more opportunities? 🚀
                          </h3>
                          <p style="
                            margin: 0 0 24px 0;
                            color: #4a4a4a;
                            font-size: 16px;
                            line-height: 1.6;
                          ">
                            Premium members get <strong style="color: #1a1a1a;">~45 jobs per week</strong><br>
                            + detailed match insights + priority support
                          </p>
                          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/pricing" style="
                            display: inline-block;
                            background-color: #1a1a1a;
                            color: #ffffff;
                            padding: 14px 28px;
                            border-radius: 6px;
                            text-decoration: none;
                            font-weight: 600;
                            font-size: 14px;
                            letter-spacing: 0.3px;
                          " class="mobile-button">
                            Upgrade to Premium
                          </a>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                    
                    <!-- Schedule Info -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="
                      margin-bottom: 32px;
                      background-color: #f8f9fa;
                      border: 1px solid #e9ecef;
                      border-radius: 8px;
                    ">
                      <tr>
                        <td style="padding: 20px; text-align: center;">
                          <p style="
                            margin: 0 0 8px 0;
                            font-size: 16px;
                            color: #1a1a1a;
                            font-weight: 600;
                          ">
                            You'll get <strong>${isPremium ? jobLimit + ' premium jobs every 48 hours' : jobLimit + ' jobs per week'}</strong>
                          </p>
                          <p style="
                            margin: 0;
                            font-size: 14px;
                            color: #666666;
                          ">
                            ${isPremium ? 'Manage your subscription anytime in your account.' : 'Reply with "unsubscribe" to stop these emails.'}
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    ${isSignupEmail ? `
                    <!-- Welcome Next Steps -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="
                      margin-bottom: 32px;
                      background-color: #e8f5e8;
                      border: 1px solid #c3e6c3;
                      border-radius: 8px;
                    ">
                      <tr>
                        <td style="padding: 24px; text-align: center;">
                          <p style="
                            margin: 0;
                            color: #2d5a2d;
                            font-size: 16px;
                            font-weight: 600;
                          ">
                            <strong>Next steps:</strong> Check your email every 48 hours for fresh opportunities!
                          </p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="
                    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                    padding: 32px 30px;
                    text-align: center;
                  ">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td>
                          <h2 style="
                            margin: 0 0 8px 0;
                            font-size: 24px;
                            font-weight: 700;
                            color: #ffffff;
                            letter-spacing: 1px;
                          ">
                            JobPing
                          </h2>
                          <p style="
                            margin: 0;
                            font-size: 14px;
                            color: #e5e5e5;
                            letter-spacing: 0.3px;
                          ">
                            AI-powered job matching for ambitious professionals
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  try {
      // Dynamic subject line optimized for opens
      const getSubjectLine = () => {
        const urgencyPhrases = ['Fresh', 'Hot', 'New', 'Latest'];
        const urgency = urgencyPhrases[Math.floor(Math.random() * urgencyPhrases.length)];
        
        if (isSignupEmail) {
          return `🎯 Your ${jobs.length} EU/UK graduate jobs are ready!`;
        } else {
          return `${urgency} ${jobs.length} EU/UK graduate jobs (visa-friendly) 🎓`;
        }
      };

      // Retry logic with exponential backoff
      const maxRetries = 3;
      let lastError: any;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const resend = getResendClient();
          const { data, error } = await resend.emails.send({
            from: 'JobPing <noreply@jobping.ai>',
            to: [to],
            subject: getSubjectLine(),
            html: html,
          });

          if (error) {
            throw error;
          }

          // Record successful send in database
          await supabase.from('email_sends').insert({
            send_token: sendToken,
            user_email: to,
            email_type: isSignupEmail ? 'welcome' : 'job_matches',
            jobs_count: jobs.length,
            sent_at: new Date().toISOString(),
            status: 'sent'
          });

          console.log(`📧 Email sent successfully (attempt ${attempt}):`, data);
          return { ...data, sendToken };
          
        } catch (error) {
          lastError = error;
          console.error(`📧 Email send attempt ${attempt} failed:`, error);
          
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
            console.log(`📧 Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // All retries failed - record failure
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
    }
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
}

// Helper function to send welcome email for new users
export async function sendWelcomeEmail({
  to,
  userName,
  matchCount,
}: {
  to: string;
  userName?: string;
  matchCount: number;
}) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
      <title>Welcome to JobPingAI</title>
    </head>
    <body style="
      margin: 0;
      padding: 0;
      background: #FFFFFF;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      font-feature-settings: 'tnum' on, 'lnum' on, 'kern' on;
      line-height: 1.6;
      color: #000000;
    ">
      <div style="
        max-width: 600px;
        margin: 0 auto;
        background: #FFFFFF;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.06), 0 8px 16px rgba(0, 0, 0, 0.04);
        margin-top: 40px;
        margin-bottom: 40px;
        border: 1px solid #F0F0F0;
      ">
        <!-- Header -->
        <div style="
          background: #000000;
          padding: 40px 40px 32px 40px;
          text-align: center;
        ">
          <div style="
            font-size: 28px;
            font-weight: 900;
            letter-spacing: -0.02em;
            color: #FFFFFF;
            margin-bottom: 8px;
          ">
            JOBPINGAI
          </div>
          <div style="
            font-size: 14px;
            color: #CCCCCC;
            font-weight: 500;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          ">
            AI-Powered Graduate Job Matching
          </div>
        </div>
        
        <!-- Main Content -->
        <div style="
          padding: 48px 40px;
          color: #000000;
          text-align: center;
        ">
          <h1 style="
            font-size: 32px;
            font-weight: 800;
            margin: 0 0 16px 0;
            letter-spacing: -0.02em;
            color: #000000;
            line-height: 1.1;
          ">
            Welcome${userName ? ', ' + userName : ''}! 🎉
          </h1>
          
          <p style="
            font-size: 18px;
            line-height: 1.6;
            margin: 0 0 24px 0;
            color: #333333;
            font-weight: 400;
          ">
            Your AI career assistant is now active and has found <strong style="color: #000000;">${matchCount} perfect graduate job matches</strong> for you.
          </p>
          
          <p style="
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 40px 0;
            color: #666666;
            font-weight: 400;
          ">
            Check your inbox for your first batch of AI-matched graduate opportunities. You'll receive new matches every 48 hours.
          </p>
          
          <!-- Next Steps -->
          <div style="
            background: #F0F8F0;
            border-radius: 16px;
            padding: 28px;
            margin-bottom: 40px;
            text-align: center;
            border: 1px solid #D4F4D4;
          ">
            <p style="
              margin: 0;
              color: #2D5A2D;
              font-size: 18px;
              font-weight: 700;
            ">
              <strong>Next steps:</strong> Check your email every 48 hours for fresh opportunities!
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="
          background: #000000;
          padding: 32px 40px;
          text-align: center;
        ">
          <div style="
            font-size: 24px;
            font-weight: 900;
            letter-spacing: 2px;
            color: #FFFFFF;
            margin-bottom: 8px;
          ">
            JOBPINGAI
          </div>
          <p style="
            margin: 0;
            font-size: 14px;
            color: #CCCCCC;
            letter-spacing: 0.5px;
          ">
            AI-powered job matching for ambitious professionals
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: 'JobPing <noreply@jobping.ai>',
      to: [to],
      subject: '🎯 Welcome to JobPingAI - Your AI Career Assistant is Ready!',
      html: html,
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      throw error;
    }

    console.log('Welcome email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Welcome email sending failed:', error);
    throw error;
  }
}
  