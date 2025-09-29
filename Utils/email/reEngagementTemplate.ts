/**
 * RE-ENGAGEMENT EMAIL TEMPLATE
 * Sent to inactive users to re-engage them
 */

export interface ReEngagementEmailData {
  to: string;
  userName: string;
  unsubscribeUrl: string;
}

export function generateReEngagementEmail(data: ReEngagementEmailData): string {
  const { to, userName, unsubscribeUrl } = data;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>We miss you at JobPing</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #000000;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            line-height: 1.6;
            color: #FFFFFF;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #0A0A0A;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 16px 48px rgba(0,0,0,0.2);
            border: 1px solid #1A1A1A;
        }
        .header {
            /* Match site brand gradient: indigo → purple */
            background: linear-gradient(135deg, #6366F1 0%, #7C3AED 50%, #8B5CF6 100%);
            padding: 40px 32px;
            text-align: center;
            position: relative;
        }
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.05) 100%);
            pointer-events: none;
        }
        .jobping-logo {
            font-size: 32px;
            font-weight: 700;
            color: #FFFFFF;
            margin-bottom: 8px;
            letter-spacing: -0.03em;
            position: relative;
            z-index: 1;
        }
        .tagline {
            color: rgba(255,255,255,0.9);
            font-size: 16px;
            font-weight: 500;
            position: relative;
            z-index: 1;
        }
        .content {
            padding: 48px 40px;
            background: #0A0A0A;
        }
        .greeting {
            text-align: center;
            margin-bottom: 40px;
        }
        .greeting-title {
            font-size: 32px;
            font-weight: bold;
            color: #FFFFFF;
            margin-bottom: 20px;
            line-height: 1.2;
        }
        .greeting-text {
            font-size: 18px;
            color: #AAAAAA;
            margin-bottom: 32px;
            line-height: 1.6;
            max-width: 500px;
            margin-left: auto;
            margin-right: auto;
        }
        .re-engagement-box {
            background: #1A1A1A;
            border: 1px solid #333333;
            border-radius: 16px;
            padding: 32px;
            margin: 32px 0;
            text-align: center;
        }
        .re-engagement-title {
            font-size: 24px;
            font-weight: bold;
            color: #FFFFFF;
            margin-bottom: 16px;
            line-height: 1.3;
        }
        .re-engagement-text {
            font-size: 16px;
            color: #CCCCCC;
            margin-bottom: 24px;
            line-height: 1.6;
            max-width: 450px;
            margin-left: auto;
            margin-right: auto;
        }
        .cta-button {
            /* Match site CTA: gradient + larger, rounded pill */
            background: linear-gradient(90deg, #6366F1, #7C3AED, #8B5CF6);
            color: #FFFFFF !important;
            padding: 18px 36px;
            border-radius: 16px;
            text-decoration: none;
            font-weight: 800;
            letter-spacing: -0.01em;
            display: inline-block;
            margin: 28px 0;
            box-shadow: 0 18px 48px rgba(99,102,241,0.35);
            font-size: 16px;
        }
        .cta-button:hover {
            filter: brightness(1.06);
        }
        .benefits {
            background: #111111;
            border: 1px solid #333333;
            border-radius: 16px;
            padding: 32px;
            margin: 32px 0;
        }
        .benefits-title {
            font-size: 20px;
            font-weight: bold;
            color: #FFFFFF;
            margin-bottom: 20px;
            text-align: center;
        }
        .benefit-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 16px;
            font-size: 15px;
            color: #AAAAAA;
            line-height: 1.5;
            padding: 8px 0;
        }
        .benefit-icon {
            width: 18px;
            height: 18px;
            margin-right: 16px;
            margin-top: 2px;
            color: #6366F1; /* brand-500 */
            flex-shrink: 0;
        }
        .footer {
            background: #000000;
            border-top: 1px solid #1A1A1A;
            padding: 32px 40px;
            text-align: center;
        }
        .footer-text {
            color: #666666;
            font-size: 13px;
            margin-bottom: 12px;
            line-height: 1.5;
        }
        .unsubscribe-link {
            color: #AAAAAA;
            text-decoration: none;
            font-size: 12px;
        }
        .unsubscribe-link:hover {
            color: #FFFFFF;
        }
        @media (max-width: 600px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }
            .content, .header {
                padding: 24px 20px;
            }
            .greeting-title {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="jobping-logo">JobPing</div>
            <div class="tagline">Smart job discovery for students</div>
        </div>
        
        <div class="content">
            <div class="greeting">
                <h1 class="greeting-title">We miss you, ${userName || 'there'}! 👋</h1>
                <p class="greeting-text">
                    It's been a while since you've opened our emails. We've been finding some amazing opportunities that might be perfect for you.
                </p>
            </div>
            
            <div class="re-engagement-box">
                <h2 class="re-engagement-title">🎯 Ready to get back on track?</h2>
                <p class="re-engagement-text">
                    We've paused your job matches to avoid cluttering your inbox. But we're still finding great opportunities for you!
                </p>
                <a href="https://www.getjobping.com" class="cta-button">
                    Resume My Job Matches
                </a>
            </div>
            
            <div class="benefits">
                <h3 class="benefits-title">What you're missing:</h3>
                <div class="benefit-item">
                    <svg class="benefit-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    <span>5 hand-picked job matches per email</span>
                </div>
                <div class="benefit-item">
                    <svg class="benefit-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    <span>AI-powered matching for early-career roles</span>
                </div>
                <div class="benefit-item">
                    <svg class="benefit-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    <span>Europe-wide coverage from trusted job boards</span>
                </div>
                <div class="benefit-item">
                    <svg class="benefit-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    <span>No CV required - just your preferences</span>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p class="footer-text">
                JobPing - Weekly job matches for early-career roles across Europe
            </p>
            <p class="footer-text">
                <a href="${unsubscribeUrl}" class="unsubscribe-link">Unsubscribe</a> | 
                <a href="https://www.getjobping.com" class="unsubscribe-link">Visit JobPing</a>
            </p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

export function generateReEngagementSubject(userName?: string): string {
  if (userName) {
    return `We miss you, ${userName}! Your job matches are waiting`;
  }
  return "We miss you! Your job matches are waiting";
}
