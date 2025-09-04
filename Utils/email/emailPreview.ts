// 📧 EMAIL PREVIEW SYSTEM - TEST NEW DESIGNS WITH FEEDBACK INTEGRATION

import { createWelcomeEmail, createJobMatchesEmail } from './templates';
import { EmailJobCard } from './types';

/**
 * Email preview system for testing new designs
 * Generates sample emails with realistic data
 */
export class EmailPreviewSystem {
  
  /**
   * Generate sample job data for testing
   */
  static generateSampleJobs(count: number = 3): EmailJobCard[] {
    const sampleJobs = [
      {
        title: 'Senior Frontend Engineer',
        company: 'TechCorp Europe',
        location: 'Berlin, Germany',
        job_hash: 'job_123456789_abc123',
        user_email: 'test@example.com'
      },
      {
        title: 'Full Stack Developer',
        company: 'StartupHub',
        location: 'Amsterdam, Netherlands',
        job_hash: 'job_987654321_def456',
        user_email: 'test@example.com'
      },
      {
        title: 'DevOps Engineer',
        company: 'CloudScale',
        location: 'Dublin, Ireland',
        job_hash: 'job_456789123_ghi789',
        user_email: 'test@example.com'
      }
    ];

    return sampleJobs.slice(0, count).map((job, index) => ({
      job: {
        ...job,
        salary: `€${(60 + index * 20)}k - €${(80 + index * 25)}k`,
        skills: ['React', 'TypeScript', 'Node.js', 'AWS'],
        experience: '3-5 years'
      },
      matchResult: {
        match_score: 85 + (index * 5),
        confidence: 0.8 + (index * 0.1)
      },
      isConfident: index === 0,
      isPromising: index > 0,
      hasManualLocator: false,
      searchHint: `Based on your ${['frontend', 'full-stack', 'devops'][index]} experience`
    }));
  }

  /**
   * Generate welcome email preview
   */
  static generateWelcomePreview(userName?: string, matchCount: number = 5): string {
    return createWelcomeEmail(userName, matchCount);
  }

  /**
   * Generate job matches email preview
   */
  static generateJobMatchesPreview(
    userName?: string,
    subscriptionTier: 'free' | 'premium' = 'free',
    isSignupEmail: boolean = false,
    jobCount: number = 3
  ): string {
    const sampleJobs = this.generateSampleJobs(jobCount);
    return createJobMatchesEmail(sampleJobs, userName, subscriptionTier, isSignupEmail);
  }

  /**
   * Generate comprehensive email preview with all variations
   */
  static generateAllPreviews(): {
    welcome: string;
    jobMatchesFree: string;
    jobMatchesPremium: string;
    jobMatchesSignup: string;
  } {
    return {
      welcome: this.generateWelcomePreview('Sarah', 7),
      jobMatchesFree: this.generateJobMatchesPreview('Sarah', 'free', false, 3),
      jobMatchesPremium: this.generateJobMatchesPreview('Sarah', 'premium', false, 5),
      jobMatchesSignup: this.generateJobMatchesPreview('Sarah', 'free', true, 4)
    };
  }

  /**
   * Generate HTML file for browser preview
   */
  static generatePreviewHTML(): string {
    const previews = this.generateAllPreviews();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JobPing Email Preview - New Design with Feedback</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .preview-container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .preview-section {
      margin-bottom: 40px;
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .preview-title {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e5e7eb;
    }
    .preview-description {
      color: #6b7280;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .email-frame {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      background: white;
      max-width: 600px;
      margin: 0 auto;
    }
    .email-frame iframe {
      width: 100%;
      height: 600px;
      border: none;
    }
    .preview-controls {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .control-btn {
      padding: 8px 16px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: white;
      color: #374151;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }
    .control-btn:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }
    .control-btn.active {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }
  </style>
</head>
<body>
  <div class="preview-container">
    <h1 style="text-align: center; color: #111827; margin-bottom: 40px;">
      🎯 JobPing Email Preview System
    </h1>
    
    <div class="preview-section">
      <div class="preview-title">Welcome Email</div>
      <div class="preview-description">
        New user welcome email with modern design and clear call-to-action
      </div>
      <div class="email-frame">
        <iframe srcdoc="${encodeURIComponent(previews.welcome)}"></iframe>
      </div>
    </div>

    <div class="preview-section">
      <div class="preview-title">Job Matches Email (Free Tier)</div>
      <div class="preview-description">
        Regular job matches email with integrated feedback system for free users
      </div>
      <div class="email-frame">
        <iframe srcdoc="${encodeURIComponent(previews.jobMatchesFree)}"></iframe>
      </div>
    </div>

    <div class="preview-section">
      <div class="preview-title">Job Matches Email (Premium Tier)</div>
      <div class="preview-description">
        Enhanced job matches email with premium badge and more opportunities
      </div>
      <div class="email-frame">
        <iframe srcdoc="${encodeURIComponent(previews.jobMatchesPremium)}"></iframe>
      </div>
    </div>

    <div class="preview-section">
      <div class="preview-title">Welcome Job Matches Email</div>
      <div class="preview-description">
        First job matches email sent immediately after signup
      </div>
      <div class="email-frame">
        <iframe srcdoc="${encodeURIComponent(previews.jobMatchesSignup)}"></iframe>
      </div>
    </div>

    <div class="preview-section">
      <div class="preview-title">Design Features</div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
        <div style="padding: 16px; background: #f8fafc; border-radius: 8px;">
          <h4 style="margin: 0 0 8px 0; color: #374151;">🎨 Modern Design</h4>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">
            Clean, minimalist design matching your frontend aesthetic
          </p>
        </div>
        <div style="padding: 16px; background: #f8fafc; border-radius: 8px;">
          <h4 style="margin: 0 0 8px 0; color: #374151;">📱 Mobile-First</h4>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">
            Responsive design optimized for all devices
          </p>
        </div>
        <div style="padding: 16px; background: #f8fafc; border-radius: 8px;">
          <h4 style="margin: 0 0 8px 0; color: #374151;">🔄 Feedback System</h4>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">
            Integrated feedback collection for AI learning
          </p>
        </div>
        <div style="padding: 16px; background: #f8fafc; border-radius: 8px;">
          <h4 style="margin: 0 0 8px 0; color: #374151;">🎯 User Experience</h4>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">
            Clear CTAs and intuitive navigation
          </p>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Add interactive controls if needed
    console.log('JobPing Email Preview System Loaded');
    console.log('All email templates are now using the new design with feedback integration');
  </script>
</body>
</html>`;
  }
}

// Export for use in other parts of the system
export const emailPreview = EmailPreviewSystem;
