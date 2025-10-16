// 📧 GMAIL-COMPATIBLE EMAIL TEMPLATES
// Uses table-based layout + inline styles for maximum compatibility

import { EmailJobCard } from './types';

// Inline styles for Gmail compatibility
const COLORS = {
  purple: '#6366F1',
  purpleDark: '#7C3AED',
  purpleLight: '#8B5CF6',
  black: '#000000',
  gray900: '#0a0a0a',
  gray800: '#1a1a1a',
  gray700: '#2a2a2a',
  gray600: '#3a3a3a',
  gray500: '#71717a',
  gray400: '#a1a1aa',
  gray300: '#d4d4d8',
  white: '#ffffff',
  green: '#10b981',
  gold: '#ffd700',
};

// Header component (table-based)
const createHeader = () => `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${COLORS.purple};">
  <tr>
    <td align="center" style="padding: 40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center">
            <div style="font-size: 48px; font-weight: 800; color: ${COLORS.white}; margin-bottom: 4px; letter-spacing: -1px;">
              JobPing
            </div>
            <div style="color: ${COLORS.white}; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">
              AI-Powered Job Matching for Europe
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`;

// Footer component (table-based)
const createFooter = () => `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${COLORS.gray900};">
  <tr>
    <td align="center" style="padding: 32px 24px; border-top: 1px solid ${COLORS.gray700};">
      <div style="font-size: 24px; font-weight: 700; color: ${COLORS.purpleLight}; margin-bottom: 8px;">
        JobPing
      </div>
      <div style="color: ${COLORS.gray500}; font-size: 13px; margin-bottom: 16px;">
        AI-powered job matching for Europe
      </div>
      <div style="color: ${COLORS.gray500}; font-size: 12px; margin: 8px 0;">
        <a href="https://getjobping.com/legal/unsubscribe" style="color: ${COLORS.purple}; text-decoration: none; font-weight: 600;">Unsubscribe</a>
      </div>
    </td>
  </tr>
</table>
`;

// Job card component (table-based, Gmail-safe)
const createJobCard = (card: EmailJobCard, userEmail: string) => {
  const matchScore = card.matchResult?.match_score || 85;
  const isHotMatch = matchScore >= 90;
  
  const borderColor = isHotMatch ? COLORS.purpleLight : COLORS.gray700;
  const bgColor = isHotMatch ? '#1a1626' : COLORS.gray800;
  
  const description = card.job.description && card.job.description.trim().length > 0
    ? `<div style="color: #aaa; font-size: 15px; line-height: 1.6; margin: 16px 0;">${card.job.description.substring(0, 200)}${card.job.description.length > 200 ? '...' : ''}</div>`
    : '';
  
  const hotBadge = isHotMatch
    ? `<div style="background-color: ${COLORS.purpleLight}; color: ${COLORS.white}; padding: 8px 16px; border-radius: 8px; font-weight: 600; margin-bottom: 16px; display: inline-block; font-size: 13px;">Hot Match • ${matchScore}% Match</div>`
    : '';
  
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
  <tr>
    <td>
      <table width="100%" cellpadding="28" cellspacing="0" border="0" style="background-color: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 16px;">
        <tr>
          <td>
            ${hotBadge}
            <div style="font-size: 20px; font-weight: 700; color: ${COLORS.white}; margin-bottom: 12px; line-height: 1.3;">
              ${card.job.title || 'Job Title'}
            </div>
            <div style="color: ${COLORS.gray400}; font-weight: 600; margin-bottom: 8px; font-size: 15px;">
              ${card.job.company || 'Company'}
            </div>
            <div style="color: ${COLORS.gray500}; font-size: 14px; margin-bottom: 16px;">
              ${card.job.location || 'Location'}
            </div>
            <div style="margin-top: 16px;">
              ${isHotMatch ? '' : `<span style="background-color: ${COLORS.purple}; color: ${COLORS.white}; padding: 10px 20px; border-radius: 20px; font-size: 14px; font-weight: 700; display: inline-block;">${matchScore}% Match</span>`}
            </div>
            ${description}
            
            <!-- Application Link Section -->
            ${card.job.job_url ? `
            <table width="100%" cellpadding="16" cellspacing="0" border="0" style="margin-top: 20px; background-color: rgba(99,102,241,0.1); border-radius: 12px; border: 1px solid rgba(99,102,241,0.2);">
              <tr>
                <td>
                  <div style="font-size: 12px; color: ${COLORS.gray400}; font-weight: 600; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                    APPLICATION LINK
                  </div>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center">
                        <a href="${card.job.job_url}" style="display: block; background-color: ${COLORS.purple}; color: ${COLORS.white}; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; text-align: center; margin: 12px 0;">
                          Apply Now →
                        </a>
                      </td>
                    </tr>
                  </table>
                  <div style="margin: 12px 0 0 0; font-size: 12px; color: ${COLORS.purple}; word-break: break-all; font-family: monospace; padding: 10px; background-color: rgba(0,0,0,0.4); border-radius: 8px; border: 1px solid rgba(99,102,241,0.15);">
                    ${card.job.job_url}
                  </div>
                  <div style="margin-top: 8px; font-size: 11px; color: ${COLORS.gray500}; text-align: center;">
                    Or copy and paste this link into your browser
                  </div>
                </td>
              </tr>
            </table>
            ` : ''}
            
            <!-- Feedback Section -->
            <table width="100%" cellpadding="20" cellspacing="0" border="0" style="margin-top: 24px; background-color: rgba(99,102,241,0.05); border: 1px solid rgba(99,102,241,0.15); border-radius: 12px;">
              <tr>
                <td>
                  <div style="text-align: center; color: ${COLORS.white}; font-size: 14px; font-weight: 600; margin-bottom: 8px;">
                    How good is this match?
                  </div>
                  <div style="text-align: center; color: #888; font-size: 11px; margin-bottom: 16px; font-style: italic;">
                    Help our AI learn your preferences
                  </div>
                  
                  <!-- Feedback buttons (table for Gmail compatibility) -->
                  <table width="100%" cellpadding="0" cellspacing="8" border="0">
                    <tr>
                      <td width="20%" align="center">
                        <a href="https://getjobping.com/api/feedback/email?action=positive&score=5&job=${card.job.job_hash || 'unknown'}&email=${encodeURIComponent(userEmail)}" style="display: block; padding: 12px 8px; border-radius: 8px; text-decoration: none; text-align: center; border: 1px solid #2a2a2a; font-size: 11px; font-weight: 500; color: #888; background-color: rgba(139,92,246,0.1);" target="_blank">
                          <span style="display: block; font-size: 20px; margin-bottom: 4px;">⭐</span>
                          <span>Perfect</span>
                        </a>
                      </td>
                      <td width="20%" align="center">
                        <a href="https://getjobping.com/api/feedback/email?action=positive&score=4&job=${card.job.job_hash || 'unknown'}&email=${encodeURIComponent(userEmail)}" style="display: block; padding: 12px 8px; border-radius: 8px; text-decoration: none; text-align: center; border: 1px solid #2a2a2a; font-size: 11px; font-weight: 500; color: #888; background-color: rgba(99,102,241,0.1);" target="_blank">
                          <span style="display: block; font-size: 20px; margin-bottom: 4px;">👍</span>
                          <span>Good</span>
                        </a>
                      </td>
                      <td width="20%" align="center">
                        <a href="https://getjobping.com/api/feedback/email?action=neutral&score=3&job=${card.job.job_hash || 'unknown'}&email=${encodeURIComponent(userEmail)}" style="display: block; padding: 12px 8px; border-radius: 8px; text-decoration: none; text-align: center; border: 1px solid #2a2a2a; font-size: 11px; font-weight: 500; color: #888; background-color: rgba(245,158,11,0.1);" target="_blank">
                          <span style="display: block; font-size: 20px; margin-bottom: 4px;">🤔</span>
                          <span>OK</span>
                        </a>
                      </td>
                      <td width="20%" align="center">
                        <a href="https://getjobping.com/api/feedback/email?action=negative&score=2&job=${card.job.job_hash || 'unknown'}&email=${encodeURIComponent(userEmail)}" style="display: block; padding: 12px 8px; border-radius: 8px; text-decoration: none; text-align: center; border: 1px solid #2a2a2a; font-size: 11px; font-weight: 500; color: #888; background-color: rgba(239,68,68,0.1);" target="_blank">
                          <span style="display: block; font-size: 20px; margin-bottom: 4px;">👎</span>
                          <span>Poor</span>
                        </a>
                      </td>
                      <td width="20%" align="center">
                        <a href="https://getjobping.com/api/feedback/email?action=negative&score=1&job=${card.job.job_hash || 'unknown'}&email=${encodeURIComponent(userEmail)}" style="display: block; padding: 12px 8px; border-radius: 8px; text-decoration: none; text-align: center; border: 1px solid #2a2a2a; font-size: 11px; font-weight: 500; color: #888; background-color: rgba(220,38,38,0.1);" target="_blank">
                          <span style="display: block; font-size: 20px; margin-bottom: 4px;">❌</span>
                          <span>Bad</span>
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <div style="font-size: 12px; color: ${COLORS.purpleLight}; text-align: center; margin-top: 14px; font-weight: 600;">
                    🧠 Our AI gets smarter with every rating
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
  `;
};

// Welcome email (Gmail-compatible)
export function createWelcomeEmailGmail(userName?: string, matchCount: number = 5): string {
  const greeting = userName ? `, ${userName}` : '';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to JobPing</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.gray900}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${COLORS.gray900};">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: ${COLORS.black}; max-width: 600px;">
          <tr>
            <td>
              ${createHeader()}
              
              <!-- Content -->
              <table width="100%" cellpadding="40" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <div style="font-size: 32px; font-weight: 700; color: ${COLORS.white}; margin-bottom: 12px; letter-spacing: -1px; line-height: 1.2;">
                      Welcome${greeting}! 🎉
                    </div>
                    <div style="font-size: 16px; color: ${COLORS.gray400}; margin-bottom: 16px; font-weight: 400; line-height: 1.6;">
                      Your AI career assistant is now active and working for you.
                    </div>
                    
                    <div style="background-color: ${COLORS.green}; color: ${COLORS.white}; padding: 16px 28px; border-radius: 16px; font-weight: 700; margin: 24px auto; max-width: fit-content; font-size: 18px;">
                      🚀 ${matchCount} perfect matches found!
                    </div>
                    
                    <div style="font-size: 16px; color: ${COLORS.gray400}; margin-bottom: 16px; font-weight: 400; line-height: 1.6;">
                      We found roles that actually fit your profile—no job board spam, just quality opportunities.
                    </div>
                    
                    <div style="margin-top: 24px; color: ${COLORS.gray500}; font-size: 14px;">
                      Expect fresh matches in your inbox every week. Each email will be personalized to your preferences.
                    </div>
                  </td>
                </tr>
              </table>
              
              ${createFooter()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Job matches email (Gmail-compatible)
export function createJobMatchesEmailGmail(
  jobCards: EmailJobCard[],
  userName?: string,
  subscriptionTier: 'free' | 'premium' = 'free',
  isSignupEmail: boolean = false,
  personalization?: {
    role?: string;
    location?: string;
    salaryRange?: string;
    dayText?: string;
    entryLevelLabel?: string;
  }
): string {
  const premiumBadge = subscriptionTier === 'premium' 
    ? `<div style="background-color: ${COLORS.gold}; color: ${COLORS.black}; padding: 12px 28px; border-radius: 20px; text-align: center; font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 24px; letter-spacing: 1px; display: inline-block;">⭐ Premium Member</div>` 
    : '';
  
  const title = isSignupEmail 
    ? '5 perfect matches just dropped 🎯' 
    : personalization?.dayText 
      ? `Your fresh ${personalization.dayText} matches 🎯`
      : `${jobCards.length} new matches for you 🎯`;
  
  const greeting = userName ? `${userName}, we` : 'We';
  
  const jobCardsHtml = jobCards.map(card => createJobCard(card, card.job.user_email || '')).join('');
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Job Matches</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.gray900}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${COLORS.gray900};">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: ${COLORS.black}; max-width: 600px;">
          <tr>
            <td>
              ${createHeader()}
              
              <!-- Content -->
              <table width="100%" cellpadding="40" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="text-align: center; margin-bottom: 40px;">
                      ${premiumBadge}
                      <div style="font-size: 32px; font-weight: 700; color: ${COLORS.white}; margin-bottom: 12px; letter-spacing: -1px; line-height: 1.2;">
                        ${title}
                      </div>
                      <div style="font-size: 16px; color: ${COLORS.gray400}; margin-bottom: 16px; font-weight: 400; line-height: 1.6;">
                        ${greeting} found roles that actually match you—no generic spam, just quality.
                      </div>
                    </div>
                    
                    ${jobCardsHtml}
                  </td>
                </tr>
              </table>
              
              ${createFooter()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

