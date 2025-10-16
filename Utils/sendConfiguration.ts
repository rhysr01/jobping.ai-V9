/**
 * SEND CONFIGURATION SYSTEM
 * Weekly job distribution with per-send caps
 */

export interface SendPlan {
  days: string[];           // Days of week to send
  perSend: number;          // Max jobs per send
  pullsPerWeek: number;     // How many sends per week
  signupBonus: number;      // Jobs sent on signup
  earlyAccessHours?: number; // Hours early access to fresh jobs
}

export interface MatchRules {
  minScore: number;         // Minimum match score
  lookbackDays: number;     // How far back to look for jobs
  maxPerCompanyPerSend: number; // Max jobs per company per send
}

// Core send configuration - Weekly for free, 3x weekly for premium
export const SEND_PLAN = {
  free: {
    days: ["Thu"],      // Weekly on Thursday
    perSend: 5,         // Exactly 5 jobs per email
    pullsPerWeek: 1,
    signupBonus: 10,    // 10 jobs on signup (2x first email!)
  },
  premium: {
    days: ["Mon", "Wed", "Fri"], // 3x per week
    perSend: 5,         // Exactly 5 jobs per email
    pullsPerWeek: 3,
    signupBonus: 10,    // 10 jobs on signup
    earlyAccessHours: 24
  }
};

// Match quality rules
export const MATCH_RULES = {
  minScore: 65,  // Minimum 65% match to send (balanced quality)
  lookbackDays: 30,
  maxPerCompanyPerSend: 2
} as const;

// Send ledger tracking
export interface SendLedgerEntry {
  user_id: string;
  week_start: string;       // ISO date of Monday
  tier: 'free' | 'premium';
  sends_used: number;
  jobs_sent: number;
  last_send_date?: string;
}

// Seen jobs tracking
export interface SeenJobEntry {
  user_id: string;
  job_hash: string;
  seen_date: string;
  tier: 'free' | 'premium';
}

/**
 * Check if user can receive a send this week
 */
export function canUserReceiveSend(
  ledger: SendLedgerEntry,
  currentWeek: string,
  tier: 'free' | 'premium'
): boolean {
  // Reset if new week
  if (ledger.week_start !== currentWeek) {
    return true;
  }
  
  const plan = SEND_PLAN[tier];
  return ledger.sends_used < plan.pullsPerWeek;
}

/**
 * Check if user should skip send due to insufficient quality jobs
 */
export function shouldSkipSend(
  eligibleJobs: any[],
  tier: 'free' | 'premium'
): boolean {
  const plan = SEND_PLAN[tier];
  return eligibleJobs.length < plan.perSend;
}

/**
 * Get current week start (Monday) as ISO string
 */
export function getCurrentWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday as 0
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  
  return monday.toISOString().split('T')[0];
}

/**
 * Check if today is a send day for the tier
 */
export function isSendDay(tier: 'free' | 'premium'): boolean {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }) as string;
  const plan = SEND_PLAN[tier];
  return plan.days.includes(today);
}

/**
 * Get jobs per send for tier
 */
export function getJobsPerSend(tier: 'free' | 'premium'): number {
  return SEND_PLAN[tier].perSend;
}

/**
 * Get signup bonus jobs for tier
 */
export function getSignupBonusJobs(tier: 'free' | 'premium'): number {
  return SEND_PLAN[tier].signupBonus;
}

/**
 * Get early access cutoff for premium users
 */
export function getEarlyAccessCutoff(): Date {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - SEND_PLAN.premium.earlyAccessHours!);
  return cutoff;
}
