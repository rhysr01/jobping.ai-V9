// EMAIL CLIENTS - RESEND & SUPABASE MANAGEMENT

import { Resend } from 'resend';
import { getBaseUrl, getEmailDomain, getUnsubscribeEmail } from '../url-helpers';

// Resend client management
export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Resend API key: RESEND_API_KEY must be set');
  }
  return new Resend(apiKey);
}

// Supabase client for email tracking
export function getSupabaseClient() {
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

// Use centralized helpers for consistency

// Type safety for email senders
type GetJobPingSender = `JobPing <${string}@getjobping.com>`;

// Email validation guard
export const assertValidFrom = (from: string): void => {
  // Expect display name and angle-bracket email
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (!match) {
    throw new Error(`Invalid 'from' format: ${from}`);
  }

  const email = match[2];
  // Basic email shape
  const basicEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicEmail.test(email)) {
    throw new Error(`Malformed email address in 'from': ${from}`);
  }

  const [, domain] = email.split('@');
  if (domain !== 'getjobping.com') {
    throw new Error(`Invalid sender domain: ${domain}. Expected getjobping.com`);
  }
};

// Email configuration - uses environment variables
export const EMAIL_CONFIG = {
  from: `JobPing <noreply@${getEmailDomain()}>` as GetJobPingSender,
  maxRetries: 3,
  retryDelay: 2000, // 2 seconds base delay,
  unsubscribeBase: `${getBaseUrl()}/api/unsubscribe`,
  listUnsubscribeEmail: getUnsubscribeEmail()
} as const;

// Validate the from address at module load time
assertValidFrom(EMAIL_CONFIG.from);