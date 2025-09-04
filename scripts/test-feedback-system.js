#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFeedbackSystem() {
  console.log('🧪 Testing Enhanced Feedback System\n');

  try {
    // 1. Test database connection
    console.log('1. Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('user_feedback')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.log('❌ Database connection failed:', testError.message);
      console.log('💡 Make sure to run the SQL migration first!');
      return;
    }
    console.log('✅ Database connection successful');

    // 2. Check if tables exist
    console.log('\n2. Checking feedback tables...');
    const { data: feedbackCount, error: feedbackError } = await supabase
      .from('user_feedback')
      .select('*', { count: 'exact' });
    
    if (feedbackError) {
      console.log('❌ user_feedback table not found');
      console.log('💡 Run the SQL migration in Supabase first');
      return;
    }
    console.log(`✅ user_feedback table exists with ${feedbackCount.length || 0} records`);

    // 3. Test feedback analytics
    console.log('\n3. Testing feedback analytics...');
    const { data: analytics, error: analyticsError } = await supabase
      .from('feedback_analytics')
      .select('*')
      .limit(5);
    
    if (analyticsError) {
      console.log('❌ feedback_analytics table not found');
    } else {
      console.log(`✅ feedback_analytics table exists with ${analytics.length} records`);
    }

    // 4. Test feedback insights function
    console.log('\n4. Testing feedback insights function...');
    const { data: insights, error: insightsError } = await supabase
      .rpc('get_feedback_insights');
    
    if (insightsError) {
      console.log('❌ get_feedback_insights function not found');
      console.log('💡 Make sure the SQL migration completed fully');
    } else {
      console.log('✅ get_feedback_insights function working');
      console.log('📊 Sample insights:', insights);
    }

    // 5. Test inserting sample feedback
    console.log('\n5. Testing feedback insertion...');
    const sampleFeedback = {
      user_email: 'test@example.com',
      job_hash: 'test_job_hash_' + Date.now(),
      feedback_type: 'job_relevance',
      verdict: 'positive',
      relevance_score: 5,
      match_quality_score: 4,
      explanation: 'Test feedback for system verification',
      user_preferences_snapshot: { test: true },
      job_context: { test: true },
      match_context: { test: true }
    };

    const { data: insertedFeedback, error: insertError } = await supabase
      .from('user_feedback')
      .insert(sampleFeedback)
      .select()
      .single();

    if (insertError) {
      console.log('❌ Failed to insert test feedback:', insertError.message);
    } else {
      console.log('✅ Test feedback inserted successfully');
      console.log('📝 Feedback ID:', insertedFeedback.id);
      
      // Clean up test data
      await supabase
        .from('user_feedback')
        .delete()
        .eq('id', insertedFeedback.id);
      console.log('🧹 Test data cleaned up');
    }

    console.log('\n🎉 Feedback system test completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Send test emails with feedback buttons');
    console.log('2. Click feedback buttons to test the flow');
    console.log('3. Check the database for collected feedback');
    console.log('4. Use get_feedback_insights() for analytics');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFeedbackSystem().catch(console.error);
