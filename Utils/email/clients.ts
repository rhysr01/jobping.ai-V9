// 🔧 EMAIL CLIENTS - RESEND & SUPABASE MANAGEMENT

import { Resend } from 'resend';

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

// Get base domain from environment
function getBaseDomain(): string {
  return process.env.NEXT_PUBLIC_DOMAIN || process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'https://www.getjobping.com';
}

function getEmailDomain(): string {
  // Use resend.dev for development, getjobping.com for production
  const isDev = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';
  const isProd = process.env.NODE_ENV === 'production';
  const defaultDomain = (isDev || isTest || !isProd) ? 'resend.dev' : 'getjobping.com';
  return process.env.EMAIL_DOMAIN || defaultDomain;
}

// Email configuration - uses environment variables
export const EMAIL_CONFIG = {
  from: `JobPing <noreply@${getEmailDomain()}>`,
  maxRetries: 3,
  retryDelay: 2000, // 2 seconds base delay,
  unsubscribeBase: `${getBaseDomain()}/api/unsubscribe`,
  listUnsubscribeEmail: `unsubscribe@${getEmailDomain()}`
} as const;