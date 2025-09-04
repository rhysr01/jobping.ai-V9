/* ============================
   Enhanced Email Feedback System
   Provides rich, structured feedback data for AI learning
   ============================ */

import { createClient } from '@supabase/supabase-js';

// Enhanced feedback types for AI learning
export interface EmailFeedbackData {
  userEmail: string;
  jobHash: string;
  matchHash?: string;
  
  // Core feedback (simple for users)
  feedbackType: 'job_relevance' | 'match_quality' | 'email_experience';
  verdict: 'positive' | 'negative' | 'neutral';
  
  // Detailed scoring (AI-optimized)
  relevanceScore?: 1 | 2 | 3 | 4 | 5; // 1=completely irrelevant, 5=perfect match
  matchQualityScore?: 1 | 2 | 3 | 4 | 5; // 1=very poor match, 5=excellent match
  
  // Optional explanation (AI can analyze sentiment/insights)
  explanation?: string;
  
  // Context for AI learning (captured automatically)
  userPreferencesSnapshot?: any;
  jobContext?: any;
  matchContext?: any;
  
  // Metadata
  timestamp: Date;
  emailId?: string;
  userAgent?: string;
}

// Feedback collection methods
export interface FeedbackCollectionMethod {
  type: 'email_buttons' | 'email_reply' | 'webhook';
  description: string;
  dataQuality: 'high' | 'medium' | 'low';
}

// AI learning insights
export interface FeedbackInsight {
  insightType: 'user_satisfaction' | 'match_quality' | 'algorithm_performance' | 'preference_alignment';
  description: string;
  confidence: number; // 0-1
  actionItems: string[];
  priority: 'high' | 'medium' | 'low';
}

export class EnhancedFeedbackSystem {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Generate email feedback buttons HTML
   * Simple one-click feedback with rich data capture
   */
  generateEmailFeedbackButtons(
    jobHash: string,
    userEmail: string,
    matchContext: any,
    options: {
      includeExplanation?: boolean;
      includeScoring?: boolean;
      buttonStyle?: 'minimal' | 'detailed' | 'emoji';
    } = {}
  ): string {
    const { includeExplanation = true, includeScoring = true, buttonStyle = 'detailed' } = options;
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jobping.ai';
    const feedbackEndpoint = `${baseUrl}/api/feedback/email`;

    // Different button styles for A/B testing
    let buttonsHtml = '';
    
    switch (buttonStyle) {
      case 'minimal':
        buttonsHtml = this.generateMinimalButtons(jobHash, userEmail, feedbackEndpoint);
        break;
      case 'detailed':
        buttonsHtml = this.generateDetailedButtons(jobHash, userEmail, feedbackEndpoint);
        break;
      case 'emoji':
        buttonsHtml = this.generateEmojiButtons(jobHash, userEmail, feedbackEndpoint);
        break;
    }

    // Add explanation field if enabled
    if (includeExplanation) {
      buttonsHtml += this.generateExplanationField(jobHash, userEmail, feedbackEndpoint);
    }

    // Add scoring if enabled
    if (includeScoring) {
      buttonsHtml += this.generateScoringField(jobHash, userEmail, feedbackEndpoint);
    }

    return `
      <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;">
        <h4 style="margin: 0 0 15px 0; color: #495057; font-size: 16px;">How was this job match?</h4>
        ${buttonsHtml}
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #6c757d;">
          Your feedback helps us improve job matching for everyone
        </p>
      </div>
    `;
  }

  /**
   * Generate minimal feedback buttons (highest conversion)
   */
  private generateMinimalButtons(jobHash: string, userEmail: string, endpoint: string): string {
    return `
      <div style="display: flex; gap: 10px; margin-bottom: 15px;">
        <a href="${endpoint}?action=positive&job=${jobHash}&email=${encodeURIComponent(userEmail)}" 
           style="
             display: inline-block;
             padding: 8px 16px;
             background: #28a745;
             color: white;
             text-decoration: none;
             border-radius: 6px;
             font-size: 14px;
             font-weight: 500;
           "
           target="_blank">
          👍 Good Match
        </a>
        <a href="${endpoint}?action=negative&job=${jobHash}&email=${encodeURIComponent(userEmail)}" 
           style="
             display: inline-block;
             padding: 8px 16px;
             background: #dc3545;
             color: white;
             text-decoration: none;
             border-radius: 6px;
             font-size: 14px;
             font-weight: 500;
           "
           target="_blank">
          👎 Not for Me
        </a>
      </div>
    `;
  }

  /**
   * Generate detailed feedback buttons (more data)
   */
  private generateDetailedButtons(jobHash: string, userEmail: string, endpoint: string): string {
    return `
      <div style="display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap;">
        <a href="${endpoint}?action=positive&score=5&job=${jobHash}&email=${encodeURIComponent(userEmail)}" 
           style="
             display: inline-block;
             padding: 6px 12px;
             background: #28a745;
             color: white;
             text-decoration: none;
             border-radius: 4px;
             font-size: 12px;
             font-weight: 500;
           "
           target="_blank">
          ⭐ Perfect (5/5)
        </a>
        <a href="${endpoint}?action=positive&score=4&job=${jobHash}&email=${encodeURIComponent(userEmail)}" 
           style="
             display: inline-block;
             padding: 6px 12px;
             background: #20c997;
             color: white;
             text-decoration: none;
             border-radius: 4px;
             font-size: 12px;
             font-weight: 500;
           "
           target="_blank">
          👍 Good (4/5)
        </a>
        <a href="${endpoint}?action=neutral&score=3&job=${jobHash}&email=${encodeURIComponent(userEmail)}" 
           style="
             display: inline-block;
             padding: 6px 12px;
             background: #ffc107;
             color: #212529;
             text-decoration: none;
             border-radius: 4px;
             font-size: 12px;
             font-weight: 500;
           "
           target="_blank">
          🤔 OK (3/5)
        </a>
        <a href="${endpoint}?action=negative&score=2&job=${jobHash}&email=${encodeURIComponent(userEmail)}" 
           style="
             display: inline-block;
             padding: 6px 12px;
             background: #fd7e14;
             color: white;
             text-decoration: none;
             border-radius: 4px;
             font-size: 12px;
             font-weight: 500;
           "
           target="_blank">
          👎 Poor (2/5)
        </a>
        <a href="${endpoint}?action=negative&score=1&job=${jobHash}&email=${encodeURIComponent(userEmail)}" 
           style="
             display: inline-block;
             padding: 6px 12px;
             background: #dc3545;
             color: white;
             text-decoration: none;
             border-radius: 4px;
             font-size: 12px;
             font-weight: 500;
           "
           target="_blank">
          ❌ Terrible (1/5)
        </a>
      </div>
    `;
  }

  /**
   * Generate emoji-based feedback buttons (fun and engaging)
   */
  private generateEmojiButtons(jobHash: string, userEmail: string, endpoint: string): string {
    return `
      <div style="display: flex; gap: 15px; margin-bottom: 15px; justify-content: center;">
        <a href="${endpoint}?action=positive&score=5&job=${jobHash}&email=${encodeURIComponent(userEmail)}" 
           style="
             display: inline-block;
             padding: 12px;
             background: #28a745;
             color: white;
             text-decoration: none;
             border-radius: 50%;
             font-size: 20px;
             width: 50px;
             height: 50px;
             text-align: center;
             line-height: 26px;
           "
           target="_blank">
          😍
        </a>
        <a href="${endpoint}?action=positive&score=4&job=${jobHash}&email=${encodeURIComponent(userEmail)}" 
           style="
             display: inline-block;
             padding: 12px;
             background: #20c997;
             color: white;
             text-decoration: none;
             border-radius: 50%;
             font-size: 20px;
             width: 50px;
             height: 50px;
             text-align: center;
             line-height: 26px;
           "
           target="_blank">
          😊
        </a>
        <a href="${endpoint}?action=neutral&score=3&job=${jobHash}&email=${encodeURIComponent(userEmail)}" 
           style="
             display: inline-block;
             padding: 12px;
             background: #ffc107;
             color: #212529;
             text-decoration: none;
             border-radius: 50%;
             font-size: 20px;
             width: 50px;
             height: 50px;
             text-align: center;
             line-height: 26px;
           "
           target="_blank">
          😐
        </a>
        <a href="${endpoint}?action=negative&score=2&job=${jobHash}&email=${encodeURIComponent(userEmail)}" 
           style="
             display: inline-block;
             padding: 12px;
             background: #fd7e14;
             color: white;
             text-decoration: none;
             border-radius: 50%;
             font-size: 20px;
             width: 50px;
             height: 50px;
             text-align: center;
             line-height: 26px;
           "
           target="_blank">
          😕
        </a>
        <a href="${endpoint}?action=negative&score=1&job=${jobHash}&email=${encodeURIComponent(userEmail)}" 
           style="
             display: inline-block;
             padding: 12px;
             background: #dc3545;
             color: white;
             text-decoration: none;
             border-radius: 50%;
             font-size: 20px;
             width: 50px;
             height: 50px;
             text-align: center;
             line-height: 26px;
           "
           target="_blank">
          😞
        </a>
      </div>
    `;
  }

  /**
   * Generate optional explanation field
   */
  private generateExplanationField(jobHash: string, userEmail: string, endpoint: string): string {
    return `
      <div style="margin-top: 15px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #495057;">
          Want to tell us more? (optional)
        </p>
        <div style="display: flex; gap: 10px;">
          <a href="${endpoint}?action=explain&job=${jobHash}&email=${encodeURIComponent(userEmail)}" 
             style="
               display: inline-block;
               padding: 6px 12px;
               background: #6c757d;
               color: white;
               text-decoration: none;
               border-radius: 4px;
               font-size: 12px;
             "
             target="_blank">
            💬 Add Comment
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Generate scoring field for detailed feedback
   */
  private generateScoringField(jobHash: string, userEmail: string, endpoint: string): string {
    return `
      <div style="margin-top: 15px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #495057;">
          Rate this match:
        </p>
        <div style="display: flex; gap: 5px; margin-bottom: 10px;">
          ${[1, 2, 3, 4, 5].map(score => `
            <a href="${endpoint}?action=score&score=${score}&job=${jobHash}&email=${encodeURIComponent(userEmail)}" 
               style="
                 display: inline-block;
                 padding: 4px 8px;
                 background: ${score >= 4 ? '#28a745' : score >= 3 ? '#ffc107' : '#dc3545'};
                 color: white;
                 text-decoration: none;
                 border-radius: 3px;
                 font-size: 11px;
                 font-weight: 500;
               "
               target="_blank">
              ${score}
            </a>
          `).join('')}
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #6c757d;">
          <span>Poor</span>
          <span>Excellent</span>
        </div>
      </div>
    `;
  }

  /**
   * Record feedback from email buttons
   */
  async recordEmailFeedback(feedbackData: EmailFeedbackData): Promise<void> {
    try {
      // Store in enhanced feedback table
      const { error: feedbackError } = await this.supabase
        .from('user_feedback')
        .insert({
          user_email: feedbackData.userEmail,
          job_hash: feedbackData.jobHash,
          match_hash: feedbackData.matchHash,
          feedback_type: feedbackData.feedbackType,
          verdict: feedbackData.verdict,
          relevance_score: feedbackData.relevanceScore,
          match_quality_score: feedbackData.matchQualityScore,
          explanation: feedbackData.explanation,
          user_preferences_snapshot: feedbackData.userPreferencesSnapshot,
          job_context: feedbackData.jobContext,
          match_context: feedbackData.matchContext,
          created_at: feedbackData.timestamp.toISOString()
        });

      if (feedbackError) throw feedbackError;

      // Also store in learning data table for AI training
      if (feedbackData.userPreferencesSnapshot && feedbackData.jobContext) {
        const { error: learningError } = await this.supabase
          .from('feedback_learning_data')
          .insert({
            user_profile_features: feedbackData.userPreferencesSnapshot,
            job_features: feedbackData.jobContext,
            match_features: feedbackData.matchContext,
            feedback_label: feedbackData.verdict,
            confidence_score: this.calculateConfidenceScore(feedbackData),
            created_at: feedbackData.timestamp.toISOString()
          });

        if (learningError) {
          console.warn('Failed to store learning data:', learningError);
        }
      }

      console.log(`📝 Email feedback recorded: ${feedbackData.verdict} for job ${feedbackData.jobHash}`);

    } catch (error) {
      console.error('Failed to record email feedback:', error);
      throw error;
    }
  }

  /**
   * Calculate confidence score for AI learning
   */
  private calculateConfidenceScore(feedbackData: EmailFeedbackData): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for detailed feedback
    if (feedbackData.relevanceScore && feedbackData.matchQualityScore) {
      confidence += 0.2;
    }

    // Higher confidence for explanations
    if (feedbackData.explanation && feedbackData.explanation.length > 10) {
      confidence += 0.2;
    }

    // Higher confidence for extreme scores (very positive/negative)
    if (feedbackData.relevanceScore) {
      if (feedbackData.relevanceScore === 1 || feedbackData.relevanceScore === 5) {
        confidence += 0.1;
      }
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Get feedback insights for a user
   */
  async getUserFeedbackInsights(userEmail: string): Promise<FeedbackInsight[]> {
    try {
      const { data: insights, error } = await this.supabase
        .rpc('get_feedback_insights', { user_email_param: userEmail });

      if (error) throw error;

      return insights || [];
    } catch (error) {
      console.error('Failed to get feedback insights:', error);
      return [];
    }
  }

  /**
   * Get aggregated feedback analytics
   */
  async getFeedbackAnalytics(period: 'day' | 'week' | 'month' = 'week'): Promise<any> {
    try {
      const endDate = new Date();
      let startDate: Date;

      switch (period) {
        case 'day':
          startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const { data: analytics, error } = await this.supabase
        .from('feedback_analytics')
        .select('*')
        .gte('period_start', startDate.toISOString().split('T')[0])
        .lte('period_end', endDate.toISOString().split('T')[0])
        .order('period_start', { ascending: false });

      if (error) throw error;

      return analytics || [];
    } catch (error) {
      console.error('Failed to get feedback analytics:', error);
      return [];
    }
  }

  /**
   * Generate feedback summary for AI improvement
   */
  async generateAIImprovementSummary(): Promise<string> {
    try {
      const analytics = await this.getFeedbackAnalytics('week');
      
      if (!analytics.length) {
        return 'No feedback data available for analysis';
      }

      const latest = analytics[0];
      const totalFeedback = latest.total_feedback_count;
      const positiveRate = (latest.positive_feedback_count / totalFeedback) * 100;
      const avgRelevance = latest.avg_relevance_score || 0;
      const avgQuality = latest.avg_match_quality_score || 0;

      let summary = `📊 Feedback Summary (Last Week)\n`;
      summary += `Total Feedback: ${totalFeedback}\n`;
      summary += `Positive Rate: ${positiveRate.toFixed(1)}%\n`;
      summary += `Avg Relevance: ${avgRelevance.toFixed(1)}/5\n`;
      summary += `Avg Quality: ${avgQuality.toFixed(1)}/5\n\n`;

      // AI improvement recommendations
      if (positiveRate < 70) {
        summary += `🚨 Low satisfaction detected!\n`;
        summary += `→ Review matching algorithm weights\n`;
        summary += `→ Check for systematic bias in job selection\n`;
        summary += `→ Analyze negative feedback patterns\n`;
      } else if (positiveRate < 85) {
        summary += `⚠️ Room for improvement\n`;
        summary += `→ Fine-tune matching parameters\n`;
        summary += `→ Optimize job ranking algorithm\n`;
      } else {
        summary += `✅ High satisfaction maintained\n`;
        summary += `→ Continue current approach\n`;
        summary += `→ Monitor for any degradation\n`;
      }

      if (avgRelevance < 3.5) {
        summary += `\n🎯 Relevance needs improvement\n`;
        summary += `→ Review skill matching logic\n`;
        summary += `→ Check location preference handling\n`;
        summary += `→ Validate experience level matching\n`;
      }

      return summary;
    } catch (error) {
      console.error('Failed to generate AI improvement summary:', error);
      return 'Error generating feedback summary';
    }
  }
}

// Export default instance
export const enhancedFeedbackSystem = new EnhancedFeedbackSystem(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);
