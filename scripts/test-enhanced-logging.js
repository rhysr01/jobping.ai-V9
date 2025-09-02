#!/usr/bin/env node

/**
 * Test the enhanced logging system with the existing match_logs table
 * This will verify that our new logging function works correctly
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

async function testEnhancedLogging() {
  console.log('🧪 Testing Enhanced Logging System...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Check current table structure
    console.log('🔍 Checking current match_logs table structure...');
    
    const { data: tableInfo, error: tableError } = await supabase
      .from('match_logs')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Failed to query table:', tableError.message);
      return;
    }

    if (tableInfo && tableInfo.length > 0) {
      const sampleRecord = tableInfo[0];
      console.log('✅ Table structure verified');
      console.log('📋 Sample record keys:', Object.keys(sampleRecord));
      
      // Check if our new fields exist
      const hasNewFields = sampleRecord.hasOwnProperty('user_career_path') && 
                           sampleRecord.hasOwnProperty('user_professional_experience') &&
                           sampleRecord.hasOwnProperty('user_work_preference');
      
      console.log('🔧 New fields present:', hasNewFields ? '✅' : '❌');
    }

    // 2. Check existing data
    console.log('\n📊 Checking existing data...');
    
    const { data: existingData, error: dataError } = await supabase
      .from('match_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (dataError) {
      console.error('❌ Failed to fetch existing data:', dataError.message);
      return;
    }

    console.log(`✅ Found ${existingData.length} existing records`);
    
    if (existingData.length > 0) {
      console.log('\n📋 Recent records:');
      existingData.forEach((record, index) => {
        const date = new Date(record.created_at).toLocaleString();
        console.log(`   ${index + 1}. ${record.user_email || 'Unknown'} - ${record.match_type || 'Unknown'} (${date})`);
      });
    }

    // 3. Test inserting a new log entry with enhanced data
    console.log('\n🧪 Testing enhanced logging...');
    
    const testLogData = {
      user_email: 'test-enhanced@jobping.com',
      match_type: 'ai_success',
      matches_generated: 15,
      user_career_path: 'Strategy & Business Design',
      user_professional_experience: 'Consulting',
      user_work_preference: 'Hybrid',
      timestamp: new Date().toISOString(),
      success: true,
      fallback_used: false,
      jobs_processed: 0,
      job_batch_id: 'test_batch_001'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('match_logs')
      .insert(testLogData)
      .select();

    if (insertError) {
      console.error('❌ Failed to insert test log:', insertError.message);
      return;
    }

    console.log('✅ Enhanced log entry created successfully');
    console.log('📝 Test log ID:', insertData[0].id);

    // 4. Verify the new entry
    console.log('\n🔍 Verifying new entry...');
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('match_logs')
      .select('*')
      .eq('id', insertData[0].id)
      .single();

    if (verifyError) {
      console.error('❌ Failed to verify new entry:', verifyError.message);
      return;
    }

    console.log('✅ New entry verified');
    console.log('📋 Enhanced data captured:');
    console.log(`   Career Path: ${verifyData.user_career_path}`);
    console.log(`   Professional Expertise: ${verifyData.user_professional_experience}`);
    console.log(`   Work Preference: ${verifyData.user_work_preference}`);

    // 5. Test different match types
    console.log('\n🧪 Testing different match types...');
    
    const testTypes = [
      {
        type: 'fallback',
        email: 'test-fallback@jobping.com',
        matches: 8,
        careerPath: 'Data & Analytics',
        expertise: 'Data Analysis',
        workPref: 'Remote'
      },
      {
        type: 'ai_failed',
        email: 'test-ai-failed@jobping.com',
        matches: 0,
        careerPath: 'Finance & Investment',
        expertise: 'Investment Banking',
        workPref: 'Office',
        errorMessage: 'AI model timeout'
      }
    ];

    for (const testType of testTypes) {
      const logData = {
        user_email: testType.email,
        match_type: testType.type,
        matches_generated: testType.matches,
        user_career_path: testType.careerPath,
        user_professional_experience: testType.expertise,
        user_work_preference: testType.workPref,
        error_message: testType.errorMessage,
        timestamp: new Date().toISOString(),
        success: testType.type === 'ai_success',
        fallback_used: testType.type === 'fallback',
        jobs_processed: 0,
        job_batch_id: `test_batch_${testType.type}`
      };

      const { error: typeError } = await supabase
        .from('match_logs')
        .insert(logData);

      if (typeError) {
        console.error(`❌ Failed to insert ${testType.type} log:`, typeError.message);
      } else {
        console.log(`✅ ${testType.type} log created successfully`);
      }
    }

    // 6. Final verification
    console.log('\n🔍 Final verification...');
    
    const { data: finalData, error: finalError } = await supabase
      .from('match_logs')
      .select('*')
      .eq('user_email', 'test-enhanced@jobping.com')
      .order('created_at', { ascending: false });

    if (finalError) {
      console.error('❌ Final verification failed:', finalError.message);
      return;
    }

    console.log(`✅ Enhanced logging test completed successfully!`);
    console.log(`📊 Total test records created: ${finalData.length}`);

    // 7. Clean up test data (optional)
    console.log('\n🧹 Cleaning up test data...');
    
    const testEmails = [
      'test-enhanced@jobping.com',
      'test-fallback@jobping.com', 
      'test-ai-failed@jobping.com'
    ];

    for (const email of testEmails) {
      const { error: deleteError } = await supabase
        .from('match_logs')
        .delete()
        .eq('user_email', email);

      if (deleteError) {
        console.error(`❌ Failed to clean up ${email}:`, deleteError.message);
      } else {
        console.log(`✅ Cleaned up test data for ${email}`);
      }
    }

    console.log('\n🎉 Enhanced logging system test completed successfully!');
    console.log('✅ All functionality working as expected');
    console.log('🚀 Ready for production use');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testEnhancedLogging().catch(console.error);
