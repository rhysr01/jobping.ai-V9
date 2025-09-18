import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Implicit signal data interface
interface ImplicitSignalData {
  user_email: string;
  job_hash: string;
  signal_type: 'open' | 'click' | 'dwell' | 'scroll' | 'close';
  value?: number; // For dwell time, scroll percentage, etc.
  metadata?: any;
  timestamp: string;
  source: 'email' | 'web' | 'mobile';
  session_id?: string;
  user_agent?: string;
  ip_address?: string;
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

// POST endpoint for capturing implicit signals
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      jobHash, 
      email, 
      signalType, 
      value,
      metadata = {},
      source = 'web',
      sessionId
    } = body;

    if (!jobHash || !email || !signalType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate signal type
    const validSignalTypes = ['open', 'click', 'dwell', 'scroll', 'close'];
    if (!validSignalTypes.includes(signalType)) {
      return NextResponse.json({ error: 'Invalid signal type' }, { status: 400 });
    }

    // Extract IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create implicit signal data
    const signalData: ImplicitSignalData = {
      user_email: email,
      job_hash: jobHash,
      signal_type: signalType,
      value,
      metadata: {
        ...metadata,
        ip_address: ipAddress,
        user_agent: userAgent,
        source
      },
      timestamp: new Date().toISOString(),
      source,
      session_id: sessionId,
      user_agent: userAgent,
      ip_address: ipAddress
    };

    // Record signal to database
    await recordImplicitSignal(signalData);

    // If it's a click or significant dwell, also record as feedback
    if (signalType === 'click' || (signalType === 'dwell' && (value || 0) > 5000)) {
      await recordAsFeedbackSignal(signalData);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Signal recorded successfully!',
      signalId: signalData.timestamp
    });

  } catch (error) {
    console.error('Error recording implicit signal:', error);
    return NextResponse.json({ error: 'Failed to record signal' }, { status: 500 });
  }
}

// GET endpoint for retrieving user signal history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const signalType = searchParams.get('signalType');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    let query = supabase
      .from('implicit_signals')
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

    if (signalType) {
      query = query.eq('signal_type', signalType);
    }

    const { data: signals, error } = await query;

    if (error) {
      console.error('Error fetching signals:', error);
      return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      signals: signals || [],
      count: signals?.length || 0
    });

  } catch (error) {
    console.error('Error fetching signals:', error);
    return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
  }
}

// Record implicit signal to database
async function recordImplicitSignal(signalData: ImplicitSignalData) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('implicit_signals')
    .insert({
      user_email: signalData.user_email,
      job_hash: signalData.job_hash,
      signal_type: signalData.signal_type,
      value: signalData.value,
      metadata: signalData.metadata,
      timestamp: signalData.timestamp,
      source: signalData.source,
      session_id: signalData.session_id,
      user_agent: signalData.user_agent,
      ip_address: signalData.ip_address,
      created_at: signalData.timestamp
    });

  if (error) {
    console.error('Error recording implicit signal:', error);
    throw error;
  }
}

// Record significant signals as feedback for learning
async function recordAsFeedbackSignal(signalData: ImplicitSignalData) {
  const supabase = getSupabaseClient();

  // Determine verdict based on signal
  let verdict: 'positive' | 'negative' | 'neutral' = 'neutral';
  let feedbackType = 'click';

  if (signalData.signal_type === 'click') {
    verdict = 'positive';
    feedbackType = 'click';
  } else if (signalData.signal_type === 'dwell' && (signalData.value || 0) > 5000) {
    verdict = 'positive';
    feedbackType = 'dwell';
  } else if (signalData.signal_type === 'close' && (signalData.value || 0) < 1000) {
    verdict = 'negative';
    feedbackType = 'quick_close';
  }

  // Record to match_logs for learning
  const { error } = await supabase
    .from('match_logs')
    .insert({
      user_email: signalData.user_email,
      job_hash: signalData.job_hash,
      match_score: verdict === 'positive' ? 1 : verdict === 'negative' ? -1 : 0,
      match_reason: `Implicit signal: ${signalData.signal_type}`,
      match_quality: verdict,
      match_tags: {
        signal_type: signalData.signal_type,
        signal_value: signalData.value,
        source: signalData.source,
        session_id: signalData.session_id,
        implicit_signal: true
      },
      matched_at: signalData.timestamp,
      created_at: signalData.timestamp,
      match_algorithm: 'implicit_feedback',
      ai_model: null,
      prompt_version: null,
      ai_latency_ms: null,
      ai_cost_usd: null,
      cache_hit: false,
      fallback_reason: null
    });

  if (error) {
    console.error('Error recording feedback signal:', error);
    // Don't throw - this is secondary to the main signal recording
  }
}

// Calculate engagement score from implicit signals
async function calculateEngagementScore(
  userEmail: string, 
  days: number = 30
): Promise<number> {
  try {
    const supabase = getSupabaseClient();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: signals } = await supabase
      .from('implicit_signals')
      .select('signal_type, value, created_at')
      .eq('user_email', userEmail)
      .gte('created_at', startDate.toISOString());

    if (!signals || signals.length === 0) {
      return 0;
    }

    let engagementScore = 0;

    signals.forEach(signal => {
      switch (signal.signal_type) {
        case 'open':
          engagementScore += 1;
          break;
        case 'click':
          engagementScore += 3;
          break;
        case 'dwell':
          // Dwell time in seconds, cap at 60 seconds
          const dwellSeconds = Math.min((signal.value || 0) / 1000, 60);
          engagementScore += Math.floor(dwellSeconds / 10) * 2; // 2 points per 10 seconds
          break;
        case 'scroll':
          // Scroll percentage, cap at 100
          const scrollPercent = Math.min(signal.value || 0, 100);
          engagementScore += Math.floor(scrollPercent / 25); // 1 point per 25% scroll
          break;
      }
    });

    // Normalize to 0-100 scale
    return Math.min(100, Math.max(0, engagementScore));

  } catch (error) {
    console.error('Error calculating engagement score:', error);
    return 0;
  }
}

// Get user behavior insights
async function getUserBehaviorInsights(userEmail: string) {
  try {
    const supabase = getSupabaseClient();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: signals } = await supabase
      .from('implicit_signals')
      .select('signal_type, value, created_at, jobs(title, company)')
      .eq('user_email', userEmail)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (!signals || signals.length === 0) {
      return {
        engagementScore: 0,
        averageDwellTime: 0,
        clickThroughRate: 0,
        preferredJobTypes: [],
        activeTimeOfDay: 'unknown'
      };
    }

    // Calculate insights
    const totalOpens = signals.filter(s => s.signal_type === 'open').length;
    const totalClicks = signals.filter(s => s.signal_type === 'click').length;
    const dwellTimes = signals.filter(s => s.signal_type === 'dwell' && s.value).map(s => s.value || 0);
    
    const clickThroughRate = totalOpens > 0 ? (totalClicks / totalOpens) * 100 : 0;
    const averageDwellTime = dwellTimes.length > 0 ? dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length : 0;

    // Analyze preferred job types from clicked jobs
    const clickedJobs = signals.filter(s => s.signal_type === 'click' && s.jobs).map(s => s.jobs);
    const jobTitles = clickedJobs.flat().map(job => job.title?.toLowerCase() || '');
    
    // Simple keyword extraction for job types
    const jobTypeKeywords = ['developer', 'analyst', 'consultant', 'manager', 'designer', 'marketing', 'sales', 'finance'];
    const preferredJobTypes = jobTypeKeywords.filter(keyword => 
      jobTitles.some(title => title.includes(keyword))
    );

    // Analyze active time of day
    const hourCounts = new Array(24).fill(0);
    signals.forEach(signal => {
      const hour = new Date(signal.created_at).getHours();
      hourCounts[hour]++;
    });
    const mostActiveHour = hourCounts.indexOf(Math.max(...hourCounts));
    const activeTimeOfDay = mostActiveHour < 12 ? 'morning' : mostActiveHour < 17 ? 'afternoon' : 'evening';

    return {
      engagementScore: await calculateEngagementScore(userEmail, 30),
      averageDwellTime: Math.round(averageDwellTime),
      clickThroughRate: Math.round(clickThroughRate * 100) / 100,
      preferredJobTypes,
      activeTimeOfDay,
      totalSignals: signals.length,
      daysActive: new Set(signals.map(s => new Date(s.created_at).toDateString())).size
    };

  } catch (error) {
    console.error('Error getting user behavior insights:', error);
    return {
      engagementScore: 0,
      averageDwellTime: 0,
      clickThroughRate: 0,
      preferredJobTypes: [],
      activeTimeOfDay: 'unknown'
    };
  }
}
