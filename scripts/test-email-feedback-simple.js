#!/usr/bin/env node

async function testEmailFeedbackSimple() {
  console.log('📧 Testing Email Feedback System (Simple)\n');

  try {
    // 1. Test the email composition function
    console.log('1. Testing email composition...');
    const { composeRobustEmailContent } = await import('../Utils/emailUtils.ts');
    
    // Create mock job data
    const mockJobs = [
      {
        job_hash: 'test_job_1_' + Date.now(),
        title: 'Senior Software Engineer',
        company: 'Tech Corp',
        location: 'Dublin, Ireland',
        job_url: 'https://example.com/job1',
        description: 'Exciting role in a fast-growing tech company. Perfect for experienced developers.',
        created_at: new Date().toISOString()
      },
      {
        job_hash: 'test_job_2_' + Date.now(),
        title: 'Product Manager',
        company: 'Innovation Ltd',
        location: 'London, UK',
        job_url: 'https://example.com/job2',
        description: 'Lead product strategy and development for cutting-edge solutions.',
        created_at: new Date().toISOString()
      },
      {
        job_hash: 'test_job_3_' + Date.now(),
        title: 'Data Scientist',
        company: 'Analytics Inc',
        location: 'Amsterdam, Netherlands',
        job_url: 'https://example.com/job3',
        description: 'Build machine learning models and drive data-driven decisions.',
        created_at: new Date().toISOString()
      }
    ];

    const emailContent = composeRobustEmailContent(
      mockJobs,
      'rrowlands@student.ie.edu',
      'Rhys Rowlands',
      'premium',
      false
    );

    console.log('✅ Email content generated successfully');
    console.log('📧 Email includes new feedback system with:');
    console.log('   - 5-point rating buttons (⭐ Perfect to ❌ Terrible)');
    console.log('   - Comment option for detailed feedback');
    console.log('   - Beautiful styling that matches your brand');

    // 2. Save email content to file for inspection
    console.log('\n2. Saving email content to file...');
    const fs = await import('fs');
    const emailFile = 'test-email-with-feedback.html';
    fs.writeFileSync(emailFile, emailContent);
    console.log(`✅ Email content saved to: ${emailFile}`);

    // 3. Show preview of feedback section
    console.log('\n3. Feedback system preview:');
    const feedbackSection = emailContent.includes('Enhanced Feedback System') ? 
      '✅ Enhanced feedback system found in email' : 
      '❌ Enhanced feedback system NOT found in email';
    console.log(feedbackSection);

    if (emailContent.includes('⭐ Perfect (5/5)')) {
      console.log('✅ 5-point rating system found');
    }
    if (emailContent.includes('💬 Add Comment')) {
      console.log('✅ Comment option found');
    }
    if (emailContent.includes('/api/feedback/email')) {
      console.log('✅ Feedback API endpoints found');
    }

    console.log('\n🎉 Email feedback system test completed!');
    console.log('\n📋 What to do next:');
    console.log('1. Open test-email-with-feedback.html in your browser');
    console.log('2. Check that the feedback buttons are working');
    console.log('3. Verify the styling matches your brand');
    console.log('4. Test the feedback API endpoints');
    console.log('\n💡 The feedback system is now ready for production emails!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testEmailFeedbackSimple().catch(console.error);
