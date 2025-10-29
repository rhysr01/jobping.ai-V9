/**
 * Email Deliverability System
 * DMARC/SPF/DKIM validation, bounce handling, and unsubscribe management
 */

import { createClient } from '@supabase/supabase-js';
import { getListUnsubscribeHeader } from '../url-helpers';

export interface EmailDeliverabilityMetrics {
  deliveryRate: number;
  bounceRate: number;
  complaintRate: number;
  unsubscribeRate: number;
  spamRate: number;
  lastChecked: Date;
}

export interface BounceRecord {
  email: string;
  bounceType: 'hard' | 'soft' | 'complaint';
  reason: string;
  timestamp: Date;
  retryCount: number;
}

export interface UnsubscribeRecord {
  email: string;
  reason?: string;
  timestamp: Date;
  source: 'email_link' | 'dashboard' | 'complaint' | 'bounce';
}

// Initialize Supabase client
function getSupabaseClient() {
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

/**
 * Validate email deliverability setup
 */
export async function validateEmailDeliverability(): Promise<{
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check domain configuration
  const domain = process.env.EMAIL_DOMAIN || 'getjobping.com';
  
  // Validate SPF record
  const spfValid = await validateSPFRecord(domain);
  if (!spfValid) {
    issues.push('SPF record not properly configured');
    recommendations.push('Add SPF record: v=spf1 include:_spf.google.com ~all');
  }

  // Validate DKIM
  const dkimValid = await validateDKIMRecord(domain);
  if (!dkimValid) {
    issues.push('DKIM not properly configured');
    recommendations.push('Set up DKIM signing with your email provider');
  }

  // Validate DMARC
  const dmarcValid = await validateDMARCRecord(domain);
  if (!dmarcValid) {
    issues.push('DMARC policy not configured');
    recommendations.push('Add DMARC record: v=DMARC1; p=quarantine; rua=mailto:dmarc@getjobping.com');
  }

  // Check bounce suppression list
  const bounceListSize = await getBounceSuppressionListSize();
  if (bounceListSize > 100) {
    issues.push(`High bounce rate: ${bounceListSize} emails in suppression list`);
    recommendations.push('Review email list quality and implement better validation');
  }

  // Check complaint rate
  const complaintRate = await getComplaintRate();
  if (complaintRate > 0.1) {
    issues.push(`High complaint rate: ${(complaintRate * 100).toFixed(2)}%`);
    recommendations.push('Improve email relevance and frequency controls');
  }

  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  };
}

/**
 * Validate SPF record
 */
async function validateSPFRecord(_domain: string): Promise<boolean> {
  try {
    // This would typically use a DNS lookup library
    // For now, we'll assume it's configured if the environment variable is set
    return !!process.env.SPF_RECORD_VALIDATED;
  } catch (error) {
    console.error('Error validating SPF record:', error);
    return false;
  }
}

/**
 * Validate DKIM record
 */
async function validateDKIMRecord(_domain: string): Promise<boolean> {
  try {
    // This would typically use a DNS lookup library
    // For now, we'll assume it's configured if the environment variable is set
    return !!process.env.DKIM_RECORD_VALIDATED;
  } catch (error) {
    console.error('Error validating DKIM record:', error);
    return false;
  }
}

/**
 * Validate DMARC record
 */
async function validateDMARCRecord(_domain: string): Promise<boolean> {
  try {
    // This would typically use a DNS lookup library
    // For now, we'll assume it's configured if the environment variable is set
    return !!process.env.DMARC_RECORD_VALIDATED;
  } catch (error) {
    console.error('Error validating DMARC record:', error);
    return false;
  }
}

/**
 * Add email to bounce suppression list
 */
export async function addToBounceSuppressionList(
  email: string, 
  bounceType: 'hard' | 'soft' | 'complaint', 
  reason: string
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();

    // Check if email is already in suppression list
    const { data: existing } = await supabase
      .from('email_suppression')
      .select('*')
      .eq('email', email)
      .single();

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('email_suppression')
        .update({
          bounce_type: bounceType,
          reason,
          retry_count: existing.retry_count + 1,
          last_bounce_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('email', email);

      if (error) {
        console.error('Error updating bounce suppression:', error);
        return false;
      }
    } else {
      // Create new suppression record
      const { error } = await supabase
        .from('email_suppression')
        .insert({
          email,
          bounce_type: bounceType,
          reason,
          retry_count: 1,
          first_bounce_at: new Date().toISOString(),
          last_bounce_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error adding to bounce suppression:', error);
        return false;
      }
    }

    // If it's a hard bounce or complaint, also unsubscribe the user
    if (bounceType === 'hard' || bounceType === 'complaint') {
      await unsubscribeUser(email, `Automatic unsubscribe due to ${bounceType} bounce`);
    }

    return true;
  } catch (error) {
    console.error('Error adding to bounce suppression list:', error);
    return false;
  }
}

/**
 * Check if email is in bounce suppression list
 */
export async function isInBounceSuppressionList(email: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();

    const { data } = await supabase
      .from('email_suppression')
      .select('*')
      .eq('email', email)
      .single();

    if (!data) return false;

    // Check if it's a hard bounce (permanent)
    if (data.bounce_type === 'hard') {
      return true;
    }

    // Check if it's a soft bounce and we've retried too many times
    if (data.bounce_type === 'soft' && data.retry_count >= 3) {
      return true;
    }

    // Check if it's been more than 30 days since last bounce (for soft bounces)
    if (data.bounce_type === 'soft') {
      const daysSinceBounce = (Date.now() - new Date(data.last_bounce_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceBounce > 30) {
        return false; // Can try again
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking bounce suppression list:', error);
    return false;
  }
}

/**
 * Unsubscribe user from emails
 */
export async function unsubscribeUser(email: string, reason?: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();

    // Update user record
    const { error: userError } = await supabase
      .from('users')
      .update({
        email_cadence: 'paused',
        email_unsubscribed: true,
        email_unsubscribed_at: new Date().toISOString(),
        email_unsubscribe_reason: reason || 'User requested'
      })
      .eq('email', email);

    if (userError) {
      console.error('Error updating user unsubscribe status:', userError);
    }

    // Record unsubscribe
    const { error: unsubscribeError } = await supabase
      .from('unsubscribes')
      .insert({
        email,
        reason: reason || 'User requested',
        source: 'email_link',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

    if (unsubscribeError) {
      console.error('Error recording unsubscribe:', unsubscribeError);
    }

    return !userError && !unsubscribeError;
  } catch (error) {
    console.error('Error unsubscribing user:', error);
    return false;
  }
}

/**
 * Check if user is unsubscribed
 */
export async function isUserUnsubscribed(email: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();

    const { data: user } = await supabase
      .from('users')
      .select('email_unsubscribed, email_cadence')
      .eq('email', email)
      .single();

    return user?.email_unsubscribed === true || user?.email_cadence === 'paused';
  } catch (error) {
    console.error('Error checking unsubscribe status:', error);
    return false;
  }
}

/**
 * Get bounce suppression list size
 */
async function getBounceSuppressionListSize(): Promise<number> {
  try {
    const supabase = getSupabaseClient();

    const { count } = await supabase
      .from('email_suppression')
      .select('*', { count: 'exact', head: true });

    return count || 0;
  } catch (error) {
    console.error('Error getting bounce suppression list size:', error);
    return 0;
  }
}

/**
 * Get complaint rate
 */
async function getComplaintRate(): Promise<number> {
  try {
    const supabase = getSupabaseClient();

    // Get total emails sent in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: totalSent } = await supabase
      .from('email_sends')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', thirtyDaysAgo.toISOString());

    // Get complaint count
    const { count: complaints } = await supabase
      .from('email_suppression')
      .select('*', { count: 'exact', head: true })
      .eq('bounce_type', 'complaint')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (!totalSent || totalSent === 0) return 0;

    return (complaints || 0) / totalSent;
  } catch (error) {
    console.error('Error getting complaint rate:', error);
    return 0;
  }
}

/**
 * Get email deliverability metrics
 */
export async function getEmailDeliverabilityMetrics(): Promise<EmailDeliverabilityMetrics> {
  try {
    const supabase = getSupabaseClient();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get total emails sent
    const { count: totalSent } = await supabase
      .from('email_sends')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', thirtyDaysAgo.toISOString());

    // Get bounce count
    const { count: bounces } = await supabase
      .from('email_suppression')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get complaint count
    const { count: complaints } = await supabase
      .from('email_suppression')
      .select('*', { count: 'exact', head: true })
      .eq('bounce_type', 'complaint')
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get unsubscribe count
    const { count: unsubscribes } = await supabase
      .from('unsubscribes')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', thirtyDaysAgo.toISOString());

    const totalSentCount = totalSent || 0;
    const bounceCount = bounces || 0;
    const complaintCount = complaints || 0;
    const unsubscribeCount = unsubscribes || 0;

    return {
      deliveryRate: totalSentCount > 0 ? ((totalSentCount - bounceCount) / totalSentCount) * 100 : 100,
      bounceRate: totalSentCount > 0 ? (bounceCount / totalSentCount) * 100 : 0,
      complaintRate: totalSentCount > 0 ? (complaintCount / totalSentCount) * 100 : 0,
      unsubscribeRate: totalSentCount > 0 ? (unsubscribeCount / totalSentCount) * 100 : 0,
      spamRate: 0, // Would need external spam monitoring service
      lastChecked: new Date()
    };
  } catch (error) {
    console.error('Error getting email deliverability metrics:', error);
    return {
      deliveryRate: 0,
      bounceRate: 0,
      complaintRate: 0,
      unsubscribeRate: 0,
      spamRate: 0,
      lastChecked: new Date()
    };
  }
}

/**
 * Generate List-Unsubscribe header
 */
export function generateListUnsubscribeHeader(): string {
  return getListUnsubscribeHeader();
}

/**
 * Validate email before sending
 */
export async function validateEmailBeforeSend(email: string): Promise<{
  canSend: boolean;
  reasons: string[];
}> {
  const reasons: string[] = [];

  // Check if email is unsubscribed
  const isUnsubscribed = await isUserUnsubscribed(email);
  if (isUnsubscribed) {
    reasons.push('User has unsubscribed');
  }

  // Check if email is in bounce suppression list
  const isBounced = await isInBounceSuppressionList(email);
  if (isBounced) {
    reasons.push('Email is in bounce suppression list');
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    reasons.push('Invalid email format');
  }

  // Check for disposable email domains
  const disposableDomains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com'];
  const domain = email.split('@')[1];
  if (disposableDomains.includes(domain)) {
    reasons.push('Disposable email domain');
  }

  return {
    canSend: reasons.length === 0,
    reasons
  };
}

/**
 * Process email delivery webhook (for bounce/complaint handling)
 */
export async function processEmailWebhook(
  eventType: 'bounce' | 'complaint' | 'delivery',
  email: string,
  details: any
): Promise<boolean> {
  try {
    switch (eventType) {
      case 'bounce':
        const bounceType = details.bounceType === 'Permanent' ? 'hard' : 'soft';
        await addToBounceSuppressionList(email, bounceType, details.reason || 'Bounce');
        break;
      
      case 'complaint':
        await addToBounceSuppressionList(email, 'complaint', details.reason || 'Complaint');
        break;
      
      case 'delivery':
        // Log successful delivery
        const supabase = getSupabaseClient();
        await supabase
          .from('email_deliveries')
          .insert({
            email,
            delivered_at: new Date().toISOString(),
            message_id: details.messageId,
            created_at: new Date().toISOString()
          });
        break;
    }

    return true;
  } catch (error) {
    console.error('Error processing email webhook:', error);
    return false;
  }
}
