// 🚀 EMAIL QUEUE PROCESSOR
// Handles processing of email batches from the queue
// Includes idempotency checks and deliverability safety

import { createClient } from '@supabase/supabase-js';
import { sendMatchedJobsEmail } from './optimizedSender';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface QueueProcessorResult {
  success: boolean;
  matchesCount?: number;
  error?: string;
}

interface MatchBatch {
  id: string;
  user_email: string;
  match_date: string;
  batch_status: string;
  created_at: string;
}

export async function processEmailQueue(batch: MatchBatch): Promise<QueueProcessorResult> {
  try {
    console.log(`📧 Processing email queue for batch ${batch.id} (${batch.user_email})`);

    // 1. Check if email is suppressed
    const { data: suppression } = await supabase
      .from('email_suppression_enhanced')
      .select('is_active')
      .eq('user_email', batch.user_email)
      .eq('is_active', true)
      .single();

    if (suppression) {
      console.log(`🚫 Email suppressed for ${batch.user_email}`);
      return { success: false, error: 'Email address suppressed' };
    }

    // 2. Check idempotency - has email already been sent today?
    const today = new Date().toISOString().split('T')[0];
    const { data: existingSend } = await supabase
      .from('email_send_ledger')
      .select('id')
      .eq('user_email', batch.user_email)
      .eq('send_date', today)
      .eq('category', 'job_matches')
      .single();

    if (existingSend) {
      console.log(`⏭️ Email already sent today for ${batch.user_email}`);
      return { success: false, error: 'Email already sent today' };
    }

    // 3. Get user's matches for this batch
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        *,
        jobs (
          id,
          title,
          company,
          location_name,
          job_url,
          description,
          posted_at,
          salary_min,
          salary_max,
          employment_type,
          remote_type
        )
      `)
      .eq('user_email', batch.user_email)
      .eq('DATE(matched_at)', batch.match_date)
      .order('match_score', { ascending: false })
      .limit(5); // Send top 5 matches

    if (matchesError) {
      console.error('❌ Error fetching matches:', matchesError);
      return { success: false, error: 'Failed to fetch matches' };
    }

    if (!matches || matches.length === 0) {
      console.log(`📭 No matches found for ${batch.user_email}`);
      return { success: false, error: 'No matches to send' };
    }

    // 4. Send the email
    try {
      const emailResult = await sendMatchedJobsEmail({
        to: batch.user_email,
        jobs: matches.map(match => ({
          ...match.jobs,
          match_score: match.match_score,
          match_reason: match.match_reason
        })),
        personalization: {
          role: 'Software Developer', // TODO: Get from user preferences
          location: 'Europe',
          salaryRange: '€40k+'
        }
      });

      // Check if email was suppressed or already sent
      if ('suppressed' in emailResult && emailResult.suppressed) {
        console.log(`🚫 Email suppressed for ${batch.user_email}`);
        return { success: false, error: 'Email address suppressed' };
      }

      if ('alreadySent' in emailResult && emailResult.alreadySent) {
        console.log(`⏭️ Email already sent for ${batch.user_email}`);
        return { success: false, error: 'Email already sent today' };
      }

      console.log(`✅ Email sent successfully to ${batch.user_email}`);
      
    } catch (error) {
      console.error('❌ Email send failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // 5. Log the email send
    const { error: logError } = await supabase
      .from('email_send_ledger')
      .insert({
        user_email: batch.user_email,
        send_date: today,
        category: 'job_matches',
        matches_count: matches.length,
        batch_id: batch.id,
        status: 'sent',
        sent_at: new Date().toISOString()
      });

    if (logError) {
      console.error('❌ Failed to log email send:', logError);
      // Don't fail the whole operation for logging errors
    }

    console.log(`✅ Email sent successfully to ${batch.user_email} (${matches.length} matches)`);
    return { success: true, matchesCount: matches.length };

  } catch (error) {
    console.error('❌ Queue processing error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Helper function to create a batch for processing
export async function createMatchBatch(userEmail: string): Promise<{ success: boolean; batchId?: string; error?: string }> {
  try {
    const matchDate = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('match_batch')
      .insert({
        user_email: userEmail,
        match_date: matchDate,
        batch_status: 'pending'
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Error creating match batch:', error);
      return { success: false, error: error.message };
    }

    return { success: true, batchId: data.id };

  } catch (error) {
    console.error('❌ Batch creation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}