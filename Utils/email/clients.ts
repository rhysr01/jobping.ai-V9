// EMAIL CLIENTS - RESEND & SUPABASE MANAGEMENT

import { Resend } from 'resend';
import { getBaseUrl, getEmailDomain, getUnsubscribeEmail } from '../url-helpers';

// Resend client management
export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Resend API key: RESEND_API_KEY must be set');
  }
  if (!apiKey.startsWith('re_')) {
    throw new Error('Invalid Resend API key format: must start with "re_"');
  }
  return new Resend(apiKey);
}

// Supabase client for email tracking - uses centralized database pool
/**
 * @deprecated Use getDatabaseClient() from '@/Utils/databasePool' directly instead.
 * This function is kept for backwards compatibility with email module exports.
 */
export function getSupabaseClient() {
  // Import the canonical implementation
  const { getDatabaseClient } = require('../databasePool');
  return getDatabaseClient();
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

// Validate the from address at module load time (with error handling)
try {
  assertValidFrom(EMAIL_CONFIG.from);
} catch (error) {
  // Log but don't throw - allow runtime to handle
  console.error('Email config validation failed:', error);
  // In production, you might want to throw here
  if (process.env.NODE_ENV === 'production') {
    throw error;
  }
}