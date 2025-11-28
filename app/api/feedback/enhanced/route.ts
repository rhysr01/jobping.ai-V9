import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';

// Enhanced feedback data interface
interface EnhancedFeedbackData {
  user_email: string;
  job_hash: string;
  feedback_type: 'save' | 'hide' | 'thumbs_up' | 'thumbs_down' | 'not_relevant' | 'click' | 'open' | 'dwell';
  verdict: 'positive' | 'negative' | 'neutral';
  relevance_score?: number; // 1-5 scale
  match_quality_score?: number; // 1-5 scale
  reason?: string; // Why not relevant, etc.
  user_preferences_snapshot?: Record<string, unknown>;
  job_context?: Record<string, unknown>;
  match_context?: Record<string, unknown>;
  timestamp: string;
  source: 'email' | 'web' | 'mobile';
  session_id?: string;
  dwell_time_ms?: number;
}


// POST endpoint for capturing explicit feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      jobHash, 
      email, 
      feedbackType, 
      verdict, 
      relevanceScore, 
      matchQualityScore,
      reason,
      source = 'web',
      sessionId,
      dwellTimeMs
    } = body;

    if (!jobHash || !email || !feedbackType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate feedback type
    const validFeedbackTypes = ['save', 'hide', 'thumbs_up', 'thumbs_down', 'not_relevant', 'click', 'open', 'dwell'];
    if (!validFeedbackTypes.includes(feedbackType)) {
      return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 });
    }

    // Get context for learning
    const supabase = getDatabaseClient();
    
    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('job_hash', jobHash)
      .single();

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    // Create enhanced feedback data
    const feedbackData: EnhancedFeedbackData = {
      user_email: email,
      job_hash: jobHash,
      feedback_type: feedbackType,
      verdict: verdict || (feedbackType === 'save' || feedbackType === 'thumbs_up' ? 'positive' : 
                           feedbackType === 'hide' || feedbackType === 'thumbs_down' || feedbackType === 'not_relevant' ? 'negative' : 'neutral'),
      relevance_score: relevanceScore,
      match_quality_score: matchQualityScore,
      reason,
      user_preferences_snapshot: user || {},
      job_context: job || {},
      match_context: {
        feedback_source: source,
        session_id: sessionId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      source,
      session_id: sessionId,
      dwell_time_ms: dwellTimeMs
    };

    // Record feedback to match_logs table
    await recordFeedbackToMatchLogs(feedbackData);

    // Also record to feedback table for backward compatibility
    await recordFeedbackToDatabase(feedbackData);

    return NextResponse.json({ 
      success: true, 
      message: 'Feedback recorded successfully!',
      feedbackId: feedbackData.timestamp
    });

  } catch (error) {
    console.error('Error recording enhanced feedback:', error);
    return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 });
  }
}

// GET endpoint for retrieving user feedback history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    const supabase = getDatabaseClient();

    // Get recent feedback for the user
    const { data: feedback, error } = await supabase
      .from('match_logs')
      .select(`
        *,
        jobs (
          title,
          company,
          location,
          job_url
        )
      `)
      .eq('user_email', email)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching feedback:', error);
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      feedback: feedback || [],
      count: feedback?.length || 0
    });

  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}

// Record feedback to match_logs table with decay logic
async function recordFeedbackToMatchLogs(feedbackData: EnhancedFeedbackData) {
  const supabase = getDatabaseClient();

  // Check for existing feedback on this job to apply decay
  const { data: existingFeedback } = await supabase
    .from('match_logs')
    .select('*')
    .eq('user_email', feedbackData.user_email)
    .eq('job_hash', feedbackData.job_hash)
    .order('created_at', { ascending: false })
    .limit(1);

  let adjustedScore = feedbackData.relevance_score || feedbackData.match_quality_score || 0;
  
  // Apply decay for repeated feedback (reduce impact of repeated negatives)
  if (existingFeedback && existingFeedback.length > 0) {
    const existing = existingFeedback[0];
    const daysSinceLastFeedback = (Date.now() - new Date(existing.created_at).getTime()) / (1000 * 60 * 60 * 24);
    
    // Decay negative feedback after 30 days
    if (existing.feedback_type === 'hide' || existing.feedback_type === 'thumbs_down') {
      if (daysSinceLastFeedback > 30) {
        adjustedScore = Math.max(0, adjustedScore - 1); // Reduce penalty
      }
    }
  }

  // Insert new feedback record
  const { error } = await supabase
    .from('match_logs')
    .insert({
      user_email: feedbackData.user_email,
      job_hash: feedbackData.job_hash,
      match_score: adjustedScore,
      match_reason: feedbackData.reason || `User ${feedbackData.feedback_type}`,
      match_quality: feedbackData.verdict,
      match_tags: {
        feedback_type: feedbackData.feedback_type,
        source: feedbackData.source,
        session_id: feedbackData.session_id,
        dwell_time_ms: feedbackData.dwell_time_ms,
        decay_applied: existingFeedback && existingFeedback.length > 0
      },
      matched_at: feedbackData.timestamp,
      created_at: feedbackData.timestamp,
      // Add provenance tracking
      match_algorithm: 'user_feedback',
      ai_model: null,
      prompt_version: null,
      ai_latency_ms: null,
      ai_cost_usd: null,
      cache_hit: false,
      fallback_reason: null
    });

  if (error) {
    console.error('Error recording to match_logs:', error);
    throw error;
  }
}

// Record feedback to feedback table (backward compatibility)
async function recordFeedbackToDatabase(feedbackData: EnhancedFeedbackData) {
  const supabase = getDatabaseClient();

  const { error } = await supabase
    .from('feedback')
    .insert({
      user_email: feedbackData.user_email,
      job_hash: feedbackData.job_hash,
      feedback_type: feedbackData.feedback_type,
      verdict: feedbackData.verdict,
      relevance_score: feedbackData.relevance_score,
      match_quality_score: feedbackData.match_quality_score,
      explanation: feedbackData.reason,
      user_preferences_snapshot: feedbackData.user_preferences_snapshot,
      job_context: feedbackData.job_context,
      match_context: feedbackData.match_context,
      created_at: feedbackData.timestamp
    });

  if (error) {
    console.error('Error recording to feedback table:', error);
    // Don't throw here - match_logs is the primary table
  }
}

// Lightweight re-rank function using feedback signals (reserved for future use)
// Commented out to fix unused variable error - can be re-enabled when needed
/*
async function applyFeedbackReranking(
  jobs: any[], 
  userEmail: string
): Promise<any[]> {
  try {
    const supabase = getDatabaseClient();

    // Get recent feedback for the user (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentFeedback } = await supabase
      .from('match_logs')
      .select('job_hash, match_quality, match_tags')
      .eq('user_email', userEmail)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (!recentFeedback || recentFeedback.length === 0) {
      return jobs; // No feedback to apply
    }

    // Create feedback lookup map
    const feedbackMap = new Map();
    recentFeedback.forEach(feedback => {
      const tags = feedback.match_tags || {};
      const feedbackType = tags.feedback_type;
      
      if (feedbackType === 'thumbs_up' || feedbackType === 'save') {
        feedbackMap.set(feedback.job_hash, 2); // +2 boost
      } else if (feedbackType === 'thumbs_down' || feedbackType === 'hide' || feedbackType === 'not_relevant') {
        feedbackMap.set(feedback.job_hash, -2); // -2 penalty
      }
    });

    // Apply feedback adjustments to job scores
    return jobs.map(job => {
      const feedbackAdjustment = feedbackMap.get(job.job_hash) || 0;
      return {
        ...job,
        match_score: (job.match_score || 0) + feedbackAdjustment,
        feedback_adjustment: feedbackAdjustment
      };
    }).sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

  } catch (error) {
    console.error('Error applying feedback reranking:', error);
    return jobs; // Return original jobs if reranking fails
  }
}
*/
