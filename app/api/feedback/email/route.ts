import { NextRequest, NextResponse } from 'next/server';
import { enhancedFeedbackSystem, type EmailFeedbackData } from '../../../../Utils/enhancedFeedback';
import { createClient } from '@supabase/supabase-js';

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const jobHash = searchParams.get('job');
  const email = searchParams.get('email');
  const score = searchParams.get('score');

  if (!action || !jobHash || !email) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    // Get job and user context for AI learning
    const supabase = getSupabaseClient();
    
    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('job_hash', jobHash)
      .single();

    if (jobError || !job) {
      console.warn(`Job not found for feedback: ${jobHash}`);
    }

    // Fetch user preferences
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.warn(`User not found for feedback: ${email}`);
    }

    // Handle different feedback actions
    switch (action) {
      case 'positive':
      case 'negative':
      case 'neutral':
        await handleSimpleFeedback(action, jobHash, email, score, job, user);
        return generateThankYouPage(action, jobHash, email);
        
      case 'score':
        if (!score) {
          return NextResponse.json({ error: 'Score required for scoring action' }, { status: 400 });
        }
        await handleScoredFeedback(score, jobHash, email, job, user);
        return generateThankYouPage('scored', jobHash, email, score);
        
      case 'explain':
        return generateExplanationForm(jobHash, email, job);
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error handling email feedback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobHash, email, explanation, feedbackType, verdict, score } = body;

    if (!jobHash || !email || !verdict) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get context for AI learning
    const supabase = getSupabaseClient();
    
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

    // Create feedback data
    const feedbackData: EmailFeedbackData = {
      userEmail: email,
      jobHash,
      feedbackType: feedbackType || 'job_relevance',
      verdict,
      relevanceScore: score ? parseInt(score) as 1|2|3|4|5 : undefined,
      matchQualityScore: score ? parseInt(score) as 1|2|3|4|5 : undefined,
      explanation,
      userPreferencesSnapshot: user || {},
      jobContext: job || {},
      matchContext: {
        feedback_source: 'email_form',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date()
    };

    // Record feedback
    await enhancedFeedbackSystem.recordEmailFeedback(feedbackData);

    return NextResponse.json({ 
      success: true, 
      message: 'Thank you for your feedback!' 
    });

  } catch (error) {
    console.error('Error recording feedback:', error);
    return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 });
  }
}

// Helper functions
async function handleSimpleFeedback(
  action: string, 
  jobHash: string, 
  email: string, 
  score: string | null,
  job: any,
  user: any
) {
  const verdict = action === 'positive' ? 'positive' : action === 'negative' ? 'negative' : 'neutral';
  const relevanceScore = score ? parseInt(score) as 1|2|3|4|5 : undefined;

  const feedbackData: EmailFeedbackData = {
    userEmail: email,
    jobHash,
    feedbackType: 'job_relevance',
    verdict,
    relevanceScore,
    userPreferencesSnapshot: user || {},
    jobContext: job || {},
    matchContext: {
      feedback_source: 'email_button',
      action,
      timestamp: new Date().toISOString()
    },
    timestamp: new Date()
  };

  await enhancedFeedbackSystem.recordEmailFeedback(feedbackData);
}

async function handleScoredFeedback(
  score: string, 
  jobHash: string, 
  email: string,
  job: any,
  user: any
) {
  const scoreNum = parseInt(score) as 1|2|3|4|5;
  const verdict = scoreNum >= 4 ? 'positive' : scoreNum <= 2 ? 'negative' : 'neutral';

  const feedbackData: EmailFeedbackData = {
    userEmail: email,
    jobHash,
    feedbackType: 'job_relevance',
    verdict,
    relevanceScore: scoreNum,
    matchQualityScore: scoreNum,
    userPreferencesSnapshot: user || {},
    jobContext: job || {},
    matchContext: {
      feedback_source: 'email_score',
      score: scoreNum,
      timestamp: new Date().toISOString()
    },
    timestamp: new Date()
  };

  await enhancedFeedbackSystem.recordEmailFeedback(feedbackData);
}

function generateThankYouPage(action: string, jobHash: string, email: string, score?: string) {
  const title = action === 'positive' ? 'Thanks for the feedback!' : 
                action === 'negative' ? 'Thanks for letting us know!' :
                action === 'scored' ? `Thanks for rating this ${score}/5!` :
                'Thanks for your feedback!';

  const message = action === 'positive' ? 'We\'ll send you more jobs like this!' :
                  action === 'negative' ? 'We\'ll avoid similar jobs in the future.' :
                  action === 'scored' ? 'Your rating helps us improve our matching!' :
                  'Your feedback helps us get better!';

  return new NextResponse(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Feedback Received</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          margin: 0; 
          padding: 40px 20px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          text-align: center;
          max-width: 500px;
        }
        h1 { color: #333; margin-bottom: 20px; }
        p { color: #666; line-height: 1.6; margin-bottom: 30px; }
        .close-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
        }
        .close-btn:hover { background: #5a6fd8; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${title}</h1>
        <p>${message}</p>
        <button class="close-btn" onclick="window.close()">Close</button>
      </div>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}

function generateExplanationForm(jobHash: string, email: string, job: any) {
  const jobTitle = job?.title || 'this job';
  
  return new NextResponse(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tell us more</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          margin: 0; 
          padding: 40px 20px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          max-width: 500px;
          width: 100%;
        }
        h1 { color: #333; margin-bottom: 20px; text-align: center; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; color: #555; font-weight: 500; }
        select, textarea { 
          width: 100%; 
          padding: 12px; 
          border: 2px solid #e1e5e9; 
          border-radius: 6px; 
          font-size: 16px; 
          font-family: inherit;
        }
        select:focus, textarea:focus { 
          outline: none; 
          border-color: #667eea; 
        }
        textarea { 
          min-height: 100px; 
          resize: vertical; 
        }
        .buttons {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-top: 30px;
        }
        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
        }
        .btn-primary { background: #667eea; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        .btn:hover { opacity: 0.9; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Tell us more about ${jobTitle}</h1>
        <form id="feedbackForm">
          <div class="form-group">
            <label for="verdict">How relevant was this job?</label>
            <select id="verdict" name="verdict" required>
              <option value="">Select...</option>
              <option value="positive">👍 Good match</option>
              <option value="neutral">🤔 OK match</option>
              <option value="negative">👎 Not for me</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="explanation">Why? (optional but helpful)</label>
            <textarea 
              id="explanation" 
              name="explanation" 
              placeholder="e.g., 'Great location but wrong experience level' or 'Perfect skills match!'"
            ></textarea>
          </div>
          
          <div class="buttons">
            <button type="button" class="btn btn-secondary" onclick="window.close()">Cancel</button>
            <button type="submit" class="btn btn-primary">Submit Feedback</button>
          </div>
        </form>
      </div>
      
      <script>
        document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const formData = new FormData(e.target);
          const data = {
            jobHash: '${jobHash}',
            email: '${email}',
            verdict: formData.get('verdict'),
            explanation: formData.get('explanation'),
            feedbackType: 'job_relevance'
          };
          
          try {
            const response = await fetch('/api/feedback/email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            
            if (response.ok) {
              alert('Thank you for your feedback!');
              window.close();
            } else {
              alert('Error submitting feedback. Please try again.');
            }
          } catch (error) {
            alert('Error submitting feedback. Please try again.');
          }
        });
      </script>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}
