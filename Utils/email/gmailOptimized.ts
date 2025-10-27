// GMAIL-OPTIMIZED EMAIL TEMPLATES
// Best practices: Light background, high contrast, large fonts, simple layout

import { EmailJobCard } from './types';

// Gmail-optimized colors (light theme, high contrast)
const COLORS = {
  primary: '#6366F1',      // Purple
  primaryDark: '#4F46E5',  // Darker purple for hover
  primaryLight: '#818CF8', // Lighter purple
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  green: '#10B981',
  red: '#EF4444',
};

// Header
const createHeader = () => `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%);">
  <tr>
    <td align="center" style="padding: 48px 24px;">
      <div style="font-size: 56px; font-weight: 900; color: ${COLORS.white}; margin-bottom: 8px; letter-spacing: -2px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        JobPing
      </div>
      <div style="color: ${COLORS.white}; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; opacity: 0.95;">
        AI-Powered Job Matching
      </div>
    </td>
  </tr>
</table>
`;

// Footer
const createFooter = () => `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${COLORS.gray100}; border-top: 3px solid ${COLORS.primary};">
  <tr>
    <td align="center" style="padding: 40px 24px;">
      <div style="font-size: 32px; font-weight: 800; color: ${COLORS.primary}; margin-bottom: 12px; letter-spacing: -1px;">
        JobPing
      </div>
      <div style="color: ${COLORS.gray700}; font-size: 14px; margin-bottom: 20px; font-weight: 500;">
        AI-powered job matching for Europe
      </div>
      <div style="margin: 16px 0;">
        <a href="https://www.getjobping.com/legal/unsubscribe" style="color: ${COLORS.primary}; text-decoration: underline; font-weight: 600; font-size: 14px;">Unsubscribe</a>
      </div>
      <div style="color: ${COLORS.gray700}; font-size: 12px; margin-top: 16px;">
        © 2025 JobPing. All rights reserved.
      </div>
    </td>
  </tr>
</table>
`;

// Job Card (light, high contrast, readable)
const createJobCard = (card: EmailJobCard, userEmail: string) => {
  const matchScore = Math.round(card.matchResult?.match_score || 85);
  const isHotMatch = matchScore >= 90;
  
  const borderColor = isHotMatch ? COLORS.primary : COLORS.gray300;
  const bgColor = isHotMatch ? '#F5F3FF' : COLORS.white; // Light purple tint for hot matches
  
  const description = card.job.description && card.job.description.trim().length > 0
    ? `<div style="color: ${COLORS.gray700}; font-size: 16px; line-height: 1.7; margin: 20px 0;">${card.job.description.substring(0, 250)}${card.job.description.length > 250 ? '...' : ''}</div>`
    : '';
  
  const hotBadge = isHotMatch
    ? `<div style="background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%); color: ${COLORS.white}; padding: 12px 24px; border-radius: 50px; font-weight: 700; margin-bottom: 20px; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);">HOT MATCH • ${matchScore}%</div>`
    : '';
  
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
  <tr>
    <td>
      <table width="100%" cellpadding="32" cellspacing="0" border="0" style="background-color: ${bgColor}; border: 2px solid ${borderColor}; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td>
            ${hotBadge}
            
            <div style="font-size: 24px; font-weight: 700; color: ${COLORS.gray900}; margin-bottom: 16px; line-height: 1.3;">
              ${card.job.title || 'Job Title'}
            </div>
            
            <div style="color: ${COLORS.gray800}; font-weight: 600; margin-bottom: 12px; font-size: 18px;">
              ${card.job.company || 'Company'}
            </div>
            
            <div style="color: ${COLORS.gray700}; font-size: 16px; margin-bottom: 20px; font-weight: 500;">
              ${card.job.location || 'Location'}
            </div>
            
            ${!isHotMatch ? `<div style="margin: 20px 0;"><span style="background-color: ${COLORS.primary}; color: ${COLORS.white}; padding: 12px 28px; border-radius: 50px; font-size: 16px; font-weight: 700; display: inline-block; box-shadow: 0 2px 4px rgba(99, 102, 241, 0.2);">${matchScore}% Match</span></div>` : ''}
            
            ${description}
            
            ${card.job.job_url ? `
            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px;">
              <tr>
                <td align="center">
                  <a href="${card.job.job_url}" style="display: inline-block; background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%); color: ${COLORS.white}; padding: 18px 48px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 18px; text-align: center; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); letter-spacing: 0.5px;">
                    APPLY NOW
                  </a>
                </td>
              </tr>
            </table>
            
            <!-- Job URL for copy-paste -->
            <div style="margin-top: 24px; padding: 20px; background-color: ${COLORS.gray100}; border-radius: 8px; border: 2px solid ${COLORS.gray200};">
              <div style="font-size: 13px; color: ${COLORS.gray700}; font-weight: 600; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">
                APPLICATION LINK
              </div>
              <div style="font-size: 14px; color: ${COLORS.primary}; word-break: break-all; font-family: 'Courier New', monospace; line-height: 1.6;">
                ${card.job.job_url}
              </div>
              <div style="margin-top: 10px; font-size: 13px; color: ${COLORS.gray700};">
                Copy and paste into your browser if button doesn't work
              </div>
            </div>
            ` : ''}
            
            <!-- Feedback Section (no emojis) -->
            <table width="100%" cellpadding="24" cellspacing="0" border="0" style="margin-top: 32px; background-color: ${COLORS.gray50}; border: 2px solid ${COLORS.gray200}; border-radius: 8px;">
              <tr>
                <td>
                  <div style="text-align: center; color: ${COLORS.gray900}; font-size: 16px; font-weight: 700; margin-bottom: 8px;">
                    How good is this match?
                  </div>
                  <div style="text-align: center; color: ${COLORS.gray700}; font-size: 14px; margin-bottom: 20px;">
                    Help us learn your preferences
                  </div>
                  
                  <table width="100%" cellpadding="8" cellspacing="0" border="0">
                    <tr>
                      <td width="20%" align="center">
                        <a href="https://www.getjobping.com/api/feedback/email?action=positive&score=5&job=${card.job.job_hash || 'unknown'}&email=${encodeURIComponent(userEmail)}" style="display: block; padding: 16px 8px; border-radius: 8px; text-decoration: none; text-align: center; border: 2px solid ${COLORS.green}; font-size: 14px; font-weight: 700; color: ${COLORS.green}; background-color: ${COLORS.white};" target="_blank">
                          PERFECT
                        </a>
                      </td>
                      <td width="20%" align="center">
                        <a href="https://www.getjobping.com/api/feedback/email?action=positive&score=4&job=${card.job.job_hash || 'unknown'}&email=${encodeURIComponent(userEmail)}" style="display: block; padding: 16px 8px; border-radius: 8px; text-decoration: none; text-align: center; border: 2px solid ${COLORS.primary}; font-size: 14px; font-weight: 700; color: ${COLORS.primary}; background-color: ${COLORS.white};" target="_blank">
                          GOOD
                        </a>
                      </td>
                      <td width="20%" align="center">
                        <a href="https://www.getjobping.com/api/feedback/email?action=neutral&score=3&job=${card.job.job_hash || 'unknown'}&email=${encodeURIComponent(userEmail)}" style="display: block; padding: 16px 8px; border-radius: 8px; text-decoration: none; text-align: center; border: 2px solid ${COLORS.gray300}; font-size: 14px; font-weight: 700; color: ${COLORS.gray700}; background-color: ${COLORS.white};" target="_blank">
                          OK
                        </a>
                      </td>
                      <td width="20%" align="center">
                        <a href="https://www.getjobping.com/api/feedback/email?action=negative&score=2&job=${card.job.job_hash || 'unknown'}&email=${encodeURIComponent(userEmail)}" style="display: block; padding: 16px 8px; border-radius: 8px; text-decoration: none; text-align: center; border: 2px solid ${COLORS.gray300}; font-size: 14px; font-weight: 700; color: ${COLORS.gray700}; background-color: ${COLORS.white};" target="_blank">
                          POOR
                        </a>
                      </td>
                      <td width="20%" align="center">
                        <a href="https://www.getjobping.com/api/feedback/email?action=negative&score=1&job=${card.job.job_hash || 'unknown'}&email=${encodeURIComponent(userEmail)}" style="display: block; padding: 16px 8px; border-radius: 8px; text-decoration: none; text-align: center; border: 2px solid ${COLORS.red}; font-size: 14px; font-weight: 700; color: ${COLORS.red}; background-color: ${COLORS.white};" target="_blank">
                          BAD
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <div style="font-size: 13px; color: ${COLORS.gray700}; text-align: center; margin-top: 16px; font-weight: 600;">
                    Our AI improves with every rating
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

// Welcome Email
export function createWelcomeEmailOptimized(userName?: string, matchCount: number = 10, tier: 'free' | 'premium' = 'free'): string {
  const greeting = userName ? `, ${userName}` : '';
  const isPremium = tier === 'premium';
  
  const weeklyInfo = isPremium
    ? `<div style="color: ${COLORS.gray700}; font-size: 15px; line-height: 1.7;">
        <strong style="color: ${COLORS.primary};">Premium Plan:</strong> Your first 10 roles + 5 roles every 48 hours (Mon/Wed/Fri) + 24-hour early access
      </div>`
    : `<div style="color: ${COLORS.gray700}; font-size: 15px; line-height: 1.7;">
        <strong>Free Plan:</strong> Your first 5 roles + 5 new roles every week
      </div>
      <div style="margin-top: 16px; padding: 16px; background-color: #EEF2FF; border-radius: 8px; border: 2px solid ${COLORS.primary};">
        <div style="color: ${COLORS.primary}; font-size: 14px; font-weight: 700; margin-bottom: 8px;">
          Want 3× more opportunities?
        </div>
        <div style="color: ${COLORS.gray700}; font-size: 14px; margin-bottom: 12px;">
          Upgrade to Premium for 70+ jobs per month vs 30 on free tier
        </div>
        <a href="https://www.getjobping.com/upgrade" style="display: inline-block; background: ${COLORS.primary}; color: ${COLORS.white}; padding: 12px 24px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 14px;">
          Upgrade to Premium - €7/month
        </a>
      </div>`;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to JobPing</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .padding { padding: 20px !important; }
      .title { font-size: 32px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.gray100}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${COLORS.gray100};">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: ${COLORS.white}; max-width: 600px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); border-radius: 12px; overflow: hidden;">
          <tr>
            <td>
              ${createHeader()}
              
              <table width="100%" cellpadding="48" cellspacing="0" border="0">
                <tr>
                  <td align="center" class="padding">
                    <div class="title" style="font-size: 40px; font-weight: 900; color: ${COLORS.gray900}; margin-bottom: 16px; letter-spacing: -1px; line-height: 1.1;">
                      Welcome${greeting}!
                    </div>
                    <div style="font-size: 18px; color: ${COLORS.gray700}; margin-bottom: 24px; font-weight: 500; line-height: 1.6;">
                      Your AI career assistant is finding your perfect matches
                    </div>
                    
                    <div style="background: linear-gradient(135deg, ${COLORS.green} 0%, #059669 100%); color: ${COLORS.white}; padding: 20px 36px; border-radius: 50px; font-weight: 700; margin: 32px auto; font-size: 20px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                      Your First ${matchCount} Matches Arriving in 48 Hours
                    </div>
                    
                    <div style="font-size: 18px; color: ${COLORS.gray700}; margin: 24px 0; font-weight: 500; line-height: 1.7;">
                      You'll automatically receive your first ${matchCount} hand-picked matches within 48 hours—no spam, just quality opportunities matched to your profile.
                    </div>
                    
                    <!-- Spam Warning -->
                    <div style="margin: 24px 0; padding: 20px; background-color: #FEF3C7; border-radius: 8px; border-left: 4px solid #F59E0B;">
                      <div style="color: #92400E; font-size: 16px; font-weight: 700; margin-bottom: 8px;">
                        ⚠️ Check Your Spam Folder
                      </div>
                      <div style="color: #78350F; font-size: 15px; line-height: 1.7;">
                        Our emails sometimes land in spam/junk. Check there if you don't see them in your inbox!
                      </div>
                    </div>
                    
                    <div style="margin-top: 32px; padding: 24px; background-color: ${COLORS.gray50}; border-radius: 8px; border-left: 4px solid ${COLORS.primary};">
                      <div style="color: ${COLORS.gray800}; font-size: 16px; font-weight: 600; margin-bottom: 16px;">
                        What happens next?
                      </div>
                      ${weeklyInfo}
                    </div>
                    
                    <div style="margin-top: 24px; font-size: 15px; color: ${COLORS.gray700}; line-height: 1.7;">
                      Sit back and relax. We'll send your matches automatically—no action needed!
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

// Job Matches Email
export function createJobMatchesEmailOptimized(
  jobCards: EmailJobCard[],
  userName?: string,
  subscriptionTier: 'free' | 'premium' = 'free',
  isSignupEmail: boolean = false
): string {
  const premiumBadge = subscriptionTier === 'premium' 
    ? `<div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: ${COLORS.black}; padding: 14px 32px; border-radius: 50px; text-align: center; font-size: 14px; font-weight: 800; text-transform: uppercase; margin-bottom: 24px; letter-spacing: 1px; display: inline-block; box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);">PREMIUM MEMBER</div>` 
    : '';
  
  const title = isSignupEmail 
    ? '5 Perfect Matches' 
    : `${jobCards.length} New Matches`;
  
  const greeting = userName ? `${userName}, we` : 'We';
  
  const jobCardsHtml = jobCards.map(card => createJobCard(card, card.job.user_email || '')).join('');
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Job Matches - JobPing</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .padding { padding: 20px !important; }
      .title { font-size: 32px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.gray100}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${COLORS.gray100};">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: ${COLORS.white}; max-width: 600px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); border-radius: 12px; overflow: hidden;">
          <tr>
            <td>
              ${createHeader()}
              
              <table width="100%" cellpadding="48" cellspacing="0" border="0">
                <tr>
                  <td class="padding">
                    <div style="text-align: center; margin-bottom: 40px;">
                      ${premiumBadge}
                      <div class="title" style="font-size: 40px; font-weight: 900; color: ${COLORS.gray900}; margin-bottom: 16px; letter-spacing: -1px; line-height: 1.1;">
                        ${title}
                      </div>
                      <div style="font-size: 18px; color: ${COLORS.gray700}; font-weight: 500; line-height: 1.6;">
                        ${greeting} found roles that match you—no spam, just quality
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

