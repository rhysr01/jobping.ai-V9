/**
 * RE-ENGAGEMENT EMAIL SERVICE
 * Sends re-engagement emails to inactive users
 */

import { Resend } from 'resend';
import { getReEngagementCandidates, markReEngagementSent } from '../engagementTracker';
import { getResendClient, EMAIL_CONFIG, assertValidFrom } from './clients';
import { getUnsubscribeUrl } from '../url-helpers';

export interface ReEngagementResult {
  success: boolean;
  emailsSent: number;
  errors: string[];
}

/**
 * Send re-engagement emails to inactive users
 */
export async function sendReEngagementEmails(): Promise<ReEngagementResult> {
  console.log(' Starting re-engagement email process...');
  
  const result: ReEngagementResult = {
    success: true,
    emailsSent: 0,
    errors: []
  };

  try {
    // Get users who need re-engagement
    const candidates = await getReEngagementCandidates();
    
    if (candidates.length === 0) {
      console.log(' No users need re-engagement emails');
      return result;
    }

    console.log(` Found ${candidates.length} users for re-engagement`);

    // Send emails to each candidate
    for (const user of candidates) {
      try {
        await sendReEngagementEmail(user);
        await markReEngagementSent(user.email);
        result.emailsSent++;
        console.log(` Re-engagement email sent to ${user.email}`);
      } catch (error) {
        const errorMessage = `Failed to send re-engagement email to ${user.email}: ${error}`;
        console.error(` ${errorMessage}`);
        result.errors.push(errorMessage);
        result.success = false;
      }
    }

    console.log(` Re-engagement complete: ${result.emailsSent} emails sent, ${result.errors.length} errors`);
    
  } catch (error) {
    const errorMessage = `Re-engagement process failed: ${error}`;
    console.error(` ${errorMessage}`);
    result.errors.push(errorMessage);
    result.success = false;
  }

  return result;
}

/**
 * Send a single re-engagement email
 */
async function sendReEngagementEmail(user: {
  email: string;
  full_name: string | null;
}): Promise<void> {
  const unsubscribeUrl = getUnsubscribeUrl(user.email);
  
  const emailData = {
    to: user.email,
    userName: user.full_name || 'there',
    unsubscribeUrl
  };

  // Create a more engaging and personal re-engagement email
  const html = createReEngagementEmail(emailData.userName, unsubscribeUrl);
  const subject = `Hey ${emailData.userName}, we're excited to share something special! 🚀`;

  const resend = getResendClient();
  const fromAddress = EMAIL_CONFIG.from;
  assertValidFrom(fromAddress);

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: [user.email],
    subject,
    html
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

// Enhanced re-engagement email template with personality
function createReEngagementEmail(userName: string, unsubscribeUrl: string): string {
  const name = userName || 'there';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <title>We Miss You - JobPing</title>
  <style>
    /* Client resets */
    html, body { margin:0; padding:0; }
    img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
    table { border-collapse:collapse !important; }
    body, table, td, a { -ms-text-size-adjust:100%; -webkit-text-size-adjust:100%; }
    
    /* Gmail-specific optimizations */
    .gmail-fix { min-width: 600px; }
    .gmail-spacing { mso-line-height-rule: exactly; }
    .gmail-table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }

    /* Layout */
    .container { width:100%; background:#0a0a0a; }
    .shell { width:100%; max-width:600px; margin:0 auto; background:#000000; }
    .header { background: linear-gradient(135deg, #6366F1 0%, #7C3AED 50%, #8B5CF6 100%); padding:40px 32px; text-align:center; }
    .logo { font-family: Arial, sans-serif; font-weight:800; font-size:32px; color:#ffffff; letter-spacing:-0.5px; text-shadow:0 2px 10px rgba(0,0,0,0.3); }
    .tag { color:#ffffff; opacity:0.95; font-size:12px; font-weight:600; letter-spacing:1.2px; text-transform:uppercase; }
    .content { padding:36px 28px; }
    .title { font-family: Arial, sans-serif; color:#ffffff; font-size:28px; font-weight:800; letter-spacing:-0.4px; margin:0 0 8px 0; }
    .text { font-family: Arial, sans-serif; color:#a1a1aa; font-size:15px; line-height:1.6; margin:0 0 14px 0; }
    .highlight { color:#8B5CF6; font-weight:700; }
    .emoji { font-size:18px; }
    .cta-button { display:inline-block; background: linear-gradient(90deg, #6366F1, #8B5CF6); color:#ffffff; padding:14px 28px; border-radius:10px; text-decoration:none; font-weight:700; font-size:16px; box-shadow:0 4px 20px rgba(99,102,241,0.3); margin:10px 0; }
    .footer { border-top:1px solid rgba(99,102,241,0.15); padding:28px 20px; text-align:center; }
    .footer-text { color:#71717a; font-size:12px; margin:8px 0; font-family: Arial, sans-serif; }
    .footer-link { color:#667eea; text-decoration:none; font-weight:700; }

    @media (max-width:600px) { .content { padding:28px 20px; } .title { font-size:24px; } }
  </style>
</head>
<body style="margin:0; background:#0a0a0a;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="container gmail-table">
    <tr>
      <td>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="shell gmail-fix gmail-table">
          <tr>
            <td class="header">
              <div class="logo">JobPing</div>
              <div class="tag">AI Powered Job Matching for Europe</div>
            </td>
          </tr>
          <tr>
            <td class="content" align="center">
              <h1 class="title">Hey ${name}! <span class="emoji">👋</span></h1>
              <p class="text">We've been thinking about you...</p>
              <p class="text">It's been a while since we last connected, and honestly, <span class="highlight">we miss having you around!</span> We've been working on something exciting and we're <span class="highlight">thrilled to share it with you</span>.</p>
              
              <p class="text">Since you last visited, we've:</p>
              <ul style="color:#a1a1aa; font-family: Arial, sans-serif; text-align:left; max-width:400px; margin:0 auto;">
                <li>🎯 <span class="highlight">Improved our AI matching</span> - even better job recommendations</li>
                <li>🚀 <span class="highlight">Added 2,000+ new opportunities</span> across Europe</li>
                <li>⚡ <span class="highlight">Made the experience faster</span> - 60-second job reviews</li>
                <li>💎 <span class="highlight">Launched premium features</span> for serious job seekers</li>
              </ul>
              
              <p class="text">We're <span class="highlight">excited to show you</span> what's new and help you find your next amazing role!</p>
              
              <a href="${process.env.NEXT_PUBLIC_URL || 'https://getjobping.com'}" class="cta-button">
                Show Me What's New! 🚀
              </a>
              
              <p class="text" style="color:#71717a; font-size:13px; margin-top:20px;">
                Or if you'd prefer, you can <a href="${unsubscribeUrl}" class="footer-link">unsubscribe here</a> - no hard feelings! 💙
              </p>
            </td>
          </tr>
          <tr>
            <td class="footer">
              <div class="footer-text">
                <a href="${process.env.NEXT_PUBLIC_URL || 'https://getjobping.com'}" class="footer-link">JobPing</a> | 
                <a href="${process.env.NEXT_PUBLIC_URL || 'https://getjobping.com'}/legal/unsubscribe" class="footer-link">Unsubscribe</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Check if re-engagement emails should be sent (run this as a cron job)
 */
export async function shouldRunReEngagement(): Promise<boolean> {
  try {
    const candidates = await getReEngagementCandidates();
    return candidates.length > 0;
  } catch (error) {
    console.error('Error checking re-engagement candidates:', error);
    return false;
  }
}

/**
 * Get re-engagement statistics
 */
export async function getReEngagementStats(): Promise<{
  totalCandidates: number;
  lastRun: string | null;
}> {
  try {
    const candidates = await getReEngagementCandidates();
    
    // In a real implementation, you'd track the last run time
    // For now, we'll return the current count
    return {
      totalCandidates: candidates.length,
      lastRun: null
    };
  } catch (error) {
    console.error('Error getting re-engagement stats:', error);
    return {
      totalCandidates: 0,
      lastRun: null
    };
  }
}
